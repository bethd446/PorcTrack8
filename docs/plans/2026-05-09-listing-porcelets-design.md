# Listing porcelets — design

> Type : spec design (pas plan d'implémentation). Le plan task-par-task suivra via `superpowers:writing-plans` (commit `v75-h`).

**Goal :** Remplacer le listing porcelets stubs cosmétiques (4 lignes hardcodées P-MAR-01 à P-JAN-01) par un vrai affichage groupé par bande dépliable, alimenté par la table `porcelets_individuels` Supabase. Élimine la friction P1-3 audit V74 ("92 porcelets" annoncés vs 4 lignes affichées).

**Contexte audit V74** : `AnimalsV70.tsx` tab Porcelets affiche `92 PORCELETS` dans l'eyebrow (somme de `bandes[i].vivants`) mais seulement 4 lignes hardcodées (`STUBS_PORCELETS`). Commentaire `// pas de table porcelets dédiée pour le moment` ligne 165 — **obsolète**, la table `porcelets_individuels` existe depuis V25 (octobre 2025) et est référencée dans plusieurs FK (batch_sows, health_logs, etc.).

**Tech Stack :** TypeScript strict · React 18 · Ionic 8 · Supabase JS · Vitest · Playwright · Tailwind v4 + tokens `--pt-*`.

---

## 1. Choix structurants validés (brainstorming 2026-05-09)

| Choix | Décision validée |
|---|---|
| Format d'affichage | **Groupé par bande, dépliable** (vs vrac individuel virtualisé, vs représentant par bande seule) |
| Source de données | `porcelets_individuels` Supabase (filter `statut IN ('VIVANT', 'MALADE', 'QUARANTAINE')` par défaut) |
| Charge initiale | Fetch tout au mount du `FarmContext` (≤ 200 porcelets nominaux ferme audit) |
| Clic sur sub-item porcelet | Pas d'action v1 (display read-only) |
| Routing fiche porcelet dédiée | Hors-scope v1, sprint suivant |

---

## 2. Architecture

### 2.1 Données — `FarmContext` étendu

`src/context/FarmContext.tsx` ajoute deux propriétés exposées via `useFarm()` :

```ts
porcelets: PorceletIndividuel[];          // tous les porcelets actifs de la ferme
porceletsByBande: Map<string, PorceletIndividuel[]>;  // dérivé pour O(1) lookup
```

Le type `PorceletIndividuel` existe déjà (`src/types/farm.ts` V25) :

```ts
export interface PorceletIndividuel {
  id: string;
  batchId: string;       // FK vers bandes.id
  boucle: string;        // unique par farm_id
  sexe: 'M' | 'F' | 'INCONNU';
  poidsCourantKg?: number;
  statut: 'VIVANT' | 'MORT' | 'VENDU' | 'MALADE' | 'QUARANTAINE';
  notes?: string;
}
```

**Source slice** : ajouter à `TroupeauContext.tsx` (slice qui gère déjà truies/verrats/bandes) un fetch `porcelets_individuels` et exposer `porcelets[]` qui est ensuite remonté au `FarmContext` façade.

**Filtre par défaut** : `statut IN ('VIVANT', 'MALADE', 'QUARANTAINE')` — exclut `VENDU` et `MORT` (sortis du cheptel actif). Si l'utilisateur veut les voir, sera un sprint séparé "historique sorties".

### 2.2 Helper `derivePorceletPhase`

Nouveau fichier `src/v70/lib/porceletPhase.ts` :

```ts
import type { BandePorcelets, PorceletIndividuel } from '../../types/farm';

export type PorceletPhase =
  | 'SOUS_MERE'
  | 'POST_SEVRAGE'
  | 'CROISSANCE'
  | 'ENGRAISSEMENT'
  | 'FINITION';

export function derivePorceletPhase(
  porcelet: Pick<PorceletIndividuel, 'poidsCourantKg'>,
  bande: Pick<BandePorcelets, 'dateMB'>,
): PorceletPhase | null;
```

**Règles** (alignées avec `src/config/farm.ts` constants — `POST_SEVRAGE_DUREE_JOURS=35`, `CROISSANCE_DUREE_JOURS=37`, `ENGRAISSEMENT_DUREE_JOURS=80`, `FINITION_POIDS_MIN_KG=100`) :

1. Si `poidsCourantKg ≥ 100` → `FINITION` (priorité poids)
2. Si pas de `dateMB` → `null`
3. Calcul `joursDepuisMB = (today - dateMB) / 86400000`
4. `0-28j` → `SOUS_MERE` (lactation jusqu'au sevrage J+28)
5. `28-63j` → `POST_SEVRAGE` (J28 → J63 selon farm.ts)
6. `63-100j` → `CROISSANCE`
7. `100-180j` → `ENGRAISSEMENT`
8. `≥180j` → `FINITION`

Pill mapping :
- `SOUS_MERE` → `warm`
- `POST_SEVRAGE` → `info`
- `CROISSANCE` → `info`
- `ENGRAISSEMENT` → `warm`
- `FINITION` → `success`

### 2.3 Composant `PorceletGroup`

Nouveau fichier `src/v70/components/PorceletGroup.tsx`. Responsabilité unique : rendu d'une bande dépliable avec ses porcelets.

```tsx
type PorceletGroupProps = {
  bande: BandePorcelets;
  porcelets: PorceletIndividuel[];
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateToBande: (bandeId: string) => void;
};
```

**Header de groupe (toujours visible)** :
- Flèche `▸` (collapsed) / `▾` (expanded) à gauche
- Nom de bande via `formatBandeName({ id, idPortee, truieMere, dateMB })`
- Compteur `{N} vivants` à droite
- Chevron `›` à l'extrême droite — **zone cliquable distincte** avec `aria-label="Voir la fiche bande {nom}"` qui appelle `onNavigateToBande(bande.id)`
- Tap sur le reste de la zone header (pas le chevron) → `onToggle()`
- Touch target ≥ 44px (mobile-friendly)
- Animation `max-height: 0 → ${N}*56px` transition 200ms ease-out

**Sub-items dépliés** (si `isExpanded`) :
- 1 ligne par porcelet, indent 28px (visuel `↳`)
- Boucle (`P-MAI-001`) en `font-family: var(--font-mono)`, `font-variant-numeric: tabular-nums`
- Poids courant : `0.5 kg` ou `—` si null
- Sexe : `M` / `F` / `—`
- Pill phase via `derivePorceletPhase(porcelet, bande)` (variant calculé)
- Pas de clic v1 (cursor: default)

### 2.4 AnimalsV70 — modifications

`src/v70/pages/AnimalsV70.tsx` :

#### 2.4.1 Counts dynamique
Remplacer (vers ligne 112) :
```ts
const porcelets = bandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0);
```
par :
```ts
const porcelets = porcelets.length;  // déjà filtré actifs côté FarmContext
```

#### 2.4.2 realStubs.porcelets — calcul réel
Remplacer (vers ligne 165) :
```ts
porcelets: null, // pas de table porcelets dédiée pour le moment
```
par :
```ts
porcelets: porcelets.length ? porcelets : null,
```

(Note : `realStubs` est gardé pour compat — mais les porcelets utilisent une vue groupée différente, donc on ne touche pas le mapping `AnimalStub` direct. Le rendu se fait via `PorceletGroup` quand `tab === 'porcelets'`.)

#### 2.4.3 Branchement rendu groupé
Dans le bloc `<Section>` (vers ligne 326), brancher conditionnellement :
- Si `tab === 'porcelets'` ET `bandes.length > 0` → render `<PorceletGroup>` pour chaque bande, en utilisant `porceletsByBande.get(bande.id) ?? []`
- Sinon (autres tabs) → garder la logique `filteredList.map(ListItem)` actuelle

#### 2.4.4 État local expansion
Ajouter :
```ts
const [expandedBandes, setExpandedBandes] = useState<Set<string>>(new Set());

// Ouvrir le 1er groupe par défaut une fois les bandes chargées (lazy data).
useEffect(() => {
  if (bandes.length > 0 && expandedBandes.size === 0) {
    setExpandedBandes(new Set([bandes[0].id]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [bandes.length]);
```

`useState` lazy initializer ne fonctionnerait pas ici car `bandes` est `[]` au premier render (data lazy via FarmContext). On gère l'initialisation via `useEffect` qui se déclenche au passage `0 → N` de `bandes.length`.

#### 2.4.5 Search étendu
La search actuelle filtre `it.id`, `it.status`, `it.statusLabel`. Pour le tab `porcelets`, on calcule séparément :
- Si `query.length > 0`, garder uniquement les bandes pour lesquelles AU MOINS UNE des conditions est vraie :
  - Le nom de la bande (`formatBandeName(bande)`) inclut `query` (insensitive)
  - OU au moins un porcelet du groupe a une `boucle` qui inclut `query` (insensitive)
- Quand un groupe est gardé via le second critère (match sur boucle), il est **forcé déplié** pour montrer le porcelet matchant immédiatement (ne pas exiger un clic supplémentaire pour voir le résultat)
- Si query vide, comportement normal (tous les groupes affichés, expansion via `expandedBandes` state)

#### 2.4.6 FAB ajouter porcelet
Le FAB existant (`Ajouter un porcelet`) ouvre déjà `QuickAddPorceletForm` — comportement préservé, pas de modification.

### 2.5 Tests

- **Unit** : `src/v70/lib/__tests__/porceletPhase.test.ts` — 5+ cas couvrant les 5 phases + edge case (poids ≥ 100 prioritaire sur jours, pas de dateMB → null)
- **Unit** : adaptation `AnimalsV70.test.tsx` pour le nouveau tab Porcelets (smoke render avec mock FarmContext)
- **E2E** : `tests/e2e/porcelets-listing.spec.ts` — 2 specs :
  - "Tab Porcelets affiche 6 groupes de bandes avec compteurs cohérents"
  - "Clic sur header bande déplie/replie le groupe (toggle)"

---

## 3. Découpage commit (1 commit unique)

`feat(v75-h): listing porcelets groupé par bande dépliable`

- Création `src/v70/components/PorceletGroup.tsx`
- Création `src/v70/lib/porceletPhase.ts`
- Création `src/v70/lib/__tests__/porceletPhase.test.ts` (5 tests)
- Modification `src/context/TroupeauContext.tsx` (fetch `porcelets_individuels`)
- Modification `src/context/FarmContext.tsx` (expose `porcelets[]` + `porceletsByBande`)
- Modification `src/v70/pages/AnimalsV70.tsx` (counts + realStubs + rendu groupé)
- Modification `src/v70/pages/__tests__/AnimalsV70.test.tsx` (mock étendu)
- Création `tests/e2e/porcelets-listing.spec.ts` (2 specs)
- Bloc `=== VERIFICATION ===` AGENT_CONTRACT obligatoire

---

## 4. Plan de tests

### 4.1 Vitest — cible 1927 → ≥ 1934 (+7 nouveaux porceletPhase)

- `porceletPhase.test.ts` : 7 cas
  1. Sous mère (J0-J28)
  2. Post-sevrage (J28-J63)
  3. Croissance (J63-J100)
  4. Engraissement (J100-J180)
  5. Finition par jours (≥ J180)
  6. Poids ≥ 100kg force FINITION même J50 (priorité poids)
  7. Pas de `dateMB` → retourne `null`

### 4.2 E2E Playwright

- **Spec 1** "Tab Porcelets affiche 6 groupes de bandes avec compteurs cohérents" :
  - Login audit-final, navigate `/troupeau`, click tab Porcelets
  - Vérifier 6 groupes visibles
  - Sum des compteurs `{N} vivants` doit égaler `92`
  - Aucune ligne UUID 8-hex dans les noms de bande
- **Spec 2** "Clic sur header bande déplie/replie le groupe" :
  - Cliquer sur un header collapsed → vérifier que les sub-items apparaissent
  - Cliquer à nouveau → vérifier qu'ils disparaissent
  - Cliquer sur le chevron `›` à droite → vérifier navigation vers `/troupeau/bandes/{id}`

### 4.3 AGENT_CONTRACT bloc VERIFICATION

```
=== VERIFICATION ===
1. wc -l <fichiers nouveaux/modifiés>
2. git diff --stat HEAD~1
3. npx tsc --noEmit
4. npm run test:unit
   <output : ≥ 1934 passing, +7 vs baseline 1927>
5. npm run build
6. git log --oneline -1
7. delta tests : 1927 → ≥ 1934 (+7)
8. régression check : aucun test passing avant qui échoue après
```

### 4.4 Smoke browser

Sur `localhost:5173`, compte `audit-final@porctrack.test`, navigate `/troupeau` tab Porcelets :
- 6 groupes correspondant aux 6 bandes audit (B-AUDIT-CR, 26-T16-01, etc.)
- 1er groupe ouvert par défaut, autres fermés
- Sum compteurs cohérent avec eyebrow `ÉLEVAGE · 145 ANIMAUX` (50 truies + 3 verrats + 92 porcelets)
- Click chevron 1ère bande → arrive sur `/troupeau/bandes/{uuid}`
- Search "P-MAI" filtre les groupes ne contenant pas de porcelets matchants
- Console DevTools : 0 erreur

---

## 5. Critères "done"

- 1 commit `v75-h` poussé sur `main`
- ≥ 1934 unit tests passing
- 2 e2e Playwright nouveaux verts
- 0 erreur console smoke browser
- Sum des compteurs porcelets dans tous les groupes = `counts.porcelets` (eyebrow)
- Aucun stub hardcodé `STUBS_PORCELETS` rendu si la ferme a au moins 1 porcelet en DB
- `getElementsByText('P-MAR-01')` retourne 0 (les anciens stubs cosmétiques ne fuitent plus)

---

## 6. Hors-scope (sprints suivants)

- **Fiche porcelet dédiée** `/troupeau/porcelets/{id}` avec édition (poids, statut, notes)
- **Bottom sheet quick-actions** (pesée, mortalité, vente) sur clic sub-item porcelet
- **Tri/filtre** par poids, par phase, par sexe, par statut
- **Vue carte porcelet** alternative pour élevages > 500 porcelets
- **Filtre statuts élargis** : afficher VENDU/MORT en mode "historique" (toggle)
- **Drag-to-reorganize** entre bandes (adoption / péréquation visuelle)
- **Pagination** si plus de 500 porcelets (charger top 200, scroll = next page)

---

## 7. Risques

- **`FarmContext` bloat sur très grandes fermes** : si `> 1000` porcelets actifs, charger tout au mount peut ralentir (~500ms+ sur 4G). Mitigation v1 : pas de pagination car cible cible PorcTrack = fermes 50-300 truies = max ~600 porcelets actifs. Si testeur signale lenteur, ajouter pagination en sprint séparé.
- **Adoptions et péréquations** (V24 batch_sows) : un porcelet adopté garde son `batchId` cible, donc apparaîtra dans le bon groupe. Mais sa phase calculée à partir de `bande.dateMB` du nouveau batch peut ne pas correspondre à son âge biologique réel. Edge case rare, à raffiner si signalé.
- **Compteur `bandes.vivants` vs `porcelets_individuels` count** : si la donnée DB est désynchronisée (bande dit "11 vivants" mais seulement 9 rows actifs), le compteur affiché sera `9` (source = porcelets table). C'est le comportement souhaité : la table individuelle est plus fiable que l'agrégat. Audit à prévoir si écart > 5%.
- **Animation `max-height` performance** : ouvrir un groupe de 30+ porcelets peut paraître saccadé sur Android entry-level. Si signalé, switcher à `display: block` avec fade `opacity` (moins fluide mais plus performant).
- **Hook `useFarm` mock test cassant** : les tests existants qui mockent `useFarm()` doivent être étendus avec `porcelets: []` et `porceletsByBande: new Map()` pour éviter les `undefined` errors. Audit à faire avant commit.

---

## 8. Inputs prêts

- ✅ Type `PorceletIndividuel` : `src/types/farm.ts:164` (V25)
- ✅ Table `porcelets_individuels` Supabase : référencée dans `database.types.ts:1192`
- ✅ Constants phases cycle : `src/config/farm.ts` (`POST_SEVRAGE_DUREE_JOURS`, etc.)
- ✅ Helper `formatBandeName()` : V75-a, déjà en prod
- ✅ Composant `Pill` : `src/v70/components/ds/Pill.tsx`
- ✅ Compte audit avec 92 porcelets sur 6 bandes : `audit-final@porctrack.test`

## 9. Prérequis avant Task 1 du plan

- Branche `main` propre, sans changements en cours
- Tests baseline verts : `npm run test:unit` = 1927 passing avant démarrage
- Vite dev server actif sur `:5173` pour smoke
- Vérifier que `TroupeauContext.tsx` a déjà un pattern fetch existant à imiter (truies, verrats, bandes) — alignement strict avec ce pattern, pas de réinvention
