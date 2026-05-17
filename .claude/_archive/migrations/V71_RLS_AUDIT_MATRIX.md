# V71 RLS AUDIT MATRIX — 2026-05-05

> **MODE READ-ONLY** — Aucun DDL exécuté. Ce document est un audit/proposition
> pour validation avant Phase 5.2 (RLS-IMPLEMENTOR).
>
> **Source de vérité schéma** : `src/types/database.types.ts` (généré par
> `supabase gen types`) + lecture du code service (`supabaseService.ts`,
> `supabaseWrites.ts`, `AuthContext.tsx`).
>
> **Limitation** : L'état RLS live (pg_policies) n'a pas pu être interrogé
> directement (Bash bloqué, MCP Supabase absent dans cet environnement).
> Les requêtes de vérification sont fournies en section 0 pour rejeu manuel.

---

## 0. Requêtes SQL de vérification (à jouer en Phase 5.2 avant toute action)

```sql
-- Q1 : État RLS enabled + count policies par table
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS nb_policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Q2 : Détail des policies existantes (toutes tables)
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Q3 : Tables avec RLS désactivé (risque direct)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- Q4 : Colonnes sensibles dans batches et health_logs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('batches', 'health_logs')
  AND column_name IN ('cout_aliment', 'cout', 'dose_cost', 'poids_portee_naissance_kg',
                      'poids_moyen_sevrage_kg', 'unit_cost', 'total_cost')
ORDER BY table_name, column_name;

-- Q5 : Vérifier la colonne farm_id dans profiles (clé du tenant)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

---

## 1. État RLS actuel par table

### 1a. Constat depuis database.types.ts (schéma)

Tables présentes dans le type généré (= tables existantes en DB au moment du
dernier `supabase gen types`) :

| Table | farm_id présent | FK farm_id → profiles | Colonnes sensibles repérées |
|---|---|---|---|
| `admin_logs` | non | non | `details` (Json) |
| `alert_dismissals` | non (user_id) | non | — |
| `bandes` | non (troupeau_id) | indirect | — |
| `batches` | oui | `profiles.id` | `poids_portee_naissance_kg`, `poids_moyen_sevrage_kg` |
| `boars` | oui | `profiles.id` | — |
| `feed_inventory` | oui | `profiles.id` | `unit_price`, `total_price` |
| `finances` | oui | `profiles.id` | `mensuel_fcfa`, `annuel_fcfa`, `pct_total` |
| `health_logs` | oui | `profiles.id` | `dose_cost` |
| `notes` | oui | non (pas de FK déclarée) | — |
| `plan_alimentation` | oui | `profiles.id` | `cout_kg_fcfa`, `cout_mois_fcfa` |
| `produits_aliments` | oui | `profiles.id` | `seuil_alerte`, `stock_actuel` |
| `produits_veto` | oui | `profiles.id` | `stock_actuel`, `stock_min` |
| `profiles` | non (id = auth.uid()) | — | `role` (sensible : détermine les droits) |
| `saillies` | oui | `profiles.id` | — |
| `sows` | oui | `profiles.id` | — |
| `troupeaux` | non (user_id) | non (pas de FK déclarée) | — |
| `vet_inventory` | oui | `profiles.id` | `unit_cost`, `total_cost` |

**Tables mentionnées dans le brief V71 NON trouvées dans database.types.ts :**
- `transactions` — absente du type généré → probablement pas migrée en DB
- `stocks_aliments` — absente → probablement alias de `produits_aliments` (côté UI) ou table non créée
- `stocks_veto` — absente → probablement alias de `produits_veto`
- `daily_checks_mb` — absente du type généré
- `loges` — absente du type généré (mais référencée dans `supabaseService.ts` via JOIN)
- `porcelets_individuels` — absente du type généré (mais référencée dans `supabaseService.ts`)

Ces tables doivent être vérifiées via Q1/Q2 en live avant toute action.

### 1b. État RLS live (NON CONNU — à vérifier via Q1)

Hypothèse fondée sur le code `supabaseWrites.ts` (commentaire ligne 14) :
> "RLS Postgres filtre `farm_id = auth.uid()` → pas de scoping client"

Cela indique que des policies `farm_id = auth.uid()` existent sur au moins les
tables principales (`sows`, `boars`, `batches`, etc.). Mais :
- Aucune différenciation de rôle dans ce filtre (WORKER = ADMIN = OWNER)
- `finances` : accès non conditionné au rôle dans le code UI (lue par tout user connecté)
- `profiles.role` : colonne lue par AuthContext, mais aucun guard côté DB visible

**Estimation pessimiste (à confirmer) :**

| Table | RLS enabled (estimé) | Policies existantes (estimé) | Différenciation rôle |
|---|---|---|---|
| `sows` | oui | SELECT/INSERT/UPDATE farm_id=auth.uid() | non |
| `boars` | oui | SELECT/INSERT/UPDATE farm_id=auth.uid() | non |
| `batches` | oui | SELECT/INSERT/UPDATE farm_id=auth.uid() | non |
| `saillies` | oui | SELECT/INSERT/UPDATE farm_id=auth.uid() | non |
| `health_logs` | oui | SELECT/INSERT/UPDATE farm_id=auth.uid() | non |
| `notes` | oui | SELECT/INSERT/UPDATE farm_id=auth.uid() | non |
| `produits_aliments` | oui | SELECT/INSERT/UPDATE farm_id=auth.uid() | non |
| `produits_veto` | oui | SELECT/INSERT/UPDATE farm_id=auth.uid() | non |
| `finances` | **inconnu** | **0 ou basique** | non |
| `plan_alimentation` | **inconnu** | **0 ou basique** | non |
| `feed_inventory` | **inconnu** | **0 ou basique** | non |
| `vet_inventory` | **inconnu** | **0 ou basique** | non |
| `profiles` | **inconnu** | SELECT self only ? | non |
| `troupeaux` | **inconnu** | user_id=auth.uid() ? | non |
| `bandes` | **inconnu** | indirect via troupeaux ? | non |
| `admin_logs` | **inconnu** | probablement 0 | non |
| `alert_dismissals` | **inconnu** | probablement 0 | non |
| `transactions` | non applicable (table absente ?) | — | — |
| `stocks_aliments` | non applicable (table absente ?) | — | — |
| `stocks_veto` | non applicable (table absente ?) | — | — |

---

## 2. Gaps détectés (vs brief V71)

| Table / Colonne | Gap | Risque | Priorité |
|---|---|---|---|
| `finances` (entière) | Aucune différenciation rôle — WORKER peut SELECT/INSERT toutes les lignes finances de sa ferme | WORKER voit marges, charges, CA — données OWNER only | **CRITIQUE** |
| `finances` DELETE | Probablement aucune policy DELETE, ou DELETE pour tout user | WORKER peut effacer une écriture financière | **CRITIQUE** |
| `health_logs.dose_cost` | Colonne coût accessible à WORKER même si RLS table est ok | WORKER voit coût unitaire des traitements vétérinaires | **HAUTE** |
| `batches.poids_portee_naissance_kg`, `poids_moyen_sevrage_kg` | Colonnes de valeur économique accessibles à WORKER | Indirectement permet d'estimer valeur du troupeau | **MOYENNE** |
| `plan_alimentation` colonnes `cout_*` | Colonnes coût accessibles à WORKER | WORKER voit le budget alimentation | **HAUTE** |
| `feed_inventory` colonnes `unit_price`, `total_price` | Colonnes prix accessibles à WORKER | WORKER voit prix d'achat aliments | **HAUTE** |
| `vet_inventory` colonnes `unit_cost`, `total_cost` | Colonnes coût accessibles à WORKER | WORKER voit coûts vétérinaires | **HAUTE** |
| `profiles.role` UPDATE | Un user pourrait s'auto-promouvoir en OWNER si aucune policy UPDATE restrictive sur profiles | Escalade de privilèges | **CRITIQUE** |
| `troupeaux` | user_id non FK vers profiles → RLS potentiellement manquante | Cross-tenant data leak | **CRITIQUE** |
| `bandes` | Isolation via troupeau_id indirect — policy possiblement absente | Cross-tenant si troupeaux non protégé | **HAUTE** |
| `admin_logs` | Table probablement sans RLS — tout user lit les logs admin | Fuite logs opérations | **HAUTE** |
| `transactions` | Table absente de la DB → à créer si prévue V71 | N/A mais bloquerait phase 5.2 | **CRITIQUE à vérifier** |
| `stocks_aliments` / `stocks_veto` | Alias UI ou tables non créées | Si tables manquantes, phase 5.2 bloquée | **CRITIQUE à vérifier** |

---

## 3. Matrice des policies à appliquer (Phase 5.2)

### Principe d'isolation rôle

`profiles` n'a pas de colonne `farm_id` — c'est la table identité
(`profiles.id = auth.uid()`). La détection du rôle utilise un sous-SELECT :

```sql
-- Sous-SELECT réutilisable pour vérifier le rôle de l'utilisateur courant
EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ADMIN', 'OWNER')
)
```

### finances

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | Refus (0 rows) | Autorisé si `farm_id = auth.uid()` ET rôle ADMIN/OWNER | Autorisé si `farm_id = auth.uid()` |
| INSERT | Refus | Autorisé + `farm_id = auth.uid()` forcé en with_check | Autorisé |
| UPDATE | Refus | Autorisé sur ses propres rows | Autorisé |
| DELETE | Refus | Refus | Autorisé uniquement OWNER |

### health_logs

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | Autorisé sur `farm_id = auth.uid()` MAIS colonnes `dose_cost` masquées (voir note) | Autorisé complet | Autorisé complet |
| INSERT | Autorisé (saisie terrain) | Autorisé | Autorisé |
| UPDATE | Autorisé sur ses propres entrées (operator = auth.uid()) | Autorisé | Autorisé |
| DELETE | Refus | Autorisé | Autorisé |

Note : Le masquage de `dose_cost` ne peut pas se faire nativement par RLS
(les policies ne filtrent pas les colonnes). Deux options :
- **Option A** : Vue `health_logs_worker` (SECURITY DEFINER) qui exclut `dose_cost` — recommandée
- **Option B** : Column-level grant `REVOKE SELECT (dose_cost) FROM authenticated` — risqué car global

### batches

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | Autorisé sur `farm_id = auth.uid()` (colonnes cout masquées via vue) | Autorisé complet | Autorisé complet |
| INSERT | Autorisé | Autorisé | Autorisé |
| UPDATE | Autorisé | Autorisé | Autorisé |
| DELETE | Refus | Autorisé | Autorisé |

### plan_alimentation

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | Autorisé sans colonnes `cout_*` (via vue) OU refus total | Autorisé complet | Autorisé complet |
| INSERT | Refus | Autorisé | Autorisé |
| UPDATE | Refus | Autorisé | Autorisé |
| DELETE | Refus | Autorisé | Autorisé |

### feed_inventory / vet_inventory

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | Autorisé sans colonnes prix (via vue) | Autorisé complet | Autorisé complet |
| INSERT | Autorisé (mouvements terrain) | Autorisé | Autorisé |
| UPDATE | Refus | Autorisé | Autorisé |
| DELETE | Refus | Refus | Autorisé |

### profiles

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | `id = auth.uid()` uniquement (lecture self) | `farm_id` scope (mais profiles n'a pas farm_id — voir note) | Tous les profiles de la ferme |
| INSERT | Refus (géré par trigger handle_new_user) | Refus | Refus |
| UPDATE | `id = auth.uid()` ET colonnes limitées (email, full_name — PAS role) | Refus role UPDATE | Autorisé tout |
| DELETE | Refus | Refus | Refus (auth.users géré via Supabase Auth) |

Note : `profiles` n'a pas de `farm_id`. Pour un context multi-worker, OWNER
doit pouvoir lire les profiles de ses workers. Cela nécessite une colonne
`troupeau_id` dans `profiles` ou un référentiel d'appartenance.
**À clarifier avant Phase 5.2.**

### troupeaux

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| INSERT | Refus | Autorisé + `user_id = auth.uid()` | Autorisé |
| UPDATE | Refus | Autorisé sur ses rows | Autorisé |
| DELETE | Refus | Refus | Autorisé |

### bandes

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | Via `troupeau_id IN (SELECT id FROM troupeaux WHERE user_id = auth.uid())` | Idem | Idem |
| INSERT | Autorisé | Autorisé | Autorisé |
| UPDATE | Refus | Autorisé | Autorisé |
| DELETE | Refus | Autorisé | Autorisé |

### sows / boars / saillies / notes / produits_aliments / produits_veto

Policies déjà probablement présentes (`farm_id = auth.uid()`). À confirmer
via Q2. Si présentes : ajouter uniquement les guards de rôle pour DELETE si
nécessaire.

### admin_logs

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | Refus total | Autorisé | Autorisé |
| INSERT | Refus (insert via service_role uniquement) | Autorisé via RPC | Autorisé |
| UPDATE | Refus | Refus | Refus |
| DELETE | Refus | Refus | Refus |

### alert_dismissals

| Cmd | WORKER | ADMIN | OWNER |
|---|---|---|---|
| SELECT | `user_id = auth.uid()` | Idem | Idem |
| INSERT | `user_id = auth.uid()` | Idem | Idem |
| UPDATE | `dismissed_by = auth.uid()` | Idem | Idem |
| DELETE | `user_id = auth.uid()` | Idem | Idem |

---

## 4. SQL à exécuter en Phase 5.2 (proposition)

> Ce SQL est une PROPOSITION. Ne pas exécuter sans validation Christophe.

```sql
-- ============================================================
-- HELPER FUNCTION (créer avant les policies)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('OWNER', 'ADMIN')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'OWNER'
  )
$$;

-- Réversibilité :
-- DROP FUNCTION IF EXISTS public.is_owner_or_admin();
-- DROP FUNCTION IF EXISTS public.is_owner();

-- ============================================================
-- FINANCES
-- ============================================================
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finances_select_admin_owner"
  ON public.finances FOR SELECT
  USING (farm_id = auth.uid() AND public.is_owner_or_admin());

CREATE POLICY "finances_insert_admin_owner"
  ON public.finances FOR INSERT
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

CREATE POLICY "finances_update_admin_owner"
  ON public.finances FOR UPDATE
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

CREATE POLICY "finances_delete_owner_only"
  ON public.finances FOR DELETE
  USING (farm_id = auth.uid() AND public.is_owner());

-- Réversibilité :
-- DROP POLICY IF EXISTS "finances_select_admin_owner" ON public.finances;
-- DROP POLICY IF EXISTS "finances_insert_admin_owner" ON public.finances;
-- DROP POLICY IF EXISTS "finances_update_admin_owner" ON public.finances;
-- DROP POLICY IF EXISTS "finances_delete_owner_only" ON public.finances;

-- ============================================================
-- HEALTH_LOGS (RLS table — masquage dose_cost via vue)
-- ============================================================
-- Note : si RLS health_logs existe déjà avec farm_id=auth.uid(), on ne
-- la modifie pas pour ne pas casser le WORKER. On crée juste la vue masquée.

CREATE OR REPLACE VIEW public.health_logs_worker
WITH (security_invoker = true)
AS
  SELECT
    id, code_id, farm_id, log_date, log_type, logged_at, updated_at,
    animal_type, animal_code, animal_reference, sow_id, batch_id,
    affected_animals, symptom, symptoms, diagnosis, treatment,
    treatment_name, duration, dose_count,
    -- dose_cost MASQUÉ pour WORKER
    operator, result, notes, weight_kg
  FROM public.health_logs;

-- Réversibilité :
-- DROP VIEW IF EXISTS public.health_logs_worker;

-- ============================================================
-- BATCHES (vue masquée pour WORKER — colonnes financières)
-- ============================================================
CREATE OR REPLACE VIEW public.batches_worker
WITH (security_invoker = true)
AS
  SELECT
    id, code_id, farm_id, sow_id, boar_id, date_mise_bas,
    date_saillie, date_sevrage, date_sevrage_prevue, date_prochain_event,
    porcelets_nes_total, porcelets_nes_vivants, porcelets_sevrene_total,
    nb_mort_nes, statut, phase, loge, aliment_actuel,
    notes, photo_url, prochain_event,
    poids_moyen_kg,
    -- poids_portee_naissance_kg MASQUÉ (valeur économique)
    -- poids_moyen_sevrage_kg MASQUÉ (valeur économique)
    loge_id
  FROM public.batches;

-- Réversibilité :
-- DROP VIEW IF EXISTS public.batches_worker;

-- ============================================================
-- PROFILES — policy UPDATE sécurisée (anti escalade rôle)
-- ============================================================
-- Supposons que RLS est déjà activée. Si non :
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Bloquer tout UPDATE du champ role par un non-OWNER
-- Nécessite Postgres column-level ou trigger. Recommandation : trigger.

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_owner() THEN
      RAISE EXCEPTION 'Permission refusée : modification du rôle interdite (non-OWNER).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Réversibilité :
-- DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
-- DROP FUNCTION IF EXISTS public.prevent_role_escalation();

-- ============================================================
-- PLAN_ALIMENTATION
-- ============================================================
ALTER TABLE public.plan_alimentation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_alim_select_admin_owner"
  ON public.plan_alimentation FOR SELECT
  USING (farm_id = auth.uid() AND public.is_owner_or_admin());

CREATE POLICY "plan_alim_write_admin_owner"
  ON public.plan_alimentation FOR INSERT
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

CREATE POLICY "plan_alim_update_admin_owner"
  ON public.plan_alimentation FOR UPDATE
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

CREATE POLICY "plan_alim_delete_owner"
  ON public.plan_alimentation FOR DELETE
  USING (farm_id = auth.uid() AND public.is_owner());

-- Réversibilité : DROP POLICY "plan_alim_*" ON public.plan_alimentation;

-- ============================================================
-- FEED_INVENTORY
-- ============================================================
ALTER TABLE public.feed_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_inv_select_all_farm"
  ON public.feed_inventory FOR SELECT
  USING (farm_id = auth.uid());

CREATE POLICY "feed_inv_insert_all_farm"
  ON public.feed_inventory FOR INSERT
  WITH CHECK (farm_id = auth.uid());

CREATE POLICY "feed_inv_update_admin_owner"
  ON public.feed_inventory FOR UPDATE
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

CREATE POLICY "feed_inv_delete_owner"
  ON public.feed_inventory FOR DELETE
  USING (farm_id = auth.uid() AND public.is_owner());

-- ============================================================
-- VET_INVENTORY
-- ============================================================
ALTER TABLE public.vet_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vet_inv_select_all_farm"
  ON public.vet_inventory FOR SELECT
  USING (farm_id = auth.uid());

CREATE POLICY "vet_inv_insert_all_farm"
  ON public.vet_inventory FOR INSERT
  WITH CHECK (farm_id = auth.uid());

CREATE POLICY "vet_inv_update_admin_owner"
  ON public.vet_inventory FOR UPDATE
  USING (farm_id = auth.uid() AND public.is_owner_or_admin())
  WITH CHECK (farm_id = auth.uid() AND public.is_owner_or_admin());

CREATE POLICY "vet_inv_delete_owner"
  ON public.vet_inventory FOR DELETE
  USING (farm_id = auth.uid() AND public.is_owner());

-- ============================================================
-- TROUPEAUX (user_id au lieu de farm_id)
-- ============================================================
ALTER TABLE public.troupeaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "troupeaux_all_user"
  ON public.troupeaux FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- BANDES (isolation via troupeau_id)
-- ============================================================
ALTER TABLE public.bandes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bandes_via_troupeau"
  ON public.bandes FOR ALL
  USING (
    troupeau_id IN (
      SELECT id FROM public.troupeaux WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    troupeau_id IN (
      SELECT id FROM public.troupeaux WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- ADMIN_LOGS
-- ============================================================
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_logs_select_admin_owner"
  ON public.admin_logs FOR SELECT
  USING (public.is_owner_or_admin());

CREATE POLICY "admin_logs_insert_admin_owner"
  ON public.admin_logs FOR INSERT
  WITH CHECK (public.is_owner_or_admin());

-- ============================================================
-- ALERT_DISMISSALS
-- ============================================================
ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_dismissals_own_user"
  ON public.alert_dismissals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## 5. Tests sécu attendus en Phase 5.3

| # | Contexte | Commande | Résultat attendu |
|---|---|---|---|
| T1 | Login WORKER | `SELECT * FROM finances` | 0 rows (RLS bloque) |
| T2 | Login OWNER | `SELECT * FROM finances` | Rows visibles |
| T3 | Login WORKER | `INSERT INTO finances (farm_id, poste, type) VALUES (auth.uid(), 'Test', 'DEPENSE')` | ERROR 42501 |
| T4 | Login ADMIN | `INSERT INTO finances (farm_id, poste, type) VALUES (auth.uid(), 'Test', 'DEPENSE')` | Succès |
| T5 | Login WORKER | `SELECT dose_cost FROM health_logs LIMIT 1` | NULL ou colonne absente (via vue worker) |
| T6 | Login WORKER | `UPDATE profiles SET role = 'OWNER' WHERE id = auth.uid()` | ERROR (trigger prevent_role_escalation) |
| T7 | Login OWNER | `SELECT * FROM plan_alimentation` | Rows visibles |
| T8 | Login WORKER | `SELECT * FROM plan_alimentation` | 0 rows |
| T9 | Login WORKER | `SELECT * FROM admin_logs` | 0 rows |
| T10 | Login non-authentifié | `SELECT * FROM sows` | 0 rows (anon bloqué par RLS) |
| T11 | Login WORKER ferme A | `SELECT * FROM sows` | Uniquement sows avec farm_id = uid() ferme A |
| T12 | Login ADMIN | `DELETE FROM finances WHERE id = '<any>'` | ERROR 42501 (ADMIN ne peut pas DELETE) |
| T13 | Login OWNER | `DELETE FROM finances WHERE id = '<any>'` | Succès (si row appartient à sa ferme) |
| T14 | Login WORKER | `SELECT * FROM troupeaux` | Uniquement son propre troupeau |
| T15 | Login WORKER | `SELECT * FROM bandes` | Uniquement bandes de son troupeau |

---

## 6. Risques migration et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Tables `finances` actuellement lues côté UI par WORKER sans RLS | Casse UI WORKER après activation RLS | Filtrer l'affichage UI WORKER avant Phase 5.2 : ne pas montrer le module Finances aux WORKER |
| `plan_alimentation` lue par Cockpit (Dashboard) pour KPIs aliments | Casse calculs KPI si WORKER n'y a plus accès | Créer vue `plan_alimentation_worker` avec uniquement colonnes non-financières, ou exclure les KPIs coût de la vue WORKER |
| `batches_worker` vue — si l'app fait `SELECT *` | L'app reçoit une vue sans certaines colonnes | Adapter `supabaseService.ts getBandes()` pour détecter le rôle et choisir la bonne table/vue |
| `is_owner_or_admin()` SECURITY DEFINER — recursion si mal définie | Infinite loop ou policy error | Tester la fonction isolément avant de créer les policies |
| Tables absentes (`transactions`, `stocks_aliments`) — Phase 5.2 bloque | Migration partielle | Vérifier via Q1 avant Phase 5.2 ; créer tables si nécessaire |
| `profiles` sans `farm_id` — ADMIN ne peut pas lire les profiles de ses WORKER | Multi-worker impossible | Ajouter colonne `troupeau_id` à `profiles` si multi-worker prévu |
| Policy sur `bandes` via sous-SELECT `troupeaux` | Performance si beaucoup de bandes | Acceptable pour K13 (< 20 bandes) ; indexer `troupeaux.user_id` |

---

## 7. Points bloquants à valider par Christophe avant Phase 5.2

1. **Tables absentes** : `transactions`, `stocks_aliments`, `stocks_veto` — à créer ou à mapper sur les tables existantes ?
2. **WORKER et finances** : Est-ce qu'un WORKER doit voir certaines données financières (ex : coût de son lot) ou refus total ?
3. **Vue `batches_worker`** : L'UI WORKER doit-elle être adaptée pour consommer la vue plutôt que la table ?
4. **Multi-worker** : Un OWNER peut-il avoir plusieurs WORKER partageant la même ferme ? Si oui, le schéma `profiles` nécessite une colonne `troupeau_id`.
5. **`plan_alimentation`** : WORKER doit-il voir les rations (sans les coûts) ou refus total ?

---

*Audit produit par RLS-AUDITOR (V71 Phase 5.1) — READ-ONLY — 2026-05-05*
*Source : database.types.ts + supabaseService.ts + supabaseWrites.ts + AuthContext.tsx*
*Aucun DDL exécuté.*
