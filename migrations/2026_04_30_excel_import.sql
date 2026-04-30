-- ============================================================
-- PorcTrack 8 — Import Excel PROJET_PORC800 .xlsx
-- Date: 2026-04-30
-- Cible farm_id: bc96ddbd-c34d-46b1-b624-4a3dca181a2c
-- Idempotent: chaque INSERT vérifie WHERE NOT EXISTS
-- ============================================================

-- Pré-requis: ALTER TABLE batches ADD COLUMN IF NOT EXISTS date_sevrage_prevue date;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS date_sevrage_prevue date;

-- Pré-requis: table saillies (NEW)
CREATE TABLE IF NOT EXISTS public.saillies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sow_id uuid REFERENCES public.sows(id) ON DELETE SET NULL,
  boar_id uuid REFERENCES public.boars(id) ON DELETE SET NULL,
  sow_code_id text,
  boar_code_id text,
  date_saillie date,
  date_mb_prevue date,
  statut text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saillies_farm_id_idx ON public.saillies(farm_id);
CREATE INDEX IF NOT EXISTS saillies_sow_id_idx ON public.saillies(sow_id);

-- ============================================================
-- 1. sows (TRUIES_REPRODUCTION + CHEPTEL enrichment)
-- ============================================================
BEGIN;
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T01', 'Monette', 'B.22', 'En attente saillie', NULL, NULL, 'En attente saillie', 6.0, 'Sevrage bande ~10/04', 'Large White', 'Maternité Loge 1', 'Allaitante'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T01');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T02', 'Fillaou', 'B.38', 'En attente saillie', NULL, NULL, 'En attente saillie', 6.0, 'Sevrage bande ~10/04', 'Large White', 'Maternité Loge 3', 'Allaitante'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T02');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T03', 'Penelope', 'B.23', 'En attente saillie', NULL, NULL, 'En attente saillie', 6.0, 'Sevrage bande ~10/04', 'Large White', 'Maternité Loge 2', 'Allaitante'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T03');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T06', NULL, 'B.93', 'En attente saillie', NULL, NULL, 'En attente saillie', 6.0, 'Sevrage bande ~10/04 — 2 morts', 'Large White', 'Maternité Loge 7', 'Allaitante'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T06');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T09', 'Zapata', 'B.31', 'Pleine', '2026-07-28'::date, NULL, 'Gestation', 6.0, 'Saillie 05/04/2026 · mise à jour auto script', 'Large White', 'Maternite Loge 9', 'Vide'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T09');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T11', 'Ficelle', 'B.12', 'En attente saillie', NULL, NULL, 'Gestation', 6.0, 'Saillie 05/04/2026 · mise à jour auto script [Date MB prévue: Retour chaleur 21/04]', 'Large White', 'Zone flushing', 'Saillie'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T11');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T14', NULL, 'B.24', 'En maternité', '2026-04-01'::date, NULL, 'En maternité', 6.0, 'MB 01/04/2026 — 13 porcelets — en maternité', 'Large White', 'Maternité Loge 4', 'Saillie'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T14');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T15', 'Anillette', 'B.39', 'Pleine', '2026-07-28'::date, NULL, 'Gestation', 6.0, 'Saillie 05/04/2026 · mise à jour auto script', 'Large White', 'Maternité Loge 6', 'Saillie'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T15');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T16', 'Pirouette', 'B.26', 'Pleine', '2026-07-28'::date, NULL, 'Gestation', 6.0, 'Saillie 05/04/2026 · mise à jour auto script', 'Large White', 'Zone gestantes', 'Gestante'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T16');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T10', NULL, 'B.37', 'En maternité', NULL, NULL, 'En maternité', 6.0, 'MB 23/03/2026 — 5 porcelets — pas sevrés, trop petits/faibles — à surveiller', 'Large White', 'Maternité Loge 9', 'Allaitante'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T10');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T13', NULL, 'B.29', 'En attente saillie', NULL, NULL, 'En attente saillie', 6.0, 'Anciennement B.10 — MB 19-20/03, 6 NV, sevrée', 'Large White', 'Maternité Loge 8', 'Allaitante'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T13');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T18', NULL, 'B.85', 'En maternité', '2026-03-28'::date, NULL, 'En maternité', 6.0, 'MB 28/03/2026 — 12 porcelets — SEVRAGE PREVU AUJOURD HUI 18/04 — urgent', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T18');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T19', NULL, 'B.76', 'En maternité', '2026-04-01'::date, NULL, 'En maternité', 6.0, 'MB 01/04/2026 — 13 porcelets — en maternité', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T19');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T04', 'Pistachette', 'B.19', 'À surveiller', NULL, NULL, 'À surveiller', 3.0, 'Refus allaitement — pas encore saillie — à surveiller', 'Large White', 'À confirmer', 'Observation'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T04');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T05', NULL, 'B.20', 'Pleine', '2026-07-11'::date, NULL, 'Pleine', 3.0, 'Saillie 18/03/2026 — 1ère saillie réussie — MB prévue ~11/07', 'Large White', 'À confirmer', 'Saillie'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T05');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T07', 'Choupette', 'B.21', 'Pleine', '2026-07-28'::date, NULL, 'Gestation', 4.0, 'Saillie 05/04/2026 · mise à jour auto script', 'Large White', 'Zone flushing', 'Saillie'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T07');
INSERT INTO public.sows (farm_id, code_id, name, boucle, statut, date_mb_prevue, nb_portees, alimentation, ration_kg_j, notes, breed, localisation, statut_repro)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T12', NULL, 'B.10', 'Pleine', '2026-05-06'::date, NULL, 'Pleine', 3.0, 'Saillie 11/01/2026 — jamais mis bas — MB prévue ~06/05', 'Large White', 'Zone gestantes', 'Gestante'
WHERE NOT EXISTS (SELECT 1 FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T12');
COMMIT;

-- ============================================================
-- 2. boars (VERRATS + CHEPTEL enrichment)
-- ============================================================
BEGIN;
INSERT INTO public.boars (farm_id, code_id, name, boucle, statut, origine, alimentation, ration_kg_j, notes, breed)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'V01', 'Bobi', 'B.89', 'Actif', 'Thomasset', 'Gestation (KPC)', 3.0, 'Verrat principal', 'Large White'
WHERE NOT EXISTS (SELECT 1 FROM public.boars WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='V01');
INSERT INTO public.boars (farm_id, code_id, name, boucle, statut, origine, alimentation, ration_kg_j, notes, breed)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'V02', 'Aligator', 'B.100', 'Actif', 'Azaguie', 'Gestation (KPC)', 2.5, 'Verrat secondaire', 'Piétrain'
WHERE NOT EXISTS (SELECT 1 FROM public.boars WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='V02');
COMMIT;

-- ============================================================
-- 3. saillies (REPRODUCTION)
-- ============================================================
BEGIN;
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T17' LIMIT 1), NULL, 'T17', NULL, NULL, '2026-04-17'::date, 'Gestante', 'MB prévue 17/04 — À VÉRIFIER TERRAIN (date dépassée)'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T17' AND date_mb_prevue='2026-04-17'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T9' LIMIT 1), NULL, 'T9', NULL, NULL, '2026-04-19'::date, 'Gestante', 'MB prévue 19/04 — À VÉRIFIER TERRAIN (date dépassée)'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T9' AND date_mb_prevue='2026-04-19'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T16' LIMIT 1), NULL, 'T16', NULL, NULL, '2026-04-20'::date, 'Gestante', 'MB prévue 20/04 — À VÉRIFIER TERRAIN (date dépassée)'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T16' AND date_mb_prevue='2026-04-20'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T12' LIMIT 1), NULL, 'T12', NULL, NULL, '2026-05-05'::date, 'Gestante', 'MB prévue 05/05 — dans 10 jours'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T12' AND date_mb_prevue='2026-05-05'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T7' LIMIT 1), (SELECT id FROM public.boars WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='V01' LIMIT 1), 'T7', 'V01', '2026-04-05'::date, NULL, 'Saillie', 'Saillie 05/04 - porcher'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T7' AND date_saillie='2026-04-05'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T8' LIMIT 1), (SELECT id FROM public.boars WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='V01' LIMIT 1), 'T8', 'V01', '2026-04-05'::date, NULL, 'Saillie', 'Saillie 05/04 - porcher'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T8' AND date_saillie='2026-04-05'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T11' LIMIT 1), (SELECT id FROM public.boars WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='V01' LIMIT 1), 'T11', 'V01', '2026-04-05'::date, NULL, 'Saillie', 'Saillie 05/04 - porcher'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T11' AND date_saillie='2026-04-05'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T14' LIMIT 1), (SELECT id FROM public.boars WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='V01' LIMIT 1), 'T14', 'V01', '2026-04-05'::date, NULL, 'Saillie', 'Saillie 05/04 - porcher'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T14' AND date_saillie='2026-04-05'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T15' LIMIT 1), (SELECT id FROM public.boars WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='V01' LIMIT 1), 'T15', 'V01', '2026-04-05'::date, NULL, 'Saillie', 'Saillie 05/04 - porcher'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T15' AND date_saillie='2026-04-05'::date);
INSERT INTO public.saillies (farm_id, sow_id, boar_id, sow_code_id, boar_code_id, date_saillie, date_mb_prevue, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T10' LIMIT 1), (SELECT id FROM public.boars WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='V01' LIMIT 1), 'T10', 'V01', '2026-04-05'::date, '2026-07-14'::date, 'Saillie', 'Saillie 05/04 - en cours'
WHERE NOT EXISTS (SELECT 1 FROM public.saillies WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND sow_code_id='T10' AND date_saillie='2026-04-05'::date);
COMMIT;

-- ============================================================
-- 4. batches INSERT (PORCELETS_BANDES)
-- ============================================================
BEGIN;
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T7-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T07' LIMIT 1), '2026-02-26'::date, 6, 0, 6, '2026-03-19'::date, '2026-03-19'::date, 'Sevrés', 'Bande 1 — Post-sevrage J17'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T7-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T11-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T11' LIMIT 1), '2026-02-26'::date, 12, 0, 12, '2026-03-19'::date, '2026-03-19'::date, 'Sevrés', 'Bande 1 — Ficelle — sevrés 19/03'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T11-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T1-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T01' LIMIT 1), '2026-03-03'::date, 11, 1, 10, '2026-03-24'::date, '2026-04-10'::date, 'Sevrés', 'Sevré 10/04 — sem 6-12 avr'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T1-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T3-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T03' LIMIT 1), '2026-03-06'::date, 13, 0, 13, '2026-03-27'::date, '2026-04-10'::date, 'Sevrés', 'Sevré 10/04 — sem 6-12 avr'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T3-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T2-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T02' LIMIT 1), '2026-03-07'::date, 14, 0, 14, '2026-03-28'::date, '2026-04-10'::date, 'Sevrés', 'Sevré 10/04 — sem 6-12 avr'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T2-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T15-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T15' LIMIT 1), '2026-03-07'::date, 14, 1, 13, '2026-03-28'::date, '2026-04-10'::date, 'Sevrés', 'Correction: T15 Anillette B.39 — sevrés 10/04'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T15-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T9-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T09' LIMIT 1), '2026-03-07'::date, 9, 1, 8, '2026-03-28'::date, '2026-04-10'::date, 'Sevrés', 'Sevré 10/04 — 1 écrasement'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T9-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T16-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T16' LIMIT 1), '2026-03-07'::date, 14, 0, 14, '2026-03-28'::date, '2026-04-10'::date, 'Sevrés', 'Correction: T16 Pirouette B.26 — 14 NV — sevrés 10/04'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T16-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T6-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T06' LIMIT 1), '2026-03-14'::date, 12, 2, 10, '2026-04-04'::date, '2026-04-10'::date, 'Sevrés', 'Sevré 10/04 — 2 morts'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T6-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T13-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T13' LIMIT 1), '2026-03-19'::date, 6, 0, 6, '2026-04-09'::date, '2026-04-10'::date, 'Sevrés', 'T13 anciennement B.10 (maintenant B.29) — 6 NV — sevrés 10/04'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T13-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T10-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T10' LIMIT 1), '2026-03-23'::date, 5, 0, 5, '2026-04-13'::date, NULL, 'Sous mère', 'T10 B.37 — 5 porcelets — PAS sevrés, trop petits — à surveiller'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T10-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T14-02', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T14' LIMIT 1), '2026-04-01'::date, 13, 0, 13, '2026-04-22'::date, NULL, 'Sous mère', 'MB 01/04 — 13 porcelets — en maternité'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T14-02');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T19-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T19' LIMIT 1), '2026-04-01'::date, 13, 0, 13, '2026-04-22'::date, NULL, 'Sous mère', 'MB 01/04 — 13 porcelets — en maternité'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T19-01');
INSERT INTO public.batches (farm_id, code_id, sow_id, date_mise_bas, porcelets_nes_total, nb_mort_nes, porcelets_nes_vivants, date_sevrage_prevue, date_sevrage, statut, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '26-T18-01', (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T18' LIMIT 1), '2026-03-28'::date, 12, 0, 12, '2026-04-18'::date, '2026-04-20'::date, 'Sevrés', 'Sevrage réel le 20/04/2026 (urgent du 18/04 effectué)'
WHERE NOT EXISTS (SELECT 1 FROM public.batches WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='26-T18-01');
COMMIT;

-- ============================================================
-- 5. batches UPDATE (MATERNITE: loge + date_sevrage_prevue)
-- Match by sow padded code + date_mise_bas (most recent batch)
-- ============================================================
BEGIN;
UPDATE public.batches
SET loge = 'L1', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-03-24'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-03'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T01' LIMIT 1);
UPDATE public.batches
SET loge = 'L2', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-03-27'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-06'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T03' LIMIT 1);
UPDATE public.batches
SET loge = 'L3', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-03-28'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-07'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T02' LIMIT 1);
UPDATE public.batches
SET loge = 'L4', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-03-28'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-07'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T14' LIMIT 1);
UPDATE public.batches
SET loge = 'L5', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-03-28'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-07'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T08' LIMIT 1);
UPDATE public.batches
SET loge = 'L6', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-03-28'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-07'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T15' LIMIT 1);
UPDATE public.batches
SET loge = 'L7', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-04-04'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-14'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T06' LIMIT 1);
UPDATE public.batches
SET loge = 'L8', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-04-09'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-19'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T13' LIMIT 1);
UPDATE public.batches
SET loge = 'L9', date_sevrage_prevue = COALESCE(date_sevrage_prevue, '2026-04-13'::date)
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND date_mise_bas = '2026-03-23'::date
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T10' LIMIT 1);
COMMIT;

-- ============================================================
-- 6. batches UPDATE (POST_SEVRAGE: phase + aliment_actuel)
-- Match the most recent batch for each truie
-- ============================================================
BEGIN;
UPDATE public.batches
SET phase = 'Starter 1 (J0-J21)', aliment_actuel = 'KPC 5% + Romelko'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T07' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T07' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Starter 1 (J0-J21)', aliment_actuel = 'KPC 5% + Romelko'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T11' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T11' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sevrage en retard', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T01' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T01' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sevrage en retard', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T03' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T03' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sevrage en retard', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T02' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T02' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sevrage en retard', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T14' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T14' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sevrage en retard', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T08' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T08' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sevrage en retard', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T15' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T15' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sevrage en retard', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T06' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T06' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sous mère', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T13' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T13' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
UPDATE public.batches
SET phase = 'Sous mère', aliment_actuel = 'Romelko RED'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T10' LIMIT 1)
  AND id = (SELECT id FROM public.batches b2 WHERE b2.farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND b2.sow_id = (SELECT id FROM public.sows WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='T10' LIMIT 1) ORDER BY b2.date_mise_bas DESC NULLS LAST LIMIT 1);
COMMIT;

-- ============================================================
-- 7. health_logs (SANTE)
-- ============================================================
BEGIN;
INSERT INTO public.health_logs (farm_id, code_id, log_date, log_type, animal_type, animal_reference, operator, symptom, treatment, duration, result, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-2026-04-07-03', '2026-04-07'::date, 'TRAITEMENT', 'TRUIE', 'T04', 'Porcher', 'Demangeaisons abdominales', 'Penstrep + spray OxyIver', '5 jours', 'Amelioration', 'Boucle 24-26 [Dose: 5ml]'
WHERE NOT EXISTS (SELECT 1 FROM public.health_logs WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-2026-04-07-03');
INSERT INTO public.health_logs (farm_id, code_id, log_date, log_type, animal_type, animal_reference, operator, symptom, treatment, duration, result, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-2026-04-12-04', '2026-04-12'::date, 'OBSERVATION', 'GENERAL', NULL, 'Porcher', '10 mortalites porcelets semaine', NULL, NULL, 'Info', 'Point hebdo sem 6-12 avril'
WHERE NOT EXISTS (SELECT 1 FROM public.health_logs WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-2026-04-12-04');
COMMIT;

-- ============================================================
-- 8. notes (NOTES_TERRAIN)
-- ============================================================
BEGIN;
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Saillie T7 + T8 + T11 + T14 + T15 avec verrats [Animaux: T7,T8,T11,T14,T15]', 'Reproduction', '2026-04-05T00:00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='Saillie T7 + T8 + T11 + T14 + T15 avec verrats [Animaux: T7,T8,T11,T14,T15]');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Sevrage en retard bande 2 — J29-J33 sous mère [Animaux: Bande 2]', 'Porcelet', '2026-04-05T00:00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='Sevrage en retard bande 2 — J29-J33 sous mère [Animaux: Bande 2]');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Stocks Starter/Croissance/Finition à 0 — RUPTURE [Animaux: Tous]', 'Alerte', '2026-04-05T00:00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='Stocks Starter/Croissance/Finition à 0 — RUPTURE [Animaux: Tous]');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'T6: 2 mortalités porcelets enregistrées 17/03 [Animaux: T6]', 'Santé', '2026-04-05T00:00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='T6: 2 mortalités porcelets enregistrées 17/03 [Animaux: T6]');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Porcher | HEBDO | Sem 6-12 avr: 3 truies gest (bruyantes) + 3 lactation. NV total: 9-10. Morts-nés: 6. Mortalité post-natal: ~10 porcelets. Actions: nettoyage loges, suivi renforcé.', 'Porcher', '2026-04-12T00:00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='Porcher | HEBDO | Sem 6-12 avr: 3 truies gest (bruyantes) + 3 lactation. NV total: 9-10. Morts-nés: 6. Mortalité post-natal: ~10 porcelets. Actions: nettoyage loges, suivi renforcé.');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Porcher | MATERNITE | Suivi maternité 9 loges: boucles 29,24,26,30-32,57 entrées 17-30 mars. MB entre 20 mars et 6 avril. Portées 6-13 pcel. Sevrage prévu ~10 avril 2026.', 'Porcher', '2026-04-12T00:00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='Porcher | MATERNITE | Suivi maternité 9 loges: boucles 29,24,26,30-32,57 entrées 17-30 mars. MB entre 20 mars et 6 avril. Portées 6-13 pcel. Sevrage prévu ~10 avril 2026.');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Porcher | QUOTIDIEN | Suivi quotidien sem 6-12 avr: eau + alimentation distribués chaque jour. Aucune naissance. Quelques animaux malades début semaine (maîtrisé). Mortalité totale semaine: ~10 porcelets.', 'Porcher', '2026-04-12T00:00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='Porcher | QUOTIDIEN | Suivi quotidien sem 6-12 avr: eau + alimentation distribués chaque jour. Aucune naissance. Quelques animaux malades début semaine (maîtrisé). Mortalité totale semaine: ~10 porcelets.');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Alertes GTTT | OK | Action terrain validée par USER (Global)', 'Alertes GTTT', now()
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='Alertes GTTT | OK | Action terrain validée par USER (Global)');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, '2026-04-17 00:00:00 | 21:56:33 | Porcher A130 | CONTROLE_QUOTIDIEN | Gestantes imminentes : mise bas confirmée ? | Oui | APP | DEV-C9X1C9FMH', '2026-04-17 00:00:00', '2026-04-17T19:56:33.445000+00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='2026-04-17 00:00:00 | 21:56:33 | Porcher A130 | CONTROLE_QUOTIDIEN | Gestantes imminentes : mise bas confirmée ? | Oui | APP | DEV-C9X1C9FMH');
INSERT INTO public.notes (farm_id, content, category, created_at)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Pesée 6 porcelets · 10kg moy · J+59 [Animaux: Anonyme]', '26-T7-01', '2026-04-26T00:00:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.notes WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content='Pesée 6 porcelets · 10kg moy · J+59 [Animaux: Anonyme]');
COMMIT;

-- ============================================================
-- 9. produits_veto (STOCK_VETO rows 2-8)
-- ============================================================
BEGIN;
INSERT INTO public.produits_veto (farm_id, code_id, libelle, type, usage, unite, stock_actuel, stock_min, dlc, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-20260414-0001', 'Fer injectable', 'Complement', 'Porcelets J3', 'doses', 0.0, 20.0, NULL, 'Fer injectable — stock 0 doses — CRITIQUE'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_veto WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-20260414-0001');
INSERT INTO public.produits_veto (farm_id, code_id, libelle, type, usage, unite, stock_actuel, stock_min, dlc, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-20260414-0002', 'Oxytetracycline', 'Antibiotique', 'Diarrhee', 'ml', 3.0, 5.0, NULL, 'Oxytetracycline OXYTETRA 20% — 3 flacons restants'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_veto WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-20260414-0002');
INSERT INTO public.produits_veto (farm_id, code_id, libelle, type, usage, unite, stock_actuel, stock_min, dlc, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-20260414-0003', 'Ivermectine', 'Antiparasitaire', 'Deparasitage', 'ml', 0.0, 50.0, NULL, 'Ivermectine — stock 0 — deparasitage trimestriel compromis'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_veto WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-20260414-0003');
INSERT INTO public.produits_veto (farm_id, code_id, libelle, type, usage, unite, stock_actuel, stock_min, dlc, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-20260414-0004', 'Vitamines AD3E', 'Complement', 'Truies gestantes', 'ml', 5.0, 3.0, NULL, 'VETOVIT PLUS + CERTIVIT AD3E — 5 unites dispo'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_veto WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-20260414-0004');
INSERT INTO public.produits_veto (farm_id, code_id, libelle, type, usage, unite, stock_actuel, stock_min, dlc, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-20260414-0005', 'Desinfectant', 'Biosecurite', 'Pediluves quotidiens', 'L', 1.0, 3.0, NULL, 'VULKAN R 5L — 1 bidon restant — pediluves quotidiens'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_veto WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-20260414-0005');
INSERT INTO public.produits_veto (farm_id, code_id, libelle, type, usage, unite, stock_actuel, stock_min, dlc, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-20260414-0006', 'Calcium injectable', 'Complement', 'Truies allaitantes', 'ml', 1.0, 3.0, NULL, 'UCAPHOSCAL 5L — 1 bidon — truies allaitantes'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_veto WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-20260414-0006');
INSERT INTO public.produits_veto (farm_id, code_id, libelle, type, usage, unite, stock_actuel, stock_min, dlc, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'SANTE-20260414-0007', 'Anti-diarrheique', 'Traitement', 'Porcelets', 'ml', 0.0, 50.0, NULL, 'Anti-diarrheique — stock 0 — porcelets a risque'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_veto WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='SANTE-20260414-0007');
COMMIT;

-- ============================================================
-- 10. produits_aliments (STOCK_ALIMENTS)
-- ============================================================
BEGIN;
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-MAIS', 'Maïs grain', 'kg', 5050.0, 500.0, 'Inventaire 21/04/2026 — stock OK'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-MAIS');
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-TRUIE-GEST', 'Aliment truie gestation', 'kg', 500.0, 200.0, 'Inventaire 21/04/2026 — stock OK'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-TRUIE-GEST');
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-TRUIE-LACT', 'Aliment truie lactation', 'kg', 200.0, 200.0, 'Inventaire 21/04/2026 — stock OK'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-TRUIE-LACT');
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-PORCELET', 'Aliment porcelet démarrage', 'kg', 150.0, 100.0, 'Inventaire 21/04/2026 — stock OK'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-PORCELET');
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-ENGR', 'Aliment engraissement', 'kg', 500.0, 500.0, 'Inventaire 21/04/2026 — stock OK'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-ENGR');
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-KPC', 'KPC 5% (prémix vitamines)', 'kg', 300.0, 400.0, 'Inventaire 2026-04-21 — stock OK, surveiller consommation (~1 sem)'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-KPC');
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-SOJA', 'Tourteau de soja', 'kg', 500.0, 300.0, 'Inventaire 2026-04-21 — stock BAS, commander sous 5-7 jours (base protéique)'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-SOJA');
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-SON', 'Son de blé', 'kg', 550.0, 80.0, 'Inventaire 2026-04-21 — stock BAS, commander sous 48h (ration truies allaitantes)'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-SON');
INSERT INTO public.produits_aliments (farm_id, code_id, libelle, unite, stock_actuel, seuil_alerte, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'ALIM-COQ', 'Coquillage (minéral Ca)', 'kg', 20.3, 30.0, 'Inventaire 2026-04-21 — stock très BAS, commande urgente (Ca truies allaitantes)'
WHERE NOT EXISTS (SELECT 1 FROM public.produits_aliments WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='ALIM-COQ');
COMMIT;

-- ============================================================
-- 11. feed_inventory (STOCK_ALIMENTS_MOUVEMENTS)
-- ============================================================
BEGIN;
INSERT INTO public.feed_inventory (farm_id, code_id, feed_name, movement_date, movement_type, quantity_kg)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'FEEDMV-1776003314174', 'Mais', '2026-04-12'::date, 'ENTREE', 100.0
WHERE NOT EXISTS (SELECT 1 FROM public.feed_inventory WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id='FEEDMV-1776003314174');
COMMIT;

-- ============================================================
-- 12. finances (FINANCES — skip RECAP TOTAL)
-- ============================================================
BEGIN;
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Alimentation', 1206033.0, 0.8140000000000001, 'Variable', 'Poste principal a optimiser'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Alimentation');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Main-d oeuvre', 100000.0, 0.068, 'Fixe', '1 employe permanent'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Main-d oeuvre');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Eau + Electricite', 60000.0, 0.040999999999999995, 'Fixe', 'Pompage + eclairage'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Eau + Electricite');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Veterinaire', 50000.0, 0.034, 'Variable', 'Prophylaxie + urgences'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Veterinaire');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Biosecurite', 35000.0, 0.024, 'Fixe', 'MIRAH/PPA compliance'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Biosecurite');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Transport + Divers', 30000.0, 0.02, 'Variable', 'Livraisons MP'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Transport + Divers');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Cout/truie productive/mois', 87120.0, NULL, NULL, 'Base 17 truies'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Cout/truie productive/mois');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Cout/porcelet sevre', 174753.0, NULL, NULL, 'Estimation'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Cout/porcelet sevre');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Cout/porc engraisse', 189640.0, NULL, NULL, 'Estimation'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Cout/porc engraisse');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Cout/kg poids vif', 2107.0, NULL, NULL, '> prix vente 2 100 F'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Cout/kg poids vif');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Prix vente moyen', 2100.0, NULL, NULL, 'Fourchette 2000-2200'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Prix vente moyen');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Marge/kg', -7.0, NULL, NULL, 'Marge NEGATIVE'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Marge/kg');
INSERT INTO public.finances (farm_id, poste, mensuel_fcfa, pct_total, type, notes)
SELECT 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid, 'Seuil rentabilite', 95.0, NULL, NULL, 'Minimum pour equilibre'
WHERE NOT EXISTS (SELECT 1 FROM public.finances WHERE farm_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste='Seuil rentabilite');
COMMIT;

-- END IMPORT