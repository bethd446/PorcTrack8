-- ═══════════════════════════════════════════════════════════════
-- PorcTrack 8 — Cleanup multi-tenant (post-audit 2026-05-01)
-- Date : 2026-05-01
-- ═══════════════════════════════════════════════════════════════
-- Contexte : audit du modèle multi-tenant a confirmé que :
--   - Le trigger handle_new_user (migration 2026_04_30_b2) crée bien
--     profile + troupeau au signup → chaîne d'isolation OK.
--   - 13 tables métier (sows, boars, batches, saillies, notes,
--     finances, health_logs, produits_aliments, produits_veto,
--     plan_alimentation, feed_inventory, vet_inventory, alert_dismissals)
--     ont farm_id + policies RLS isolation_by_farm OK.
--
-- Problèmes résiduels :
--   1. Table public.bandes : RLS activé MAIS 0 policy + JAMAIS lue/écrite
--      par le client (le code utilise public.batches). Legacy orpheline.
--   2. La table garde une FK vers troupeaux qui n'apporte rien au modèle
--      isolation actuel (farm_id = auth.uid() côté batches).
--
-- Décision : DROP la table bandes. Pas de risque de perte (jamais utilisée
-- par le code). Backup logique via un SELECT INTO temporaire si besoin.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Sécurité : confirmer que la table bandes ne contient que des données seed
-- ou orphelines avant DROP. (À runner manuellement avant si doute.)
-- SELECT count(*) FROM public.bandes;

DROP TABLE IF EXISTS public.bandes CASCADE;

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- Vérif post-migration :
--   SELECT to_regclass('public.bandes');  -- doit retourner NULL
--   SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
-- ═══════════════════════════════════════════════════════════════
