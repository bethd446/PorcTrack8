-- ============================================================================
-- 2026-05-14 — Sprint 17 sécu Phase 3 · durcissement defense-in-depth
-- ============================================================================
-- Diagnostic Sprint 17 (sub-agent Opus, lecture seule) :
--   - anon ET authenticated avaient les 7 privilèges DML sur 34 tables public
--   - 2 trigger functions fuitaient EXECUTE vers anon/authenticated
--
-- APPLIQUÉ (les 2 actions diagnostiquées SAFE) :
--
-- (1) REVOKE DML anon — defense-in-depth. RLS bloque déjà anon (policies
--     exigent auth.uid() non NULL), ce REVOKE retire le privilège AVANT
--     l'évaluation RLS. SELECT préservé (aucune lecture publique cassée).
--     authenticated NON touché (l'app a besoin d'INSERT/UPDATE/DELETE).
--
-- (2) REVOKE EXECUTE sur 2 trigger functions — increment_sow_nb_portees_on_mb
--     et set_sow_mb_prevue_on_saillie fuitaient vers anon/authenticated.
--     Ce sont des fonctions trigger (appelées par le moteur Postgres lors
--     d'INSERT, jamais via .rpc() client). Les 5 RLS helpers
--     (current_user_farms, is_member_with_role, is_owner_or_admin,
--     get_user_role, user_farms) ne sont PAS touchés → policies intactes.
--
-- NON APPLIQUÉ :
--   - Table `troupeaux` legacy : GARDÉE. 10 comptes V25 l'utilisent encore
--     activement via le fallback documenté de settingsService.ts (V81
--     Sprint 5). Migration = sprint dédié (backfill troupeaux→farms).
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;

REVOKE EXECUTE ON FUNCTION public.increment_sow_nb_portees_on_mb() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_sow_mb_prevue_on_saillie()   FROM PUBLIC, anon, authenticated;

-- Rollback si besoin :
--   GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
--   GRANT EXECUTE ON FUNCTION public.increment_sow_nb_portees_on_mb() TO authenticated;
--   GRANT EXECUTE ON FUNCTION public.set_sow_mb_prevue_on_saillie()   TO authenticated;
