import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { IonToast } from '@ionic/react';
import {
  Home,
  PiggyBank,
  Heart,
  BarChart3,
  Wrench,
  MoreHorizontal,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePilotage } from '../context/PilotageContext';
import { cn } from '../lib/utils';
import { inferModuleFromPath, getModuleTone } from '../lib/moduleColor';
import { BottomSheet } from './agritech';
import QuickSaillieForm from './forms/QuickSaillieForm';
import QuickPeseeForm from './forms/QuickPeseeForm';
import QuickHealthForm from './forms/QuickHealthForm';
import QuickNoteForm from './forms/QuickNoteForm';
import QuickMortalityForm from './forms/QuickMortalityForm';
import QuickMiseBasForm from './forms/QuickMiseBasForm';
import QuickSevrageForm from './forms/QuickSevrageForm';
import QuickEchographieForm from './forms/QuickEchographieForm';
import QuickWeightDistForm from './forms/QuickWeightDistForm';
import QuickConsoAlimentForm from './forms/QuickConsoAlimentForm';
import QuickAdoptionForm from './forms/QuickAdoptionForm';

/* ── QuickActions Context ────────────────────────────────────────────────── */

export type QuickActionKind =
  | 'saillie'
  | 'echographie'
  | 'soin'
  | 'note'
  | 'pesee'
  | 'conso'
  | 'mortalite'
  | 'misebas'
  | 'sevrage'
  | 'tripoids'
  | 'adoption';

interface QuickActionsContextValue {
  openAction: (kind: QuickActionKind) => void;
}

const QuickActionsCtx = createContext<QuickActionsContextValue | null>(null);

export const useQuickActions = (): QuickActionsContextValue => {
  const ctx = useContext(QuickActionsCtx);
  if (!ctx) {
    throw new Error('useQuickActions must be used within QuickActionsProvider');
  }
  return ctx;
};

export const QuickActionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [kind, setKind] = useState<QuickActionKind | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const openAction = useCallback((k: QuickActionKind) => {
    setKind(k);
  }, []);

  const closeSheet = useCallback(() => setKind(null), []);

  const value = useMemo<QuickActionsContextValue>(
    () => ({ openAction }),
    [openAction]
  );

  return (
    <QuickActionsCtx.Provider value={value}>
      {children}

      <QuickSaillieForm isOpen={kind === 'saillie'} onClose={closeSheet} />
      <QuickEchographieForm
        isOpen={kind === 'echographie'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Échographie enregistrée' });
        }}
      />
      <QuickPeseeForm isOpen={kind === 'pesee'} onClose={closeSheet} />
      <QuickConsoAlimentForm
        isOpen={kind === 'conso'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Conso aliment enregistrée' });
        }}
      />
      <QuickMortalityForm
        isOpen={kind === 'mortalite'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Mortalité enregistrée' });
          closeSheet();
        }}
      />
      <QuickMiseBasForm
        isOpen={kind === 'misebas'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Mise-bas enregistrée' });
        }}
      />
      <QuickWeightDistForm
        isOpen={kind === 'tripoids'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Tri par poids enregistré' });
        }}
      />
      <QuickSevrageForm
        isOpen={kind === 'sevrage'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Sevrage enregistré' });
        }}
      />
      <QuickAdoptionForm
        isOpen={kind === 'adoption'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Adoption enregistrée' });
        }}
      />

      <BottomSheet
        isOpen={kind === 'soin'}
        onClose={closeSheet}
        title="Nouveau soin"
        height="full"
      >
        <QuickHealthForm
          subjectType="TRUIE"
          subjectId="GENERAL"
          onSuccess={() => {
            setToast({ open: true, message: 'Soin enregistré' });
            closeSheet();
          }}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={kind === 'note'}
        onClose={closeSheet}
        title="Nouvelle note"
      >
        <QuickNoteForm
          subjectType="TRUIE"
          subjectId="GENERAL"
          onSuccess={() => {
            setToast({ open: true, message: 'Note enregistrée' });
            closeSheet();
          }}
        />
      </BottomSheet>

      <IonToast
        isOpen={toast.open}
        message={toast.message}
        duration={2200}
        position="top"
        onDidDismiss={() => setToast({ open: false, message: '' })}
      />
    </QuickActionsCtx.Provider>
  );
};

/* ── Tabs definition ─────────────────────────────────────────────────────── */

type TabId = 'today' | 'elevage' | 'repro' | 'perf' | 'outils' | 'more';

interface NavTabDef {
  id: TabId;
  path: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  match: string[];
  ownerOnly?: boolean;
}

// Path Repro : page hub /reproduction livrée Agent B3 V22 (fil conducteur
// saillie → écho → MB → sevrage avec KPIs ISSE/IEM/Taux MB/Renouv).
// L'active state matche aussi /cycles/repro et /cycles/maternite.
const REPRO_PATH = '/reproduction';

const TABS: NavTabDef[] = [
  {
    id: 'today',
    path: '/today',
    label: 'Aujourd’hui',
    Icon: Home,
    match: ['/today'],
  },
  {
    id: 'elevage',
    path: '/troupeau',
    label: 'Élevage',
    Icon: PiggyBank,
    match: ['/troupeau', '/cheptel', '/bandes'],
  },
  {
    id: 'repro',
    path: REPRO_PATH,
    label: 'Repro',
    Icon: Heart,
    match: ['/reproduction', '/cycles/repro', '/cycles/maternite'],
  },
  {
    id: 'perf',
    path: '/pilotage',
    label: 'Perf',
    Icon: BarChart3,
    match: ['/pilotage'],
    ownerOnly: true,
  },
  // V33 — Onglet Outils : tout ce qui était dans Plus mais qui est un outil
  // métier (alertes, audit, journal santé, protocoles, stocks, fournisseurs).
  // La page Plus garde uniquement les réglages (profil, ferme, équipe…).
  {
    id: 'outils',
    path: '/outils',
    label: 'Outils',
    Icon: Wrench,
    match: [
      '/outils',
      '/alerts',
      '/alertes',
      '/audit',
      '/controle',
      '/sante',
      '/protocoles',
      '/ressources',
      '/fournisseurs',
    ],
  },
  {
    id: 'more',
    path: '/more',
    label: 'Plus',
    Icon: MoreHorizontal,
    match: [
      '/more',
      '/admin',
      '/aide',
      '/notes',
    ],
  },
];

const ACCENT = 'var(--color-accent-500)';

/* ── NavTab ──────────────────────────────────────────────────────────────── */

interface NavTabProps {
  tab: NavTabDef;
  isActive: boolean;
  onSelect: (path: string) => void;
  badgeCount?: number;
  /** Accent module (RT4) : couleur de l'underline actif en plus de l'accent global. */
  moduleAccent?: string;
}

const NavTab: React.FC<NavTabProps> = ({ tab, isActive, onSelect, badgeCount, moduleAccent }) => {
  const { Icon, label, path } = tab;
  // RT4 : on garde ACCENT comme couleur principale (texte+icône), et on ajoute
  // l'accent module sur l'underline pour différencier visuellement.
  const underlineColor = moduleAccent ?? ACCENT;
  return (
    <li className="relative" role="presentation">
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 top-0"
          style={{
            width: 32,
            height: 2,
            background: underlineColor,
            borderRadius: '0 0 2px 2px',
          }}
        />
      )}
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-current={isActive ? 'page' : undefined}
        aria-label={label}
        onClick={() => onSelect(path)}
        className={cn(
          'relative flex h-full w-full flex-col items-center justify-center gap-1 px-1 min-h-[56px]',
          'transition-transform active:scale-[0.96]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
        )}
        style={{
          transitionDuration: '160ms',
          transitionTimingFunction: 'var(--ease-emil)',
          outlineColor: isActive ? ACCENT : undefined,
        }}
      >
        <span className="relative inline-flex">
          <Icon
            size={24}
            strokeWidth={2}
            className="block transition-[color] duration-[180ms]"
            style={{ color: isActive ? ACCENT : 'var(--muted)' }}
          />
          {badgeCount && badgeCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-2 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
              style={{
                background: 'var(--red, #dc2626)',
                color: 'var(--bg-surface, #fff)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          ) : null}
        </span>
        <span
          className="text-[11px] font-semibold leading-none transition-[color] duration-[180ms]"
          style={{
            fontFamily: 'var(--font-body)',
            color: isActive ? ACCENT : 'var(--ink-soft, var(--muted))',
          }}
        >
          {label}
        </span>
      </button>
    </li>
  );
};

/* ── Active tab resolver ─────────────────────────────────────────────────── */

function resolveActiveTab(pathname: string): TabId {
  // Priorité aux matches les plus longs (préfixe le plus spécifique gagne).
  // Évite que /cycles/repro soit attribué à "Élevage" (match /cycles) alors
  // qu'il appartient à "Repro" (match /cycles/repro).
  let bestId: TabId = 'today';
  let bestLen = -1;
  for (const tab of TABS) {
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

/* ── AgritechNavV2 ───────────────────────────────────────────────────────── */

const AgritechNavV2: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const { alerts, alertesServeur } = usePilotage();

  const activeTabId = resolveActiveTab(location.pathname);
  // RT4 : déduit le module courant pour colorer l'underline de la tab active.
  const moduleAccent = getModuleTone(inferModuleFromPath(location.pathname)).fg;

  const visibleTabs = useMemo(
    () => TABS.filter((t) => !t.ownerOnly || isOwner),
    [isOwner]
  );

  const todayBadgeCount = useMemo(() => {
    const local = alerts.filter(
      (a) => a.priority === 'CRITIQUE' || a.priority === 'HAUTE'
    ).length;
    const server = alertesServeur.filter(
      (a) => a.priorite === 'CRITIQUE' || a.priorite === 'HAUTE'
    ).length;
    return local + server;
  }, [alerts, alertesServeur]);

  const isMobile = useMediaQuery('(max-width: 1023px)');

  const hideOn = ['/checklist/', '/controle/checklist'];
  if (!isMobile) return null;
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;

  const colCount = visibleTabs.length;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[1000]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--line)',
          boxShadow: '0 -1px 0 rgba(0,0,0,0.04)',
        }}
        aria-label="Navigation principale"
      >
        <ul
          role="tablist"
          aria-label="Onglets principaux"
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            padding: '8px 4px 6px',
            minHeight: 68,
          }}
        >
          {visibleTabs.map((tab) => (
            <NavTab
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onSelect={navigate}
              badgeCount={tab.id === 'today' ? todayBadgeCount : undefined}
              moduleAccent={activeTabId === tab.id ? moduleAccent : undefined}
            />
          ))}
        </ul>
      </nav>

      {/* FAB amber retiré (V19 Sprint 1) — fusionné dans SaisirFAB.
          QuickActionsProvider + useQuickActions restent utilisés ailleurs. */}
    </>
  );
};

export default AgritechNavV2;
