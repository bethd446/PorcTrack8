import React from 'react';

export type StatTone = 'default' | 'accent' | 'danger';

export interface StatProps {
  /** Valeur principale (ex : "29"). Big Shoulders gros. */
  value: React.ReactNode;
  /** Label SMALL CAPS au-dessus (ex : "PLEINES"). */
  label: string;
  /** Tonalité — pilote la couleur de la value. */
  tone?: StatTone;
  className?: string;
  style?: React.CSSProperties;
}

const TONE_COLOR: Record<StatTone, string> = {
  default: 'var(--pt-text)',
  accent: 'var(--pt-accent)',
  danger: 'var(--pt-danger)',
};

/**
 * Stat V33 — bloc value + label pour StatsGrid.
 *
 * - value : Big Shoulders 28px bold, tabular-nums
 * - label : 11px small-caps tracking-label, color subtle
 *
 * Sert dans StatsGrid (Inventaire, KPIs synthétiques).
 */
const Stat: React.FC<StatProps> = ({
  value,
  label,
  tone = 'default',
  className,
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--pt-font-body)',
          fontSize: 'var(--pt-text-label)',
          letterSpacing: 'var(--pt-tracking-label)',
          color: 'var(--pt-text-subtle)',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--pt-font-display)',
          fontSize: 28,
          fontWeight: 700,
          color: TONE_COLOR[tone],
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
};

export default Stat;
