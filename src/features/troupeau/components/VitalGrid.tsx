/**
 * VitalGrid — grille KPI "Vitales" partagée
 * ════════════════════════════════════════════════════════════════════════════
 * Factorisation du pattern sow-vitals de TruieDetailView (V81 Sprint 8).
 * API minimale : items[] + className optionnel.
 *
 * Comportement vide : opacité 0.4 + cursor help + title/aria-label auto.
 */

import React from 'react';

export interface VitalItem {
  label: string;
  value: React.ReactNode;
  valColor?: string;
  /** Texte secondaire affiché en haut à droite de la cellule (ex: date, compteur) */
  trend?: React.ReactNode;
  /** Unité affichée en petit après la valeur (ex: "kg") */
  unit?: string;
  /** Tooltip sur valeur vide. Défaut : "Donnée non disponible." */
  emptyHint?: string;
}

const DEFAULT_EMPTY_HINT = 'Donnée non disponible.';

function isEmpty(value: React.ReactNode): boolean {
  return value === '—' || value == null || value === '';
}

export const VitalGrid: React.FC<{
  items: VitalItem[];
  className?: string;
}> = ({ items, className }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        background: 'var(--pt-bg)',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--pt-line)',
      }}
      className={`sow-vitals${className ? ` ${className}` : ''}`}
    >
      {items.map((v, i) => {
        const empty = isEmpty(v.value);
        const hint = v.emptyHint ?? DEFAULT_EMPTY_HINT;
        return (
          <div
            key={v.label}
            style={{
              padding: '14px 16px',
              background: 'var(--pt-bg)',
              borderRight: i < items.length - 1 ? '1px solid var(--pt-line)' : 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--pt-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <span>{v.label}</span>
              {v.trend && (
                <span style={{ color: 'var(--pt-primary)' }}>{v.trend}</span>
              )}
            </div>
            <div
              title={empty ? hint : undefined}
              aria-label={empty ? `${v.label} non disponible` : undefined}
              style={{
                fontFamily: 'var(--pt-font-display)',
                fontSize: 22,
                lineHeight: 1,
                color: v.valColor,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                opacity: empty ? 0.4 : 1,
                cursor: empty ? 'help' : 'default',
              }}
            >
              {v.value}
              {v.unit && (
                <small
                  style={{
                    fontSize: 13,
                    color: 'var(--pt-muted)',
                    marginLeft: 2,
                    fontWeight: 400,
                  }}
                >
                  {' '}
                  {v.unit}
                </small>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
