-- V45 cleanup — colonne photo_url manquante sur porcelets_individuels.
-- Les autres tables (sows, boars, batches, notes, daily_checks_mb) ont déjà
-- photo_url depuis la migration V45. Cette ligne ferme l'écart pour que le
-- composant <EntityAvatar species="porcelet" photoUrl={...} /> puisse afficher
-- une vraie photo si fournie, et fallback sur l'avatar SVG sinon.
ALTER TABLE public.porcelets_individuels
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
