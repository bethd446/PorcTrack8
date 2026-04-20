import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export type HubTileTone = 'default' | 'accent' | 'amber' | 'coral' | 'teal' | 'gold' | 'sage' | 'ochre';

export interface HubTileProps {
  /** Lucide or custom icon node (color inherits currentColor). */
  icon: React.ReactNode;
  /** Main label (uppercase, display font). */
  title: string;
  /** Helper text (e.g. "8 pleines · 4 mater"). */
  subtitle?: string;
  /** Optional counter shown mono top-right. */
  count?: number;
  /** Navigation target (react-router path). */
  to: string;
  /** Accent tint for icon + left border. */
  tone?: HubTileTone;
  /** Extra className for composition. */
  className?: string;
}

const toneIcon: Record<HubTileTone, string> = {
  default: 'text-text-1',
  accent: 'text-accent',
  amber: 'text-amber',
  coral: 'text-coral',
  teal: 'text-teal',
  gold: 'text-gold',
  sage: 'text-teal',
  ochre: 'text-amber',
};

const toneBorder: Record<HubTileTone, string> = {
  default: 'border-border',
  accent: 'border-accent/40',
  amber: 'border-amber/40',
  coral: 'border-coral/40',
  teal: 'border-teal/40',
  gold: 'border-gold/40',
  sage: 'border-teal/40',
  ochre: 'border-amber/40',
};

/**
 * Hub tile: large button to enter a sub-section from a hub screen.
 * Layout: icon + title/subtitle (left) · count + chevron (right).
 */
const HubTile: React.FC<HubTileProps> = ({
  icon,
  title,
  subtitle,
  count,
  to,
  tone = 'default',
  className,
}) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      aria-label={title}
      className={cn(
        'card-dense pressable w-full text-left flex items-center gap-4',
        toneBorder[tone],
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-2',
          toneIcon[tone]
        )}
        aria-hidden="true"
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="agritech-heading text-[18px] uppercase leading-tight truncate">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 font-mono text-[11px] text-text-2 truncate">{subtitle}</div>
        ) : null}
      </div>

      {typeof count === 'number' ? (
        <span className="font-mono tabular-nums text-[18px] font-semibold text-text-0">
          {count}
        </span>
      ) : null}

      <ChevronRight size={18} className="shrink-0 text-text-2" aria-hidden="true" />
    </button>
  );
};

export default HubTile;
