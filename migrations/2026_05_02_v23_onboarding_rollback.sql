-- ════════════════════════════════════════════════════════════════════════════
-- Rollback V23 : retire les champs onboarding de troupeaux
--
-- Date     : 2026-05-02
-- Auteur   : agent RT5 (Sprint Résilience Terrain, PorcTrack8)
--
-- Pas de DROP CASCADE : si une vue/fonction dépend d'une de ces colonnes,
-- ce rollback échouera volontairement pour signaler la dépendance.
-- ════════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS public.troupeaux_onboarding_user_idx;

ALTER TABLE public.troupeaux
  DROP CONSTRAINT IF EXISTS troupeaux_effectif_truies_chk;
ALTER TABLE public.troupeaux
  DROP CONSTRAINT IF EXISTS troupeaux_effectif_verrats_chk;
ALTER TABLE public.troupeaux
  DROP CONSTRAINT IF EXISTS troupeaux_objectif_porcelets_chk;

ALTER TABLE public.troupeaux
  DROP COLUMN IF EXISTS nom_ferme,
  DROP COLUMN IF EXISTS pays,
  DROP COLUMN IF EXISTS races,
  DROP COLUMN IF EXISTS effectif_truies_initial,
  DROP COLUMN IF EXISTS effectif_verrats_initial,
  DROP COLUMN IF EXISTS objectif_porcelets_an,
  DROP COLUMN IF EXISTS notes_demarrage,
  DROP COLUMN IF EXISTS onboarding_completed_at;
