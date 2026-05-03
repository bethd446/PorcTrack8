import React from 'react';

export type KeyValueRowTone = 'default' | 'accent' | 'muted';

export interface KeyValueRowProps {
  label: string;
  value: React.ReactNode;
  tone?: KeyValueRowTone;
  className?: string;
  style?: React.CSSProperties;
}

const TONE_VALUE_COLOR: Record<KeyValueRowTone, string> = {
  default: 'var(--pt-text)',
  accent: 'var(--pt-accent)',
  muted: 'var(--pt-text-muted)',
};

/**
 * KeyValueRow V30 — ligne label/value pour fiches détail.
 *
 * Layout : label SMALL CAPS gauche · ligne fine 1px séparatrice (ou border-bottom)
 * · value droite Big Shoulders bold. S'utilise empilée pour former un tableau
 * de propriétés (ex: fiche truie, paramètres bande).
 *
 * Tones :
 *   - default : value en texte primaire
 *   - accent  : value en orange (highlight)
 *   - muted   : value en gris (donnée secondaire)
 */
const KeyValueRow: React.FC<KeyValueRowProps> = ({
  label,
  value,
  tone = 'default',
  className,
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--pt-space-3)',
        padding: '12px 0',
        borderBottom: '1px solid var(--pt-divider)',
        minHeight: 44,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--pt-font-body)',
          fontSize: 'var(--pt-text-label)',
          letterSpacing: 'var(--pt-tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--pt-text-subtle)',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--pt-font-display)',
          fontSize: 16,
          fontWeight: 700,
          color: TONE_VALUE_COLOR[tone],
          textAlign: 'right',
          letterSpacing: '-0.005em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
};

export default KeyValueRow;
