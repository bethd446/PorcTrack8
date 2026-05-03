import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ListItemProps {
  /** Avatar gauche : IconBox / image / emoji. 44×44 idéalement. */
  avatar?: React.ReactNode;
  /** Texte primaire (ex : "T01 · Monette"). Big Shoulders. */
  primary: React.ReactNode;
  /** Texte secondaire muted (ex : "B.22 · Allaitante"). */
  secondary?: React.ReactNode;
  /** Composant aligné à droite (ex : Tag pill statut). */
  trailing?: React.ReactNode;
  /** Si fourni, la row devient cliquable + chevron à droite. */
  onClick?: () => void;
  /** Lien (l'élément navigue au tap). Mutuellement exclusif avec onClick. */
  href?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ListItem V33 — ligne canonique pour listes d'animaux/objets/lots.
 *
 * Layout :
 *   [avatar] [primary / secondary]   [trailing] [chevron si interactif]
 *
 * - Min-h 56px (tap target large)
 * - Cliquable si onClick OU href fourni
 * - Hover/active state quand interactif
 * - Réutilisable depuis AnimalListItem (delegate possible)
 */
const ListItem: React.FC<ListItemProps> = ({
  avatar,
  primary,
  secondary,
  trailing,
  onClick,
  href,
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

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--pt-space-3)',
    minHeight: 56,
    padding: '10px 14px',
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
      {avatar ? (
        <div style={{ flexShrink: 0, display: 'inline-flex' }}>{avatar}</div>
      ) : null}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--pt-font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--pt-text)',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primary}
        </div>
        {secondary ? (
          <div
            style={{
              fontFamily: 'var(--pt-font-body)',
              fontSize: 13,
              color: 'var(--pt-text-muted)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {secondary}
          </div>
        ) : null}
      </div>
      {trailing ? (
        <div style={{ flexShrink: 0, display: 'inline-flex' }}>{trailing}</div>
      ) : null}
      {interactive ? (
        <ChevronRight
          size={18}
          aria-hidden="true"
          style={{ color: 'var(--pt-text-subtle)', flexShrink: 0 }}
        />
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        className={className}
        style={baseStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={className}
      style={baseStyle}
      aria-label={ariaLabel}
    >
      {content}
    </div>
  );
};

export default ListItem;
