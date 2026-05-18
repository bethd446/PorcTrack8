-- 2026-05-18 — Phase 2 hardening SECURITY DEFINER
-- Branche feat/mechanic-complete-2026-05-18 (fork f4ae08c).
-- Advisor security : 5 fonctions SECURITY DEFINER appelables par authenticated.
-- Analyse :
--   - user_farms(uuid) : prend UN UID en param → ENUMERATION RISK. REVOKE.
--   - get_user_role(uuid) : prend UN UID en param → idem. REVOKE.
--   - is_owner_or_admin() : utilisée UNIQUEMENT par trigger prevent_role_escalation
--     (lui-même SECURITY DEFINER s'exécute en tant que postgres → REVOKE safe).
--   - is_member_with_role(uuid, text[]) : utilisée par 14+ policies RLS. REVOKE
--     casserait les policies → GARDER l'EXECUTE authenticated (pattern Supabase
--     RLS helper accepté).
--   - current_user_farms() : utilisée par 30+ policies RLS, légitime helper.
--     GARDER l'EXECUTE authenticated.
-- Résultat : 3 fonctions revoke, 2 warnings restants assumés (helpers RLS).

REVOKE EXECUTE ON FUNCTION public.user_farms(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_owner_or_admin() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.user_farms(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_owner_or_admin() TO service_role;

COMMENT ON FUNCTION public.user_farms(uuid) IS
  'V83 hardening 2026-05-18 : REVOKE authenticated (énumération risk). service_role only.';
COMMENT ON FUNCTION public.get_user_role(uuid) IS
  'V83 hardening 2026-05-18 : REVOKE authenticated (énumération risk). service_role only.';
COMMENT ON FUNCTION public.is_owner_or_admin() IS
  'V83 hardening 2026-05-18 : REVOKE authenticated. Utilisée uniquement via trigger prevent_role_escalation (SECURITY DEFINER).';
