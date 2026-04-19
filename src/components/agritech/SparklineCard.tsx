import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { cn } from '../../lib/utils';

export type SparklineTone = 'default' | 'accent' | 'amber' | 'red' | 'blue' | 'gold';

export interface SparklinePoint {
  x: string | number;
  y: number;
}

export interface SparklineCardProps {
  /** Label en uppercase mono (ex. "MB MENSUELLES"). */
  label: string;
  /** Valeur principale (chiffre ou string formaté). */
  value: string | number;
  /** Suffixe unité (ex. "portées", "%", "j"). */
  unit?: string;
  /** Série de points pour la mini-courbe. */
  data: SparklinePoint[];
  /** Delta en % vs période précédente (signé). 0 ou undefined → pas de chip. */
  delta?: number;
  /** Couleur de l'accent (stroke du sparkline + bordure hover). */
  tone?: SparklineTone;
  /** Icône optionnelle affichée à gauche du label. */
  icon?: React.ReactNode;
  /** Clic sur la carte → interactive (button). */
  onClick?: () => void;
  /** Extra classes pour composition. */
  className?: string;
}

/**
 * Mini-graph card (sparkline) réutilisable pour les dashboards v2.
 * Structure : label + delta en haut, gros chiffre + unit au milieu,
 * courbe compacte (40-50px) en bas. Pas d'axes, stroke coloré selon tone.
 *
 * @example
 * ```tsx
 * <SparklineCard
 *   label="MB mensuelles"
 *   value={12}
 *   unit="portées"
 *   data={[{x:'Jan',y:8},{x:'Feb',y:10},{x:'Mar',y:12}]}
 *   delta={+20}
 *   tone="accent"
 * />
 * ```
 */
const TONE_VAR: Record<SparklineTone, string> = {
  default: 'var(--color-text-1)',
  accent: 'var(--color-accent)',
  amber: 'var(--color-amber)',
  red: 'var(--color-red)',
  blue: 'var(--color-blue)',
  gold: 'var(--color-gold)',
};

const TONE_BORDER: Record<SparklineTone, string> = {
  default: 'hover:border-text-1/40',
  accent: 'hover:border-accent/50',
  amber: 'hover:border-amber/50',
  red: 'hover:border-red/50',
  blue: 'hover:border-blue/50',
  gold: 'hover:border-gold/50',
};

const SparklineCard: React.FC<SparklineCardProps> = ({
  label,
  value,
  unit,
  data,
  delta,
  tone = 'default',
  icon,
  onClick,
  className,
}) => {
  const interactive = typeof onClick === 'function';
  const hasDelta = typeof delta === 'number' && delta !== 0;
  const deltaUp = (delta ?? 0) > 0;
  const deltaAbs = hasDelta ? Math.abs(delta as number) : 0;

  // Normalise les données pour Recharts (garantit au moins un point).
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [{ x: 0, y: 0 }];
    return data;
  }, [data]);

  const strokeColor = TONE_VAR[tone];

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon ? (
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-text-2"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <span className="kpi-v2-label truncate">{label}</span>
      </div>
      {hasDelta ? (
        <span
          className={cn(
            'shrink-0 font-mono text-[11px] font-medium tabular-nums',
            'rounded-full px-1.5 py-[1px] border',
            deltaUp
              ? 'text-accent border-accent/30 bg-accent/5'
              : 'text-red border-red/30 bg-red/5'
          )}
          aria-label={`Variation ${deltaUp ? 'positive' : 'négative'} de ${deltaAbs} pour cent`}
        >
          {deltaUp ? '+' : '-'}
          {deltaAbs}%
        </span>
      ) : null}
    </div>
  );

  const body = (
    <div className="mt-3 flex items-baseline gap-1.5">
      <span className="kpi-v2-value">{value}</span>
      {unit ? (
        <span
          className="font-mono text-[12px] text-text-2 uppercase tracking-wide"
          style={{ fontSize: 'var(--text-body-sm)' }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );

  const chart = (
    <div className="mt-3 h-[44px] w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          {/* Y axis cachée mais utilisée pour scale correct */}
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="y"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const content = (
    <>
      {header}
      {body}
      {chart}
    </>
  );

  const baseClasses = cn(
    'card-v2 p-4 flex flex-col w-full',
    TONE_BORDER[tone],
    className
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label} ${value}${unit ? ` ${unit}` : ''}`}
        className={cn(
          baseClasses,
          'text-left',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
};

export default SparklineCard;
