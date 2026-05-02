-- ════════════════════════════════════════════════════════════════════════════
-- Migration V23 : champs onboarding sur troupeaux
--
-- Date     : 2026-05-02
-- Auteur   : agent RT5 (Sprint Résilience Terrain, PorcTrack8)
--
-- Contexte :
--   La table `public.troupeaux` ne possède aujourd'hui que (id, nom, secteur,
--   user_id, created_at). Le wizard d'onboarding 10 questions a besoin de
--   stocker davantage de métadonnées renseignées par l'utilisateur lors de la
--   première connexion (nom de ferme, localisation, races, cheptel initial,
--   objectif annuel, notes de démarrage) ainsi qu'un timestamp de fin
--   d'onboarding pour ne plus jamais re-router vers le wizard une fois
--   complété.
--
-- Stratégie :
--   - ALTER TABLE … ADD COLUMN IF NOT EXISTS pour rester idempotent.
--   - Aucun NOT NULL : l'onboarding est facultatif, la création de troupeau
--     par le trigger handle_new_user reste valide sans ces champs.
--   - races : jsonb (array de strings) — flexible pour ajouts futurs.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.troupeaux
  ADD COLUMN IF NOT EXISTS nom_ferme text,
  ADD COLUMN IF NOT EXISTS pays text,
  ADD COLUMN IF NOT EXISTS races jsonb,
  ADD COLUMN IF NOT EXISTS effectif_truies_initial int,
  ADD COLUMN IF NOT EXISTS effectif_verrats_initial int,
  ADD COLUMN IF NOT EXISTS objectif_porcelets_an int,
  ADD COLUMN IF NOT EXISTS notes_demarrage text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- secteur existe déjà mais on documente :
COMMENT ON COLUMN public.troupeaux.secteur IS
  'Localisation libre (ville, région, département). Saisi à l''onboarding.';

COMMENT ON COLUMN public.troupeaux.nom_ferme IS
  'Nom commercial / d''usage de la ferme (distinct de troupeaux.nom qui peut être technique).';
COMMENT ON COLUMN public.troupeaux.pays IS
  'Pays ISO ou nom long. Défaut côté UI : France.';
COMMENT ON COLUMN public.troupeaux.races IS
  'jsonb array des races élevées : ["Large White","Landrace",...]. 1-5 entrées.';
COMMENT ON COLUMN public.troupeaux.effectif_truies_initial IS
  'Nombre de truies déclaré au démarrage. 0-500.';
COMMENT ON COLUMN public.troupeaux.effectif_verrats_initial IS
  'Nombre de verrats déclaré au démarrage. 0-50.';
COMMENT ON COLUMN public.troupeaux.objectif_porcelets_an IS
  'Objectif annuel de production (porcelets sevrés). 0-50000. Optionnel.';
COMMENT ON COLUMN public.troupeaux.notes_demarrage IS
  'Texte libre saisi à l''onboarding (contraintes locales, particularités).';
COMMENT ON COLUMN public.troupeaux.onboarding_completed_at IS
  'Timestamp de fin du wizard. NULL = onboarding pas terminé → routage forcé.';

-- Contraintes de plage (idempotent : DROP avant ADD)
ALTER TABLE public.troupeaux
  DROP CONSTRAINT IF EXISTS troupeaux_effectif_truies_chk;
ALTER TABLE public.troupeaux
  ADD CONSTRAINT troupeaux_effectif_truies_chk
  CHECK (effectif_truies_initial IS NULL OR (effectif_truies_initial >= 0 AND effectif_truies_initial <= 500));

ALTER TABLE public.troupeaux
  DROP CONSTRAINT IF EXISTS troupeaux_effectif_verrats_chk;
ALTER TABLE public.troupeaux
  ADD CONSTRAINT troupeaux_effectif_verrats_chk
  CHECK (effectif_verrats_initial IS NULL OR (effectif_verrats_initial >= 0 AND effectif_verrats_initial <= 50));

ALTER TABLE public.troupeaux
  DROP CONSTRAINT IF EXISTS troupeaux_objectif_porcelets_chk;
ALTER TABLE public.troupeaux
  ADD CONSTRAINT troupeaux_objectif_porcelets_chk
  CHECK (objectif_porcelets_an IS NULL OR (objectif_porcelets_an >= 0 AND objectif_porcelets_an <= 50000));

-- Index partiel pour requête rapide "user a-t-il fait l'onboarding ?"
CREATE INDEX IF NOT EXISTS troupeaux_onboarding_user_idx
  ON public.troupeaux (user_id)
  WHERE onboarding_completed_at IS NOT NULL;
