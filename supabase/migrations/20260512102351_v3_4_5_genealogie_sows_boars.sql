-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : information_schema.columns snapshot (sows + boars).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- v3.4.5 — Généalogie : ajout des colonnes mere_code_id / pere_code_id
-- sur sows et boars pour tracer la lignée parentale (code papier carnet).

ALTER TABLE public.sows
  ADD COLUMN IF NOT EXISTS mere_code_id text,
  ADD COLUMN IF NOT EXISTS pere_code_id text;

ALTER TABLE public.boars
  ADD COLUMN IF NOT EXISTS mere_code_id text,
  ADD COLUMN IF NOT EXISTS pere_code_id text;
