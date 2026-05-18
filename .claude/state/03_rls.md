# Sub-agent 3 — RLS + intégrité Supabase (terminé)
Log: /tmp/audit-3-rls.log

## 🔴 CRITIQUE
**pesees_batch** : table EXISTE en prod (0 rows, list_tables dit rls_enabled=true) mais :
- CREATE TABLE absent du repo (migration drift cf 02b)
- 0 type TS dans database.types.ts
- 0 usage code (grep src/)
- Policies inconnues — si rowsecurity=true sans policy = lockout, si sans rowsecurity = full access authenticated

## 🟠 ÉLEVÉ
- `user_farms(uid uuid)` SECURITY DEFINER appelable par authenticated → énumération fermes d'autres users (mitigé : 0 .rpc côté UI mais endpoint REST exposé). FIX: `REVOKE EXECUTE FROM authenticated`
- `get_user_role(uuid)` même vecteur. FIX idem.
- `saillies.farm_id → profiles.id` au lieu de `farms.id` (cf migrations/2026_04_30_b2_complete.sql:22). Fonctionnellement OK car invariant `profiles.id == farms.id`, structurellement incorrect.

## 🟡 MOYEN
- `is_owner_or_admin()` deprecated lit profiles.role global, encore utilisée par trigger v82b
- `loge_movements.from/to_loge_id` sans ON DELETE SET NULL → UUID orphelin si loge supprimée
- `adoptions` policies UPDATE/DELETE manquantes (probablement intentionnel : immutabilité)

## Fixes recommandés (migrations additives)
1. Vérifier `pesees_batch` policies (SQL live) puis ALTER ENABLE RLS + CREATE POLICY si manquantes
2. `REVOKE EXECUTE ON FUNCTION user_farms(uuid), get_user_role(uuid) FROM authenticated`
3. `loge_movements` ADD CONSTRAINT ON DELETE SET NULL
4. (Optionnel) saillies.farm_id réorienté vers farms.id
