-- ============================================================================
-- 2026-05-13 — Sprint 2 intégrité : UNIQUE (farm_id, code_id) sur sows/boars/batches
-- ============================================================================
-- Contexte : audit V2 (Agent 4 #31) a révélé qu'aucune contrainte d'unicité
-- n'existait sur le couple (farm_id, code_id) pour les 3 tables principales.
-- Conséquence possible : retry réseau ou double-clic crée des doublons silencieux
-- (ex : 2× T-001 dans la même ferme), KPIs faussés, fiches confondues.
--
-- Audit pré-migration :
--   sows     : 69 totales /  69 distinctes (farm_id, code_id)  → 0 doublon
--   boars    :  5 totaux  /   5 distincts                       → 0 doublon
--   batches  : 12 totaux  /  12 distincts                       → 0 doublon
-- → Migration safe, aucun nettoyage préalable nécessaire.
--
-- On utilise CREATE UNIQUE INDEX (pas ADD CONSTRAINT) pour bénéficier de la
-- syntaxe IF NOT EXISTS et permettre une création CONCURRENTLY ultérieure si
-- la volumétrie grossit (CONCURRENTLY est interdit dans une transaction donc
-- on garde le mode standard pour cette migration sur petite volumétrie).
-- ============================================================================

-- 1) Truies
CREATE UNIQUE INDEX IF NOT EXISTS sows_farm_code_unique
  ON public.sows (farm_id, code_id)
  WHERE code_id IS NOT NULL;

COMMENT ON INDEX public.sows_farm_code_unique IS
  'V81 — Empêche les doublons code_id au sein d''une même ferme. Permet code_id NULL (cas legacy/import).';

-- 2) Verrats
CREATE UNIQUE INDEX IF NOT EXISTS boars_farm_code_unique
  ON public.boars (farm_id, code_id)
  WHERE code_id IS NOT NULL;

COMMENT ON INDEX public.boars_farm_code_unique IS
  'V81 — Empêche les doublons code_id au sein d''une même ferme. Permet code_id NULL (cas legacy/import).';

-- 3) Bandes (batches)
CREATE UNIQUE INDEX IF NOT EXISTS batches_farm_code_unique
  ON public.batches (farm_id, code_id)
  WHERE code_id IS NOT NULL;

COMMENT ON INDEX public.batches_farm_code_unique IS
  'V81 — Empêche les doublons code_id au sein d''une même ferme. Permet code_id NULL (rare, anciens batches PENDING avant code définitif).';

-- Côté client (cf src/components/forms/quickAdd*Logic.ts) la validation
-- pré-INSERT bloque le doublon avec un message clair. Côté DB ces index
-- sont le filet de sécurité ultime en cas de race condition (double-clic,
-- retry offline, flush queue simultanée multi-device).
