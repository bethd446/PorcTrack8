import React from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

export interface SearchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Callback appelé quand l'utilisateur clique le bouton ✕. Reset value attendu. */
  onClear?: () => void;
}

/**
 * Search V33 — input pill avec icône loupe à gauche et bouton clear à droite.
 *
 * - Réutilise le DNA Input pill (background --pt-surface, radius pill)
 * - Loupe lucide-react à gauche (16px, --pt-text-subtle)
 * - Bouton ✕ à droite si value non vide ET onClear fourni
 * - Min-h 44px (tap target sur input + bouton clear)
 *
 * Note : porte data-pt="input" pour bypass override Ionic.
 */
const Search = React.forwardRef<HTMLInputElement, SearchProps>(
  ({ onClear, className, style, value, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const showClear = Boolean(onClear) && Boolean(value);

    return (
      <div
        className={className}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          ...style,
        }}
      >
        <SearchIcon
          size={16}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 16,
            color: 'var(--pt-text-subtle)',
            pointerEvents: 'none',
            flexShrink: 0,
          }}
        />
        <input
          ref={ref}
          type="search"
          data-pt="input"
          value={value}
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
            padding: '12px 44px 12px 40px',
            border: `1.5px solid ${focused ? 'var(--pt-primary)' : 'transparent'}`,
            fontFamily: 'var(--pt-font-body)',
            fontSize: 'var(--pt-text-body)',
            color: 'var(--pt-text)',
            minHeight: 44,
            outline: 'none',
            transition: 'border-color 160ms ease',
            width: '100%',
          }}
          {...rest}
        />
        {showClear ? (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={onClear}
            style={{
              position: 'absolute',
              right: 8,
              width: 36,
              height: 36,
              minHeight: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              color: 'var(--pt-text-muted)',
              border: 'none',
              borderRadius: 'var(--pt-radius-pill)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  },
);

Search.displayName = 'Search';

export default Search;
