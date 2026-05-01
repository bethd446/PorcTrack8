import React from 'react';
import { panelStyle, panelHeadStyle, panelTitleStyle, panelBodyStyle } from './panelStyles';

export interface PanelBandeRow {
  id: string;
  idPortee: string;
  statut?: string;
  nv?: number;
}

interface PanelBandesPerfProps {
  bandes: PanelBandeRow[];
  target: number;
}

const PanelBandesPerf: React.FC<PanelBandesPerfProps> = ({ bandes, target }) => {
  return (
    <div style={panelStyle}>
      <div style={panelHeadStyle}>
        <div style={panelTitleStyle}>Performance bandes · porcelets vivants</div>
      </div>
      <div style={panelBodyStyle}>
        {bandes.length === 0 ? (
          <p
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Aucune bande active avec des données NV pour l’instant.
          </p>
        ) : (
          <>
            {bandes.map((b) => {
              const nv = b.nv ?? 0;
              const pct = target > 0 ? Math.min(100, Math.round((nv / target) * 100)) : 0;
              return (
                <div
                  key={b.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '92px 1fr 50px',
                    gap: 12,
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'DMMono, ui-monospace, monospace',
                      fontSize: 10,
                      color: 'var(--muted)',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {b.idPortee}
                  </div>
                  <div
                    style={{
                      height: 18,
                      background: 'var(--color-accent-50)',
                      borderRadius: 4,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        background: 'var(--color-accent-500)',
                        borderRadius: 4,
                        width: '100%',
                        transform: `scaleX(${pct / 100})`,
                        transformOrigin: 'left',
                        transition: 'transform 240ms var(--ease-emil)',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
                      fontSize: 15,
                      color: 'var(--ink)',
                      textAlign: 'right',
                      fontWeight: 600,
                    }}
                  >
                    {nv}
                  </div>
                </div>
              );
            })}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '92px 1fr 50px',
                gap: 12,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 10,
                  color: 'var(--color-amber-pork-deep)',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                Cible
              </div>
              <div
                style={{
                  height: 18,
                  background: 'var(--color-accent-50)',
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    background: 'var(--color-amber-pork-soft)',
                    borderRadius: 4,
                    width: '100%',
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
                  fontSize: 15,
                  color: 'var(--color-amber-pork-deep)',
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                {target}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PanelBandesPerf;
