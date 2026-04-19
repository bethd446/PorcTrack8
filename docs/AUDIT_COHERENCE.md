# Audit post-refonte Agritech

**Date** : 2026-04-17
**Scope** : Cohérence post-refonte cockpit dark + hubs `/troupeau`, `/cycles`, `/ressources`, `/pilotage`.
**Méthode** : Lecture `src/App.tsx` (routes sources), `grep` de tous les appels `navigate()` / `to="/"` / `window.location.href` / `<Navigate to=>`, comparaison, puis requête live Sheets V20 pour les counts.
**Hors scope** : aucune modification de code — diagnostic uniquement.

---

## 1. Boutons / liens morts

Routes définies dans `src/App.tsx` (33 routes) :

```
/, /controle, /cheptel, /cheptel/truie/:id, /cheptel/verrat/:id,
/bandes, /bandes/:bandeId, /sante, /stock, /stock/aliments,
/stock/veto, /protocoles, /checklist/:name, /audit, /alerts,
/sync, /more,
/troupeau, /cycles, /ressources, /pilotage,
/troupeau/truies, /troupeau/verrats, /troupeau/truies/:id,
/troupeau/verrats/:id, /troupeau/bandes, /troupeau/bandes/:bandeId,
/pilotage/alertes (→ /alerts), /pilotage/reglages (→ /more),
/pilotage/audit (→ /audit),
/ressources/aliments, /ressources/aliments/plan, /ressources/veto
```

| Fichier:ligne | Appel | Route ciblée | Existe ? | Fix proposé |
|---|---|---|---|---|
| `src/features/hubs/PilotageHub.tsx:29` | `<HubTile to="/pilotage/perf"/>` | `/pilotage/perf` | NON | Ajouter route vers placeholder `<ComingSoon />` OU griser le HubTile (disabled) |
| `src/features/hubs/PilotageHub.tsx:36` | `<HubTile to="/pilotage/finances"/>` | `/pilotage/finances` | NON | Idem (le subtitle dit déjà "Bientôt") → rendre non-cliquable |
| `src/features/hubs/CyclesHub.tsx:27` | `<HubTile to="/cycles/repro"/>` | `/cycles/repro` | NON | Même traitement — 4 HubTiles morts (repro, maternite, post-sevrage, engraissement) |
| `src/features/hubs/CyclesHub.tsx:34` | `<HubTile to="/cycles/maternite"/>` | `/cycles/maternite` | NON | Idem |
| `src/features/hubs/CyclesHub.tsx:41` | `<HubTile to="/cycles/post-sevrage"/>` | `/cycles/post-sevrage` | NON | Idem |
| `src/features/hubs/CyclesHub.tsx:47` | `<HubTile to="/cycles/engraissement"/>` | `/cycles/engraissement` | NON | Idem |
| `src/features/hubs/RessourcesHub.tsx:43` | `<HubTile to="/ressources/veto"/>` | `/ressources/veto` | OUI | OK |
| `src/features/hubs/TroupeauHub.tsx:140` | `<HubTile to="/troupeau/bandes"/>` | `/troupeau/bandes` | OUI | Route ok, mais voir §2 — le concept "Bande" est incorrect |

Note sur le **HubTile** (`src/components/agritech/HubTile.tsx:55`) : `onClick={() => navigate(to)}` — appeler un target inexistant ne fait rien de visible (router n'affiche aucun match → écran vide). L'utilisateur voit la barre de nav mais pas de contenu. **C'est exactement le symptôme "clic sans effet"** signalé.

Dans `Cockpit.tsx`, les redirections `navigate('/pilotage/alertes')` fonctionnent grâce au `<Navigate to="/alerts" replace />` défini dans `App.tsx:109`.

**Autres call sites vérifiés OK** : Navigation.tsx (4 tabs), AgritechNav.tsx (5 tabs), AuditView.tsx (3 navs via alertes), PremiumHeader.tsx (back + sync + audit), TruiesListView.tsx, BandesView.tsx, ChecklistFlow.tsx, Dashboard.tsx (legacy — voir §5), ControleQuotidien.tsx.

---

## 2. Data model bandes / portées

### Counts réels (source Sheets V20)

Requête live `read_table_by_key&key=PORCELETS_BANDES_DETAIL` (2026-04-17) :

| Métrique | Valeur Sheets |
|---|---|
| Rows total (incl. RECAP) | 15 |
| Portées après filter RECAP | 14 |
| Portées "Sevrés" | 10 |
| Portées "Sous mère" | 4 |
| Porcelets vivants (sum Sevrés) | 106 |
| Porcelets vivants (sum Sous mère) | 43 |
| Total vivants | 149 (+ 111 RECAP double-comptée = 260 dans vue naïve) |
| Morts (hors RECAP) | 10 |

La **ligne RECAP** (id = `TOTAL 15 portées`, vivants=111) est bien filtrée par `mapBande` (`src/mappers/index.ts:178`).
La note RECAP dit : `"Sevrés: 110 | Sous mère: 43 | Total porcelets: 153"` → **incohérence interne Sheets** : la somme Sevrés des Vivants = 106, mais RECAP dit 110. À confirmer avec l'utilisateur.

### Counts attendus par l'utilisateur

| Métrique | Attendu utilisateur |
|---|---|
| Bandes (loges post-sevrage) | **4** |
| Porcelets sevrés (total) | **110** |
| Porcelets sous-mère | **48** |
| Portées actives (1 par truie en mater) | ~4 |
| Truies totales | 17 ✓ |
| Verrats | 2 ✓ |

### Gap sémantique

Dans le modèle actuel :
- `BandePorcelets` (`src/types/farm.ts:59`) = **1 portée = 1 truie + ses porcelets**. L'ID est `26-T7-01` (truie T07, portée 1).
- `mapBande` lit `PORCELETS_BANDES_DETAIL` avec une ligne par portée.
- `BandesView.tsx:134-210` agrège par `ID Portée` (trivial puisque 1 ligne par portée).

Le concept "Bande" métier de l'utilisateur (loge de post-sevrage regroupant plusieurs portées sevrées à la même date) **n'existe pas dans le data model** :
- Aucune colonne `loge`, `bande_id`, ou `lot_id` dans `PORCELETS_BANDES_DETAIL`.
- Aucune table dédiée `BANDES_POST_SEVRAGE` ou équivalent.
- Seul indice : la colonne `Notes` contient parfois "Bande 1 — Post-sevrage J17", "Sevré 10/04 — sem 6-12 avr" — info non structurée.

**Conséquence** : le TroupeauHub affiche `bandes.length = 14` (portées), pas 4 (loges). Le Cockpit idem.

### Fix proposé

**Option A — Rename UI (court terme, minimal change)** :
- Dans toute l'UI : remplacer "Bande" → "Portée" (label only), laisser le data model intact.
- Plus honnête par rapport à la donnée actuelle.
- Impact : `TroupeauHub.tsx`, `BandesView.tsx` (title + subtitle), `Cockpit.tsx` (snapshot), `Dashboard.tsx`, `Navigation.tsx`, texts d'alertes.
- Estimation : 2-3h, zéro risque data.

**Option B — Introduire concept "Loge" (long terme, riche)** :
- Ajouter colonne `LOGE` ou `BANDE_POST_SEVRAGE` dans `PORCELETS_BANDES_DETAIL` (ou table dédiée `BANDES_LOGES`).
- Mapper ces regroupements côté `mappers/index.ts` + nouveau type `Loge`.
- UI : `/troupeau/bandes` → `/troupeau/loges` avec agrégation dynamique (portées groupées par loge).
- Estimation : 1-2j (Sheets + mapper + view + FarmContext).

**Option C — Dériver l'agrégation côté front (intermédiaire)** :
- Parser la colonne `Notes` pour extraire "Bande N" ou regrouper par `date_sevrage_reelle` même semaine.
- Fragile (basé sur texte libre), mais zéro changement backend.
- Estimation : 4-6h.

**Recommandation** : A immédiat (corriger le mensonge UI) + B planifié (vrai fix métier).

---

## 3. Counts incohérents affichés

| Écran | Affiche | Devrait afficher | Cause |
|---|---|---|---|
| Cockpit (`src/components/Cockpit.tsx:406`) | `{bandes.length}` = 14 | 4 bandes / loges | Data model = portées, pas loges |
| TroupeauHub (`src/features/hubs/TroupeauHub.tsx:77`) | `{bandes.length}` = 14 | 4 | Idem |
| TroupeauHub (`src/features/hubs/TroupeauHub.tsx:83`) | `stats.totalPorcelets` ≈ 149 (si filter RECAP) | 158 (110 sevrés + 48 sous-mère) | Sum `vivants` diverge du RECAP Sheets (10 morts + 1 T04 portée redistribuée) |
| TroupeauHub (`src/features/hubs/TroupeauHub.tsx:138`) | `bandesSousMere` = 4 / `bandesSevrees` = 10 | 4 / 10 (portées) **OU** 4 loges / 4 (post-sevrage) selon sémantique | Label "Bandes" utilisé au lieu de "Portées" |
| Dashboard (`src/components/Dashboard.tsx:325`) | `{herdSummary.bandes}` = 14 | 4 | Legacy écran, en plus n'est plus monté dans routes (voir §5) |
| Cockpit `kpiPleines` | OK | 2 truies pleines ✓ | RAS |
| Cockpit `kpiMaternite` | OK | 4 truies en maternité ✓ | RAS |

Counts truies / verrats : OK (17 / 2) ✓.

---

## 4. Style mixte / écrans legacy

Deux systèmes de composants coexistent :

**Style "Premium light"** (header vert + cards blanches arrondies) :
- `src/features/tables/AnimalDetailView.tsx`
- `src/features/tables/BandesView.tsx` (encore Premium, alors qu'atteignable via route `/troupeau/bandes` du hub dark)
- `src/features/tables/TableView.tsx`
- `src/features/tables/TableRowEdit.tsx`
- `src/features/tables/CheptelView.tsx`
- `src/features/protocoles/ProtocolsView.tsx`
- `src/features/controle/ControleQuotidien.tsx`
- `src/features/controle/ChecklistFlow.tsx`
- `src/features/controle/AuditView.tsx`
- `src/features/controle/SyncView.tsx`
- `src/components/SystemManagement.tsx` (SettingsPage)
- `src/components/forms/QuickNoteForm.tsx`, `QuickHealthForm.tsx`

**Style "Agritech dark"** (card-dense, bg-bg-0, text-text-0) :
- `src/components/Cockpit.tsx` (home)
- `src/features/hubs/*` (4 hubs)
- `src/features/troupeau/TruiesListView.tsx`
- `src/features/ressources/PlanAlimentationView.tsx`
- `src/features/tables/AlertsView.tsx`

**Écrans mixtes problématiques** :
- `BandesView.tsx` utilise `PremiumHeader` + `PremiumCard` (light), accessible via l'entrée dark `/troupeau/bandes` → rupture visuelle à la navigation.
- `CheptelView.tsx` (utilisé par `/troupeau/verrats` via `initialTab="VERRAT"`) → light, alors qu'on arrive d'un hub dark.
- `AnimalDetailView.tsx` (truies/verrats) → light, idem.
- Tous les hubs dark (`TroupeauHub`, `RessourcesHub`, `PilotageHub`, `CyclesHub`) montent un `PremiumHeader` (light) en haut — mix interne dans l'écran. Le `PremiumHeader` a un `bg-accent-50` farm badge vert, détonne sur fond `bg-bg-0` noir.

**Double nav** (`App.tsx:119-120`) :
```tsx
<Navigation />    // light, 4 tabs
<AgritechNav />   // dark, 5 tabs
```
Les deux composants sont montés en parallèle et se cachent alternativement via leurs conditions internes :
- `Navigation` cache sur `/`, `/troupeau`, `/cycles`, `/ressources`, `/pilotage` et `/checklist/`, `/controle`.
- `AgritechNav` cache sur `/checklist/`, `/controle/checklist`.
- **Conflit zones** : `/cheptel`, `/bandes`, `/alerts`, `/audit`, `/sync`, `/more`, `/sante`, `/stock`, `/protocoles` → **les deux navs affichées simultanément**. L'utilisateur voit 2 barres bottom empilées. Bug visuel majeur.

---

## 5. Dead code / orphelins

### Composants chargés mais jamais atteints

| Fichier | Problème | Fix |
|---|---|---|
| `src/components/Dashboard.tsx` | Lazy-importé `App.tsx:26` avec `eslint-disable no-unused-vars`, **jamais rendu** — `/` route → `Cockpit`. | Supprimer ou garder en commentaire « rollback » dans un seul endroit. |

### Routes legacy encore exposées (coexistence volontaire)

Fonctionnent toujours mais devraient être auditées pour savoir si on les garde :
- `/cheptel`, `/cheptel/truie/:id`, `/cheptel/verrat/:id` → remplaçables par `/troupeau/truies`, `/troupeau/truies/:id`, `/troupeau/verrats/:id`.
- `/bandes`, `/bandes/:bandeId` → `/troupeau/bandes`, `/troupeau/bandes/:bandeId` (pointent vers le même composant).
- `/alerts` → plus exposé dans les hubs, seulement via `<Navigate>` de `/pilotage/alertes`. Ok à garder comme alias.
- `/more` → idem (alias de `/pilotage/reglages`).

### Placeholder orphelin

`App.tsx:52-54` — `StockHub` est un composant placeholder inline qui appelle juste `<TableView tableKey="STOCK_ALIMENTS" />`. Utilisé par `/stock`. OK mais redondant avec `/ressources/aliments` qui fait la même chose. Envisager de supprimer `/stock` ou d'en faire un `<Navigate>`.

### Script root

`scripts/sheets-audit.mjs` — 14 `no-undef` lint errors (console/process/fetch/URLSearchParams) car il n'a pas l'env Node configuré dans ESLint. **Pas bloquant** (script standalone), mais à fixer si on veut lint propre.

### Lint errors non bloquants mais à noter

`src/features/troupeau/TruiesListView.tsx:208-211` — 4 errors `Cannot create components during render` (React 19 rule). Composant `<SkeletonRow />` rendu 4× consécutivement dans un `role="status"`. À refacto en map ou factoriser.

---

## 6. PRIORITÉS (Top 8)

Classées par impact utilisateur terrain.

| # | Sévérité | Problème | Fix court | Effort |
|---|---|---|---|---|
| 1 | **🔴 bloquant** | Double bottom nav affichée sur `/cheptel`, `/bandes`, `/alerts`, `/audit`, `/sync`, `/more`, `/sante`, `/stock`, `/protocoles` | Ajouter ces paths à `hideOn` d'`Navigation.tsx` OU les lister explicitement dans `AgritechNav.tsx` `hideOn` — choisir UNE nav par route. | 30 min |
| 2 | **🔴 bloquant** | 6 HubTiles cliquables sans destination (`/pilotage/perf`, `/pilotage/finances`, `/cycles/{repro,maternite,post-sevrage,engraissement}`) — clic = écran blanc | Soit ajouter prop `disabled` au `HubTile` quand subtitle contient "Bientôt" et ne pas appeler `navigate()` ; soit créer un composant `<ComingSoon name="…"/>` et une route fourre-tout `/*` pour ces paths. | 1h |
| 3 | **🔴 bloquant** | Count "Bandes" ment : affiche 14 (portées) au lieu de 4 (loges réelles). Présent sur Cockpit, TroupeauHub, Dashboard. | Option A (rename UI "Bande" → "Portée") immédiat ; option B (vrai data model Loge) planifié. | A: 3h · B: 1-2j |
| 4 | **🟡 incohérence** | Style light `PremiumHeader` utilisé dans hubs dark (`TroupeauHub`, `CyclesHub`, `RessourcesHub`, `PilotageHub`) | Créer un `<AgritechHeader>` dark aligné sur tokens `bg-bg-1`/`text-text-0` OU adapter `PremiumHeader` avec variant. | 2h |
| 5 | **🟡 incohérence** | `BandesView` et `CheptelView` (accessibles depuis hub dark) en style light — rupture visuelle | Migrer ces vues au système dark + `AgritechLayout` (ou au minimum header). | 1-2j |
| 6 | **🟡 incohérence** | `AnimalDetailView` (truies/verrats) en style light, navigation via `/troupeau/*/:id` | Idem #5 | inclus #5 |
| 7 | **🟢 cosmétique** | Dashboard legacy lazy-importé mais jamais rendu | Supprimer import + commenter que `Cockpit` remplace Dashboard dans une note. | 10 min |
| 8 | **🟢 cosmétique** | Route `/stock` = alias mal nommé de `/ressources/aliments` ; navigation redondante | Remplacer par `<Navigate to="/ressources/aliments" replace/>`. | 5 min |

---

## Annexes

### A. Divergence RECAP vs détail Sheets

RECAP dit : `Sevrés: 110 | Sous mère: 43 | Total porcelets: 153`.
Somme calculée sur rows : `Sevrés: 106 | Sous mère: 43 | Total: 149`.
Diff = 4 porcelets sevrés. Cause probable : correction T04 (portée redistribuée, pas réassignée dans détail).
User dit 48 sous-mère → Sheets dit 43. Manque 5 (peut-être T10 "PAS sevrés, trop petits" = 5 ? T10 déjà en sous-mère = 5, ne l'explique pas).

**À confirmer avec l'utilisateur** : synchroniser le détail Sheets avec le vécu terrain avant de "fixer" l'affichage de l'app.

### B. Commandes reproductibles

```bash
# Counts portées + vivants par statut
node -e "$(cat scripts/sheets-audit.mjs)" # adapté
# ou voir section 2 pour le one-liner

# Tous les navigate()
grep -rn "navigate(" src --include='*.tsx' --include='*.ts'

# Routes définies
grep -n 'Route path' src/App.tsx
```
