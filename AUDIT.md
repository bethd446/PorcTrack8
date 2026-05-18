# AUDIT.md — Audit mécanique PorcTrack 8
**Date** : 2026-05-18
**Branche** : `feat/mechanic-audit-2026-05-18` (fork `main` @ `e056831`)
**Mission** : valider que la machine tient, fixer le P0 critique. Pas de design touch.

---

## Executive summary (10 lignes)

1. **Baseline initiale** : tsc 0 erreur · vitest **2145 passed** (178 files) · eslint 0 erreur · build 2.98s · bundle main 183kB/53kB gzip. **Machine OK.**
2. **5 sub-agents lancés en parallèle** (boutons UI / data flows / RLS / edge functions / baseline). Tous rentrés avec preuves `=== VERIFICATION ===`.
3. **Drift schéma critique** : 15 migrations appliquées en prod sans fichier dans le repo (triggers DB, normalize, FK indexes). Le code marche, l'historique structural a divergé.
4. **P0 cassé** : `QuickSevrageForm.tsx:155` + `MultiPorteeSevrageWizard.tsx:264,318` écrivent `phase: 'post-sevrage'` (kebab) au lieu de `'POST_SEVRAGE'`. 1 row outlier en prod (`batches.code_id=001`, farm bc96).
5. **P0 préventif** : `QuickMiseBasForm.tsx:233` + helpers écrivent `phase: 'maternite'` (lowercase) au lieu de `'MATERNITE'`. Pas d'impact prod actuel (toutes les bandes MB existantes sont déjà `MATERNITE`) mais bombe future.
6. **P0 redéfini** : `QuickPeseeForm.tsx:279` écrit dans `notes` au lieu de `pesees`. **Verdict révisé après lecture schéma** : la table `pesees` exige `porcelet_id NOT NULL` — donc TRUIE/VERRAT ne peuvent pas y écrire (design). BANDE devrait basculer vers `pesees_batch` V76 → **dégradé P1**.
7. **P0 UI** : 4 boutons GTTT inertes dans `PorceletDetailView.tsx:410-413` (Peser/Soigner/Vendu/Mortalité) + menu MoreHorizontal sans handler. Le fix propre exige `PorceletPeseeForm` neuf → **dégradé P1 BLOCKER pour V83**, hors scope mécanique.
8. **Sécurité edge** : `send-push` faille cross-tenant + CORS `*` — mitigé par 0 push_subscription en prod, **P1 à fixer avant rollout VAPID**. `marius-chat` propre, manque rate-limit/timeout.
9. **RLS prod** : 35 tables couvertes. 5 fonctions SECURITY DEFINER appelables par authenticated (`user_farms`, `get_user_role`, etc.) → énumération possible, P1 à revoke.
10. **Fixes appliqués ce soir** : migration additive CHECK + UPDATE outlier, 5 fix code phase, 4 fix tests phase, 1 fix moveSubject (throw vs swallow). **Baseline post-fix à confirmer.**

---

## Casses triées par criticité

### 🔴 P0 (corrigés ce soir)

| # | Fichier:ligne | Casse | Fix |
|---|---|---|---|
| P0-1 | `QuickSevrageForm.tsx:155` | `phase: 'post-sevrage'` (kebab) → 1 row outlier prod | → `'POST_SEVRAGE'` |
| P0-2 | `MultiPorteeSevrageWizard.tsx:264,318` | idem | idem |
| P0-3 | `QuickMiseBasForm.tsx:233` | `phase: 'maternite'` (lowercase) | → `'MATERNITE'` |
| P0-4 | `quickMiseBasHelpers.ts:294,333` | type + return idem | idem |
| P0-5 | Migration DB | 1 row `batches.phase='Post-sevrage'` outlier + CHECK absent | UPDATE + ADD CHECK additive |

### 🔴 P0 BLOCKER restant (non fixé — scope V83)

| # | Fichier:ligne | Casse | Raison report |
|---|---|---|---|
| P0-BL1 | `PorceletDetailView.tsx:410-413` | 4 boutons GTTT inertes (Peser/Soigner/Vendu/Mortalité) | Fix propre = créer `PorceletPeseeForm` + extension `health_logs` pour porcelet. Hors scope audit mécanique. Bouton inerte non-bloquant pour le reste de l'app. |
| P0-BL2 | `PorceletDetailView.tsx:236-242` | Menu MoreHorizontal sans handler/state | Idem |

### 🟠 P1 (à traiter V83)

| # | Item | Détail |
|---|---|---|
| P1-1 | `QuickPeseeForm.tsx:279` BANDE → `pesees_batch` | Table V76 existe vide. Pour TRUIE/VERRAT pas de table dédiée (notes reste correct). |
| P1-2 | `supabaseWrites.ts:1308` `moveSubject` swallow | **CORRIGÉ ce soir** — throw au lieu de console.warn. |
| P1-3 | `send-push` cross-tenant + CORS `*` | Mitigé 0 push_subscriptions. Fix avant rollout VAPID. |
| P1-4 | `marius-chat` pas de timeout/rate-limit | Risque coût Mistral. AbortController 30s + table rate-limit. |
| P1-5 | 5 fonctions SECURITY DEFINER appelables `authenticated` | `REVOKE EXECUTE ON FUNCTION user_farms(uuid), get_user_role(uuid) FROM authenticated;` |
| P1-6 | 15 migrations prod absentes du repo | Drift schéma. Récupérer + versionner. |
| P1-7 | `EncyclopediaArticle.tsx:264` "Marquer comme lu" décoratif | Brancher `onMarkAsRead` prop. |
| P1-8 | `PendingValidationsView.tsx:80` `navigate('/sante')` route inexistante | Route à créer ou pointer ailleurs. |

### 🟡 P2 (cosmétique/dead code, hors scope)

- `ProtocolApplicationSheet.tsx:214` photo upload sans handler
- `DesignSystemView.tsx:286-333` 5 no-op démo
- Dead code (~3000L) : AgritechLayout/Header/AppSidebar chain (853L), PendingBandesBanner/View, TableView/tableLoader, design/Sidebar, design/MariusFAB, AgritechNavV2 partie inutile
- `loge_movements.from/to_loge_id` sans ON DELETE SET NULL (defense-in-depth)
- `adoptions` policies UPDATE/DELETE manquantes (probablement intentionnel immutabilité)

---

## Schema drift (15 migrations prod absentes du repo)

```
20260511153010 add_nb_morts_naissance_to_batches
20260511153019 normalize_sows_statut
20260511153030 normalize_batches_phase
20260511153041 backfill_derived_fields
20260511153102 saillies_set_mb_prevue_trigger
20260511153200 add_missing_fk_indexes
20260511153218 trigger_increment_sow_nb_portees_on_mb
20260511153303 v76_pesees_batch_table
20260511223412 v80_farm_profile_default
20260511223427 v80_engraissement_lots
20260512102351 v3_4_5_genealogie_sows_boars
20260514045521 sprint14_security_hardening_phase1
20260514045648 sprint14_force_rls_finances_adminlogs
20260517162558 revoke_prevent_profile_role_escalation
20260517162618 fix_tg_lots_search_path
```

Action V83 : pull SQL depuis prod (`pg_get_functiondef`, `pg_get_constraintdef`, etc.) et versionner dans `supabase/migrations/`.

---

## Snapshot DB (backup pré-fix)

Table `public._audit_20260518_batches_pre` créée par la migration `20260518_audit_phase_normalize_and_check` (rollback possible en cas de besoin).

---

## Logs détaillés des sub-agents

- Boutons UI : `/tmp/audit-1-buttons.log`
- Data flows : `/tmp/audit-2-flows.log`
- RLS Supabase : `/tmp/audit-3-rls.log`
- Edge functions : `/tmp/audit-4-edge.log`
- Baseline initiale : `/tmp/audit-5-pipeline.log`
- Pipeline post-fix : `/tmp/audit-7-pipeline.log`

State intermédiaire : `.claude/state/00_baseline.md` à `.claude/state/05_baseline.md`.

---

## Baseline post-fix (verdict final)

```
tsc --noEmit       : 0 erreur          (exit 0)
vitest run         : 2145/2145 passed  (178 files, exit 0)
eslint             : 0 erreur 149 warn (= baseline initial, exit 0)
vite build         : 3.04s             (exit 0)
```

**Aucune régression vs baseline initial (2145 pass).**

## Recommandation merge

**✅ MERGE — la branche est prête.**

Diff : 8 fichiers, +17 / -12 lignes. 0 fichier de design touché.
- 5 fix code (3 forms + 1 helper + 1 service)
- 4 fix tests
- 1 migration additive (CHECK + UPDATE outlier + snapshot backup)

**Bloquants restants** (à programmer V83, NON bloquants pour ce merge) :
1. P0-BL1/2 — boutons GTTT PorceletDetailView (fix propre = `PorceletPeseeForm` neuf)
2. P1 send-push cross-tenant + CORS (mitigé 0 push_subscription)
3. P1 15 migrations à versionner (drift schéma)
4. P1 REVOKE EXECUTE FROM authenticated sur 5 fonctions SECURITY DEFINER
5. P1 QuickPeseeForm BANDE → pesees_batch V76

La machine tient. La peau peut être remise par-dessus.
