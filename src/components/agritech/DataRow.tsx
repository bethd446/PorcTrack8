import React from 'react';
import { cn } from '../../lib/utils';

export interface DataRowProps {
  /** Primary text (first line). */
  primary: string;
  /** Optional secondary text (second line, muted). */
  secondary?: string;
  /** Right-side meta — small mono text OR arbitrary node (chip, KPI…). */
  meta?: string | React.ReactNode;
  /** Trailing accessory (chevron, icon button, chip). */
  accessory?: React.ReactNode;
  /** Click handler — turns the row into a button. */
  onClick?: () => void;
  /** `muted` dims the row. */
  tone?: 'default' | 'muted';
  /** Extra className. */
  className?: string;
}

/**
 * Dense table-like row for vertical lists (not a real <table>).
 * Designed to live inside a `<ul>` or stack of `<div>`s with zebra hover.
 */
const DataRow: React.FC<DataRowProps> = ({
  primary,
  secondary,
  meta,
  accessory,
  onClick,
  tone = 'default',
  className,
}) => {
  const interactive = typeof onClick === 'function';

  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-[14px] font-medium',
            tone === 'muted' ? 'text-text-2' : 'text-text-0'
          )}
        >
          {primary}
        </div>
        {secondary ? (
          <div className="mt-0.5 truncate font-mono text-[11px] text-text-2">{secondary}</div>
        ) : null}
      </div>

      {meta !== undefined && meta !== null ? (
        <div className="shrink-0 font-mono text-[12px] tabular-nums text-text-1">
          {typeof meta === 'string' ? meta : meta}
        </div>
      ) : null}

      {accessory ? <div className="shrink-0">{accessory}</div> : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'data-row pressable flex w-full items-center gap-3 px-3 py-3 text-left',
          'border-b border-border last:border-b-0',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]',
          className
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0',
        className
      )}
    >
      {inner}
    </div>
  );
};

export default DataRow;
