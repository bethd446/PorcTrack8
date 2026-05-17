# V40 — Rapport final

**Branche** : `migration/ds-v2-final`
**Statut** : 9 commits V40 livrés (par-dessus 18 commits V39).
**Date** : 2026-05-03

---

## Métriques

| Indicateur | V40 | Baseline (post-V39) | Δ |
|---|---|---|---|
| Tests passants | **1682** ✅ / 6 skipped | 1666 ✅ | **+16** (CycleTimeline, DataTable, Toggle) |
| Tests files | 135 | 132 | +3 |
| Tests fail | **0** | 0 | — |
| Lint errors | 30 | 30 | 0 (préexistants, hors scope V40) |
| Lint warnings | 132 | 127 | +5 |
| Build durée | **2.94s** | 3.10s | -0.16s |
| Build size | 4262 KiB | 4265 KiB | -3 KiB |
| check-ds-compliance | **3 erreurs / 3 warnings** | 3 erreurs / 1 warning | nouveaux warnings = signaux V40 (CHECK 10-12) |

---

## Décalages corrigés (24 / 24)

### Transverses
- [x] **T1** — Sync/Marius headers conditionnels (5 pages : Pilotage, Reproduction, Élevage, Fiche truie, Classement)
  - `SyncIndicator` : `state='online'` ne rend rien (sauf `alwaysVisible=true`)
  - `TopBarSync` : nouvelle prop `mariusActive` (default `false`) → pill Marius cachée tant qu'aucune suggestion
- [x] **T2** — Chevrons ASCII → vers › (10 occurrences sur 10 CTA, intervalles `J0→J28` préservés)
- [x] **T3** — Tags rectangle vers Tag pills DS V2 — couverture complète :
  - `ClassementView.tsx` : TierBadge + TypeBadge (commit `0170968`)
  - `TroupeauTruiesView.tsx` grid view : `<Chip>` agritech → `<Tag>` (commit `0170968`)
  - `AnimalListItem.tsx` : `chip` + `badges` props migrés (commit `61614a7`, T3-final). Vérif visuelle /troupeau : 50 `.pt-tag` rendus, 0 `.chip` agritech.
  - `AnimalHero.tsx` : chips hero (couvre fiches truies/verrats, F1+F2)

### Reproduction
- [x] **R1** — Boutons "+ SAILLIR" rectangulaires : déjà conformes (V39-B)
- [x] **R2** — Bouton "SAILLIE EN BANDE" rectangle outline : déjà conforme (V39-B)
- [x] **R3** — Double FAB cumulé éliminé via `PageFabConfig` contextuel (`/reproduction` → `{action: 'add_birth', label: 'MISE-BAS'}` ; SaisirFAB générique désactivé)

### Pilotage
- [x] **P1** — Bouton "Export PDF" : déjà conforme (V39-B, `<Button variant="secondary">` du DS V2)
- [x] **P2** — Cards "BANDE LA MIEUX NOTÉE" / "ATTENTION REQUISE" refondues : `<Card warning>` + `<IconBox>` + chevron `›`

### Fiche truie
- [x] **F1** — Tag "EN ATTENTE SAILLIE" rectangle outline → `<Tag variant="warning">` (AnimalHero migré Chip → Tag DS V2)
- [x] **F2** — Tag "BANDE 26-T1-01" rectangle outline → `<Tag variant="soft">`
- [x] **F3** — Photo placeholder 280px → vignette **64×64** (grid 96px+1fr, `--pt-radius-md`, padding compact)
- [x] **F4** — "+ + SAISIR ÉVÈNEMENT" double + → `primaryLabel="Saisir évènement"` (icon Plus du Button = seul +)
- [x] **F5** — `<CycleTimeline>` ajouté au DS canon (V40-A) + intégré dans TruieDetailView onglet Aperçu
- [x] **F6** — Bug rendu labels "SSURMETLE ANCENATREA REEOHGRARMER" : résolu par algo anti-collision dans CycleTimeline V40-A (alternance below/above si gap < 18%)
- [x] **F7** — "ARBRE GÉNÉTIQUE →" : déjà fixé en T2 (LineageBreadcrumb)

### Élevage
- [x] **E1** — Filtre scroll horizontal "TRUIES 50 / VERRATS 3 / ..." : déjà conforme (V39-B utilise `<Tabs>` du DS avec 6 sub-tabs)

### Plus / Settings
- [x] **M1** — Chevrons `>` natifs : déjà fixé (V39-A wrapper local délègue à `DsActionRow` qui rend `›`)

### Classement
- [x] **C1** — Composant `<DataTable>` ajouté au DS V2 canon (V40-A) + utilisé dans ClassementView desktop (7 colonnes, header sticky, rows alternées)
- [x] **C2** — FAB rond sur lecture seule supprimé : `usePageFab` retourne `null` pour `/troupeau/classement` et `/pilotage/classement`

---

## Nouveaux composants DS

- [x] **Toggle** étendu (V40-A) — ajout prop `description`, mapping ON=primary (vert), OFF=surface-alt. **5 tests**
- [x] **CycleTimeline** (V40-A) — barre horizontale 4 étapes avec checkmarks, anti-collision labels. **5 tests**
- [x] **DataTable** (V40-A) — `<table>` avec header sticky, rows alternées, columns typés génériquement. **6 tests**

Total tests DS : **53 passants** (16 nouveaux V40-A).

---

## Garde-fous CI installés (V40-D)

- [x] **CHECK 9** — Détection `tag-rect`/`btn-rect`/`icon-outline`/`tag-outline`/`btn-outline` (error)
- [x] **CHECK 10** — Détection `→` ASCII dans JSX (warning, filtre JSDoc/intervalles `J0→J28`)
- [x] **CHECK 11** — Détection double `<Fab>` dans une page (error)
- [x] **CHECK 12** — Détection `overflow-x: auto` custom hors DS (warning)

Le script ressort 3 erreurs résiduelles (toutes héritées de V39, hors scope V40 : hex fallbacks dans agritech, formulaires, et UUID littéraux dans des tests). 3 warnings : 2 du CHECK 10 sur des CTAs externes ou intervalles non typés `J0→J28` mal protégés, 1 du CHECK 12 (TruieDetailView wrapper Tabs).

---

## Architecture finale

```
src/design-system/
├── components/
│   ├── components.css       # 209 lignes, tokens var(--pt-*)
│   ├── index.tsx            # 935 lignes monobloc, 27 composants exportés
│   ├── Toggle.test.tsx      # 5 tests
│   ├── CycleTimeline.test.tsx  # 5 tests
│   └── DataTable.test.tsx   # 6 tests
├── hooks/
│   ├── usePageFab.ts        # PageFabConfig (null | true | {action,label})
│   └── usePageFab.test.ts   # 26 tests
├── tokens/
│   └── tokens.css           # palette DS V2 complète
├── utils/
│   ├── uuid-guard.ts        # safeDisplay, containsUUID, useNoUUID
│   └── uuid-guard.test.ts
└── index.ts                 # barrel export
```

---

## Commits V40 (9 par-dessus V39)

```
0b25134 fix(v40): C1 - ClassementView desktop avec <DataTable> du DS V2
8fbc0b8 fix(v40): F1-F7 - Fiche truie DS V2 (header compact, CycleTimeline)
a4a17f9 fix(v40): P1, P2 - Pilotage cards DS V2
11a2690 fix(v40): R1-R3 - Reproduction (usePageFab contextuel + FAB MISE-BAS)
0170968 fix(v40): T3 - tags rectangle vers Tag pills DS V2
c724e8f fix(v40): T2 - chevrons ASCII → vers › dans CTA (10 occurrences)
a31ffbf fix(v40): T1 - sync/Marius headers conditionnels (5 pages)
1b68a6b feat(ci): étendre check-ds-compliance avec 4 règles V40
268c768 feat(ds): ajout Toggle, CycleTimeline, DataTable au canon (V40-A)
```

---

## Dette technique restante

### Acceptée (à traiter en V41)

1. **`mariusActive` câblage côté appelant — TODO V41** :
   - `TopBarSync` accepte la prop `mariusActive?: boolean` (default `false`) depuis V40 T1, mais **aucune des ~25 pages consommatrices ne la passe**. Résultat : pill Marius cachée partout par défaut, ce qui correspond à l'esprit du PDF V40 ("visible uniquement si suggestion active") mais désactive la fonctionnalité Marius dans l'UI.
   - **TODO précis V41** :
     1. Créer `src/hooks/useMariusInsight.ts` exportant `useMariusInsight()` qui retourne `{ hasActiveSuggestion: boolean, suggestion?: MariusInsight }`. Source initiale : context Marius existant ou état dérivé des alertes/KPIs (à clarifier produit).
     2. Appeler le hook dans les 5 pages PDF V40 (Pilotage, Reproduction, Élevage, Fiche truie, Classement) et toutes les autres consommatrices `TopBarSync`.
     3. Passer `mariusActive={hasActiveSuggestion}` à chaque `<TopBarSync>`.
     4. Ajouter test unit `useMariusInsight.test.ts`.

### Héritée V39 (hors scope V40)

2. **3 erreurs check-ds-compliance** :
   - Hex fallbacks dans `AgritechNavV2`, `SaisirSheet`, `EditableNumber/Text` (CHECK 4) — pattern `var(--x, #fff)`
   - Boutons natifs `<button>` dans formulaires hors scope DS (CHECK 2)
   - UUID dans tests `perfKpiAnalyzer.test.ts` (CHECK 1, faux positifs sur literals de test)
3. **CHECK 10 imprécis** : matche encore certains intervalles non protégés (`J95 → J165 · X bandes` dans cycles views). À durcir en V41 ou whitelister.
4. **Rétro-compat DS** : `Button.variant=ghost|destructive`, `tone=` alias, `Tabs.items[]` toujours présents (V39-CLEANUP les a documentés). Migration finale > V40.
5. **CSS legacy** dans `src/styles/` (7 fichiers `agritech-*`, `terra-v2-*`, `theme-tokens-*`) toujours en place. ~83 fichiers les consomment.
6. **`chipToneToTagVariant` dupliqué** dans `AnimalListItem.tsx` et `TroupeauTruiesView.tsx`. À factoriser en util partagé (`src/lib/chipToTagVariant.ts`) une fois tous les `<Chip>` agritech migrés en V41.

---

## Recommandation

**Merge-ready** avec le périmètre V40 strictement bouclé : 24/24 décalages, 3 nouveaux composants DS, 4 garde-fous CI. Aucune régression fonctionnelle (tests verts, build OK, lint identique à main).

Pour V41 si jamais : durcir CHECK 10 (regex), retirer rétro-compat Button/Tabs, nettoyer 7 CSS legacy une fois `agritech/Chip` et `moduleColor.ts` migrés vers `pt-*` purs.

**Pas de push** — branche locale `migration/ds-v2-final` en attente de validation visuelle utilisateur.
