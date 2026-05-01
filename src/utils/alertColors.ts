import type { AlertPriority } from '../services/alertEngine';

export const ALERT_PRIORITY_COLOR: Record<AlertPriority, string> = {
  CRITIQUE: 'var(--color-danger, #EF4444)',
  HAUTE: 'var(--amber-pork)',
  NORMALE: 'var(--color-accent-500)',
  INFO: 'var(--color-info, #3B82F6)',
};

export const ALERT_PRIORITY_BG: Record<AlertPriority, string> = {
  CRITIQUE: 'rgba(239, 68, 68, 0.10)',
  HAUTE: 'var(--amber-pork-soft, #FCE4C9)',
  NORMALE: 'var(--color-accent-100, #e3edd9)',
  INFO: 'rgba(59, 130, 246, 0.10)',
};
