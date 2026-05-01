-- ════════════════════════════════════════════════════════════════════════════
-- Migration V21 : Échographie J28 (saillies) + sex ratio mise-bas (batches)
--
-- Date     : 2026-05-01
-- Auteur   : agent (PorcTrack8)
--
-- Contexte :
--   A1 — Saisie résultat échographie J28-J35 sur saillies (CONFIRMEE / VIDE /
--   DOUTEUSE) + date écho + notes libres. Permet de transformer la simple
--   alerte R7 en saisie réelle, libérant la truie si VIDE.
--   A2 — Sex ratio M/F à la naissance d'une portée (batches), répartition
--   optionnelle entre porcelets mâles et femelles dès la mise-bas.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Saillies : résultat d'échographie ──────────────────────────────────────
ALTER TABLE public.saillies
  ADD COLUMN IF NOT EXISTS statut_echo text
    CHECK (statut_echo IN ('CONFIRMEE', 'VIDE', 'DOUTEUSE')),
  ADD COLUMN IF NOT EXISTS date_echo date,
  ADD COLUMN IF NOT EXISTS notes_echo text;

CREATE INDEX IF NOT EXISTS saillies_statut_echo_idx
  ON public.saillies(statut_echo);

-- ── Batches : sex ratio à la naissance ─────────────────────────────────────
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS nb_males_naissance int,
  ADD COLUMN IF NOT EXISTS nb_femelles_naissance int;

-- ── Vérification ────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND ((table_name = 'saillies'
--          AND column_name IN ('statut_echo', 'date_echo', 'notes_echo'))
--      OR (table_name = 'batches'
--          AND column_name IN ('nb_males_naissance', 'nb_femelles_naissance')));
