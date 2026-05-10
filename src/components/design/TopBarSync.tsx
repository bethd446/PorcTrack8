import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import SyncIndicator from './SyncIndicator';
import { useSyncState } from '../../hooks/useSyncState';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { Button } from '@/design-system';
import type { FarmRole } from '../../types/farm';

export type Crumb = string | { label: string; href?: string };

export interface TopBarSyncProps {
  crumbs: Crumb[];
  onMariusClick?: () => void;
  /** V40 T1 : pill Marius visible UNIQUEMENT si suggestion active.
   *  Default false — onMariusClick seul ne suffit plus à l'afficher. */
  mariusActive?: boolean;
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
const ROLE_PILL_STYLE: Record<FarmRole, { label: string; bg: string; fg: string }> = {
  OWNER:   { label: 'Owner',   bg: '#cce0bf',             fg: '#2d4a1f' },
  ADMIN:   { label: 'Admin',   bg: '#f4dcb6',             fg: '#6b4910' },
  PORCHER: { label: 'Porcher', bg: 'rgba(26,26,26,0.06)', fg: 'var(--ink, #1a1a1a)' },
};

/**
 * Safe accessor : ces deux contextes peuvent être absents dans des unit tests
 * legacy qui montent TopBarSync via un parent (LogeDetailView, BandeDetail)
 * en passthrough — sans wrapper Auth/FarmProvider. Dans ce cas, le badge
 * rôle/ferme s'auto-masque (return null) sans casser le test.
 */
function useFarmRoleBadge(): { nomFerme: string; currentRole: FarmRole } | null {
  let currentRole: FarmRole | null = null;
  let nomFerme = '';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- safe accessor : AuthProvider absent en tests legacy (cf. JSDoc)
    currentRole = useAuth().currentRole;
  } catch { /* AuthProvider absent en test */ }
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- safe accessor : FarmProvider absent en tests legacy (cf. JSDoc)
    nomFerme = useFarm().nomFerme;
  } catch { /* FarmProvider absent en test */ }
  if (!currentRole || !nomFerme) return null;
  return { currentRole, nomFerme };
}

export default function TopBarSync({
  crumbs,
  onMariusClick,
  mariusActive = false,
  className = '',
}: TopBarSyncProps) {
  const syncState = useSyncState();
  const badge = useFarmRoleBadge();
  const roleStyle = badge ? ROLE_PILL_STYLE[badge.currentRole] : null;
  const nomFerme = badge?.nomFerme;
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
        {roleStyle && nomFerme ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: 'var(--muted)',
              minWidth: 0,
            }}
            aria-label={`Ferme ${nomFerme} — rôle ${roleStyle.label}`}
          >
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 160,
              }}
            >
              {nomFerme}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: roleStyle.bg,
                color: roleStyle.fg,
                fontFamily: 'var(--font-body)',
              }}
            >
              {roleStyle.label}
            </span>
          </div>
        ) : null}
        <SyncIndicator state={syncState} />
        {onMariusClick && mariusActive ? (
          <Button
            type="button"
            variant="primary"
            size="small"
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
              textTransform: 'none',
              height: 'auto',
            }}
            className="pressable"
          >
            <Sparkles size={13} aria-hidden="true" />
            Marius
          </Button>
        ) : null}
      </div>
    </div>
  );
}
