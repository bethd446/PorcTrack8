import React from 'react';
import { AlertTriangle, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { cn } from '../lib/utils';

export interface SyncStatusBadgeProps {
  /** Si true, affiche aussi l'état "Synchro OK" quand pendingCount=0 et online. Défaut false (caché). */
  showWhenIdle?: boolean;
  /** Callback au clic — utilisé pour ouvrir la modale "Voir la file". */
  onClick?: () => void;
  className?: string;
}

/**
 * Badge compact d'état synchro — visible dans les top headers / layout.
 * Cinq états :
 *  - flushing → spinner ambré "Sync … en cours"
 *  - errors   → rouge AlertTriangle "X erreurs sync" (si tries>0 sur ≥1 item)
 *  - offline  → gris CloudOff "Hors ligne"
 *  - pending  → ambré Cloud "Sync N en cours"
 *  - idle     → vert subtle "Synchro OK" (caché par défaut)
 *
 * Si `onClick` est fourni → rendu en `<button>` (file cliquable). Sinon `<span>`.
 * Design system V77 : tokens `var(--pt-*)`, Lucide icons, font-mono uppercase.
 */
const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  showWhenIdle = false,
  onClick,
  className,
}) => {
  const { pendingCount, isOnline, isFlushing, errorCount } = useOfflineQueue();

  const variant = resolveVariant({ pendingCount, isOnline, isFlushing, errorCount });
  if (variant.kind === 'idle' && !showWhenIdle) return null;

  const baseClasses = cn(
    'font-mono tabular-nums inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide whitespace-nowrap',
    variant.classes,
    onClick ? 'cursor-pointer' : '',
    className,
  );

  const content = (
    <>
      <variant.Icon size={14} aria-hidden="true" className={variant.iconClassName} />
      <span>{variant.label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={variant.aria}
        className={baseClasses}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={variant.aria}
      className={baseClasses}
    >
      {content}
    </span>
  );
};

interface Variant {
  kind: 'flushing' | 'errors' | 'offline' | 'pending' | 'idle';
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
  errorCount: number;
}): Variant {
  if (s.isFlushing) {
    return {
      kind: 'flushing',
      Icon: Loader2,
      iconClassName: 'animate-spin',
      label: s.pendingCount > 0 ? `Sync ${s.pendingCount} en cours` : 'Synchro…',
      aria: 'Synchronisation en cours',
      classes: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }
  // Erreurs en priorité sur "pending neutre" : si des items ont déjà échoué,
  // l'éleveur DOIT le voir (pill rouge cliquable).
  if (s.errorCount > 0) {
    return {
      kind: 'errors',
      Icon: AlertTriangle,
      label: `${s.errorCount} erreur${s.errorCount > 1 ? 's' : ''} sync`,
      aria: `${s.errorCount} action${s.errorCount > 1 ? 's' : ''} en échec — toucher pour détail`,
      classes: 'bg-red-50 text-red-700 border border-red-200',
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
