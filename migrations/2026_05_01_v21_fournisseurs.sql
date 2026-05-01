-- ════════════════════════════════════════════════════════════════════════════
-- Migration V21-D1+D2 : Carnet fournisseurs + Adoptions porcelets
--
-- Date     : 2026-05-01
-- Auteur   : agent (PorcTrack8)
--
-- Contexte :
--   D1 — Carnet fournisseurs (aliment, pharmacie, génétique, autre) avec
--        WhatsApp pré-rempli pour commande directe depuis alerte stock bas.
--        Lie produits_aliments.fournisseur_id et produits_veto.fournisseur_id.
--   D2 — Table adoptions : transfert porcelets entre bandes en maternité
--        (équilibrage portées, truie sans lait). Met à jour batches.vivants.
-- ════════════════════════════════════════════════════════════════════════════

-- ── D1 — Table fournisseurs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type text CHECK (type IN ('ALIMENT', 'PHARMACIE', 'GENETIQUE', 'AUTRE')),
  whatsapp_number text,  -- Format international '+225...'
  email text,
  notes text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fournisseurs_farm_idx ON public.fournisseurs(farm_id);
CREATE INDEX IF NOT EXISTS fournisseurs_type_idx ON public.fournisseurs(type);

ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "users insert own fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "users update own fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "users delete own fournisseurs" ON public.fournisseurs;

CREATE POLICY "users see own fournisseurs" ON public.fournisseurs
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "users insert own fournisseurs" ON public.fournisseurs
  FOR INSERT TO authenticated WITH CHECK (farm_id = auth.uid());
CREATE POLICY "users update own fournisseurs" ON public.fournisseurs
  FOR UPDATE TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "users delete own fournisseurs" ON public.fournisseurs
  FOR DELETE TO authenticated USING (farm_id = auth.uid());

-- ── D1 — FK additive sur produits_aliments / produits_veto ──────────────────
ALTER TABLE public.produits_aliments
  ADD COLUMN IF NOT EXISTS fournisseur_id uuid REFERENCES public.fournisseurs(id) ON DELETE SET NULL;
ALTER TABLE public.produits_veto
  ADD COLUMN IF NOT EXISTS fournisseur_id uuid REFERENCES public.fournisseurs(id) ON DELETE SET NULL;

-- ── D2 — Table adoptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.adoptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  to_batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  nb_porcelets int NOT NULL CHECK (nb_porcelets > 0),
  date_adoption date NOT NULL,
  motif text CHECK (motif IN ('EQUILIBRAGE', 'TRUIE_INSUFFISANTE_LAIT', 'AUTRE')),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL,

  CONSTRAINT no_self_adoption CHECK (from_batch_id != to_batch_id)
);

CREATE INDEX IF NOT EXISTS adoptions_farm_idx ON public.adoptions(farm_id);
CREATE INDEX IF NOT EXISTS adoptions_from_batch_idx ON public.adoptions(from_batch_id);
CREATE INDEX IF NOT EXISTS adoptions_to_batch_idx ON public.adoptions(to_batch_id);

ALTER TABLE public.adoptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own adoptions" ON public.adoptions;
DROP POLICY IF EXISTS "users insert own adoptions" ON public.adoptions;

CREATE POLICY "users see own adoptions" ON public.adoptions
  FOR SELECT TO authenticated USING (farm_id = auth.uid());
CREATE POLICY "users insert own adoptions" ON public.adoptions
  FOR INSERT TO authenticated WITH CHECK (farm_id = auth.uid() AND created_by = auth.uid());

-- ── Vérification ────────────────────────────────────────────────────────────
-- SELECT * FROM public.fournisseurs LIMIT 0;
-- SELECT * FROM public.adoptions LIMIT 0;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'produits_aliments'
--     AND column_name = 'fournisseur_id';
