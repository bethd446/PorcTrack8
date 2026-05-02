import React from 'react';
import { cn } from '../lib/utils';
import { useMediaQuery } from '../hooks/useMediaQuery';
import AppSidebar from './AppSidebar';
import SyncStatusBadge from './SyncStatusBadge';

export interface AgritechLayoutProps {
  children: React.ReactNode;
  /** When true, reserves space at the bottom for AgritechNav (68px + safe-area) on mobile. */
  withNav?: boolean;
  /** When false, hides the desktop sidebar (e.g. onboarding). Default true. */
  withSidebar?: boolean;
  /** Extra className on the inner surface. */
  className?: string;
}

/**
 * AgritechLayout — Terrain Vivant v6 (light) surface wrapper.
 *
 * Wave 2 audit (2026-04-30) : shell unifié responsive.
 *  · ≥1024px → grid `240px 1fr` avec sidebar permanente (AppSidebar).
 *  · <1024px → block layout, sidebar masquée, padding-bottom pour bottom nav.
 *
 * AgritechNavV2 se masque lui-même ≥1024px (cf. son `useMediaQuery`).
 */
const AgritechLayout: React.FC<AgritechLayoutProps> = ({
  children,
  withNav = true,
  withSidebar = true,
  className,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const showSidebar = isDesktop && withSidebar;

  return (
    <div
      className={cn('min-h-screen', className)}
      style={{
        background: 'var(--bg-app)',
        color: 'var(--ink)',
        minHeight: '100dvh',
        display: showSidebar ? 'grid' : 'block',
        gridTemplateColumns: showSidebar ? '240px minmax(0, 1fr)' : undefined,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: !isDesktop && withNav
          ? 'calc(68px + env(safe-area-inset-bottom))'
          : 'env(safe-area-inset-bottom)',
      }}
    >
      {showSidebar ? <AppSidebar /> : null}
      <div style={{ minWidth: 0 }}>{children}</div>
      {/* Sync badge global — top-right, ne s'affiche que si pending ou offline (RT2). */}
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 8px)',
          right: 12,
          zIndex: 60,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <SyncStatusBadge />
        </div>
      </div>
    </div>
  );
};

export default AgritechLayout;
