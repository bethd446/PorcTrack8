import React from 'react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  /** L'élément input/select/textarea à wrapper. */
  children: React.ReactElement;
  className?: string;
  style?: React.CSSProperties;
  /** Optionnel : message d'erreur. Affiché en danger si renseigné. */
  error?: string;
}

/**
 * FormField V30 — wrapper canonique pour un champ de formulaire.
 *
 * Structure :
 *   - Label SMALL CAPS letter-spacé au-dessus
 *   - Input enfant (passé en children, ex: <Input />)
 *   - Hint en dessous, --pt-text-muted, 12px (Instrument Sans, JAMAIS mono)
 *   - Error éventuelle remplace/double le hint en --pt-danger
 *
 * Pas de monospace nulle part — le hint est en var(--pt-font-body).
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  hint,
  error,
  children,
  className,
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        ...style,
      }}
    >
      <label
        style={{
          fontFamily: 'var(--pt-font-body)',
          fontSize: 'var(--pt-text-label)',
          letterSpacing: 'var(--pt-tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--pt-text-subtle)',
          fontWeight: 600,
        }}
      >
        {label}
        {required ? (
          <span aria-hidden="true" style={{ color: 'var(--pt-danger)', marginLeft: 4 }}>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <span
          role="alert"
          style={{
            fontFamily: 'var(--pt-font-body)',
            fontSize: 12,
            color: 'var(--pt-danger)',
            lineHeight: 1.4,
          }}
        >
          {error}
        </span>
      ) : hint ? (
        <span
          style={{
            fontFamily: 'var(--pt-font-body)',
            fontSize: 12,
            color: 'var(--pt-text-muted)',
            lineHeight: 1.4,
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
};

export default FormField;
