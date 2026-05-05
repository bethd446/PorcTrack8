/**
 * V70 — Card + CardHero (réplique mockup ligne 304-353)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 * - .card (l. 305-311) : white bg, border var(--line), radius 14px, padding 16px
 * - .card-hero (l. 313-318) : gradient white→warm, radius 14px, padding 16px
 *
 * Note : la sous-structure du hero (hero-row, hero-icon, hero-info,
 * hero-title-text, hero-sub) est laissée à la main du consommateur via children
 * — Card reste un wrapper pur.
 */
import React from 'react';

export interface CardProps {
  variant?: 'default' | 'hero';
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className,
}) => {
  const baseClass = variant === 'hero' ? 'card-hero' : 'card';
  const finalClass = className ? `${baseClass} ${className}` : baseClass;
  return <div className={finalClass}>{children}</div>;
};
