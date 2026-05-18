-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : reconstruction depuis valeurs observées dans farms.metadata.
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- V80 P0 — Profil ferme par défaut "cycle_complet" sur toutes les farms
-- qui n'ont pas encore défini de profil. Le profil est stocké dans
-- farms.metadata->>'profil' (valeurs : 'cycle_complet' | 'naisseur'
-- | 'engraisseur' | 'naisseur_engraisseur').

UPDATE public.farms
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{profil}',
  '"cycle_complet"'::jsonb,
  true
)
WHERE NOT (COALESCE(metadata, '{}'::jsonb) ? 'profil');
