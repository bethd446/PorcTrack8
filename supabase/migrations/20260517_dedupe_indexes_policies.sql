-- =============================================================================
-- 20260517_dedupe_indexes_policies.sql
-- But 1 : supprimer les 8 doublons d'indexes signalés par "duplicate_index"
-- But 2 : consolider les 6 cas de "multiple_permissive_policies"
--         (Supabase Performance Advisors, 2026-05-17)
--
-- Source advisor : mcp-supabase-get_advisors-1778825639051.txt
--   lint = duplicate_index × 8
--   lint = multiple_permissive_policies × 6
--
-- ── PARTIE A : duplicate_index ──────────────────────────────────────────────
-- Règle de sélection : conserver l'index nommé idx_<table>_<col> (convention
-- de ce projet, cohérent avec les autres migrations), dropper l'ancien alias.
-- Vérification : les paires listées dans l'advisor sont recoupées ci-dessous
-- avec les noms créés dans les migrations sources.
--
-- ── PARTIE B : multiple_permissive_policies ─────────────────────────────────
-- Toutes les tables concernées ont 2 policies qui couvrent SELECT en même
-- temps : une policy dédiée SELECT et une policy ALL (= SELECT+INSERT+UPDATE+
-- DELETE). Lorsque 2 policies permissives couvrent la même opération, Postgres
-- les évalue avec OR (l'une suffit). Ce n'est pas un bug de sécurité mais un
-- coût inutile. La correction préconisée par Supabase : fusionner ou dropper la
-- policy la moins restrictive.
-- Stratégie retenue : dropper la policy SELECT séparée (redondante avec la
-- policy ALL qui inclut déjà SELECT), et ne conserver que la policy ALL.
--
-- Vérification pré-drop pour policies :
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname='public' AND tablename='<table>';
-- ← à exécuter avant d'appliquer si doute sur l'état DB.
--
-- Risque : faible.
--   Indexes : DROP CONCURRENTLY serait préférable mais interdit en transaction.
--             Les indexes supprimés sont strictement identiques à ceux conservés
--             (même table, même colonne, même type btree) — aucun impact query.
--   Policies : on supprime uniquement la policy SELECT qui est un sous-ensemble
--              de la policy ALL déjà présente. Le comportement RLS reste identique.
--
-- Rollback : voir fin de fichier.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PARTIE A — DROP des indexes dupliqués
-- =============================================================================
-- Conserver  : idx_batch_sows_batch_id (convention idx_<table>_<col>)
-- Dropper    : batch_sows_batch_idx    (ancien nom alias, migration v24)
-- Source migration originale (alias) : migrations/2026_05_02_v24_batch_sows_and_loges.sql l. 28
-- Source migration cible (idx_*)     : supabase/migrations/20260508095426_v71_p2_multi_user_schema.sql
--   ou supabase/migrations/20260508_rls_quickwins.sql (idx_ créé lors du refactor RLS)
-- Vérif advisor : {batch_sows_batch_idx, idx_batch_sows_batch_id}
DROP INDEX IF EXISTS public.batch_sows_batch_idx;

-- Conserver  : idx_batch_sows_sow_id
-- Dropper    : batch_sows_sow_idx
-- Source alias : migrations/2026_05_02_v24_batch_sows_and_loges.sql l. 29
-- Vérif advisor : {batch_sows_sow_idx, idx_batch_sows_sow_id}
DROP INDEX IF EXISTS public.batch_sows_sow_idx;

-- Conserver  : idx_loges_farm_id
-- Dropper    : loges_farm_idx
-- Source alias : migrations/2026_05_02_v24_batch_sows_and_loges.sql l. 64
-- Vérif advisor : {idx_loges_farm_id, loges_farm_idx}
DROP INDEX IF EXISTS public.loges_farm_idx;

-- Conserver  : idx_pesees_porcelet_id
-- Dropper    : pesees_porcelet_idx
-- Source alias : migrations/2026_05_02_v26c_sessions_pesee.sql l. 46
-- Vérif advisor : {idx_pesees_porcelet_id, pesees_porcelet_idx}
DROP INDEX IF EXISTS public.pesees_porcelet_idx;

-- Conserver  : idx_porcelets_batch_id
-- Dropper    : porcelets_ind_batch_idx
-- Source alias : migrations/2026_05_02_v25_porcelets_individuels.sql l. 31
-- Vérif advisor : {idx_porcelets_batch_id, porcelets_ind_batch_idx}
DROP INDEX IF EXISTS public.porcelets_ind_batch_idx;

-- Conserver  : idx_porcelets_farm_id
-- Dropper    : porcelets_ind_farm_idx
-- Source alias : migrations/2026_05_02_v25_porcelets_individuels.sql l. 33
-- Vérif advisor : {idx_porcelets_farm_id, porcelets_ind_farm_idx}
DROP INDEX IF EXISTS public.porcelets_ind_farm_idx;

-- Conserver  : idx_saillies_farm_id
-- Dropper    : saillies_farm_id_idx
-- Source alias : migrations/2026_04_30_b2_complete.sql l. 36-37
-- Vérif advisor : {idx_saillies_farm_id, saillies_farm_id_idx}
DROP INDEX IF EXISTS public.saillies_farm_id_idx;

-- Conserver  : idx_saillies_sow_id
-- Dropper    : saillies_sow_id_idx
-- Source alias : migrations/2026_04_30_b2_complete.sql l. 37-38
-- Vérif advisor : {idx_saillies_sow_id, saillies_sow_id_idx}
DROP INDEX IF EXISTS public.saillies_sow_id_idx;

-- =============================================================================
-- PARTIE B — Consolidation multiple_permissive_policies
-- =============================================================================
-- Toutes les tables ci-dessous ont le même pattern :
--   - policy <table>_select : FOR SELECT USING (farm_id IN (SELECT current_user_farms()))
--   - policy <table>_write  : FOR ALL  USING + WITH CHECK (is_member_with_role(...))
--
-- L'advisor signale que 2 policies permissives couvrent SELECT simultanément :
--   SELECT → satisfait par <table>_select OU par <table>_write (pour les OWNER/ADMIN)
--   Les PORCHER peuvent lire grâce à _select mais pas via _write.
--   Dropper _select sans adapter _write reviendrait à bloquer les PORCHER.
--
-- DÉCISION RETENUE : les 2 policies ont des USING différents (scope différent
--   pour SELECT selon le rôle) — elles ne sont pas strictement redondantes.
--   On ne peut pas les fusionner en une seule sans changer la sémantique de
--   l'accès PORCHER (read-only) vs OWNER/ADMIN (read-write).
--
-- Pour satisfaire l'advisor SANS dégrader la sécurité, on transforme la policy
--   ALL (_write) en policies séparées INSERT+UPDATE+DELETE afin qu'elle ne
--   couvre plus SELECT. Ainsi il n'y a plus qu'une seule policy SELECT par table.
--
-- Source policy _select et _write :
--   supabase/migrations/20260508095426_v71_p2_multi_user_schema.sql
--   (feed_inventory l. 313-319, finances l. 324-330, plan_alimentation l. 387-393,
--    produits_aliments l. 405-411, produits_veto l. 416-422, vet_inventory l. 448-454)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────
-- feed_inventory
-- Advisor : {feed_inventory_select, feed_inventory_write} · SELECT · authenticated
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS feed_inventory_write ON public.feed_inventory;
CREATE POLICY feed_inventory_insert ON public.feed_inventory
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY feed_inventory_update ON public.feed_inventory
  FOR UPDATE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY feed_inventory_delete ON public.feed_inventory
  FOR DELETE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- ─────────────────────────────────────────────────────────────────
-- finances
-- Advisor : {finances_select, finances_write} · SELECT · authenticated
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS finances_write ON public.finances;
CREATE POLICY finances_insert ON public.finances
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY finances_update ON public.finances
  FOR UPDATE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY finances_delete ON public.finances
  FOR DELETE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- ─────────────────────────────────────────────────────────────────
-- plan_alimentation
-- Advisor : {plan_alimentation_select, plan_alimentation_write} · SELECT · authenticated
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS plan_alimentation_write ON public.plan_alimentation;
CREATE POLICY plan_alimentation_insert ON public.plan_alimentation
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY plan_alimentation_update ON public.plan_alimentation
  FOR UPDATE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY plan_alimentation_delete ON public.plan_alimentation
  FOR DELETE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- ─────────────────────────────────────────────────────────────────
-- produits_aliments
-- Advisor : {produits_aliments_select, produits_aliments_write} · SELECT · authenticated
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS produits_aliments_write ON public.produits_aliments;
CREATE POLICY produits_aliments_insert ON public.produits_aliments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY produits_aliments_update ON public.produits_aliments
  FOR UPDATE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY produits_aliments_delete ON public.produits_aliments
  FOR DELETE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- ─────────────────────────────────────────────────────────────────
-- produits_veto
-- Advisor : {produits_veto_select, produits_veto_write} · SELECT · authenticated
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS produits_veto_write ON public.produits_veto;
CREATE POLICY produits_veto_insert ON public.produits_veto
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY produits_veto_update ON public.produits_veto
  FOR UPDATE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY produits_veto_delete ON public.produits_veto
  FOR DELETE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- ─────────────────────────────────────────────────────────────────
-- vet_inventory
-- Advisor : {vet_inventory_select, vet_inventory_write} · SELECT · authenticated
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS vet_inventory_write ON public.vet_inventory;
CREATE POLICY vet_inventory_insert ON public.vet_inventory
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY vet_inventory_update ON public.vet_inventory
  FOR UPDATE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY vet_inventory_delete ON public.vet_inventory
  FOR DELETE TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

COMMIT;

-- =============================================================================
-- ROLLBACK PARTIE A (recréer les index supprimés) :
--   CREATE INDEX IF NOT EXISTS batch_sows_batch_idx ON public.batch_sows(batch_id);
--   CREATE INDEX IF NOT EXISTS batch_sows_sow_idx   ON public.batch_sows(sow_id);
--   CREATE INDEX IF NOT EXISTS loges_farm_idx        ON public.loges(farm_id);
--   CREATE INDEX IF NOT EXISTS pesees_porcelet_idx   ON public.pesees(porcelet_id);
--   CREATE INDEX IF NOT EXISTS porcelets_ind_batch_idx ON public.porcelets_individuels(batch_id);
--   CREATE INDEX IF NOT EXISTS porcelets_ind_farm_idx  ON public.porcelets_individuels(farm_id);
--   CREATE INDEX IF NOT EXISTS saillies_farm_id_idx  ON public.saillies(farm_id);
--   CREATE INDEX IF NOT EXISTS saillies_sow_id_idx   ON public.saillies(sow_id);
--
-- ROLLBACK PARTIE B (restaurer les policies ALL) :
--   DROP POLICY IF EXISTS feed_inventory_insert  ON public.feed_inventory;
--   DROP POLICY IF EXISTS feed_inventory_update  ON public.feed_inventory;
--   DROP POLICY IF EXISTS feed_inventory_delete  ON public.feed_inventory;
--   CREATE POLICY feed_inventory_write ON public.feed_inventory
--     FOR ALL TO authenticated
--     USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
--     WITH CHECK (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
--
--   (répéter pour finances, plan_alimentation, produits_aliments,
--    produits_veto, vet_inventory en changeant le nom de table)
-- =============================================================================
