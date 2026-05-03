/**
 * CohortTimeline — frise horizontale 7 phases d'une bande.
 *
 * Tokens v6 PorcTrack : var(--phase-X) / var(--phase-X-soft),
 * var(--bg-surface), var(--ink), var(--muted), var(--font-heading),
 * var(--radius-card), var(--line).
 *
 * Le curseur AUJ. est calé sur la phase courante avec un overlay de progression.
 * Responsive : <640px masque les durées, ne garde que le label phase.
 */

import React from 'react';
import type { Phase } from './PhaseBadge';

interface Stats {
  heads: number;
  weight: number;
  ic: number;
}

interface Props {
  bandId: string;
  bandName: string;
  bandSub?: string;
  stats: Stats;
  currentPhase: Phase;
  currentDay: number;
  /** 0..1 — fraction de la phase courante déjà écoulée */
  phaseProgress: number;
}

const PHASES: { key: Phase; label: string; days: number; widthPct: number }[] = [
  { key: 'repro',  label: 'Repro',      days: 115, widthPct: 30 },
  { key: 'mater',  label: 'M.bas',      days: 1,   widthPct: 4  },
  { key: 'sevr',   label: 'Allait.',    days: 28,  widthPct: 9  },
  { key: 'crois',  label: 'Démarrage',  days: 35,  widthPct: 11 },
  { key: 'engr',   label: 'Croissance', days: 42,  widthPct: 14 },
  { key: 'finit',  label: 'Engrais.',   days: 42,  widthPct: 14 },
  { key: 'sortie', label: 'Finition',   days: 28,  widthPct: 18 },
];

type SegState = 'done' | 'current' | 'future';

function classifySeg(phase: Phase, current: Phase): SegState {
  const idx = PHASES.findIndex((p) => p.key === phase);
  const cur = PHASES.findIndex((p) => p.key === current);
  if (idx < cur) return 'done';
  if (idx === cur) return 'current';
  return 'future';
}

function nowOffset(currentPhase: Phase, progress: number): string {
  let acc = 0;
  const clamped = Math.max(0, Math.min(1, progress));
  for (const p of PHASES) {
    if (p.key === currentPhase) {
      return `calc(${acc}% + (${p.widthPct}% * ${clamped.toFixed(3)}))`;
    }
    acc += p.widthPct;
  }
  return '50%';
}

function segBackground(phase: Phase, state: SegState, progress: number): string {
  const full = `var(--phase-${phase})`;
  const soft = `var(--phase-${phase}-soft)`;
  if (state === 'done') return full;
  if (state === 'future') return soft;
  // current : barre soft + overlay full proportionnel
  const pct = Math.max(0, Math.min(100, progress * 100)).toFixed(1);
  return `linear-gradient(to right, ${full} 0%, ${full} ${pct}%, ${soft} ${pct}%, ${soft} 100%)`;
}

export const CohortTimeline: React.FC<Props> = ({
  bandId,
  bandName,
  bandSub,
  stats,
  currentPhase,
  currentDay,
  phaseProgress,
}) => {
  const nowLeft = nowOffset(currentPhase, phaseProgress);
  const dayLabel = `AUJ. J+${currentDay}`;

  return (
    <section
      aria-label={`Timeline de la bande ${bandId}`}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-card)',
        padding: 24,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 4px 12px rgba(17,24,39,0.04)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 36,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
            }}
          >
            {bandId}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
                lineHeight: 1.2,
              }}
            >
              {bandName}
            </div>
            {bandSub && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--muted)',
                  marginTop: 4,
                }}
              >
                {bandSub}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <Stat value={String(stats.heads)} label="Têtes vivantes" />
          <Stat value={String(stats.weight)} unit="kg" label="Poids moyen" />
          <Stat value={stats.ic.toFixed(2).replace('.', ',')} label="IC cumulé" />
        </div>
      </header>

      <div style={{ position: 'relative', paddingTop: 32, paddingBottom: 36 }}>
        {/* Track */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: 14,
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--line-2, rgba(17,24,39,0.05))',
          }}
        >
          {PHASES.map((p) => {
            const state = classifySeg(p.key, currentPhase);
            return (
              <div
                key={p.key}
                aria-label={`Phase ${p.label}, ${state}`}
                style={{
                  width: `${p.widthPct}%`,
                  height: '100%',
                  background: segBackground(p.key, state, phaseProgress),
                  opacity: state === 'done' ? 0.3 : 1,
                  transition: 'opacity 200ms ease',
                }}
              />
            );
          })}
        </div>

        {/* Curseur AUJ. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 32,
            left: nowLeft,
            transform: 'translate(-50%, -50%)',
            marginTop: 7,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '2px solid var(--ink)',
            boxShadow: '0 2px 6px rgba(17,24,39,0.18)',
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: nowLeft,
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
            background: 'var(--bg-surface)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--line)',
            whiteSpace: 'nowrap',
          }}
        >
          {dayLabel}
        </div>

        {/* Labels phases */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            position: 'absolute',
            bottom: 0,
            left: 0,
          }}
        >
          {PHASES.map((p) => (
            <div
              key={p.key}
              style={{
                width: `${p.widthPct}%`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                paddingTop: 10,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {p.label}
              </span>
              <span
                className="cohort-days"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--muted)',
                  letterSpacing: '0.04em',
                }}
              >
                {p.days} j
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cohort-days { display: none; }
        }
      `}</style>
    </section>
  );
};

const Stat: React.FC<{ value: string; label: string; unit?: string }> = ({
  value,
  label,
  unit,
}) => (
  <div style={{ textAlign: 'right' }}>
    <div
      style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 22,
        fontWeight: 700,
        lineHeight: 1,
        color: 'var(--ink)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
      {unit && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--muted)',
            marginLeft: 2,
          }}
        >
          {unit}
        </span>
      )}
    </div>
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--muted)',
        marginTop: 4,
      }}
    >
      {label}
    </div>
  </div>
);

export default CohortTimeline;
