import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'alt';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  as?: React.ElementType;
}

const VARIANT_BG: Record<CardVariant, string> = {
  default: 'var(--ds-surface)',
  elevated: 'var(--ds-surface)',
  alt: 'var(--ds-surface-alt)',
};

const VARIANT_SHADOW: Record<CardVariant, string> = {
  default: 'var(--ds-shadow-card)',
  elevated: 'var(--ds-shadow-elevated)',
  alt: 'var(--ds-shadow-card)',
};

/**
 * Card V29 — conteneur DNA "Aujourd'hui".
 * Crème, radius lg (24px), padding 24px, ombre quasi invisible, AUCUNE bordure.
 * Variants : default | elevated (ombre + marquée) | alt (fond légèrement plus sombre).
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', as: Component = 'div', className, style, children, ...rest }, ref) => {
    return (
      <Component
        ref={ref}
        className={className}
        style={{
          background: VARIANT_BG[variant],
          borderRadius: 'var(--ds-radius-lg)',
          padding: 'var(--ds-space-5)',
          boxShadow: VARIANT_SHADOW[variant],
          border: 'none',
          ...style,
        }}
        {...rest}
      >
        {children}
      </Component>
    );
  },
);

Card.displayName = 'Card';

export default Card;
