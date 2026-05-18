-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_class.relforcerowsecurity + pg_policy snapshot.
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- Sprint14 — Force RLS spécifiquement sur finances + admin_logs (tables
-- les plus sensibles), avec policies OWNER/ADMIN-only.

ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs FORCE ROW LEVEL SECURITY;

-- finances : OWNER/ADMIN seulement (cf. pg_policy snapshot)
DROP POLICY IF EXISTS finances_select ON public.finances;
CREATE POLICY finances_select ON public.finances
  FOR SELECT
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN']));

DROP POLICY IF EXISTS finances_insert ON public.finances;
CREATE POLICY finances_insert ON public.finances
  FOR INSERT
  WITH CHECK (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN']));

DROP POLICY IF EXISTS finances_update ON public.finances;
CREATE POLICY finances_update ON public.finances
  FOR UPDATE
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN']));

DROP POLICY IF EXISTS finances_delete ON public.finances;
CREATE POLICY finances_delete ON public.finances
  FOR DELETE
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN']));

-- admin_logs : SELECT super_admin uniquement
DROP POLICY IF EXISTS admin_logs_select ON public.admin_logs;
CREATE POLICY admin_logs_select ON public.admin_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS admin_logs_insert ON public.admin_logs;
CREATE POLICY admin_logs_insert ON public.admin_logs
  FOR INSERT
  WITH CHECK (true);  -- service_role / triggers internes
