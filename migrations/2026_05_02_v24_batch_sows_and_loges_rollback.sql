-- ════════════════════════════════════════════════════════════════════════
-- V24 ROLLBACK — Bandes multi-mères + référentiel loges + mouvements
-- ════════════════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.loge_movements CASCADE;
ALTER TABLE public.batches DROP COLUMN IF EXISTS loge_id;
ALTER TABLE public.boars   DROP COLUMN IF EXISTS loge_id;
ALTER TABLE public.sows    DROP COLUMN IF EXISTS loge_id;
DROP TABLE IF EXISTS public.loges CASCADE;
DROP TABLE IF EXISTS public.batch_sows CASCADE;
