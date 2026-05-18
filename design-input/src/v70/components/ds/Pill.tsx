/**
 * V70 — Pill (réplique mockup ligne 381-402)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 * - .pill (l. 382-392) : padding 3px 10px, radius 999px, 9px UPPERCASE
 * - 9 variants sémantiques (l. 394-402) :
 *   primary / warm / accent / warning / danger / success / info / soft / ghost
 */
import React from 'react';

export type PillVariant =
  | 'primary'
  | 'warm'
  | 'accent'
  | 'warning'
  | 'danger'
  | 'success'
  | 'info'
  | 'soft'
  | 'ghost';

export interface PillProps {
  variant?: PillVariant;
  children: React.ReactNode;
}

export const Pill: React.FC<PillProps> = ({ variant = 'primary', children }) => {
  return <span className={`pill pill-${variant}`}>{children}</span>;
};
