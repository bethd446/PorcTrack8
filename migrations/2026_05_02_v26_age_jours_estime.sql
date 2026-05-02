-- ═══════════════════════════════════════════════════════════════════════════
-- Migration V26-FORM : age_jours_estime sur batches
-- ───────────────────────────────────────────────────────────────────────────
-- Ajoute une colonne nullable `age_jours_estime` sur la table `batches` pour
-- stocker l'âge des porcelets au moment de la création de la bande, saisi en
-- texte libre par l'éleveur ("1 mois", "30j", "3 sem"…) et parsé côté UI.
--
-- Idempotente : safe à rejouer.
-- Fallback côté client : si la colonne n'est pas appliquée, l'âge est stocké
-- dans `notes` avec le pattern `[age_j=NN]` en suffixe.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS age_jours_estime int;

COMMENT ON COLUMN public.batches.age_jours_estime IS
  'V26-FORM: âge estimé des porcelets en jours (parsé depuis texte libre côté UI). Nullable.';

-- Pas de CHECK constraint volontaire : 0 = "âge nul saisi", null = "inconnu",
-- valeurs hautes (>365) acceptées car la bande peut être engraissement tardif.
