# Vague D — Fonctionnel & Mécanisme

> Plan préparé par sub-agent `Plan` le 2026-05-17. Focus : rendre l'app fonctionnelle, structure compréhensible, zéro blocage. Le design est volontairement hors-scope (Claude design passera après).

## Résumé exécutif

L'app build, type-check et 2145 tests passent — **mais** le workflow loges/bandes n'est pas finalisable pour Christophe (compte test), et une partie de la surface UI est cosmétique sans handler. La structure code fait fuir le sens : 75 sites importent `supabaseWrites.ts` (1728L) tandis que `src/services/repos/*.repo.ts` (2247L) duplique les mêmes fonctions et n'est consommé que par 4 fichiers. Le bouton FAB générique de 9 routes dispatche un event `pt-fab-action` que **seule** `ReproV70.tsx` écoute. La règle métier "1 bande ≤ 2 loges (1F + 1M)" n'est **pas implémentée** dans le form FAB grand-public (`QuickAddBandeForm`), seulement dans un wizard one-shot de migration. État compte Christophe : 117 porcelets orphelins (`batch_id=NULL`, `loge_id=NULL`), 5 bandes dont 3 PENDING, 1 seule loge en DB. **Estimation totale : 22–30h sur 4 chantiers indépendants exécutables en parallèle.**

## Findings — Inventaire des problèmes

| # | Sév. | Type | Description | Fichier:ligne | Impact concret |
|---|---|---|---|---|---|
| 1 | P0 | bug | FAB générique sur 9 routes dispatche `pt-fab-action` mais **seul** `ReproV70` écoute. Sur tout le reste, bouton + visible mais ne fait rien | `src/App.tsx:111` (dispatch), `src/v70/pages/ReproV70.tsx:472` (seul listener), `src/design-system/hooks/usePageFab.ts:22-34` | Christophe clique +, rien ne se passe → frustration immédiate |
| 2 | P0 | bug métier | `QuickAddBandeForm` ne propose aucun champ loge ; `QuickAddBandeFromLogeForm` force 1L=1B (`selectAvailableLoges` filtre les loges occupées). La règle "1B ≤ 2L F+M" n'existe que dans `PorceletsReorgWizard` (one-shot migration) | `src/components/forms/QuickAddBandeForm.tsx:53-90`, `quickAddBandeFromLogeLogic.ts:103-110`, `PorceletsReorgWizard.tsx:69,179,432,452` | Workflow normal "créer bande dans 2 loges F+M" inexistant |
| 3 | P0 | structure | `services/repos/*.repo.ts` (16 fichiers, 2247L) duplique `supabaseWrites.ts` (1728L). Seuls 4 imports consomment `repos/`. Les 12 autres repos = code mort identique mais désynchronisable | `supabaseWrites.ts:1167 listLoges` vs `repos/loges.repo.ts:66 listLoges` (diff = 1 ligne commentaire). `grep "from '.*loges.repo'" → 0 résultat` | Agents lisent les 2, choisissent au hasard ; risque de drift |
| 4 | P0 | bug UX | `PorceletsReorgGate` force redirect `/porcelets-reorg` à chaque login pour toute ferme avec porcelets `batch_id=NULL`. Pour Christophe : 117 porcelets × 13 bandes = wizard ré-ouvert tant que pas tout saisi en 1 session. "Plus tard" en sessionStorage = perdu au prochain login | `PorceletsReorgGate.tsx:29-50` | Christophe coincé dans boucle réorga |
| 5 | P1 | structure | `supabaseWrites.ts` = 1728L, 104 exports, 15 tables. Aucune frontière par domaine, mélange CRUD + helpers métier | `src/services/supabaseWrites.ts` monolithe | Lecture infaisable agent ; chaque modif risque casser 75 sites |
| 6 | P1 | bug data | 5 bandes Christophe : 3 PENDING (NV=0), 2 VALIDATED (NV=12) mais 0 porcelet attaché. Lien batch↔porcelets jamais établi | `porcelets_individuels.batch_id IS NULL` count = 117 | "Mes 117 porcelets" affiche 0 dans compte/bande/loge |
| 7 | P1 | sécu/perf | 91 advisors : 19 RLS auth_rls_initplan + 19 FK non-indexées + 8 duplicate_index + 6 multiple_permissive_policies + 6 SECURITY DEFINER WARN | `mcp__supabase__get_advisors` | Latence queries listing (truies, batches, porcelets) ; UX "rapide" cassée |
| 8 | P1 | feature manquante | Marius `/health` → 404 + racine `/` → 404 sur `api.porctrack.tech` | `curl https://api.porctrack.tech/health → 404` | Pas de signal "Marius up/down" UI |
| 9 | P2 | structure | `CLAUDE.md:97-111` mentionne `googleSheets.ts` (fichier inexistant). Branchement obsolète | `CLAUDE.md:97-111` | Confusion agents |
| 10 | P2 | structure | `src/services/supabaseService.ts` (516L) lit data : 4 imports. Coexiste avec `FarmContext` + `farmDataLoader` = 2 paths de lecture | `supabaseService.ts:44-477` | Doublon hot path |
| 11 | P2 | dette test | Pas de test e2e "créer bande → 2 loges F+M → porcelets répartis" | `tests/e2e/` | Régression silencieuse possible |
| 12 | P2 | mémoire désync | `CLAUDE.md:89-93` cite `TroupeauContext`/`RessourcesContext`/`PilotageContext` — code utilise `FarmContext`/`AuthContext`/`ToastContext` | `CLAUDE.md:89-93` vs `ls src/context/` | Agents Read des fichiers inexistants |

## Chantiers D — 4 chantiers indépendants

### D1 — Workflow loges & bandes complet (1B ≤ 2L, F+M)
**Objectif** : Christophe peut créer 1 bande + 2 loges F+M et y assigner ses 117 porcelets (56M+61F) en ≤ 7 clics depuis le FAB `/elevage`, sans wizard de migration.
**Zone** : `QuickAddBandeForm.tsx`, `QuickAddBandeFromLogeForm.tsx`, `quickAddBandeFromLogeLogic.ts`, `QuickAddLogeForm.tsx`, `AnimalsV70.tsx`, `supabaseWrites.ts:1167-1320`, `tests/e2e/bande-2-loges.spec.ts`
**Étapes** :
1. Étendre `QuickAddBandeForm` à 3 étapes : (a) infos bande, (b) 1L vs 2L F/M, (c) sélection porcelets filtrés par sexe si 2L.
2. Helper atomique `createBandeWithLoges({batch, logeF?, logeM?, porceletIds})` qui chaîne insertLoge × (1 ou 2) + insertBatch + UPDATE porcelets.
3. Extraire `repartitionPorceletsParLoge` (existe dans `PorceletsReorgWizard.tsx:179`) → `src/lib/repartitionPorcelets.ts` partagé.
4. Assouplir `selectAvailableLoges` pour loge "demi-occupée" (bande F présente, on ajoute M).
5. Tests vitest + spec Playwright sur compte Christophe.
**Critère fin** : `SELECT batch_id, count(*), count(DISTINCT loge_id) FROM porcelets_individuels WHERE farm_id='…' GROUP BY batch_id` → 117 porcelets / 2 loges distinctes.
**Estimation** : 1 jour (8h dont 2h tests).
**Risques** : `batches.poids_initial_kg NOT NULL CHECK >0 ≤200` ; `loges_farm_id_numero_key UNIQUE`.

### D2 — FAB Saisir branché sur 9 routes
**Objectif** : sur `/today`, `/troupeau/truies/:id`, `/troupeau/verrats/:id`, `/troupeau/bandes/:id`, `/troupeau/loges/:id`, `/elevage`, `/cycles`, `/outils/sante`, `/outils/stocks`, le clic FAB ouvre une bottom-sheet d'actions contextuelles (≥3 actions par page).
**Zone** : `App.tsx:94-130`, `usePageFab.ts`, `FabActionSheet.tsx` (nouveau), 6 pages V70
**Étapes** :
1. Élargir `PageFabConfig` à `{ actions: Array<{id, label, icon, formComponent}> }`.
2. Créer `FabActionSheet` avec `Suspense+lazy` des forms.
3. Câbler actions par page (cf. plan détaillé inline).
4. Retirer event `pt-fab-action` → prop directe.
5. Spec Playwright 1/route.
**Critère fin** : `grep "pt-fab-action" src/ → 0`. `npx playwright test fab-saisir-coverage.spec.ts → 9/9`.
**Estimation** : 6h.
**Risques** : ReproV70 utilise déjà `pt-fab-action` pour SAILLIE — refactor sans casser.

### D3 — Collapse `supabaseWrites` / `services/repos/`
**Objectif** : 0 duplication entre `repos/` et `supabaseWrites.ts`. Une seule source par fonction. `supabaseWrites.ts` ≤ 200L (ré-exports) ou supprimé.
**Zone** : `supabaseWrites.ts` + 16 fichiers `services/repos/*.repo.ts` + ~75 fichiers consommateurs
**Étapes** :
1. Diff strict fonction par fonction : repos vs supabaseWrites.
2. Décision **A** (recommandée) : repos = target ; supabaseWrites devient ré-exports `export * from './repos/loges.repo'`.
3. Codemod sur 75 sites pour pointer directement vers `services/repos/<domain>.repo.ts`.
4. Réduire/supprimer `supabaseWrites.ts`.
5. MAJ `CLAUDE.md:97-111`, `README.md:42-48`.
**Critère fin** : `wc -l supabaseWrites.ts ≤ 200`. `grep from supabaseWrites → 0`. `grep from services/repos/ → ≥50`. tsc 0 erreur. vitest 2145/2145.
**Estimation** : 1 jour (8h).
**Risques** : 48 forms importent `supabaseWrites` (imports nommés multiples) ; `setCurrentFarmIdRef` lu par FarmContext.

### D4 — Supabase perfs + sécu (RLS initplan + FK index)
**Objectif** : 91 advisors → ≤30. Latence `listTruies/Batches/Porcelets` /2.
**Zone** : 3 nouvelles migrations `supabase/migrations/v82_rls_initplan_fix.sql`, `v82_fk_indexes.sql`, `v82_dedupe_policies.sql`
**Étapes** :
1. 19 RLS initplan → pattern `(SELECT auth.uid())`.
2. 19 `CREATE INDEX CONCURRENTLY` sur FKs.
3. 8 duplicate_index → drop redondants.
4. 6 multiple_permissive_policies → merger.
5. 6 SECURITY DEFINER WARN : COMMENT ON FUNCTION (option C "accept risk" déjà actée journal V74).
6. HaveIBeenPwned ON via dashboard Supabase.
**Critère fin** : advisors → `auth_rls_initplan=0`, `unindexed_foreign_keys=0`, `duplicate_index=0`. EXPLAIN ANALYZE → Index Scan au lieu de Seq Scan.
**Estimation** : 4h.
**Risques** : `CREATE INDEX CONCURRENTLY` hors transaction → 1 statement OU `apply_migration` sans wrap.

## Ordre d'exécution recommandé

1. **D1 d'abord** (8h) — LE bug bloquant Christophe, gain immédiat.
2. **D2 en parallèle** (6h, autre session) — zones de fichiers disjointes, double gain visible.
3. **D4 ensuite** (4h) — gain latence direct sur listings de D1. Migrations SQL pures.
4. **D3 en dernier** (8h) — refactor structurel, pas d'effet utilisateur direct mais protège futurs chantiers.

## Hors scope (réservé à Claude design ou plus tard)

- **Tout design** : palette `--pt-*`, tokens, typographie, migration des 53 usages `.ft-*` legacy — Claude design.
- **Refonte `PorceletsReorgWizard`** : reste en l'état comme wizard one-shot.
- **Optimistic locking** truies multi-users (P2 backlog).
- **Push notifications VAPID** : action dashboard, pas du code.
- **Marius `/health` endpoint** : sprint backend séparé (accès VPS llama-server).
- **CLAUDE.md / README.md** correction `googleSheets.ts` / `TroupeauContext` : 30 min, insérer dans D3 ou Vague E.
- **16 règles d'alerte AlertEngine** : tests à jour, aucun bug signalé.
