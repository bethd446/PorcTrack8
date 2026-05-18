-- 2026-05-18 — Audit mécanique : normalisation phase outlier + CHECK constraint
-- Branche feat/mechanic-audit-2026-05-18 (HEAD e056831)
-- Migration ADDITIVE : pas de DROP, snapshot backup table créé.
--
-- Contexte : audit du 2026-05-18 a détecté 1 row outlier `batches.phase='Post-sevrage'`
-- (capitalisation kebab) là où la convention canonique (src/types/enums.ts) est
-- 'POST_SEVRAGE'. Cause : QuickSevrageForm.tsx:155 + MultiPorteeSevrageWizard.tsx
-- écrivaient 'post-sevrage'. Fix code dans le même commit.
--
-- L'absence de CHECK constraint sur `phase` permettait cette divergence silencieuse.

-- 1. Snapshot backup avant toute modif (table interne préfixée _audit_)
CREATE TABLE IF NOT EXISTS public._audit_20260518_batches_pre AS
  SELECT * FROM public.batches;

COMMENT ON TABLE public._audit_20260518_batches_pre IS
  'Snapshot batches 2026-05-18 avant normalisation phase outlier. À conserver minimum 30j.';

-- 2. Normalisation 1 outlier détecté : "Post-sevrage" → "POST_SEVRAGE"
UPDATE public.batches
   SET phase = 'POST_SEVRAGE'
 WHERE phase = 'Post-sevrage';

-- 3. CHECK constraint pour bloquer toute future divergence silencieuse
--    Convention canonique : src/types/enums.ts BATCH_PHASE
--    Valeurs autorisées : MATERNITE, POST_SEVRAGE, CROISSANCE, ENGRAISSEMENT, FINITION, SEVREE, RECAP
--    phase IS NULL toléré (batches d'engraissement sans phase initiale).
ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_phase_chk;
ALTER TABLE public.batches ADD CONSTRAINT batches_phase_chk
  CHECK (
    phase IS NULL OR phase IN (
      'MATERNITE','POST_SEVRAGE','CROISSANCE','ENGRAISSEMENT','FINITION','SEVREE','RECAP'
    )
  );

COMMENT ON CONSTRAINT batches_phase_chk ON public.batches IS
  'Audit 2026-05-18 : bloque écriture phase divergente (post-sevrage kebab, maternite lowercase, etc).';
