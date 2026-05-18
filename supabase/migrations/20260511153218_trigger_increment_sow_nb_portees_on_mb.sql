-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_proc + pg_trigger snapshot (increment_sow_nb_portees_on_mb).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.

CREATE OR REPLACE FUNCTION public.increment_sow_nb_portees_on_mb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.date_mise_bas IS NOT NULL THEN
    IF NEW.sow_id IS NOT NULL THEN
      UPDATE public.sows SET nb_portees = COALESCE(nb_portees, 0) + 1 WHERE id = NEW.sow_id;
    END IF;
    UPDATE public.sows s SET nb_portees = COALESCE(nb_portees, 0) + 1
    WHERE EXISTS (SELECT 1 FROM public.batch_sows bs WHERE bs.batch_id = NEW.id AND bs.sow_id = s.id);
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS batches_increment_nb_portees ON public.batches;
CREATE TRIGGER batches_increment_nb_portees
  AFTER INSERT ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_sow_nb_portees_on_mb();
