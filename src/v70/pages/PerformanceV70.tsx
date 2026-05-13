/**
 * V70 — Page /performance (archétype 2 Hub)
 *
 * V77 namespace `.pt-screen` (uniformisation A5 vague 3) :
 *  1. Header `.ph.ph--primary` (eyebrow "Suivi technique" / h1 "Performance" /
 *     sub dynamique par tab)
 *  2. Pills `.pills` (Vue / KPIs / Finances / Prévisions)
 *  3. Vue : score-billboard + kpis-strip 4 indicateurs synthèse + ISSE hero +
 *     EduCard ISSE + KPIs détaillés + Finances teaser + Top performances
 *  4. KPIs : liste détaillée seulement (pas de score billboard — A5 dédup)
 *  5. Finances : teaser + accès `/pilotage/finances/details` (FinancesView)
 *  6. Prévisions : mises-bas / sorties abattoir (buildForecastEvents)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Download, Trophy, Medal, FileText, ChevronRight, CalendarOff, BarChart3 } from 'lucide-react';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { Button } from '../components/ds/Button';
import { Pill } from '../components/ds/Pill';
import { ListItem } from '../components/ds/ListItem';
import { Tooltip } from '../components/v70/Tooltip';
import { EduCard } from '../components/v70/EduCard';
import { DataTable, DataTableColumn } from '../components/v70/DataTable';
import { ExportButton } from '../components/v70/ExportButton';
import { useUIPreferences } from '../context/UIPreferencesContext';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import { useFarm, useMeta } from '../../context/FarmContext';
import { useFarmProfile } from '../../hooks/useFarmProfile';
import { hasEngraissement, hasReproduction } from '../../lib/farmProfile';
import { computeGlobalKpis } from '../../services/perfKpiAnalyzer';
import { buildForecastEvents } from '../../utils/forecastEvents';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';
import { formatBandeName, formatDateFr } from '../lib';
import { computeScoreGlobal, levelLabelOf } from '../lib/scoreGlobal';
import {
  summarizeByPeriode,
  formatMontant,
} from '../../services/financesAnalyzer';
import type { FinanceEntry } from '../../types/farm';

const MINUS_PERF = '−'; // Unicode minus U+2212
const MOIS_SHORT_INIT_PERF = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MOIS_LONG_PERF = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
function periodeKeyPerf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function last12MonthsKeysPerf(now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(periodeKeyPerf(d));
  }
  return keys;
}

type PerfTab = 'vue' | 'kpis' | 'finances' | 'previsions';

const isPerfTab = (v: string | null): v is PerfTab =>
  v === 'vue' || v === 'kpis' || v === 'finances' || v === 'previsions';

interface BandePerf {
  bande: string;
  isse: number | null;
  marge: number | null;
  truies: number | null;
  [key: string]: unknown;
}

const BANDES_COLUMNS: DataTableColumn<BandePerf>[] = [
  { key: 'bande', label: 'Bande' },
  { key: 'isse', label: 'ISSE', align: 'right', sortable: true, render: (r) => r.isse != null ? r.isse.toFixed(1) : '—' },
  { key: 'marge', label: 'Marge FCFA', align: 'right', sortable: true, render: (r) => r.marge != null ? `+${r.marge}` : '—' },
  { key: 'truies', label: 'Truies', align: 'right', sortable: true, render: (r) => r.truies != null ? String(r.truies) : '—' },
];

export const PerformanceV70: React.FC = () => {
  const navigate = useNavigate();
  const farm = useFarm();
  const { bandes, truies, saillies } = farm;
  const finances = ((farm as { finances?: unknown }).finances ?? []) as FinanceEntry[];
  const currency = ((farm as { currency?: 'FCFA' }).currency ?? 'FCFA');
  const { loading: farmLoading } = useMeta();
  // V80 P0 #1 — KPIs strip + score adaptés au profil ferme.
  const profil = useFarmProfile();
  const showRepro = hasReproduction(profil);
  const showEng = hasEngraissement(profil);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: PerfTab = isPerfTab(searchParams.get('tab'))
    ? (searchParams.get('tab') as PerfTab)
    : 'vue';
  const [tab, setTab] = useState<PerfTab>(initialTab);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (isPerfTab(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    setTab(v as PerfTab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', v);
    setSearchParams(next, { replace: true });
  };
  const { advancedMode } = useUIPreferences();

  // V71.1 — KPIs live calculés via perfKpiAnalyzer (étaient 11.8/86%/13.2/8.4%/5.1j hardcodés)
  const kpis = useMemo(() => {
    try {
      return computeGlobalKpis(truies, bandes, saillies);
    } catch {
      return null;
    }
  }, [truies, bandes, saillies]);

  // V75-o B.2 (F-31) — Score global synthèse 4 KPIs.
  // V80 — pondération adaptée au profil (engraisseur → placeholder GMQ/IC).
  const scoreGlobal = useMemo(() => computeScoreGlobal(kpis, profil), [kpis, profil]);

  // V75-o B.3 (F-33) — Top performances trié par nés vivants à la naissance
  // (critère explicite affiché en sous-label). Avant : `bandes.slice(0, 2)`
  // ne reflétait aucun classement → testeur ne savait pas pourquoi telle bande
  // sortait en Top 1.
  const topBandes = useMemo(() => {
    return [...(bandes ?? [])]
      .filter(b => (b.nv ?? 0) > 0)
      .sort((a, b) => (b.nv ?? 0) - (a.nv ?? 0))
      .slice(0, 2);
  }, [bandes]);

  // V71.2 — données bandes calculées depuis FarmContext (plus de stubs BANDES_DATA)
  const bandesData = useMemo((): BandePerf[] => {
    if (!bandes.length) return [];
    return bandes.slice(0, 10).map(b => ({
      bande: b.idPortee || b.id,
      isse: null,   // calculé via perfKpiAnalyzer par bande — disponible après 1 cycle complet
      marge: null,
      truies: null,
    }));
  }, [bandes]);

  // V71.3 — Prévisions dynamiques basées sur buildForecastEvents (saillie+115j → MB,
  // dateMB+165j → sortie abattoir). Avant : labels hardcodés ("Bande de mai · 11
  // truies / 28 août 2026", etc.).
  const forecasts = useMemo(() => {
    const today = new Date();
    const events = buildForecastEvents({ truies, bandes, saillies }, today, 90);
    const mises = events.filter(e => e.type === 'MISE_BAS').slice(0, 4);
    const sorties = events.filter(e => e.type === 'SORTIE').slice(0, 4);
    // Total porcelets attendus : moyenne NV troupeau × nb mises-bas prévues.
    const moyNV = (() => {
      const datedNV = bandes
        .map(b => b.nv ?? 0)
        .filter(n => n > 0);
      if (datedNV.length === 0) return null;
      const sum = datedNV.reduce((s, n) => s + n, 0);
      return sum / datedNV.length;
    })();
    const totalPorceletsEstimes = moyNV !== null && mises.length > 0
      ? Math.round(moyNV * mises.length)
      : null;
    return { mises, sorties, totalPorceletsEstimes };
  }, [truies, bandes, saillies]);

  // ── Finances mensuelles (mockup B.4) ──────────────────────────────────────
  const financeMonthly = useMemo(() => {
    const now = new Date();
    const keys = last12MonthsKeysPerf(now);
    const series = keys.map((k) => {
      const s = summarizeByPeriode(finances, k);
      const mm = Number(k.slice(5, 7));
      return {
        key: k,
        initial: Number.isFinite(mm) ? MOIS_SHORT_INIT_PERF[mm - 1] : '?',
        marge: s.margeNette,
        revenus: s.totalRevenus,
        charges: s.totalDepenses,
      };
    });
    const currentKey = keys[keys.length - 1] ?? '';
    const currentMm = Number(currentKey.slice(5, 7));
    const monthLabel = Number.isFinite(currentMm) && currentMm >= 1 && currentMm <= 12
      ? MOIS_LONG_PERF[currentMm - 1]
      : '—';
    const current = series[series.length - 1] ?? { marge: 0, revenus: 0, charges: 0, key: '', initial: '?' };
    const prev = series[series.length - 2] ?? { marge: 0, revenus: 0, charges: 0, key: '', initial: '?' };
    const deltaPct = prev.marge !== 0
      ? Math.round(((current.marge - prev.marge) / Math.abs(prev.marge)) * 100)
      : null;
    return { series, monthLabel, current, prev, deltaPct };
  }, [finances]);

  const hasFinanceData = finances.length > 0;
  const financeMargeMax = Math.max(1, ...financeMonthly.series.map((m) => Math.abs(m.marge)));
  const currentFinanceIdx = financeMonthly.series.length - 1;

  const fmt = (n: number | null | undefined, digits = 1, suffix = ''): string =>
    n === null || n === undefined || !Number.isFinite(n) ? '—' : `${n.toFixed(digits)}${suffix}`;

  const [pdfHint, setPdfHint] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  // V75-u-C P1#10 — feedback toast Sonner pendant la génération PDF
  // (window.print bloque le main thread ~10s sur Android sans aucun feedback
  // visuel auparavant). Toast loading → success/error pour rassurer l'éleveur.
  const handlePrintPdf = () => {
    if (pdfLoading) return;
    const toastId = toast.loading('Génération du PDF en cours…');
    setPdfLoading(true);
    setPdfHint(true);
    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        // Defer print to let the hint render first
        setTimeout(() => {
          try {
            window.print();
            toast.success('Aperçu PDF prêt', {
              id: toastId,
              description: 'Choisis « Enregistrer au format PDF » dans la fenêtre d\'impression.',
            });
          } catch (err) {
            toast.error('Erreur PDF', { id: toastId, description: String(err) });
          } finally {
            setPdfLoading(false);
          }
        }, 100);
      } else {
        toast.error('Impression non supportée', { id: toastId });
        setPdfLoading(false);
      }
    } catch (err) {
      toast.error('Erreur PDF', { id: toastId, description: String(err) });
      setPdfLoading(false);
    }
    setTimeout(() => setPdfHint(false), 4000);
  };

  // V75-u-C P1#6 — skeleton pendant le chargement initial pour éviter le
  // flash "—" / "0.0" sur les KPIs avant que FarmContext résolve.
  const showSkeleton = farmLoading && bandes.length === 0 && truies.length === 0;
  if (showSkeleton) {
    const skeletonStyle = {
      background: 'var(--pt-warm, #faf6ef)',
      borderRadius: 16,
      marginBottom: 12,
    } as const;
    return (
      <div
        className="pt-screen phone-content"
        style={{ padding: 24, maxWidth: 600, margin: '0 auto', position: 'relative', minHeight: '100%' }}
        data-testid="performance-loading-skeleton"
      >
        <div style={{ ...skeletonStyle, height: 56 }} className="animate-pulse" aria-hidden="true" />
        <div style={{ ...skeletonStyle, height: 36, width: '60%' }} className="animate-pulse" aria-hidden="true" />
        <div style={{ ...skeletonStyle, height: 110 }} className="animate-pulse" aria-hidden="true" />
        <div style={{ ...skeletonStyle, height: 96 }} className="animate-pulse" aria-hidden="true" />
        <div style={{ ...skeletonStyle, height: 220 }} className="animate-pulse" aria-hidden="true" />
        <div style={{ ...skeletonStyle, height: 140 }} className="animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  const tabSubtitle: Record<PerfTab, string> = {
    vue: 'L’année en chiffres. Sans détour.',
    kpis: 'Indicateurs techniques détaillés.',
    finances: 'Marge mensuelle et accès au détail.',
    previsions: 'Mises-bas et sorties prévues à 90 jours.',
  };

  const tabs: { value: PerfTab; label: string }[] = [
    { value: 'vue', label: 'Vue' },
    { value: 'kpis', label: 'KPIs' },
    { value: 'finances', label: 'Finances' },
    { value: 'previsions', label: 'Prévisions' },
  ];

  return (
    <div
      className="pt-screen phone-content"
      style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
    >
      <MariusGreeting pageContext="performance" />

      <header className="ph ph--primary">
        <div className="ph__row">
          <div>
            <div className="ph__eyebrow">Suivi technique</div>
            <h1 className="ph__h1">Performance</h1>
            <p className="ph__sub">{tabSubtitle[tab]}</p>
          </div>
        </div>
      </header>

      <div className="pills" style={{ marginBottom: 14 }}>
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`pill${tab === t.value ? ' is-active' : ''}`}
            onClick={() => handleTabChange(t.value)}
            aria-pressed={tab === t.value}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pdfHint && (
        <div
          role="status"
          style={{ background: 'var(--pt-success)', color: 'white', padding: '10px 14px', borderRadius: 12, marginBottom: 12, fontSize: 13, textAlign: 'center' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Download size={14} strokeWidth={2} aria-hidden="true" />
            Aperçu PDF prêt — utilise « Enregistrer au format PDF » dans la fenêtre d’impression
          </span>
        </div>
      )}

      {/* V75-o B.2 (F-31) — Score global troupeau (Vue uniquement) : synthèse
          A/B/C/D des 4 KPIs principaux. V76 — billboard pattern (lettre 140px
          Big Shoulders + meta mono), classes CSS dans v70-global.css. Affiche
          "—" + "En attente" si pas de données ou < 5 cycles clos. */}
      {tab === 'vue' && (
        <section style={{ marginTop: 12, marginBottom: 16 }}>
          <div className="score-billboard">
            <div
              className="score-letter"
              aria-label={`Niveau ${scoreGlobal.level === 'EN_CONSTRUCTION' ? 'En construction' : scoreGlobal.level}`}
            >
              {scoreGlobal.level === 'EN_CONSTRUCTION' ? '—' : scoreGlobal.level}
            </div>
            <div className="score-meta">
              <div className="score-num">
                {scoreGlobal.level === 'EN_CONSTRUCTION'
                  ? '0 / 100 · En attente'
                  : `${scoreGlobal.score} / 100 · ${levelLabelOf(scoreGlobal.level)}`}
              </div>
              <h2 className="score-label">
                Score global<br />du troupeau
              </h2>
              <div className="score-pond">{scoreGlobal.detail}</div>
            </div>
          </div>

          {/* V80 P0 #1 — Strip KPI adapté au profil :
              - naisseur / cycle_complet : ISSE / Taux MB / NV / IEM (historique)
              - engraisseur : GMQ / IC / Mortalité / Marge brute (placeholders
                "—" + tooltip "Module Engraissement à venir" tant que A5 pas livré) */}
          {profil === 'engraisseur' ? (
            <div
              className="kpis-strip"
              aria-label="Indicateurs clés engraissement"
              data-pt-strip="engraisseur"
            >
              <div className="kpi">
                <div className="kpi__label">GMQ g/j</div>
                <div className="kpi__val" title="Module Engraissement à venir">—</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">IC kg/kg</div>
                <div className="kpi__val" title="Module Engraissement à venir">—</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Mortalité</div>
                <div className="kpi__val" title="Module Engraissement à venir">—</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Marge brute</div>
                <div className="kpi__val" title="Module Engraissement à venir">—</div>
              </div>
            </div>
          ) : (
            <div
              className="kpis-strip"
              aria-label="Indicateurs clés du troupeau"
              data-pt-strip={profil}
            >
              {/* V81 Sprint 8 — Tooltips toujours présents (éleveur curieux
                  comprend les sigles techniques même quand il y a déjà des
                  chiffres). Pas seulement quand la valeur est null. */}
              <div className="kpi">
                <div className="kpi__label">ISSE j</div>
                <div
                  className="kpi__val"
                  title="Intervalle Sevrage-Saillie moyen. Réf: 5-8j excellent, 9-14j bon, >14j à améliorer."
                >
                  {fmt(kpis?.isseMoyJours ?? null, 1)}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Taux MB</div>
                <div
                  className="kpi__val"
                  title="Taux de mise-bas = % de saillies confirmées en gestation puis MB. Réf: >85% excellent."
                >
                  {fmt(kpis?.tauxMBPct ?? null, 0, '%')}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi__label">NV moy.</div>
                <div
                  className="kpi__val"
                  title="Nés Vivants moyens par portée. Réf: 11-13 standard, 14+ excellent."
                >
                  {fmt(kpis?.moyNV ?? null, 1)}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi__label">IEM j</div>
                <div
                  className="kpi__val"
                  title="Intervalle Entre Mises-bas moyen. Réf: 145-155j standard."
                >
                  {fmt(kpis?.iemMoyJours ?? null, 0)}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ISSE hero — onglet Vue uniquement (KPIs n'expose plus le score
          mais la liste détaillée des indicateurs, pas de duplication).
          V80 — masqué pour profil engraisseur (ISSE = KPI naisseur). */}
      {tab === 'vue' && showRepro && (
      <Card variant="hero">
        <div className="hero-row">
          <div
            className="hero-icon"
            style={{
              background: 'var(--pt-success)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <TrendingUp size={20} strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="hero-info">
            <div className="hero-title-text">ISSE moyen</div>
            <div className="hero-sub">
              <Tooltip term="isse">Indice Sevré-Saillie</Tooltip>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {(() => {
              // ISSE (Intervalle Sevrage-Saillie, jours) — requiert au moins
              // ISSE_MIN_PAIRS paires sevrage→saillie valides côté analyzer.
              const isseJ = kpis?.isseMoyJours ?? null;
              const aSignal = isseJ != null;
              return (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--pt-font-display, sans-serif)',
                      fontSize: 32,
                      fontWeight: 900,
                      color: aSignal ? 'var(--pt-success)' : 'var(--pt-muted)',
                      lineHeight: 1,
                    }}
                  >
                    {aSignal ? fmt(isseJ, 1) : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--pt-muted)' }}>
                    {aSignal
                      ? 'vs réf. 5–8 j'
                      : 'Premières performances visibles après le 1er retour en chaleur sevrage→saillie'}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </Card>
      )}

      {/* Edu card ISSE — visible en Vue uniquement.
          V80 — masquée pour profil engraisseur. */}
      {tab === 'vue' && showRepro && (
        <EduCard label="Qu’est-ce que l’ISSE ?">
          Intervalle Sevrage-Saillie : nombre de jours entre le sevrage d'une truie et sa saillie suivante.
          Référence métier : <strong>5–8 j = excellent, 9–14 j = bon, &gt;14 j = à améliorer</strong>.
        </EduCard>
      )}

      {/* V80 — EduCard engraisseur : placeholder informatif tant que A5 n'a
          pas livré GMQ/IC live. */}
      {tab === 'vue' && profil === 'engraisseur' && (
        <EduCard label="Module Engraissement à venir">
          GMQ (gain moyen quotidien) et IC (indice consommation) seront calculés
          automatiquement dès que le module <strong>Engraissement</strong> sera en place :
          pesées hebdo + conso aliment par lot. Pour l&apos;instant, enregistre tes pesées et
          consos pour préparer le démarrage.
        </EduCard>
      )}

      {/* KPIs grid — visible en Vue + KPIs (V77 b — duplicate ISSE retirée
          du tab KPIs ; la liste détaillée reste exposée sur les deux onglets,
          car elle complète le score billboard en Vue et constitue le cœur du
          tab KPIs).
          V80 P0 #1 — Lignes filtrées selon profil :
            - lignes repro (Taux MB, NV, Mortalité naiss-sevrage, IEM) : naisseur + cycle_complet
            - lignes engraissement (IC, GMQ, Mortalité eng, Marge) : engraisseur + cycle_complet */}
      {(tab === 'vue' || tab === 'kpis') && (
      <Section label="Indicateurs techniques">
        <Card>
          {showRepro && (
            <>
              <div className="kv-row">
                <span className="kv-key">Taux mise-bas</span>
                <span className="kv-val">{fmt(kpis?.tauxMBPct ?? null, 0, ' %')}</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Nés vivants/portée</span>
                <span className="kv-val">{fmt(kpis?.moyNV ?? null, 1)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">
                  <Tooltip term="mortalite">Mortalité naiss. › sevrage</Tooltip>
                </span>
                <span className="kv-val">{fmt(kpis?.tauxMortaliteNaissanceSevrage ?? null, 1, ' %')}</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">
                  <Tooltip term="iem">IEM moyen</Tooltip>
                </span>
                <span className="kv-val">{fmt(kpis?.iemMoyJours ?? null, 0, ' j')}</span>
              </div>
            </>
          )}
          {showEng && (
            <>
              <div
                className="kv-row"
                title="Indice de consommation = kg aliment / kg gain poids vif. Référence métier 2.5-3.0."
              >
                <span className="kv-key">IC moyen (post-sevrage)</span>
                <span className="kv-val">
                  {kpis?.icMoyenReel != null && kpis.icMoyenReel > 0
                    ? `${kpis.icMoyenReel.toFixed(2)} kg/kg`
                    : '—'}
                  <span style={{ color: 'var(--pt-muted)', fontSize: 11, marginLeft: 8 }}>
                    réf. 2.5-3.0
                  </span>
                </span>
              </div>
              {profil === 'engraisseur' && (
                <>
                  <div className="kv-row" title="Module Engraissement à venir">
                    <span className="kv-key">GMQ moyen (croissance)</span>
                    <span className="kv-val">—</span>
                  </div>
                  <div className="kv-row" title="Module Engraissement à venir">
                    <span className="kv-key">Mortalité engraissement</span>
                    <span className="kv-val">—</span>
                  </div>
                  <div className="kv-row" title="Module Engraissement à venir">
                    <span className="kv-key">Marge brute / lot</span>
                    <span className="kv-val">—</span>
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </Section>
      )}

      {/* Finances — visible en Vue + Finances (mockup B.4) */}
      {(tab === 'vue' || tab === 'finances') && (
      <Section label="Finances">
        {!hasFinanceData ? (
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--pt-muted)', marginBottom: 4 }}>
                  Marge mensuelle <Pill variant="soft">Owner</Pill>
                </div>
                <div
                  className="kpi-billboard"
                  style={{
                    fontFamily: 'var(--pt-font-display, sans-serif)',
                    fontSize: 32,
                    fontWeight: 900,
                    color: 'var(--pt-muted)',
                    lineHeight: 1,
                  }}
                >
                  — FCFA
                </div>
                <div style={{ fontSize: 11, color: 'var(--pt-muted)', marginTop: 4 }}>
                  Aucune transaction · ajoute une vente pour démarrer
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/pilotage/finances/details')}
              >
                Saisir une transaction
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrintPdf}
                disabled={pdfLoading}
                aria-busy={pdfLoading}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} strokeWidth={2} aria-hidden="true" />
                  {pdfLoading ? 'Génération…' : 'PDF'}
                </span>
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* KPI billboard marge nette mensuelle */}
            <div
              style={{
                padding: 18,
                background: 'var(--pt-warm, #FAF7F0)',
                border: '1px solid var(--pt-line)',
                borderRadius: 18,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--pt-font-mono, monospace)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--pt-subtle, #a39888)',
                  marginBottom: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Marge mensuelle · {financeMonthly.monthLabel.toLowerCase()} <Pill variant="soft">Owner</Pill>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  gap: 14,
                }}
              >
                <div
                  className={`kpi-billboard num ${financeMonthly.current.marge >= 0 ? 'amount--positive' : 'amount--negative'}`}
                  style={{
                    fontFamily: 'var(--pt-font-display, sans-serif)',
                    fontWeight: 900,
                    fontSize: 64,
                    lineHeight: 0.9,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {financeMonthly.current.marge >= 0 ? '+' : MINUS_PERF}
                  {formatMontant(Math.abs(financeMonthly.current.marge), currency)}
                </div>
                {financeMonthly.deltaPct !== null ? (
                  <div
                    className={`num ${financeMonthly.deltaPct >= 0 ? 'amount--positive' : 'amount--negative'}`}
                    style={{
                      fontFamily: 'var(--pt-font-mono, monospace)',
                      fontWeight: 600,
                      fontSize: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                      paddingBottom: 4,
                    }}
                  >
                    {financeMonthly.deltaPct >= 0
                      ? <TrendingUp size={14} strokeWidth={2} aria-hidden />
                      : <TrendingDown size={14} strokeWidth={2} aria-hidden />}
                    {financeMonthly.deltaPct >= 0 ? '+' : MINUS_PERF}{Math.abs(financeMonthly.deltaPct)}%
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: 'var(--pt-font-mono, monospace)',
                  fontSize: 11,
                  color: 'var(--pt-muted)',
                }}
              >
                vs mois précédent {financeMonthly.prev.marge >= 0 ? '+' : MINUS_PERF}
                {formatMontant(Math.abs(financeMonthly.prev.marge), currency)}
              </div>
            </div>

            {/* Bar chart 12 mois */}
            <div
              style={{
                padding: 14,
                background: 'var(--pt-bg, #FAF7F0)',
                border: '1px solid var(--pt-line)',
                borderRadius: 14,
                marginBottom: 14,
              }}
            >
              <svg
                viewBox="0 0 320 120"
                preserveAspectRatio="none"
                aria-label="Marge nette des 12 derniers mois"
                style={{ width: '100%', height: 120, display: 'block' }}
              >
                <line
                  x1={0}
                  x2={320}
                  y1={100}
                  y2={100}
                  stroke="rgba(26,26,26,0.08)"
                  strokeWidth={2}
                />
                {financeMonthly.series.map((m, i) => {
                  const barH = (Math.abs(m.marge) / financeMargeMax) * 78;
                  const isCurrent = i === currentFinanceIdx;
                  const isPositive = m.marge >= 0;
                  const x = i * 26 + 6;
                  const y = isPositive ? 100 - barH : 100;
                  const fill = isCurrent
                    ? 'var(--pt-accent, #B8703D)'
                    : isPositive
                      ? 'var(--pt-primary, #2D4A1F)'
                      : 'var(--pt-rose-ink, #a4453d)';
                  return (
                    <g key={m.key}>
                      <rect
                        x={x}
                        y={y}
                        width={18}
                        height={Math.max(2, barH)}
                        fill={fill}
                      />
                      <text
                        x={x + 3}
                        y={115}
                        style={{
                          fontFamily: 'var(--pt-font-mono, monospace)',
                          fontSize: 8.5,
                          fill: isCurrent
                            ? 'var(--pt-accent, #B8703D)'
                            : 'var(--pt-subtle, #a39888)',
                        }}
                      >
                        {m.initial}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* KPIs Revenus / Charges / Marge */}
            <div
              className="kpis-strip"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 0,
                border: '1px solid var(--pt-line)',
                borderRadius: 14,
                background: 'var(--pt-bg, #FAF7F0)',
                overflow: 'hidden',
                marginBottom: 14,
              }}
            >
              <div className="kpi" style={{ padding: 14, borderRight: '1px solid var(--pt-line)' }}>
                <div className="kpi__label" style={{ fontFamily: 'var(--pt-font-mono, monospace)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pt-subtle)' }}>Revenus</div>
                <div className="kpi__val num amount--positive" style={{ fontFamily: 'var(--pt-font-display, sans-serif)', fontWeight: 900, fontSize: 24, lineHeight: 0.95, marginTop: 6 }}>
                  +{formatMontant(financeMonthly.current.revenus, currency)}
                </div>
              </div>
              <div className="kpi" style={{ padding: 14, borderRight: '1px solid var(--pt-line)' }}>
                <div className="kpi__label" style={{ fontFamily: 'var(--pt-font-mono, monospace)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pt-subtle)' }}>Charges</div>
                <div className="kpi__val num amount--negative" style={{ fontFamily: 'var(--pt-font-display, sans-serif)', fontWeight: 900, fontSize: 24, lineHeight: 0.95, marginTop: 6 }}>
                  {MINUS_PERF}{formatMontant(financeMonthly.current.charges, currency)}
                </div>
              </div>
              <div className="kpi" style={{ padding: 14 }}>
                <div className="kpi__label" style={{ fontFamily: 'var(--pt-font-mono, monospace)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pt-subtle)' }}>Marge</div>
                <div className={`kpi__val num ${financeMonthly.current.marge >= 0 ? 'amount--positive' : 'amount--negative'}`} style={{ fontFamily: 'var(--pt-font-display, sans-serif)', fontWeight: 900, fontSize: 24, lineHeight: 0.95, marginTop: 6 }}>
                  {financeMonthly.current.marge >= 0 ? '+' : MINUS_PERF}{formatMontant(Math.abs(financeMonthly.current.marge), currency)}
                </div>
              </div>
            </div>

            {/* Actions : Rapport complet + Détails + PDF */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="card-link"
                onClick={() => navigate('/pilotage/rapport')}
                aria-label="Ouvrir le rapport financier complet"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  background: 'var(--pt-primary, #2D4A1F)',
                  color: 'var(--pt-warm, #F5E9D8)',
                  border: 'none',
                  borderRadius: 14,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <FileText size={18} strokeWidth={2} aria-hidden />
                <span style={{ flex: 1, fontFamily: 'var(--pt-font-mono, monospace)', fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Rapport financier complet
                </span>
                <ChevronRight size={16} aria-hidden />
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/pilotage/finances/details')}
                >
                  Détails
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrintPdf}
                  disabled={pdfLoading}
                  aria-busy={pdfLoading}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Download size={14} strokeWidth={2} aria-hidden="true" />
                    {pdfLoading ? 'Génération…' : 'PDF'}
                  </span>
                </Button>
              </div>
            </div>
          </>
        )}
      </Section>
      )}

      {/* Prévisions — section dédiée onglet Prévisions */}
      {tab === 'previsions' && (
        <>
          <EduCard
            label="Prévisions d’élevage"
            icon={
              <TrendingUp
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                style={{ color: 'var(--pt-muted)', flexShrink: 0 }}
              />
            }
          >
            Projections basées sur les bandes en cycle : naissances attendues, sevrages à venir, sorties abattoir prévues. Affine ton planning ferme avec les <strong>3 prochains mois</strong>.
          </EduCard>
          <Section label="Prochaines mises-bas (90 jours)">
            <Card>
              {forecasts.mises.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon" aria-hidden>
                    <CalendarOff size={32} strokeWidth={2} />
                  </div>
                  <div className="empty-state__title">Aucune mise-bas prévue</div>
                  <div className="empty-state__sub">Enregistre une saillie pour générer la prévision (saillie + 115 j).</div>
                </div>
              ) : (
                forecasts.mises.map(ev => (
                  <div key={ev.id} className="kv-row">
                    <span className="kv-key">{ev.title}</span>
                    <span className="kv-val">
                      {ev.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))
              )}
              {forecasts.totalPorceletsEstimes !== null && (
                <div className="kv-row">
                  <span className="kv-key">Total porcelets attendus</span>
                  <span className="kv-val" style={{ color: 'var(--pt-primary)', fontWeight: 700 }}>
                    ~{forecasts.totalPorceletsEstimes} porcelets
                  </span>
                </div>
              )}
            </Card>
          </Section>
          <Section label="Sorties abattoir prévues (90 jours)">
            <Card>
              {forecasts.sorties.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon" aria-hidden>
                    <CalendarOff size={32} strokeWidth={2} />
                  </div>
                  <div className="empty-state__title">Aucune sortie prévue</div>
                  <div className="empty-state__sub">Pas d'abattoir dans la fenêtre 90 jours. Les sorties apparaissent quand un lot atteint le poids cible.</div>
                </div>
              ) : (
                forecasts.sorties.map(ev => (
                  <div key={ev.id} className="kv-row">
                    <span className="kv-key">{ev.title}{ev.subtitle ? ` · ${ev.subtitle}` : ''}</span>
                    <span className="kv-val">
                      {ev.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))
              )}
            </Card>
          </Section>
        </>
      )}

      {/* Top performances — visible en Vue uniquement (vraies bandes via FarmContext) */}
      {tab === 'vue' && (
      <Section label="Top performances">
        <p
          style={{
            margin: '-8px 0 12px',
            fontSize: 11,
            color: 'var(--pt-muted)',
            fontStyle: 'italic',
          }}
        >
          Classement par nés vivants à la naissance
        </p>
        {farmLoading && topBandes.length === 0 ? (
          <ListItem
            avatar={<EntityAvatar species="bande" size="md" shortCode="..." />}
            title="Chargement..."
            subtitle="Lecture des bandes en cours"
            data-testid="top-perf-loading"
          />
        ) : topBandes.length > 0 ? (
          topBandes.map((b, idx) => {
            const RankIcon = idx === 0 ? Trophy : Medal;
            const rankColor = idx === 0 ? 'var(--pt-accent)' : 'var(--pt-muted)';
            const rankLabel = idx === 0 ? 'Top 1' : 'Top 2';
            return (
              <ListItem
                key={b.id}
                avatar={<EntityAvatar species="bande" size="md" shortCode={b.id.slice(0, 5)} />}
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {formatBandeName({
                      id: b.id,
                      idPortee: b.idPortee,
                      truieMere: b.truie,
                      dateMB: b.dateMB,
                    }, { compact: true })}
                    <RankIcon
                      size={14}
                      strokeWidth={2}
                      aria-label={rankLabel}
                      style={{ color: rankColor, flexShrink: 0 }}
                    />
                  </span>
                }
                subtitle={`${b.dateMB ? `MB ${formatDateFr(b.dateMB)}` : ''} · ${b.nv ?? '?'} nés vivants`}
                trailing={<span className="list-arrow">›</span>}
                onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
              />
            );
          })
        ) : (
          <ListItem
            avatar={<EntityAvatar species="bande" size="md" shortCode="..." />}
            title="Aucune bande active"
            subtitle="Crée ta première bande dans Élevage › Bandes"
            trailing={<span className="list-arrow">›</span>}
            onClick={() => navigate('/troupeau')}
          />
        )}
      </Section>
      )}

      {advancedMode && (
        <Section label="Tableau détaillé (Mode avancé)">
          {bandesData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon" aria-hidden>
                <BarChart3 size={32} strokeWidth={2} />
              </div>
              <div className="empty-state__title">Pas encore de données</div>
              <div className="empty-state__sub">Le tableau détaillé s'active après le 1er cycle complet (saillie → sevrage).</div>
            </div>
          ) : (
            <>
              <DataTable data={bandesData} columns={BANDES_COLUMNS} />
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <ExportButton data={bandesData} filename="performance-bandes.csv" label="Export CSV" />
              </div>
            </>
          )}
        </Section>
      )}
    </div>
  );
};
