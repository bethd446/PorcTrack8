-- ════════════════════════════════════════════════════════════════════════════
-- V26 — Loges illimitées (multi-truies par loge)
--
-- Date     : 2026-05-02
-- Sprint   : V26-DB
--
-- Décision éleveur :
--   - Plusieurs truies peuvent partager une même loge (groupe gestantes,
--     groupe vides, etc.) → on lève la contrainte 1:1 truie/loge.
--   - Verrats : suivi rigoureux 1:1 (1 verrat = 1 loge) → on conserve.
--   - Bandes porcelets : suivi MB rigoureux → on conserve 1:1 bande/loge.
-- ════════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS public.sows_loge_active_unique;

COMMENT ON INDEX public.boars_loge_active_unique IS 'Suivi rigoureux 1:1 verrat/loge';
