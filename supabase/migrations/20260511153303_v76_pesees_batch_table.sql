-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : information_schema.columns + pg_indexes snapshot (pesees_batch).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.

CREATE TABLE IF NOT EXISTS public.pesees_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  date_pesee date NOT NULL DEFAULT CURRENT_DATE,
  nb_porcelets integer NOT NULL,
  poids_moyen_kg numeric NOT NULL,
  gmq numeric,
  methode text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_pesees_batch_batch_id ON public.pesees_batch USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_pesees_batch_farm_id ON public.pesees_batch USING btree (farm_id);

ALTER TABLE public.pesees_batch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pesees_batch_select ON public.pesees_batch;
CREATE POLICY pesees_batch_select ON public.pesees_batch
  FOR SELECT
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN','WORKER']));

DROP POLICY IF EXISTS pesees_batch_insert ON public.pesees_batch;
CREATE POLICY pesees_batch_insert ON public.pesees_batch
  FOR INSERT
  WITH CHECK (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN','WORKER']));

DROP POLICY IF EXISTS pesees_batch_update ON public.pesees_batch;
CREATE POLICY pesees_batch_update ON public.pesees_batch
  FOR UPDATE
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN']));

DROP POLICY IF EXISTS pesees_batch_delete ON public.pesees_batch;
CREATE POLICY pesees_batch_delete ON public.pesees_batch
  FOR DELETE
  USING (public.is_member_with_role(farm_id, VARIADIC ARRAY['OWNER','ADMIN']));
