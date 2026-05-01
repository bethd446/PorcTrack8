-- ════════════════════════════════════════════════════════════════════════════
-- Rollback V23-S1 : retire poids_initial_kg de batches (bandes)
--
-- Date     : 2026-05-02
-- Auteur   : agent A (Sprint V23-S1, PorcTrack8)
--
-- Pas de DROP CASCADE : si une vue / fonction dépend de la colonne, ce rollback
-- échouera volontairement pour signaler la dépendance.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_poids_initial_kg_range_chk;

ALTER TABLE public.batches
  DROP COLUMN IF EXISTS poids_initial_kg;
