import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { useFarm } from '../../context/FarmContext';
import { normaliseStatut } from '../../lib/truieStatut';
import { Bandes } from '../../services/bandAnalysisEngine';
import type { LogeOccupation, LogeOccupationAlerte } from '../../services/bandesAggregator';
import { useTroupeauPipeline } from '../../hooks/useTroupeauStats';
import { FARM_CONFIG } from '../../config/farm';

import TroupeauTruiesView from '../troupeau/TroupeauTruiesView';
import TroupeauVerratsView from '../troupeau/TroupeauVerratsView';
import TroupeauPorceletsView from '../troupeau/TroupeauPorceletsView';
import TroupeauLogesView from '../troupeau/TroupeauLogesView';

// ─── Sub-tabs ────────────────────────────────────────────────────────────────

type SubTab = 'truies' | 'verrats' | 'porcelets' | 'loges';

const SUB_TABS: ReadonlyArray<{ id: SubTab; label: string }> = [
  { id: 'truies', label: 'Truies' },
  { id: 'verrats', label: 'Verrats' },
  { id: 'porcelets', label: 'Porcelets' },
  { id: 'loges', label: 'Loges' },
];

function isSubTab(v: string | null): v is SubTab {
  return v === 'truies' || v === 'verrats' || v === 'porcelets' || v === 'loges';
}

const TroupeauHub: React.FC = () => {
  const { verrats, bandes } = useFarm();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTruies } = useTroupeauPipeline();

  const viewParam = searchParams.get('view');
  const initialSubTab: SubTab = isSubTab(viewParam) ? viewParam : 'truies';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab);

  // Sync state with URL parameter
  useEffect(() => {
    if (isSubTab(viewParam) && viewParam !== activeSubTab) {
      setActiveSubTab(viewParam);
    }
  }, [viewParam, activeSubTab]);

  const handleSubTabChange = (tab: SubTab): void => {
    setActiveSubTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'truies') next.delete('view');
    else next.set('view', tab);
    setSearchParams(next, { replace: true });
  };

  // Search states lifted to Hub to persist during tab changes
  const [searchTruies, setSearchTruies] = useState('');
  const [searchVerrats, setSearchVerrats] = useState('');
  const [searchPorcelets, setSearchPorcelets] = useState('');

  const today = useMemo(() => new Date(), []);
  const realBandes = useMemo(() => Bandes.filterReal(bandes), [bandes]);

  const summary = useMemo(() => {
    const isCanon = (statut: string | undefined, canon: string) =>
      normaliseStatut(statut) === canon;

    return {
      total: activeTruies.length,
      pleines: activeTruies.filter(t => isCanon(t.statut, 'PLEINE')).length,
      maternite: activeTruies.filter(t => isCanon(t.statut, 'MATERNITE')).length,
      vides: activeTruies.filter(t => isCanon(t.statut, 'VIDE')).length,
      mat: Bandes.logesMaternite(activeTruies),
      post: Bandes.logesPostSevrage(realBandes, today),
      eng: Bandes.logesEngraissement(realBandes, today),
    };
  }, [activeTruies, realBandes, today]);

  const porceletCount = useMemo(
    () => realBandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0),
    [realBandes],
  );

  const totalLogesCapacity = useMemo(() =>
    FARM_CONFIG.MATERNITE_LOGES_CAPACITY +
    FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY +
    FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY,
  []);

  const tabCounts: Record<SubTab, number> = {
    truies: activeTruies.length,
    verrats: verrats.length,
    porcelets: porceletCount,
    loges: summary.mat.occupees + summary.post.occupees + summary.eng.occupees,
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="TROUPEAU"
            subtitle={`Ferme K13 · ${activeTruies.length + verrats.length} animaux`}
          />

          <div className="px-4 pt-3 pb-32 flex flex-col gap-5">
            {/* ── Summary strip ─────────────────────────────────────── */}
            <SummaryStrip
              total={summary.total}
              pleines={summary.pleines}
              maternite={summary.maternite}
              vides={summary.vides}
              mat={summary.mat}
              post={summary.post}
              eng={summary.eng}
            />

            {/* ── Sub-tabs ─────────────────────────────────────────── */}
            <div
              role="tablist"
              aria-label="Sélectionner une vue du troupeau"
              className="flex gap-1 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide border-b border-border bg-bg-0 sticky top-0 z-10"
            >
              {SUB_TABS.map((t) => {
                const active = activeSubTab === t.id;
                const count = tabCounts[t.id];
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    aria-controls={`troupeau-panel-${t.id}`}
                    id={`troupeau-tab-${t.id}`}
                    onClick={() => handleSubTabChange(t.id)}
                    className={`pressable shrink-0 px-3.5 py-2.5 ft-heading text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1.5 relative font-bold ${
                      active ? 'text-accent' : 'text-text-2 hover:text-text-0'
                    }`}
                  >
                    {t.label}
                    <span className="font-mono tabular-nums text-[9px] opacity-60">
                      {t.id === 'loges' ? `${count}/${totalLogesCapacity}` : String(count).padStart(2, '0')}
                    </span>
                    {active && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Panels ───────────────────────────────────────────────── */}
            <div
              role="tabpanel"
              id={`troupeau-panel-${activeSubTab}`}
              aria-labelledby={`troupeau-tab-${activeSubTab}`}
              className="animate-fade-in"
            >
              {activeSubTab === 'truies' && (
                <TroupeauTruiesView searchText={searchTruies} setSearchText={setSearchTruies} />
              )}
              {activeSubTab === 'verrats' && (
                <TroupeauVerratsView searchText={searchVerrats} setSearchText={setSearchVerrats} />
              )}
              {activeSubTab === 'porcelets' && (
                <TroupeauPorceletsView searchText={searchPorcelets} setSearchText={setSearchPorcelets} />
              )}
              {activeSubTab === 'loges' && <TroupeauLogesView />}
            </div>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Summary strip ───────────────────────────────────────────────────────────

interface SummaryStripProps {
  total: number;
  pleines: number;
  maternite: number;
  vides: number;
  mat: LogeOccupation;
  post: LogeOccupation;
  eng: LogeOccupation;
}

const SummaryStrip: React.FC<SummaryStripProps> = ({
  total,
  pleines,
  maternite,
  vides,
  mat,
  post,
  eng,
}) => (
  <div
    className="card-dense flex flex-col gap-3 p-3.5"
    role="group"
    aria-label="Synthèse troupeau et occupation des loges"
  >
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono tabular-nums text-[12px] text-text-1">
      <span className="text-text-0 font-bold uppercase tracking-tight">
        {total} truie{total > 1 ? 's' : ''}
      </span>
      <span className="text-text-2 opacity-40">|</span>
      <span>{pleines} pleines</span>
      <span className="text-text-2 opacity-40">|</span>
      <span>{maternite} maternité</span>
      <span className="text-text-2 opacity-40">|</span>
      <span>{vides} vides</span>
    </div>

    <div className="grid grid-cols-3 gap-3">
      <LogesMiniBar label="Mat." occ={mat} />
      <LogesMiniBar label="PS" occ={post} />
      <LogesMiniBar label="Eng." occ={eng} />
    </div>
  </div>
);

const ALERT_BAR_CLASS: Record<LogeOccupationAlerte, string> = {
  OK: 'bg-accent',
  HIGH: 'bg-amber',
  FULL: 'bg-red',
};

const LogesMiniBar: React.FC<{ label: string; occ: LogeOccupation }> = ({ label, occ }) => {
  const width = Math.min(occ.tauxPct, 100);
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-[9px] uppercase tracking-widest text-text-2 font-bold">
          {label}
        </span>
        <span className="font-mono tabular-nums text-[10px] text-text-0 font-bold">
          {occ.occupees}/{occ.capacite}
        </span>
      </div>
      <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
        <div
          className={`h-full ${ALERT_BAR_CLASS[occ.alerte]} transition-[width] duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

export default TroupeauHub;
