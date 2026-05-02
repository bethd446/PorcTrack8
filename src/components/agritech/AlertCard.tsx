/**
 * AlertCard — carte d'alerte unifiée (Sprint E1).
 *
 * Composant unique utilisé partout où une FarmAlert (ou une alerte serveur
 * normalisée) doit être affichée avec un bouton "OK ✓" d'acquittement explicite
 * et, optionnellement, un bouton d'action métier (ex: "Saisir pesée",
 * "Confirmer transition").
 *
 * - Icône Lucide selon priority (CRITIQUE / HAUTE / NORMALE / INFO)
 * - Titre + sous-titre (message)
 * - Timer "Depuis Xj" pour les alertes critiques/hautes datées
 * - 2 boutons côte à côte (min-h 44px) : "OK ✓" primary + Action secondary
 *
 * NB : ne fait PAS l'appel `dismissAlert(...)` lui-même — délègue au parent
 * pour rester contrôlé. Cela permet au parent de gérer toast/refresh/animation.
 */

import React from 'react';
import { AlertTriangle, Bell, Info, Check } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FarmAlert, AlertPriority } from '../../services/alertEngine';

export interface AlertCardProps {
  alert: FarmAlert;
  onAcknowledge: (alertId: string) => void;
  /** Action métier optionnelle (ex: ouvrir un form, naviguer vers la fiche). */
  onAction?: () => void;
  /** Libellé du bouton d'action métier (requis si onAction fourni). */
  actionLabel?: string;
  /** ARIA role override (CRITIQUE → 'alert', sinon 'listitem'). */
  ariaRole?: 'alert' | 'listitem';
}

interface PriorityVisual {
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  color: string;
  background: string;
  label: string;
}

const PRIORITY_VISUAL: Record<AlertPriority, PriorityVisual> = {
  CRITIQUE: {
    Icon: AlertTriangle,
    color: 'var(--color-pig-deep, #b91c1c)',
    background: 'var(--color-pig-soft, #fee2e2)',
    label: 'Critique',
  },
  HAUTE: {
    Icon: Bell,
    color: 'var(--color-amber-pork-deep, #c2662b)',
    background: 'var(--color-amber-pork-soft, #fef3c7)',
    label: 'Haute',
  },
  NORMALE: {
    Icon: Info,
    color: 'var(--color-info, #2563eb)',
    background: 'var(--color-info-soft, #dbeafe)',
    label: 'Normale',
  },
  INFO: {
    Icon: Info,
    color: 'var(--muted, #6b7280)',
    background: 'var(--bg-surface-2, #f3f4f6)',
    label: 'Info',
  },
};

function formatDepuis(createdAt?: Date): string | null {
  if (!createdAt) return null;
  try {
    return `Depuis ${formatDistanceToNowStrict(createdAt, { locale: fr })}`;
  } catch {
    return null;
  }
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onAction,
  actionLabel,
  ariaRole,
}) => {
  const visual = PRIORITY_VISUAL[alert.priority] ?? PRIORITY_VISUAL.INFO;
  const Icon = visual.Icon;
  const showTimer = alert.priority === 'CRITIQUE' || alert.priority === 'HAUTE';
  const depuis = showTimer ? formatDepuis(alert.createdAt) : null;
  const role = ariaRole ?? (alert.priority === 'CRITIQUE' ? 'alert' : 'listitem');
  const hasAction = typeof onAction === 'function' && !!actionLabel;

  return (
    <article
      role={role}
      data-testid="alert-card"
      data-priority={alert.priority}
      className="pressable"
      style={{
        background: 'var(--bg-surface, #ffffff)',
        border: '1px solid var(--line, #e5e7eb)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: visual.background,
            color: visual.color,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading, inherit)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--ink, #111827)',
              margin: 0,
              letterSpacing: '-0.005em',
              lineHeight: 1.3,
            }}
          >
            {alert.title}
          </h3>
          {alert.message && (
            <p
              style={{
                fontFamily: 'var(--font-body, inherit)',
                fontSize: 13,
                color: 'var(--ink-soft, #4b5563)',
                lineHeight: 1.5,
                margin: '4px 0 0',
              }}
            >
              {alert.message}
            </p>
          )}
        </div>
      </header>

      {depuis && (
        <div
          style={{
            fontFamily: 'var(--font-mono, inherit)',
            fontSize: 10,
            color: 'var(--muted, #6b7280)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {depuis}
        </div>
      )}

      <footer style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          aria-label="Acquitter cette alerte"
          data-testid="alert-card-ack"
          onClick={() => onAcknowledge(alert.id)}
          className="pressable"
          style={{
            flex: 1,
            minHeight: 44,
            padding: '10px 14px',
            borderRadius: 'var(--radius-pill, 999px)',
            background: 'var(--color-accent-500, #064e3b)',
            color: 'var(--bg-surface, #ffffff)',
            border: 'none',
            fontFamily: 'var(--font-mono, inherit)',
            fontSize: 12,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Check size={14} aria-hidden="true" />
          OK
        </button>
        {hasAction && (
          <button
            type="button"
            data-testid="alert-card-action"
            onClick={onAction}
            className="pressable"
            style={{
              flex: 1,
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 'var(--radius-pill, 999px)',
              background: 'var(--bg-surface, #ffffff)',
              color: 'var(--ink, #111827)',
              border: '1.5px solid var(--line, #e5e7eb)',
              fontFamily: 'var(--font-mono, inherit)',
              fontSize: 12,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {actionLabel}
          </button>
        )}
      </footer>
    </article>
  );
};

export default AlertCard;
