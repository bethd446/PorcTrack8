import React from 'react';

interface FilterChipProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`pressable h-8 px-3 rounded-md text-[11px] uppercase tracking-wide transition-colors ${
      active
        ? 'bg-accent text-bg-0 border border-accent'
        : 'bg-bg-1 text-text-1 border border-border hover:bg-bg-2'
    }`}
  >
    {label}
  </button>
);

export default FilterChip;
