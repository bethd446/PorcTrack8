-- ════════════════════════════════════════════════════════════════════════
-- V24 — Bandes multi-mères + référentiel loges + mouvements
-- ════════════════════════════════════════════════════════════════════════
-- Date     : 2026-05-02
-- Sprint   : V6-A (Vague 6 — Bandes multi-mères)
-- Plan     : .claude/audits/VAGUE_2_PLAN.md (Phase 1)
-- Décisions user :
--   1. Loge portée par la BANDE (1 loge → 1 bande entière, mass action)
--   2. Capacité dépassée = WARNING (pas blocage)
--   3. Soft-delete loges (active=false)
--   4. Numérotation libre user (V6-C onboarding)
-- ════════════════════════════════════════════════════════════════════════

-- 1) Table batch_sows : relation N:N batch ↔ sow ────────────────────────
CREATE TABLE IF NOT EXISTS public.batch_sows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  sow_id uuid NOT NULL REFERENCES public.sows(id),
  nb_porcelets_apportes int NOT NULL CHECK (nb_porcelets_apportes > 0
    AND nb_porcelets_apportes <= 30),
  date_ajout date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (batch_id, sow_id)
);

CREATE INDEX IF NOT EXISTS batch_sows_batch_idx ON public.batch_sows(batch_id);
CREATE INDEX IF NOT EXISTS batch_sows_sow_idx   ON public.batch_sows(sow_id);
CREATE INDEX IF NOT EXISTS batch_sows_farm_idx  ON public.batch_sows(farm_id);

ALTER TABLE public.batch_sows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS batch_sows_owner ON public.batch_sows;
CREATE POLICY batch_sows_owner ON public.batch_sows
  FOR ALL USING (farm_id = auth.uid());

-- 2) Backfill : 1 row batch_sows par batch existant depuis sow_id ───────
INSERT INTO public.batch_sows (farm_id, batch_id, sow_id,
  nb_porcelets_apportes, date_ajout)
SELECT b.farm_id, b.id, b.sow_id,
       GREATEST(1, COALESCE(b.porcelets_nes_vivants, 1)),
       COALESCE(b.date_mise_bas, CURRENT_DATE)
FROM public.batches b
WHERE b.sow_id IS NOT NULL
ON CONFLICT (batch_id, sow_id) DO NOTHING;

-- 3) Table loges : référentiel structuré ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  numero text NOT NULL,
  type text NOT NULL CHECK (type IN (
    'MATERNITE', 'POST_SEVRAGE', 'CROISSANCE', 'ENGRAISSEMENT',
    'FINITION', 'GESTANTE', 'VERRAT', 'INFIRMERIE', 'AUTRE')),
  batiment text,
  capacite_max int CHECK (capacite_max >= 0 AND capacite_max <= 500),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (farm_id, numero)
);

CREATE INDEX IF NOT EXISTS loges_farm_idx ON public.loges(farm_id);
CREATE INDEX IF NOT EXISTS loges_type_idx ON public.loges(type);

ALTER TABLE public.loges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loges_owner ON public.loges;
CREATE POLICY loges_owner ON public.loges
  FOR ALL USING (farm_id = auth.uid());

-- 4) FK loge_id (NULLABLE) sur sows / boars / batches ──────────────────
ALTER TABLE public.sows    ADD COLUMN IF NOT EXISTS loge_id uuid
  REFERENCES public.loges(id);
ALTER TABLE public.boars   ADD COLUMN IF NOT EXISTS loge_id uuid
  REFERENCES public.loges(id);
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS loge_id uuid
  REFERENCES public.loges(id);

CREATE INDEX IF NOT EXISTS sows_loge_idx
  ON public.sows(loge_id) WHERE loge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS boars_loge_idx
  ON public.boars(loge_id) WHERE loge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS batches_loge_idx
  ON public.batches(loge_id) WHERE loge_id IS NOT NULL;

-- 5) Table loge_movements : historique des transferts ──────────────────
CREATE TABLE IF NOT EXISTS public.loge_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  subject_type text NOT NULL CHECK (subject_type IN ('TRUIE','VERRAT','BANDE')),
  subject_id uuid NOT NULL,
  from_loge_id uuid REFERENCES public.loges(id),
  to_loge_id uuid REFERENCES public.loges(id),
  date_mvt date NOT NULL DEFAULT current_date,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loge_mvt_subject_idx
  ON public.loge_movements(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS loge_mvt_farm_idx
  ON public.loge_movements(farm_id);

ALTER TABLE public.loge_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loge_mvt_owner ON public.loge_movements;
CREATE POLICY loge_mvt_owner ON public.loge_movements
  FOR ALL USING (farm_id = auth.uid());
