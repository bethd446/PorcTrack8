-- =============================================================================
-- 20260518_rls_hardening.sql
-- Corrections 2 failles exploitables (audit security-reviewer 2026-05-18)
-- Branche : feat/mechanic-complete-2026-05-18
--
-- O-1 : farm_members_insert_admin — clause OR permet takeover ferme
--       Vérifié SQL live (2026-05-18) : pg_policies confirme la clause
--       OR ((user_id = auth.uid()) AND (role = 'OWNER')) sans vérif membership.
--       Vecteur : INSERT farm_members(farm_id=<any>, user_id=self, role='OWNER').
--
-- O-2 : prevent_role_escalation — is_owner_or_admin() deprecated permet
--       escalation profiles.role cross-tenant. handle_new_user crée tous les
--       comptes en profiles.role='OWNER' → guard inutile.
-- =============================================================================

-- ── FIX O-1 : farm_members_insert_admin ──────────────────────────────────────
DROP POLICY IF EXISTS farm_members_insert_admin ON public.farm_members;
CREATE POLICY farm_members_insert_admin ON public.farm_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = (SELECT auth.uid())
        AND fm.role IN ('OWNER', 'ADMIN')
    )
  );

COMMENT ON POLICY farm_members_insert_admin ON public.farm_members IS
  '2026-05-18 rls_hardening: suppression clause OR self-insert-as-OWNER (takeover ferme). handle_new_user() SECURITY DEFINER crée le premier OWNER sans passer par cette policy.';

-- ── FIX O-2 : prevent_role_escalation ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := COALESCE((SELECT auth.jwt() ->> 'role'), '');
BEGIN
  IF v_uid IS NULL OR v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role modification interdite (role operationnel = farm_members.role). service_role requis.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'is_super_admin modification requiert service_role'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id immutable'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_role_escalation() IS
  '2026-05-18 rls_hardening: suppression is_owner_or_admin() deprecated. profiles.role/is_super_admin/id bloques sauf service_role. NULL guard login conserve.';
