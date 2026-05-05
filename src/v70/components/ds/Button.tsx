/**
 * V70 — Button (réplique mockup ligne 355-379)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 * - .btn (l. 356-371) : pill UPPERCASE, padding 8px 16px, radius 999px
 * - .btn-primary (l. 373) : primary bg + white text
 * - .btn-secondary (l. 375) : transparent + ink border 1.5px
 * - .btn-accent (l. 376) : accent bg + white text
 * - .btn-ghost (l. 377) : transparent + muted text
 * - .btn-full (l. 378) : 100% width, padding 10px, font 12px
 * - .btn-sm (l. 379) : padding 6px 12px, font 10px
 */
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'full';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  iconLeft,
  children,
  className,
  ...rest
}) => {
  const sizeClass = size === 'full' ? 'btn-full' : size === 'sm' ? 'btn-sm' : '';
  const classes = [`btn`, `btn-${variant}`, sizeClass, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} {...rest}>
      {iconLeft}
      {children}
    </button>
  );
};
