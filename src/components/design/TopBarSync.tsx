import React from 'react';
import { Sparkles } from 'lucide-react';

export interface TopBarSyncProps {
  crumbs: string[];
  lastSyncMinutes?: number;
  onMariusClick?: () => void;
  className?: string;
}

/**
 * Barre supérieure desktop : breadcrumb (gauche, DMMono 11px) ·
 * statut sync au centre (dot pulse-green) · pilule Marius à droite
 * (Instrument Sans 12px, fond amber-pork).
 */
export default function TopBarSync({
  crumbs,
  lastSyncMinutes,
  onMariusClick,
  className = '',
}: TopBarSyncProps) {
  const syncLabel =
    typeof lastSyncMinutes === 'number'
      ? lastSyncMinutes <= 0
        ? 'Synchronisé · à l’instant'
        : `Synchronisé · il y a ${lastSyncMinutes} min`
      : 'Synchronisé';

  return (
    <div
      role="navigation"
      aria-label="Fil d'ariane"
      className={className}
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--line)',
        padding: '12px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: 'DMMono, ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.04em',
      }}
    >
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          listStyle: 'none',
          margin: 0,
          padding: 0,
          minWidth: 0,
          flexShrink: 1,
        }}
      >
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${i}-${crumb}`}>
              <li
                style={{
                  color: isLast ? 'var(--ink)' : 'var(--muted)',
                  fontWeight: isLast ? 500 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {crumb}
              </li>
              {!isLast ? (
                <li
                  aria-hidden
                  style={{ color: 'var(--muted)', opacity: 0.4 }}
                >
                  /
                </li>
              ) : null}
            </React.Fragment>
          );
        })}
      </ol>

      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <span
          aria-live="polite"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            color: 'var(--color-accent-500)',
          }}
        >
          <span
            aria-hidden
            className="pulse-green"
            style={{
              width: 7,
              height: 7,
              background: 'var(--color-accent-500)',
              borderRadius: '50%',
              display: 'inline-block',
            }}
          />
          {syncLabel}
        </span>

        {onMariusClick ? (
          <button
            type="button"
            onClick={onMariusClick}
            aria-label="Ouvrir Marius"
            style={{
              background: 'var(--color-amber-pork)',
              color: 'var(--ink)',
              padding: '6px 12px',
              borderRadius: 9999,
              fontFamily: 'InstrumentSans, system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              border: 'none',
              transition: 'transform 160ms var(--ease-emil)',
            }}
            className="pressable"
          >
            <Sparkles size={13} aria-hidden="true" />
            Marius
          </button>
        ) : null}
      </div>
    </div>
  );
}
