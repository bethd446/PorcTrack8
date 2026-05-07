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
  Inbox,
  Pill,
  Wheat,
  Users as UsersIcon,
  Home,
  HeartPulse,
  Calendar,
  Baby,
  Truck,
  HelpCircle,
  Trophy,
  ClipboardCheck,
  BookOpen,
  Stethoscope,
  Boxes,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePilotage } from '../context/PilotageContext';
import { useTroupeau } from '../context/TroupeauContext';
import { useRecentNavigation, type RecentItem } from '../hooks/useRecentNavigation';
import { kvGet, kvSet } from '../services/kvStore';
import { inferModuleFromPath, getModuleTone } from '../lib/moduleColor';
import CommandPalette from './design/CommandPalette';
import { Button } from '@/design-system';

/**
 * AppSidebar — sidebar desktop ≥1024px (V70 parity).
 *
 * Sections V70 : Épinglé · Aujourd’hui · Élevage · Repro · Pilotage · Outils · Plus.
 * Aligné sur la bottom tab bar mobile V70 (AgritechNavV2) : 5 onglets principaux
 * + section Plus. Cycles biologiques expandable sous "Élevage", état persisté kvStore.
 * Trigger Cmd+K en haut, palette globale (CommandPalette).
 */

const SIDEBAR_WIDTH = 240;
const CYCLES_EXPANDED_KEY = 'sidebar_cycles_expanded';

// Page hub Reproduction (Agent B3 V22) — page dédiée fil conducteur
// saillie → écho → MB → sevrage avec KPIs repro.
const REPRODUCTION_HUB_HREF = '/reproduction';

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
  const { bandes } = useTroupeau();
  const { items: recentItems } = useRecentNavigation();

  // Resolve bande UUID → idPortee for the "Épinglé" pills.
  // If a bande recent item has no resolvable idPortee, we hide it.
  const resolvedRecentItems = useMemo(() => {
    return recentItems
      .map((it) => {
        if (it.kind !== 'bande') return it;
        const m = it.path.match(/^\/troupeau\/bandes\/([^/]+)$/);
        const id = m ? decodeURIComponent(m[1]) : '';
        const bande = bandes.find((b) => b.id === id || b.idPortee === id);
        const display = bande?.idPortee?.trim();
        if (!display) return null;
        return { ...it, label: `Bande ${display}` };
      })
      .filter((it): it is RecentItem => it !== null);
  }, [recentItems, bandes]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const isOnCyclesRoute = location.pathname.startsWith('/cycles');
  const [cyclesUserOverride, setCyclesUserOverride] = useState<boolean | null>(() => {
    const v = kvGet(CYCLES_EXPANDED_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
    return null;
  });
  const cyclesExpanded = cyclesUserOverride ?? isOnCyclesRoute;

  // Auto-reset override quand on entre/sort de /cycles : on aligne sur la route et on
  // efface l'override pour repartir d'un état dérivé propre.
  useEffect(() => {
    setCyclesUserOverride(null);
    void kvSet(CYCLES_EXPANDED_KEY, '');
  }, [isOnCyclesRoute]);

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
    const next = !cyclesExpanded;
    setCyclesUserOverride(next);
    void kvSet(CYCLES_EXPANDED_KEY, next ? '1' : '0');
  };

  const isActive = (href: string, prefixes?: string[]): boolean => {
    const list = prefixes ?? [href];
    return list.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + '/'),
    );
  };

  // RT4 : accent module dérivé du href de chaque row. Permet de colorer la
  // border-left active d'une teinte cohérente avec la zone fonctionnelle.
  const accentFor = (href: string): string =>
    getModuleTone(inferModuleFromPath(href)).fg;

  const showAdminItem = profile?.role === 'ADMIN';
  const showPerformanceSection = isOwner;

  const cyclesItems: NavItem[] = useMemo(
    () => [
      { label: 'Reproduction', icon: RotateCcw, href: '/reproduction' },
      { label: 'Calendrier saillies', icon: RotateCcw, href: '/cycles/repro' },
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
          fontFamily: 'var(--font-body)',
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
              fontFamily: 'var(--font-heading)',
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
          <Button
            type="button"
            variant="ghost"
            size="small"
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
              textTransform: 'none',
              height: 'auto',
              justifyContent: 'flex-start',
            }}
          >
            <Search size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Rechercher</span>
            <kbd
              style={{
                fontFamily: 'var(--font-mono)',
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
          </Button>
        </div>

        {/* Section Épinglé (dynamique) */}
        {resolvedRecentItems.length > 0 ? (
          <Section title="Épinglé">
            {resolvedRecentItems.map((it) => {
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

        {/* 1. Aujourd’hui */}
        <Section title="Aujourd’hui">
          <SidebarRow
            icon={Home}
            label="Aperçu du jour"
            active={isActive('/today')}
            onClick={() => navigate('/today')}
          />
          <SidebarRow
            icon={Inbox}
            label="Toutes les alertes"
            count={criticalAlertCount > 0 ? criticalAlertCount : undefined}
            active={isActive('/alerts', ['/alerts', '/pilotage/alertes'])}
            onClick={() => navigate('/alerts')}
          />
        </Section>

        {/* 2. Élevage (V70) — troupeau + cycles biologiques expandable */}
        <Section title="Élevage">
          <SidebarRow
            icon={PawPrint}
            label="Tout le troupeau"
            active={isActive('/troupeau') && !isActive('/troupeau/classement')}
            onClick={() => navigate('/troupeau')}
          />
          <SidebarRow
            icon={RotateCcw}
            label="Cycles biologiques"
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
              {cyclesItems
                .filter((c) => c.href !== '/reproduction' && c.href !== '/cycles/repro')
                .map((c) => (
                  <SidebarRow
                    key={c.href}
                    icon={c.icon}
                    label={c.label}
                    indent
                    active={isActive(c.href)}
                    onClick={() => navigate(c.href)}
                    moduleAccent={accentFor(c.href)}
                  />
                ))}
            </div>
          </div>
        </Section>

        {/* 3. Repro (V70) — vue, calendrier saillies, lots */}
        <Section title="Repro">
          <SidebarRow
            icon={HeartPulse}
            label="Vue reproduction"
            active={location.pathname === '/reproduction'}
            onClick={() => navigate(REPRODUCTION_HUB_HREF)}
            moduleAccent={accentFor('/reproduction')}
          />
          <SidebarRow
            icon={Calendar}
            label="Calendrier saillies"
            active={isActive('/cycles/repro')}
            onClick={() => navigate('/cycles/repro')}
            moduleAccent={accentFor('/cycles/repro')}
          />
          <SidebarRow
            icon={Layers}
            label="Lots"
            active={isActive('/reproduction/lots')}
            onClick={() => navigate('/reproduction/lots')}
            moduleAccent={accentFor('/reproduction/lots')}
          />
          <SidebarRow
            icon={Baby}
            label="Maternité"
            active={isActive('/cycles/maternite')}
            onClick={() => navigate('/cycles/maternite')}
            moduleAccent={accentFor('/cycles/maternite')}
          />
        </Section>

        {/* 4. Pilotage (V70, OWNER only) — KPIs, Classement, Finances, Prévisions */}
        {showPerformanceSection ? (
          <Section title="Pilotage">
            <SidebarRow
              icon={LayoutGrid}
              label="Vue d’ensemble"
              active={isActive('/pilotage') && !isActive('/pilotage/perf') && !isActive('/pilotage/finances') && !isActive('/pilotage/previsions')}
              onClick={() => navigate('/pilotage')}
            />
            <SidebarRow
              icon={BarChart3}
              label="KPIs techniques"
              active={isActive('/pilotage/perf')}
              onClick={() => navigate('/pilotage/perf')}
            />
            <SidebarRow
              icon={Trophy}
              label="Classement"
              active={isActive('/troupeau/classement')}
              onClick={() => navigate('/troupeau/classement')}
              moduleAccent={accentFor('/troupeau/classement')}
            />
            <SidebarRow
              icon={BarChart3}
              label="Finances"
              active={isActive('/pilotage/finances')}
              onClick={() => navigate('/pilotage/finances')}
            />
            <SidebarRow
              icon={BarChart3}
              label="Prévisions"
              active={isActive('/pilotage/previsions')}
              onClick={() => navigate('/pilotage/previsions')}
            />
          </Section>
        ) : null}

        {/* 5. Outils (V70) — terrain + stocks fusionnés */}
        <Section title="Outils">
          <SidebarRow
            icon={ClipboardCheck}
            label="Contrôle quotidien"
            active={isActive('/controle')}
            onClick={() => navigate('/controle')}
          />
          <SidebarRow
            icon={Stethoscope}
            label="Journal santé"
            active={isActive('/sante')}
            onClick={() => navigate('/sante')}
            moduleAccent={accentFor('/sante')}
          />
          <SidebarRow
            icon={BookOpen}
            label="Protocoles"
            active={isActive('/protocoles')}
            onClick={() => navigate('/protocoles')}
          />
          <SidebarRow
            icon={Boxes}
            label="Stocks"
            active={isActive('/ressources') && !isActive('/ressources/aliments') && !isActive('/ressources/pharmacie')}
            onClick={() => navigate('/ressources')}
            moduleAccent={accentFor('/ressources')}
          />
          <SidebarRow
            icon={Wheat}
            label="Aliments"
            active={isActive('/ressources/aliments')}
            onClick={() => navigate('/ressources/aliments')}
            moduleAccent={accentFor('/ressources/aliments')}
          />
          <SidebarRow
            icon={Pill}
            label="Pharmacie"
            active={isActive('/ressources/pharmacie')}
            onClick={() => navigate('/ressources/pharmacie')}
            moduleAccent={accentFor('/ressources/pharmacie')}
          />
          <SidebarRow
            icon={Truck}
            label="Fournisseurs"
            active={isActive('/fournisseurs')}
            onClick={() => navigate('/fournisseurs')}
            moduleAccent={accentFor('/fournisseurs')}
          />
        </Section>

        {/* 6. Plus (V70) — Admin, Réglages, Aide */}
        <Section title="Plus">
          {showAdminItem ? (
            <SidebarRow
              icon={UsersIcon}
              label="Admin"
              active={isActive('/admin')}
              onClick={() => navigate('/admin')}
            />
          ) : null}
          <SidebarRow
            icon={Settings}
            label="Réglages"
            active={isActive('/more')}
            onClick={() => navigate('/more')}
          />
          <SidebarRow
            icon={HelpCircle}
            label="Aide"
            active={isActive('/aide')}
            onClick={() => navigate('/aide')}
          />
        </Section>

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
        fontFamily: 'var(--font-mono)',
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
  /** Accent module (RT4) : couleur de la border-left active (override). */
  moduleAccent?: string;
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
  moduleAccent,
}) => {
  const [hover, setHover] = useState(false);
  const bg = active
    ? 'var(--color-accent-100)'
    : hover
      ? 'var(--bg-surface-2)'
      : 'transparent';
  const fg = active ? 'var(--color-accent-500)' : 'var(--ink-soft)';
  // RT4 : si un accent module est fourni, il colore la border-left de
  // l'item actif. Le reste (texte, icône, bg) reste inchangé pour ne pas
  // casser le DS existant.
  const borderLeftColor = active
    ? (moduleAccent ?? 'var(--color-accent-500)')
    : 'transparent';

  return (
    <Button
      type="button"
      variant="ghost"
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
        borderLeft: `3px solid ${borderLeftColor}`,
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
        borderRadius: 0,
        textTransform: 'none',
        height: 'auto',
        justifyContent: 'flex-start',
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
            fontFamily: 'var(--font-mono)',
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
    </Button>
  );
};

export default AppSidebar;
