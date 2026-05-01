import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  BellRing,
  Users,
  Heart,
  Layers,
  RotateCcw,
  Package,
  BarChart3,
  Settings,
} from 'lucide-react';
import Sidebar, { type SidebarSection } from './design/Sidebar';
import { useAuth } from '../context/AuthContext';

/**
 * AppSidebar — wrapper de la `<Sidebar>` v6 partagé par toutes les routes
 * protégées (≥1024px). Gère :
 *   · sections fixes (Pilotage / Cheptel / Gestion / Système)
 *   · active state via `useLocation()` + matchage prefix
 *   · masquage de l'item Pilotage pour les non-OWNER
 */
const AppSidebar: React.FC = () => {
  const location = useLocation();
  const { isOwner } = useAuth();

  const isActive = (href: string, prefixes?: string[]): boolean => {
    const list = prefixes ?? [href];
    return list.some(
      (p) =>
        location.pathname === p ||
        location.pathname.startsWith(p + '/'),
    );
  };

  const sections: SidebarSection[] = useMemo(() => {
    const base: SidebarSection[] = [
      {
        title: 'Pilotage',
        items: [
          {
            label: 'Cockpit',
            icon: LayoutGrid,
            href: '/cockpit',
            active: isActive('/cockpit'),
          },
          {
            label: 'Alertes',
            icon: BellRing,
            href: '/alerts',
            active: isActive('/alerts', ['/alerts', '/pilotage/alertes']),
          },
        ],
      },
      {
        title: 'Cheptel',
        items: [
          {
            label: 'Truies',
            icon: Users,
            href: '/troupeau/truies',
            active: isActive('/troupeau/truies'),
          },
          {
            label: 'Verrats',
            icon: Heart,
            href: '/troupeau/verrats',
            active: isActive('/troupeau/verrats'),
          },
          {
            label: 'Bandes',
            icon: Layers,
            href: '/troupeau/bandes',
            active: isActive('/troupeau/bandes'),
          },
        ],
      },
      {
        title: 'Gestion',
        items: [
          {
            label: 'Cycles',
            icon: RotateCcw,
            href: '/cycles',
            active: isActive('/cycles'),
          },
          {
            label: 'Ressources',
            icon: Package,
            href: '/ressources',
            active: isActive('/ressources'),
          },
        ],
      },
      {
        title: 'Système',
        items: [
          {
            label: 'Réglages',
            icon: Settings,
            href: '/more',
            active: isActive('/more'),
          },
        ],
      },
    ];

    if (isOwner) {
      base[2].items.splice(2, 0, {
        label: 'Pilotage',
        icon: BarChart3,
        href: '/pilotage',
        active: isActive('/pilotage', ['/pilotage']) && !location.pathname.startsWith('/pilotage/alertes'),
      });
    }

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isOwner]);

  return <Sidebar sections={sections} />;
};

export default AppSidebar;
