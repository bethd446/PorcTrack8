# Sub-agent 2 — Data flows (terminé)
Log: /tmp/audit-2-flows.log

## Findings par flow
- 🟡 Flow 1 Saillie — code OK, dépend triggers DB non versionnés
- 🔴 Flow 2 Mise-bas — phase divergente, porcelets non auto-créés
- 🔴 Flow 3 Pesée — écrit dans `notes` au lieu de `pesees`
- 🟡 Flow 4 Sevrage — phase kebab vs SCREAMING_SNAKE
- 🟡 Flow 5 Transfert — error swallow + vide sanitaire absent

## Top 5 ruptures
1. `src/components/forms/QuickPeseeForm.tsx:279` — `insertNote` au lieu de `insertPesee`
2. `QuickMiseBasForm.tsx:233` phase='maternite' vs `mbWorkflowService.ts:181` phase='SOUS_MERE'
3. `QuickSevrageForm.tsx:155` phase='post-sevrage' vs aggregator attend 'POST_SEVRAGE'
4. Triggers `set_sow_mb_prevue_on_saillie` + `increment_sow_nb_portees_on_mb` REFERENCED dans migration 20260514_sprint17 mais CREATE FUNCTION absent du repo
5. `supabaseWrites.ts:1310-1312` moveSubject swallow erreur update loge_id final

## SQL à exécuter (validation orchestrateur)
- `SELECT … FROM pg_trigger WHERE tgrelid IN (saillies,batches,sows,loge_movements)`
- `SELECT pg_get_functiondef(p.oid) FROM pg_proc p WHERE proname IN ('set_sow_mb_prevue_on_saillie','increment_sow_nb_portees_on_mb')`
- Distribution `SELECT phase, statut, COUNT(*) FROM batches GROUP BY phase, statut`
- `SELECT MAX(created_at), COUNT(*) FROM pesees`
- `SELECT MAX(created_at), COUNT(*) FROM notes WHERE category='PESEE'`
- `SELECT MAX(created_at), COUNT(*) FROM lot_pesees`
- `SELECT MAX(created_at), COUNT(*) FROM loge_movements`
