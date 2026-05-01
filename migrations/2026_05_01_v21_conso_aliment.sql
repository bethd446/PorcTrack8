-- ════════════════════════════════════════════════════════════════════════════
-- Migration V21-3 : Saisie consommation aliment réelle
--
-- Date     : 2026-05-01
-- Auteur   : agent (PorcTrack8)
--
-- Contexte : la consommation aliment était purement théorique (FEED_CONFIG
-- × effectif × jours). L'éleveur n'avait aucun moyen de saisir la conso
-- réelle pour calculer un IC réel = livré / kg produit.
--
-- Cette migration crée la table `feed_consumption_logs` (saisie quotidienne
-- de la quantité d'aliment livrée à une bande ou à une truie individuelle).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feed_consumption_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  sow_id uuid REFERENCES public.sows(id) ON DELETE CASCADE,
  produit_aliment_id uuid REFERENCES public.produits_aliments(id) ON DELETE SET NULL,
  date_conso date NOT NULL,
  qty_kg numeric(10, 2) NOT NULL CHECK (qty_kg >= 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL,

  -- Soit batch_id soit sow_id, pas les deux NULL ni les deux remplis
  CONSTRAINT exactly_one_subject CHECK (
    (batch_id IS NOT NULL)::int + (sow_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS feed_conso_farm_idx ON public.feed_consumption_logs(farm_id);
CREATE INDEX IF NOT EXISTS feed_conso_batch_idx ON public.feed_consumption_logs(batch_id);
CREATE INDEX IF NOT EXISTS feed_conso_sow_idx ON public.feed_consumption_logs(sow_id);
CREATE INDEX IF NOT EXISTS feed_conso_date_idx ON public.feed_consumption_logs(date_conso DESC);

ALTER TABLE public.feed_consumption_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own farm feed conso" ON public.feed_consumption_logs
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "users insert own farm feed conso" ON public.feed_consumption_logs
  FOR INSERT TO authenticated WITH CHECK (farm_id = auth.uid() AND created_by = auth.uid());
CREATE POLICY "users update own farm feed conso" ON public.feed_consumption_logs
  FOR UPDATE TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "users delete own farm feed conso" ON public.feed_consumption_logs
  FOR DELETE TO authenticated USING (farm_id = auth.uid());

-- ── Vérification ────────────────────────────────────────────────────────────
-- SELECT count(*) FROM public.feed_consumption_logs;
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'feed_consumption_logs';
