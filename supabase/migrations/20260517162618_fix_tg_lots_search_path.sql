-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_proc snapshot (tg_lots_touch_updated_at).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- Sécurité : la fonction tg_lots_touch_updated_at créée par
-- v80_engraissement_lots n'avait pas de search_path fixé. Linter Supabase
-- flag CRITIQUE → on force search_path='public, pg_temp'.

CREATE OR REPLACE FUNCTION public.tg_lots_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
