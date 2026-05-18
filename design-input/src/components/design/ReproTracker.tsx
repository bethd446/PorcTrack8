import React from 'react';
import { Check } from 'lucide-react';

// Abréviations pour éviter le chevauchement des labels en mode horizontal
// (≥480px). v3.4.5+ "C" : labels reformulés en clair pour mobile vertical
// (verbes terrain) + abbrev resté pour le rendu horizontal compact.
const ABBREV: Record<string, string> = {
  'vérifier la truie': 'VÉRIF.',
  'verifier la truie': 'VÉRIF.',
  'surveiller chaleur': 'CHALEUR',
  'fenêtre retour chaleur': 'CHALEUR',
  'surveillance retour chaleur': 'CHALEUR',
  'retour chaleur': 'CHALEUR',
  'surveillance verrat': 'VÉRIF.',
  'échographie': 'ÉCHO',
  'echographie': 'ÉCHO',
  'mise-bas': 'M-BAS',
  'mise bas': 'M-BAS',
  'maternité': 'MATER.',
  'maternite': 'MATER.',
  'sevrage': 'SEVR.',
};

function abbrev(label: string): string {
  const key = label.toLowerCase().trim();
  return ABBREV[key] ?? label;
}

export interface ReproStage {
  day: number | string;
  /** Date calendaire (dd/MM) à afficher en sub-text. v3.4.5+ "C" */
  date?: string;
  label: string;
  state: 'passed' | 'current' | 'future';
  position?: number;
}

interface ReproTrackerProps {
  stages: ReproStage[];
  progressPct: number;
  className?: string;
}

// v3.6.0 — Jauge de progression (option A refonte) : affichage explicite
// "Gestation · J{n}/115 · {pct}%" avec barre visuelle. L'éleveur voit
// immédiatement où il en est dans le cycle plutôt que d'inférer depuis
// les markers ✓/○ des étapes.
function ProgressGauge({ clamped }: { clamped: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progression gestation ${Math.round(clamped)}%`}
      style={{
        marginBottom: 14,
        padding: '10px 12px',
        background: 'var(--pt-warm, #F1ECE0)',
        border: '1px solid var(--pt-line, rgba(26,26,26,0.08))',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--pt-muted, #6b6357)',
        }}
      >
        <span>Gestation</span>
        <span style={{ color: 'var(--pt-ink, #1a1a1a)', fontWeight: 700 }}>
          {Math.round(clamped)}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: 'rgba(26,26,26,0.08)',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${clamped}%`,
            background: clamped >= 95 ? 'var(--amber-pork-deep, #c2662b)' : 'var(--pt-primary, #2D4A1F)',
            borderRadius: 3,
            transition: 'width 320ms var(--ease-emil, ease-out)',
          }}
        />
      </div>
    </div>
  );
}

export default function ReproTracker({ stages, progressPct, className = '' }: ReproTrackerProps) {
  const clamped = Math.max(0, Math.min(100, progressPct));
  const [isNarrow, setIsNarrow] = React.useState(
    typeof window !== 'undefined' && window.innerWidth < 480,
  );

  React.useEffect(() => {
    const handler = () => setIsNarrow(window.innerWidth < 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Mobile small (< 480px) : empilement vertical pour éviter le chevauchement
  // des labels lorsque plusieurs stages sont concentrés dans 0-30% du cycle.
  if (isNarrow) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
        <ProgressGauge clamped={clamped} />
        {stages.map((stage, i) => (
          <div
            key={`${stage.label}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 0',
              borderBottom: i < stages.length - 1 ? '1px solid var(--bg-app)' : 'none',
            }}
          >
            <Marker state={stage.state} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: stage.state === 'current' ? 'var(--amber-pork-deep)' : 'var(--ink)',
                  fontWeight: stage.state === 'current' ? 600 : 500,
                }}
              >
                {stage.label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                {typeof stage.day === 'number' ? `J${stage.day}` : stage.day}
                {stage.date ? ` · ${stage.date}` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <ProgressGauge clamped={clamped} />
      <div style={{ position: 'relative', padding: '8px 0 36px' }}>
      <div
        style={{
          height: 3,
          background: 'var(--bg-app)',
          borderRadius: 2,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            background: 'var(--ink)',
            borderRadius: 2,
            width: '100%',
            transform: `scaleX(${clamped / 100})`,
            transformOrigin: 'left',
            transition: 'transform 240ms var(--ease-emil)',
          }}
        />
      </div>

      {stages.map((stage, i) => {
        const left =
          stage.position !== undefined
            ? stage.position
            : stages.length > 1
              ? (i / (stages.length - 1)) * 100
              : 0;

        return (
          <div
            key={`${stage.label}-${i}`}
            style={{
              position: 'absolute',
              top: -8,
              left: `${left}%`,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Marker state={stage.state} />
            <div
              style={{
                marginTop: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: stage.state === 'current' ? 'var(--amber-pork-deep)' : 'var(--muted)',
                textAlign: 'center',
                lineHeight: 1.15,
                maxWidth: 60,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-word',
                fontWeight: stage.state === 'current' ? 600 : 500,
              }}
              title={stage.label}
            >
              {abbrev(stage.label)}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 12,
                color: 'var(--ink)',
                marginTop: 2,
                fontWeight: 600,
              }}
            >
              {typeof stage.day === 'number' ? `J${stage.day}` : stage.day}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function Marker({ state }: { state: ReproStage['state'] }) {
  if (state === 'passed') {
    return (
      <div
        aria-hidden
        style={{
          width: 19,
          height: 19,
          borderRadius: '50%',
          background: 'var(--ink)',
          border: '2px solid var(--ink)',
          color: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <Check size={10} strokeWidth={3} />
      </div>
    );
  }

  if (state === 'current') {
    return (
      <div
        aria-hidden
        className="pulse-amber"
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--amber-pork)',
          border: '2px solid var(--amber-pork-deep)',
          color: 'var(--ink)',
          marginTop: -3,
          boxShadow: '0 0 0 5px rgba(244, 162, 97, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          zIndex: 2,
        }}
      >
        !
      </div>
    );
  }

  return (
    <div
      aria-hidden
      style={{
        width: 19,
        height: 19,
        borderRadius: '50%',
        background: 'var(--bg-surface)',
        border: '2px solid var(--bg-app)',
        color: 'var(--muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        zIndex: 2,
      }}
    >
      ○
    </div>
  );
}
