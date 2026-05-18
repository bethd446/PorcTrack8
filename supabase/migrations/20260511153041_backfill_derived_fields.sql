-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : reconstruction approximative — la migration prod backfille
-- les champs dérivés des batches/sows (dates calculées).
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- Backfill date_mb_prevue sur sows depuis dernière saillie + 115j.
-- Backfill date_sevrage_prevue sur batches depuis date_mise_bas + 28j.

UPDATE public.sows s
SET date_mb_prevue = (
  SELECT MAX(sa.date_saillie) + INTERVAL '115 days'
  FROM public.saillies sa
  WHERE sa.sow_id = s.id
)::date
WHERE s.date_mb_prevue IS NULL
  AND EXISTS (SELECT 1 FROM public.saillies sa WHERE sa.sow_id = s.id);

UPDATE public.batches
SET date_sevrage_prevue = (date_mise_bas + INTERVAL '28 days')::date
WHERE date_mise_bas IS NOT NULL
  AND date_sevrage_prevue IS NULL;
