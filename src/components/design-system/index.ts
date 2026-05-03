/**
 * Design System V30-MASTER — DNA "Aujourd'hui"
 * ════════════════════════════════════════════════════════════════════════════
 * Composants canoniques pour la refonte des hubs (Élevage, Cycles…).
 * Tokens : src/styles/design-system-v29.css (--pt-* canoniques + alias --ds-*).
 *
 * Référence visuelle : src/features/today/TodayHub.tsx
 * Page demo : /design-system (DesignSystemView)
 */

export { default as Card } from './Card';
export type { CardProps, CardVariant } from './Card';

export { default as Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { default as SectionHeader } from './SectionHeader';
export type { SectionHeaderProps, SectionHeaderTone } from './SectionHeader';

export { default as Tag } from './Tag';
export type { TagProps, TagVariant } from './Tag';

export { default as IconBox } from './IconBox';
export type { IconBoxProps, IconBoxTone } from './IconBox';

// V30-MASTER ─────────────────────────────────────────────────────────────────
export { default as KeyValueRow } from './KeyValueRow';
export type { KeyValueRowProps, KeyValueRowTone } from './KeyValueRow';

export { default as InsightCard } from './InsightCard';
export type { InsightCardProps } from './InsightCard';

export { default as Input } from './Input';
export type { InputProps } from './Input';

export { default as FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { default as Tabs } from './Tabs';
export type { TabsProps, TabItem } from './Tabs';

// V31-FIX-PACK-01 ───────────────────────────────────────────────────────────
export { default as AlertGroup } from './AlertGroup';
export type { AlertGroupProps, AlertSeverity } from './AlertGroup';

export { default as AlertRow } from './AlertRow';
export type { AlertRowProps } from './AlertRow';

// V32 PHASE 4 ───────────────────────────────────────────────────────────────
export { default as Wizard } from './Wizard';
export type { WizardProps, WizardStep } from './Wizard';

// V33 DS-COMPLETION ─────────────────────────────────────────────────────────
export { default as Segment } from './Segment';
export type { SegmentProps, SegmentOption } from './Segment';

export { default as Chip } from './Chip';
export type { ChipProps } from './Chip';

export { default as Search } from './Search';
export type { SearchProps } from './Search';

export { default as ListItem } from './ListItem';
export type { ListItemProps } from './ListItem';

export { default as ActionRow } from './ActionRow';
export type { ActionRowProps } from './ActionRow';

export { default as Stat } from './Stat';
export type { StatProps, StatTone } from './Stat';

export { default as StatsGrid } from './StatsGrid';
export type { StatsGridProps, StatsGridCols } from './StatsGrid';
