# Sub-agent 4 — Edge functions (terminé)
Log: /tmp/audit-4-edge.log

## send-push v2 — 🟠
- 🔴 P0 cross-tenant: payload.farm_id + user_ids[] consommés tels quels via service_role bypass RLS. Mitigé aujourd'hui par 0 row push_subscriptions.
- 🔴 P0 CORS wildcard `*` (diverge de marius-chat qui est borné porctrack.tech)
- 🟡 P1 pas de sanitization payload.url → SW peut ouvrir phishing
- 🟡 P2 pas de Zod validation

## marius-chat v1 — 🟡
- Code propre: CORS borné, system prompt server-side, slice -12/2000, JWT vérifié, pas de leak.
- 🟡 P1 pas de rate-limit + pas de timeout fetch Mistral (risque coût)

## Limites audit
- mcp__supabase__get_logs et get_edge_function refusés par policy → drift local/déployé non vérifié
- Action: whitelist dans .claude/settings.json OU vérif dashboard

## Fix recommandés
A1. send-push: vérifier ownership farm_id via auth.uid avant push
A2. send-push: CORS allowlist `Origin: https://porctrack.tech`
A3. send-push: sanitize url (URL parsing + scheme check)
B1. marius-chat: AbortController 30s
B2. marius-chat: rate-limit (table ou Deno KV)
C1. Whitelist MCP edge function read tools
C2. Vérifier secrets VAPID_* + MISTRAL_API_KEY (post-rotation)
C3. Redeploy après fix
