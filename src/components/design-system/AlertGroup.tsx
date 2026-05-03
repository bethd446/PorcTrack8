import React from 'react';

import Tag from './Tag';
import Button from './Button';
import { useNoUUID } from '../../lib/uuidGuard';

export type AlertSeverity = 'urgent' | 'surveil';

export interface AlertGroupProps {
  /** Icône (emoji string ou ReactNode lucide). Rendue dans une boîte 36×36. */
  icon: React.ReactNode;
  /** Titre principal Big Shoulders (ex : "Stocks véto en rupture"). */
  title: string;
  /** Sous-titre muted (ex : "3 produits à recommander"). */
  subtitle: string;
  /** Sévérité — pilote la bordure gauche et la pill droite. */
  severity: AlertSeverity;
  /** Compteur optionnel affiché dans la pill de droite. */
  count?: number;
  /** Action principale (ex : "VOIR LE STOCK"). Right-aligned en footer. */
  action?: { label: string; onClick: () => void };
  /** Lignes internes (AlertRow). */
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const SEVERITY_BORDER: Record<AlertSeverity, string> = {
  urgent: 'var(--pt-danger)',
  surveil: 'var(--pt-accent)',
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  urgent: 'Urgent',
  surveil: 'Surveil.',
};

const SEVERITY_TAG_VARIANT: Record<AlertSeverity, 'primary' | 'accent'> = {
  urgent: 'primary',
  surveil: 'accent',
};

const SEVERITY_TAG_BG: Record<AlertSeverity, string> = {
  urgent: 'var(--pt-danger)',
  surveil: 'var(--pt-accent-pill)',
};

/**
 * AlertGroup V31 — carte regroupant N alertes liées (ex : ruptures véto).
 *
 * Layout :
 *   - Card crème avec bordure GAUCHE 4px colorée selon `severity`
 *   - Header : icon + title (Big Shoulders) + subtitle (muted) + Tag pill droite
 *   - Children (AlertRow) séparés par fines lignes 1px var(--pt-divider)
 *   - Footer optionnel : action button right-aligned
 *
 * Tokens stricts --pt-* (zéro hex hardcodé).
 */
const AlertGroup: React.FC<AlertGroupProps> = ({
  icon,
  title,
  subtitle,
  severity,
  count,
  action,
  children,
  className,
  style,
}) => {
  // V31 — détection dev des UUIDs leakés dans title/subtitle (silencieux en prod).
  useNoUUID(title, 'AlertGroup.title');
  useNoUUID(subtitle, 'AlertGroup.subtitle');

  return (
    <section
      className={className}
      data-pt="alert-group"
      data-severity={severity}
      style={{
        position: 'relative',
        background: 'var(--pt-surface)',
        borderRadius: 'var(--pt-radius-lg)',
        boxShadow: 'var(--pt-shadow-card)',
        borderLeft: `4px solid ${SEVERITY_BORDER[severity]}`,
        padding: 'var(--pt-space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--pt-space-4)',
        ...style,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--pt-space-3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--pt-space-3)',
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: 'var(--pt-surface-alt)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
              color: SEVERITY_BORDER[severity],
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--pt-font-display)',
                fontSize: 20,
                lineHeight: 1.1,
                fontWeight: 700,
                color: 'var(--pt-text)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
            <div
              style={{
                marginTop: 4,
                fontFamily: 'var(--pt-font-body)',
                fontSize: 13,
                color: 'var(--pt-text-muted)',
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
        <Tag
          variant={SEVERITY_TAG_VARIANT[severity]}
          style={{
            background: SEVERITY_TAG_BG[severity],
            color: severity === 'urgent' ? 'var(--pt-primary-text)' : 'var(--pt-text)',
            flexShrink: 0,
          }}
        >
          {count !== undefined ? `${count} · ${SEVERITY_LABEL[severity]}` : SEVERITY_LABEL[severity]}
        </Tag>
      </header>

      {/* Rows */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
        data-pt="alert-group-rows"
      >
        {children}
      </div>

      {/* Footer action */}
      {action ? (
        <footer
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: 'var(--pt-space-2)',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            style={{ color: 'var(--pt-primary)' }}
          >
            {action.label} →
          </Button>
        </footer>
      ) : null}
    </section>
  );
};

export default AlertGroup;
