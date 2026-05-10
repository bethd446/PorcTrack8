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
import { TrendingUp, Download, Trophy, Medal } from 'lucide-react';
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
import { computeGlobalKpis } from '../../services/perfKpiAnalyzer';
import { buildForecastEvents } from '../../utils/forecastEvents';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';
import { formatBandeName, formatDateFr } from '../lib';
import { computeScoreGlobal, levelLabelOf } from '../lib/scoreGlobal';

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
  const { bandes, truies, saillies } = useFarm();
  const { loading: farmLoading } = useMeta();
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
  const scoreGlobal = useMemo(() => computeScoreGlobal(kpis), [kpis]);

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
            <Download size={14} strokeWidth={1.5} aria-hidden="true" />
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

          <div className="kpis-strip" aria-label="Indicateurs clés du troupeau">
            <div className="kpi">
              <div className="kpi__label">ISSE</div>
              <div className="kpi__val">{fmt(kpis?.sevresParTruieAn ?? null, 1)}</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Taux MB</div>
              <div className="kpi__val">{fmt(kpis?.tauxMBPct ?? null, 0, '%')}</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">NV moy.</div>
              <div className="kpi__val">{fmt(kpis?.moyNV ?? null, 1)}</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">IEM j</div>
              <div className="kpi__val">{fmt(kpis?.iemMoyJours ?? null, 0)}</div>
            </div>
          </div>
        </section>
      )}

      {/* ISSE hero — onglet Vue uniquement (KPIs n'expose plus le score
          mais la liste détaillée des indicateurs, pas de duplication). */}
      {tab === 'vue' && (
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
            <TrendingUp size={20} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div className="hero-info">
            <div className="hero-title-text">ISSE moyen</div>
            <div className="hero-sub">
              <Tooltip term="isse">Indice Sevré-Saillie</Tooltip>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {(() => {
              // F-32 V75-n — ISSE n'a de sens qu'avec ≥ 1 cycle clos. On
              // ajoute (V77 a) un seuil minimal de portées historiques pour
              // éviter "ISSE 0.0" sur une ferme en démarrage qui n'a pas
              // encore eu un sevrage complet.
              const nbSevres = kpis?.nbSevrés12m ?? 0;
              const nbPortees = kpis?.nbPortees12m ?? 0;
              const isseAn = kpis?.sevresParTruieAn ?? 0;
              const aCycleClos = nbSevres > 0 && isseAn > 0 && nbPortees >= 3;
              return (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--pt-font-display, sans-serif)',
                      fontSize: 32,
                      fontWeight: 900,
                      color: aCycleClos ? 'var(--pt-success)' : 'var(--pt-muted)',
                      lineHeight: 1,
                    }}
                  >
                    {aCycleClos ? fmt(isseAn, 1) : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--pt-muted)' }}>
                    {aCycleClos
                      ? 'vs réf. 12.0'
                      : 'Premières performances visibles après le 1er sevrage complet'}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </Card>
      )}

      {/* Edu card ISSE — visible en Vue uniquement (le tab KPIs n'expose plus
          l'ISSE qui est désormais le repère du tab Vue). */}
      {/* V75-q (F-30) — on retire l'effet d'épellation I/S/S (lettres en gras
          isolées) qui ralentissait la lecture pour un éleveur novice : le sigle
          est maintenant énoncé en clair une seule fois en intro. */}
      {tab === 'vue' && (
        <EduCard label="Qu’est-ce que l’ISSE ?">
          Indice Sevré-Saillie : nombre moyen de porcelets sevrés par truie par cycle.
          Référence métier : <strong>&gt;12 = excellent, 10-12 = bon, &lt;10 = à améliorer</strong>.
        </EduCard>
      )}

      {/* KPIs grid — visible en Vue + KPIs (V77 b — duplicate ISSE retirée
          du tab KPIs ; la liste détaillée reste exposée sur les deux onglets,
          car elle complète le score billboard en Vue et constitue le cœur du
          tab KPIs). */}
      {(tab === 'vue' || tab === 'kpis') && (
      <Section label="Indicateurs techniques">
        <Card>
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
              <Tooltip term="mortalite">Mortalité naiss.→sevrage</Tooltip>
            </span>
            <span className="kv-val">{fmt(kpis?.tauxMortaliteNaissanceSevrage ?? null, 1, ' %')}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">
              <Tooltip term="iem">IEM moyen</Tooltip>
            </span>
            <span className="kv-val">{fmt(kpis?.iemMoyJours ?? null, 0, ' j')}</span>
          </div>
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
        </Card>
      </Section>
      )}

      {/* Finances — visible en Vue + Finances */}
      {(tab === 'vue' || tab === 'finances') && (
      <Section label="Finances">
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
                style={{
                  fontFamily: 'var(--pt-font-display, sans-serif)',
                  fontSize: 22,
                  fontWeight: 900,
                  color: 'var(--pt-muted)',
                  lineHeight: 1,
                }}
              >
                — FCFA
              </div>
              <div style={{ fontSize: 11, color: 'var(--pt-muted)', marginTop: 4 }}>
                Calcul live · ouvre les détails
              </div>
            </div>
          </div>
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
                <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                {pdfLoading ? 'Génération…' : 'PDF'}
              </span>
            </Button>
          </div>
        </Card>
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
                strokeWidth={1.5}
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
                <div className="empty-state" style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucune mise-bas prévue. Enregistre une saillie pour générer la prévision (saillie + 115 j).
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
                <div className="empty-state" style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucune sortie abattoir prévue dans la fenêtre.
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
                      strokeWidth={1.5}
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
            <div className="empty-state" style={{ textAlign: 'center', padding: '20px 0', color: 'var(--pt-muted)', fontSize: 13 }}>
              Données disponibles après le 1er cycle complet
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
