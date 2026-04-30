import React from 'react';
import Sparkline from './Sparkline';

type Variant = 'default' | 'accent';
type TrendDir = 'up' | 'down' | 'neutral';

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendDir?: TrendDir;
  spark?: number[];
  variant?: Variant;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
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
  variant = 'default',
  onClick,
  className = '',
  ariaLabel,
}: KpiCardProps) {
  const isAccent = variant === 'accent';

  const trendColor = isAccent
    ? 'var(--color-amber-pork-soft)'
    : trendDir === 'down'
      ? 'var(--color-amber-pork-deep)'
      : 'var(--color-accent-500)';

  const sparkColor = isAccent
    ? 'rgba(252, 228, 201, 0.8)'
    : trendDir === 'down'
      ? 'var(--color-amber-pork-deep)'
      : 'var(--color-accent-500)';

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
    color: isAccent ? 'var(--bg-surface)' : 'var(--ink)',
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

  const sparkStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 8,
    right: 10,
    width: 56,
    height: 22,
    pointerEvents: 'none',
  };

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel ?? `${label} ${value}${unit ?? ''}`}
      className={`pressable ${className}`}
      style={containerStyle}
    >
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>
        {value}
        {unit ? <small style={unitStyle}>{unit}</small> : null}
      </div>
      {trend ? <div style={trendStyle}>{trend}</div> : null}
      {spark && spark.length >= 2 ? (
        <div style={sparkStyle}>
          <Sparkline
            points={spark}
            width={56}
            height={22}
            stroke={sparkColor}
            strokeWidth={1.5}
          />
        </div>
      ) : null}
    </Tag>
  );
}
