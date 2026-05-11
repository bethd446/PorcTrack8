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
import { Sun, Warehouse, Repeat, LineChart, Settings2 } from 'lucide-react';

interface NavTabV70 {
  id: 'today' | 'animals' | 'repro' | 'perf' | 'settings';
  href: string;
  icon: React.ReactNode;
  label: string;
  match: string[];
}

const TABS_V70: NavTabV70[] = [
  { id: 'today',    href: '/today',         icon: <Sun size={20} strokeWidth={2} aria-hidden />,        label: "Aujourd'hui", match: ['/today'] },
  { id: 'animals',  href: '/troupeau',      icon: <Warehouse size={20} strokeWidth={2} aria-hidden />,  label: 'Élevage',     match: ['/troupeau'] },
  { id: 'repro',    href: '/reproduction',  icon: <Repeat size={20} strokeWidth={2} aria-hidden />,     label: 'Repro',       match: ['/reproduction', '/cycles'] },
  { id: 'perf',     href: '/performance',   icon: <LineChart size={20} strokeWidth={2} aria-hidden />,  label: 'Performance', match: ['/performance', '/pilotage'] },
  { id: 'settings', href: '/reglages',      icon: <Settings2 size={20} strokeWidth={2} aria-hidden />,  label: 'Réglages',    match: ['/reglages', '/more', '/admin', '/aide', '/ressources', '/fournisseurs', '/protocoles'] },
];

/**
 * Résout le tab actif à partir du pathname courant.
 *
 * Stratégie : longest-prefix match parmi les `match` déclarés par chaque tab.
 * Retourne `null` si aucun tab ne matche : utile pour les routes hors-shell
 * (ex: `/alerts`, `/controle`, `/protocoles`) où on ne veut PAS surligner
 * "Aujourd'hui" par défaut (bug B7 — Christophe v76 ; fix vague 1 ciblait
 * AgritechNavV2 mais le shell V70 monte BottomNavV70).
 */
export function resolveActiveTab(pathname: string): NavTabV70['id'] | null {
  let bestId: NavTabV70['id'] | null = null;
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
