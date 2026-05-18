-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_indexes snapshot (idx_*_farm_id/batch_id/sow_id/boar_id/loge_id).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- Ajoute les index FK manquants pour éviter les seq scans sur jointures.

CREATE INDEX IF NOT EXISTS idx_batch_sows_batch_id ON public.batch_sows USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_sows_sow_id ON public.batch_sows USING btree (sow_id);
CREATE INDEX IF NOT EXISTS idx_batches_boar_id ON public.batches USING btree (boar_id);
CREATE INDEX IF NOT EXISTS idx_batches_farm_id ON public.batches USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_batches_sow_id ON public.batches USING btree (sow_id);
CREATE INDEX IF NOT EXISTS idx_feed_inventory_farm_id ON public.feed_inventory USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_finances_farm_id ON public.finances USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_batch_id ON public.health_logs USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_sow_id ON public.health_logs USING btree (sow_id);
CREATE INDEX IF NOT EXISTS idx_loge_movements_from_loge_id ON public.loge_movements USING btree (from_loge_id);
CREATE INDEX IF NOT EXISTS idx_loge_movements_to_loge_id ON public.loge_movements USING btree (to_loge_id);
CREATE INDEX IF NOT EXISTS idx_loges_farm_id ON public.loges USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_notes_farm_id ON public.notes USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_pesee_planifiees_batch_id ON public.pesee_planifiees USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_plan_alimentation_farm_id ON public.plan_alimentation USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_porcelets_batch_id ON public.porcelets_individuels USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_porcelets_farm_id ON public.porcelets_individuels USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_saillies_boar_id ON public.saillies USING btree (boar_id);
CREATE INDEX IF NOT EXISTS idx_saillies_farm_id ON public.saillies USING btree (farm_id);
CREATE INDEX IF NOT EXISTS idx_saillies_sow_id ON public.saillies USING btree (sow_id);
CREATE INDEX IF NOT EXISTS idx_vet_inventory_farm_id ON public.vet_inventory USING btree (farm_id);
