/**
 * PilotageHub — /pilotage
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte v6 « Terrain Vivant » (2026-04-30)
 *
 *   1. TopBarSync + Eyebrow + H1 Big Shoulders
 *   2. KPI cards principaux (4) — Marge globale / Valeur cheptel / Mortalité / Frais
 *   3. Section "Performance bandes" : top / flop par marge
 *   4. Section "Alertes critiques" : urgences à traiter
 *   5. Audit / export PDF
 */

import React, { useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, FileText, TrendingUp, AlertTriangle,
  ArrowRight, Wind, ShieldCheck,
} from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import KpiCardV6 from '../../components/design/KpiCard';
import { useFarm } from '../../context/FarmContext';
import { useTroupeau } from '../../context/TroupeauContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { genererRapportGlobal } from '../../services/financialAnalyzer';
import { prepareAuditSnapshot } from '../../services/exportService';
import { resolveAlertSubject } from '../../utils/alertSubject';
import AuditPrintTemplate from '../pilotage/AuditPrintTemplate';

const PilotageHub: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    alerts,
    bandes,
    transitions,
  } = useFarm();
  const { truies, verrats } = useTroupeau();
  const alertLookup = useMemo(() => ({ bandes, truies, verrats }), [bandes, truies, verrats]);
  const { handleRefresh } = useAutoRefresh();
  const [, setIsPrinting] = useState(false);

  const globalReport = useMemo(() => {
    if (loading || bandes.length === 0) return null;
    return genererRapportGlobal(bandes, transitions);
  }, [bandes, transitions, loading]);

  const auditData = useMemo(() => {
    if (loading || bandes.length === 0 || !alerts) return null;
    return prepareAuditSnapshot(bandes, transitions, alerts);
  }, [bandes, transitions, alerts, loading]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const urgences = useMemo(() => {
    return alerts.filter(a => a.priority === 'CRITIQUE' || a.priority === 'HAUTE').slice(0, 5);
  }, [alerts]);

  // Spark dérivée déterministe
  const spark = (base: number) =>
    Array.from({ length: 7 }, (_, i) => Math.max(1, Math.round(Math.abs(base) * (0.85 + 0.05 * i))));

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
                  fontFamily: 'BigShoulders, system-ui, sans-serif',
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
                    fontFamily: 'BigShoulders, system-ui, sans-serif',
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
                    fontFamily: 'InstrumentSans, system-ui, sans-serif',
                    fontSize: 13,
                    color: 'var(--muted)',
                  }}
                >
                  Cockpit financier · {bandes.length} bandes · marge théorique K13
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
                    fontFamily: 'DMMono, ui-monospace, monospace',
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
                  fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
                  fontSize: 44,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: margeNegative ? 'var(--color-pig-deep)' : 'var(--color-accent-500)',
                  lineHeight: 1,
                }}
              >
                {formatFCFA(margeGlobaleEstimee)}
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
                  FCFA
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
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
                value={formatFCFA(totalRevenuProjete)}
                unit=" F"
                trend="Revenus projetés"
                spark={spark(totalRevenuProjete || 1)}
              />
              <KpiCardV6
                label="Coût aliment"
                value={formatFCFA(totalCoutAlimentaire)}
                unit=" F"
                trend="Engagé"
                spark={spark(totalCoutAlimentaire || 1)}
                trendDir="down"
              />
              <KpiCardV6
                label="Frais fixes"
                value={formatFCFA(totalCoutFixe)}
                unit=" F"
                trend="Cumul cycle"
                spark={spark(totalCoutFixe || 1)}
              />
              <KpiCardV6
                label="Mortalité"
                value={tauxMortaliteMoyen.toFixed(1)}
                unit=" %"
                trend={tauxMortaliteMoyen > 2 ? 'Au-dessus seuil' : 'Sous seuil'}
                trendDir={tauxMortaliteMoyen > 2 ? 'down' : 'up'}
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
                    label="Top performer"
                    bandeId={topBande.bande.idPortee}
                    metric={`ROI : +${topBande.report.roiPct}%`}
                  />
                )}
                {flopBande && (
                  <PerfBandeCard
                    tone="pig"
                    label="Attention requise"
                    bandeId={flopBande.bande.idPortee}
                    metric={`Marge : ${formatFCFA(flopBande.report.margeNetteProjetee)} FCFA`}
                  />
                )}
                {!topBande && !flopBande && (
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 12,
                      padding: '20px',
                      textAlign: 'center',
                      fontFamily: 'InstrumentSans, system-ui, sans-serif',
                      fontSize: 13,
                      color: 'var(--muted)',
                    }}
                  >
                    Données insuffisantes pour classer les bandes.
                  </div>
                )}
              </div>
            </section>

            {/* ── Alertes critiques ────────────────────────────────── */}
            <section aria-label="Alertes critiques">
              <Eyebrow dotColor={urgences.length > 0 ? 'pig' : 'accent'}>
                Alertes critiques · {urgences.length}
              </Eyebrow>
              {urgences.length === 0 ? (
                <div
                  style={{
                    marginTop: 12,
                    background: 'var(--bg-surface)',
                    borderRadius: 12,
                    padding: '20px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: '1px solid var(--color-accent-100)',
                  }}
                >
                  <ShieldCheck size={22} color="var(--color-accent-500)" aria-hidden="true" />
                  <span
                    style={{
                      fontFamily: 'BigShoulders, system-ui, sans-serif',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    Exploitation sous contrôle
                  </span>
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {urgences.map(alert => (
                    <li key={alert.id}>
                      <div
                        style={{
                          background: 'var(--bg-surface)',
                          borderRadius: 12,
                          boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                          borderLeft: `3px solid ${alert.priority === 'CRITIQUE' ? 'var(--color-pig-deep)' : 'var(--color-amber-pork-deep)'}`,
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontFamily: 'DMMono, ui-monospace, monospace',
                              fontSize: 10,
                              letterSpacing: '0.10em',
                              textTransform: 'uppercase',
                              fontWeight: 600,
                              color: alert.priority === 'CRITIQUE' ? 'var(--color-pig-deep)' : 'var(--color-amber-pork-deep)',
                            }}
                          >
                            {alert.priority} · {alert.category}
                          </span>
                          <AlertTriangle
                            size={14}
                            color={alert.priority === 'CRITIQUE' ? 'var(--color-pig-deep)' : 'var(--color-amber-pork-deep)'}
                            style={{ marginLeft: 'auto' }}
                            aria-hidden="true"
                          />
                        </div>
                        <h4
                          style={{
                            fontFamily: 'BigShoulders, system-ui, sans-serif',
                            fontSize: 16,
                            fontWeight: 600,
                            color: 'var(--ink)',
                            margin: 0,
                            letterSpacing: '-0.005em',
                          }}
                        >
                          {resolveAlertSubject(alert.title, alertLookup)}
                        </h4>
                        <p
                          style={{
                            fontFamily: 'InstrumentSans, system-ui, sans-serif',
                            fontSize: 12,
                            color: 'var(--ink-soft)',
                            lineHeight: 1.5,
                            margin: 0,
                          }}
                        >
                          {resolveAlertSubject(alert.message, alertLookup)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
                  title="Performance GTTT"
                  subtitle="Benchmarks"
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
            fontFamily: 'DMMono, ui-monospace, monospace',
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
            fontFamily: 'BigShoulders, system-ui, sans-serif',
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
            fontFamily: 'InstrumentSans, system-ui, sans-serif',
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
          fontFamily: 'BigShoulders, system-ui, sans-serif',
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
          fontFamily: 'DMMono, ui-monospace, monospace',
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

function formatFCFA(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, '.');
}

export default PilotageHub;
