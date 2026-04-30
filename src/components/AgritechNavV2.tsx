import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { IonToast } from '@ionic/react';
import {
  LayoutGrid,
  PawPrint,
  Package,
  BarChart3,
  Heart,
  Syringe,
  FileText,
  Scale,
  AlertOctagon,
  RotateCcw,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

const useQuickActions = (): QuickActionsContextValue => {
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

type TabId = 'cockpit' | 'troupeau' | 'cycles' | 'ressources' | 'pilotage';

interface NavTabDef {
  id: TabId;
  path: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  accent: string;
  match?: string[];
}

const ACCENT = 'var(--color-accent-500)';

const TABS: NavTabDef[] = [
  {
    id: 'cockpit',
    path: '/',
    label: 'Cockpit',
    Icon: LayoutGrid,
    accent: ACCENT,
  },
  {
    id: 'troupeau',
    path: '/troupeau',
    label: 'Troupeau',
    Icon: PawPrint,
    accent: ACCENT,
    match: ['/troupeau', '/cheptel', '/bandes'],
  },
  {
    id: 'cycles',
    path: '/cycles',
    label: 'Cycles',
    Icon: RotateCcw,
    accent: ACCENT,
    match: ['/cycles', '/controle'],
  },
  {
    id: 'ressources',
    path: '/ressources',
    label: 'Ressources',
    Icon: Package,
    accent: ACCENT,
    match: ['/ressources', '/stock'],
  },
  {
    id: 'pilotage',
    path: '/pilotage',
    label: 'Pilotage',
    Icon: BarChart3,
    accent: ACCENT,
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
      {/* Top border 2px accent quand actif */}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 top-0"
          style={{
            width: 32,
            height: 2,
            background: accent,
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
          'pressable flex h-full w-full flex-col items-center justify-center gap-1 px-1 min-h-[56px]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
        )}
        style={isActive ? ({ outlineColor: accent } as React.CSSProperties) : undefined}
      >
        <Icon
          size={24}
          strokeWidth={2}
          className="block transition-[color] duration-[180ms]"
          style={{ color: isActive ? accent : 'var(--muted)' }}
        />
        <span
          className="text-[11px] font-semibold leading-none transition-[color] duration-[180ms]"
          style={{
            fontFamily: 'InstrumentSans, sans-serif',
            color: isActive ? accent : 'var(--muted)',
          }}
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
  const { isOwner } = useAuth();

  const activeTabId = resolveActiveTab(location.pathname);

  const visibleTabs = useMemo(() => {
    return TABS.filter(tab => {
      if (tab.id === 'pilotage') return isOwner;
      return true;
    });
  }, [isOwner]);

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
          className={cn("grid", isOwner ? "grid-cols-5" : "grid-cols-4")}
          style={{ padding: '8px 4px 6px', minHeight: 68 }}
        >
          {visibleTabs.map((tab) => (
            <NavTab
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onSelect={navigate}
            />
          ))}
        </ul>
      </nav>

      {/* FAB — actions rapides. Cycles est maintenant un onglet à part entière. */}
      <FAB actions={fabActions} ariaLabel="Actions rapides" />
    </>
  );
};

export default AgritechNavV2;
