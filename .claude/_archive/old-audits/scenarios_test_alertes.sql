-- ════════════════════════════════════════════════════════════════════════════
-- Scénarios time-travel pour test E2E compte audit-final@porctrack.test
-- user_id : 0f2577f1-ba42-4895-b43f-d3d4acc29867
-- ────────────────────────────────────────────────────────────────────────────
-- Permet de simuler tous les scénarios d'alertes / boutons / notifications
-- en réajustant les dates des saillies, mises bas, sevrages, pesées, etc.
--
-- USAGE : avant un test E2E, lancer le scénario voulu via curl :
--   curl -X POST "https://api.supabase.com/v1/projects/jcritwravdwefwqwyjvk/database/query" \
--     -H "Authorization: Bearer sbp_..." -H "Content-Type: application/json" \
--     --data-binary @<(jq -nc --arg q "$(cat scenario_X.sql)" '{query: $q}')
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Scénario A : R1 Mise-bas imminente (J-2) ──────────────────────────────
-- État cible : T-001 a une saillie J-113 → R1 doit s'afficher sur Today hub.
-- Pour rejouer : repositionner la saillie à J-113.
--
-- UPDATE public.saillies
--    SET date_saillie = CURRENT_DATE - 113
--  WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867'
--    AND sow_id = (SELECT id FROM sows WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867' AND code_id='T-001')
--    AND statut='CONFIRMEE';

-- ─── Scénario B : R2 Sevrage J+28 ──────────────────────────────────────────
-- Bande "Sous mère" avec date_mise_bas = CURRENT_DATE - 28 → sevrage à faire.
--
-- UPDATE public.batches
--    SET date_mise_bas = CURRENT_DATE - 28
--  WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867'
--    AND code_id='B-AUDIT-MB';

-- ─── Scénario C : R3 Retour chaleur post-sevrage ────────────────────────────
-- Truie sevrée il y a 5j → R3 attendue.
--
-- UPDATE public.sows
--    SET statut='Vide'
--  WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867'
--    AND code_id='T-031';
-- UPDATE public.batches
--    SET date_sevrage = CURRENT_DATE - 5,
--        phase='Post-sevrage'
--  WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867'
--    AND sow_id=(SELECT id FROM sows WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867' AND code_id='T-031');

-- ─── Scénario D : R4 Mortalité anormale (>15%) ──────────────────────────────
-- Bande avec porcelets_nes_total=10 et porcelets_nes_vivants=8 → 20% morts → R4.
--
-- UPDATE public.batches
--    SET porcelets_nes_total=10, porcelets_nes_vivants=8, nb_mort_nes=2
--  WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867'
--    AND code_id='B-AUDIT-MB';

-- ─── Scénario E : R7 Échographie J+25 à J+35 ────────────────────────────────
-- Saillie il y a 30j, attendre confirmation gestation.
--
-- UPDATE public.saillies
--    SET date_saillie = CURRENT_DATE - 30, statut='EN_OBSERVATION'
--  WHERE farm_id='0f2577f1-ba42-4865-acc9-7961dbd33559'
--    AND sow_id=(SELECT id FROM sows WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867' AND code_id='T-002');

-- ─── Scénario F : R13 Manque pesée (21j+) ────────────────────────────────────
-- Bande Croissance sans pesée depuis 25j.
--
-- DELETE FROM public.pesees
--  WHERE porcelet_id IN (
--    SELECT id FROM porcelets_individuels
--     WHERE batch_id IN (SELECT id FROM batches WHERE code_id='B-AUDIT-CR')
--  );

-- ─── Reset complet : remet l'état "stable" du compte test ──────────────────
-- Utiliser AVANT chaque nouvelle session de test pour repartir d'un état propre.
--
-- (Voir .claude/audits/seed_audit_50_3.sql pour le seed initial complet)

-- ─── État ACTUEL (after V28-FIX) ────────────────────────────────────────────
-- T-001 saillie : J-113 (1 saillie unique) → R1 attendue
-- B-AUDIT-MB : date_mise_bas = J-27 (R2 sevrage attendue J+1)
-- 31 saillies au total
-- 50T / 3V / 3 bandes / 11 porcelets / 13 loges
