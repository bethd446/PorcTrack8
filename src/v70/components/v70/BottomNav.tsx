/**
 * V70 — Bottom navigation 5 onglets
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 *   - CSS .bottom-nav lignes 189-235
 *   - HTML structure lignes 1495-1516
 *
 * Décision A Christophe : tab nav label = "Élevage" (pas "Mes animaux")
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavTabV70 {
  id: 'today' | 'animals' | 'repro' | 'perf' | 'settings';
  href: string;
  icon: string;
  label: string;
  match: string[];
}

const TABS_V70: NavTabV70[] = [
  { id: 'today',    href: '/today',         icon: '⌂', label: "Aujourd'hui", match: ['/today'] },
  { id: 'animals',  href: '/troupeau',      icon: '🐖', label: 'Élevage',      match: ['/troupeau'] },
  { id: 'repro',    href: '/reproduction',  icon: '❤', label: 'Repro',        match: ['/reproduction', '/cycles'] },
  { id: 'perf',     href: '/performance',   icon: '📊', label: 'Performance',  match: ['/performance', '/pilotage'] },
  { id: 'settings', href: '/reglages',      icon: '⚙', label: 'Réglages',     match: ['/reglages', '/more', '/admin', '/aide'] },
];

function resolveActiveTab(pathname: string): NavTabV70['id'] {
  let bestId: NavTabV70['id'] = 'today';
  let bestLen = -1;
  for (const tab of TABS_V70) {
    for (const m of tab.match) {
      if (pathname === m || pathname.startsWith(m + '/')) {
        if (m.length > bestLen) {
          bestLen = m.length;
          bestId = tab.id;
        }
      }
    }
  }
  return bestId;
}

export const BottomNavV70: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = resolveActiveTab(location.pathname);

  return (
    <nav className="bottom-nav" role="tablist" aria-label="Navigation principale V70">
      {TABS_V70.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            className={`bn-item${active ? ' active' : ''}`}
            onClick={() => navigate(tab.href)}
          >
            <span className="bn-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
