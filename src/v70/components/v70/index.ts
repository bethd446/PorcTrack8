/**
 * V70 — Barrel des composants v70 (Sprint 8 patterns transverses).
 *
 * Réexports des composants UI réutilisables ajoutés Sprint 8 :
 * Skeleton, EmptyState, Toast (+ provider/hook), Dialog, LongPressSheet.
 * Les autres composants v70 (Tooltip, EduCard, etc.) restent accessibles
 * via `src/v70/index.ts`.
 */

export { Skeleton } from './Skeleton';
export type { SkeletonProps, SkeletonVariant } from './Skeleton';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateCta } from './EmptyState';

export { Toast, ToastProvider, useToast } from './Toast';
export type { ToastProps, ToastVariant, ToastItem } from './Toast';

export { Dialog } from './Dialog';
export type { DialogProps, DialogActionVariant } from './Dialog';

export { LongPressSheet } from './LongPressSheet';
export type { LongPressSheetProps, LongPressAction } from './LongPressSheet';
