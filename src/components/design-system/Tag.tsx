import React from 'react';

export type TagVariant =
  | 'default'
  | 'accent'
  | 'primary'
  | 'success'
  | 'warning';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
}

const VARIANT_STYLE: Record<TagVariant, React.CSSProperties> = {
  default: {
    background: 'var(--ds-surface-alt)',
    color: 'var(--ds-text-muted)',
  },
  accent: {
    background: 'var(--ds-accent-pill)',
    color: 'var(--ds-text)',
  },
  primary: {
    background: 'var(--ds-primary)',
    color: 'var(--ds-primary-text)',
  },
  success: {
    background: 'rgba(45, 74, 31, 0.12)',
    color: 'var(--ds-primary)',
  },
  warning: {
    background: 'var(--ds-accent-soft)',
    color: 'var(--ds-text)',
  },
};

/**
 * Tag V29 — pill UPPERCASE 12px letter-spacé.
 * Padding 6×14, radius pill, fonte sans bold.
 * Variants : default | accent (orange) | primary (vert plein) | success (vert soft) | warning (beige).
 */
const Tag: React.FC<TagProps> = ({
  variant = 'default',
  className,
  style,
  children,
  ...rest
}) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 14px',
        fontFamily: 'var(--ds-font-sans)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 'var(--ds-radius-pill)',
        ...VARIANT_STYLE[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
};

export default Tag;
