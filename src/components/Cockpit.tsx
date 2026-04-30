import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, IonToast } from '@ionic/react';
import {
  AlertOctagon,
  ChevronRight,
  Heart,
  Package,
  AlertTriangle,
  Plus,
  RefreshCw,
  Syringe,
  Scale,
  CloudOff,
  HelpCircle,
  Settings,
  Users,
  Baby,
  Home,
  LayoutDashboard,
  Activity,
  Layers,
  PackageSearch,
  TrendingUp,
  CalendarDays,
  Settings2,
  BellRing,
} from 'lucide-react';
import { FARM_CONFIG } from '../config/farm';
import { useMeta } from '../context/FarmContext';
import { useTroupeau } from '../context/TroupeauContext';
import { usePilotage } from '../context/PilotageContext';
import { useRessources } from '../context/RessourcesContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import {
  KpiCard as AgritechKpi,
  BottomSheet,
  SectionDivider,
  DataRow,
  HubTile,
  Chip,
} from './agritech';
import AgritechLayout from './AgritechLayout';
import QuickSaillieForm from './forms/QuickSaillieForm';
import QuickHealthForm from './forms/QuickHealthForm';
import QuickNoteForm from './forms/QuickNoteForm';
import QuickPeseeForm from './forms/QuickPeseeForm';
import ForecastWidget from './cockpit/ForecastWidget';
import Sidebar from './design/Sidebar';
import type { SidebarSection } from './design/Sidebar';
import KpiCardV6 from './design/KpiCard';
import TopBarSync from './design/TopBarSync';
import Eyebrow from './design/Eyebrow';
import type { FarmAlert, AlertPriority } from '../services/alertEngine';
import type { AlerteServeur, DataSource } from '../types/farm';
import { Bandes } from '../services/bandAnalysisEngine';
import { normaliseStatut } from '../lib/truieStatut';
import { usePhaseTransitions } from '../hooks/usePhaseTransitions';
import PhaseTransitionModal from './modals/PhaseTransitionModal';

/* ═════════════════════════════════════════════════════════════════════════
   COCKPIT · Refonte v6 « Terrain Vivant »
   ─────────────────────────────────────────────────────────────────────────
   Layout double :
   · Mobile (≤768) : version dense existante (KPI 2×2, sevrages retard,
     mon élevage, agenda, occupation loges, forecast, quick actions).
     AgritechNavV2 reste maître du bottom nav.
   · Desktop (≥768) : Sidebar 220px + TopBarSync (breadcrumb + sync +
     Marius FAB) + 4 KPI cards sparklines + perf bandes / alertes côte à
     côte + calendrier 7 jours.
   ═════════════════════════════════════════════════════════════════════════ */

const DAY_MS = 86_400_000;

/** Parse DD/MM/YYYY → Date | null. */
function parseFrDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

interface AgendaItem {
  id: string;
  label: string;
  daysFromNow: number;
  kind: 'MB' | 'SEV' | 'RETOUR' | 'ALERTE';
}

type QuickSheetKind = 'saillie' | 'soin' | 'note' | null;

const Cockpit: React.FC = () => {
  const navigate = useNavigate();
  const { truies, verrats, bandes } = useTroupeau();
  const { stockAliment, stockVeto } = useRessources();
  const { alerts, alertesServeur, saillies } = usePilotage();
  const { loading, dataSource, recomputeAlerts, lastUpdate } = useMeta();
  const { handleRefresh } = useAutoRefresh();

  const [sheet, setSheet] = useState<QuickSheetKind>(null);
  const [showSaillie, setShowSaillie] = useState(false);
  const [peseeOpen, setPeseeOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [pulse, setPulse] = useState(false);

  // ── Breakpoint desktop (≥768px) — défaut mobile pour SSR / tests jsdom ──
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(min-width: 768px)');
    const update = (): void => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const { current, confirm, dismiss } = usePhaseTransitions();

  // ── Auto-refresh alertes (Temps Réel) ───────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      recomputeAlerts();
    }, 60000);
    return () => clearInterval(timer);
  }, [recomputeAlerts]);

  // ── KPI agrégés ────────────────────────────────────────────────────────
  const kpiAlertesTotal = useMemo(
    () => alerts.length + alertesServeur.length,
    [alerts, alertesServeur]
  );

  useEffect(() => {
    if (kpiAlertesTotal > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [kpiAlertesTotal]);

  const kpiPleines = useMemo(
    () => truies.filter(t => normaliseStatut(t.statut) === 'PLEINE').length,
    [truies]
  );

  const kpiMaternite = useMemo(
    () => truies.filter(t => normaliseStatut(t.statut) === 'MATERNITE').length,
    [truies]
  );

  const kpiStocksRuptures = useMemo(() => {
    const a = stockAliment.filter(s => s.statutStock === 'RUPTURE').length;
    const v = stockVeto.filter(s => s.statutStock === 'RUPTURE').length;
    return a + v;
  }, [stockAliment, stockVeto]);

  const porteesReelles = useMemo(() => Bandes.filterReal(bandes), [bandes]);
  const materniteOcc = useMemo(() => Bandes.logesMaternite(truies), [truies]);
  const postSevrageOcc = useMemo(
    () => Bandes.logesPostSevrage(porteesReelles),
    [porteesReelles]
  );
  const engraissementOcc = useMemo(
    () => Bandes.logesEngraissement(porteesReelles),
    [porteesReelles]
  );

  // ── Stats élevage agrégées (Mon élevage) ───────────────────────────────
  const cheptelStats = useMemo(() => {
    const realBandes = porteesReelles;
    const vivants = realBandes.reduce((sum, b) => sum + (b.vivants ?? 0), 0);
    const sousMere = realBandes
      .filter(b => /sous/i.test(b.statut ?? ''))
      .reduce((sum, b) => sum + (b.vivants ?? 0), 0);
    const sevres = realBandes
      .filter(b => /sevr/i.test(b.statut ?? ''))
      .reduce((sum, b) => sum + (b.vivants ?? 0), 0);

    const postSevrageTotal = FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.reduce(
      (sum, loge) => sum + loge.porcelets,
      0
    );

    return {
      nbTruies: truies.length,
      nbVerrats: verrats.length,
      nbPorcelets: vivants,
      nbPorceletsSousMere: sousMere,
      nbPorceletsSevres: sevres,
      postSevrageTotal,
      totalCheptel: truies.length + verrats.length + vivants,
    };
  }, [truies, verrats, porteesReelles]);

  // ── KPIs desktop : valeurs + sparklines simulées 7j ─────────────────────
  const desktopKpis = useMemo(() => {
    const cheptelActif = cheptelStats.totalCheptel;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = today.getTime() - 7 * DAY_MS;
    const recentSaillies = (saillies ?? []).filter((s) => {
      const dt = parseFrDate(s.dateSaillie);
      return dt && dt.getTime() >= weekAgo;
    }).length;

    const bandesActives = porteesReelles.filter((b) => {
      const stat = (b.statut ?? '').toLowerCase();
      return !/sevr/i.test(stat) && !/vendu/i.test(stat) && !/archiv/i.test(stat);
    }).length;

    const alertesHaute = alerts.filter((a) => a.priority === 'HAUTE' || a.priority === 'CRITIQUE').length
      + alertesServeur.filter((a) => a.priorite === 'HAUTE' || a.priorite === 'CRITIQUE').length;

    // Sparklines : série 7 jours dérivée + bruit déterministe pour démo
    // (sera remplacée par une vraie série historique quand l'API la fournit).
    const ramp = (base: number) =>
      Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(base * (0.85 + 0.05 * i))));

    return {
      cheptelActif,
      cheptelSpark: ramp(cheptelActif || 1),
      saillies: recentSaillies,
      sailliesSpark: ramp(recentSaillies || 1),
      bandesActives,
      bandesSpark: ramp(bandesActives || 1),
      alertesHaute,
      alertesSpark: ramp(alertesHaute || 1),
    };
  }, [cheptelStats.totalCheptel, saillies, porteesReelles, alerts, alertesServeur]);

  // ── Top 3 bandes par NV (panneau perf bandes desktop) ───────────────────
  const topBandesNv = useMemo(() => {
    const list = porteesReelles.filter((b) => typeof b.nv === 'number' && (b.nv ?? 0) > 0);
    list.sort((a, b) => (b.nv ?? 0) - (a.nv ?? 0));
    return list.slice(0, 3);
  }, [porteesReelles]);

  const targetNv = 12;

  // ── Top 5 alertes (priorité décroissante) ──────────────────────────────
  const PRIORITY_ORDER: Record<AlertPriority, number> = {
    CRITIQUE: 0,
    HAUTE: 1,
    NORMALE: 2,
    INFO: 3,
  };
  const topAlerts = useMemo(() => {
    const local = alerts.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      priority: a.priority,
    }));
    const server = alertesServeur.map((a, i) => ({
      id: `srv-${i}`,
      title: `${a.categorie} · ${a.sujet}`,
      message: a.description,
      priority: a.priorite,
    }));
    const merged = [...local, ...server];
    merged.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    return merged.slice(0, 5);
  }, [alerts, alertesServeur]);

  // ── Alerte critique strip mobile ───────────────────────────────────────
  const criticalAlert = useMemo<
    { label: string; description?: string; kind: 'LOCAL' | 'SERVER' } | null
  >(() => {
    const local = alerts.find((a: FarmAlert) => a.priority === 'CRITIQUE');
    if (local) {
      return { label: local.title, description: local.message, kind: 'LOCAL' };
    }
    const prio: AlertPriority = 'CRITIQUE';
    const server = alertesServeur.find((a: AlerteServeur) => a.priorite === prio);
    if (server) {
      return {
        label: `${server.categorie} · ${server.sujet}`,
        description: server.description,
        kind: 'SERVER',
      };
    }
    return null;
  }, [alerts, alertesServeur]);

  // ── Agenda 7 jours ──────────────────────────────────────────────────────
  const agenda = useMemo<AgendaItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today.getTime() + 7 * DAY_MS);

    const items: AgendaItem[] = [];

    for (const t of truies) {
      const dt = parseFrDate(t.dateMBPrevue);
      if (!dt) continue;
      if (dt >= today && dt <= in7) {
        const diff = Math.round((dt.getTime() - today.getTime()) / DAY_MS);
        items.push({
          id: `mb-${t.id}`,
          label: `MB prévue ${t.displayId}`,
          daysFromNow: diff,
          kind: 'MB',
        });
      }
    }

    for (const b of bandes) {
      if (b.statut === 'Sevrés' || b.statut === 'Sevrée' || b.statut === 'Archivée') continue;
      const dt = parseFrDate(b.dateSevragePrevue);
      if (!dt) continue;
      if (dt >= today && dt <= in7) {
        const diff = Math.round((dt.getTime() - today.getTime()) / DAY_MS);
        items.push({
          id: `sev-${b.id}`,
          label: `Sevrage ${b.id}`,
          daysFromNow: diff,
          kind: 'SEV',
        });
      }
    }

    for (const a of alerts) {
      if (!a.dueDate) continue;
      const dt = new Date(a.dueDate);
      dt.setHours(0, 0, 0, 0);
      if (dt >= today && dt <= in7) {
        const diff = Math.round((dt.getTime() - today.getTime()) / DAY_MS);
        const key = `alert-${a.id}`;
        if (!items.some(i => i.id === key)) {
          items.push({
            id: key,
            label: a.title,
            daysFromNow: diff,
            kind: 'ALERTE',
          });
        }
      }
    }

    items.sort((a, b) => a.daysFromNow - b.daysFromNow);
    return items;
  }, [truies, bandes, alerts]);

  const agendaVisible = agenda.slice(0, 3);
  const calendarVisible = agenda.slice(0, 7);

  // ── Sevrages en retard ─────────────────────────────────────────────────
  interface SevrageRetard {
    id: string;
    idPortee: string;
    daysLate: number;
  }
  const sevragesEnRetard = useMemo<SevrageRetard[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items: SevrageRetard[] = [];
    for (const b of porteesReelles) {
      if (b.statut === 'Sevrés' || b.statut === 'Sevrée' || b.statut === 'Archivée') continue;
      const dt = parseFrDate(b.dateSevragePrevue);
      if (!dt) continue;
      if (dt < today) {
        const daysLate = Math.round((today.getTime() - dt.getTime()) / DAY_MS);
        items.push({ id: b.id, idPortee: b.idPortee || b.id, daysLate });
      }
    }
    items.sort((a, b) => b.daysLate - a.daysLate);
    return items;
  }, [porteesReelles]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleOpenPesee = (): void => setPeseeOpen(true);
  const handleOpenSoin = (): void => setSheet('soin');
  const handleOpenSaillie = (): void => setShowSaillie(true);
  const closeSheet = (): void => setSheet(null);

  const now = new Date();
  const headerDate = now.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const headerTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const todayShort = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const lastSyncMinutes = lastUpdate
    ? Math.max(0, Math.round((Date.now() - lastUpdate) / 60_000))
    : undefined;

  let storedUserName: string | null = null;
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
      storedUserName = window.localStorage.getItem('user_name');
    }
  } catch {
    storedUserName = null;
  }
  const userFirstName = (storedUserName || 'Utilisateur').split(' ')[0];

  // ── Sidebar config (desktop) ────────────────────────────────────────────
  const sidebarSections: SidebarSection[] = useMemo(
    () => [
      {
        title: 'Pilotage',
        items: [
          {
            label: 'Cockpit',
            icon: LayoutDashboard,
            href: '/cockpit',
            active: true,
          },
          {
            label: 'Alertes',
            icon: BellRing,
            href: '/alerts',
            count: kpiAlertesTotal > 0 ? kpiAlertesTotal : undefined,
          },
        ],
      },
      {
        title: 'Cheptel',
        items: [
          { label: 'Truies', icon: Users, href: '/troupeau/truies', count: truies.length },
          { label: 'Verrats', icon: Heart, href: '/troupeau/verrats', count: verrats.length },
          { label: 'Bandes', icon: Layers, href: '/troupeau/bandes', count: porteesReelles.length },
        ],
      },
      {
        title: 'Gestion',
        items: [
          { label: 'Cycles', icon: Activity, href: '/cycles' },
          { label: 'Ressources', icon: PackageSearch, href: '/ressources' },
          { label: 'Pilotage', icon: TrendingUp, href: '/pilotage' },
        ],
      },
      {
        title: 'Système',
        items: [{ label: 'Réglages', icon: Settings2, href: '/more' }],
      },
    ],
    [kpiAlertesTotal, truies.length, verrats.length, porteesReelles.length]
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={false}>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          {/* ═══════════════════ DESKTOP (≥768px) ═══════════════════ */}
          {isDesktop ? (
          <div className="md:flex" style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar sections={sidebarSections} />

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <TopBarSync
                crumbs={['Pilotage', 'Cockpit']}
                lastSyncMinutes={lastSyncMinutes}
                onMariusClick={() => {
                  const evt = new CustomEvent('open-chatbot');
                  window.dispatchEvent(evt);
                }}
              />

              <div
                style={{
                  flex: 1,
                  background: 'var(--bg-app, var(--bg-surface-2))',
                  padding: '24px 28px 28px',
                  overflowY: 'auto',
                }}
              >
                {/* En-tête desktop */}
                <div style={{ marginBottom: 24 }}>
                  <Eyebrow dotColor="accent">
                    Aujourd&rsquo;hui · {todayShort}
                  </Eyebrow>
                  <h1
                    className="ft-heading"
                    style={{
                      fontFamily: 'BigShoulders, system-ui, sans-serif',
                      fontSize: 34,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: 'var(--ink)',
                      letterSpacing: '-0.02em',
                      margin: '8px 0 4px',
                    }}
                  >
                    Bonjour, {userFirstName}
                  </h1>
                  <div
                    style={{
                      fontFamily: 'DMMono, ui-monospace, monospace',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {headerDate} · {headerTime} · {FARM_CONFIG.FARM_NAME}
                  </div>
                </div>

                {/* 4 KPI cards (sparklines) */}
                <section
                  aria-label="Indicateurs clés"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <KpiCardV6
                    label="Cheptel actif"
                    value={desktopKpis.cheptelActif}
                    trend={
                      desktopKpis.cheptelActif > 0
                        ? `${truies.length} truies · ${verrats.length} verrats`
                        : 'Aucune donnée'
                    }
                    spark={desktopKpis.cheptelSpark}
                    variant="accent"
                    onClick={() => navigate('/troupeau')}
                  />
                  <KpiCardV6
                    label="Saillies 7 jours"
                    value={desktopKpis.saillies}
                    trend={
                      desktopKpis.saillies > 0
                        ? 'Cycle en cours'
                        : 'Aucune saillie récente'
                    }
                    spark={desktopKpis.sailliesSpark}
                    onClick={() => navigate('/cycles/repro')}
                  />
                  <KpiCardV6
                    label="Bandes actives"
                    value={desktopKpis.bandesActives}
                    trend={`${cheptelStats.nbPorcelets} porcelets`}
                    spark={desktopKpis.bandesSpark}
                    onClick={() => navigate('/troupeau/bandes')}
                  />
                  <KpiCardV6
                    label="Alertes prioritaires"
                    value={desktopKpis.alertesHaute}
                    trend={
                      desktopKpis.alertesHaute > 0
                        ? 'À traiter aujourd’hui'
                        : 'Tout est sous contrôle'
                    }
                    trendDir={desktopKpis.alertesHaute > 0 ? 'down' : 'up'}
                    spark={desktopKpis.alertesSpark}
                    onClick={() => navigate('/alerts')}
                    className={pulse ? 'animate-pulse' : ''}
                  />
                </section>

                {/* Perf bandes + Alertes du jour */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr',
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  <PanelBandesPerf bandes={topBandesNv} target={targetNv} />
                  <PanelAlertes
                    alerts={topAlerts}
                    onSeeAll={() => navigate('/alerts')}
                  />
                </div>

                {/* Calendrier 7 jours */}
                <PanelCalendrier
                  items={calendarVisible}
                  onSeeAll={() => navigate('/cycles/repro')}
                />
              </div>
            </main>
          </div>
          ) : (
          /* ═══════════════════ MOBILE (≤768px) ═══════════════════ */
          <div>
            {/* ── Header cockpit ─────────────────────────────────────────── */}
            <header
              className="px-4 pt-4 pb-3 bg-bg-0 border-b border-border"
              role="banner"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h1
                    className="agritech-heading leading-none uppercase truncate"
                    style={{ fontSize: 'var(--text-display-lg)' }}
                  >
                    Cockpit <span className="text-text-2"> · {FARM_CONFIG.FARM_ID}</span>
                  </h1>
                  <p className="mt-1 font-mono text-[12px] text-text-2 leading-none">
                    {headerDate} · {headerTime}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {dataSource && dataSource !== 'NETWORK' ? (
                    <OfflineChip dataSource={dataSource} />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate('/aide')}
                    aria-label="Aide"
                    className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <HelpCircle size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/more')}
                    aria-label="Ouvrir les réglages"
                    className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-2 hover:text-text-0 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <Settings size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </header>

            <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
              {/* ── Bannière hors ligne ──────────────────────────────────── */}
              {dataSource && dataSource !== 'NETWORK' ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="card-dense flex items-center gap-2.5 !py-2.5 !px-3"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--amber) 40%, var(--border))',
                  }}
                >
                  <CloudOff size={16} className="shrink-0 text-amber" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-amber uppercase tracking-wide">
                      Hors ligne
                    </div>
                    <p className="text-[11px] text-text-2 mt-0.5 leading-snug">
                      Sync auto au retour du réseau
                    </p>
                  </div>
                </div>
              ) : null}

              {/* ── Strip alerte critique ────────────────────────────────── */}
              {criticalAlert ? (
                <button
                  type="button"
                  onClick={() => navigate('/pilotage/alertes')}
                  role="alert"
                  aria-label={`Alerte critique : ${criticalAlert.label}`}
                  className="card-dense pressable flex w-full items-start gap-3 text-left border-l-2 border-l-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <AlertOctagon
                    size={18}
                    className="mt-0.5 shrink-0 text-red"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="kpi-label text-red">Alerte critique</div>
                    <div className="mt-1 text-[14px] font-semibold text-text-0 truncate">
                      {criticalAlert.label}
                    </div>
                    {criticalAlert.description ? (
                      <div className="mt-0.5 font-mono text-[11px] text-text-2 line-clamp-2">
                        {criticalAlert.description}
                      </div>
                    ) : null}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-text-2 mt-1" aria-hidden="true" />
                </button>
              ) : null}

              {/* ── KPI Grid 2×2 ─────────────────────────────────────────── */}
              <section
                aria-label="Indicateurs clés"
                role="region"
                className="grid grid-cols-2 gap-2.5"
              >
                <AgritechKpi
                  label="Pleines"
                  value={loading && truies.length === 0 ? '—' : kpiPleines}
                  icon={<Heart size={14} aria-hidden="true" />}
                  tone="success"
                  onClick={() => navigate('/troupeau/truies')}
                />
                <AgritechKpi
                  label="Maternité"
                  value={loading && truies.length === 0 ? '—' : kpiMaternite}
                  icon={<Baby size={14} aria-hidden="true" />}
                  tone="warning"
                  onClick={() => navigate('/troupeau/truies')}
                />
                <AgritechKpi
                  label="Alertes"
                  value={loading && alerts.length === 0 && alertesServeur.length === 0 ? '—' : kpiAlertesTotal}
                  icon={<AlertTriangle size={14} aria-hidden="true" />}
                  tone={kpiAlertesTotal > 0 ? 'warning' : 'default'}
                  onClick={() => navigate('/pilotage/alertes')}
                  className={pulse ? 'animate-pulse' : ''}
                />
                <AgritechKpi
                  label="Ruptures"
                  value={loading && stockAliment.length === 0 && stockVeto.length === 0 ? '—' : kpiStocksRuptures}
                  icon={<Package size={14} aria-hidden="true" />}
                  tone={kpiStocksRuptures > 0 ? 'critical' : 'default'}
                  onClick={() => navigate('/ressources')}
                />
              </section>

              {/* ── Sevrages en retard ───────────────────────────────────── */}
              {sevragesEnRetard.length > 0 ? (
                <section
                  aria-label="Sevrages en retard"
                  role="alert"
                  aria-live="polite"
                >
                  <SectionDivider
                    label={`⚠ Sevrages en retard · ${sevragesEnRetard.length}`}
                  />
                  <ul
                    className="card-dense !p-0 overflow-hidden border-l-2 border-l-red"
                    aria-label="Liste des sevrages en retard"
                  >
                    {sevragesEnRetard.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/troupeau/bandes/${encodeURIComponent(item.id)}`)
                          }
                          className="pressable flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                          aria-label={`Sevrage en retard portée ${item.idPortee}, J+${item.daysLate}`}
                        >
                          <AlertOctagon
                            size={16}
                            className="shrink-0"
                            aria-hidden="true"
                            style={{ color: 'var(--red)' }}
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-[13px] font-semibold truncate"
                              style={{ color: 'var(--text-0)' }}
                            >
                              Sevrage retard ·{' '}
                              <span className="font-mono">{item.idPortee}</span>
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-text-2">
                              J+{item.daysLate}
                            </div>
                          </div>
                          <Chip label="EN RETARD" tone="red" size="xs" />
                          <ChevronRight
                            size={14}
                            className="shrink-0 text-text-2"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* ── Mon élevage ──────────────────────────────────────────── */}
              <section role="region" aria-label="Mon élevage">
                <SectionDivider label="Mon élevage" />
                <div className="grid grid-cols-2 gap-2.5">
                  <HubTile
                    icon={<Users size={20} aria-hidden="true" />}
                    title="Truies"
                    subtitle="Reproductrices"
                    count={cheptelStats.nbTruies}
                    tone="accent"
                    to="/troupeau"
                    variant="compact"
                  />
                  <HubTile
                    icon={<Heart size={20} aria-hidden="true" />}
                    title="Verrats"
                    subtitle="Reproducteurs"
                    count={cheptelStats.nbVerrats}
                    tone="coral"
                    to="/troupeau/verrats"
                    variant="compact"
                  />
                  <HubTile
                    icon={<Baby size={20} aria-hidden="true" />}
                    title="Porcelets"
                    subtitle={`${cheptelStats.nbPorceletsSousMere} s/m · ${cheptelStats.postSevrageTotal} sev.`}
                    count={cheptelStats.nbPorcelets}
                    tone="gold"
                    to="/troupeau/bandes"
                    variant="compact"
                  />
                  <HubTile
                    icon={<Home size={20} aria-hidden="true" />}
                    title="Loges"
                    subtitle={`${FARM_CONFIG.MATERNITE_LOGES_CAPACITY} mat · ${FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY} sev · ${FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY} engr`}
                    count={
                      FARM_CONFIG.MATERNITE_LOGES_CAPACITY +
                      FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY +
                      FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY
                    }
                    tone="teal"
                    to="/troupeau"
                    variant="compact"
                  />
                </div>
              </section>

              {/* ── Agenda 7 jours ───────────────────────────────────────── */}
              <section aria-label="Agenda 7 jours" role="region">
                <SectionDivider
                  label="Agenda 7 jours"
                  action={
                    agenda.length > agendaVisible.length ? (
                      <button
                        type="button"
                        onClick={() => navigate('/pilotage/alertes')}
                        className="font-mono text-[11px] uppercase tracking-wide text-accent pressable focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded"
                      >
                        Voir tout
                      </button>
                    ) : undefined
                  }
                />
                {agendaVisible.length === 0 ? (
                  <div className="card-dense">
                    <p className="font-mono text-[12px] text-text-2">
                      Aucune échéance dans les 7 prochains jours.
                    </p>
                  </div>
                ) : (
                  <ul className="card-dense !p-0 overflow-hidden" aria-label="Échéances">
                    {agendaVisible.map(item => (
                      <li key={item.id}>
                        <DataRow
                          primary={item.label}
                          secondary={
                            item.daysFromNow === 0
                              ? "Aujourd'hui"
                              : item.daysFromNow === 1
                                ? 'Demain'
                                : `Dans ${item.daysFromNow}j`
                          }
                          meta={`J+${item.daysFromNow}`}
                          accessory={
                            <ChevronRight size={14} className="text-text-2" aria-hidden="true" />
                          }
                          onClick={() => navigate('/pilotage/alertes')}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ── Occupation loges ─────────────────────────────────────── */}
              <section aria-label="Occupation loges" role="region">
                <SectionDivider label="Occupation loges" />
                <div className="card-dense flex flex-col gap-3.5">
                  <LogeBar
                    label={`Maternité · ${FARM_CONFIG.MATERNITE_LOGES_CAPACITY} loges`}
                    occupees={materniteOcc.occupees}
                    capacite={materniteOcc.capacite}
                    alerte={materniteOcc.alerte}
                  />
                  <div>
                    <LogeBar
                      label={`Post-sevrage · ${FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY} loges`}
                      occupees={postSevrageOcc.occupees}
                      capacite={postSevrageOcc.capacite}
                      alerte={postSevrageOcc.alerte}
                    />
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.map((loge) => (
                        <div
                          key={loge.id}
                          className="rounded-lg bg-bg-2 p-2.5 flex flex-col items-center gap-1"
                        >
                          <span className="kpi-label text-[11px]">{loge.id}</span>
                          <span className="ft-code text-[14px] font-semibold text-accent">
                            {loge.porcelets}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <LogeBar
                    label={`Croissance-finition · ${FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY} loges`}
                    occupees={engraissementOcc.occupees}
                    capacite={engraissementOcc.capacite}
                    alerte={engraissementOcc.alerte}
                  />
                </div>
              </section>

              <ForecastWidget />

              {/* ── Quick actions ────────────────────────────────────────── */}
              <section aria-label="Actions rapides" role="region">
                <SectionDivider label="Actions rapides" />
                <div className="grid grid-cols-3 gap-2">
                  <QuickActionButton
                    icon={<Heart size={16} aria-hidden="true" />}
                    label="Saillie"
                    onClick={handleOpenSaillie}
                  />
                  <QuickActionButton
                    icon={<Syringe size={16} aria-hidden="true" />}
                    label="Soin"
                    onClick={handleOpenSoin}
                  />
                  <QuickActionButton
                    icon={<Scale size={16} aria-hidden="true" />}
                    label="Pesée"
                    onClick={handleOpenPesee}
                  />
                </div>
              </section>
            </div>
          </div>
          )}
        </AgritechLayout>
      </IonContent>

      {/* ── Quick forms ────────────────────────────────────────────────── */}
      <QuickSaillieForm isOpen={showSaillie} onClose={() => setShowSaillie(false)} />
      <QuickPeseeForm isOpen={peseeOpen} onClose={() => setPeseeOpen(false)} />

      <BottomSheet
        isOpen={sheet === 'soin'}
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
        isOpen={sheet === 'note'}
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
        duration={1800}
        onDidDismiss={() => setToast({ open: false, message: '' })}
        position="bottom"
      />

      <PhaseTransitionModal
        transition={current}
        isOpen={current !== null}
        onConfirm={confirm}
        onDismiss={() => current && dismiss(current.bandeId)}
      />
    </IonPage>
  );
};

// ─── Sous-composants locaux ───────────────────────────────────────────────

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabledHint?: boolean;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabledHint,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-dense pressable flex flex-col items-center gap-2 !py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      aria-label={label}
    >
      <span
        className={
          'inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 ' +
          (disabledHint ? 'text-text-2' : 'text-accent')
        }
      >
        {disabledHint ? <Plus size={14} aria-hidden="true" /> : icon}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wide text-text-1">
        {label}
      </span>
      {disabledHint ? (
        <span className="font-mono text-[10px] text-text-2">Bientôt</span>
      ) : null}
    </button>
  );
};

interface LogeBarProps {
  label: string;
  occupees: number;
  capacite: number;
  alerte: 'OK' | 'HIGH' | 'FULL';
}

const LogeBar: React.FC<LogeBarProps> = ({ label, occupees, capacite, alerte }) => {
  const pct = capacite > 0 ? Math.min(100, Math.round((occupees / capacite) * 100)) : 0;
  const fillClass =
    alerte === 'FULL' ? 'bg-red' : alerte === 'HIGH' ? 'bg-amber' : 'bg-accent';
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="kpi-label">{label}</span>
        <span className="font-mono text-[11px] text-text-1 tabular-nums">
          {String(occupees).padStart(2, '0')} / {String(capacite).padStart(2, '0')}
        </span>
      </div>
      <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
        <div
          className={`h-full ${fillClass} rounded-full transition-[width]`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

interface OfflineChipProps {
  dataSource: DataSource | null;
}

const OfflineChip: React.FC<OfflineChipProps> = ({ dataSource }) => {
  const isOffline = dataSource !== 'NETWORK' && dataSource !== 'CACHE';
  return (
    <span
      className="chip chip--amber inline-flex items-center gap-1.5"
      aria-label={isOffline ? 'Hors ligne' : 'Données en cache'}
    >
      {isOffline ? (
        <CloudOff size={12} aria-hidden="true" />
      ) : (
        <RefreshCw size={12} aria-hidden="true" />
      )}
      {isOffline ? 'Offline' : 'Cache'}
    </span>
  );
};

// ─── Panels desktop ───────────────────────────────────────────────────────

interface PanelBandeRow {
  id: string;
  idPortee: string;
  statut?: string;
  nv?: number;
}

interface PanelBandesPerfProps {
  bandes: PanelBandeRow[];
  target: number;
}

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  borderRadius: 12,
  boxShadow:
    '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const panelHeadStyle: React.CSSProperties = {
  padding: '14px 18px',
  borderBottom: '1px solid var(--line-2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const panelTitleStyle: React.CSSProperties = {
  fontFamily: 'DMMono, ui-monospace, monospace',
  fontSize: 9.5,
  letterSpacing: '0.20em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

const panelLinkStyle: React.CSSProperties = {
  fontFamily: 'DMMono, ui-monospace, monospace',
  fontSize: 10,
  color: 'var(--color-accent-500)',
  cursor: 'pointer',
  letterSpacing: '0.04em',
  background: 'none',
  border: 'none',
  padding: 0,
};

const panelBodyStyle: React.CSSProperties = {
  padding: '14px 18px',
};

const PanelBandesPerf: React.FC<PanelBandesPerfProps> = ({ bandes, target }) => {
  return (
    <div style={panelStyle}>
      <div style={panelHeadStyle}>
        <div style={panelTitleStyle}>Performance bandes · porcelets vivants</div>
      </div>
      <div style={panelBodyStyle}>
        {bandes.length === 0 ? (
          <p
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Aucune bande active avec des données NV pour l’instant.
          </p>
        ) : (
          <>
            {bandes.map((b) => {
              const nv = b.nv ?? 0;
              const pct = target > 0 ? Math.min(100, Math.round((nv / target) * 100)) : 0;
              return (
                <div
                  key={b.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '92px 1fr 50px',
                    gap: 12,
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'DMMono, ui-monospace, monospace',
                      fontSize: 10,
                      color: 'var(--muted)',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {b.idPortee}
                  </div>
                  <div
                    style={{
                      height: 18,
                      background: 'var(--color-accent-50)',
                      borderRadius: 4,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        background: 'var(--color-accent-500)',
                        borderRadius: 4,
                        width: `${pct}%`,
                        transition: 'width 240ms var(--ease-emil)',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
                      fontSize: 15,
                      color: 'var(--ink)',
                      textAlign: 'right',
                      fontWeight: 600,
                    }}
                  >
                    {nv}
                  </div>
                </div>
              );
            })}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '92px 1fr 50px',
                gap: 12,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 10,
                  color: 'var(--color-amber-pork-deep)',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                Cible
              </div>
              <div
                style={{
                  height: 18,
                  background: 'var(--color-accent-50)',
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    background: 'var(--color-amber-pork-soft)',
                    borderRadius: 4,
                    width: '100%',
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
                  fontSize: 15,
                  color: 'var(--color-amber-pork-deep)',
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                {target}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface PanelAlerteRow {
  id: string;
  title: string;
  message?: string;
  priority: AlertPriority;
}

interface PanelAlertesProps {
  alerts: PanelAlerteRow[];
  onSeeAll: () => void;
}

const ALERT_DOT_COLOR: Record<AlertPriority, string> = {
  CRITIQUE: 'var(--red, #EF4444)',
  HAUTE: 'var(--color-amber-pork)',
  NORMALE: 'var(--color-accent-500)',
  INFO: 'var(--info, #3B82F6)',
};

const PanelAlertes: React.FC<PanelAlertesProps> = ({ alerts, onSeeAll }) => {
  return (
    <div style={panelStyle}>
      <div style={panelHeadStyle}>
        <div style={panelTitleStyle}>Alertes du jour</div>
        <button type="button" onClick={onSeeAll} style={panelLinkStyle}>
          Voir tout →
        </button>
      </div>
      <div style={panelBodyStyle}>
        {alerts.length === 0 ? (
          <p
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Aucune alerte aujourd’hui.
          </p>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '8px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--line-2)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: ALERT_DOT_COLOR[a.priority],
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--ink)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <strong style={{ fontWeight: 600 }}>{a.title}</strong>
                {a.message ? (
                  <span style={{ color: 'var(--muted)' }}> · {a.message}</span>
                ) : null}
              </span>
              <span
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 9.5,
                  color: 'var(--muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {a.priority}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface PanelCalendrierProps {
  items: AgendaItem[];
  onSeeAll: () => void;
}

const TAG_STYLE: Record<AgendaItem['kind'], React.CSSProperties> = {
  MB: {
    background: 'var(--color-accent-100)',
    color: 'var(--color-accent-600)',
  },
  SEV: {
    background: 'var(--info, #3B82F6)',
    color: 'var(--bg-surface)',
    opacity: 0.9,
  },
  RETOUR: {
    background: 'var(--color-amber-pork-soft)',
    color: 'var(--color-amber-pork-deep)',
  },
  ALERTE: {
    background: 'var(--bg-app, var(--bg-surface-2))',
    color: 'var(--muted)',
    border: '0.5px solid var(--line)',
  },
};

const TAG_LABEL: Record<AgendaItem['kind'], string> = {
  MB: 'MB',
  SEV: 'SEV',
  RETOUR: 'RTC',
  ALERTE: 'ALR',
};

const PanelCalendrier: React.FC<PanelCalendrierProps> = ({ items, onSeeAll }) => {
  return (
    <div style={panelStyle}>
      <div style={panelHeadStyle}>
        <div style={{ ...panelTitleStyle, display: 'flex', gap: 8, alignItems: 'center' }}>
          <CalendarDays size={12} aria-hidden="true" />
          Calendrier 7 jours
        </div>
        <button type="button" onClick={onSeeAll} style={panelLinkStyle}>
          Voir tout →
        </button>
      </div>
      <div style={panelBodyStyle}>
        {items.length === 0 ? (
          <p
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Aucun événement dans les 7 prochains jours.
          </p>
        ) : (
          items.map((item) => {
            const dt = new Date(Date.now() + item.daysFromNow * DAY_MS);
            const dateLabel = dt.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            });
            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '42px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: '1px solid var(--line-2)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 9.5,
                    letterSpacing: '0.04em',
                    padding: '4px 6px',
                    borderRadius: 4,
                    textAlign: 'center',
                    fontWeight: 500,
                    ...TAG_STYLE[item.kind],
                  }}
                >
                  {TAG_LABEL[item.kind]}
                </span>
                <span
                  style={{
                    fontFamily: 'BigShoulders, system-ui, sans-serif',
                    fontSize: 14,
                    color: 'var(--ink)',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                  <small
                    style={{
                      display: 'block',
                      fontFamily: 'InstrumentSans, system-ui, sans-serif',
                      fontSize: 11,
                      color: 'var(--muted)',
                      marginTop: 1,
                      fontWeight: 400,
                    }}
                  >
                    {item.daysFromNow === 0
                      ? "Aujourd'hui"
                      : item.daysFromNow === 1
                        ? 'Demain'
                        : `Dans ${item.daysFromNow}j`}
                  </small>
                </span>
                <span
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 10,
                    color: 'var(--muted)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {dateLabel}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Cockpit;
