import React from 'react';

export type SyncState = 'online' | 'pending' | 'offline';

interface Props {
  state?: SyncState;
  /** Si true, affiche juste le dot pulsé sans texte (compact mobile) */
  compact?: boolean;
}

const LABELS: Record<SyncState, string> = {
  online: 'Synchronisé',
  pending: 'Sync en attente',
  offline: 'Hors ligne',
};

const COLORS: Record<SyncState, { dot: string; text: string }> = {
  online: { dot: 'var(--color-accent-500)', text: 'var(--ink-soft)' },
  pending: { dot: 'var(--amber-pork)', text: 'var(--ink-soft)' },
  offline: { dot: 'var(--color-pig)', text: 'var(--color-pig-deep)' },
};

const PULSE_CLASS: Record<SyncState, string> = {
  online: 'pulse-green',
  pending: 'pulse-amber',
  offline: '',
};

const SyncIndicator: React.FC<Props> = ({ state = 'online', compact = false }) => {
  const c = COLORS[state];
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`État de synchronisation : ${LABELS[state]}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'DMMono, ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: c.text,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        className={PULSE_CLASS[state]}
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: c.dot,
        }}
      />
      {!compact && LABELS[state]}
    </span>
  );
};

export default SyncIndicator;
