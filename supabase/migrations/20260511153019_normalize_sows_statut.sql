-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_constraint snapshot (sows_statut_chk, sows_statut_repro_chk).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- Normalise la colonne sows.statut + sows.statut_repro avec un CHECK
-- constraint sur les valeurs canoniques (libellés UI tels qu'affichés).

-- Valeurs canoniques :
--   'En attente saillie' | 'Pleine' | 'En maternité' | 'À surveiller'
--   | 'Réforme' | 'Morte'

ALTER TABLE public.sows
  DROP CONSTRAINT IF EXISTS sows_statut_chk;

ALTER TABLE public.sows
  ADD CONSTRAINT sows_statut_chk
  CHECK (
    statut IS NULL OR statut = ANY (ARRAY[
      'En attente saillie'::text,
      'Pleine'::text,
      'En maternité'::text,
      'À surveiller'::text,
      'Réforme'::text,
      'Morte'::text
    ])
  );

ALTER TABLE public.sows
  DROP CONSTRAINT IF EXISTS sows_statut_repro_chk;

ALTER TABLE public.sows
  ADD CONSTRAINT sows_statut_repro_chk
  CHECK (
    statut_repro IS NULL OR statut_repro = ANY (ARRAY[
      'En attente saillie'::text,
      'Pleine'::text,
      'En maternité'::text,
      'À surveiller'::text,
      'Réforme'::text,
      'Morte'::text
    ])
  );
