import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { panelStyle, panelHeadStyle, panelTitleStyle, panelLinkStyle, panelBodyStyle } from './panelStyles';

export interface AgendaItem {
  id: string;
  label: string;
  daysFromNow: number;
  kind: 'MB' | 'SEV' | 'RETOUR' | 'ALERTE';
}

const DAY_MS = 86_400_000;

interface PanelCalendrierProps {
  items: AgendaItem[];
  onSeeAll: () => void;
}

const TAG_STYLE: Record<AgendaItem['kind'], React.CSSProperties> = {
  MB: {
    background: 'var(--color-accent-100)',
    color: 'var(--color-accent-600)',
  },
  SEV: {
    background: 'var(--color-info, #3B82F6)',
    color: 'var(--bg-surface)',
    opacity: 0.9,
  },
  RETOUR: {
    background: 'var(--amber-pork-soft)',
    color: 'var(--amber-pork-deep)',
  },
  ALERTE: {
    background: 'var(--bg-app, var(--bg-surface-2))',
    color: 'var(--muted)',
    border: '0.5px solid var(--line)',
  },
};

const TAG_LABEL: Record<AgendaItem['kind'], string> = {
  MB: 'MB',
  SEV: 'SEV',
  RETOUR: 'RTC',
  ALERTE: 'ALR',
};

const PanelCalendrier: React.FC<PanelCalendrierProps> = ({ items, onSeeAll }) => {
  const nowMs = useMemo(() => Date.now(), [items]);
  return (
    <div style={panelStyle}>
      <div style={panelHeadStyle}>
        <div style={{ ...panelTitleStyle, display: 'flex', gap: 8, alignItems: 'center' }}>
          <CalendarDays size={12} aria-hidden="true" />
          Calendrier 7 jours
        </div>
        <button type="button" onClick={onSeeAll} style={panelLinkStyle}>
          Voir tout →
        </button>
      </div>
      <div style={panelBodyStyle}>
        {items.length === 0 ? (
          <p
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Aucun événement dans les 7 prochains jours.
          </p>
        ) : (
          items.map((item) => {
            const dt = new Date(nowMs + item.daysFromNow * DAY_MS);
            const dateLabel = dt.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            });
            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '42px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: '1px solid var(--line-2)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 9.5,
                    letterSpacing: '0.04em',
                    padding: '4px 6px',
                    borderRadius: 4,
                    textAlign: 'center',
                    fontWeight: 500,
                    ...TAG_STYLE[item.kind],
                  }}
                >
                  {TAG_LABEL[item.kind]}
                </span>
                <span
                  style={{
                    fontFamily: 'BigShoulders, system-ui, sans-serif',
                    fontSize: 14,
                    color: 'var(--ink)',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                  <small
                    style={{
                      display: 'block',
                      fontFamily: 'InstrumentSans, system-ui, sans-serif',
                      fontSize: 11,
                      color: 'var(--muted)',
                      marginTop: 1,
                      fontWeight: 400,
                    }}
                  >
                    {item.daysFromNow === 0
                      ? "Aujourd'hui"
                      : item.daysFromNow === 1
                        ? 'Demain'
                        : `Dans ${item.daysFromNow}j`}
                  </small>
                </span>
                <span
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 10,
                    color: 'var(--muted)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {dateLabel}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PanelCalendrier;
