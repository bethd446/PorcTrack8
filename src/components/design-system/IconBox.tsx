import React from 'react';

export type IconBoxTone = 'accent' | 'primary';

export interface IconBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: IconBoxTone;
  size?: number;
}

const TONE_BG: Record<IconBoxTone, string> = {
  accent: 'var(--ds-accent-soft)',
  primary: 'rgba(45, 74, 31, 0.10)',
};

/**
 * IconBox V29 — carré 44×44 avec icône centrée.
 * Radius 12px, fond pastel beige (accent) ou vert tinté (primary).
 * Sert de wrapper pour les icônes lucide-react dans les listes (Élevage cards).
 */
const IconBox: React.FC<IconBoxProps> = ({
  tone = 'accent',
  size = 44,
  className,
  style,
  children,
  ...rest
}) => {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: TONE_BG[tone],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: tone === 'primary' ? 'var(--ds-primary)' : 'var(--ds-accent)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export default IconBox;
