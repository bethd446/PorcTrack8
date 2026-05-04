/**
 * V70 — entry point du nouveau système.
 *
 * Importé par App.tsx via routage conditionnel feature flag.
 * Dossier complet `src/v70/` parallèle à `src/` ancien (clean-room V70).
 */

// Tokens CSS (importé une fois au mount V70)
export { default as v70TokensCSS } from './theme/v70-tokens.css?url';

// CSS global (importé séparément par routage Phase 2)
export { default as v70GlobalCSS } from './theme/v70-global.css?url';

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

// Contexte UI
export {
  UIPreferencesProvider,
  useUIPreferences,
} from './context/UIPreferencesContext';

// Pages V70 (à compléter par sub-agent V70-3 Phase 3)
// export { default as TodayV70 } from './pages/TodayV70';
// ... etc.
