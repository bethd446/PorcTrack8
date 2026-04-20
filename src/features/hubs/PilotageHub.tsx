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

type PeriodeKey = '7J' | '30J' | '90J' | '1A';

const PilotageHub: React.FC = () => {
  const { criticalAlertCount, alertesServeur, finances } = useFarm();
  const [periode, setPeriode] = useState<PeriodeKey>('30J');

  // Nombre de transactions récentes pour le count du HubTile Finances
  const nbTransactions = useMemo(() => finances.length, [finances]);

  // Sparkline data (mock-réaliste — à remplacer par computePerf quand dispo)
  const sparkData = useMemo(() => {
    const base = {
      '7J':  7,
      '30J': 30,
      '90J': 90,
      '1A':  365,
    }[periode];
    const steps = Math.min(base, 7);
    return {
      sevresPortee: Array.from({ length: steps }, (_, i) => ({
        x: i,
        y: 10.2 + i * 0.2 + (Math.random() - 0.5) * 0.3,
      })),
      mortalite: Array.from({ length: steps }, (_, i) => ({
        x: i,
        y: 6.0 - i * 0.28 + (Math.random() - 0.5) * 0.2,
      })),
      ic: Array.from({ length: steps }, (_, i) => ({
        x: i,
        y: 2.70 + i * 0.025 + (Math.random() - 0.5) * 0.03,
      })),
      cyclesReussis: Array.from({ length: steps }, (_, i) => ({
        x: i,
        y: 85 + i * 1.2 + (Math.random() - 0.5) * 0.8,
      })),
    };
  }, [periode]);

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
                  value="11.4"
                  data={sparkData.sevresPortee}
                  delta={+5}
                  tone="accent"
                />
                <SparklineCard
                  label="Mortalité porcelets"
                  value="4.2"
                  unit="%"
                  data={sparkData.mortalite}
                  delta={-18}
                  tone="blue"
                />
                <SparklineCard
                  label="Indice conso. (IC)"
                  value="2.85"
                  data={sparkData.ic}
                  delta={+1}
                  tone="amber"
                />
                <SparklineCard
                  label="Cycles réussis"
                  value="92"
                  unit="%"
                  data={sparkData.cyclesReussis}
                  delta={+3}
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
