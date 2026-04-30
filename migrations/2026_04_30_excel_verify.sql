-- ============================================================
-- PorcTrack 8 — VERIFY Import Excel 2026-04-30
-- Cible farm_id: bc96ddbd-c34d-46b1-b624-4a3dca181a2c
-- Counts attendus pour validation.
-- ============================================================

-- Expected: sows >= 17 (17 importés)
SELECT 'sows' AS table_name, COUNT(*) AS row_count FROM public.sows WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: boars >= 2 (2 importés)
SELECT 'boars' AS table_name, COUNT(*) AS row_count FROM public.boars WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: saillies >= 10 (10 importés)
SELECT 'saillies' AS table_name, COUNT(*) AS row_count FROM public.saillies WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: batches >= 14 (14 importés)
SELECT 'batches' AS table_name, COUNT(*) AS row_count FROM public.batches WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: batches.loge non-null >= 9 (MATERNITE updates)
SELECT 'batches_with_loge' AS metric, COUNT(*) FROM public.batches WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND loge IS NOT NULL;

-- Expected: batches.phase non-null >= 11 (POST_SEVRAGE updates)
SELECT 'batches_with_phase' AS metric, COUNT(*) FROM public.batches WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND phase IS NOT NULL;

-- Expected: health_logs >= 2
SELECT 'health_logs' AS table_name, COUNT(*) AS row_count FROM public.health_logs WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: notes >= 10
SELECT 'notes' AS table_name, COUNT(*) AS row_count FROM public.notes WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: produits_veto >= 7
SELECT 'produits_veto' AS table_name, COUNT(*) AS row_count FROM public.produits_veto WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: produits_aliments >= 9
SELECT 'produits_aliments' AS table_name, COUNT(*) AS row_count FROM public.produits_aliments WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: feed_inventory >= 1
SELECT 'feed_inventory' AS table_name, COUNT(*) AS row_count FROM public.feed_inventory WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- Expected: finances >= 13
SELECT 'finances' AS table_name, COUNT(*) AS row_count FROM public.finances WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- FK integrity
SELECT 'saillies_fk_sow_resolved' AS metric, COUNT(*) FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_id IS NOT NULL;
SELECT 'saillies_fk_boar_resolved' AS metric, COUNT(*) FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND boar_id IS NOT NULL;
SELECT 'batches_fk_sow_resolved' AS metric, COUNT(*) FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_id IS NOT NULL;

-- END VERIFY