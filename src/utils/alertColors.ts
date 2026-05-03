import type { AlertPriority } from '../services/alertEngine';

export const ALERT_PRIORITY_COLOR: Record<AlertPriority, string> = {
  CRITIQUE: 'var(--color-danger)',
  HAUTE: 'var(--amber-pork)',
  NORMALE: 'var(--color-accent-500)',
  INFO: 'var(--color-info)',
};

export const ALERT_PRIORITY_BG: Record<AlertPriority, string> = {
  CRITIQUE: 'rgba(239, 68, 68, 0.10)',
  HAUTE: 'var(--amber-pork-soft)',
  NORMALE: 'var(--color-accent-100)',
  INFO: 'rgba(59, 130, 246, 0.10)',
};
