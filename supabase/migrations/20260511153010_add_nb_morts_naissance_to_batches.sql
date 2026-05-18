-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : information_schema.columns snapshot. NE PAS RE-APPLIQUER.
-- Cette migration est déjà présente en production. Backfill repo only.

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS nb_morts_naissance INTEGER DEFAULT 0;
