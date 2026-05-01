-- ════════════════════════════════════════════════════════════════════════════
-- Migration V14 : Lignée parentale (verrats) + alias poids moyen (bandes)
--
-- Date     : 2026-05-01
-- Auteur   : agent (PorcTrack8)
--
-- Contexte : édition complète des fiches Verrat / Bande. Le porcher veut
-- pouvoir saisir la lignée parentale d'un verrat (ex. "Père X / Mère Y") et
-- le poids moyen courant d'une portée (au-delà du sevrage).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Verrats : lignée parentale (texte libre, max 80 chars conseillé) ────────
ALTER TABLE public.boars
  ADD COLUMN IF NOT EXISTS lignee_parentale text;

-- ── Bandes : poids moyen courant (kg) — distinct de poids_moyen_sevrage_kg ─
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS poids_moyen_kg numeric(6,2);

-- ── Vérification ────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name IN ('boars', 'batches')
--     AND column_name IN ('lignee_parentale', 'poids_moyen_kg');
