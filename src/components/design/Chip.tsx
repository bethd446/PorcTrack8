import React from 'react';
import AgritechChip, { type ChipTone as AgritechTone } from '../agritech/Chip';

/**
 * @deprecated Use `Chip` from `src/components/agritech` instead.
 * This file is a thin compat shim mapping the legacy `tone` palette
 * (green/amber/terre/pig/neutral) and `children` API to the canonical
 * agritech Chip. Kept only because TruieDetailView (V5-A locked) still
 * references this path.
 */
type LegacyTone = 'green' | 'amber' | 'terre' | 'pig' | 'neutral';

interface ChipProps {
  children: React.ReactNode;
  tone?: LegacyTone;
  className?: string;
}

const TONE_MAP: Record<LegacyTone, AgritechTone> = {
  green: 'accent',
  amber: 'amber',
  terre: 'ochre',
  pig: 'coral',
  neutral: 'default',
};

const Chip: React.FC<ChipProps> = ({ children, tone = 'green', className }) => {
  const label = typeof children === 'string' || typeof children === 'number'
    ? String(children)
    : '';
  if (!label) {
    return (
      <span className={className}>
        <AgritechChip label="" tone={TONE_MAP[tone]} />
        {children}
      </span>
    );
  }
  return <AgritechChip label={label} tone={TONE_MAP[tone]} className={className} />;
};

export default Chip;
