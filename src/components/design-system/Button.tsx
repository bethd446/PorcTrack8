import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_STYLE: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--ds-primary)',
    color: 'var(--ds-primary-text)',
    border: '1px solid var(--ds-primary)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--ds-primary)',
    border: '1px solid var(--ds-primary)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ds-text)',
    border: '1px solid transparent',
  },
  destructive: {
    background: 'transparent',
    color: 'var(--pt-danger)',
    border: '1.5px solid var(--pt-danger)',
  },
};

const SIZE_STYLE: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '10px 20px', fontSize: 12, minHeight: 44 },
  md: { padding: '14px 28px', fontSize: 13, minHeight: 48 },
  lg: { padding: '18px 36px', fontSize: 14, minHeight: 56 },
};

/**
 * Button V29 — pill UPPERCASE letter-spacé, DNA "Aujourd'hui".
 * Variants : primary (vert plein) | secondary (border vert) | ghost (texte seul).
 * Tailles : sm | md | lg. Min-height ≥ 44px (tap target persona F1).
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, style, children, type, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        data-pt="button"
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontFamily: 'var(--ds-font-sans)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 'var(--ds-tracking-button)',
          borderRadius: 'var(--ds-radius-pill)',
          cursor: 'pointer',
          transition: 'opacity 160ms ease, transform 160ms ease',
          ...VARIANT_STYLE[variant],
          ...SIZE_STYLE[size],
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
