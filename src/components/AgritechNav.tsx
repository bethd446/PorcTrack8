import React from 'react';
import { LayoutDashboard, Users, Activity, Package, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface AgritechTab {
  name: string;
  path: string;
  matchPaths?: string[];
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const TABS: AgritechTab[] = [
  { name: 'Cockpit', path: '/', Icon: LayoutDashboard },
  { name: 'Troupeau', path: '/troupeau', matchPaths: ['/troupeau', '/cheptel', '/bandes'], Icon: Users },
  { name: 'Cycles', path: '/cycles', matchPaths: ['/cycles', '/controle'], Icon: Activity },
  { name: 'Ressources', path: '/ressources', matchPaths: ['/ressources', '/stock'], Icon: Package },
  { name: 'Pilotage', path: '/pilotage', matchPaths: ['/pilotage', '/alerts', '/more', '/audit', '/sync'], Icon: BarChart3 },
];

/**
 * AgritechNav — 5-tab bottom bar, mounted GLOBALEMENT dans App.tsx.
 *
 * Seule nav de l'app (l'ancien `<Navigation>` a été supprimé).
 * Se cache sur les flux pleins écrans (checklist, controle/checklist).
 */
const AgritechNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on immersive flows.
  const hideOn = ['/checklist/', '/controle/checklist'];
  if (hideOn.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] bg-bg-0 border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigation principale"
    >
      <ul className="flex h-16 items-stretch">
        {TABS.map(tab => {
          const isActive =
            location.pathname === tab.path ||
            (tab.matchPaths && tab.matchPaths.some(p => location.pathname.startsWith(p))) ||
            false;
          const { Icon } = tab;

          return (
            <li key={tab.name} className="flex-1">
              <button
                type="button"
                onClick={() => navigate(tab.path)}
                aria-label={tab.name}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'pressable flex h-full w-full flex-col items-center justify-center gap-1 px-1',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150',
                    isActive
                      ? 'bg-bg-2 ring-1 ring-accent text-text-0'
                      : 'text-text-2'
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    className="block"
                  />
                </span>
                <span
                  className={cn(
                    'font-mono text-[11px] font-semibold uppercase tracking-wide leading-none transition-colors duration-150',
                    isActive ? 'text-text-0' : 'text-text-2'
                  )}
                >
                  {tab.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AgritechNav;
