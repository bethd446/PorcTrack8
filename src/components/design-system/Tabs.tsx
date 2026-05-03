import React from 'react';

export interface TabItem {
  /** Identifiant interne (passé à onChange). */
  id: string;
  /** Label visible. */
  label: string;
  /** Compteur optionnel affiché en suffixe. */
  count?: number | string;
}

export interface TabsProps {
  items: ReadonlyArray<TabItem>;
  value: string;
  onChange: (id: string) => void;
  /** Aria-label du tablist. */
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Tabs V30 — segment control pill arrondi pour 2-5 tabs.
 *
 * - Conteneur pill avec fond surface-alt
 * - Tab active : fond primary plein, texte blanc
 * - Tab inactive : transparent, texte muted
 * - Min-height 44px sur chaque tab (tap target)
 *
 * Note : porte data-pt="button" sur chaque <button> pour neutraliser le reset
 * Ionic (border-radius:0, text-transform:none).
 */
const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  style,
}) => {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'inline-flex',
        background: 'var(--pt-surface-alt)',
        borderRadius: 'var(--pt-radius-pill)',
        padding: 4,
        gap: 2,
        ...style,
      }}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-pt="button"
            onClick={() => onChange(it.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minHeight: 44,
              padding: '8px 18px',
              background: active ? 'var(--pt-primary)' : 'transparent',
              color: active ? 'var(--pt-primary-text)' : 'var(--pt-text-muted)',
              border: 'none',
              borderRadius: 'var(--pt-radius-pill)',
              fontFamily: 'var(--pt-font-body)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 'var(--pt-tracking-button)',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 160ms ease, color 160ms ease',
            }}
          >
            <span>{it.label}</span>
            {it.count !== undefined ? (
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.85,
                  fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {it.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
