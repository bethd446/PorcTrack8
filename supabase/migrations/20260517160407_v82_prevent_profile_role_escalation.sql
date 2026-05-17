-- =============================================================================
-- v82_prevent_profile_role_escalation
-- Date : 2026-05-17 16:04 UTC (commit f475872)
--
-- Audit security-reviewer 2026-05-17 F-04 HIGH :
-- La policy profiles_update_own avait USING (auth.uid() = id) mais aucun
-- WITH CHECK, donc un user authentifié pouvait UPDATE son propre profile
-- avec role='OWNER' ou is_super_admin=true → escalation silencieuse.
--
-- Fix : trigger BEFORE UPDATE qui RAISE EXCEPTION si auth.role() != 'service_role'
-- ET (role OR is_super_admin OR id) diffère de OLD. service_role bypass pour
-- les migrations admin / scripts SQL directs.
--
-- Note : cette migration a d'abord été appliquée via Supabase MCP apply_migration
-- (registry version 20260517160407) puis matérialisée dans le repo le même jour
-- pour visibilité Git côté équipes.
--
-- Rollback : voir fin de fichier.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- service_role bypass (migrations, scripts admin)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: changement de role non autorisé pour l''utilisateur courant'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'Permission denied: changement de is_super_admin non autorisé pour l''utilisateur courant'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Permission denied: id immutable'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- prevent_profile_role_escalation est attaché à un trigger BEFORE UPDATE et
-- n'a pas vocation à être appelé via /rest/v1/rpc. Révoque EXECUTE sur les
-- rôles anon/authenticated → l'advisor Supabase "security_definer_function_executable"
-- s'éteint pour cette fonction.
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.prevent_profile_role_escalation() IS
  'Trigger BEFORE UPDATE on profiles. NE PAS exposer via /rest/v1/rpc/ — EXECUTE revoked de anon/authenticated. service_role bypass (migrations admin).';

DROP TRIGGER IF EXISTS prevent_profile_role_escalation_tr ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation_tr
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- =============================================================================
-- ROLLBACK :
--   DROP TRIGGER IF EXISTS prevent_profile_role_escalation_tr ON public.profiles;
--   DROP FUNCTION IF EXISTS public.prevent_profile_role_escalation();
-- =============================================================================
