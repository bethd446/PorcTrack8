import React from 'react';

type Variant = 'default' | 'accent';
type TrendDir = 'up' | 'down' | 'neutral';
type Polarity = 'higher-better' | 'lower-better' | 'neutral';
type AccentToken = 'accent' | 'amber' | 'pig' | 'muted' | 'info';
type Tone = 'success' | 'warning' | 'critical' | 'default';

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendDir?: TrendDir;
  polarity?: Polarity;
  spark?: number[];
  sparkColor?: string;
  variant?: Variant;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  accentColor?: AccentToken | string;
  tone?: Tone;
  /**
   * Petit message contextuel affiché sous la valeur (ex: "Pas assez de
   * données (1/5 cycles)"). N'apparaît que si fourni. Utile pour
   * remplacer un `—` muet par un fallback explicite.
   */
  hint?: string;
}

const ACCENT_VAR: Record<AccentToken, string> = {
  accent: 'var(--color-accent-500)',
  amber: 'var(--color-amber-pork-deep)',
  pig: 'var(--color-pig)',
  muted: 'var(--muted)',
  info: 'var(--color-info)',
};

function resolveAccent(
  accentColor?: AccentToken | string,
  tone?: Tone,
): { token: AccentToken; cssColor: string } {
  if (accentColor) {
    if (
      accentColor === 'accent' ||
      accentColor === 'amber' ||
      accentColor === 'pig' ||
      accentColor === 'muted' ||
      accentColor === 'info'
    ) {
      return { token: accentColor, cssColor: ACCENT_VAR[accentColor] };
    }
    const s = accentColor.toLowerCase();
    if (s.includes('accent')) return { token: 'accent', cssColor: ACCENT_VAR.accent };
    if (s.includes('amber')) return { token: 'amber', cssColor: ACCENT_VAR.amber };
    if (s.includes('pig')) return { token: 'pig', cssColor: ACCENT_VAR.pig };
    if (s.includes('muted')) return { token: 'muted', cssColor: ACCENT_VAR.muted };
    return { token: 'accent', cssColor: accentColor };
  }
  if (tone === 'success') return { token: 'accent', cssColor: ACCENT_VAR.accent };
  if (tone === 'warning') return { token: 'amber', cssColor: ACCENT_VAR.amber };
  if (tone === 'critical') return { token: 'pig', cssColor: ACCENT_VAR.pig };
  return { token: 'accent', cssColor: ACCENT_VAR.accent };
}

function resolveDeltaColor(
  trendDir: TrendDir,
  polarity: Polarity,
  isAccent: boolean,
): string {
  if (isAccent) return 'rgba(255,255,255,0.85)';
  if (trendDir === 'neutral' || polarity === 'neutral') return 'var(--muted)';
  const isGood =
    (trendDir === 'up' && polarity === 'higher-better') ||
    (trendDir === 'down' && polarity === 'lower-better');
  return isGood ? 'var(--color-accent-500)' : 'var(--color-pig)';
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

export default function KpiCard({
  label,
  value,
  unit,
  trend,
  trendDir = 'neutral',
  polarity = 'higher-better',
  spark,
  sparkColor,
  variant = 'default',
  onClick,
  className = '',
  ariaLabel,
  accentColor,
  tone,
  hint,
}: KpiCardProps) {
  const isAccent = variant === 'accent';
  const { cssColor: dotColor } = resolveAccent(accentColor, tone);

  const sparkOk = Array.isArray(spark) && spark.length >= 8;
  if (
    Array.isArray(spark) &&
    spark.length > 0 &&
    spark.length < 8 &&
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV !== 'production'
  ) {
     
    console.debug(
      `[KpiCard] sparkline ignoré (${spark.length} points < 8) — label="${label}"`,
    );
  }

  const deltaColor = resolveDeltaColor(trendDir, polarity, isAccent);

  const containerStyle: React.CSSProperties = {
    background: isAccent ? 'var(--color-accent-500)' : 'var(--bg-surface)',
    color: isAccent ? 'var(--bg-surface)' : 'var(--ink)',
    padding: '20px',
    borderRadius: 'var(--radius-card, 14px)',
    border: isAccent ? '1px solid var(--color-accent-500)' : '1px solid var(--line)',
    position: 'relative',
    overflow: 'hidden',
    display: 'block',
    width: '100%',
    textAlign: 'left',
    cursor: onClick ? 'pointer' : 'default',
    transition:
      'transform 160ms var(--ease-emil), box-shadow 200ms var(--ease-emil)',
  };

  const eyebrowStyle: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    color: isAccent ? 'rgba(255,255,255,0.75)' : 'var(--muted)',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const dotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: isAccent ? 'rgba(255,255,255,0.9)' : dotColor,
    flexShrink: 0,
  };

  const valueRowStyle: React.CSSProperties = {
    marginTop: 10,
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: 'var(--font-heading)',
    fontSize: 32,
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: isAccent ? 'var(--bg-surface)' : 'var(--ink)',
  };

  const unitStyle: React.CSSProperties = {
    fontFamily: 'var(--font-heading)',
    fontSize: 16,
    fontWeight: 500,
    color: isAccent ? 'rgba(255,255,255,0.75)' : 'var(--muted)',
  };

  const trendStyle: React.CSSProperties = {
    fontSize: 11,
    color: deltaColor,
    marginTop: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
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
      <div style={eyebrowStyle}>
        <span aria-hidden="true" style={dotStyle} />
        {label}
      </div>
      <div style={valueRowStyle}>
        <span
          style={{
            ...valueStyle,
            opacity: value === '—' ? 0.4 : 1,
          }}
          title={value === '—' ? 'Donnée non disponible — saisir des évènements pour activer.' : undefined}
        >
          {value}
        </span>
        {unit ? <span style={unitStyle}>{unit}</span> : null}
      </div>
      {trend ? <div style={trendStyle}>{trend}</div> : null}
      {hint ? (
        <div
          style={{
            fontSize: 10,
            color: isAccent ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
            marginTop: 6,
            letterSpacing: '0.04em',
            lineHeight: 1.3,
          }}
        >
          {hint}
        </div>
      ) : null}
      {sparkOk ? (
        <svg
          viewBox="0 0 56 22"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 14,
            bottom: 14,
            width: 56,
            height: 22,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        >
          <path
            d={buildSparkPath(spark!)}
            fill="none"
            stroke={sparkColor ?? (isAccent ? 'rgba(255,255,255,0.7)' : dotColor)}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      ) : null}
    </Tag>
  );
}
