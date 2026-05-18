-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_proc + pg_trigger snapshot (set_sow_mb_prevue_on_saillie).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.

CREATE OR REPLACE FUNCTION public.set_sow_mb_prevue_on_saillie()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.sow_id IS NOT NULL AND NEW.date_saillie IS NOT NULL THEN
    NEW.date_mb_prevue := (NEW.date_saillie + INTERVAL '115 days')::date;
    UPDATE public.sows SET date_mb_prevue = NEW.date_mb_prevue WHERE id = NEW.sow_id;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS saillies_set_mb_prevue ON public.saillies;
CREATE TRIGGER saillies_set_mb_prevue
  BEFORE INSERT OR UPDATE OF date_saillie, sow_id ON public.saillies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sow_mb_prevue_on_saillie();
