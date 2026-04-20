import React from 'react';
import { cn } from '../../lib/utils';

export type ChipTone = 'default' | 'accent' | 'amber' | 'red' | 'blue' | 'gold';
export type ChipSize = 'xs' | 'sm';

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  size?: ChipSize;
  className?: string;
}

const toneClass: Record<ChipTone, string> = {
  default: 'chip',
  accent: 'chip chip--accent',
  amber: 'chip chip--amber',
  red: 'chip chip--red',
  blue: 'chip chip--blue',
  gold: 'chip chip--gold',
};

const sizeClass: Record<ChipSize, string> = {
  xs: 'text-[10px] px-1.5 py-[1px]',
  sm: 'text-[11px] px-2 py-[2px]',
};

/**
 * Small pill badge for statuses / categories.
 * Uses `.chip` utility (declared in agritech-utilities.css) + tone modifiers.
 */
const Chip: React.FC<ChipProps> = ({ label, tone = 'default', size = 'sm', className }) => {
  return (
    <span className={cn(toneClass[tone], sizeClass[size], className)}>
      {label}
    </span>
  );
};

export default Chip;
