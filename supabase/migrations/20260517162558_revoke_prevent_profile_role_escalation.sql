-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_proc snapshot (prevent_role_escalation) + pg_trigger.
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- Sprint sécurité — empêche tout user non-OWNER/ADMIN de promouvoir son
-- profile.role ou son is_super_admin. Trigger BEFORE UPDATE sur profiles.
-- (Note V82B : NULL guard ajouté pour transactions service_role internes
--  pendant le login Supabase Auth.)

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := COALESCE((SELECT auth.jwt() ->> 'role'), '');
BEGIN
  -- 2a. NULL guard : pendant le login Supabase Auth, des UPDATE internes sur
  -- public.profiles peuvent transiter sans auth.uid() encore propagé. Les
  -- triggers internes service-role ne doivent JAMAIS être bloqués.
  IF v_uid IS NULL OR v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 2b. role : modifiable uniquement par OWNER/ADMIN sur sa ferme.
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_owner_or_admin() THEN
    RAISE EXCEPTION 'role change requires ADMIN/OWNER (got: %)',
      (SELECT role FROM public.profiles WHERE id = v_uid)
      USING ERRCODE = '42501';
  END IF;

  -- 2c. is_super_admin : modifiable uniquement par service_role
  -- (le guard ci-dessus a déjà laissé passer service_role).
  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'is_super_admin change requires service_role'
      USING ERRCODE = '42501';
  END IF;

  -- 2d. id immutable.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id immutable'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- Revoke direct EXECUTE — la fonction ne s'invoque que via trigger.
REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
