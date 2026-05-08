-- =============================================================
-- V71 P1 — Quick wins RLS (audit 2026-05-08)
-- =============================================================
-- 1. Ajouter WITH CHECK aux 9 policies ALL manquantes (batch_sows,
--    saillies, porcelets_individuels, loges, loge_movements, pesees,
--    pesee_planifiees, sessions_pesee, daily_checks_mb)
-- 2. Fixer notes : policy actuelle référence profiles.farm_id (colonne
--    inexistante) — remplacée par farm_id = auth.uid()
-- 3. Fermer admin_logs INSERT public (WITH CHECK true) + ajouter
--    SELECT restreint OWNER/ADMIN
-- 4. REVOKE EXECUTE des fonctions SECURITY DEFINER inutilement
--    exposées à anon/public
--
-- Noms exacts des policies actuelles (vérifiés via pg_policies) :
--   batch_sows           → batch_sows_owner
--   daily_checks_mb      → daily_checks_mb_owner
--   loge_movements       → loge_mvt_owner
--   loges                → loges_owner
--   notes                → "Accès aux notes par farm_id"
--   pesee_planifiees     → pesee_planif_owner
--   pesees               → pesees_owner
--   porcelets_individuels→ porcelets_owner
--   saillies             → isolation_by_farm
--   sessions_pesee       → sessions_pesee_owner
--   admin_logs (INSERT)  → "Les éleveurs peuvent insérer des logs"
-- =============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. WITH CHECK manquants sur policies ALL
-- ─────────────────────────────────────────────────────────────

-- batch_sows
DROP POLICY IF EXISTS batch_sows_owner ON public.batch_sows;
CREATE POLICY batch_sows_all ON public.batch_sows
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- saillies
DROP POLICY IF EXISTS isolation_by_farm ON public.saillies;
CREATE POLICY saillies_all ON public.saillies
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- porcelets_individuels
DROP POLICY IF EXISTS porcelets_owner ON public.porcelets_individuels;
CREATE POLICY porcelets_individuels_all ON public.porcelets_individuels
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- loges
DROP POLICY IF EXISTS loges_owner ON public.loges;
CREATE POLICY loges_all ON public.loges
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- loge_movements
DROP POLICY IF EXISTS loge_mvt_owner ON public.loge_movements;
CREATE POLICY loge_movements_all ON public.loge_movements
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- pesees
DROP POLICY IF EXISTS pesees_owner ON public.pesees;
CREATE POLICY pesees_all ON public.pesees
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- pesee_planifiees
DROP POLICY IF EXISTS pesee_planif_owner ON public.pesee_planifiees;
CREATE POLICY pesee_planifiees_all ON public.pesee_planifiees
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- sessions_pesee
DROP POLICY IF EXISTS sessions_pesee_owner ON public.sessions_pesee;
CREATE POLICY sessions_pesee_all ON public.sessions_pesee
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- daily_checks_mb
DROP POLICY IF EXISTS daily_checks_mb_owner ON public.daily_checks_mb;
CREATE POLICY daily_checks_mb_all ON public.daily_checks_mb
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 2. notes : fix policy qui référence profiles.farm_id (inexistant)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Accès aux notes par farm_id" ON public.notes;
DROP POLICY IF EXISTS notes_select ON public.notes;
DROP POLICY IF EXISTS notes_insert ON public.notes;
DROP POLICY IF EXISTS notes_update ON public.notes;
DROP POLICY IF EXISTS notes_delete ON public.notes;
DROP POLICY IF EXISTS notes_all ON public.notes;

CREATE POLICY notes_all ON public.notes
  FOR ALL TO authenticated
  USING (farm_id = (SELECT auth.uid()))
  WITH CHECK (farm_id = (SELECT auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 3. admin_logs : fermer INSERT public (était WITH CHECK true / public)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Les éleveurs peuvent insérer des logs" ON public.admin_logs;
DROP POLICY IF EXISTS admin_logs_insert ON public.admin_logs;
DROP POLICY IF EXISTS admin_logs_select ON public.admin_logs;

-- INSERT : seulement authentifié + user_id matche (admin_logs.user_id est text)
CREATE POLICY admin_logs_insert ON public.admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid())::text);

-- SELECT : seulement OWNER ou ADMIN (pour consultation audit)
CREATE POLICY admin_logs_select ON public.admin_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('OWNER', 'ADMIN')
  );

-- ─────────────────────────────────────────────────────────────
-- 4. REVOKE EXECUTE des fonctions SECURITY DEFINER trop ouvertes
-- ─────────────────────────────────────────────────────────────

-- get_user_role exposée à anon = fuite (énumération de rôles)
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- handle_new_user (trigger interne, ne devrait jamais être appelé directement)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- is_owner_or_admin (utilisée par RLS, autorité authenticated suffit)
REVOKE EXECUTE ON FUNCTION public.is_owner_or_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_owner_or_admin() TO authenticated;

-- prevent_role_escalation (trigger interne)
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM anon, authenticated, public;

-- rls_auto_enable (event trigger DDL — réservé superuser)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;

COMMIT;

-- =============================================================
-- ROLLBACK (à exécuter si problème détecté en prod)
-- =============================================================
-- BEGIN;
--
--   -- 1. Restaurer les 9 policies ALL public sans WITH CHECK
--   DROP POLICY IF EXISTS batch_sows_all ON public.batch_sows;
--   CREATE POLICY batch_sows_owner ON public.batch_sows
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   DROP POLICY IF EXISTS saillies_all ON public.saillies;
--   CREATE POLICY isolation_by_farm ON public.saillies
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   DROP POLICY IF EXISTS porcelets_individuels_all ON public.porcelets_individuels;
--   CREATE POLICY porcelets_owner ON public.porcelets_individuels
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   DROP POLICY IF EXISTS loges_all ON public.loges;
--   CREATE POLICY loges_owner ON public.loges
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   DROP POLICY IF EXISTS loge_movements_all ON public.loge_movements;
--   CREATE POLICY loge_mvt_owner ON public.loge_movements
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   DROP POLICY IF EXISTS pesees_all ON public.pesees;
--   CREATE POLICY pesees_owner ON public.pesees
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   DROP POLICY IF EXISTS pesee_planifiees_all ON public.pesee_planifiees;
--   CREATE POLICY pesee_planif_owner ON public.pesee_planifiees
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   DROP POLICY IF EXISTS sessions_pesee_all ON public.sessions_pesee;
--   CREATE POLICY sessions_pesee_owner ON public.sessions_pesee
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   DROP POLICY IF EXISTS daily_checks_mb_all ON public.daily_checks_mb;
--   CREATE POLICY daily_checks_mb_owner ON public.daily_checks_mb
--     FOR ALL TO public USING (farm_id = auth.uid());
--
--   -- 2. Restaurer notes (policy buggée d'origine — à corriger plus tard)
--   DROP POLICY IF EXISTS notes_all ON public.notes;
--   CREATE POLICY "Accès aux notes par farm_id" ON public.notes
--     FOR ALL TO public
--     USING ((auth.uid() IS NOT NULL) AND (farm_id = (SELECT farm_id FROM profiles WHERE id = auth.uid())));
--
--   -- 3. Restaurer admin_logs ouvert
--   DROP POLICY IF EXISTS admin_logs_insert ON public.admin_logs;
--   DROP POLICY IF EXISTS admin_logs_select ON public.admin_logs;
--   CREATE POLICY "Les éleveurs peuvent insérer des logs" ON public.admin_logs
--     FOR INSERT TO public WITH CHECK (true);
--
--   -- 4. Restaurer EXECUTE public sur fonctions SECURITY DEFINER
--   GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon, public;
--   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, public;
--   GRANT EXECUTE ON FUNCTION public.is_owner_or_admin() TO anon, public;
--   GRANT EXECUTE ON FUNCTION public.prevent_role_escalation() TO anon, authenticated, public;
--   GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO anon, authenticated, public;
--
-- COMMIT;
