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
import TopBarSync from '../../components/design/TopBarSync';
import {
  Section,
  Card,
  Button,
  Tag,
  StatsGrid,
  Stat,
  ListItem,
  Empty,
  safeDisplay,
} from '../../design-system';
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

type TagVariant = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning' | 'success';

function tierToVariant(tier: PerformanceTier): TagVariant {
  switch (tier) {
    case 'ELITE': return 'accent';
    case 'BON': return 'primary';
    case 'MOYEN': return 'default';
    case 'FAIBLE': return 'warning';
    case 'INSUFFISANT':
    default: return 'danger';
  }
}

function motifToVariant(motif: MotifReforme): TagVariant {
  switch (motif) {
    case 'PERF_INSUFFISANTE': return 'danger';
    case 'INACTIVE_LONG': return 'warning';
    case 'ISSE_ELEVE': return 'warning';
    case 'MULTIPLE':
    default: return 'danger';
  }
}

function motifLabel(motif: MotifReforme): string {
  switch (motif) {
    case 'PERF_INSUFFISANTE': return 'Productivité faible';
    case 'INACTIVE_LONG': return 'Truie inactive longue durée';
    case 'ISSE_ELEVE': return 'Sevrage-saillie trop long';
    case 'MULTIPLE':
    default: return 'Plusieurs motifs';
  }
}

const TIER_LABEL: Record<PerformanceTier, string> = {
  ELITE: 'Élite',
  BON: 'Bon',
  MOYEN: 'Moyen',
  FAIBLE: 'Faible',
  INSUFFISANT: 'Insuffisant',
};

type StatTone = 'default' | 'accent' | 'danger';

function isseToTone(isse: number | null): StatTone {
  if (isse === null) return 'default';
  if (isse >= 3 && isse <= 7) return 'accent';
  if (isse >= 8 && isse <= 10) return 'default';
  return 'danger';
}

function iemToTone(iem: number | null): StatTone {
  if (iem === null) return 'default';
  if (iem >= 140 && iem <= 150) return 'accent';
  if (iem >= 135 && iem <= 155) return 'default';
  return 'danger';
}

function tauxMBToTone(taux: number | null): StatTone {
  if (taux === null) return 'default';
  if (taux >= 88) return 'accent';
  if (taux >= 82) return 'default';
  return 'danger';
}

function renouvToTone(taux: number | null): StatTone {
  if (taux === null) return 'default';
  if (taux >= 30 && taux <= 40) return 'accent';
  if ((taux >= 25 && taux < 30) || (taux > 40 && taux <= 45)) return 'default';
  return 'danger';
}

function formatNum(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

function emptyHint(nbBandes: number): string {
  return `Données insuffisantes (requiert portées sevrées). Tu as ${nbBandes} bande${nbBandes > 1 ? 's' : ''}.`;
}

function truieLabel(truie: { displayId: string; boucle: string; nom?: string }): string {
  return safeDisplay(truie.nom ?? truie.displayId ?? truie.boucle);
}

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const SEUIL_INDICATEURS_FIABLES = 10;

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

  const zooKpis = useMemo(
    () =>
      computeZootechniqueKpis(
        bandes,
        0,
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
    if (finance.totalCout < 1_000) return null;
    const raw = Math.round((finance.margeGlobaleEstimee / finance.totalCout) * 100);
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

  const statutTag = useMemo<{ label: string; variant: TagVariant }>(() => {
    switch (statutGlobal) {
      case 'OK': return { label: 'BON', variant: 'primary' };
      case 'SURVEILLER': return { label: 'SURVEIL.', variant: 'warning' };
      case 'CRITIQUE': return { label: 'CRITIQUE', variant: 'danger' };
      case 'INDISPONIBLE':
      default: return { label: 'PARTIEL', variant: 'default' };
    }
  }, [statutGlobal]);

  const goToTruie = (id: string): void => {
    navigate(`/troupeau/truies/${id}`);
  };

  const goToReforme = (): void => {
    navigate('/troupeau?view=truies&statut=REFORME');
  };

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
    <div key={r.truie.id}>
      <ListItem
        title={truieLabel(r.truie)}
        subtitle={`${r.performance.nbPortees} portées · moyNV ${formatNum(r.performance.moyNV)}`}
        tag={<Tag variant={tierToVariant(r.performance.tier)}>{TIER_LABEL[r.performance.tier] ?? r.performance.tier}</Tag>}
        onClick={() => goToTruie(r.truie.id)}
      />
    </div>
  );

  const renderReforme = (r: TruiesAReformer): React.ReactNode => (
    <div key={r.truie.id}>
      <ListItem
        title={truieLabel(r.truie)}
        subtitle={r.detail}
        tag={<Tag variant={motifToVariant(r.motif)}>{motifLabel(r.motif)}</Tag>}
        onClick={() => goToTruie(r.truie.id)}
      />
    </div>
  );

  const topLimited = top.slice(0, 5);

  const trancheLabel: Record<TrancheAge, string> = {
    POST_SEVRAGE: 'GMQ post-sev',
    CROISSANCE: 'GMQ croissance',
    ENGRAISSEMENT: 'GMQ engr.',
    FINITION: 'GMQ finition',
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <TopBarSync
            crumbs={['Pilotage', 'Performance']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="pt-page" style={{ padding: '8px 18px 24px', maxWidth: 1100, margin: '0 auto' }}>
            <Section label="PILOTAGE · GTTT" />
            <h1 style={{ fontSize: 'var(--pt-text-display)', marginBottom: 4 }}>Performance</h1>
            <p style={{ color: 'var(--pt-text-muted)', margin: '0 0 20px', fontSize: 13 }}>
              Indicateurs techniques · {nbBandes} bande{nbBandes > 1 ? 's' : ''}
            </p>

            <Section label="TON TROUPEAU EN UN COUP D'ŒIL" />
            <Card>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Tag variant={statutTag.variant}>{statutTag.label}</Tag>
              </div>
              {hasData ? (
                <StatsGrid cols={3}>
                  <Stat
                    value={`${nbTruiesEnCycle}/${kpis.nbTruiesTotal}`}
                    label={`Truies en cycle (${truiesEnCyclePct} %)`}
                  />
                  <Stat
                    value={roiMoyen !== null ? `${roiMoyen} %` : '—'}
                    label="ROI moyen estimé"
                    tone={roiMoyen !== null && roiMoyen < 0 ? 'danger' : 'default'}
                  />
                  <Stat value={kpis.nbMbAVenir30j} label="Mises-bas 30 j" />
                </StatsGrid>
              ) : (
                <Empty>
                  <TrendingUp size={32} aria-hidden="true" style={{ marginBottom: 8, color: 'var(--pt-text-subtle)' }} />
                  <div>Saisie en cours.</div>
                  <div style={{ fontSize: 12, color: 'var(--pt-text-subtle)', marginTop: 4 }}>
                    Reviens dans 2-3 mois pour voir tes premières moyennes.
                  </div>
                </Empty>
              )}
            </Card>

            <Section label="TES MEILLEURES TRUIES" />
            {topLimited.length === 0 ? (
              <Card compact>
                <Empty>
                  <Trophy size={20} aria-hidden="true" style={{ marginBottom: 8, color: 'var(--pt-text-subtle)' }} />
                  <span>Aucune truie élite ou bonne pour l'instant.</span>
                </Empty>
              </Card>
            ) : (
              <Card compact>
                {topLimited.map(renderRanking)}
              </Card>
            )}

            <Section label="TRUIES À RÉFORMER (CANDIDATES)" />
            {aReformer.length === 0 ? (
              <Card compact>
                <Empty>Aucune candidate à réforme pour l'instant. Bon signe.</Empty>
              </Card>
            ) : (
              <>
                <Card compact>
                  {aReformer.map(renderReforme)}
                </Card>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 4px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--pt-text-muted)', fontSize: 12 }}>
                    <AlertTriangle size={12} aria-hidden="true" />
                    <span>
                      {aReformer.length} truie{aReformer.length > 1 ? 's' : ''} suggérée
                      {aReformer.length > 1 ? 's' : ''} · validation porcher requise.
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={goToReforme}>
                    Voir la liste détaillée
                  </Button>
                </div>
              </>
            )}

            <Section label="INDICATEURS TECHNIQUES" />
            <Card compact interactive onClick={() => setIndicateursOuverts(v => !v)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pt-text)' }}>
                    Sevrage→saillie · Entre mises-bas · % saillies réussies · Renouvellement…
                  </span>
                  {!indicateursFiables && (
                    <span style={{ fontSize: 11, color: 'var(--pt-text-subtle)' }}>
                      Données insuffisantes (requiert {SEUIL_INDICATEURS_FIABLES} portées sevrées sur 12 mois).
                    </span>
                  )}
                </div>
                {indicateursOuverts ? (
                  <ChevronUp size={18} aria-hidden="true" style={{ color: 'var(--pt-text-subtle)', flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={18} aria-hidden="true" style={{ color: 'var(--pt-text-subtle)', flexShrink: 0 }} />
                )}
              </div>
            </Card>

            {indicateursOuverts && (!hasData ? (
              <Card>
                <Empty>
                  <TrendingUp size={36} aria-hidden="true" style={{ marginBottom: 8, color: 'var(--pt-text-subtle)' }} />
                  <div>Aucune portée enregistrée sur les 12 derniers mois.</div>
                </Empty>
              </Card>
            ) : (
              <>
                <Card>
                  <StatsGrid cols={2}>
                    <Stat
                      value={formatNum(kpis.sevresParTruieAn)}
                      label="Sevrés/truie/an"
                      tone={kpis.sevresParTruieAn > 0 && kpis.sevresParTruieAn < 18 ? 'danger' : 'default'}
                    />
                    <Stat value={formatNum(kpis.porteesParTruieAn)} label="Portées/truie/an" />
                    <Stat value={formatNum(kpis.moyNV)} label="NV moyen" />
                    <Stat
                      value={`${formatNum(kpis.tauxMortaliteNaissanceSevrage)} %`}
                      label="Mort. naiss → sevrage"
                      tone={kpis.tauxMortaliteNaissanceSevrage > 15 ? 'danger' : 'default'}
                    />
                  </StatsGrid>
                  {(kpis.sevresParTruieAn === 0 || kpis.porteesParTruieAn === 0 || kpis.moyNV === 0) && (
                    <p style={{ marginTop: 12, fontSize: 11, color: 'var(--pt-text-subtle)' }}>
                      {emptyHint(nbBandes)}
                    </p>
                  )}
                </Card>

                <Card>
                  <StatsGrid cols={2}>
                    <Stat
                      value={kpis.intervalSevrageSaillieMoyJours !== null
                        ? `${formatNum(kpis.intervalSevrageSaillieMoyJours)} j`
                        : '—'}
                      label="Interv. sev-sail."
                    />
                    <Stat value={kpis.nbMbAVenir30j} label="MB à venir 30 j" />
                  </StatsGrid>
                </Card>

                <Section label="REPRODUCTION AVANCÉE" tone="accent" />
                <Card>
                  <StatsGrid cols={2}>
                    <Stat
                      value={kpis.isseMoyJours !== null ? `${formatNum(kpis.isseMoyJours)} j` : '—'}
                      label="Sevrage → saillie"
                      tone={isseToTone(kpis.isseMoyJours)}
                    />
                    <Stat
                      value={kpis.iemMoyJours !== null ? `${formatNum(kpis.iemMoyJours)} j` : '—'}
                      label="Entre mises-bas"
                      tone={iemToTone(kpis.iemMoyJours)}
                    />
                    <Stat
                      value={kpis.tauxMBPct !== null ? `${formatNum(kpis.tauxMBPct)} %` : '—'}
                      label="% saillies réussies"
                      tone={tauxMBToTone(kpis.tauxMBPct)}
                    />
                    <Stat
                      value={kpis.tauxRenouvellementPct !== null ? `${formatNum(kpis.tauxRenouvellementPct)} %` : '—'}
                      label="Renouv. annuel"
                      tone={renouvToTone(kpis.tauxRenouvellementPct)}
                    />
                  </StatsGrid>
                  <p style={{ marginTop: 12, fontSize: 11, color: 'var(--pt-text-subtle)' }}>
                    Cibles : ISSE 3-7 j · IEM 140-150 j · Taux MB ≥ 88 % · Renouv. 30-40 %/an
                  </p>
                </Card>

                <Section label="TECHNIQUE" />
                <Card>
                  <StatsGrid cols={2}>
                    <Stat
                      value={zooKpis.icrKg !== null ? `${formatNum(zooKpis.icrKg)} kg/kg` : '—'}
                      label="ICR (cible 2.6-2.9)"
                    />
                    <Stat
                      value={zooKpis.icGlobal !== null ? `${formatNum(zooKpis.icGlobal)} kg/kg` : '—'}
                      label="IC global"
                    />
                  </StatsGrid>
                  {zooKpis.icrKg === null && (
                    <p style={{ marginTop: 12, fontSize: 11, color: 'var(--pt-text-subtle)' }}>
                      Saisie aliment manquante ({zooKpis.nbPorteesSevrees12m} portée{zooKpis.nbPorteesSevrees12m > 1 ? 's' : ''} sevrée{zooKpis.nbPorteesSevrees12m > 1 ? 's' : ''}).
                    </p>
                  )}
                </Card>

                <Card>
                  <StatsGrid cols={2}>
                    {(['POST_SEVRAGE', 'CROISSANCE', 'ENGRAISSEMENT', 'FINITION'] as TrancheAge[]).map((tr) => {
                      const v = zooKpis.gmqParTranche[tr];
                      return (
                        <div key={tr}>
                          <Stat
                            value={v !== null ? `${v} g/j` : '—'}
                            label={`${trancheLabel[tr]} (cible ${GMQ_CIBLES[tr]})`}
                          />
                        </div>
                      );
                    })}
                  </StatsGrid>
                </Card>

                <Card>
                  <StatsGrid cols={2}>
                    <Stat
                      value={zooKpis.mortalite.maternitePct !== null
                        ? `${formatNum(zooKpis.mortalite.maternitePct)} %`
                        : '—'}
                      label="Mort. maternité (< 12 %)"
                      tone={zooKpis.mortalite.maternitePct !== null && zooKpis.mortalite.maternitePct > 15 ? 'danger' : 'default'}
                    />
                    <Stat
                      value={zooKpis.mortalite.postSevragePct !== null
                        ? `${formatNum(zooKpis.mortalite.postSevragePct)} %`
                        : '—'}
                      label="Mort. post-sev (< 3 %)"
                    />
                    <Stat
                      value={zooKpis.mortalite.engraissementPct !== null
                        ? `${formatNum(zooKpis.mortalite.engraissementPct)} %`
                        : '—'}
                      label="Mort. engr. (< 2 %)"
                    />
                    <Stat
                      value={zooKpis.mortalite.finitionPct !== null
                        ? `${formatNum(zooKpis.mortalite.finitionPct)} %`
                        : '—'}
                      label="Mort. finition (< 1.5 %)"
                    />
                  </StatsGrid>
                </Card>

                <Section label="FINANCES" />
                <Card>
                  <StatsGrid cols={2}>
                    <Stat
                      value={zooKpis.margeBruteParTruie !== null
                        ? `${zooKpis.margeBruteParTruie} €/an`
                        : '—'}
                      label="Marge brute / truie"
                    />
                    <Stat
                      value={roiMoyen !== null ? `${roiMoyen} %` : '—'}
                      label="ROI moyen"
                      tone={roiMoyen !== null && roiMoyen < 0 ? 'danger' : 'default'}
                    />
                  </StatsGrid>
                </Card>

                <Section label="TRUIES EN SOUS-PERFORMANCE" />
                {flop.length === 0 ? (
                  <Card compact>
                    <Empty>Aucune truie en sous-performance avec données suffisantes.</Empty>
                  </Card>
                ) : (
                  <Card compact>
                    {flop.map(renderRanking)}
                  </Card>
                )}
              </>
            ))}

            <Section label="EXPORT" />
            <Card compact>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" onClick={handlePrint}>
                  <Printer size={14} aria-hidden="true" />
                  <span>Imprimer en PDF</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={handleExportCsv}>
                  <Download size={14} aria-hidden="true" />
                  <span>Export CSV</span>
                </Button>
              </div>
              <p style={{ marginTop: 8, fontSize: 11, color: 'var(--pt-text-subtle)' }}>
                Pour réunions banquier ou véto.
              </p>
            </Card>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default PerfKpiView;
