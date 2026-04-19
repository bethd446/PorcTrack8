import React, { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Activity,
  Baby,
  Skull,
  Trophy,
  AlertTriangle,
  Repeat,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
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
    case 'ISSE_ELEVE':
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
    case 'ISSE_ELEVE':
      return 'ISSE';
    case 'MULTIPLE':
    default:
      return 'Multi';
  }
}

// ─── Tones KPI repro avancés ────────────────────────────────────────────────
type KpiTone = 'default' | 'warning' | 'critical' | 'success';

/** ISSE (j) : cible 3-7, amber 8-10, red >10. Null → default. */
function isseToTone(isse: number | null): KpiTone {
  if (isse === null) return 'default';
  if (isse >= 3 && isse <= 7) return 'success';
  if (isse >= 8 && isse <= 10) return 'warning';
  return 'critical';
}

/** IEM (j) : cible 140-150, amber 135-155, red hors. */
function iemToTone(iem: number | null): KpiTone {
  if (iem === null) return 'default';
  if (iem >= 140 && iem <= 150) return 'success';
  if (iem >= 135 && iem <= 155) return 'warning';
  return 'critical';
}

/** Taux MB (%) : cible ≥88, amber 82-88, red <82. */
function tauxMBToTone(taux: number | null): KpiTone {
  if (taux === null) return 'default';
  if (taux >= 88) return 'success';
  if (taux >= 82) return 'warning';
  return 'critical';
}

/** Renouvellement (%) : cible 30-40, amber 25-30 ou 40-45, red <25 ou >45. */
function renouvToTone(taux: number | null): KpiTone {
  if (taux === null) return 'default';
  if (taux >= 30 && taux <= 40) return 'success';
  if ((taux >= 25 && taux < 30) || (taux > 40 && taux <= 45)) return 'warning';
  return 'critical';
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

                {/* ── Reproduction avancée : ISSE, IEM, Taux MB, Renouv. ── */}
                <section>
                  <SectionDivider label="Reproduction avancée" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <KpiCard
                        label="ISSE"
                        value={kpis.isseMoyJours !== null ? formatNum(kpis.isseMoyJours) : '—'}
                        unit={kpis.isseMoyJours !== null ? 'j' : undefined}
                        icon={<Repeat size={14} />}
                        tone={isseToTone(kpis.isseMoyJours)}
                      />
                      <span className="px-1 font-mono text-[10px] text-text-2">cible 3-7 j</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <KpiCard
                        label="IEM"
                        value={kpis.iemMoyJours !== null ? formatNum(kpis.iemMoyJours) : '—'}
                        unit={kpis.iemMoyJours !== null ? 'j' : undefined}
                        icon={<CalendarClock size={14} />}
                        tone={iemToTone(kpis.iemMoyJours)}
                      />
                      <span className="px-1 font-mono text-[10px] text-text-2">
                        cible 140-150 j
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <KpiCard
                        label="Taux MB"
                        value={kpis.tauxMBPct !== null ? formatNum(kpis.tauxMBPct) : '—'}
                        unit={kpis.tauxMBPct !== null ? '%' : undefined}
                        icon={<CheckCircle2 size={14} />}
                        tone={tauxMBToTone(kpis.tauxMBPct)}
                      />
                      <span className="px-1 font-mono text-[10px] text-text-2">cible ≥ 88 %</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <KpiCard
                        label="Renouv."
                        value={
                          kpis.tauxRenouvellementPct !== null
                            ? formatNum(kpis.tauxRenouvellementPct)
                            : '—'
                        }
                        unit={kpis.tauxRenouvellementPct !== null ? '%' : undefined}
                        icon={<RefreshCw size={14} />}
                        tone={renouvToTone(kpis.tauxRenouvellementPct)}
                      />
                      <span className="px-1 font-mono text-[10px] text-text-2">
                        cible 30-40 %/an
                      </span>
                    </div>
                  </div>
                </section>

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
