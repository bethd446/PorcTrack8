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
import { Button } from '@/design-system';

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
    color: 'var(--pt-danger)',
    background: 'var(--pt-surface-danger)',
    label: 'Critique',
  },
  HAUTE: {
    Icon: Bell,
    color: 'var(--pt-accent-deep)',
    background: 'var(--pt-surface-warning)',
    label: 'Haute',
  },
  NORMALE: {
    Icon: Info,
    color: 'var(--pt-accent)',
    background: 'var(--pt-surface-warm)',
    label: 'Normale',
  },
  INFO: {
    Icon: Info,
    color: 'var(--pt-text-muted)',
    background: 'var(--pt-surface-alt)',
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
        background: 'var(--pt-surface)',
        border: '1px solid var(--pt-divider)',
        borderRadius: 'var(--pt-radius-md)',
        boxShadow: 'var(--pt-shadow-card)',
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
              fontFamily: 'var(--pt-font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--pt-text)',
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
                fontFamily: 'var(--pt-font-body)',
                fontSize: 13,
                color: 'var(--pt-text-muted)',
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
            fontFamily: 'var(--pt-font-body)',
            fontSize: 10,
            color: 'var(--pt-text-subtle)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {depuis}
        </div>
      )}

      <footer style={{ display: 'flex', gap: 8 }}>
        <Button
          type="button"
          variant="primary"
          aria-label="Acquitter cette alerte"
          data-testid="alert-card-ack"
          onClick={() => onAcknowledge(alert.id)}
          className="pressable"
          style={{
            flex: 1,
            minHeight: 44,
            padding: '10px 14px',
            borderRadius: 'var(--pt-radius-pill)',
            background: 'var(--pt-primary)',
            color: 'var(--pt-primary-text)',
            border: 'none',
            fontFamily: 'var(--pt-font-body)',
            fontSize: 12,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 'auto',
          }}
        >
          <Check size={14} aria-hidden="true" />
          OK
        </Button>
        {hasAction && (
          <Button
            type="button"
            variant="secondary"
            data-testid="alert-card-action"
            onClick={onAction}
            className="pressable"
            style={{
              flex: 1,
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 'var(--pt-radius-pill)',
              background: 'var(--pt-surface)',
              color: 'var(--pt-text)',
              border: '1.5px solid var(--pt-divider)',
              fontFamily: 'var(--pt-font-body)',
              fontSize: 12,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
              height: 'auto',
            }}
          >
            {actionLabel}
          </Button>
        )}
      </footer>
    </article>
  );
};

export default AlertCard;
