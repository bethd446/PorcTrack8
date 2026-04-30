-- ═══════════════════════════════════════════════════════════════
-- PorcTrack 8 — Rollback migration B2
-- Date : 2026-04-30
-- ═══════════════════════════════════════════════════════════════
-- Annule TOUS les changements de 2026_04_30_b2_complete.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Section 6 reverse — supprimer le troupeau restauré
DELETE FROM public.troupeaux
WHERE user_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND nom = 'Ferme Liegois Christophe'
  AND secteur = 'Principal';

-- Section 5 reverse — RLS policies troupeaux
DROP POLICY IF EXISTS "troupeaux_insert_own" ON public.troupeaux;
DROP POLICY IF EXISTS "troupeaux_update_own" ON public.troupeaux;
DROP POLICY IF EXISTS "troupeaux_delete_own" ON public.troupeaux;

-- Section 4 reverse — RLS policies profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Section 3 reverse — RLS policy saillies (sera dropped automatiquement avec la table)

-- Section 2 reverse — restaurer le trigger original (sans troupeau)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'USER');
  RETURN new;
END;
$$;

-- Section 1 reverse — colonne batches + table saillies
ALTER TABLE public.batches DROP COLUMN IF EXISTS date_sevrage_prevue;
DROP TABLE IF EXISTS public.saillies CASCADE;

COMMIT;
