/**
 * V70 — TabsMini (réplique mockup ligne 538-564)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 * - .tabs-mini (l. 539-546) : flex container warm bg, padding 4px, radius 999px
 * - .tab-mini (l. 548-559) : flex 1, padding 7px 8px, 10px UPPERCASE muted
 * - .tab-mini.active (l. 561-564) : primary bg + white text
 *
 * Pattern V44 : options=[{value, label}] (cf. Annexe D règle 2 du brief).
 */
import React, { useEffect, useRef, useState } from 'react';

export interface TabOption {
  value: string;
  label: string;
}

export interface TabsMiniProps {
  value: string;
  onChange: (value: string) => void;
  options: TabOption[];
}

export const TabsMini: React.FC<TabsMiniProps> = ({ value, onChange, options }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  // Détecte si le contenu déborde — affiche le fade indicateur uniquement
  // quand un swipe horizontal est nécessaire pour voir tous les onglets.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const overflow = el.scrollWidth > el.clientWidth + 2;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setIsScrollable(overflow && !atEnd);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [options]);

  return (
    <div className={`tabs-mini-wrap${isScrollable ? ' is-scrollable' : ''}`}>
      <div className="tabs-mini" role="tablist" ref={scrollRef}>
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tab-mini${isActive ? ' active' : ''}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
