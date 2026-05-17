-- =============================================================================
-- 20260517_fk_indexes.sql
-- But : couvrir les 19 foreign keys non indexées signalées par l'advisor
--       "unindexed_foreign_keys" (Supabase Performance Advisors, 2026-05-17).
--
-- Source advisor : mcp-supabase-get_advisors-1778825639051.txt
--   lint = unindexed_foreign_keys × 19
--
-- Risque : faible — CREATE INDEX IF NOT EXISTS est idempotent.
-- Note CONCURRENTLY : Supabase apply_migration enveloppe chaque migration
-- dans une transaction. CONCURRENTLY est interdit en transaction → on utilise
-- CREATE INDEX simple (prend un lock ShareLock par table, ~ms sur tables
-- vides ou petites). Si la table est grosse en prod, envisager d'appliquer
-- manuellement via psql hors transaction avec CONCURRENTLY.
--
-- Rollback : DROP INDEX IF EXISTS <nom_index>;  (un par ligne ci-dessous)
-- =============================================================================

-- batches · FK batches_validated_by_fkey → auth.users(id)
CREATE INDEX IF NOT EXISTS idx_batches_validated_by
  ON public.batches(validated_by);

-- farm_members · FK farm_members_invited_by_fkey → auth.users(id)
CREATE INDEX IF NOT EXISTS idx_farm_members_invited_by
  ON public.farm_members(invited_by);

-- feed_consumption_logs · FK feed_consumption_logs_produit_aliment_id_fkey → produits_aliments(id)
CREATE INDEX IF NOT EXISTS idx_feed_consumption_logs_produit_aliment_id
  ON public.feed_consumption_logs(produit_aliment_id);

-- feed_inventory · FK feed_inventory_farm_id_fkey → farms(id) ou profiles(id)
CREATE INDEX IF NOT EXISTS idx_feed_inventory_farm_id
  ON public.feed_inventory(farm_id);

-- finances · FK finances_farm_id_fkey → farms(id) ou profiles(id)
CREATE INDEX IF NOT EXISTS idx_finances_farm_id
  ON public.finances(farm_id);

-- finances · FK finances_validated_by_fkey → auth.users(id)
CREATE INDEX IF NOT EXISTS idx_finances_validated_by
  ON public.finances(validated_by);

-- health_logs · FK health_logs_batch_id_fkey → batches(id)
CREATE INDEX IF NOT EXISTS idx_health_logs_batch_id
  ON public.health_logs(batch_id);

-- health_logs · FK health_logs_produit_id_fkey → produits_veto(id)
CREATE INDEX IF NOT EXISTS idx_health_logs_produit_id
  ON public.health_logs(produit_id);

-- health_logs · FK health_logs_sow_id_fkey → sows(id)
CREATE INDEX IF NOT EXISTS idx_health_logs_sow_id
  ON public.health_logs(sow_id);

-- health_logs · FK health_logs_validated_by_fkey → auth.users(id)
CREATE INDEX IF NOT EXISTS idx_health_logs_validated_by
  ON public.health_logs(validated_by);

-- loge_movements · FK loge_movements_from_loge_id_fkey → loges(id)
CREATE INDEX IF NOT EXISTS idx_loge_movements_from_loge_id
  ON public.loge_movements(from_loge_id);

-- loge_movements · FK loge_movements_to_loge_id_fkey → loges(id)
CREATE INDEX IF NOT EXISTS idx_loge_movements_to_loge_id
  ON public.loge_movements(to_loge_id);

-- pesee_planifiees · FK pesee_planifiees_batch_id_fkey → batches(id)
CREATE INDEX IF NOT EXISTS idx_pesee_planifiees_batch_id
  ON public.pesee_planifiees(batch_id);

-- pesee_planifiees · FK pesee_planifiees_porcelet_id_fkey → porcelets_individuels(id)
CREATE INDEX IF NOT EXISTS idx_pesee_planifiees_porcelet_id
  ON public.pesee_planifiees(porcelet_id);

-- pesees_batch · FK pesees_batch_created_by_fkey → auth.users(id)
-- Note : table pesees_batch non trouvée dans les migrations suivies —
-- définie directement en base. Colonne déduite du nom FK standard Postgres.
CREATE INDEX IF NOT EXISTS idx_pesees_batch_created_by
  ON public.pesees_batch(created_by);

-- plan_alimentation · FK plan_alimentation_farm_id_fkey → farms(id) ou profiles(id)
CREATE INDEX IF NOT EXISTS idx_plan_alimentation_farm_id
  ON public.plan_alimentation(farm_id);

-- produits_aliments · FK produits_aliments_fournisseur_id_fkey → fournisseurs(id)
CREATE INDEX IF NOT EXISTS idx_produits_aliments_fournisseur_id
  ON public.produits_aliments(fournisseur_id);

-- produits_veto · FK produits_veto_fournisseur_id_fkey → fournisseurs(id)
CREATE INDEX IF NOT EXISTS idx_produits_veto_fournisseur_id
  ON public.produits_veto(fournisseur_id);

-- vet_inventory · FK vet_inventory_farm_id_fkey → farms(id) ou profiles(id)
CREATE INDEX IF NOT EXISTS idx_vet_inventory_farm_id
  ON public.vet_inventory(farm_id);

-- =============================================================================
-- ROLLBACK :
--   DROP INDEX IF EXISTS idx_batches_validated_by;
--   DROP INDEX IF EXISTS idx_farm_members_invited_by;
--   DROP INDEX IF EXISTS idx_feed_consumption_logs_produit_aliment_id;
--   DROP INDEX IF EXISTS idx_feed_inventory_farm_id;
--   DROP INDEX IF EXISTS idx_finances_farm_id;
--   DROP INDEX IF EXISTS idx_finances_validated_by;
--   DROP INDEX IF EXISTS idx_health_logs_batch_id;
--   DROP INDEX IF EXISTS idx_health_logs_produit_id;
--   DROP INDEX IF EXISTS idx_health_logs_sow_id;
--   DROP INDEX IF EXISTS idx_health_logs_validated_by;
--   DROP INDEX IF EXISTS idx_loge_movements_from_loge_id;
--   DROP INDEX IF EXISTS idx_loge_movements_to_loge_id;
--   DROP INDEX IF EXISTS idx_pesee_planifiees_batch_id;
--   DROP INDEX IF EXISTS idx_pesee_planifiees_porcelet_id;
--   DROP INDEX IF EXISTS idx_pesees_batch_created_by;
--   DROP INDEX IF EXISTS idx_plan_alimentation_farm_id;
--   DROP INDEX IF EXISTS idx_produits_aliments_fournisseur_id;
--   DROP INDEX IF EXISTS idx_produits_veto_fournisseur_id;
--   DROP INDEX IF EXISTS idx_vet_inventory_farm_id;
-- =============================================================================
