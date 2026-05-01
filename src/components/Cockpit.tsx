import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, IonToast } from '@ionic/react';
import { Heart, Syringe, Scale } from 'lucide-react';
import { FARM_CONFIG } from '../config/farm';
import { useMeta } from '../context/FarmContext';
import { useTroupeau } from '../context/TroupeauContext';
import { usePilotage } from '../context/PilotageContext';
import { useRessources } from '../context/RessourcesContext';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { BottomSheet, SectionDivider } from './agritech';
import AgritechLayout from './AgritechLayout';
import QuickSaillieForm from './forms/QuickSaillieForm';
import QuickHealthForm from './forms/QuickHealthForm';
import QuickNoteForm from './forms/QuickNoteForm';
import QuickPeseeForm from './forms/QuickPeseeForm';
import ForecastWidget from './cockpit/ForecastWidget';
import type { FarmAlert, AlertPriority } from '../services/alertEngine';
import type { AlerteServeur } from '../types/farm';
import { Bandes } from '../services/bandAnalysisEngine';
import { normaliseStatut } from '../lib/truieStatut';
import { usePhaseTransitions } from '../hooks/usePhaseTransitions';
import PhaseTransitionModal from './modals/PhaseTransitionModal';
import { type PanelAlerteRow } from './cockpit/PanelAlertes';
import { type AgendaItem } from './cockpit/PanelCalendrier';
import KpiGridMobile from './cockpit/KpiGridMobile';
import MonElevageCard from './cockpit/MonElevageCard';
import AgendaList from './cockpit/AgendaList';
import OccupationLogesBars from './cockpit/OccupationLogesBars';
import QuickActionButton from './cockpit/QuickActionButton';
import CockpitDesktop from './cockpit/CockpitDesktop';
import CockpitHeader from './cockpit/CockpitHeader';
import SevragesRetardSection, { type SevrageRetard } from './cockpit/SevragesRetardSection';
import CriticalAlertStrip from './cockpit/CriticalAlertStrip';

const DAY_MS = 86_400_000;

function parseFrDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

type QuickSheetKind = 'saillie' | 'soin' | 'note' | null;

const Cockpit: React.FC = () => {
  const navigate = useNavigate();
  const { truies, verrats, bandes } = useTroupeau();
  const { stockAliment, stockVeto } = useRessources();
  const { alerts, alertesServeur, saillies } = usePilotage();
  const { loading, recomputeAlerts } = useMeta();
  const { handleRefresh } = useAutoRefresh();

  const [sheet, setSheet] = useState<QuickSheetKind>(null);
  const [showSaillie, setShowSaillie] = useState(false);
  const [peseeOpen, setPeseeOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [pulse, setPulse] = useState(false);

  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = (): void => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const { current, confirm, dismiss } = usePhaseTransitions();

  useEffect(() => {
    const timer = setInterval(() => {
      recomputeAlerts();
    }, 60000);
    return () => clearInterval(timer);
  }, [recomputeAlerts]);

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

  const topBandesNv = useMemo(() => {
    const list = porteesReelles.filter((b) => typeof b.nv === 'number' && (b.nv ?? 0) > 0);
    list.sort((a, b) => (b.nv ?? 0) - (a.nv ?? 0));
    return list.slice(0, 3);
  }, [porteesReelles]);

  const targetNv = 12;

  const PRIORITY_ORDER: Record<AlertPriority, number> = {
    CRITIQUE: 0,
    HAUTE: 1,
    NORMALE: 2,
    INFO: 3,
  };
  const topAlerts = useMemo<PanelAlerteRow[]>(() => {
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

  const { userName: authUserName } = useAuth();
  let storedUserName: string | null = null;
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
      storedUserName = window.localStorage.getItem('user_name');
    }
  } catch {
    storedUserName = null;
  }
  const resolvedUserName =
    (authUserName && authUserName !== 'Utilisateur' ? authUserName : null) ||
    storedUserName ||
    'Utilisateur';
  const userFirstName = resolvedUserName.split(' ')[0];

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={false}>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          {isDesktop ? (
            <CockpitDesktop
              userFirstName={userFirstName}
              todayShort={todayShort}
              headerDate={headerDate}
              headerTime={headerTime}
              truiesCount={truies.length}
              verratsCount={verrats.length}
              nbPorcelets={cheptelStats.nbPorcelets}
              desktopKpis={desktopKpis}
              topBandesNv={topBandesNv}
              topAlerts={topAlerts}
              calendarVisible={calendarVisible}
              targetNv={targetNv}
              pulse={pulse}
            />
          ) : (
            <div>
              <CockpitHeader
                userFirstName={userFirstName}
                headerDate={headerDate}
                headerTime={headerTime}
              />

              <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
                <CriticalAlertStrip alert={criticalAlert} />

                <KpiGridMobile
                  loading={loading}
                  truiesCount={truies.length}
                  alertsCount={alerts.length}
                  alertesServeurCount={alertesServeur.length}
                  stockAlimentCount={stockAliment.length}
                  stockVetoCount={stockVeto.length}
                  kpiPleines={kpiPleines}
                  kpiMaternite={kpiMaternite}
                  kpiAlertesTotal={kpiAlertesTotal}
                  kpiStocksRuptures={kpiStocksRuptures}
                  pulse={pulse}
                />

                <SevragesRetardSection items={sevragesEnRetard} />

                <MonElevageCard
                  nbTruies={cheptelStats.nbTruies}
                  nbVerrats={cheptelStats.nbVerrats}
                  nbPorcelets={cheptelStats.nbPorcelets}
                  nbPorceletsSousMere={cheptelStats.nbPorceletsSousMere}
                  postSevrageTotal={cheptelStats.postSevrageTotal}
                />

                <AgendaList agenda={agenda} agendaVisible={agendaVisible} />

                <OccupationLogesBars
                  materniteOcc={materniteOcc}
                  postSevrageOcc={postSevrageOcc}
                  engraissementOcc={engraissementOcc}
                />

                <ForecastWidget />

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

export default Cockpit;
