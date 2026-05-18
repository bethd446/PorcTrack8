# AUDIT_RLS.md — Audit Supabase RLS / FK / multi-tenant
**Date** : 2026-05-18
**Branche** : `feat/mechanic-complete-2026-05-18`
**Auditeur** : Worker 3 (security-reviewer) — vérifié via SQL live par orchestrateur

---

## Verdict synthétique

- **RLS enabled + ≥1 policy** : 34/35 (`pesees_batch` confirmé via SQL live = OK)
- **Failles exploitables avant correction** : **2** (O-1 + O-2)
- **Failles exploitables après migration `20260518_rls_hardening.sql`** : 0
- **FK structurellement correctes** : 10/35 (les 25 autres pointent vers `profiles(id)` au lieu de `farms(id)` — fonctionnel via invariant V71 `profiles.id == farms.id`)

---

## 🔴 ROUGE — Failles corrigées par 20260518_rls_hardening.sql

### O-1 — Takeover ferme via `farm_members_insert_admin`

**Migration source** : `supabase/migrations/20260517_rls_initplan_fix.sql:186-196`

**Vecteur d'attaque** (confirmé SQL live) :
```sql
-- N'importe quel user authentifié peut faire :
INSERT INTO farm_members (farm_id, user_id, role)
VALUES ('<uuid-ferme-cible>', auth.uid(), 'OWNER');
-- La clause OR de la policy WITH CHECK l'autorise SANS vérifier
-- que l'utilisateur est déjà membre de la ferme.
```

**Cause racine** : clause `OR ((user_id = auth.uid()) AND (role = 'OWNER'))` destinée au signup (auto-insertion OWNER). Mais `handle_new_user()` est SECURITY DEFINER → bypasse RLS. La clause OR est donc **superflue ET exploitable**.

**Fix** : suppression de la clause OR. Seuls les OWNER/ADMIN existants de la ferme peuvent inviter d'autres membres.

### O-2 — Privilege escalation `profiles.role` via trigger

**Migration source** : `supabase/migrations/20260517175200_v82b_dedup_role_escalation_trigger.sql:43-45`

**Vecteur d'attaque** :
```sql
-- handle_new_user crée tous les comptes V71+ en profiles.role='OWNER'.
-- Le guard prevent_role_escalation appelle is_owner_or_admin()
-- qui retourne TRUE pour tout compte (profiles.role IN ('ADMIN','OWNER')).
-- → Tout user peut modifier profiles.role d'un autre user.
UPDATE profiles SET role='PORCHER' WHERE id='<victime>';
```

**Cause racine** : `is_owner_or_admin()` lit `profiles.role` globalement (deprecated V71, non farm-scopé).

**Fix** : remplace `is_owner_or_admin()` par blocage total sauf `service_role`. `profiles.role` est legacy V71+ — le rôle opérationnel est `farm_members.role`.

---

## 🟡 JAUNE — Defense in depth (non bloquant)

| ID | Item | Détail |
|---|---|---|
| J-1 | `loge_movements` FK sans ON DELETE | `from_loge_id`/`to_loge_id` → bloquant si DELETE FROM loges. À ajouter `ON DELETE SET NULL` |
| J-2 | `adoptions` policies UPDATE/DELETE manquantes | Immutabilité de fait. Documenter via COMMENT |
| J-3 | `tg_push_subs_touch_updated_at` sans search_path | Fix `20260517162500` n'a pas couvert cette fonction |
| J-4 | `pesees_batch` absent du repo | Présent en prod, RLS OK confirmé phase 1. À versionner (drift) |
| J-5 | `farms_select` policy à vérifier | `20260517_rls_initplan_fix` recrée insert/update/delete mais pas SELECT |

---

## Tableau 35 tables

| # | Table | RLS | n_pol | FK farm_id correcte | Conforme | Note |
|---|---|---|---|---|---|---|
| 1 | admin_logs | ✅+FORCE | 2 | n/a | ✅ | Super_admin only |
| 2 | adoptions | ✅ | 2 | ❌ (→profiles) | PARTIEL | FK incorrecte |
| 3 | alert_dismissals | ✅ | 3 | n/a (user_id) | ✅ | |
| 4 | batch_sows | ✅ | 1 | ❌ | PARTIEL | |
| 5 | batches | ✅ | 1 | ❌ | PARTIEL | |
| 6 | boars | ✅ | 1 | ❌ | PARTIEL | |
| 7 | daily_checks_mb | ✅ | 1 | ❌ | PARTIEL | |
| 8 | farm_members | ✅ | 4 | ✅ farms(id) | **PARTIEL → ✅ post-migration** | **FAILLE O-1** |
| 9 | farms | ✅ | 4 | n/a (racine) | ✅ | |
| 10 | feed_consumption_logs | ✅ | 1 | ❌ | PARTIEL | |
| 11 | feed_inventory | ✅ | 4 | ❌ | PARTIEL | |
| 12 | finances | ✅+FORCE | 4 | ❌ | PARTIEL | |
| 13 | fournisseurs | ✅ | 1 | ❌ | PARTIEL | |
| 14 | health_logs | ✅ | 1 | ❌ | PARTIEL | |
| 15 | loge_movements | ✅ | 1 | ❌ | PARTIEL | J-1 |
| 16 | loges | ✅ | 1 | ❌ | PARTIEL | |
| 17 | lot_mortalites | ✅ | 1 | ✅ farms(id) | ✅ | V80 |
| 18 | lot_pesees | ✅ | 1 | ✅ farms(id) | ✅ | V80 |
| 19 | lots | ✅ | 1 | ✅ farms(id) | ✅ | V80 |
| 20 | notes | ✅ | 1 | ❌ | PARTIEL | |
| 21 | pesee_planifiees | ✅ | 1 | ❌ | PARTIEL | |
| 22 | pesees | ✅ | 1 | ❌ | PARTIEL | |
| 23 | pesees_batch | ✅ | 1 | n/c | ✅ | RLS confirmé phase 1 |
| 24 | plan_alimentation | ✅ | 4 | ❌ | PARTIEL | |
| 25 | porcelets_individuels | ✅ | 1 | ❌ | PARTIEL | |
| 26 | produits_aliments | ✅ | 4 | ❌ | PARTIEL | |
| 27 | produits_veto | ✅ | 4 | ❌ | PARTIEL | |
| 28 | profiles | ✅ | 3 | n/a | **PARTIEL → ✅ post-migration** | **FAILLE O-2** |
| 29 | push_subscriptions | ✅ | 1 | n/a (user_id) | ✅ | |
| 30 | saillies | ✅ | 1 | ❌ | PARTIEL | |
| 31 | sessions_pesee | ✅ | 1 | ❌ | PARTIEL | |
| 32 | sows | ✅ | 1 | ❌ | PARTIEL | |
| 33 | troupeaux | ✅ | 4 | n/a (user_id legacy) | ✅ | |
| 34 | vet_inventory | ✅ | 4 | ❌ | PARTIEL | |
| 35 | weight_distributions | ✅ | 1 | ❌ | PARTIEL | |

**Conformité multi-tenant fonctionnelle** : 35/35 ✅ (policies V71 `current_user_farms()` couvrent toutes les tables)
**Conformité FK structurelle** : 10/35 (sprint dédié recommandé pour migrer les FK `→profiles(id)` vers `→farms(id)`)

---

## Migrations livrées

- `supabase/migrations/20260518_rls_hardening.sql` — fix O-1 + O-2 (appliquée)
- `scripts/audit_rls.sql` — script réutilisable 10 sections (Worker 3)

## Log complet

Worker 3 report : voir transcript Phase 2 (Worker 3 a généré le contenu en texte faute d'accès Write).
