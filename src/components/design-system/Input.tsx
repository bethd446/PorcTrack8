import React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marque visuelle d'erreur — change la couleur du border. */
  invalid?: boolean;
}

/**
 * Input V30 — input pill crème, DNA "Aujourd'hui".
 *
 * - background: var(--pt-surface)
 * - border-radius pill (9999px)
 * - padding 12px 20px
 * - border 1.5px transparent (devient vert primary au focus, danger si invalid)
 * - min-height 44px (tap target)
 *
 * Note : porte data-pt="input" pour bypass override Ionic via design-system-v29.css.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, style, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const borderColor = invalid
      ? 'var(--pt-danger)'
      : focused
        ? 'var(--pt-primary)'
        : 'transparent';
    return (
      <input
        ref={ref}
        data-pt="input"
        className={className}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          background: 'var(--pt-surface)',
          borderRadius: 'var(--pt-radius-pill)',
          padding: '12px 20px',
          border: `1.5px solid ${borderColor}`,
          fontFamily: 'var(--pt-font-body)',
          fontSize: 'var(--pt-text-body)',
          color: 'var(--pt-text)',
          minHeight: 44,
          outline: 'none',
          transition: 'border-color 160ms ease',
          width: '100%',
          ...style,
        }}
        {...rest}
      />
    );
  },
);

Input.displayName = 'Input';

export default Input;
