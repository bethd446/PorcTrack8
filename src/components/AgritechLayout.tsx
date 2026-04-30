import React from 'react';
import { cn } from '../lib/utils';

export interface AgritechLayoutProps {
  children: React.ReactNode;
  /** When true, reserves space at the bottom for AgritechNav (68px + safe-area). */
  withNav?: boolean;
  /** Extra className on the inner surface. */
  className?: string;
}

/**
 * AgritechLayout — Terrain Vivant v6 (light) surface wrapper.
 *
 * Refonte 2026-04-30 : retrait de `.agritech-root` (dark cockpit) au profit
 * d'une surface claire alignée v6 : --bg-app + --ink. Les sites d'appel
 * (≈30) restent inchangés.
 */
const AgritechLayout: React.FC<AgritechLayoutProps> = ({
  children,
  withNav = true,
  className,
}) => {
  return (
    <div
      className={cn('min-h-screen', className)}
      style={{
        background: 'var(--bg-app)',
        color: 'var(--ink)',
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: withNav
          ? 'calc(68px + env(safe-area-inset-bottom))'
          : 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  );
};

export default AgritechLayout;
