/**
 * V70 — entry point du nouveau système.
 *
 * Importé par App.tsx via routage conditionnel feature flag.
 * Dossier complet `src/v70/` parallèle à `src/` ancien (clean-room V70).
 */

// CSS V70 — fichiers supprimés au design reset 2026-05-18 (Lot 4z).
// v70-tokens.css + v70-global.css ne sont plus dans le repo : le
// fallback neutre src/index.css fournit les --pt-* runtime.

// Composants atomiques DS V70 (Phase 1B)
export { PageHeader } from './components/ds/PageHeader';
export type { PageHeaderProps, BreadcrumbItem } from './components/ds/PageHeader';

export { Section } from './components/ds/Section';
export type { SectionProps } from './components/ds/Section';

export { Card } from './components/ds/Card';
export type { CardProps } from './components/ds/Card';

export { Button } from './components/ds/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/ds/Button';

export { Pill } from './components/ds/Pill';
export type { PillProps, PillVariant } from './components/ds/Pill';

export { StatsGrid, Stat } from './components/ds/StatsGrid';
export type { StatsGridProps, StatProps } from './components/ds/StatsGrid';

export { ListItem } from './components/ds/ListItem';
export type { ListItemProps } from './components/ds/ListItem';

export { TabsMini } from './components/ds/TabsMini';
export type { TabsMiniProps, TabOption } from './components/ds/TabsMini';

export { CycleTimeline } from './components/ds/CycleTimeline';

// Composants V70 spécifiques (Phase 1C)
export { Tooltip } from './components/v70/Tooltip';
export { EduCard } from './components/v70/EduCard';
export { EmptyEdu } from './components/v70/EmptyEdu';
export { ExportButton } from './components/v70/ExportButton';
export { ToggleAdvancedMode } from './components/v70/ToggleAdvancedMode';
export { DataTable } from './components/v70/DataTable';
export type { DataTableColumn } from './components/v70/DataTable';

// Couche éducative (Phase 6)
export { EncyclopediaArticle } from './components/v70/EncyclopediaArticle';
export type { EncyclopediaArticleProps } from './components/v70/EncyclopediaArticle';
export { EncyclopediaPage } from './pages/EncyclopediaPage';
export { OnboardingEduPage } from './pages/OnboardingEduPage';
export type { OnboardingEduPageProps } from './pages/OnboardingEduPage';

// BottomNav + Router (Phase 2)
export { BottomNavV70 } from './components/v70/BottomNav';
export { V70Routes } from './router/V70Routes';

// Contexte UI
export {
  UIPreferencesProvider,
  useUIPreferences,
} from './context/UIPreferencesContext';

// Pages V70 (à compléter par sub-agent V70-3 Phase 3)
// export { default as TodayV70 } from './pages/TodayV70';
// ... etc.
