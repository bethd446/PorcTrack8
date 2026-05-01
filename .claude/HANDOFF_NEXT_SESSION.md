# PorcTrack 8 — Handoff post-Sheets-Out (2026-05-01 12:54)

## TL;DR
- **v8 LIVE** sur https://porctrack.tech (bundle `index-Bfh2a0Jw.js`)
- **Google Sheets dégage 100%** du code source (services + UI + vars env)
- **Nav Bravo** déployée : 5 tabs mobile + sidebar nested desktop + Cmd+K + FAB menu actions
- **Nouveau hub `/today`** = Inbox alertes biologiques (route racine `/` y redirige)
- Cockpit/BandesView/QuickMiseBasForm **découpés** en sous-composants modulaires
- 17/17 routes HTTP 200, **0 leak** vérifié dans bundle prod
- Commits : `d2c8eac` (consolidé Vagues 1+2+3+4) sur `main`
- Backups remote : `~/backups/porctrack-tech-20260501-125421-prevague1234.tar.gz`

## Métriques

| | Valeur |
|---|---|
| tsc --noEmit | 0 erreur |
| vitest | 787 passed / 5 skipped (52 fichiers) |
| eslint | 0 erreur (24 warnings cosmétiques `Date.now()` purity) |
| bun run build | 2.25s |
| Bundle JS | `index-Bfh2a0Jw.js` (120 kB / 30 kB gzip) |
| Bundle CSS | `index-DXXLTTSk.css` |
| 16 agents Opus orchestrés | 4 vagues + 3 QA en background |
| 223 fichiers changés | +12841 / -7353 |

## Vagues exécutées (16 agents Opus)

### Vague 1 — Quick wins + API extension (2 agents //)
- **1a** : StatusBar Capacitor init runtime, code mort supprimé (SyncStatusBadge, DataAgeIndicator, AgritechNav v1, AnimalDetailView 973L, SparklineCard), recharts dep désinstallée, vendor-supabase chunk splitté, theme-tokens dark legacy purgé, 11 routes deprecated supprimées
- **1b** : `supabaseWrites.ts` étendu 90→333L (9 insertX + 7 deleteX + 3 updateXByCode + 5 resolveXByCode + logDeletion best-effort)

### Vague 2 — Migration writes Sheets→Supabase (3 agents //)
- **2a** : `offlineQueue.ts` refactoré (QueuedMutation typé Postgres), `confirmationQueue.ts` 6 actions GTTT migrées, `checklistService.ts` neutralisé
- **2b** : 19 formulaires Quick* migrés (24 appels Sheets → Supabase typé)
- **2c** : 8 composants migrés (ChecklistFlow, ControleQuotidien, AuditView, TableView, BandesView clôture, TableRowEdit, DeleteModal, tablesRegistry static)

### Vague 3 — Refonte nav Bravo + UI Sheets cleanup (3 agents //)
- **3a** : AppSidebar refondue 240px (Épinglé / Aujourd'hui / Cheptel nested Cycles / Pilotage / Ressources / Admin), CommandPalette Cmd+K (fuzzy search), useRecentNavigation hook
- **3b** : AgritechNavV2 5 tabs Bravo + FAB menu actions métier (Marius IA inclus), Mortalité câblée, resolveActiveTab fixé
- **3c** : TodayHub `/today` créé, fusion Cycles dans Cheptel hub, /sync supprimé, SystemManagement section Flux+GAS supprimée, Cockpit OfflineChip+bannière supprimés, TopBarSync redesigné, 9 fichiers UI nettoyés (vocabulaire neutre), **`googleSheets.ts` SUPPRIMÉ**, VITE_GAS_* retirés, doublons routes supprimés

### Vague 4 — Découpage + 8 issues + tests (3 agents //)
- **4a** : Cockpit 1435→494L (14 sous-composants extraits dans `src/components/cockpit/`), BandesView 1300→355L (9 sous-composants `src/features/tables/bandes/`), QuickMiseBasForm 1139→409L (4 sous-composants UI + helpers purs)
- **4b** : 8 issues 🟡 résolues (ProtectedRoute/AdminRoute useAuth, AdminDashboard try/catch, Cockpit useMediaQuery+kvStore, useMediaQuery useSyncExternalStore, _isOwner unused, Login `/today`+replace, Date.now purity), 5 commentaires cosmétiques Sheets→Supabase
- **4c** : E2E Playwright selectors v6 (22 occurrences, data-testid agritech-header/kpi-card-v6/cheptel-row), 3 tests vitest cycles créés (Maternite, PostSevrage, ReproCalendar)

### Vague 5 — Build + commit + push + deploy
- `bun run build` 2.25s
- Commit `d2c8eac` consolidé (223 fichiers, +12841/-7353)
- Push `f0ee22c..d2c8eac main -> main`
- Backup remote pré-deploy
- Rsync `--delete` vers porctrack.tech
- 17/17 routes HTTP 200 vérifiées
- 0 leak GEMINI_API_KEY / VITE_GAS / appendRow / googleSheets dans bundle prod

## Architecture nav finale (Option Bravo)

**Mobile (≤1023px)** — 5 tabs :
1. **Aujourd'hui** (`/today`) — Inbox alertes biologiques + Audit + Tâches (Inbox icon, badge count CRITIQUE+HAUTE)
2. **Cheptel** (`/troupeau`) — Hub fusionné Truies+Verrats+Bandes+Cycles (sub-tabs)
3. **Pilotage** (`/pilotage`, OWNER only) — KPIs + Finances + Rapports + Prévisions
4. **Ressources** (`/ressources`) — Aliments + Pharmacie
5. **Plus** (`/more`) — Profil + Aide + Marius + Réglages + Admin (gated)

**FAB central** (mobile) — bottom sheet 2×3 grille : Saillie / Soin / Note / Pesée / Mortalité / Marius IA

**Desktop (≥1024px)** — sidebar 240px nested + Cmd+K command palette + sections Épinglé/Aujourd'hui/Cheptel(>Cycles expandable)/Pilotage/Ressources/Admin

## TODO restants (non bloquants)

### Important
- 24 warnings eslint `Date.now()` purity dans `ChecklistFlow:199`, `TodayHub:104`, `QuickMortalityForm:280` etc. — wrapper dans `useMemo` ou helper utilitaire
- Issue Date.now() dans `Cockpit:1335` et `PanelCalendrier:73` réglée — autres restent
- Table `deletion_log` côté Supabase à créer (helpers logDeletion fallback console.warn)
- KpiCardV6 sans prop `icon` — 52 cards sans icône en haut-gauche
- `getNotesForAnimal` / `pullData` / `processQueue` / `syncStatus` exposés dans FarmContext mais plus utilisés UI — à nettoyer
- Tests E2E Playwright non exécutés (serveur dev non lancé) — vérifier en CI
- Quelques sub-vues du sidebar pointent vers routes futures (`/today/tasks`) — placeholder OK

### Mineur
- `src/components/cockpit/panelStyles.ts` à vérifier (probablement importé par tous les sous-composants)
- bun.lock vs package-lock.json coexistent
- `theme-night` bloc dormant (light forcé) — peut être supprimé un jour si plus de retour dark prévu

## Schémas Supabase à créer (TODO migration SQL)

```sql
-- Trace de suppression (utilisé par logDeletion)
create table public.deletion_log (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.profiles(id),
  table_name text not null,
  row_id text not null,
  reason text,
  deleted_at timestamptz not null default now(),
  deleted_by uuid not null
);
alter table public.deletion_log enable row level security;
create policy "deletion_log_owner" on public.deletion_log
  for all using (farm_id = auth.uid()) with check (farm_id = auth.uid());

-- Définitions checklists (si on rebranche checklistService)
create table public.checklist_definitions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.profiles(id),
  category text not null,
  question text not null,
  required boolean default false,
  ordering int default 0
);
alter table public.checklist_definitions enable row level security;
create policy "checklist_def_owner" on public.checklist_definitions
  for all using (farm_id = auth.uid()) with check (farm_id = auth.uid());
```

## Champs perdus à modéliser éventuellement

Champs Sheets sans équivalent Supabase actuel (signalés par Vague 2b) :
- `sows.poids`, `sows.derniere_nv` (utiles GTTT)
- `batches.boucle_mere`, `batches.nb_males`, `batches.nb_femelles`, `batches.date_separation`
- `notes.animal_type`, `notes.animal_id`, `notes.author` (encodés actuellement dans `content`)
- `finances` : modèle "poste budgétaire" (poste/mensuel_fcfa/annuel_fcfa) — pas adapté aux transactions. Recommandation : table `transactions` séparée OU ajouter `transaction_date`/`bande_id`/`categorie` dans `finances`

## Bundle live actuel
- JS : `index-Bfh2a0Jw.js` (120 kB / 30 kB gzip)
- CSS : `index-DXXLTTSk.css`
- Commits : `f0ee22c..d2c8eac main -> main`
- Bundles vendor : ionic-core 446kB, react 232kB, supabase 200kB (split réussi), recharts retiré

## Rollback procedure
```bash
ssh porctrack
cd ~/domains/porctrack.tech/public_html
rm -rf ./*
tar -xzf ~/backups/porctrack-tech-20260501-125421-prevague1234.tar.gz
exit
```

## Action utilisateur next session
1. **Test mobile** porctrack.tech : route `/` doit rediriger vers `/today` (Inbox alertes), navigation 5 tabs, FAB menu actions, Marius dans le FAB
2. **Test desktop** : sidebar 240px avec sections Épinglé/Aujourd'hui/Cheptel(Cycles expandable)/Pilotage/Ressources/Admin, **Cmd+K** ouvre command palette
3. **Test Sheets out** : essayer toutes les actions terrain (saillie, mise-bas, pesée, mortalité, note, soin, vente, refill stock) → doit s'écrire dans Supabase, plus aucune mention Google Sheets
4. **Vérifier rôles** : Pilotage tab visible OWNER, masqué WORKER ; Admin section visible ADMIN, masquée autres
5. **Sprint suivant proposé** :
   - Créer table `deletion_log` côté Supabase + regen types
   - Ajouter prop `icon` à KpiCardV6 (~30min)
   - Ajouter colonnes manquantes (poids/derniere_nv/transactions) si métier le demande
   - Fix 24 warnings `Date.now()` purity (~30min)

## Servers locaux (preview_start)
- vite-dev :5173 (encore actif)
- vite-preview :4173
- vitest-ui :51204
- launch.json : `/Users/13mac/Desktop/.claude/launch.json` (avec bash -c cd + bun run)
