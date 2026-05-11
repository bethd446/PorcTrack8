-- V80 — Module Engraissement : lots + pesées hebdo + mortalité par cause.
-- Sprint V80 P0 #2 (Agent A5 engraissement-module).
--
-- 3 nouvelles tables :
--   - lots                : lot d'engraissement (réception → vente)
--   - lot_pesees          : pesées hebdo poids moyen + nb porcs pesés
--   - lot_mortalites      : mortalités par cause (date + nb + cause libre)
--
-- RLS : pattern V71-P2 `farm_id IN (SELECT public.current_user_farms())`.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Table lots
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  date_arrivee DATE NOT NULL,
  fournisseur TEXT,
  nb_porcs_initial INT NOT NULL CHECK (nb_porcs_initial > 0),
  poids_moyen_arrivee NUMERIC(6,2) CHECK (poids_moyen_arrivee IS NULL OR (poids_moyen_arrivee > 0 AND poids_moyen_arrivee <= 200)),
  prix_unitaire_achat NUMERIC(12,2) CHECK (prix_unitaire_achat IS NULL OR prix_unitaire_achat >= 0),
  statut TEXT NOT NULL DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'VENDU', 'CLOTURE')),
  date_quarantaine_fin DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lots_farm_id_idx ON public.lots(farm_id);
CREATE INDEX IF NOT EXISTS lots_statut_idx ON public.lots(statut) WHERE statut = 'EN_COURS';
CREATE UNIQUE INDEX IF NOT EXISTS lots_farm_code_unique ON public.lots(farm_id, code);

ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lots_all ON public.lots;
CREATE POLICY lots_all ON public.lots
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_lots_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lots_updated_at ON public.lots;
CREATE TRIGGER lots_updated_at
  BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.tg_lots_touch_updated_at();

COMMENT ON TABLE public.lots IS 'V80 — Lots d''engraissement (réception → vente). 1 lot = N porcs achetés ensemble.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Table lot_pesees (pesées hebdo poids moyen)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lot_pesees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  poids_moyen NUMERIC(6,2) NOT NULL CHECK (poids_moyen > 0 AND poids_moyen <= 200),
  nb_porcs_pesees INT NOT NULL CHECK (nb_porcs_pesees > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lot_pesees_lot_id_idx ON public.lot_pesees(lot_id);
CREATE INDEX IF NOT EXISTS lot_pesees_farm_id_idx ON public.lot_pesees(farm_id);
CREATE INDEX IF NOT EXISTS lot_pesees_date_idx ON public.lot_pesees(lot_id, date DESC);

ALTER TABLE public.lot_pesees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lot_pesees_all ON public.lot_pesees;
CREATE POLICY lot_pesees_all ON public.lot_pesees
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

COMMENT ON TABLE public.lot_pesees IS 'V80 — Pesées hebdo (poids moyen + nb porcs pesés) d''un lot d''engraissement.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Table lot_mortalites
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lot_mortalites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  nb_morts INT NOT NULL CHECK (nb_morts > 0),
  cause TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lot_mortalites_lot_id_idx ON public.lot_mortalites(lot_id);
CREATE INDEX IF NOT EXISTS lot_mortalites_farm_id_idx ON public.lot_mortalites(farm_id);
CREATE INDEX IF NOT EXISTS lot_mortalites_date_idx ON public.lot_mortalites(lot_id, date DESC);

ALTER TABLE public.lot_mortalites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lot_mortalites_all ON public.lot_mortalites;
CREATE POLICY lot_mortalites_all ON public.lot_mortalites
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

COMMENT ON TABLE public.lot_mortalites IS 'V80 — Mortalités par cause sur un lot d''engraissement.';

COMMIT;
