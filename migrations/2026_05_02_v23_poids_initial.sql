-- ════════════════════════════════════════════════════════════════════════════
-- Migration V23-S1 : poids_initial_kg obligatoire sur batches (bandes)
--
-- Date     : 2026-05-02
-- Auteur   : agent A (Sprint V23-S1, PorcTrack8)
--
-- Contexte :
--   La pesée au sevrage doit être OBLIGATOIRE pour permettre le calcul correct
--   de l'IC (Indice de Consommation) et du GMQ (Gain Moyen Quotidien). Cible
--   métier porcelets : 5-7 kg au sevrage. La table cible est `public.batches`
--   (équivalent métier : "bandes") qui porte déjà `poids_moyen_kg numeric` (NULL
--   autorisé), insuffisant pour les KPI techniques.
--
-- Stratégie :
--   1. Ajout colonne `poids_initial_kg numeric` (nullable au départ).
--   2. Backfill idempotent :
--        - copie depuis `poids_moyen_kg` si non NULL ;
--        - sinon estimation déterministe selon `statut` / `phase`.
--   3. Pose contrainte CHECK + NOT NULL une fois le backfill fait.
--
-- Idempotent : peut être ré-exécutée sans effet de bord.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Colonne (nullable d'abord pour permettre le backfill) ────────────────
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS poids_initial_kg numeric;

-- ── 2. Backfill des lignes existantes ───────────────────────────────────────
-- On ne touche QUE les lignes où poids_initial_kg IS NULL pour rester idempotent.
UPDATE public.batches
SET poids_initial_kg = COALESCE(
  poids_moyen_kg,
  CASE
    -- Statuts/phases FR (valeurs réelles en prod)
    WHEN phase ILIKE '%sous mere%' OR phase ILIKE '%sous mère%'                  THEN 6
    WHEN phase ILIKE '%sevrage en retard%'                                       THEN 6
    WHEN phase ILIKE '%starter%' OR phase ILIKE '%post%sevrage%'                 THEN 8
    WHEN phase ILIKE '%croissance%'                                              THEN 25
    WHEN phase ILIKE '%engraissement%'                                           THEN 50
    WHEN phase ILIKE '%finition%'                                                THEN 80
    WHEN phase ILIKE '%sortie%' OR phase ILIKE '%vendu%'                         THEN 110
    WHEN statut ILIKE '%sous mere%' OR statut ILIKE '%sous mère%'                THEN 6
    WHEN statut ILIKE '%sevr%'                                                   THEN 6
    WHEN statut ILIKE '%vendu%' OR statut ILIKE '%sortie%'                       THEN 110
    -- Codes EN normalisés (autres farms / futur)
    WHEN statut = 'SOUS_MERE'                                                    THEN 6
    WHEN statut = 'POST_SEVRAGE'                                                 THEN 8
    WHEN statut = 'CROISSANCE'                                                   THEN 25
    WHEN statut = 'ENGRAISSEMENT'                                                THEN 50
    WHEN statut = 'FINITION'                                                     THEN 80
    WHEN statut IN ('SORTIE', 'VENDUE')                                          THEN 110
    ELSE 6  -- défaut conservateur (cible sevrage)
  END
)
WHERE poids_initial_kg IS NULL;

-- ── 3. Contrainte de plage cohérente élevage porcin (porcelet → finition) ──
-- DROP avant CREATE pour rester idempotent (ADD CONSTRAINT IF NOT EXISTS
-- n'existe pas pour les CHECK avant PG 18 sur tous les fournisseurs).
ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_poids_initial_kg_range_chk;
ALTER TABLE public.batches
  ADD CONSTRAINT batches_poids_initial_kg_range_chk
  CHECK (poids_initial_kg > 0 AND poids_initial_kg <= 200);

-- ── 4. NOT NULL une fois le backfill garanti ────────────────────────────────
ALTER TABLE public.batches
  ALTER COLUMN poids_initial_kg SET NOT NULL;

-- ── 5. Documentation ────────────────────────────────────────────────────────
COMMENT ON COLUMN public.batches.poids_initial_kg IS
  'Poids moyen kg au démarrage de la bande (sevrage). Obligatoire pour calcul IC/GMQ. Cible métier 5-7kg au sevrage.';

-- ── Vérification (non exécutée, à lancer en post-deploy) ────────────────────
-- SELECT count(*) total, count(poids_initial_kg) filled,
--        min(poids_initial_kg) mn, max(poids_initial_kg) mx, avg(poids_initial_kg) avg
-- FROM public.batches;
