import React from 'react';
import { cn } from '../lib/utils';

export interface AgritechLayoutProps {
  children: React.ReactNode;
  /** When true, reserves space at the bottom for AgritechNav (64px + safe-area). */
  withNav?: boolean;
  /** Extra className on the inner surface. */
  className?: string;
}

/**
 * AgritechLayout — opt-in dark cockpit surface wrapper.
 *
 * Apply only on the NEW agritech screens. Legacy screens keep their
 * existing white "Ultra Clean" surface untouched (no global override).
 *
 * Responsibilities:
 *  - Applies `.agritech-root` (bg-bg-0 + text-text-0 + min-h 100dvh)
 *  - Respects safe-areas (top/bottom)
 *  - Reserves bottom space for `<AgritechNav>` when `withNav`
 */
const AgritechLayout: React.FC<AgritechLayoutProps> = ({
  children,
  withNav = true,
  className,
}) => {
  return (
    <div
      className={cn('agritech-root', className)}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: withNav
          ? 'calc(64px + env(safe-area-inset-bottom))'
          : 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  );
};

export default AgritechLayout;
