import React from 'react';

export interface ChipProps {
  /** Texte principal (ex : "Pleines", "Vides", "Tout"). */
  label: string;
  /** Compteur affiché en gras à droite du label. */
  count?: number;
  /** Etat sélectionné — border vert primary + texte primary. */
  active?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Chip V33 — pill de filtre avec compteur (ex : "Tout 17", "Pleines 6").
 *
 * Différent de Tag (statut) : Chip = filtre cliquable, Tag = badge informatif.
 *
 * - Active   : border 1.5px primary, fond surface, texte primary
 * - Inactive : border 1px divider, fond transparent, texte muted
 * - Le `count` est affiché en gras Big Shoulders à droite du label
 * - Min-h 36px (chip = filtre, pas tap target principal — cohérent avec PDF)
 */
const Chip: React.FC<ChipProps> = ({
  label,
  count,
  active = false,
  onClick,
  className,
  style,
}) => {
  const interactive = Boolean(onClick);
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    padding: '6px 14px',
    background: active ? 'var(--pt-surface)' : 'transparent',
    color: active ? 'var(--pt-primary)' : 'var(--pt-text-muted)',
    border: active
      ? '1.5px solid var(--pt-primary)'
      : '1px solid var(--pt-divider)',
    borderRadius: 'var(--pt-radius-pill)',
    fontFamily: 'var(--pt-font-body)',
    fontSize: 13,
    fontWeight: 600,
    cursor: interactive ? 'pointer' : 'default',
    transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
    ...style,
  };

  const content = (
    <>
      <span>{label}</span>
      {count !== undefined ? (
        <span
          style={{
            fontFamily: 'var(--pt-font-display)',
            fontSize: 14,
            fontWeight: 700,
            color: active ? 'var(--pt-primary)' : 'var(--pt-text)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={className}
        style={baseStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={className} style={baseStyle}>
      {content}
    </span>
  );
};

export default Chip;
