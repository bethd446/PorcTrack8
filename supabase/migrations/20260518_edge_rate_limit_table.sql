-- =================================================================
-- Edge Functions Rate-Limit Table
-- =================================================================
-- 2026-05-18 — Audit phase 1 (Edge hardening)
--
-- Objet : empêcher l'abus des Edge Functions par un compte authentifié
--         (marius-chat = 30 req/min, send-push = 10 req/min).
-- Pattern : "leaky bucket" minute glissante.
--
-- Sécurité :
--   - RLS active. Service role bypass (les Edge Functions y écrivent
--     avec SUPABASE_SERVICE_ROLE_KEY).
--   - L'utilisateur authentifié peut UNIQUEMENT lire sa propre ligne
--     (debug futur), aucune écriture client.
-- =================================================================

CREATE TABLE IF NOT EXISTS public._edge_rate_limit (
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name  TEXT        NOT NULL,
  window_start   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count_in_window INT        NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, function_name)
);

COMMENT ON TABLE public._edge_rate_limit IS
  'Rate-limit Edge Functions (leaky bucket 60s). Écrit par service_role uniquement.';

CREATE INDEX IF NOT EXISTS idx_edge_rate_limit_window
  ON public._edge_rate_limit(window_start);

ALTER TABLE public._edge_rate_limit ENABLE ROW LEVEL SECURITY;

-- Lecture self-only (debug). Aucune policy INSERT/UPDATE/DELETE client.
DROP POLICY IF EXISTS "rl_self_read" ON public._edge_rate_limit;
CREATE POLICY "rl_self_read" ON public._edge_rate_limit
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- Revoke explicite des DML anon/authenticated. Service_role bypass.
REVOKE INSERT, UPDATE, DELETE ON public._edge_rate_limit FROM anon, authenticated;
GRANT  SELECT ON public._edge_rate_limit TO authenticated;
