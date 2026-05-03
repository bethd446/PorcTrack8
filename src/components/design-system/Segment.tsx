import React from 'react';

export interface SegmentOption<T extends string> {
  /** Valeur identifiante (passée à onChange). */
  value: T;
  /** Label visible — peut être string ou ReactNode (icône + texte). */
  label: React.ReactNode;
}

export interface SegmentProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Aria-label du group. */
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Segment V33 — toggle visuel 2-3 options (Liste/Grille, Vue/Edit…).
 *
 * Différent de Tabs : Segment = toggle visual (vue/affichage),
 * Tabs = changement de page/contenu.
 *
 * - Conteneur pill, fond surface-alt
 * - Option active : fond blanc + ombre légère + texte primary
 * - Option inactive : transparent + texte muted
 * - Min-h 44px (tap target)
 *
 * Note : porte data-pt="button" sur chaque <button> pour neutraliser le reset
 * Ionic (border-radius:0, text-transform:none).
 */
function Segment<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  style,
}: SegmentProps<T>): React.ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'inline-flex',
        background: 'var(--pt-surface-alt)',
        borderRadius: 'var(--pt-radius-pill)',
        padding: 4,
        gap: 2,
        minHeight: 44,
        ...style,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-pt="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minHeight: 36,
              padding: '8px 16px',
              background: active ? 'var(--pt-surface)' : 'transparent',
              color: active ? 'var(--pt-primary)' : 'var(--pt-text-muted)',
              border: 'none',
              borderRadius: 'var(--pt-radius-pill)',
              boxShadow: active ? 'var(--pt-shadow-card)' : 'none',
              fontFamily: 'var(--pt-font-body)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'background 160ms ease, color 160ms ease, box-shadow 160ms ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default Segment;
