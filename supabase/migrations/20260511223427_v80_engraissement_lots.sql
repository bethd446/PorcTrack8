-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : information_schema.columns + pg_constraint snapshot (lots).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- V80 P0 — table lots pour profil engraisseur (achat lots de porcs à
-- engraisser avec dates, coûts, statut, quarantaine).

CREATE TABLE IF NOT EXISTS public.lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  code text NOT NULL,
  date_arrivee date NOT NULL,
  fournisseur text,
  nb_porcs_initial integer NOT NULL CHECK (nb_porcs_initial > 0),
  poids_moyen_arrivee numeric CHECK (poids_moyen_arrivee IS NULL OR (poids_moyen_arrivee > 0 AND poids_moyen_arrivee <= 200)),
  prix_unitaire_achat numeric CHECK (prix_unitaire_achat IS NULL OR prix_unitaire_achat >= 0),
  statut text NOT NULL DEFAULT 'EN_COURS' CHECK (statut = ANY (ARRAY['EN_COURS','VENDU','CLOTURE'])),
  date_quarantaine_fin date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lots_farm_id ON public.lots(farm_id);

-- Trigger : touch updated_at
CREATE OR REPLACE FUNCTION public.tg_lots_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tg_lots_touch_updated_at ON public.lots;
CREATE TRIGGER tg_lots_touch_updated_at
  BEFORE UPDATE ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_lots_touch_updated_at();

-- RLS
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lots_select ON public.lots;
CREATE POLICY lots_select ON public.lots
  FOR SELECT
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN','WORKER']));

DROP POLICY IF EXISTS lots_insert ON public.lots;
CREATE POLICY lots_insert ON public.lots
  FOR INSERT
  WITH CHECK (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN']));

DROP POLICY IF EXISTS lots_update ON public.lots;
CREATE POLICY lots_update ON public.lots
  FOR UPDATE
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN','WORKER']));

DROP POLICY IF EXISTS lots_delete ON public.lots;
CREATE POLICY lots_delete ON public.lots
  FOR DELETE
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN']));
