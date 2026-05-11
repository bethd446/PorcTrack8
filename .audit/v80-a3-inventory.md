# A3 component-dedup — Inventaire V80

**Date** : 2026-05-12  
**Agent** : A3 component-dedup (Sonnet)

---

## Source unique canonique : `src/v70/components/`

### `src/v70/components/ds/` (composants primitifs V70)

| Composant | Fichier | Exports |
|---|---|---|
| Card | ds/Card.tsx | `Card`, `CardProps` |
| Button | ds/Button.tsx | `Button`, `ButtonProps`, `ButtonVariant`, `ButtonSize` |
| Pill | ds/Pill.tsx | `Pill`, `PillProps`, `PillVariant` |
| ListItem | ds/ListItem.tsx | `ListItem`, `ListItemProps` |
| Section | ds/Section.tsx | `Section`, `SectionProps` |
| PageHeader | ds/PageHeader.tsx | `PageHeader` |
| StatsGrid | ds/StatsGrid.tsx | `StatsGrid` |
| TabsMini | ds/TabsMini.tsx | `TabsMini` |
| CycleTimeline | ds/CycleTimeline.tsx | (re-export alias `@/design-system`) |

### `src/v70/components/v70/` (composants V70 spécialisés)

| Composant | Fichier | Exports |
|---|---|---|
| BottomNav | v70/BottomNav.tsx | navigation bas |
| DataTable | v70/DataTable.tsx | `DataTable`, `DataTableColumn` |
| Dialog | v70/Dialog.tsx | dialog |
| EduCard | v70/EduCard.tsx | `EduCard` |
| EmptyState | v70/EmptyState.tsx | `EmptyState`, `EmptyStateProps`, `EmptyStateCta` |
| EmptyEdu | v70/EmptyEdu.tsx | empty state pédagogique |
| EncyclopediaArticle | v70/EncyclopediaArticle.tsx | article encyclopédie |
| EntityNotFoundGuard | v70/EntityNotFoundGuard.tsx | `SpinnerCenter`, `EntityNotFoundCard` |
| ExportButton | v70/ExportButton.tsx | `ExportButton` |
| LongPressSheet | v70/LongPressSheet.tsx | sheet long-press |
| NotifCategoriesSwitches | v70/NotifCategoriesSwitches.tsx | switches notifs |
| PhotoGallery | v70/PhotoGallery.tsx | `PhotoGallery` |
| PhotoUpload | v70/PhotoUpload.tsx | `PhotoUpload` |
| PushNotifToggle | v70/PushNotifToggle.tsx | toggle push |
| Skeleton | v70/Skeleton.tsx | `Skeleton` |
| Toast | v70/Toast.tsx | toast |
| ToggleAdvancedMode | v70/ToggleAdvancedMode.tsx | toggle avancé |
| Tooltip | v70/Tooltip.tsx | `Tooltip` |

---

## Composants legacy `src/components/design/` avec équivalent V70

| Composant legacy | Fichier | Équivalent V70 | Consumers | Action |
|---|---|---|---|---|
| EmptyState | design/EmptyState.tsx | `v70/EmptyState` | TroupeauTruiesView, TroupeauVerratsView, LogeDetailView | **MIGRER → v70, SUPPRIMER** |
| Chip | design/Chip.tsx | `agritech/Chip` (Chip est déjà un shim vers agritech) | TruieDetailView | **MIGRER → agritech, SUPPRIMER** |

---

## Composants legacy NON doublonnés (à garder)

| Composant | Fichier | Raison de garder |
|---|---|---|
| AnimalHero | design/AnimalHero.tsx | Composant métier unique (hero truie/verrat/bande) |
| SowHero | design/SowHero.tsx | Alias rétro-compat AnimalHero, toujours consommé par TruieDetailView |
| Eyebrow | design/Eyebrow.tsx | Composant UI spécifique, pas de V70 équivalent |
| PhaseBadge | design/PhaseBadge.tsx | Composant métier spécifique |
| TopBarSync | design/TopBarSync.tsx | Composant layout spécifique |
| CommandPalette | design/CommandPalette.tsx | Feature spécifique |
| LineageTree | design/LineageTree.tsx | Visualisation métier |
| ... autres | design/* | Composants métier sans équivalent V70 strict |
| KpiCard (agritech) | agritech/KpiCard.tsx | API riche (delta, spark, tone), consommé par AlertsView |
| KpiCard (design) | design/KpiCard.tsx | API différente, semble non consommée (0 imports) |

---

## Comptages

| Métrique | Avant | Après |
|---|---|---|
| Fichiers tsx dans src/components | 182 | 180 (-2) |
| Imports depuis components/design | 34 | 32 (-2) |
| Imports depuis ../components/ legacy | 157 | 155 (environ) |

---

## Fichiers supprimés

1. `src/components/design/Chip.tsx` — shim vers agritech, consumer unique migré
2. `src/components/design/EmptyState.tsx` — 3 consumers migrés vers v70/EmptyState

## Fichiers enrichis

- `src/v70/components/v70/EmptyState.tsx` — ajout `iconNode?: React.ReactNode` + `action?: React.ReactNode` + `size?` pour compatibilité legacy

## Fichiers migrés

- `src/features/troupeau/TruieDetailView.tsx` — design/Chip → agritech/Chip
- `src/features/troupeau/TroupeauTruiesView.tsx` — design/EmptyState → v70/EmptyState
- `src/features/troupeau/TroupeauVerratsView.tsx` — design/EmptyState → v70/EmptyState
- `src/features/troupeau/LogeDetailView.tsx` — design/EmptyState → v70/EmptyState
