-- ============================================================================
-- 2026-05-14 — Sprint 14 sécu hardening Supabase (V81 finition)
-- ============================================================================
-- Audit Sprint B4 (commit 2422c24) a remonté 5 actions de durcissement.
-- Cette migration en applique 2 sur 5, après analyse statique du risque.
--
-- ── APPLIQUÉ ───────────────────────────────────────────────────────────────
--
-- (1) search_path='' figé sur 4 fonctions SECDEF
--     Zéro risque : les 4 fonctions utilisent déjà des refs qualifiées.
--     Conforme aux 7 autres SECDEF déjà en search_path=''.
--     → Les 11 fonctions SECURITY DEFINER sont désormais toutes durcies.
--
-- (2) FORCE ROW LEVEL SECURITY sur `finances` + `admin_logs` UNIQUEMENT
--     Analyse statique : ces 2 tables ne sont touchées par AUCUN trigger
--     SECURITY DEFINER. Leurs INSERT passent toujours via un JWT user
--     (auth.uid() présent → policies WITH CHECK passent). FORCE RLS y
--     protège contre un bypass par rôle propriétaire (edge function /
--     script mal scopé) sans aucun impact fonctionnel.
--
-- ── NON APPLIQUÉ (analyse statique = risque confirmé) ──────────────────────
--
-- (3) FORCE RLS sur profiles / farms / farm_members / troupeaux
--     REJETÉ. Le trigger `handle_new_user` (SECURITY DEFINER) INSERT dans
--     ces 4 tables au signup avec `new.id`. Les policies WITH CHECK
--     exigent `auth.uid() = id/owner_id/user_id`, MAIS dans le contexte
--     du trigger AFTER INSERT auth.users, la requête tourne sous le rôle
--     gotrue → auth.uid() retourne NULL. Aujourd'hui le signup marche
--     UNIQUEMENT parce que handle_new_user est SECURITY DEFINER et bypasse
--     les policies (RLS non forcé). FORCE RLS supprimerait ce bypass →
--     les 4 INSERT échoueraient → signup cassé. Confirmé par lecture du
--     pg_get_functiondef de handle_new_user.
--
-- ── BACKLOG (Phase 3, sprint dédié) ────────────────────────────────────────
--   - REVOKE INSERT/UPDATE/DELETE/TRUNCATE FROM anon (defense-in-depth)
--   - REVOKE EXECUTE FROM PUBLIC sur fonctions trigger-only
--   - Statuer sur table `troupeaux` legacy (modèle user_id mono-user)
-- ============================================================================

-- (1) ── search_path='' sur 4 SECDEF restantes ──────────────────────────────
ALTER FUNCTION public.get_user_role(user_id uuid)  SET search_path = '';
ALTER FUNCTION public.is_owner_or_admin()          SET search_path = '';
ALTER FUNCTION public.prevent_role_escalation()    SET search_path = '';
ALTER FUNCTION public.rls_auto_enable()            SET search_path = '';

-- (2) ── FORCE RLS sur les 2 tables sûres (sans trigger SECDEF) ──────────────
ALTER TABLE public.finances   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs FORCE ROW LEVEL SECURITY;

-- Rollback si besoin :
--   ALTER TABLE public.finances   NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.admin_logs NO FORCE ROW LEVEL SECURITY;
--   ALTER FUNCTION public.get_user_role(user_id uuid)  RESET search_path;
--   ALTER FUNCTION public.is_owner_or_admin()          RESET search_path;
--   ALTER FUNCTION public.prevent_role_escalation()    RESET search_path;
--   ALTER FUNCTION public.rls_auto_enable()            RESET search_path;
