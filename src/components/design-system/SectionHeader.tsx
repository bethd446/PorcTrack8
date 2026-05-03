import React from 'react';

export type SectionHeaderTone = 'primary' | 'accent';

export interface SectionHeaderProps {
  label: string;
  tone?: SectionHeaderTone;
  className?: string;
  style?: React.CSSProperties;
}

const DOT_COLOR: Record<SectionHeaderTone, string> = {
  primary: 'var(--ds-primary)',
  accent: 'var(--ds-accent)',
};

/**
 * SectionHeader V29 — label SMALL CAPS letter-spacé avec puce + ligne.
 *
 * Format strict :
 *   • LABEL ─────────────
 *
 * Puce 6×6 ronde (vert primary par défaut, orange si tone='accent'),
 * label 11px tracking 0.18em uppercase couleur subtle,
 * ligne 1px qui prend tout l'espace restant couleur divider.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  tone = 'primary',
  className,
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--ds-space-3)',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: DOT_COLOR[tone],
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--ds-font-sans)',
          fontSize: 'var(--ds-text-label)',
          letterSpacing: 'var(--ds-tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--ds-text-subtle)',
          fontWeight: 600,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          height: 1,
          background: 'var(--ds-divider)',
        }}
      />
    </div>
  );
};

export default SectionHeader;
