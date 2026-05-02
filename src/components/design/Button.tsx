import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-label'?: string;
}

const SIZE_MIN_H: Record<Size, number> = { sm: 38, md: 44, lg: 52 };
const SIZE_PADDING: Record<Size, string> = {
  sm: '8px 14px',
  md: '12px 18px',
  lg: '14px 22px',
};
const SIZE_FONT: Record<Size, string> = { sm: '11px', md: '12px', lg: '13px' };

const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-accent-500)',
    color: 'var(--bg-surface)',
    border: '1.5px solid var(--color-accent-500)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--ink)',
    border: '1.5px solid var(--ink)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink)',
    border: '1.5px solid transparent',
  },
  inverse: {
    background: 'var(--bg-surface)',
    color: 'var(--color-accent-600)',
    border: '1.5px solid var(--bg-surface)',
  },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  style,
  type = 'button',
  disabled,
  onClick,
  'aria-label': ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`pt-btn pt-btn--${variant} pt-btn--${size} ${className}`}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: SIZE_FONT[size],
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontWeight: 500,
        minHeight: SIZE_MIN_H[size],
        padding: SIZE_PADDING[size],
        borderRadius: 'var(--radius-pill)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition:
          'transform 160ms var(--ease-emil), background 200ms var(--ease-emil), color 200ms var(--ease-emil)',
        ...VARIANT_STYLE[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
