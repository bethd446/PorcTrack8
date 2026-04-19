import React, { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Activity, Baby, Skull, Trophy, AlertTriangle } from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { Chip, DataRow, SectionDivider, KpiCard } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  computeGlobalKpis,
  rankTruiesByPerformance,
  detectTruiesAReformer,
  type TruieRanking,
  type TruiesAReformer,
  type MotifReforme,
} from '../../services/perfKpiAnalyzer';
import type { PerformanceTier } from '../../types/farm';

/**
 * Chip tone pour un tier performance (ELITE → gold, BON → accent, MOYEN → default,
 * FAIBLE → amber, INSUFFISANT → red).
 */
function tierToChipTone(tier: PerformanceTier): ChipTone {
  switch (tier) {
    case 'ELITE':
      return 'gold';
    case 'BON':
      return 'accent';
    case 'MOYEN':
      return 'default';
    case 'FAIBLE':
      return 'amber';
    case 'INSUFFISANT':
    default:
      return 'red';
  }
}

/** Chip tone pour un motif de réforme. */
function motifToChipTone(motif: MotifReforme): ChipTone {
  switch (motif) {
    case 'PERF_INSUFFISANTE':
      return 'red';
    case 'INACTIVE_LONG':
      return 'amber';
    case 'MULTIPLE':
    default:
      return 'red';
  }
}

/** Libellé court d'un motif — affiché dans le Chip. */
function motifLabel(motif: MotifReforme): string {
  switch (motif) {
    case 'PERF_INSUFFISANTE':
      return 'Perf';
    case 'INACTIVE_LONG':
      return 'Inactif';
    case 'MULTIPLE':
    default:
      return 'Multi';
  }
}

/** Formate un nombre : "—" si 0, sinon 1 décimale pour fractionnaires. */
function formatNum(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

/** Nom affichable d'une truie : nom prioritaire, puis displayId, puis boucle. */
function truieLabel(truie: { displayId: string; boucle: string; nom?: string }): string {
  return truie.nom || truie.displayId || truie.boucle;
}

/**
 * PerfKpiView — /pilotage/perf
 *
 * KPI globaux du troupeau + top/flop truies par score composite +
 * liste des candidates à réforme. Lecture seule, calculs en useMemo.
 */
const PerfKpiView: React.FC = () => {
  const { truies, bandes, saillies } = useFarm();
  const navigate = useNavigate();

  const kpis = useMemo(
    () => computeGlobalKpis(truies, bandes, saillies),
    [truies, bandes, saillies],
  );

  const { top, flop } = useMemo(
    () => rankTruiesByPerformance(truies, bandes, saillies),
    [truies, bandes, saillies],
  );

  const aReformer = useMemo(
    () => detectTruiesAReformer(truies, bandes, saillies),
    [truies, bandes, saillies],
  );

  // Empty state : pas une seule portée → aucune data pour statuer.
  const hasData = kpis.nbPortees12m > 0 || kpis.nbTruiesProductives > 0;

  const goToTruie = (id: string): void => {
    navigate(`/troupeau/truies/${id}`);
  };

  const renderRanking = (r: TruieRanking): React.ReactNode => (
    <DataRow
      key={r.truie.id}
      primary={truieLabel(r.truie)}
      secondary={`${r.performance.nbPortees} portées · moyNV ${formatNum(r.performance.moyNV)}`}
      meta={<span>{r.performance.scoreCompetence}</span>}
      accessory={<Chip tone={tierToChipTone(r.performance.tier)} label={r.performance.tier} />}
      onClick={() => goToTruie(r.truie.id)}
    />
  );

  const renderReforme = (r: TruiesAReformer): React.ReactNode => (
    <DataRow
      key={r.truie.id}
      primary={truieLabel(r.truie)}
      secondary={r.detail}
      accessory={<Chip tone={motifToChipTone(r.motif)} label={motifLabel(r.motif)} />}
      onClick={() => goToTruie(r.truie.id)}
    />
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="PERFORMANCE"
            subtitle="Productivité élevage · benchmarks"
            backTo="/pilotage"
          />

          <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
            {!hasData ? (
              <section className="card-dense flex flex-col items-center justify-center py-10 text-center">
                <TrendingUp size={48} className="text-text-2 mb-3" aria-hidden="true" />
                <div className="text-[14px] font-medium text-text-0">Données insuffisantes</div>
                <div className="mt-1 font-mono text-[12px] text-text-2">
                  Aucune portée enregistrée sur les 12 derniers mois.
                </div>
              </section>
            ) : (
              <>
                {/* ── Summary strip : 4 KPI globaux ─────────────────── */}
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard
                    label="Sevrés/truie/an"
                    value={formatNum(kpis.sevresParTruieAn)}
                    icon={<Baby size={14} />}
                    tone={kpis.sevresParTruieAn > 0 && kpis.sevresParTruieAn < 18 ? 'warning' : 'default'}
                  />
                  <KpiCard
                    label="Portées/truie/an"
                    value={formatNum(kpis.porteesParTruieAn)}
                    icon={<Activity size={14} />}
                  />
                  <KpiCard
                    label="NV moyen"
                    value={formatNum(kpis.moyNV)}
                    icon={<TrendingUp size={14} />}
                  />
                  <KpiCard
                    label="Mort. N→Sev"
                    value={formatNum(kpis.tauxMortaliteNaissanceSevrage)}
                    unit="%"
                    icon={<Skull size={14} />}
                    tone={kpis.tauxMortaliteNaissanceSevrage > 15 ? 'critical' : 'default'}
                  />
                </div>

                {/* ── Secondary strip : 2 KPI auxiliaires ───────────── */}
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard
                    label="Interv. sev-sail."
                    value={
                      kpis.intervalSevrageSaillieMoyJours !== null
                        ? formatNum(kpis.intervalSevrageSaillieMoyJours)
                        : '—'
                    }
                    unit="j"
                  />
                  <KpiCard label="MB à venir 30j" value={kpis.nbMbAVenir30j} />
                </div>

                {/* ── Top truies (ELITE / BON) ──────────────────────── */}
                <section>
                  <SectionDivider label="Top truies" />
                  {top.length === 0 ? (
                    <div className="card-dense text-[13px] text-text-2 text-center py-4 flex items-center justify-center gap-2">
                      <Trophy size={14} className="text-text-2" />
                      <span>Aucune truie ELITE ou BON pour l'instant.</span>
                    </div>
                  ) : (
                    <div className="card-dense !p-0 overflow-hidden">
                      {top.map(renderRanking)}
                    </div>
                  )}
                </section>

                {/* ── Flop truies (FAIBLE / INSUFFISANT, ≥3 portées) ─ */}
                <section>
                  <SectionDivider label="Flop truies" />
                  {flop.length === 0 ? (
                    <div className="card-dense text-[13px] text-text-2 text-center py-4">
                      Aucune truie en sous-performance avec données suffisantes.
                    </div>
                  ) : (
                    <div className="card-dense !p-0 overflow-hidden">
                      {flop.map(renderRanking)}
                    </div>
                  )}
                </section>

                {/* ── À réformer ───────────────────────────────────── */}
                {aReformer.length > 0 && (
                  <section>
                    <SectionDivider label="À réformer" />
                    <div className="card-dense !p-0 overflow-hidden">
                      {aReformer.map(renderReforme)}
                    </div>
                    <div className="mt-2 flex items-center gap-2 px-1 font-mono text-[11px] text-text-2">
                      <AlertTriangle size={12} className="text-amber" />
                      <span>Candidates — validation porcher requise avant décision.</span>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default PerfKpiView;
