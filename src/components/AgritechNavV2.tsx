import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IonToast } from '@ionic/react';
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  Heart,
  Syringe,
  FileText,
  Scale,
  AlertOctagon,
  Activity,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { FAB, BottomSheet } from './agritech';
import type { FABAction } from './agritech';
import QuickSaillieForm from './forms/QuickSaillieForm';
import QuickPeseeForm from './forms/QuickPeseeForm';
import QuickHealthForm from './forms/QuickHealthForm';
import QuickNoteForm from './forms/QuickNoteForm';

/* ═════════════════════════════════════════════════════════════════════════
   AgritechNavV2 — 4 onglets + FAB central contextuel
   ─────────────────────────────────────────────────────────────────────────
   Remplace l'ancienne AgritechNav 5 onglets. Cycles disparait du tab bar
   (accessible via hub Cockpit / long-press FAB / route /cycles directe).
   ═════════════════════════════════════════════════════════════════════════ */

/* ── QuickActions Context ────────────────────────────────────────────────── */

export type QuickActionKind = 'saillie' | 'soin' | 'note' | 'pesee' | 'mortalite';

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

/**
 * QuickActionsProvider — monte les sheets des formulaires quick une seule
 * fois au niveau global, et expose `openAction(kind)` via React Context.
 *
 * Doit wrapper <Routes> dans App.tsx, au-dessus de <AgritechNavV2 />.
 */
export const QuickActionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [kind, setKind] = useState<QuickActionKind | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const openAction = useCallback((k: QuickActionKind) => {
    if (k === 'mortalite') {
      // Mortalité : form pas encore implémenté — placeholder toast.
      setToast({
        open: true,
        message: 'Saisie mortalité : bientôt disponible',
      });
      return;
    }
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

      {/* ── Quick forms (montés une seule fois au niveau global) ──────── */}
      <QuickSaillieForm isOpen={kind === 'saillie'} onClose={closeSheet} />
      <QuickPeseeForm isOpen={kind === 'pesee'} onClose={closeSheet} />

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

type TabId = 'cockpit' | 'troupeau' | 'ressources' | 'pilotage';

interface NavTabDef {
  id: TabId;
  path: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  accent: string;
  match?: string[];
}

const TABS: NavTabDef[] = [
  {
    id: 'cockpit',
    path: '/',
    label: 'Cockpit',
    Icon: LayoutDashboard,
    accent: 'var(--accent-cockpit)',
  },
  {
    id: 'troupeau',
    path: '/troupeau',
    label: 'Troupeau',
    Icon: Users,
    accent: 'var(--accent-troupeau)',
    match: ['/troupeau', '/cheptel', '/bandes'],
  },
  {
    id: 'ressources',
    path: '/ressources',
    label: 'Ressources',
    Icon: Package,
    accent: 'var(--accent-ressources)',
    match: ['/ressources', '/stock'],
  },
  {
    id: 'pilotage',
    path: '/pilotage',
    label: 'Pilotage',
    Icon: BarChart3,
    accent: 'var(--accent-pilotage)',
    match: ['/pilotage', '/alerts', '/more', '/audit', '/sync'],
  },
];

/* ── NavTab (composant interne) ──────────────────────────────────────────── */

interface NavTabProps {
  tab: NavTabDef;
  isActive: boolean;
  onSelect: (path: string) => void;
}

const NavTab: React.FC<NavTabProps> = ({ tab, isActive, onSelect }) => {
  const { Icon, label, accent, path } = tab;
  return (
    <li className="relative" role="presentation">
      {/* Indicateur top (barre 2px width 20px, centré, même couleur accent) */}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 top-0 h-[2px] w-5 rounded-full transition-snappy"
          style={{ backgroundColor: accent }}
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
          'pressable flex h-full w-full flex-col items-center justify-center gap-1 px-1',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
          isActive ? 'bg-bg-1' : ''
        )}
        style={
          isActive
            ? ({
                outlineColor: accent,
                borderTop: `1px solid ${accent}33`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <Icon
          size={20}
          strokeWidth={isActive ? 2.2 : 1.7}
          className="block transition-snappy"
          style={{ color: isActive ? accent : 'var(--color-text-2)' }}
        />
        <span
          className={cn(
            'font-mono text-[10.5px] font-semibold uppercase tracking-wide leading-none transition-snappy'
          )}
          style={{ color: isActive ? accent : 'var(--color-text-2)' }}
        >
          {label}
        </span>
      </button>
    </li>
  );
};

/* ── Active tab resolver ─────────────────────────────────────────────────── */

function resolveActiveTab(pathname: string): TabId | null {
  // Exact `/` match = cockpit ; sinon on teste les `match` prefix.
  if (pathname === '/') return 'cockpit';
  for (const tab of TABS) {
    if (tab.id === 'cockpit') continue;
    const prefixes = tab.match ?? [tab.path];
    if (prefixes.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname === p)) {
      return tab.id;
    }
  }
  return null;
}

/* ── AgritechNavV2 ───────────────────────────────────────────────────────── */

const AgritechNavV2: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAction } = useQuickActions();

  const activeTabId = resolveActiveTab(location.pathname);

  /* ── Long-press sur le FAB → /cycles ────────────────────────────────── */
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const startLongPress = useCallback(() => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      navigate('/cycles');
    }, 550);
  }, [navigate]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  /* ── FAB actions ────────────────────────────────────────────────────── */
  const fabActions: FABAction[] = useMemo(
    () => [
      {
        icon: <Heart size={18} />,
        label: 'Saillie',
        onClick: () => openAction('saillie'),
        tone: 'accent',
      },
      {
        icon: <Syringe size={18} />,
        label: 'Soin',
        onClick: () => openAction('soin'),
        tone: 'accent',
      },
      {
        icon: <FileText size={18} />,
        label: 'Note',
        onClick: () => openAction('note'),
        tone: 'default',
      },
      {
        icon: <Scale size={18} />,
        label: 'Pesée',
        onClick: () => openAction('pesee'),
        tone: 'accent',
      },
      {
        icon: <AlertOctagon size={18} />,
        label: 'Mortalité',
        onClick: () => openAction('mortalite'),
        tone: 'red',
      },
    ],
    [openAction]
  );

  /* ── Render ─────────────────────────────────────────────────────────── */

  // Hide on immersive flows (identique à l'ancienne nav).
  // Placé APRÈS les hooks pour respecter react-hooks/rules-of-hooks.
  const hideOn = ['/checklist/', '/controle/checklist'];
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;

  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[1000] bg-bg-0 border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigation principale"
      >
        <ul
          role="tablist"
          aria-label="Onglets principaux"
          className="grid grid-cols-5 h-16"
        >
          {leftTabs.map((tab) => (
            <NavTab
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onSelect={navigate}
            />
          ))}

          {/* Placeholder central — occupé visuellement par le FAB. */}
          <li
            role="presentation"
            className="relative flex items-center justify-center"
            aria-hidden="true"
          >
            {/* Mini label 'Cycles' sous le FAB (long-press hint) */}
            <span
              className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[9px] font-semibold uppercase tracking-wide leading-none opacity-40 pointer-events-none select-none"
              style={{ color: 'var(--accent-cycles)' }}
            >
              <Activity size={10} className="inline-block mr-0.5 -mt-0.5" aria-hidden="true" />
              Cycles
            </span>
          </li>

          {rightTabs.map((tab) => (
            <NavTab
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onSelect={navigate}
            />
          ))}
        </ul>
      </nav>

      {/* FAB central — positionné au-dessus de la nav. Long-press → /cycles. */}
      <div
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        <FAB actions={fabActions} ariaLabel="Actions rapides · long-press pour Cycles" />
      </div>
    </>
  );
};

export default AgritechNavV2;
