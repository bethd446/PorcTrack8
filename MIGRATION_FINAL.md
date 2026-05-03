# MIGRATION DS V2.0 — AUDIT FINAL

Branche `migration/ds-v2-final`. État après V39-CLEANUP (2026-05-03).

## 1. Phases livrées

| Phase | Description | Statut |
|---|---|---|
| 1 | Install DS v2.0 propre (`src/design-system/*`) | OK (`3a4c05f`) |
| 2 | NUKE legacy DS (V29 css, lib utils) + Button.tsx (V39-CLEANUP) | OK (`bab4951` + `ec01605`) |
| 3 | Migration imports + tokens find/replace | OK (`55b1f73`) |
| 4 | Refonte 8 pages (TodayHub, OutilsView, SystemManagement, AuditView, PerfKpiView, TroupeauHub, TruieDetailView, ReproductionHub) | OK (`39bb837`...`b4994d3`) |
| 5 | Garde-fous CI (script + husky + workflow + PR template) | OK (présent depuis V38) |
| 6.1 | Audit final | OK (ce document) |

## 2. État final `check-ds-compliance.sh`

```
CHECK 1 : UUID affiché dans le JSX            ✗ (regex large : matche {x.id} dans navigate/href/data-testid légitimes)
CHECK 2 : Boutons natifs <button              ✗ (200+ <button> natifs hors DS, hors scope V39 — voir §6 dette)
CHECK 3 : IonButton (avertissement)           ⚠ (présent dans quelques modals, à migrer progressivement)
CHECK 4 : Couleurs hex en dur                 ✗ (~50 fallbacks var(--xxx, #yyy) restants dans cycles/admin/*)
CHECK 5 : border-radius en pixel direct       ✓
CHECK 6 : font-family monospace               ✓
CHECK 7 : Imports legacy components/design/   ✓ (V39-CLEANUP a fermé)
CHECK 8 : Tags statut anglais HIGH/MEDIUM/LOW ✓
```

Score : **3 erreurs bloquantes / 1 avertissement** (était 4/1 avant V39-CLEANUP).

## 3. Résultats build / tests / lint

| Métrique | Valeur |
|---|---|
| `npm run build` | OK 2.94s — 111 entries précachées (4262.85 KiB) |
| `npm run test:unit` | **132 fichiers / 1666 passés / 6 skipped / 0 fail** |
| `npx tsc --noEmit` | 0 erreur |
| `npm run lint` | 30 errors / 127 warnings (identique baseline avant V39-CLEANUP) |

Plus gros chunks build :
- `vendor-ionic-core` 445 KiB (gzip 107 KiB)
- `vendor-ionic-components-n` 335 KiB
- `vendor-ionic-components-a` 296 KiB
- `vendor-react` 233 KiB
- `index` 224 KiB

## 4. Composants DS V2 livrés

`src/design-system/components/index.tsx` — 25 composants :

Layout/structure :
- `Section` / `SectionHeader` (alias)
- `Card` (avec variants `default | elevated | alt | insight | warning | danger`)
- `InsightCard`

Actions :
- `Button` (variants `primary | secondary | danger | ghost | destructive | inverse`, sizes `sm | md | lg | small | medium`)
- `Fab`
- `Toggle` / `Switch` (alias) — **ajouté par V39-CLEANUP**

Affichage data :
- `Tag` (variants `default | primary | accent | soft | danger | warning | success`)
- `IconBox` (variants `primary | warm | accent | danger`)
- `KeyValueRow`
- `StatsGrid` + `Stat`
- `Chip`

Forms :
- `FormField`, `Input`, `Select`, `Textarea`
- `Search`

Navigation :
- `Tabs` (API `options[]` ou `items[]`)
- `Segment`

Listes / actions :
- `ListItem`
- `ActionRow`

Alertes :
- `AlertGroup` (severity `critical | warning | urgent | surveil`)
- `AlertRow`

Vide :
- `Empty`

Wizard :
- `Wizard` (steps + validate + onComplete)

Helpers (`src/design-system/utils/uuid-guard`) :
- `safeDisplay`, `containsUUID`, `assertNoUUID`, `useNoUUID`, `UUID_REGEX`

Hooks (`src/design-system/hooks/usePageFab`) :
- `usePageFab`, `isPageFabEnabled`

## 5. Pages refondues Phase 4

| Page | Commit |
|---|---|
| TodayHub | `39bb837` |
| OutilsView | `b0a3865` |
| SystemManagement | `d3c5bb8` |
| AuditView | `060ee25` |
| PerfKpiView | `8ac4fa8` |
| TroupeauHub | `445bc78` |
| TruieDetailView | `c269676` |
| ReproductionHub | `b4994d3` |

## 6. Décisions techniques actées (V39-CLEANUP)

### Conservées (rétro-compat & coût/bénéfice)

- **Rétro-compat Button/Tabs/AlertGroup/AlertRow/ActionRow/Card/Tag/IconBox** : aliases dans le DS V2 (`variant=ghost`, `tone=`, `severity=urgent|surveil`, `Tabs.items[]`, `Card.variant=elevated|alt`, `Tag.success`, `Section.tone=`). Coût migration des 30+ consommateurs > bénéfice. Conservés.

- **CSS legacy `src/styles/*` (7 fichiers)** : `agritech-tokens`, `agritech-utilities`, `terra-v2-tokens`, `terrain-vivant-v6`, `theme-tokens`, `theme-v2-tokens`, `typography-utils`. Tous encore consommés (83 fichiers utilisent `var(--ds-*)`, `var(--ink-*)`, `bg-pig-*`, etc.). Suppression = refactor de 80+ fichiers. Conservés.

- **`src/components/design/` (20 composants restants)** : `AnimalHero`, `Chip`, `CohortTimeline`, `CommandPalette`, `DecisionBinaire`, `EmptyState`, `Eyebrow`, `KpiCard`, `LineageBreadcrumb`, `LineageTree`, `MariusFAB`, `MariusPanel`, `NotesTimeline`, `PhaseBadge`, `PublicShell`, `ReproTracker`, `Sidebar`, `SowHero`, `SyncIndicator`, `TimelineVerticale`, `TopBarSync`. Ce sont des composants applicatifs métier (pas des duplicats du DS V2). 80+ fichiers les importent. Conservés.

### Supprimées

- **`src/components/design/Button.tsx`** : doublon strict du DS V2 Button. Supprimé. 13 fichiers consommateurs migrés vers `@/design-system`.

### Configurées

- **Alias `@/design-system`** : ajouté à `tsconfig.json`, `vite.config.ts` et `vitest.config.ts`. Mappe vers `./src/design-system`. Alias `@/*` (pointant vers la racine) conservé pour compat avec `@/src/components/ui/*`. 27 fichiers migrés depuis import relatif vers alias.

### Étendues

- **`Button.variant='inverse'`** : ajouté pour le pattern Landing/About (fond blanc + texte primary sur fond foncé).

- **`Toggle` / `Switch`** : nouveau composant ajouté au DS V2 (button role=switch ARIA, slider 200ms, classes `.pt-toggle` + tokens `--pt-*`). SystemManagement migré.

## 7. Dette technique restante

Items qui n'ont pas atteint l'objectif "0 erreur compliance" et qui restent à traiter dans une itération future :

1. **CHECK 1 (UUID JSX)** : faux positifs nombreux. La regex `{x.id}` matche les expressions dans `navigate(\`/route/${x.id}\`)`, `href={...}`, `data-testid={...}` qui sont parfaitement légitimes (URL programmatique, identifiant DOM). À reformuler en regex plus restrictive (uniquement `{x.id}` en position visuelle JSX, pas dans template strings ou attributs).

2. **CHECK 2 (boutons natifs)** : ~200 `<button>` natifs encore présents, principalement dans `features/cycles/*`, `features/onboarding/*`, `features/troupeau/*`, `components/forms/*`, `features/hubs/*`. Migration vers `<Button>` DS = chantier ~3 jours, hors scope V39-CLEANUP.

3. **CHECK 4 (hex en dur)** : ~50 fallbacks `var(--xxx, #yyy)` restants dans `features/admin/*`, `features/cycles/*`, `features/pilotage/*`. Tous légitimes (var() fallback). À migrer progressivement vers `var(--pt-*)` lors de futures touches.

4. **CHECK 3 (IonButton)** : avertissement seul. Quelques `IonButton` restent dans des modals Ionic. Migration optionnelle.

5. **30 errors lint préexistantes** : `BandeDetailView`, `financesAnalyzer`, `alertSubject` — hors scope DS, sont des erreurs d'autres règles (TypeScript, no-uuid-jsx). À traiter par les owners des features concernées.

6. **6 tests skipped** : pré-existants, non liés à V39.

## 8. Recommandation finale

**État merge-ready partiel.**

- Les changements V39-CLEANUP sont propres : 4 commits granulaires, **0 régression** (1666 tests OK, build OK, lint inchangé).
- L'objectif "0 erreur compliance" n'est pas atteint mais la baseline pré-V39-CLEANUP non plus (4 → 3 erreurs). La progression est nette : CHECK 7 fermé définitivement, CHECK 4 partiellement nettoyé.
- Le DS V2 est maintenant **complet** (Toggle ajouté, alias `@/design-system` câblé, rétro-compat Button.inverse).
- La rétro-compat conservée dans le DS V2 ne pose pas de problème d'usage : c'est un coût ajouté de typage pour les mainteneurs du DS (≈40 lignes), pas pour les consommateurs.

**Mergable** sur main si on accepte la dette technique listée §7. Sinon, prévoir un V40 pour s'attaquer aux 3 chantiers majeurs (boutons natifs / hex fallbacks / regex CHECK 1).
