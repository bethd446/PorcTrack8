-- ════════════════════════════════════════════════════════════════════════════
-- Migration V21-4 : Poids carcasse rendement vente + tri par poids engraissement
--
-- Date     : 2026-05-01
-- Auteur   : agent (PorcTrack8)
--
-- Contexte :
--   B2 — Naisseur-engraisseur vend à abattoir. KPI clé : rendement carcasse =
--        poids_carcasse / poids_vif (~75-78%). On enrichit batches avec les
--        colonnes carcasse + canal de vente + abattoir.
--   B3 — Tri par poids en engraissement/finition pour optimiser les départs
--        par lots (tous les porcs n'atteignent pas 110 kg en même temps).
-- ════════════════════════════════════════════════════════════════════════════

-- ── B2 — Batches : poids vif/carcasse + rendement + canal vente + abattoir ──
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS poids_vif_kg numeric(10, 2),
  ADD COLUMN IF NOT EXISTS poids_carcasse_kg numeric(10, 2),
  ADD COLUMN IF NOT EXISTS rendement_carcasse_pct numeric(5, 2),
  ADD COLUMN IF NOT EXISTS canal_vente text CHECK (canal_vente IN ('ABATTOIR', 'DIRECT', 'DEMI_GROS', 'AUTRE')),
  ADD COLUMN IF NOT EXISTS abattoir_nom text,
  ADD COLUMN IF NOT EXISTS prix_carcasse_fcfa_kg numeric(10, 2);

-- ── B3 — weight_distributions : distribution des poids par tranche ──────────
CREATE TABLE IF NOT EXISTS public.weight_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  date_pesee date NOT NULL,
  -- Distribution par tranche
  nb_under_90kg int DEFAULT 0,
  nb_90_to_100kg int DEFAULT 0,
  nb_100_to_110kg int DEFAULT 0,
  nb_above_110kg int DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS weight_dist_farm_idx ON public.weight_distributions(farm_id);
CREATE INDEX IF NOT EXISTS weight_dist_batch_idx ON public.weight_distributions(batch_id);

ALTER TABLE public.weight_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own farm weight distributions" ON public.weight_distributions;
DROP POLICY IF EXISTS "users insert own farm weight distributions" ON public.weight_distributions;
DROP POLICY IF EXISTS "users update own farm weight distributions" ON public.weight_distributions;
DROP POLICY IF EXISTS "users delete own farm weight distributions" ON public.weight_distributions;

CREATE POLICY "users see own farm weight distributions" ON public.weight_distributions
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "users insert own farm weight distributions" ON public.weight_distributions
  FOR INSERT TO authenticated WITH CHECK (farm_id = auth.uid());
CREATE POLICY "users update own farm weight distributions" ON public.weight_distributions
  FOR UPDATE TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "users delete own farm weight distributions" ON public.weight_distributions
  FOR DELETE TO authenticated USING (farm_id = auth.uid());

-- ── Vérification ────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'batches'
--     AND column_name IN ('poids_vif_kg','poids_carcasse_kg','rendement_carcasse_pct',
--                         'canal_vente','abattoir_nom','prix_carcasse_fcfa_kg');
-- SELECT * FROM public.weight_distributions LIMIT 0;
