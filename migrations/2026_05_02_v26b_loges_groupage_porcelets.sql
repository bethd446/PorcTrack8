-- ════════════════════════════════════════════════════════════════════════════
-- V26b — Groupage : 1 bande = 1 sexe dans 1 loge (donc 2 bandes/loge mixte)
--                   + boucle UNIQUE par (farm, boucle, sexe)
--
-- Date     : 2026-05-02
-- Décision : carnet papier christophe pesée 02/05/2026 — boucles vertes (F)
--            et bleues (M) numérotées indépendamment, donc B27-vert et
--            B27-bleu sont 2 porcelets distincts.
--
-- Conséquences :
--   - 1 loge mixte peut contenir 2 bandes (une F, une M).
--   - 1 boucle peut être réutilisée entre les sexes (F-vert / M-bleu).
--   - Suivi rigoureux MB toujours garanti via porcelets_individuels.boucle.
-- ════════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS public.batches_loge_active_unique;

COMMENT ON TABLE public.batches IS
  'V26b: 1 bande peut partager une loge si sexes differents. Suivi par porcelets_individuels.';

-- UNIQUE(farm, boucle) → UNIQUE(farm, boucle, sexe)
ALTER TABLE public.porcelets_individuels
  DROP CONSTRAINT IF EXISTS porcelets_individuels_farm_id_boucle_key;

CREATE UNIQUE INDEX IF NOT EXISTS porcelets_individuels_farm_boucle_sexe_unique
  ON public.porcelets_individuels (farm_id, boucle, sexe);
