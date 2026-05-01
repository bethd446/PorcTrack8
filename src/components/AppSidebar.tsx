import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Heart,
  Layers,
  RotateCcw,
  BarChart3,
  Settings,
  PawPrint,
  Search,
  ChevronDown,
  CheckSquare,
  Inbox,
  Pill,
  Wheat,
  Users as UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePilotage } from '../context/PilotageContext';
import { useRecentNavigation, type RecentItem } from '../hooks/useRecentNavigation';
import { kvGet, kvSet } from '../services/kvStore';
import CommandPalette from './design/CommandPalette';

/**
 * AppSidebar — sidebar desktop ≥1024px (Option Bravo).
 *
 * Sections : Épinglé · Aujourd'hui · Cheptel · Pilotage · Ressources · Admin.
 * Cycles biologiques expandable, état persisté kvStore.
 * Trigger Cmd+K en haut, palette globale (CommandPalette).
 */

const SIDEBAR_WIDTH = 240;
const CYCLES_EXPANDED_KEY = 'sidebar_cycles_expanded';

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  count?: number;
}

const isMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
};

const RECENT_ICON: Record<RecentItem['kind'], LucideIcon> = {
  truie: PawPrint,
  verrat: Heart,
  bande: Layers,
  'mise-bas': RotateCcw,
  page: LayoutGrid,
};

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner, profile } = useAuth();
  const { criticalAlertCount } = usePilotage();
  const { items: recentItems } = useRecentNavigation();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cyclesExpanded, setCyclesExpanded] = useState<boolean>(() => {
    return kvGet(CYCLES_EXPANDED_KEY) !== '0';
  });

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleCycles = (): void => {
    setCyclesExpanded((prev) => {
      const next = !prev;
      void kvSet(CYCLES_EXPANDED_KEY, next ? '1' : '0');
      return next;
    });
  };

  const isActive = (href: string, prefixes?: string[]): boolean => {
    const list = prefixes ?? [href];
    return list.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + '/'),
    );
  };

  const showAdminSection = profile?.role === 'ADMIN';
  const showPilotageSection = isOwner;

  const cyclesItems: NavItem[] = useMemo(
    () => [
      { label: 'Reproduction', icon: RotateCcw, href: '/cycles/repro' },
      { label: 'Maternité', icon: RotateCcw, href: '/cycles/maternite' },
      { label: 'Post-sevrage', icon: RotateCcw, href: '/cycles/post-sevrage' },
      { label: 'Croissance', icon: RotateCcw, href: '/cycles/croissance' },
      { label: 'Engraissement', icon: RotateCcw, href: '/cycles/engraissement' },
      { label: 'Finition', icon: RotateCcw, href: '/cycles/finition' },
      { label: 'Sortie', icon: RotateCcw, href: '/cycles/sortie' },
    ],
    [],
  );

  return (
    <>
      <aside
        aria-label="Navigation latérale"
        style={{
          width: SIDEBAR_WIDTH,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--line)',
          padding: '16px 0 24px',
          flexShrink: 0,
          overflowY: 'auto',
          fontFamily: 'InstrumentSans, system-ui, sans-serif',
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: '4px 18px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'BigShoulders, InstrumentSans, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '0.01em',
            }}
          >
            PorcTrack 8
          </span>
        </div>

        {/* Cmd+K trigger */}
        <div style={{ padding: '0 14px 14px' }}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Ouvrir la recherche globale"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-card)',
              color: 'var(--muted)',
              fontFamily: 'inherit',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background 200ms var(--ease-emil)',
            }}
          >
            <Search size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Rechercher</span>
            <kbd
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 10,
                padding: '1px 5px',
                border: '1px solid var(--line)',
                borderRadius: 4,
                color: 'var(--muted)',
                background: 'var(--bg-surface)',
              }}
            >
              {isMac() ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>
        </div>

        {/* Section Épinglé */}
        {recentItems.length > 0 ? (
          <Section title="Épinglé">
            {recentItems.map((it) => {
              const Icon = RECENT_ICON[it.kind] ?? LayoutGrid;
              return (
                <SidebarRow
                  key={it.path}
                  icon={Icon}
                  label={it.label}
                  active={location.pathname === it.path}
                  onClick={() => navigate(it.path)}
                />
              );
            })}
          </Section>
        ) : null}

        {/* Aujourd'hui */}
        <Section title="Aujourd'hui">
          <SidebarRow
            icon={Inbox}
            label="Inbox alertes"
            count={criticalAlertCount > 0 ? criticalAlertCount : undefined}
            active={isActive('/alerts', ['/alerts', '/pilotage/alertes'])}
            onClick={() => navigate('/alerts')}
          />
          <SidebarRow
            icon={CheckSquare}
            label="Audit du jour"
            active={isActive('/audit')}
            onClick={() => navigate('/audit')}
          />
          <SidebarRow
            icon={CheckSquare}
            label="Tâches"
            active={isActive('/today/tasks')}
            onClick={() => navigate('/audit')}
          />
        </Section>

        {/* Cheptel */}
        <Section title="Cheptel">
          <SidebarRow
            icon={Layers}
            label="Bandes"
            active={isActive('/troupeau/bandes')}
            onClick={() => navigate('/troupeau/bandes')}
          />
          <SidebarRow
            icon={PawPrint}
            label="Truies & Verrats"
            active={
              location.pathname === '/troupeau' ||
              isActive('/troupeau/truies') ||
              isActive('/troupeau/verrats')
            }
            onClick={() => navigate('/troupeau')}
          />
        </Section>

        {/* Cycles */}
        <Section title="Cycles">
          <SidebarRow
            icon={RotateCcw}
            label="Cycles · Vue globale"
            expandable
            expanded={cyclesExpanded}
            active={location.pathname === '/cycles'}
            onClick={toggleCycles}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateRows: cyclesExpanded ? '1fr' : '0fr',
              transition: 'grid-template-rows 240ms var(--ease-emil)',
              overflow: 'hidden',
            }}
          >
            <div style={{ minHeight: 0 }}>
              <SidebarRow
                icon={RotateCcw}
                label="Vue globale"
                indent
                active={location.pathname === '/cycles'}
                onClick={() => navigate('/cycles')}
              />
              {cyclesItems.map((c) => (
                <SidebarRow
                  key={c.href}
                  icon={c.icon}
                  label={c.label}
                  indent
                  active={isActive(c.href)}
                  onClick={() => navigate(c.href)}
                />
              ))}
            </div>
          </div>
        </Section>

        {/* Pilotage */}
        {showPilotageSection ? (
          <Section title="Pilotage">
            <SidebarRow
              icon={BarChart3}
              label="KPIs"
              active={isActive('/pilotage/perf')}
              onClick={() => navigate('/pilotage/perf')}
            />
            <SidebarRow
              icon={BarChart3}
              label="Finances"
              active={
                isActive('/pilotage/finances') &&
                !location.pathname.startsWith('/pilotage/finances/rapport')
              }
              onClick={() => navigate('/pilotage/finances')}
            />
            <SidebarRow
              icon={BarChart3}
              label="Rapports"
              active={isActive('/pilotage/finances/rapport')}
              onClick={() => navigate('/pilotage/finances/rapport')}
            />
            <SidebarRow
              icon={BarChart3}
              label="Prévisions"
              active={isActive('/pilotage/previsions')}
              onClick={() => navigate('/pilotage/previsions')}
            />
          </Section>
        ) : null}

        {/* Ressources */}
        <Section title="Ressources">
          <SidebarRow
            icon={Wheat}
            label="Aliments"
            active={isActive('/ressources/aliments')}
            onClick={() => navigate('/ressources/aliments')}
          />
          <SidebarRow
            icon={Pill}
            label="Pharmacie"
            active={isActive('/ressources/pharmacie')}
            onClick={() => navigate('/ressources/pharmacie')}
          />
        </Section>

        {/* Admin */}
        {showAdminSection ? (
          <Section title="Admin">
            <SidebarRow
              icon={UsersIcon}
              label="Utilisateurs"
              active={isActive('/admin')}
              onClick={() => navigate('/admin')}
            />
            <SidebarRow
              icon={Settings}
              label="Ferme & Système"
              active={isActive('/more')}
              onClick={() => navigate('/more')}
            />
          </Section>
        ) : null}

        {/* fallback non-owner : accès aux paramètres ferme limité, mais on garde Réglages */}
        {!showAdminSection ? (
          <Section title="Système">
            <SidebarRow
              icon={Settings}
              label="Réglages"
              active={isActive('/more')}
              onClick={() => navigate('/more')}
            />
          </Section>
        ) : null}

      </aside>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div style={{ marginBottom: 4 }}>
    <div
      style={{
        fontFamily: 'DMMono, ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.20em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        padding: '12px 18px 4px',
        fontWeight: 600,
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

interface SidebarRowProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  count?: number;
  expandable?: boolean;
  expanded?: boolean;
  indent?: boolean;
  onClick: () => void;
}

const SidebarRow: React.FC<SidebarRowProps> = ({
  icon: Icon,
  label,
  active = false,
  count,
  expandable = false,
  expanded = false,
  indent = false,
  onClick,
}) => {
  const [hover, setHover] = useState(false);
  const bg = active
    ? 'var(--color-accent-100)'
    : hover
      ? 'var(--bg-surface-2)'
      : 'transparent';
  const fg = active ? 'var(--color-accent-500)' : 'var(--ink-soft)';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-current={active ? 'page' : undefined}
      aria-expanded={expandable ? expanded : undefined}
      style={{
        width: '100%',
        background: bg,
        color: fg,
        borderTop: 0,
        borderRight: 0,
        borderBottom: 0,
        borderLeft: `3px solid ${active ? 'var(--color-accent-500)' : 'transparent'}`,
        padding: indent ? '6px 18px 6px 42px' : '8px 14px 8px 18px',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        textAlign: 'left',
        transition:
          'background 240ms var(--ease-emil), color 240ms var(--ease-emil)',
        minHeight: 32,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          color: active ? 'var(--color-accent-500)' : 'var(--muted)',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={indent ? 14 : 18} />
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {count !== undefined && count > 0 ? (
        <span
          style={{
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 10,
            color: active ? 'var(--color-accent-500)' : 'var(--muted)',
            background: active ? 'transparent' : 'var(--bg-surface-2)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-pill)',
            letterSpacing: '0.04em',
          }}
        >
          {count}
        </span>
      ) : null}
      {expandable ? (
        <span
          aria-hidden
          style={{
            color: 'var(--muted)',
            display: 'inline-flex',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 240ms var(--ease-emil)',
          }}
        >
          <ChevronDown size={14} />
        </span>
      ) : null}
    </button>
  );
};

export default AppSidebar;
