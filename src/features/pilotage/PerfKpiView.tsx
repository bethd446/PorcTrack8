import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Trophy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
} from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import { default as KpiCardV6 } from '../../components/design/KpiCard';
import { Chip, DataRow, SectionDivider } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  computeGlobalKpis,
  rankTruiesByPerformance,
  detectTruiesAReformer,
  computeZootechniqueKpis,
  GMQ_CIBLES,
  type TruieRanking,
  type TruiesAReformer,
  type MotifReforme,
  type TrancheAge,
} from '../../services/perfKpiAnalyzer';
import { genererRapportGlobal } from '../../services/financialAnalyzer';
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
      return 'Productivité faible';
    case 'INACTIVE_LONG':
      return 'Truie inactive longue durée';
    case 'ISSE_ELEVE':
      return 'Sevrage-saillie trop long';
    case 'MULTIPLE':
    default:
      return 'Plusieurs motifs';
  }
}

/** Mapping des tiers de performance vers un libellé sentence case. */
const TIER_LABEL: Record<PerformanceTier, string> = {
  ELITE: 'Élite',
  BON: 'Bon',
  MOYEN: 'Moyen',
  FAIBLE: 'Faible',
  INSUFFISANT: 'Insuffisant',
};

// ─── Tones KPI repro avancés ────────────────────────────────────────────────
type KpiTone = 'default' | 'warning' | 'critical' | 'success';

function toneToAccent(tone: KpiTone): string | undefined {
  switch (tone) {
    case 'critical':
      return 'var(--color-danger, #EF4444)';
    case 'warning':
      return 'var(--amber-pork)';
    case 'success':
    case 'default':
    default:
      return undefined;
  }
}

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

/** Hint affiché sous un KPI vide pour expliquer la donnée manquante. */
function emptyHint(nbBandes: number): string {
  return `Données insuffisantes (requiert portées sevrées). Tu as ${nbBandes} bande${nbBandes > 1 ? 's' : ''}.`;
}

/** Nom affichable d'une truie : nom prioritaire, puis displayId, puis boucle. */
function truieLabel(truie: { displayId: string; boucle: string; nom?: string }): string {
  return truie.nom || truie.displayId || truie.boucle;
}

/** Échappe une cellule CSV (RFC 4180). */
function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Seuil minimal de bandes pour considérer les indicateurs techniques fiables. */
const SEUIL_INDICATEURS_FIABLES = 10;

/**
 * PerfKpiView — /pilotage/perf
 *
 * Page d'aide à la décision : hero troupeau, top truies, candidates à réforme,
 * indicateurs techniques repliables (vides tant que les portées sevrées sont
 * insuffisantes), export PDF/CSV.
 */
const PerfKpiView: React.FC = () => {
  const { truies, bandes, saillies, transitions } = useFarm();
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

  const finance = useMemo(
    () => genererRapportGlobal(bandes, transitions ?? []),
    [bandes, transitions],
  );

  // V36-A — KPIs zootechniques (ICR/GMQ/IC global/Marge brute/Mortalité par phase).
  // Tous les inputs financiers viennent de `finance` ; les inputs aliment du
  // contexte ne sont pas exposés ici (totalAlimentKg = 0 → ICR/IC null OK).
  const zooKpis = useMemo(
    () =>
      computeZootechniqueKpis(
        bandes,
        0, // totalAlimentKg : pas de stream consommation aliment côté ferme
        finance.totalRevenuProjete ?? 0,
        finance.totalCout ?? 0,
        kpis.nbTruiesProductives,
      ),
    [bandes, finance.totalRevenuProjete, finance.totalCout, kpis.nbTruiesProductives],
  );

  const nbBandes = bandes.length;
  const hasData = kpis.nbPortees12m > 0 || kpis.nbTruiesProductives > 0;
  const indicateursFiables = nbBandes >= SEUIL_INDICATEURS_FIABLES;
  const [indicateursOuverts, setIndicateursOuverts] = useState<boolean>(indicateursFiables);

  // ── Hero : statut global + ROI moyen ─────────────────────────────────────
  // "En cycle" = truie ayant au moins 1 portée enregistrée OU au moins 1 saillie active.
  // Définition plus large que "productive" (qui exige une portée sevrée) pour
  // refléter correctement les troupeaux en démarrage avec saillies actives non encore portées.
  const nbTruiesEnCycle = useMemo(() => {
    const saillieTruieIds = new Set(saillies.map(s => s.truieId));
    return truies.filter(t => {
      const aPortee = kpis.nbTruiesProductives > 0 && bandes.some(
        b => b.truie === t.id || (!!t.boucle && b.boucleMere === t.boucle),
      );
      const aSaillie = saillieTruieIds.has(t.id);
      return aPortee || aSaillie;
    }).length;
  }, [truies, bandes, saillies, kpis.nbTruiesProductives]);

  const truiesEnCyclePct =
    kpis.nbTruiesTotal > 0
      ? Math.round((nbTruiesEnCycle / kpis.nbTruiesTotal) * 100)
      : 0;

  const roiMoyen = useMemo<number | null>(() => {
    // Garde anti-explosion : si le coût total est trop bas (<1 000 unités),
    // les données sont insuffisantes (bandes trop jeunes) → ne pas afficher.
    if (finance.totalCout < 1_000) return null;
    const raw = Math.round((finance.margeGlobaleEstimee / finance.totalCout) * 100);
    // Cap symétrique à ±999 % pour éviter les valeurs invraisemblables.
    return Math.max(-999, Math.min(999, raw));
  }, [finance.totalCout, finance.margeGlobaleEstimee]);

  type StatutGlobal = 'OK' | 'SURVEILLER' | 'CRITIQUE' | 'INDISPONIBLE';
  const statutGlobal = useMemo<StatutGlobal>(() => {
    if (!hasData) return 'INDISPONIBLE';
    const critiques: number[] = [];
    if (roiMoyen !== null) critiques.push(roiMoyen < 0 ? 1 : 0);
    if (kpis.tauxMortaliteNaissanceSevrage > 15) critiques.push(1);
    if (kpis.tauxMBPct !== null && kpis.tauxMBPct < 82) critiques.push(1);
    if (kpis.isseMoyJours !== null && kpis.isseMoyJours > 10) critiques.push(1);
    const sumCrit = critiques.reduce((a, b) => a + b, 0);
    if (sumCrit >= 2) return 'CRITIQUE';
    if (sumCrit === 1) return 'SURVEILLER';
    return 'OK';
  }, [hasData, roiMoyen, kpis.tauxMortaliteNaissanceSevrage, kpis.tauxMBPct, kpis.isseMoyJours]);

  const statutDisplay = useMemo(() => {
    switch (statutGlobal) {
      case 'OK':
        return { label: 'Bon', tone: 'accent' as ChipTone, dot: 'var(--color-accent-500)' };
      case 'SURVEILLER':
        return { label: 'À surveiller', tone: 'amber' as ChipTone, dot: 'var(--amber-pork)' };
      case 'CRITIQUE':
        return { label: 'Critique', tone: 'red' as ChipTone, dot: 'var(--color-danger, #EF4444)' };
      case 'INDISPONIBLE':
      default:
        return { label: 'Données partielles', tone: 'default' as ChipTone, dot: 'var(--muted)' };
    }
  }, [statutGlobal]);

  const goToTruie = (id: string): void => {
    navigate(`/troupeau/truies/${id}`);
  };

  const goToReforme = (): void => {
    navigate('/troupeau?view=truies&statut=REFORME');
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handlePrint = (): void => {
    if (typeof window !== 'undefined') window.print();
  };

  const handleExportCsv = (): void => {
    if (typeof document === 'undefined') return;
    const header = ['Bande', 'Truie', 'NV', 'Morts', 'Vivants', 'DateMB', 'DateSevrage', 'Statut'];
    const lines = bandes.map(b =>
      [
        b.id ?? '',
        b.truie ?? b.boucleMere ?? '',
        b.nv ?? '',
        b.morts ?? '',
        b.vivants ?? '',
        b.dateMB ?? '',
        b.dateSevrageReelle ?? b.dateSevragePrevue ?? '',
        b.statut ?? '',
      ].map(csvCell).join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porctrack-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderRanking = (r: TruieRanking): React.ReactNode => (
    <DataRow
      key={r.truie.id}
      primary={truieLabel(r.truie)}
      secondary={`${r.performance.nbPortees} portées · moyNV ${formatNum(r.performance.moyNV)}`}
      meta={<span>{r.performance.scoreCompetence}</span>}
      accessory={<Chip tone={tierToChipTone(r.performance.tier)} label={TIER_LABEL[r.performance.tier] ?? r.performance.tier} />}
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

  const topLimited = top.slice(0, 5);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <TopBarSync
            crumbs={['Pilotage', 'Performance']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-5"
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            <header>
              <Eyebrow dotColor="accent">Pilotage · GTTT</Eyebrow>
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Performance
              </h1>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                Indicateurs techniques · {nbBandes} bande{nbBandes > 1 ? 's' : ''}
              </div>
            </header>

            {/* ── Hero : ton troupeau en un coup d'œil ────────────────── */}
            <section
              className="card-dense flex flex-col gap-3 p-5"
              style={{
                background: 'var(--bg-surface, #fff)',
                borderLeft: `4px solid ${statutDisplay.dot}`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="font-mono uppercase tracking-widest text-text-2"
                  style={{ fontSize: 10 }}
                >
                  Ton troupeau en un coup d'œil
                </span>
                <Chip tone={statutDisplay.tone} label={statutDisplay.label} size="sm" />
              </div>

              {hasData ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col">
                    <span
                      className="font-heading text-text-0"
                      style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}
                    >
                      {nbTruiesEnCycle}
                      <span className="text-text-2" style={{ fontSize: 16, fontWeight: 500 }}>
                        /{kpis.nbTruiesTotal}
                      </span>
                    </span>
                    <span className="font-mono text-text-2 mt-1" style={{ fontSize: 11 }}>
                      Truies en cycle ({truiesEnCyclePct} %)
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className="font-heading text-text-0"
                      style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}
                    >
                      {roiMoyen !== null ? `${roiMoyen}` : '—'}
                      {roiMoyen !== null && (
                        <span className="text-text-2" style={{ fontSize: 16, fontWeight: 500 }}>
                          {' '}%
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-text-2 mt-1" style={{ fontSize: 11 }}>
                      ROI moyen estimé
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className="font-heading text-text-0"
                      style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}
                    >
                      {kpis.nbMbAVenir30j}
                    </span>
                    <span className="font-mono text-text-2 mt-1" style={{ fontSize: 11 }}>
                      Mises-bas à venir 30 j
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-4">
                  <TrendingUp size={32} className="text-text-2 mb-2" aria-hidden="true" />
                  <div className="text-[14px] text-text-0 font-medium">
                    Saisie en cours.
                  </div>
                  <div className="font-mono text-[12px] text-text-2 mt-1">
                    Reviens dans 2-3 mois pour voir tes premières moyennes.
                  </div>
                </div>
              )}
            </section>

            {/* ── Tes meilleures truies ──────────────────────────────── */}
            <section>
              <SectionDivider label="Tes meilleures truies" />
              {topLimited.length === 0 ? (
                <div className="card-dense text-[13px] text-text-2 text-center py-4 flex items-center justify-center gap-2">
                  <Trophy size={14} className="text-text-2" />
                  <span>Aucune truie élite ou bonne pour l'instant.</span>
                </div>
              ) : (
                <div className="card-dense !p-0 overflow-hidden">
                  {topLimited.map(renderRanking)}
                </div>
              )}
            </section>

            {/* ── Truies à réformer (candidates) ─────────────────────── */}
            <section>
              <SectionDivider label="Truies à réformer (candidates)" />
              {aReformer.length === 0 ? (
                <div className="card-dense text-[13px] text-text-2 text-center py-4">
                  Aucune candidate à réforme pour l'instant. Bon signe.
                </div>
              ) : (
                <>
                  <div className="card-dense !p-0 overflow-hidden">
                    {aReformer.map(renderReforme)}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-text-2">
                      <AlertTriangle size={12} className="text-amber" />
                      <span>
                        {aReformer.length} truie{aReformer.length > 1 ? 's' : ''} suggérée
                        {aReformer.length > 1 ? 's' : ''} · validation porcher requise.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={goToReforme}
                      className="font-mono text-[11px] underline text-text-0 hover:text-[var(--color-accent-500)]"
                    >
                      Voir la liste détaillée →
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* ── Indicateurs techniques (repliable) ─────────────────── */}
            <section className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIndicateursOuverts(v => !v)}
                className="card-dense w-full flex items-center justify-between p-4 text-left"
                aria-expanded={indicateursOuverts}
              >
                <div className="flex flex-col">
                  <span className="font-heading uppercase text-text-0" style={{ fontSize: 12, letterSpacing: '0.05em' }}>
                    Indicateurs techniques
                  </span>
                  <span className="font-mono text-text-2 mt-1" style={{ fontSize: 11 }}>
                    Sevrage→saillie · Entre mises-bas · % saillies réussies · Renouvellement…
                  </span>
                  {!indicateursFiables && (
                    <span className="font-mono text-text-2 mt-1" style={{ fontSize: 11 }}>
                      Données insuffisantes (requiert {SEUIL_INDICATEURS_FIABLES} portées sevrées sur 12 mois).
                    </span>
                  )}
                </div>
                {indicateursOuverts ? (
                  <ChevronUp size={18} className="text-text-2 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDown size={18} className="text-text-2 shrink-0" aria-hidden="true" />
                )}
              </button>

              {indicateursOuverts && (
                <div className="flex flex-col gap-5">
                  {!hasData ? (
                    <div className="card-dense flex flex-col items-center justify-center py-8 text-center">
                      <TrendingUp size={36} className="text-text-2 mb-2" aria-hidden="true" />
                      <div className="text-[13px] text-text-0 font-medium">
                        Aucune portée enregistrée sur les 12 derniers mois.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Summary strip : 4 KPI globaux */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <KpiCardV6
                            label="Sevrés/truie/an"
                            value={formatNum(kpis.sevresParTruieAn)}
                            accentColor={toneToAccent(kpis.sevresParTruieAn > 0 && kpis.sevresParTruieAn < 18 ? 'warning' : 'default')}
                          />
                          {kpis.sevresParTruieAn === 0 && (
                            <span className="px-1 font-mono text-[10px] text-text-2">{emptyHint(nbBandes)}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <KpiCardV6
                            label="Portées/truie/an"
                            value={formatNum(kpis.porteesParTruieAn)}
                          />
                          {kpis.porteesParTruieAn === 0 && (
                            <span className="px-1 font-mono text-[10px] text-text-2">{emptyHint(nbBandes)}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <KpiCardV6
                            label="NV moyen"
                            value={formatNum(kpis.moyNV)}
                          />
                          {kpis.moyNV === 0 && (
                            <span className="px-1 font-mono text-[10px] text-text-2">{emptyHint(nbBandes)}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <KpiCardV6
                            label="Mortalité naissance → sevrage"
                            value={formatNum(kpis.tauxMortaliteNaissanceSevrage)}
                            unit="%"
                            accentColor={kpis.tauxMortaliteNaissanceSevrage > 15 ? 'var(--color-danger, #EF4444)' : undefined}
                          />
                          {kpis.tauxMortaliteNaissanceSevrage === 0 && (
                            <span className="px-1 font-mono text-[10px] text-text-2">{emptyHint(nbBandes)}</span>
                          )}
                        </div>
                      </div>

                      {/* Secondary strip : 2 KPI auxiliaires */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <KpiCardV6
                            label="Interv. sev-sail."
                            value={
                              kpis.intervalSevrageSaillieMoyJours !== null
                                ? formatNum(kpis.intervalSevrageSaillieMoyJours)
                                : '—'
                            }
                            unit="j"
                          />
                          {kpis.intervalSevrageSaillieMoyJours === null && (
                            <span className="px-1 font-mono text-[10px] text-text-2">{emptyHint(nbBandes)}</span>
                          )}
                        </div>
                        <KpiCardV6 label="MB à venir 30j" value={kpis.nbMbAVenir30j} />
                      </div>

                      {/* Reproduction avancée : ISSE, IEM, Taux MB, Renouv. */}
                      <section>
                        <SectionDivider label="Reproduction avancée" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="Sevrage → saillie"
                              value={kpis.isseMoyJours !== null ? formatNum(kpis.isseMoyJours) : '—'}
                              unit={kpis.isseMoyJours !== null ? 'j' : undefined}
                              accentColor={toneToAccent(isseToTone(kpis.isseMoyJours))}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">
                              {kpis.isseMoyJours === null ? emptyHint(nbBandes) : 'cible 3-7 j'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="Entre mises-bas"
                              value={kpis.iemMoyJours !== null ? formatNum(kpis.iemMoyJours) : '—'}
                              unit={kpis.iemMoyJours !== null ? 'j' : undefined}
                              accentColor={toneToAccent(iemToTone(kpis.iemMoyJours))}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">
                              {kpis.iemMoyJours === null ? emptyHint(nbBandes) : 'cible 140-150 j'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="% saillies réussies"
                              value={kpis.tauxMBPct !== null ? formatNum(kpis.tauxMBPct) : '—'}
                              unit={kpis.tauxMBPct !== null ? '%' : undefined}
                              accentColor={toneToAccent(tauxMBToTone(kpis.tauxMBPct))}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">
                              {kpis.tauxMBPct === null ? emptyHint(nbBandes) : 'cible ≥ 88 %'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="Renouvellement annuel"
                              value={
                                kpis.tauxRenouvellementPct !== null
                                  ? formatNum(kpis.tauxRenouvellementPct)
                                  : '—'
                              }
                              unit={kpis.tauxRenouvellementPct !== null ? '%' : undefined}
                              accentColor={toneToAccent(renouvToTone(kpis.tauxRenouvellementPct))}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">
                              {kpis.tauxRenouvellementPct === null ? emptyHint(nbBandes) : 'cible 30-40 %/an'}
                            </span>
                          </div>
                        </div>
                      </section>

                      {/* V36-A — Section Technique (ICR / GMQ / IC global / Mortalité phase) */}
                      <section>
                        <SectionDivider label="Technique" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="ICR"
                              value={zooKpis.icrKg !== null ? formatNum(zooKpis.icrKg) : '—'}
                              unit={zooKpis.icrKg !== null ? 'kg/kg' : undefined}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">
                              {zooKpis.icrKg === null
                                ? `Saisie aliment manquante (${zooKpis.nbPorteesSevrees12m} portée${zooKpis.nbPorteesSevrees12m > 1 ? 's' : ''} sevrée${zooKpis.nbPorteesSevrees12m > 1 ? 's' : ''})`
                                : 'cible 2.6-2.9 kg/kg'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="IC global"
                              value={zooKpis.icGlobal !== null ? formatNum(zooKpis.icGlobal) : '—'}
                              unit={zooKpis.icGlobal !== null ? 'kg/kg' : undefined}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">
                              {zooKpis.icGlobal === null
                                ? 'Tonnage aliment requis'
                                : 'aliment / poids vif total'}
                            </span>
                          </div>
                        </div>

                        {/* GMQ par tranche */}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {(['POST_SEVRAGE', 'CROISSANCE', 'ENGRAISSEMENT', 'FINITION'] as TrancheAge[]).map(
                            (tr) => {
                              const v = zooKpis.gmqParTranche[tr];
                              const cible = GMQ_CIBLES[tr];
                              const trLabel: Record<TrancheAge, string> = {
                                POST_SEVRAGE: 'GMQ post-sev',
                                CROISSANCE: 'GMQ croissance',
                                ENGRAISSEMENT: 'GMQ engr.',
                                FINITION: 'GMQ finition',
                              };
                              return (
                                <div key={tr} className="flex flex-col gap-1">
                                  <KpiCardV6
                                    label={trLabel[tr]}
                                    value={v !== null ? `${v}` : '—'}
                                    unit={v !== null ? 'g/j' : undefined}
                                  />
                                  <span className="px-1 font-mono text-[10px] text-text-2">
                                    {v === null
                                      ? 'Pesée requise'
                                      : `cible ${cible} g/j`}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>

                        {/* Mortalité par phase */}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="Mort. maternité"
                              value={zooKpis.mortalite.maternitePct !== null
                                ? formatNum(zooKpis.mortalite.maternitePct) : '—'}
                              unit={zooKpis.mortalite.maternitePct !== null ? '%' : undefined}
                              accentColor={
                                zooKpis.mortalite.maternitePct !== null && zooKpis.mortalite.maternitePct > 15
                                  ? 'var(--color-danger, #EF4444)'
                                  : undefined
                              }
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">cible &lt; 12 %</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="Mort. post-sev"
                              value={zooKpis.mortalite.postSevragePct !== null
                                ? formatNum(zooKpis.mortalite.postSevragePct) : '—'}
                              unit={zooKpis.mortalite.postSevragePct !== null ? '%' : undefined}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">cible &lt; 3 %</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="Mort. engr."
                              value={zooKpis.mortalite.engraissementPct !== null
                                ? formatNum(zooKpis.mortalite.engraissementPct) : '—'}
                              unit={zooKpis.mortalite.engraissementPct !== null ? '%' : undefined}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">cible &lt; 2 %</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="Mort. finition"
                              value={zooKpis.mortalite.finitionPct !== null
                                ? formatNum(zooKpis.mortalite.finitionPct) : '—'}
                              unit={zooKpis.mortalite.finitionPct !== null ? '%' : undefined}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">cible &lt; 1.5 %</span>
                          </div>
                        </div>
                      </section>

                      {/* V36-A — Section Finances (marge brute par truie) */}
                      <section>
                        <SectionDivider label="Finances" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <KpiCardV6
                              label="Marge brute / truie"
                              value={zooKpis.margeBruteParTruie !== null
                                ? `${zooKpis.margeBruteParTruie}` : '—'}
                              unit={zooKpis.margeBruteParTruie !== null ? '€/an' : undefined}
                            />
                            <span className="px-1 font-mono text-[10px] text-text-2">
                              {zooKpis.margeBruteParTruie === null
                                ? 'Données financières manquantes'
                                : 'revenu - coût aliment'}
                            </span>
                          </div>
                          <KpiCardV6
                            label="ROI moyen"
                            value={roiMoyen !== null ? `${roiMoyen}` : '—'}
                            unit={roiMoyen !== null ? '%' : undefined}
                          />
                        </div>
                      </section>

                      {/* Flop truies (gardé pour l'analyse fine, sous indicateurs) */}
                      <section>
                        <SectionDivider label="Truies en sous-performance" />
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
                    </>
                  )}
                </div>
              )}
            </section>

            {/* ── Export ─────────────────────────────────────────────── */}
            <section className="flex flex-col gap-2 print:hidden">
              <SectionDivider label="Export" />
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="card-dense flex items-center gap-2 px-4 py-3 text-left hover:bg-bg-2 transition"
                >
                  <Printer size={16} className="text-text-2" aria-hidden="true" />
                  <span className="font-heading uppercase text-text-0" style={{ fontSize: 12, letterSpacing: '0.05em' }}>
                    Imprimer en PDF
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="card-dense flex items-center gap-2 px-4 py-3 text-left hover:bg-bg-2 transition"
                >
                  <Download size={16} className="text-text-2" aria-hidden="true" />
                  <span className="font-heading uppercase text-text-0" style={{ fontSize: 12, letterSpacing: '0.05em' }}>
                    Export CSV
                  </span>
                </button>
              </div>
              <span className="font-mono text-text-2 px-1" style={{ fontSize: 11 }}>
                Pour réunions banquier ou véto.
              </span>
            </section>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default PerfKpiView;
