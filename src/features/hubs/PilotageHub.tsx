/**
 * PilotageHub — /pilotage (tab 05)
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte Claude Design v2 (2026-04-20) — mockup _tabs/05-pilotage.
 *
 * Structure :
 *   1. Period selector — 4 chips (7J · 30J · 90J · 1A)
 *   2. MODULES — HubTiles (Finances · Rapports · Perf · Alertes · Audit)
 *   3. INDICATEURS · [période] — 4 SparklineCard (Sevrés / Mortalité / IC / Cycles)
 */

import React, { useState, useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import {
  Wallet, FileText, TrendingUp, AlertTriangle, FileCheck,
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import {
  HubTile, SectionDivider, SparklineCard,
} from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  computeSevresParPortee,
  computeMortalitePorcelets,
  computeIndiceConso,
  computeCyclesReussis,
  type PeriodeKey,
} from '../../services/perfKpiAnalyzer';

const PilotageHub: React.FC = () => {
  const {
    criticalAlertCount,
    alertesServeur,
    finances,
    truies,
    bandes,
    stockAliment,
  } = useFarm();
  const [periode, setPeriode] = useState<PeriodeKey>('30J');

  // Nombre de transactions récentes pour le count du HubTile Finances
  const nbTransactions = useMemo(() => finances.length, [finances]);

  // KPI performance — calculs réels via perfKpiAnalyzer
  // Dépendances : données brutes + période → recompute auto au switch de tab
  const kpiSevres = useMemo(
    () => computeSevresParPortee(bandes, periode),
    [bandes, periode],
  );
  const kpiMortalite = useMemo(
    () => computeMortalitePorcelets(bandes, periode),
    [bandes, periode],
  );
  const kpiIC = useMemo(
    () => computeIndiceConso(bandes, stockAliment, periode),
    [bandes, stockAliment, periode],
  );
  const kpiCycles = useMemo(
    () => computeCyclesReussis(truies, bandes, periode),
    [truies, bandes, periode],
  );

  const totalAlertes = criticalAlertCount + alertesServeur.length;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="PILOTAGE"
            subtitle="Performance · Finances · Admin"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Period selector ────────────────────────────────────── */}
            <div role="tablist" aria-label="Période" className="flex gap-1.5">
              {(['7J', '30J', '90J', '1A'] as const).map((p) => {
                const on = periode === p;
                return (
                  <button
                    key={p}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setPeriode(p)}
                    className={`pressable flex-1 py-2.5 rounded-md font-mono text-[11px] font-semibold uppercase tracking-wide border transition-colors ${
                      on
                        ? 'bg-bg-2 border-coral text-coral'
                        : 'bg-transparent border-border text-text-1 hover:text-text-0'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* ── MODULES (HubTiles) ──────────────────────────────────── */}
            <section aria-label="Modules">
              <SectionDivider label="Modules" />
              <div className="grid grid-cols-2 gap-2.5">
                <HubTile
                  icon={<Wallet size={20} aria-hidden="true" />}
                  title="Finances"
                  subtitle="Trésorerie K13"
                  count={nbTransactions}
                  to="/pilotage/finances"
                  tone="gold"
                  variant="compact"
                />
                <HubTile
                  icon={<FileText size={20} aria-hidden="true" />}
                  title="Rapports"
                  subtitle="Détail 6 mois"
                  to="/pilotage/rapports"
                  tone="coral"
                  variant="compact"
                />
                <HubTile
                  icon={<TrendingUp size={20} aria-hidden="true" />}
                  title="Perf"
                  subtitle="GMQ · IC · prod."
                  to="/pilotage/perf"
                  tone="accent"
                  variant="compact"
                />
                <HubTile
                  icon={<AlertTriangle size={20} aria-hidden="true" />}
                  title="Alertes"
                  subtitle="À traiter"
                  count={totalAlertes}
                  to="/pilotage/alertes"
                  tone={totalAlertes > 0 ? 'amber' : 'default'}
                  variant="compact"
                />
              </div>
              <div className="mt-2.5">
                <HubTile
                  icon={<FileCheck size={22} aria-hidden="true" />}
                  title="Audit"
                  subtitle="Historique actions terrain"
                  to="/pilotage/audit"
                  tone="teal"
                />
              </div>
            </section>

            {/* ── INDICATEURS · période ───────────────────────────────── */}
            <section aria-label={`Indicateurs ${periode}`}>
              <SectionDivider label={`Indicateurs · ${periode}`} />
              <div className="flex flex-col gap-2.5">
                <SparklineCard
                  label="Sevrés / portée"
                  value={kpiSevres.value.toFixed(1)}
                  data={kpiSevres.series}
                  delta={kpiSevres.delta}
                  tone="accent"
                />
                <SparklineCard
                  label="Mortalité porcelets"
                  value={kpiMortalite.value.toFixed(1)}
                  unit="%"
                  data={kpiMortalite.series}
                  delta={kpiMortalite.delta}
                  tone="blue"
                />
                <SparklineCard
                  label="Indice conso. (IC)"
                  value={kpiIC.value.toFixed(2)}
                  data={kpiIC.series}
                  delta={kpiIC.delta}
                  tone="amber"
                />
                <SparklineCard
                  label="Cycles réussis"
                  value={kpiCycles.value.toFixed(0)}
                  unit="%"
                  data={kpiCycles.series}
                  delta={kpiCycles.delta}
                  tone="gold"
                />
              </div>
            </section>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default PilotageHub;
