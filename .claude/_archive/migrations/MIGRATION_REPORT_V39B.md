# Rapport Phase 4 — V39-B (élevage / cycles)

## 4 pages traitées

| Page | Commit | Notes |
| --- | --- | --- |
| `src/features/pilotage/PerfKpiView.tsx` | `8ac4fa8` | Cards/Tags/Stats refondues DS V2 |
| `src/features/hubs/TroupeauHub.tsx` | `445bc78` | Tabs DS, Inventaire StatsGrid, tokens `--pt-*` |
| `src/features/troupeau/TruieDetailView.tsx` | `c269676` | 5 boutons natifs → `<Button>`, hex éliminés, `safeDisplay()` sur hero |
| `src/features/reproduction/ReproductionHub.tsx` | `b4994d3` | StepSection + StepRow refactor, KPIs StatsGrid |

## Composants DS manquants (à signaler V39-CLEANUP)

Aucun. Les composants `Section`, `Card`, `Button`, `Tag`, `IconBox`, `StatsGrid`,
`Stat`, `Tabs`, `ListItem`, `ActionRow`, `Empty`, `safeDisplay` ont couvert
l'intégralité des besoins. Les composants métier non-DS (SowHero, ReproTracker,
DecisionBinaire, MariusPanel, TimelineVerticale, NotesTimeline, LineageBreadcrumb,
LineageTree, PhotoStrip, EditableNumber, EditableText) sont restés tels quels —
ce sont des composants applicatifs spécifiques qui dépassent le périmètre du DS.

## Tests qui ont nécessité un update

- `src/features/hubs/TroupeauHub.test.tsx` : helper `clickSubTab*` ré-implémenté
  pour cibler le tablist DS (`aria-label="Sélectionner une vue du troupeau"`)
  au lieu des id Radix `troupeau-tab-*` (composant Radix supprimé). 17/17 OK.

Aucun update nécessaire pour TruieDetailView (16 OK + 5 skipped) ni
ReproductionHub (5/5 OK).

## UUID / monospace / hex éliminés (avant → après, scope V39-B)

| Compteur (rg sur 4 fichiers) | Avant | Après |
| --- | --- | --- |
| `<button` natifs | 8 | 0 |
| `var(--font-mono)` inline | 8 | 0 |
| Hex en dur (`#xxx`) | 2 | 0 |
| Tokens `--ds-*` legacy | 14 | 0 |
| `truie.id` / UUID brut JSX | 0 | 0 (déjà conforme) |
| `safeDisplay()` ajouts | — | 9 sites |

## Warnings CI

- Baseline lint avant V39-B : 30 errors, 128 warnings.
- Après V39-B : 30 errors, 127 warnings.
- Aucune nouvelle erreur introduite. -1 warning.
- `./scripts/check-ds-compliance.sh` : 4 erreurs bloquantes restantes — **toutes
  hors scope V39-B** (AlertCard, EditableNumber/Text, GlobalSearch, Landing, et
  imports legacy `components/design/Button` dans 8 fichiers admin/CGU/etc.).
  À traiter par V39-CLEANUP.

## Validation finale

- `npx tsc --noEmit` : aucune erreur sur les 4 fichiers.
- `npm run test:unit -- --run` : **132 files / 1666 tests passés** (6 skipped).
- `npm run build` : succès en 3.08 s, 111 entries précachées.

## Blockers

Aucun.
