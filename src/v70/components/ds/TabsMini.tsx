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
import React from 'react';

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
  return (
    <div className="tabs-mini" role="tablist">
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
  );
};
