/**
 * @deprecated Migrer vers `useOfflineQueue` + `SyncStatusBadge` (RT2).
 * Conservé tant que `TopBarSync` (utilisé dans ~25 vues) en dépend.
 * Ne plus l'utiliser dans le nouveau code.
 */
import React from 'react';

export type SyncState = 'online' | 'pending' | 'offline';

interface Props {
  state?: SyncState;
  /** Si true, affiche juste le dot pulsé sans texte (compact mobile) */
  compact?: boolean;
  /** Si true, rend toujours l'indicateur même en état idle (online).
   *  Par défaut (V40 T1), state=online ne rend rien — moins de bruit visuel. */
  alwaysVisible?: boolean;
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

const SyncIndicator: React.FC<Props> = ({ state = 'online', compact = false, alwaysVisible = false }) => {
  if (state === 'online' && !alwaysVisible) return null;
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
