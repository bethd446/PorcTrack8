-- ════════════════════════════════════════════════════════════════════════
-- V25 — Porcelets individuels + bande↔loge 1:1 + santé individuelle
-- ════════════════════════════════════════════════════════════════════════
-- Date  : 2026-05-02
-- Spec  : refonte module Porcelets & Cheptel (porcher liégeois)
-- Règles :
--   - 1 reproducteur (truie ou verrat) = 1 loge (validation UI)
--   - 1 bande de porcelets = 1 loge (validation UI + contrainte UNIQUE
--     partielle SQL)
--   - Porcelets individuels traçables par boucle (table dédiée)
--   - Signalement maladie au niveau du porcelet (FK health_logs)
-- ════════════════════════════════════════════════════════════════════════

-- 1) Table porcelets_individuels ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.porcelets_individuels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  boucle text NOT NULL,
  sexe text CHECK (sexe IN ('M', 'F', 'INCONNU')) DEFAULT 'INCONNU',
  poids_courant_kg numeric CHECK (poids_courant_kg > 0 AND poids_courant_kg <= 200),
  statut text NOT NULL DEFAULT 'VIVANT' CHECK (statut IN (
    'VIVANT', 'MORT', 'VENDU', 'MALADE', 'QUARANTAINE'
  )),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (farm_id, boucle)
);

CREATE INDEX IF NOT EXISTS porcelets_ind_batch_idx
  ON public.porcelets_individuels(batch_id);
CREATE INDEX IF NOT EXISTS porcelets_ind_farm_idx
  ON public.porcelets_individuels(farm_id);
CREATE INDEX IF NOT EXISTS porcelets_ind_statut_idx
  ON public.porcelets_individuels(statut);

ALTER TABLE public.porcelets_individuels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS porcelets_owner ON public.porcelets_individuels;
CREATE POLICY porcelets_owner ON public.porcelets_individuels
  FOR ALL USING (farm_id = auth.uid());

-- 2) Lien santé ↔ porcelet individuel ───────────────────────────────────
ALTER TABLE public.health_logs
  ADD COLUMN IF NOT EXISTS porcelet_id uuid
  REFERENCES public.porcelets_individuels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS health_logs_porcelet_idx
  ON public.health_logs(porcelet_id) WHERE porcelet_id IS NOT NULL;

-- 3) Bande↔loge 1:1 (UNIQUE partielle, ne casse pas la rétrocompat) ─────
-- Une loge ne peut héberger qu'une bande active à la fois.
-- Bandes en statut "Vendu", "Sortie", "Recap" peuvent réutiliser la loge.
CREATE UNIQUE INDEX IF NOT EXISTS batches_loge_active_unique
  ON public.batches (loge_id)
  WHERE loge_id IS NOT NULL
    AND statut NOT IN ('Vendu', 'Sortie', 'Recap', 'RECAP', 'Mort');

-- 4) Reproducteur↔loge 1:1 (UNIQUE partielle) ───────────────────────────
-- Une loge ne peut héberger qu'une seule truie active à la fois.
CREATE UNIQUE INDEX IF NOT EXISTS sows_loge_active_unique
  ON public.sows (loge_id)
  WHERE loge_id IS NOT NULL
    AND statut NOT IN ('Réforme', 'Morte');

-- Idem pour les verrats.
CREATE UNIQUE INDEX IF NOT EXISTS boars_loge_active_unique
  ON public.boars (loge_id)
  WHERE loge_id IS NOT NULL
    AND statut NOT IN ('Réforme', 'Mort');

-- 5) Pesée prévue : table simple pour scheduling mensuel ───────────────
CREATE TABLE IF NOT EXISTS public.pesee_planifiees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  porcelet_id uuid REFERENCES public.porcelets_individuels(id) ON DELETE CASCADE,
  date_prevue date NOT NULL,
  rappel_j1 boolean NOT NULL DEFAULT false,
  rappel_j3 boolean NOT NULL DEFAULT false,
  effectuee boolean NOT NULL DEFAULT false,
  date_effectuee date,
  created_at timestamptz DEFAULT now(),
  CHECK ((batch_id IS NOT NULL) OR (porcelet_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS pesee_planif_farm_idx
  ON public.pesee_planifiees(farm_id);
CREATE INDEX IF NOT EXISTS pesee_planif_due_idx
  ON public.pesee_planifiees(date_prevue) WHERE effectuee = false;

ALTER TABLE public.pesee_planifiees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pesee_planif_owner ON public.pesee_planifiees;
CREATE POLICY pesee_planif_owner ON public.pesee_planifiees
  FOR ALL USING (farm_id = auth.uid());
