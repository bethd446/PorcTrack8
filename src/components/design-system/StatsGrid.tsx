import React from 'react';

export type StatsGridCols = 2 | 3 | 4 | 6;

export interface StatsGridProps {
  /** Composants `Stat` à wrapper. */
  children: React.ReactNode;
  /** Nombre de colonnes (par défaut 4). */
  cols?: StatsGridCols;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * StatsGrid V33 — wrapper Card autour d'une grille de Stats.
 *
 * - Fond surface, radius card, padding interne
 * - Grille CSS adaptable (2 / 3 / 4 / 6 colonnes)
 * - Shadow card subtile
 *
 * Existe partiellement dans TroupeauHub V30 (InventaireStat) — formalisé ici
 * comme composant DS exporté.
 */
const StatsGrid: React.FC<StatsGridProps> = ({
  children,
  cols = 4,
  className,
  style,
}) => {
  return (
    <div
      role="group"
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 'var(--pt-space-3)',
        background: 'var(--pt-surface)',
        borderRadius: 'var(--pt-radius-lg)',
        padding: 'var(--pt-space-5)',
        boxShadow: 'var(--pt-shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default StatsGrid;
