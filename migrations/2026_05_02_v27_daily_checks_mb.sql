-- ════════════════════════════════════════════════════════════════════════════
-- V27 — Daily Checks Mise Bas (suivi quotidien bandes "Sous mère")
--
-- Date     : 2026-05-02
-- Spec     : 10 questions quotidiennes pour bandes en phase "Sous mère"
--            (morts du jour, comportement, alimentation truie, mamelles,
--            diarrhée, respiration, lampe, eau, notes, photo).
--
-- Conséquences :
--   - 1 check par jour par bande (UNIQUE batch_id, date_check)
--   - upsert via ON CONFLICT côté client
--   - RLS scope farm_id = auth.uid() (owner only)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.daily_checks_mb (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_id        uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  date_check      date NOT NULL DEFAULT CURRENT_DATE,
  morts_jour      int  NOT NULL DEFAULT 0 CHECK (morts_jour >= 0 AND morts_jour <= 50),
  comportement    text CHECK (comportement IN ('CALME','NORMAL','AGITE')),
  truie_alimentation text CHECK (truie_alimentation IN ('OUI','NON','PARTIEL')),
  mamelles_utilisees boolean,
  diarrhee        text CHECK (diarrhee IN ('AUCUN','QUELQUES','TOUS')),
  respiration_ok  boolean,
  lampe_ok        boolean,
  eau_ok          boolean,
  notes           text,
  photo_url       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Unicité : 1 check par bande × jour
CREATE UNIQUE INDEX IF NOT EXISTS daily_checks_mb_batch_date_unique
  ON public.daily_checks_mb (batch_id, date_check);

-- Index navigation
CREATE INDEX IF NOT EXISTS daily_checks_mb_farm_idx
  ON public.daily_checks_mb (farm_id);
CREATE INDEX IF NOT EXISTS daily_checks_mb_batch_idx
  ON public.daily_checks_mb (batch_id);
CREATE INDEX IF NOT EXISTS daily_checks_mb_date_idx
  ON public.daily_checks_mb (date_check DESC);

-- RLS owner
ALTER TABLE public.daily_checks_mb ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_checks_mb_owner ON public.daily_checks_mb;
CREATE POLICY daily_checks_mb_owner ON public.daily_checks_mb
  FOR ALL USING (farm_id = auth.uid());

COMMENT ON TABLE public.daily_checks_mb IS
  'V27: suivi quotidien des bandes en phase Sous mere (10 questions terrain)';
COMMENT ON COLUMN public.daily_checks_mb.morts_jour IS
  'Nombre de porcelets morts dans la journee (0 par defaut)';
COMMENT ON COLUMN public.daily_checks_mb.comportement IS
  'Comportement de la portee : CALME, NORMAL, AGITE';
COMMENT ON COLUMN public.daily_checks_mb.truie_alimentation IS
  'Truie mange : OUI (totalement), NON (refus), PARTIEL';
COMMENT ON COLUMN public.daily_checks_mb.diarrhee IS
  'Diarrhee detectee : AUCUN, QUELQUES, TOUS';
