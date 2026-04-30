import React from 'react';
import { cn } from '../../lib/utils';

export type KpiTone = 'default' | 'warning' | 'critical' | 'success';

export interface KpiCardProps {
  /** Label in uppercase mono (e.g. "TRUIES PLEINES") */
  label: string;
  /** Main value (mono, big) */
  value: string | number;
  /** Optional unit suffix (kg, j, %…) */
  unit?: string;
  /** Signed delta (positive = up, negative = down). 0 hides the delta. */
  delta?: number;
  /** Label accompanying the delta (e.g. "vs 7j", "vs cible"). */
  deltaLabel?: string;
  /** Optional icon displayed at top-left. */
  icon?: React.ReactNode;
  /** Semantic tone — drives accent border + value tint. */
  tone?: KpiTone;
  /** Makes the whole card interactive. */
  onClick?: () => void;
  /** Extra className for composition. */
  className?: string;
}

const toneAccent: Record<KpiTone, string> = {
  default: 'border-border',
  warning: 'border-amber/40',
  critical: 'border-red/40',
  success: 'border-accent/40',
};

const toneValue: Record<KpiTone, string> = {
  default: 'text-text-0',
  warning: 'text-amber',
  critical: 'text-red',
  success: 'text-accent',
};

/**
 * Dense KPI card for cockpit dashboards.
 * Layout: icon + label (top row), big value (center), delta (bottom).
 */
const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  icon,
  tone = 'default',
  onClick,
  className,
}) => {
  const interactive = typeof onClick === 'function';
  const hasDelta = typeof delta === 'number' && delta !== 0;
  const deltaUp = (delta ?? 0) > 0;
  const deltaAbs = hasDelta ? Math.abs(delta as number) : 0;

  const content = (
    <>
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="inline-flex h-4 w-4 items-center justify-center text-text-2" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="kpi-label">{label}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={cn('kpi-value', toneValue[tone])}>{value}</span>
        {unit ? (
          <span className="font-mono text-[12px] font-medium text-text-2 uppercase tracking-wide">
            {unit}
          </span>
        ) : null}
      </div>

      {(hasDelta || deltaLabel) && (
        <div className="mt-2 flex items-center gap-1.5">
          {hasDelta ? (
            <span className={deltaUp ? 'kpi-delta-up' : 'kpi-delta-down'}>
              {deltaUp ? '+' : '-'}
              {deltaAbs}
            </span>
          ) : null}
          {deltaLabel ? (
            <span className="font-mono text-[11px] text-text-2">{deltaLabel}</span>
          ) : null}
        </div>
      )}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={typeof value === 'string' || typeof value === 'number' ? `${label} ${value}` : label}
        className={cn(
          'card-dense pressable text-left flex flex-col w-full',
          toneAccent[tone],
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
          className
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn('card-dense flex flex-col', toneAccent[tone], className)}>{content}</div>
  );
};

export default KpiCard;
