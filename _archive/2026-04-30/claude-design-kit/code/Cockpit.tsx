import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, IonToast } from '@ionic/react';
import {
  AlertOctagon,
  ChevronRight,
  Heart,
  Package,
  AlertTriangle,
  Plus,
  Syringe,
  Scale,
  RefreshCw,
  CloudOff,
  HelpCircle,
  Users,
  Baby,
} from 'lucide-react';
import { FARM_CONFIG } from '../config/farm';
import { useFarm } from '../context/FarmContext';
import { KpiCard, BottomSheet, SectionDivider, DataRow } from './agritech';
import AgritechLayout from './AgritechLayout';
import QuickSaillieForm from './forms/QuickSaillieForm';
import QuickHealthForm from './forms/QuickHealthForm';
import QuickNoteForm from './forms/QuickNoteForm';
import QuickPeseeForm from './forms/QuickPeseeForm';
import ForecastWidget from './cockpit/ForecastWidget';
import type { FarmAlert, AlertPriority } from '../services/alertEngine';
import type { AlerteServeur, DataSource } from '../types/farm';
import {
  filterRealPortees,
  logesMaterniteOccupation,
  logesPostSevrageOccupation,
  logesEngraissementOccupation,
} from '../services/bandesAggregator';

/* ═════════════════════════════════════════════════════════════════════════
   COCKPIT · Agritech Moderne
   ─────────────────────────────────────────────────────────────────────────
   Remplace Dashboard.tsx à la route `/`. Vue pilote matinale dense :
   · Strip alerte CRITIQUE (si présente)
   · KPI grid 2×2 (Pleines · Maternité · Stocks rupture · Alertes)
   · Agenda 7 jours (3 items + lien "Voir tout")
   · Quick actions (Saillie · Soin · Pesée bientôt)
   · Snapshot troupeau
   ═════════════════════════════════════════════════════════════════════════ */

const DAY_MS = 86_400_000;

/** Parse DD/MM/YYYY → Date | null (léger — la logique GTTT reste dans alertEngine). */
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
  const {
    truies,
    verrats,
    bandes,
    stockAliment,
    stockVeto,
    alerts,
    alertesServeur,
    loading,
    refreshData,
    dataSource,
  } = useFarm();

  const [sheet, setSheet] = useState<QuickSheetKind>(null);
  const [showSaillie, setShowSaillie] = useState(false);
  const [peseeOpen, setPeseeOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpiPleines = useMemo(
    () => truies.filter(t => (t.statut ?? '').toLowerCase().includes('pleine')).length,
    [truies]
  );

  const kpiMaternite = useMemo(
    () =>
      truies.filter(t => {
        const s = (t.statut ?? '').toLowerCase();
        return s.includes('maternit');
      }).length,
    [truies]
  );

  const kpiStocksRuptures = useMemo(() => {
    const a = stockAliment.filter(s => s.statutStock === 'RUPTURE').length;
    const v = stockVeto.filter(s => s.statutStock === 'RUPTURE').length;
    return a + v;
  }, [stockAliment, stockVeto]);

  const kpiAlertesTotal = useMemo(
    () => alerts.length + alertesServeur.length,
    [alerts, alertesServeur]
  );

  // Portées réelles (exclut RECAP) + occupation des loges physiques (3 zones).
  const porteesReelles = useMemo(() => filterRealPortees(bandes), [bandes]);
  const materniteOcc = useMemo(() => logesMaterniteOccupation(truies), [truies]);
  const postSevrageOcc = useMemo(
    () => logesPostSevrageOccupation(porteesReelles),
    [porteesReelles]
  );
  const engraissementOcc = useMemo(
    () => logesEngraissementOccupation(porteesReelles),
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

    return {
      nbTruies: truies.length,
      nbVerrats: verrats.length,
      nbPorcelets: vivants,
      nbPorceletsSousMere: sousMere,
      nbPorceletsSevres: sevres,
      totalCheptel: truies.length + verrats.length + vivants,
    };
  }, [truies, verrats, porteesReelles]);

  // ── Alerte critique à afficher en strip ────────────────────────────────
  const criticalAlert = useMemo<
    { label: string; description?: string; kind: 'LOCAL' | 'SERVER' } | null
  >(() => {
    const local = alerts.find((a: FarmAlert) => a.priority === 'CRITIQUE');
    if (local) {
      return {
        label: local.title,
        description: local.message,
        kind: 'LOCAL',
      };
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

    // Mises-bas prévues dans les 7j
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

    // Sevrages prévus dans les 7j
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

    // Alertes locales avec dueDate dans 7j (hors celles déjà couvertes)
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

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleRefresh = (e: CustomEvent<{ complete: () => void }>): void => {
    refreshData().finally(() => e.detail.complete());
  };

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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={false}>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

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
              </div>
            </div>
          </header>

          <div className="px-4 pt-4 pb-32 space-y-8">
            {/* ── Bannière hors ligne renforcée ─────────────────────────── */}
            {dataSource && dataSource !== 'NETWORK' ? (
              <div
                role="status"
                aria-live="polite"
                className="card-dense flex items-start gap-3 border-l-2 border-l-amber bg-bg-1"
              >
                <CloudOff
                  size={18}
                  className="mt-0.5 shrink-0 text-amber"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="kpi-label text-amber">Hors ligne</div>
                  <p className="mt-1 text-[13px] text-text-1 leading-snug">
                    Vos saisies seront synchronisées automatiquement dès le retour du réseau.
                  </p>
                </div>
              </div>
            ) : null}

            {/* ── Strip alerte critique ─────────────────────────────────── */}
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

            {/* ── KPI Grid 2×2 ──────────────────────────────────────────── */}
            <section aria-label="Indicateurs clés" role="region" className="grid grid-cols-2 gap-4">
              <KpiCard
                label="Pleines"
                value={loading && truies.length === 0 ? '—' : kpiPleines}
                icon={<Heart size={14} aria-hidden="true" />}
                onClick={() => navigate('/troupeau/truies')}
              />
              <KpiCard
                label="Maternité"
                value={loading && truies.length === 0 ? '—' : kpiMaternite}
                icon={<Heart size={14} aria-hidden="true" />}
                onClick={() => navigate('/troupeau/truies')}
              />
              <KpiCard
                label="Stocks ruptures"
                value={loading && stockAliment.length === 0 && stockVeto.length === 0 ? '—' : kpiStocksRuptures}
                icon={<Package size={14} aria-hidden="true" />}
                tone={
                  kpiStocksRuptures > 2
                    ? 'critical'
                    : kpiStocksRuptures > 0
                      ? 'warning'
                      : 'default'
                }
                onClick={() => navigate('/ressources')}
              />
              <KpiCard
                label="Alertes"
                value={loading && alerts.length === 0 && alertesServeur.length === 0 ? '—' : kpiAlertesTotal}
                icon={<AlertTriangle size={14} aria-hidden="true" />}
                tone={kpiAlertesTotal > 0 ? 'warning' : 'default'}
                onClick={() => navigate('/pilotage/alertes')}
              />
            </section>

            {/* ── Mon élevage ───────────────────────────────────────────── */}
            <section role="region" aria-label="Résumé élevage">
              <SectionDivider label="Mon élevage" />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/troupeau')}
                  className="card-dense pressable w-full text-left flex flex-col gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  aria-label={`Total cheptel : ${cheptelStats.totalCheptel} animaux`}
                >
                  <div className="flex items-center gap-1.5 text-text-2">
                    <Users size={12} aria-hidden="true" />
                    <span className="kpi-label">Total cheptel</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[32px] leading-none font-semibold tabular-nums text-accent">
                      {cheptelStats.totalCheptel}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                      animaux
                    </span>
                  </div>
                  <div className="font-mono text-[11px] tabular-nums text-text-2">
                    {cheptelStats.nbTruies}T · {cheptelStats.nbVerrats}V ·{' '}
                    {cheptelStats.nbPorcelets}P
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/troupeau/bandes')}
                  className="card-dense pressable w-full text-left flex flex-col gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  aria-label={`Porcelets : ${cheptelStats.nbPorcelets} vivants`}
                >
                  <div className="flex items-center gap-1.5 text-text-2">
                    <Baby size={12} aria-hidden="true" />
                    <span className="kpi-label">Porcelets</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[32px] leading-none font-semibold tabular-nums text-accent">
                      {cheptelStats.nbPorcelets}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                      vivants
                    </span>
                  </div>
                  <div className="font-mono text-[11px] tabular-nums text-text-2 leading-snug">
                    <span className="tabular-nums text-text-1">
                      {cheptelStats.nbPorceletsSevres}
                    </span>{' '}
                    sevrés ·{' '}
                    <span className="tabular-nums text-text-1">
                      {cheptelStats.nbPorceletsSousMere}
                    </span>{' '}
                    sous mère
                  </div>
                </button>
              </div>
              <div className="mt-2 font-mono text-[11px] tabular-nums text-text-2 px-1">
                {FARM_CONFIG.MATERNITE_LOGES_CAPACITY} loges maternité ·{' '}
                {FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY} loges post-sevrage ·{' '}
                {FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY} loges engraissement
              </div>
              {/* Répartition actuelle des 4 loges post-sevrage (relevé porcher) */}
              <div className="mt-3 card-dense flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-wide text-text-2">
                  Répartition post-sevrage
                </span>
                <div className="flex gap-3 font-mono text-[12px] tabular-nums text-text-0">
                  {FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.map(l => (
                    <span key={l.id} className="flex items-baseline gap-1">
                      <span className="text-text-2 text-[10px]">{l.id.replace('Loge ', 'L')}</span>
                      <span className="font-semibold text-accent">{l.porcelets}</span>
                    </span>
                  ))}
                  <span className="flex items-baseline gap-1 border-l border-border pl-3 ml-1">
                    <span className="text-text-2 text-[10px]">TOTAL</span>
                    <span className="font-bold text-accent">
                      {FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.reduce((s, l) => s + l.porcelets, 0)}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            {/* ── Agenda 7 jours ────────────────────────────────────────── */}
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

            {/* ── Prévisions 14 jours ───────────────────────────────────── */}
            <ForecastWidget />

            {/* ── Quick actions ─────────────────────────────────────────── */}
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

            {/* ── Troupeau snapshot ─────────────────────────────────────── */}
            <section aria-label="Snapshot troupeau" role="region">
              <SectionDivider label="Troupeau" />
              <button
                type="button"
                onClick={() => navigate('/troupeau')}
                className="card-dense pressable w-full text-left flex items-center gap-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <SnapshotMetric value={truies.length} unit="truies" />
                    <span className="text-text-2" aria-hidden="true">·</span>
                    <SnapshotMetric value={verrats.length} unit="verrats" />
                    <span className="text-text-2" aria-hidden="true">·</span>
                    <SnapshotMetric value={porteesReelles.length} unit="portées" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] text-text-2">
                    <span className="tabular-nums text-text-1">
                      Maternité {materniteOcc.occupees}/{materniteOcc.capacite}
                    </span>
                    {materniteOcc.alerte !== 'OK' ? (
                      <AlertTriangle
                        size={12}
                        className={
                          materniteOcc.alerte === 'FULL' ? 'text-red' : 'text-amber'
                        }
                        aria-label={
                          materniteOcc.alerte === 'FULL'
                            ? 'Loges maternité saturées'
                            : 'Loges maternité proches saturation'
                        }
                      />
                    ) : null}
                    <span className="text-text-2" aria-hidden="true">·</span>
                    <span className="tabular-nums text-text-1">
                      Post-sevrage {postSevrageOcc.occupees}/{postSevrageOcc.capacite}
                    </span>
                    {postSevrageOcc.alerte !== 'OK' ? (
                      <AlertTriangle
                        size={12}
                        className={
                          postSevrageOcc.alerte === 'FULL' ? 'text-red' : 'text-amber'
                        }
                        aria-label={
                          postSevrageOcc.alerte === 'FULL'
                            ? 'Loges post-sevrage saturées'
                            : 'Loges post-sevrage proches saturation'
                        }
                      />
                    ) : null}
                    <span className="text-text-2" aria-hidden="true">·</span>
                    <span className="tabular-nums text-text-1">
                      Engraissement {engraissementOcc.occupees}/{engraissementOcc.capacite}
                    </span>
                    {engraissementOcc.alerte !== 'OK' ? (
                      <AlertTriangle
                        size={12}
                        className={
                          engraissementOcc.alerte === 'FULL' ? 'text-red' : 'text-amber'
                        }
                        aria-label={
                          engraissementOcc.alerte === 'FULL'
                            ? 'Loges engraissement saturées'
                            : 'Loges engraissement proches saturation'
                        }
                      />
                    ) : null}
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-text-2" aria-hidden="true" />
              </button>
            </section>
          </div>
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

interface SnapshotMetricProps {
  value: number;
  unit: string;
}

const SnapshotMetric: React.FC<SnapshotMetricProps> = ({ value, unit }) => (
  <span className="inline-flex items-baseline gap-1.5">
    <span className="font-mono text-[18px] font-semibold tabular-nums text-text-0">{value}</span>
    <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">{unit}</span>
  </span>
);

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

export default Cockpit;
