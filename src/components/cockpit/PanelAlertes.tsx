import React from 'react';
import type { AlertPriority } from '../../services/alertEngine';
import { ALERT_PRIORITY_COLOR as ALERT_DOT_COLOR } from '../../utils/alertColors';
import { panelStyle, panelHeadStyle, panelTitleStyle, panelLinkStyle, panelBodyStyle } from './panelStyles';

export interface PanelAlerteRow {
  id: string;
  title: string;
  message?: string;
  priority: AlertPriority;
}

interface PanelAlertesProps {
  alerts: PanelAlerteRow[];
  onSeeAll: () => void;
}

const PanelAlertes: React.FC<PanelAlertesProps> = ({ alerts, onSeeAll }) => {
  return (
    <div style={panelStyle}>
      <div style={panelHeadStyle}>
        <div style={panelTitleStyle}>Alertes du jour</div>
        <button type="button" onClick={onSeeAll} style={panelLinkStyle}>
          Voir tout →
        </button>
      </div>
      <div style={panelBodyStyle}>
        {alerts.length === 0 ? (
          <p
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Aucune alerte aujourd’hui.
          </p>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '8px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--line-2)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: ALERT_DOT_COLOR[a.priority],
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--ink)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <strong style={{ fontWeight: 600 }}>{a.title}</strong>
                {a.message ? (
                  <span style={{ color: 'var(--muted)' }}> · {a.message}</span>
                ) : null}
              </span>
              <span
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 9.5,
                  color: 'var(--muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {a.priority}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PanelAlertes;
