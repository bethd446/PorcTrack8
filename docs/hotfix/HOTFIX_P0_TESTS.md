# Hotfix P0 — fuites anon `feed_inventory` / `vet_inventory`

> Procédure de test pour la migration `migrations/2026_05_04_hotfix_p0_anon_policies.sql`.
> Découverte par RLS-AUDITOR V70 Phase 0 (`docs/v70/V70_RLS_AUDIT.md` §2.4 + §7).
> **Priorité P0 — à déployer immédiatement.**

---

## Contexte

Deux policies SELECT ouvertes au rôle `anon` permettaient à n'importe quel
visiteur muni de la clé `anon_key` (publique, embedée dans l'app web/mobile)
de lister :
- `feed_inventory` → stocks aliments + `unit_price` + `total_price` (FCFA)
- `vet_inventory` → stocks véto + `unit_cost` + `total_cost` (FCFA)

Pour **toutes les fermes** simultanément, sans aucune authentification.

Le hotfix DROP les 2 policies anon et CREATE des policies SELECT réservées au
rôle `authenticated` avec filtre `farm_id = auth.uid()` (pattern standard
projet, aligné sur les 11 autres tables `isolation_by_farm`).

---

## Avant déploiement

1. **Snapshot DB Supabase** : backup automatique ou manual via dashboard
   Supabase > Database > Backups.
2. **Tester en staging si dispo** : `supabase db push --linked` sur projet
   miroir, ou exécuter le SQL via Supabase SQL Editor sur un projet de test.
3. Vérifier qu'aucun code applicatif ne lit ces tables en mode `anon` :
   ```bash
   grep -rn "feed_inventory\|vet_inventory" src/ --include="*.ts" --include="*.tsx"
   ```
   À la date du hotfix, **aucun service applicatif** ne consomme ces tables
   (uniquement présent dans `src/types/database.types.ts`). Le code applicatif
   y accédera via session authentifiée → OK.

---

## Application de la migration

### Option A — Supabase SQL Editor (manuel)

1. Ouvrir <https://supabase.com/dashboard/project/jcritwravdwefwqwyjvk/sql/new>
2. Coller le contenu de `migrations/2026_05_04_hotfix_p0_anon_policies.sql`
3. Run

### Option B — Supabase CLI

```bash
supabase link --project-ref jcritwravdwefwqwyjvk
supabase db push   # si projet configuré pour migrations versionnées
```

### Option C — psql direct

```bash
psql "$SUPABASE_DB_URL" -f migrations/2026_05_04_hotfix_p0_anon_policies.sql
```

---

## Tests post-déploiement

### Test 1 — anon NE DOIT PAS lire `feed_inventory`

```bash
SUPA_URL="https://jcritwravdwefwqwyjvk.supabase.co"
ANON_KEY="<copier depuis Supabase Settings > API>"

curl -s "$SUPA_URL/rest/v1/feed_inventory?select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
```

**Attendu** : `[]` (tableau vide). PostgREST ne renvoie pas 401 quand RLS
filtre tout ; il renvoie 200 + tableau vide. C'est le comportement correct.

**Échec si** : payload contient `"unit_price"` ou `"total_price"` ou des objets.

### Test 2 — anon NE DOIT PAS lire `vet_inventory`

```bash
curl -s "$SUPA_URL/rest/v1/vet_inventory?select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
```

**Attendu** : `[]`. Échec si `"unit_cost"` ou `"total_cost"` apparaît.

### Test 3 — utilisateur authentifié PEUT lire ses stocks

Se connecter dans l'app PorcTrack avec un compte OWNER existant (par ex.
`contact@liegeoischristophe.com`), récupérer le JWT via DevTools >
Application > Cookies/LocalStorage > `sb-...-auth-token`.

```bash
USER_JWT="<jwt copié>"

curl -s "$SUPA_URL/rest/v1/feed_inventory?select=id,feed_name,quantity_kg,unit_price&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"
```

**Attendu** : tableau des lignes de la ferme du user authentifié, prix inclus.

### Test 4 — vérification SQL côté DB

Via SQL Editor Supabase :

```sql
SELECT tablename, policyname, roles, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('feed_inventory','vet_inventory')
 ORDER BY tablename, policyname;
```

**Attendu** : aucune ligne avec `roles` contenant `{anon}` ou `{public}`.
On doit voir au moins :
- `feed_inventory_select_authenticated` (cmd=SELECT, roles={authenticated})
- `vet_inventory_select_authenticated` (cmd=SELECT, roles={authenticated})

Plus les policies pré-existantes `isolation_by_farm` (FOR ALL) qui restent
inchangées.

---

## Rollback (urgence uniquement)

```sql
-- ⚠️ NE PAS exécuter sauf si l'app casse en prod ET qu'on a confirmé que
-- la cause est bien le retrait de la policy anon. Cela ré-expose les
-- prix publiquement.

DROP POLICY IF EXISTS "feed_inventory_select_authenticated" ON public.feed_inventory;
DROP POLICY IF EXISTS "vet_inventory_select_authenticated" ON public.vet_inventory;

CREATE POLICY "Lecture publique des stocks"
  ON public.feed_inventory FOR SELECT TO anon USING (true);

CREATE POLICY "Lecture publique des stocks veto"
  ON public.vet_inventory FOR SELECT TO anon USING (true);
```

---

## Note de suivi

Le hotfix corrige UNIQUEMENT les fuites P0 SELECT anon. L'audit V70 mentionne
également :
- `admin_logs` policy `Les éleveurs peuvent insérer des logs` (INSERT public,
  WITH CHECK true) — risque pollution logs, pas exfiltration → P1, autre PR.
- `notes` policy roles `{public}` au lieu de `{authenticated}` — logique
  `farm_id` correcte donc faible risque, mais à harmoniser → P2.

Ces deux items sont **hors-scope du hotfix P0**, à traiter dans la suite
V70 (Phase 1 ou PR séparée).
