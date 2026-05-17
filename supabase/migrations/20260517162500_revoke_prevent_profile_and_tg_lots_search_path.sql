-- =============================================================================
-- 20260517 — Polish post-D4 :
-- 1) REVOKE EXECUTE sur prevent_profile_role_escalation (faux positif advisor :
--    fonction trigger, jamais appelée en RPC)
-- 2) ALTER FUNCTION tg_lots_touch_updated_at SET search_path explicite
--    (advisor function_search_path_mutable)
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.prevent_profile_role_escalation() IS
  'Trigger BEFORE UPDATE on profiles. NE PAS exposer via /rest/v1/rpc/ — EXECUTE revoked de anon/authenticated. service_role bypass (migrations admin).';

ALTER FUNCTION public.tg_lots_touch_updated_at() SET search_path = public, pg_temp;

-- =============================================================================
-- ROLLBACK :
--   GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO PUBLIC;
--   ALTER FUNCTION public.tg_lots_touch_updated_at() RESET search_path;
-- =============================================================================
