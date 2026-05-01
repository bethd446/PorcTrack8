import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { IonToast } from '@ionic/react';
import {
  Inbox,
  PawPrint,
  Package,
  BarChart3,
  MoreHorizontal,
  Heart,
  Syringe,
  FileText,
  Scale,
  AlertOctagon,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePilotage } from '../context/PilotageContext';
import { cn } from '../lib/utils';
import { BottomSheet } from './agritech';
import QuickSaillieForm from './forms/QuickSaillieForm';
import QuickPeseeForm from './forms/QuickPeseeForm';
import QuickHealthForm from './forms/QuickHealthForm';
import QuickNoteForm from './forms/QuickNoteForm';
import QuickMortalityForm from './forms/QuickMortalityForm';

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
      <QuickPeseeForm isOpen={kind === 'pesee'} onClose={closeSheet} />
      <QuickMortalityForm
        isOpen={kind === 'mortalite'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Mortalité enregistrée' });
          closeSheet();
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

type TabId = 'today' | 'cheptel' | 'pilotage' | 'ressources' | 'more';

interface NavTabDef {
  id: TabId;
  path: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  match: string[];
  ownerOnly?: boolean;
}

const TABS: NavTabDef[] = [
  {
    id: 'today',
    path: '/today',
    label: 'Aujourd’hui',
    Icon: Inbox,
    match: ['/today', '/audit', '/alerts'],
  },
  {
    id: 'cheptel',
    path: '/troupeau',
    label: 'Cheptel',
    Icon: PawPrint,
    match: ['/troupeau', '/cycles', '/cheptel', '/bandes'],
  },
  {
    id: 'pilotage',
    path: '/pilotage',
    label: 'Pilotage',
    Icon: BarChart3,
    match: ['/pilotage'],
    ownerOnly: true,
  },
  {
    id: 'ressources',
    path: '/ressources',
    label: 'Ressources',
    Icon: Package,
    match: ['/ressources', '/stock'],
  },
  {
    id: 'more',
    path: '/more',
    label: 'Plus',
    Icon: MoreHorizontal,
    match: ['/more', '/aide', '/admin'],
  },
];

const ACCENT = 'var(--color-accent-500)';

/* ── NavTab ──────────────────────────────────────────────────────────────── */

interface NavTabProps {
  tab: NavTabDef;
  isActive: boolean;
  onSelect: (path: string) => void;
  badgeCount?: number;
}

const NavTab: React.FC<NavTabProps> = ({ tab, isActive, onSelect, badgeCount }) => {
  const { Icon, label, path } = tab;
  return (
    <li className="relative" role="presentation">
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 top-0"
          style={{
            width: 32,
            height: 2,
            background: ACCENT,
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
                fontFamily: 'BricolageGrotesque, sans-serif',
              }}
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          ) : null}
        </span>
        <span
          className="text-[11px] font-semibold leading-none transition-[color] duration-[180ms]"
          style={{
            fontFamily: 'InstrumentSans, sans-serif',
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
  for (const tab of TABS) {
    for (const m of tab.match) {
      if (pathname === m || pathname.startsWith(m + '/')) return tab.id;
    }
  }
  return 'today';
}

/* ── FAB Menu (action métier) ────────────────────────────────────────────── */

type FABMenuAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'accent' | 'amber' | 'red';
};

const TONE_BG: Record<NonNullable<FABMenuAction['tone']>, string> = {
  default: 'var(--bg-2, #f3f4f6)',
  accent: 'color-mix(in srgb, var(--color-accent-500) 14%, transparent)',
  amber: 'color-mix(in srgb, var(--amber-pork, #F4A261) 18%, transparent)',
  red: 'color-mix(in srgb, var(--red, #dc2626) 14%, transparent)',
};

const TONE_FG: Record<NonNullable<FABMenuAction['tone']>, string> = {
  default: 'var(--ink, #111827)',
  accent: 'var(--color-accent-500)',
  amber: 'var(--amber-pork, #F4A261)',
  red: 'var(--red, #dc2626)',
};

const FABMenu: React.FC<{ actions: FABMenuAction[]; isOpen: boolean; onClose: () => void }> = ({
  actions,
  isOpen,
  onClose,
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Actions rapides">
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((a) => {
            const tone = a.tone ?? 'default';
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  a.onClick();
                  onClose();
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-2xl py-5 px-3',
                  'transition-transform active:scale-[0.96]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                )}
                style={{
                  background: 'var(--bg-surface, #fff)',
                  border: '1px solid var(--line, rgba(0,0,0,0.08))',
                  transitionTimingFunction: 'var(--ease-emil)',
                  transitionDuration: '160ms',
                }}
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}
                  aria-hidden="true"
                >
                  {a.icon}
                </span>
                <span
                  className="text-[13px] font-semibold leading-tight text-center"
                  style={{
                    fontFamily: 'InstrumentSans, sans-serif',
                    color: 'var(--ink, #111827)',
                  }}
                >
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
};

/* ── AgritechNavV2 ───────────────────────────────────────────────────────── */

const AgritechNavV2: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAction } = useQuickActions();
  const { isOwner } = useAuth();
  const { alerts, alertesServeur } = usePilotage();

  const [fabOpen, setFabOpen] = useState(false);

  const activeTabId = resolveActiveTab(location.pathname);

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

  const fabActions: FABMenuAction[] = useMemo(
    () => [
      {
        id: 'saillie',
        label: 'Saillie',
        icon: <Heart size={20} />,
        onClick: () => openAction('saillie'),
        tone: 'accent',
      },
      {
        id: 'soin',
        label: 'Soin',
        icon: <Syringe size={20} />,
        onClick: () => openAction('soin'),
        tone: 'accent',
      },
      {
        id: 'note',
        label: 'Note',
        icon: <FileText size={20} />,
        onClick: () => openAction('note'),
        tone: 'default',
      },
      {
        id: 'pesee',
        label: 'Pesée',
        icon: <Scale size={20} />,
        onClick: () => openAction('pesee'),
        tone: 'accent',
      },
      {
        id: 'mortalite',
        label: 'Mortalité',
        icon: <AlertOctagon size={20} />,
        onClick: () => openAction('mortalite'),
        tone: 'red',
      },
      {
        id: 'marius',
        label: 'Marius IA',
        icon: <Sparkles size={20} />,
        onClick: () => window.dispatchEvent(new Event('open-chatbot')),
        tone: 'amber',
      },
    ],
    [openAction]
  );

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
            />
          ))}
        </ul>
      </nav>

      <button
        type="button"
        onClick={() => setFabOpen(true)}
        aria-label="Actions rapides"
        aria-expanded={fabOpen}
        aria-haspopup="menu"
        className={cn(
          'fixed left-1/2 -translate-x-1/2 z-40',
          'h-14 w-14 rounded-full',
          'flex items-center justify-center',
          'shadow-lg transition-transform active:scale-[0.94]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        )}
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + 80px)`,
          background: 'var(--amber-pork, #F4A261)',
          color: '#fff',
          boxShadow: '0 8px 22px -6px color-mix(in srgb, var(--amber-pork, #F4A261) 55%, transparent)',
          transitionDuration: '180ms',
          transitionTimingFunction: 'var(--ease-emil)',
          outlineColor: 'var(--amber-pork, #F4A261)',
        }}
      >
        <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
      </button>

      <FABMenu actions={fabActions} isOpen={fabOpen} onClose={() => setFabOpen(false)} />
    </>
  );
};

export default AgritechNavV2;
