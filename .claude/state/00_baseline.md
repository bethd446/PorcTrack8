# Audit mécanique — Baseline initiale
Date: 2026-05-18
Branche: feat/mechanic-audit-2026-05-18
Fork commit: e056831 (main, V82b)

## Sub-agents dispatched
| # | Agent ID | Mission | Output |
|---|----------|---------|--------|
| 1 | a0c589a95cacced9c | Boutons + handlers UI | /tmp/audit-1-buttons.log |
| 2 | add0cd89b608a5a85 | Data flows critiques (5) | /tmp/audit-2-flows.log |
| 3 | aa2145e5d2ed6b4eb | RLS + intégrité Supabase | /tmp/audit-3-rls.log |
| 4 | a865b04107d5193c5 | Edge functions | /tmp/audit-4-edge.log |
| 5 | a42c377c4b6434ba6 | Baseline tests/tsc/eslint/build | /tmp/audit-5-baseline.log |

## Contrat
Tous les agents doivent rendre un rapport avec bloc `=== VERIFICATION ===` (cf .claude/AGENT_CONTRACT.md).
Aucune écriture Supabase autorisée. Lecture only.

## Règles session
- Pas de DROP / RENAME / migration destructive
- Migrations additives nullable + backfill si modif
- pg_dump pré-modif obligatoire (à déclencher avant phase fix)
- 787 tests Vitest baseline à ne pas régresser
- Pas de design touch
- PR finale: feat/mechanic-audit-2026-05-18 → main
