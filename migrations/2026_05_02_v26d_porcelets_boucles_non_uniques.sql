-- ════════════════════════════════════════════════════════════════════════════
-- V26d — Porcelets : boucles non uniques (règle métier confirmée)
--
-- Date     : 2026-05-02
-- Spec     : carnet papier christophe — un même n° de boucle peut apparaître
--            dans plusieurs loges (porcelets distincts ré-utilisant la
--            numérotation, ou pesages multiples). Pas de déduplication.
--
-- Conséquences :
--   - Drop UNIQUE(farm, boucle, sexe) — devient un index non unique pour perf
--   - L'identité unique reste l'UUID id
--   - Le porcher arbitre les doublons éventuels via l'UI (renommage manuel)
-- ════════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS public.porcelets_individuels_farm_boucle_sexe_unique;

CREATE INDEX IF NOT EXISTS porcelets_individuels_farm_boucle_idx
  ON public.porcelets_individuels (farm_id, boucle);

COMMENT ON COLUMN public.porcelets_individuels.boucle IS
  'V26d: non unique. Plusieurs porcelets peuvent partager une boucle (loges differentes ou pesages multiples). UUID id reste l identifiant.';
