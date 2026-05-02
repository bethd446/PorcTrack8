import React from 'react';
import { Check } from 'lucide-react';

export interface ReproStage {
  day: number | string;
  label: string;
  state: 'passed' | 'current' | 'future';
  position?: number;
}

interface ReproTrackerProps {
  stages: ReproStage[];
  progressPct: number;
  className?: string;
}

export default function ReproTracker({ stages, progressPct, className = '' }: ReproTrackerProps) {
  const clamped = Math.max(0, Math.min(100, progressPct));

  return (
    <div className={className} style={{ position: 'relative', padding: '8px 0 36px' }}>
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
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: stage.state === 'current' ? 'var(--amber-pork-deep)' : 'var(--muted)',
                textAlign: 'center',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                fontWeight: stage.state === 'current' ? 600 : 500,
              }}
            >
              {stage.label}
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
