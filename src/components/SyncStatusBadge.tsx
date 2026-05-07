import React from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { cn } from '../lib/utils';

export interface SyncStatusBadgeProps {
  /** Si true, affiche aussi l'état "Synchro OK" quand pendingCount=0 et online. Défaut false (caché). */
  showWhenIdle?: boolean;
  className?: string;
}

/**
 * Badge compact d'état synchro — visible dans les top headers / layout.
 * Quatre états :
 *  - flushing → spinner ambré "Synchro…"
 *  - offline  → gris CloudOff "Hors ligne"
 *  - pending  → ambré Cloud "{n} en attente"
 *  - idle     → vert subtle "Synchro OK" (caché par défaut)
 *
 * Design system Terrain Vivant : InstrumentSans tabular-nums uppercase 11px, rounded-full, py-1 px-2.5.
 */
const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  showWhenIdle = false,
  className,
}) => {
  const { pendingCount, isOnline, isFlushing } = useOfflineQueue();

  const variant = resolveVariant({ pendingCount, isOnline, isFlushing });
  if (variant.kind === 'idle' && !showWhenIdle) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={variant.aria}
      className={cn(
        'ft-code inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide whitespace-nowrap',
        variant.classes,
        className,
      )}
    >
      <variant.Icon
        size={14}
        aria-hidden="true"
        className={variant.iconClassName}
      />
      <span>{variant.label}</span>
    </span>
  );
};

interface Variant {
  kind: 'flushing' | 'offline' | 'pending' | 'idle';
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  iconClassName?: string;
  label: string;
  aria: string;
  classes: string;
}

function resolveVariant(s: {
  pendingCount: number;
  isOnline: boolean;
  isFlushing: boolean;
}): Variant {
  if (s.isFlushing) {
    return {
      kind: 'flushing',
      Icon: Loader2,
      iconClassName: 'animate-spin',
      label: 'Synchro…',
      aria: 'Synchronisation en cours',
      classes: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }
  if (!s.isOnline) {
    return {
      kind: 'offline',
      Icon: CloudOff,
      label: 'Hors ligne',
      aria: 'Hors ligne',
      classes: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
  }
  if (s.pendingCount > 0) {
    return {
      kind: 'pending',
      Icon: Cloud,
      label: `${s.pendingCount} en attente`,
      aria: `${s.pendingCount} saisies en attente de synchronisation`,
      classes: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }
  return {
    kind: 'idle',
    Icon: Cloud,
    label: 'Synchro OK',
    aria: 'Synchronisé',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
}

export default SyncStatusBadge;
