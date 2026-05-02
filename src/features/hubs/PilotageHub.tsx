/**
 * PilotageHub — /pilotage
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte v6 « Terrain Vivant » (2026-04-30)
 *
 *   1. TopBarSync + Eyebrow + H1 Big Shoulders
 *   2. KPI cards principaux (4) — Marge globale / Valeur cheptel / Mortalité / Frais
 *   3. Section "Performance bandes" : top / flop par marge
 *   4. Carte synthétique "Alertes" → /alerts (canonique)
 *   5. Audit / export PDF
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet, FileText, TrendingUp,
  ArrowRight, Wind, BellRing, ChevronRight,
} from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import KpiCardV6 from '../../components/design/KpiCard';
import { useFarm } from '../../context/FarmContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { formatCurrency, currencySuffix, type Currency } from '../../lib/currency';
import { genererRapportGlobal } from '../../services/financialAnalyzer';
import { prepareAuditSnapshot } from '../../services/exportService';
import AuditPrintTemplate from '../pilotage/AuditPrintTemplate';
import {
  captureCurrentSnapshot,
  computeDelta,
  deltaSinceLabel,
  formatDeltaPct,
  loadPreviousSnapshot,
  semanticTrendDir,
} from '../../utils/pilotageDelta';
import { filterRealPortees } from '../../services/bandesAggregator';

const PilotageHub: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    alerts,
    bandes,
    transitions,
    nomFerme,
    currency,
  } = useFarm();
  const { handleRefresh } = useAutoRefresh();
  const [, setIsPrinting] = useState(false);

  const realBandes = useMemo(() => filterRealPortees(bandes), [bandes]);

  const globalReport = useMemo(() => {
    if (loading || realBandes.length === 0) return null;
    return genererRapportGlobal(realBandes, transitions);
  }, [realBandes, transitions, loading]);

  // Snapshot précédent — chargé une fois au mount, pas re-fetché ensuite.
  const prevSnapshotRef = useRef(loadPreviousSnapshot());
  const prevSnapshot = prevSnapshotRef.current;
  const snapshotCapturedRef = useRef(false);

  useEffect(() => {
    if (!globalReport || snapshotCapturedRef.current) return;
    snapshotCapturedRef.current = true;
    captureCurrentSnapshot({
      margeGlobaleEstimee: globalReport.margeGlobaleEstimee,
      totalRevenuProjete: globalReport.totalRevenuProjete,
      totalCoutAlimentaire: globalReport.totalCoutAlimentaire,
      totalCoutFixe: globalReport.totalCoutFixe,
      tauxMortaliteMoyen: globalReport.tauxMortaliteMoyen,
    });
  }, [globalReport]);

  const auditData = useMemo(() => {
    if (loading || realBandes.length === 0 || !alerts) return null;
    return prepareAuditSnapshot(realBandes, transitions, alerts);
  }, [realBandes, transitions, alerts, loading]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const alertsCount = useMemo(() => {
    return alerts.filter(a => a.priority === 'CRITIQUE' || a.priority === 'HAUTE').length;
  }, [alerts]);

  const spark = (base: number) =>
    Array.from({ length: 12 }, (_, i) => Math.max(1, Math.round(Math.abs(base) * (0.85 + 0.025 * i))));

  if (loading || !globalReport) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout>
            <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
              <IonRefresherContent />
            </IonRefresher>
            <TopBarSync crumbs={['Pilotage', 'Vue globale']} />
            <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
              <Eyebrow dotColor="accent">Pilotage · Vue globale</Eyebrow>
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '4px 0 12px',
                }}
              >
                Pilotage
              </h1>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                }}
              >
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      height: 96,
                      borderRadius: 12,
                      background: 'var(--bg-surface)',
                      opacity: 0.6,
                    }}
                    className="animate-pulse"
                  />
                ))}
              </div>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  const {
    margeGlobaleEstimee,
    totalRevenuProjete,
    totalCoutAlimentaire,
    totalCoutFixe,
    tauxMortaliteMoyen,
    topBande,
    flopBande,
  } = globalReport;

  const margeNegative = margeGlobaleEstimee < 0;

  // ── Deltas vs snapshot précédent ────────────────────────────────────────
  const margeDelta = computeDelta(margeGlobaleEstimee, prevSnapshot?.margeGlobaleEstimee);
  const revenuDelta = computeDelta(totalRevenuProjete, prevSnapshot?.totalRevenuProjete);
  const coutAlimDelta = computeDelta(totalCoutAlimentaire, prevSnapshot?.totalCoutAlimentaire);
  const coutFixeDelta = computeDelta(totalCoutFixe, prevSnapshot?.totalCoutFixe);
  const mortaliteDelta = computeDelta(tauxMortaliteMoyen, prevSnapshot?.tauxMortaliteMoyen);

  const sinceLabel = deltaSinceLabel(prevSnapshot);
  const firstRunLabel = 'première mesure';

  const buildTrend = (
    d: ReturnType<typeof computeDelta>,
    fallback: string,
  ): string => {
    const pct = formatDeltaPct(d);
    if (!pct) return fallback;
    return sinceLabel ? `${pct} · ${sinceLabel}` : pct;
  };

  const margeDeltaColor = !margeDelta
    ? 'var(--muted)'
    : margeDelta.direction === 'flat'
      ? 'var(--muted)'
      : margeDelta.direction === 'up'
        ? 'var(--color-accent-500)'
        : 'var(--color-pig)';

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <TopBarSync
            crumbs={['Pilotage', 'Vue globale']}
            onMariusClick={() => {
              const evt = new CustomEvent('open-chatbot');
              window.dispatchEvent(evt);
            }}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* ── En-tête + export ──────────────────────────────────── */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <Eyebrow dotColor="accent">Pilotage · Vue globale</Eyebrow>
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
                  Pilotage
                </h1>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--muted)',
                  }}
                >
                  Cockpit financier · {realBandes.length} bande{realBandes.length > 1 ? 's' : ''} · marge théorique {nomFerme}
                </div>
              </div>
              {auditData && (
                <button
                  type="button"
                  onClick={handlePrint}
                  aria-label="Exporter le rapport PDF"
                  className="pressable"
                  style={{
                    minHeight: 44,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--color-accent-500)',
                    color: 'var(--bg-surface)',
                    border: '1.5px solid var(--color-accent-500)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'transform 160ms var(--ease-emil)',
                  }}
                >
                  <FileText size={13} aria-hidden="true" />
                  Export PDF
                </button>
              )}
            </header>

            {/* ── Marge globale (hero) ─────────────────────────────── */}
            <section
              aria-label="Marge globale estimée"
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 12,
                padding: '20px 22px',
                boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <Eyebrow dotColor={margeNegative ? 'pig' : 'accent'} withRule={false}>
                Marge globale estimée · cheptel actif
              </Eyebrow>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 44,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: margeNegative ? 'var(--color-pig-deep)' : 'var(--color-accent-500)',
                  lineHeight: 1,
                }}
              >
                {formatNumber(margeGlobaleEstimee)}
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: 'var(--muted)',
                    marginLeft: 8,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {currencySuffix(currency)}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                  color: margeDeltaColor,
                  fontWeight: 500,
                }}
              >
                {margeDelta
                  ? `${formatDeltaPct(margeDelta)} (${formatDeltaPct(margeDelta, 'currency')}) · ${sinceLabel}`
                  : firstRunLabel}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--muted)',
                }}
              >
                Calcul théorique basé sur J+X et les pesées en stock.
              </div>
            </section>

            {/* ── 4 KPI cards ──────────────────────────────────────── */}
            <section
              aria-label="KPIs financiers"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
              }}
            >
              <KpiCardV6
                label="Valeur cheptel"
                value={formatNumber(totalRevenuProjete)}
                unit={currencyUnit(currency)}
                trend={buildTrend(revenuDelta, 'Revenus projetés')}
                trendDir={semanticTrendDir(revenuDelta, 'higher-better')}
                spark={spark(totalRevenuProjete || 1)}
              />
              <KpiCardV6
                label="Coût aliment"
                value={formatNumber(totalCoutAlimentaire)}
                unit={currencyUnit(currency)}
                trend={buildTrend(coutAlimDelta, 'Engagé')}
                trendDir={semanticTrendDir(coutAlimDelta, 'lower-better')}
                spark={spark(totalCoutAlimentaire || 1)}
              />
              <KpiCardV6
                label="Frais fixes"
                value={formatNumber(totalCoutFixe)}
                unit={currencyUnit(currency)}
                trend={buildTrend(coutFixeDelta, 'Cumul cycle')}
                trendDir={semanticTrendDir(coutFixeDelta, 'neutral')}
                spark={spark(totalCoutFixe || 1)}
              />
              <KpiCardV6
                label="Mortalité"
                value={tauxMortaliteMoyen.toFixed(1)}
                unit=" %"
                trend={
                  mortaliteDelta
                    ? buildTrend(mortaliteDelta, '')
                    : tauxMortaliteMoyen > 2 ? 'Au-dessus seuil' : 'Sous seuil'
                }
                trendDir={
                  mortaliteDelta
                    ? semanticTrendDir(mortaliteDelta, 'lower-better')
                    : tauxMortaliteMoyen > 2 ? 'down' : 'up'
                }
                spark={spark(tauxMortaliteMoyen || 1)}
              />
            </section>

            {/* ── Performance bandes (top / flop) ──────────────────── */}
            <section aria-label="Performance bandes">
              <Eyebrow dotColor="accent">Performance bandes</Eyebrow>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                {topBande && (
                  <PerfBandeCard
                    tone="accent"
                    label="Bande la mieux notée"
                    bandeId={topBande.bande.idPortee}
                    metric={`ROI : +${topBande.report.roiPct}%`}
                  />
                )}
                {flopBande && (
                  <PerfBandeCard
                    tone="pig"
                    label="Attention requise"
                    bandeId={flopBande.bande.idPortee}
                    metric={`Marge : ${formatCurrency(flopBande.report.margeNetteProjetee, currency)}`}
                  />
                )}
                {!topBande && !flopBande && (
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 12,
                      padding: '20px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--muted)',
                    }}
                  >
                    Données insuffisantes pour classer les bandes.
                  </div>
                )}
              </div>
            </section>

            {/* ── Alertes (carte sommaire) ─────────────────────────── */}
            <section aria-label="Alertes en cours">
              <Eyebrow dotColor="pig">Alertes</Eyebrow>
              <Link
                to="/alerts"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-card, 12px)',
                  padding: '14px 18px',
                  textDecoration: 'none',
                  marginTop: 12,
                }}
              >
                <BellRing
                  size={20}
                  color={alertsCount > 0 ? 'var(--color-pig)' : 'var(--muted)'}
                  aria-hidden="true"
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  >
                    {alertsCount > 0
                      ? `${alertsCount} alerte${alertsCount > 1 ? 's' : ''} active${alertsCount > 1 ? 's' : ''}`
                      : 'Aucune alerte'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Voir toutes les alertes →
                  </div>
                </div>
                <ChevronRight size={18} color="var(--muted)" aria-hidden="true" />
              </Link>
            </section>

            {/* ── Modules de gestion ───────────────────────────────── */}
            <section aria-label="Modules de gestion">
              <Eyebrow dotColor="muted">Modules de gestion</Eyebrow>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <ModuleTile
                  icon={<Wallet size={18} aria-hidden="true" />}
                  title="Trésorerie"
                  subtitle="Flux réels"
                  onClick={() => navigate('/pilotage/finances')}
                />
                <ModuleTile
                  icon={<TrendingUp size={18} aria-hidden="true" />}
                  title="Performance technique"
                  subtitle="Benchmarks GTTT"
                  onClick={() => navigate('/pilotage/perf')}
                />
                <ModuleTile
                  icon={<Wind size={18} aria-hidden="true" />}
                  title="Prévisions"
                  subtitle="Projections"
                  onClick={() => navigate('/pilotage/previsions')}
                />
              </div>
            </section>
          </div>
        </AgritechLayout>

        {auditData && <AuditPrintTemplate data={auditData} />}
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ───────────────────────────────────────────────────────

interface PerfBandeCardProps {
  tone: 'accent' | 'pig';
  label: string;
  bandeId: string;
  metric: string;
}

const PerfBandeCard: React.FC<PerfBandeCardProps> = ({ tone, label, bandeId, metric }) => {
  const color = tone === 'accent' ? 'var(--color-accent-500)' : 'var(--color-pig-deep)';
  const bg = tone === 'accent' ? 'var(--color-accent-100)' : 'var(--color-pig-soft)';
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: bg,
          color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <TrendingUp size={20} aria-hidden="true" style={{ transform: tone === 'pig' ? 'rotate(180deg)' : 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <h4
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '4px 0 2px',
            letterSpacing: '-0.005em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {bandeId}
        </h4>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          {metric}
        </div>
      </div>
      <ArrowRight size={16} color="var(--muted)" aria-hidden="true" />
    </div>
  );
};

interface ModuleTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}

const ModuleTile: React.FC<ModuleTileProps> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={title}
    className="pressable"
    style={{
      background: 'var(--bg-surface)',
      borderRadius: 12,
      padding: '14px 16px',
      boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      transition: 'transform 160ms var(--ease-emil)',
    }}
  >
    <span
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'var(--color-accent-100)',
        color: 'var(--color-accent-600)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginTop: 2,
        }}
      >
        {subtitle}
      </div>
    </div>
  </button>
);

/**
 * Formate un montant numérique avec séparateur "." (style banque francophone).
 * Pas de suffixe devise — celui-ci est appliqué via `currencySuffix()` côté
 * appelant pour rester aligné sur le pays de la ferme.
 */
function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, '.');
}

/** Format unitaire pour KpiCard : " €", " FCFA", etc. (espace de tête). */
function currencyUnit(c: Currency): string {
  return ` ${currencySuffix(c)}`;
}

export default PilotageHub;
