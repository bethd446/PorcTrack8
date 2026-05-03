import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import SyncIndicator from './SyncIndicator';
import { useSyncState } from '../../hooks/useSyncState';

export type Crumb = string | { label: string; href?: string };

export interface TopBarSyncProps {
  crumbs: Crumb[];
  onMariusClick?: () => void;
  className?: string;
}

const crumbLabel = (c: Crumb): string => (typeof c === 'string' ? c : c.label);
const crumbHref = (c: Crumb): string | undefined =>
  typeof c === 'string' ? undefined : c.href;

/**
 * Barre supérieure desktop : breadcrumb (gauche, DMMono 11px) +
 * pilule Marius à droite (Instrument Sans 12px, fond amber-pork).
 * Le statut sync historique a été retiré (Vague 3) — plus aucune notion
 * de synchronisation visible côté UI, toutes les écritures passent par
 * supabaseWrites.ts.
 *
 * @deprecated Le mini-indicateur sync interne s'appuie sur `useSyncState` legacy.
 * Préférer `SyncStatusBadge` (RT2) basé sur `useOfflineQueue` pour les nouvelles
 * vues. Migration globale différée (~25 consumers).
 */
export default function TopBarSync({
  crumbs,
  onMariusClick,
  className = '',
}: TopBarSyncProps) {
  const syncState = useSyncState();
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
          const label = crumbLabel(crumb);
          const href = crumbHref(crumb);
          const itemStyle: React.CSSProperties = {
            color: isLast ? 'var(--ink)' : 'var(--muted)',
            fontWeight: isLast ? 500 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          };
          return (
            <React.Fragment key={`${i}-${label}`}>
              <li style={itemStyle}>
                {!isLast && href ? (
                  <Link
                    to={href}
                    style={{
                      color: 'inherit',
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.textDecoration = 'underline')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.textDecoration = 'none')
                    }
                  >
                    {label}
                  </Link>
                ) : (
                  label
                )}
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

      <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 14 }}>
        <SyncIndicator state={syncState} />
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
              fontFamily: 'var(--font-body)',
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
