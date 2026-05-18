import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionDividerProps {
  /** Section label rendered uppercase mono. */
  label: string;
  /** Right-side action (typically a "Voir tout" ghost button). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Titled section divider: thin accent rule + mono uppercase label + optional action.
 * Use before a DataRow stack or KPI grid.
 */
const SectionDivider: React.FC<SectionDividerProps> = ({ label, action, className }) => {
  return (
    <div className={cn('flex items-center gap-3 py-2', className)}>
      <span className="h-px w-4 bg-accent" aria-hidden="true" />
      <span className="kpi-label shrink-0">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

export default SectionDivider;
