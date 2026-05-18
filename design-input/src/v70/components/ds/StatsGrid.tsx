/**
 * V70 — StatsGrid + Stat (réplique mockup ligne 404-436)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 * - .stats-grid (l. 405-414) : grid 4 cols par défaut, gap 8px,
 *   white bg, border var(--line), radius 14px, padding 14px 8px
 * - .stat (l. 416-419) : center, padding 4px
 * - .stat-value (l. 421-427) : Big Shoulders 24px black primary color
 * - .stat-label (l. 429-435) : 8px UPPERCASE muted
 */
import React from 'react';

export interface StatProps {
  value: string | number;
  label: string;
}

export const Stat: React.FC<StatProps> = ({ value, label }) => {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

export interface StatsGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ children, cols = 4 }) => {
  const style =
    cols === 4
      ? undefined
      : { gridTemplateColumns: `repeat(${cols}, 1fr)` };
  return (
    <div className="stats-grid" style={style}>
      {children}
    </div>
  );
};
