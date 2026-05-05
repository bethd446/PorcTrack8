-- V71 Phase 5.2 — RLS role guards + anti-escalade + drop fuites anon.
-- Appliqué via Supabase Management API le 2026-05-05 (HTTP 201, 22 statements).
-- Ce fichier sert de trace dans le repo. Réversibilité décrite en bas.

-- ==== 1. Helper de check rôle (idempotent) ====
CREATE OR REPLACE FUNCTION public.is_owner_or_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'OWNER')
    );
  $$;
GRANT EXECUTE ON FUNCTION public.is_owner_or_admin() TO authenticated;

-- ==== 2. finances : SELECT + WRITE 100% restreints ADMIN/OWNER ====
DROP POLICY IF EXISTS "isolation_by_farm" ON public.finances;
CREATE POLICY "finances_select_admin_owner" ON public.finances
  FOR SELECT TO authenticated
  USING (farm_id = auth.uid() AND public.is_owner_or_admin());
CREATE POLICY "finances_write_admin_owner" ON public.finances
  FOR ALL TO authenticated
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

-- ==== 3. feed_inventory + vet_inventory + plan_alimentation + produits_aliments
--         + produits_veto : SELECT farm (WORKER lit), WRITE ADMIN/OWNER. Drop fuites anon. ====
DROP POLICY IF EXISTS "isolation_by_farm" ON public.feed_inventory;
DROP POLICY IF EXISTS "Lecture publique des stocks" ON public.feed_inventory;
CREATE POLICY "feed_inventory_select_farm" ON public.feed_inventory
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "feed_inventory_write_admin_owner" ON public.feed_inventory
  FOR ALL TO authenticated
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

DROP POLICY IF EXISTS "isolation_by_farm" ON public.vet_inventory;
DROP POLICY IF EXISTS "Lecture publique des stocks veto" ON public.vet_inventory;
CREATE POLICY "vet_inventory_select_farm" ON public.vet_inventory
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "vet_inventory_write_admin_owner" ON public.vet_inventory
  FOR ALL TO authenticated
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

DROP POLICY IF EXISTS "isolation_by_farm" ON public.plan_alimentation;
CREATE POLICY "plan_alimentation_select_farm" ON public.plan_alimentation
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "plan_alimentation_write_admin_owner" ON public.plan_alimentation
  FOR ALL TO authenticated
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

DROP POLICY IF EXISTS "isolation_by_farm" ON public.produits_aliments;
CREATE POLICY "produits_aliments_select_farm" ON public.produits_aliments
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "produits_aliments_write_admin_owner" ON public.produits_aliments
  FOR ALL TO authenticated
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

DROP POLICY IF EXISTS "isolation_by_farm" ON public.produits_veto;
CREATE POLICY "produits_veto_select_farm" ON public.produits_veto
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "produits_veto_write_admin_owner" ON public.produits_veto
  FOR ALL TO authenticated
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

-- ==== 4. Trigger anti-escalade rôle (profiles.role) ====
CREATE OR REPLACE FUNCTION public.prevent_role_escalation() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public
  AS $$
    BEGIN
      IF NEW.role IS DISTINCT FROM OLD.role
         AND NOT public.is_owner_or_admin() THEN
        RAISE EXCEPTION 'role change requires ADMIN/OWNER (got: %)',
          (SELECT role FROM public.profiles WHERE id = auth.uid());
      END IF;
      RETURN NEW;
    END;
  $$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ==== Vérifications post-deploy (à exécuter en SELECT) ====
-- a. SELECT tablename, COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('finances','feed_inventory','vet_inventory','plan_alimentation','produits_aliments','produits_veto') GROUP BY tablename;
--    → attendu : 6 tables × 2 policies
-- b. SELECT 1 FROM pg_trigger WHERE tgname='trg_prevent_role_escalation';  → 1 ligne
-- c. SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND 'anon'=ANY(roles);  → 0

-- ==== Réversibilité (à utiliser uniquement si rollback explicite) ====
-- DROP TRIGGER trg_prevent_role_escalation ON public.profiles;
-- DROP FUNCTION public.prevent_role_escalation();
-- DROP POLICY finances_select_admin_owner ON public.finances; etc. pour les 12 nouvelles
-- DROP FUNCTION public.is_owner_or_admin();
-- CREATE POLICY isolation_by_farm ... (recréer les 6 originales)
