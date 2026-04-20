/**
 * Agritech primitives — dark cockpit design system.
 * These components are additive and coexist with the existing "Ultra Clean"
 * premium-* components. They rely on tokens declared in
 * `src/styles/agritech-tokens.css` + utilities in `agritech-utilities.css`.
 */
export { default as KpiCard } from './KpiCard';
export type { KpiCardProps, KpiTone } from './KpiCard';

export { default as HubTile } from './HubTile';
export type { HubTileProps, HubTileTone } from './HubTile';

export { default as BottomSheet } from './BottomSheet';
export type { BottomSheetProps } from './BottomSheet';

export { default as DataRow } from './DataRow';
export type { DataRowProps } from './DataRow';

export { default as Chip } from './Chip';
export type { ChipProps, ChipTone, ChipSize } from './Chip';

export { default as SectionDivider } from './SectionDivider';
export type { SectionDividerProps } from './SectionDivider';

/* ── v2 primitives (additifs) ────────────────────────────────────────────── */
export { default as SparklineCard } from './SparklineCard';
export type {
  SparklineCardProps,
  SparklinePoint,
  SparklineTone,
} from './SparklineCard';

export { default as FAB } from './FAB';
export type { FABProps, FABAction, FABActionTone } from './FAB';

export { default as IsoBarn, iso, pathFrom, U, COS, SIN } from './IsoBarn';
export type { IsoBarnProps, Building, Arrow, Point2D } from './IsoBarn';
