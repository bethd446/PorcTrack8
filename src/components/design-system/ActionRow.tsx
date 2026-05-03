import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ActionRowProps {
  /** Icône à gauche : IconBox, lucide-react ou emoji. */
  icon: React.ReactNode;
  /** Titre principal (Big Shoulders). */
  title: string;
  /** Description secondaire muted. */
  description?: string;
  /** Badge (count ou label) affiché avant le chevron. */
  badge?: number | string;
  /** Si fourni, la row devient cliquable + chevron à droite. */
  onClick?: () => void;
  /** Lien (l'élément navigue au tap). Mutuellement exclusif avec onClick. */
  href?: string;
  /** Variant destructive — titre + chevron en rouge. */
  destructive?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ActionRow V33 — entrée de menu/réglages.
 *
 * Différent de ListItem (qui pointe sur un objet métier).
 * ActionRow = entrée de navigation/action dans Settings, Outils, Aide…
 *
 * Layout : [icon] [title / description] [badge] [chevron]
 *
 * - Variant `destructive` change la couleur du titre + chevron en rouge danger
 * - Min-h 56px (tap target large)
 */
const ActionRow: React.FC<ActionRowProps> = ({
  icon,
  title,
  description,
  badge,
  onClick,
  href,
  destructive = false,
  ariaLabel,
  className,
  style,
}) => {
  const interactive = Boolean(onClick ?? href);

  const handleClick = (): void => {
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      window.location.assign(href);
    }
  };

  const titleColor = destructive ? 'var(--pt-danger)' : 'var(--pt-text)';
  const chevronColor = destructive ? 'var(--pt-danger)' : 'var(--pt-text-subtle)';

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--pt-space-3)',
    minHeight: 56,
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--pt-radius-md)',
    width: '100%',
    textAlign: 'left',
    cursor: interactive ? 'pointer' : 'default',
    transition: 'background 160ms ease',
    ...style,
  };

  const content = (
    <>
      <div
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          color: titleColor,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--pt-font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: titleColor,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              fontFamily: 'var(--pt-font-body)',
              fontSize: 13,
              color: 'var(--pt-text-muted)',
              marginTop: 2,
            }}
          >
            {description}
          </div>
        ) : null}
      </div>
      {badge !== undefined ? (
        <span
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 24,
            height: 24,
            padding: '0 8px',
            background: 'var(--pt-danger)',
            color: 'var(--pt-primary-text)',
            borderRadius: 'var(--pt-radius-pill)',
            fontFamily: 'var(--pt-font-display)',
            fontSize: 12,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {badge}
        </span>
      ) : null}
      {interactive ? (
        <ChevronRight
          size={18}
          aria-hidden="true"
          style={{ color: chevronColor, flexShrink: 0 }}
        />
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel ?? title}
        className={className}
        style={baseStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={baseStyle} aria-label={ariaLabel}>
      {content}
    </div>
  );
};

export default ActionRow;
