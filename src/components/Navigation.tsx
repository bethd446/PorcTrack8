import React from 'react';
import {
  CalendarCheck, Leaf, ClipboardList, Settings
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFarm } from '../context/FarmContext';

/**
 * Navigation simplifiée — 4 onglets orientés TÂCHES
 *
 * Au lieu de 7 onglets organisés par données (Cheptel, Bandes, Santé, Stock, Alertes...),
 * on organise autour de ce que le porcher FAIT :
 *
 * 1. Aujourd'hui → son hub quotidien (checklist, actions urgentes, quick actions)
 * 2. Troupeau → tout ce qui concerne les animaux (truies, verrats, bandes)
 * 3. Journal → tout ce qu'il enregistre (soins, notes, alertes, stocks)
 * 4. Plus → config, audit, protocoles
 */
const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { criticalAlertCount } = useFarm();

  const tabs = [
    {
      name: "Aujourd'hui",
      path: '/',
      Icon: CalendarCheck,
    },
    {
      name: 'Troupeau',
      path: '/cheptel',
      matchPaths: ['/cheptel', '/bandes'],
      Icon: Leaf,
    },
    {
      name: 'Journal',
      path: '/alerts',
      matchPaths: ['/alerts', '/sante', '/stock'],
      Icon: ClipboardList,
      badge: criticalAlertCount,
    },
    {
      name: 'Plus',
      path: '/more',
      Icon: Settings,
    },
  ];

  // Hide on checklist/controle flows (full-screen experiences)
  const hideOn = ['/checklist/', '/controle'];
  if (hideOn.some(path => location.pathname.startsWith(path))) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[1000]"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-gray-200)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 0 rgba(28,25,23,0.04), 0 -8px 32px rgba(28,25,23,0.06)',
      }}
    >
      <div className="flex items-center justify-around px-4 pt-2 pb-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path ||
            (tab.matchPaths && tab.matchPaths.some(p => location.pathname.startsWith(p)));
          const { Icon } = tab;

          return (
            <button
              key={tab.name}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-1 py-1 px-4 transition-transform duration-[160ms] active:scale-[0.95] min-w-[64px] pressable"
              aria-label={tab.name}
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-accent-50" />
                )}
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={`transition-colors relative z-10 ${isActive ? 'text-accent-600' : 'text-gray-400'}`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <div className="absolute -top-1 -right-2 min-w-[16px] h-[16px] rounded-full bg-red-500 flex items-center justify-center px-1 border-2 border-white">
                    <span className="text-[11px] text-white font-bold leading-none">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`text-[11px] font-semibold transition-colors ${isActive ? 'text-accent-600' : 'text-gray-400'}`}
                style={{
                  fontFamily: 'InstrumentSans, sans-serif',
                }}
              >
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;
