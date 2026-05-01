import React from 'react';

type Variant = 'default' | 'accent';
type TrendDir = 'up' | 'down' | 'neutral';

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendDir?: TrendDir;
  /** 8-12 points pour un sparkline SVG inline */
  spark?: number[];
  /** Couleur du sparkline (sinon hérite de accentColor / trend) */
  sparkColor?: string;
  variant?: Variant;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  /**
   * Optional semantic accent — colors value, dot and border-left (3px).
   * Pass any CSS color (var or hex). Ignored when variant='accent'.
   */
  accentColor?: string;
}

function buildSparkPath(points: number[], w = 56, h = 22): string {
  if (!points.length) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  return points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * KpiCard v6 « Terrain Vivant ».
 * Card 14×16, radius 12, shadow-card, sparkline 56×22 en bas-droite.
 * Variant `accent` : fond accent-500, texte blanc.
 */
export default function KpiCard({
  label,
  value,
  unit,
  trend,
  trendDir = 'neutral',
  spark,
  sparkColor,
  variant = 'default',
  onClick,
  className = '',
  ariaLabel,
  accentColor,
}: KpiCardProps) {
  const isAccent = variant === 'accent';
  const hasTone = !isAccent && Boolean(accentColor);

  const trendColor = isAccent
    ? 'var(--color-amber-pork-soft)'
    : trendDir === 'down'
      ? 'var(--color-amber-pork-deep)'
      : 'var(--color-accent-500)';

  const resolvedSparkColor =
    sparkColor ??
    (isAccent
      ? 'rgba(252, 228, 201, 0.8)'
      : hasTone
        ? accentColor
        : trendDir === 'down'
          ? 'var(--color-amber-pork-deep)'
          : 'var(--color-accent-500)');

  const containerStyle: React.CSSProperties = {
    background: isAccent ? 'var(--color-accent-500)' : 'var(--bg-surface)',
    color: isAccent ? 'var(--bg-surface)' : 'var(--ink)',
    padding: '14px 16px',
    borderRadius: 12,
    boxShadow:
      '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.06)',
    position: 'relative',
    overflow: 'hidden',
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    borderLeft: hasTone ? `3px solid ${accentColor}` : 'none',
    cursor: onClick ? 'pointer' : 'default',
    transition:
      'transform 160ms var(--ease-emil), box-shadow 200ms var(--ease-emil)',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'DMMono, ui-monospace, monospace',
    fontSize: '9.5px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: isAccent ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
    fontWeight: 500,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
    fontSize: 32,
    lineHeight: 1,
    fontWeight: 600,
    marginTop: 8,
    color: isAccent
      ? 'var(--bg-surface)'
      : hasTone
        ? accentColor
        : 'var(--ink)',
    letterSpacing: '-0.02em',
  };

  const unitStyle: React.CSSProperties = {
    fontSize: 16,
    color: isAccent ? 'rgba(255,255,255,0.6)' : 'var(--muted)',
    marginLeft: 2,
    fontWeight: 400,
  };

  const trendStyle: React.CSSProperties = {
    fontFamily: 'DMMono, ui-monospace, monospace',
    fontSize: 10,
    color: trendColor,
    marginTop: 6,
    letterSpacing: '0.04em',
  };

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel ?? `${label} ${value}${unit ?? ''}`}
      data-testid="kpi-card-v6"
      className={`pressable ${className}`}
      style={containerStyle}
    >
      <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
        {hasTone ? (
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: accentColor,
              flexShrink: 0,
            }}
          />
        ) : null}
        {label}
      </div>
      <div style={valueStyle}>
        {value}
        {unit ? <small style={unitStyle}>{unit}</small> : null}
      </div>
      {trend ? <div style={trendStyle}>{trend}</div> : null}
      {spark && spark.length >= 2 ? (
        <svg
          viewBox="0 0 56 22"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 12,
            bottom: 10,
            width: 56,
            height: 22,
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        >
          <path
            d={buildSparkPath(spark)}
            fill="none"
            stroke={resolvedSparkColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      ) : null}
    </Tag>
  );
}
