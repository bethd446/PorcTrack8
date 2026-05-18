-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_constraint snapshot (batches_phase_chk).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- Normalise batches.phase avec CHECK SCREAMING_SNAKE_CASE.
-- (cf. .claude/state/02b_schema_drift.md — convention canonique)

ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_phase_chk;

ALTER TABLE public.batches
  ADD CONSTRAINT batches_phase_chk
  CHECK (
    phase IS NULL OR phase = ANY (ARRAY[
      'MATERNITE'::text,
      'POST_SEVRAGE'::text,
      'CROISSANCE'::text,
      'ENGRAISSEMENT'::text,
      'FINITION'::text,
      'SEVREE'::text,
      'RECAP'::text
    ])
  );
