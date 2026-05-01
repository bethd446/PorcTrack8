import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { Baby, Heart, Sprout, TrendingUp, Award, Home, Truck } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import { useTroupeau } from '../../context/TroupeauContext';
import { normaliseStatut } from '../../lib/truieStatut';
import { Bandes } from '../../services/bandAnalysisEngine';
import type { LogeOccupationAlerte } from '../../services/bandesAggregator';
import { useTroupeauPipeline } from '../../hooks/useTroupeauStats';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { FARM_CONFIG } from '../../config/farm';

import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import {
  computeBandePhase,
  filterRealPortees,
} from '../../services/bandesAggregator';

import TroupeauTruiesView from '../troupeau/TroupeauTruiesView';
import TroupeauVerratsView from '../troupeau/TroupeauVerratsView';
import TroupeauPorceletsView from '../troupeau/TroupeauPorceletsView';
import TroupeauLogesView from '../troupeau/TroupeauLogesView';

// ─── Sub-tabs ────────────────────────────────────────────────────────────────

type SubTab = 'truies' | 'verrats' | 'porcelets' | 'loges';

const SUB_TABS: ReadonlyArray<{ id: SubTab; label: string }> = [
  { id: 'truies', label: 'Truies' },
  { id: 'verrats', label: 'Verrats' },
  { id: 'porcelets', label: 'Porcelets' },
  { id: 'loges', label: 'Loges' },
];

function isSubTab(v: string | null): v is SubTab {
  return v === 'truies' || v === 'verrats' || v === 'porcelets' || v === 'loges';
}

const TroupeauHub: React.FC = () => {
  const navigate = useNavigate();
  const { verrats, bandes } = useTroupeau();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTruies } = useTroupeauPipeline();
  const { handleRefresh } = useAutoRefresh();

  const viewParam = searchParams.get('view');
  const initialSubTab: SubTab = isSubTab(viewParam) ? viewParam : 'truies';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab);

  // Sync state with URL parameter (deep links / back nav)
  useEffect(() => {
    if (isSubTab(viewParam) && viewParam !== activeSubTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSubTab(viewParam);
    }
  }, [viewParam, activeSubTab]);

  const handleSubTabChange = (tab: SubTab): void => {
    setActiveSubTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'truies') next.delete('view');
    else next.set('view', tab);
    setSearchParams(next, { replace: true });
  };

  // Search states lifted to Hub to persist during tab changes
  const [searchTruies, setSearchTruies] = useState('');
  const [searchVerrats, setSearchVerrats] = useState('');
  const [searchPorcelets, setSearchPorcelets] = useState('');

  const today = useMemo(() => new Date(), []);
  const realBandes = useMemo(() => Bandes.filterReal(bandes), [bandes]);

  const summary = useMemo(() => {
    const isCanon = (statut: string | undefined, canon: string) =>
      normaliseStatut(statut) === canon;

    return {
      total: activeTruies.length,
      pleines: activeTruies.filter(t => isCanon(t.statut, 'PLEINE')).length,
      maternite: activeTruies.filter(t => isCanon(t.statut, 'MATERNITE')).length,
      vides: activeTruies.filter(t => isCanon(t.statut, 'VIDE')).length,
      mat: Bandes.logesMaternite(activeTruies),
      post: Bandes.logesPostSevrage(realBandes, today),
      eng: Bandes.logesEngraissement(realBandes, today),
    };
  }, [activeTruies, realBandes, today]);

  const porceletCount = useMemo(
    () => realBandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0),
    [realBandes],
  );

  const totalLogesCapacity = useMemo(() =>
    FARM_CONFIG.MATERNITE_LOGES_CAPACITY +
    FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY +
    FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY,
  []);

  const tabCounts: Record<SubTab, number> = {
    truies: activeTruies.length,
    verrats: verrats.length,
    porcelets: porceletCount,
    loges: summary.mat.occupees + summary.post.occupees + summary.eng.occupees,
  };

  const totalAnimals = activeTruies.length + verrats.length;

  // ── Comptes par phase de cycle (pour tiles "Cycles biologiques") ────────
  const cycleCounts = useMemo(() => {
    const counts = {
      maternite: 0,
      postSevrage: 0,
      croissance: 0,
      engraissement: 0,
      finition: 0,
      reproduction: activeTruies.filter(t => normaliseStatut(t.statut) === 'PLEINE').length,
      sortie: 0,
    };
    const real = filterRealPortees(bandes);
    for (const b of real) {
      const phase = computeBandePhase(b, today);
      if (phase === 'SOUS_MERE') counts.maternite += 1;
      else if (phase === 'POST_SEVRAGE') counts.postSevrage += 1;
      else if (phase === 'CROISSANCE') counts.croissance += 1;
      else if (phase === 'ENGRAISSEMENT') counts.engraissement += 1;
      else if (phase === 'FINITION') counts.finition += 1;
    }
    counts.sortie = bandes.filter(b => {
      const s = (b.statut ?? '').toLowerCase();
      return /vendu|archiv|sortie/.test(s);
    }).length;
    return counts;
  }, [bandes, activeTruies, today]);

  const CYCLE_TILES: ReadonlyArray<{
    id: string;
    label: string;
    icon: React.ReactNode;
    count: number;
    route: string;
  }> = [
    { id: 'maternite', label: 'Maternité', icon: <Baby size={18} aria-hidden="true" />, count: cycleCounts.maternite, route: '/cycles/maternite' },
    { id: 'postsevr', label: 'Post-sevrage', icon: <Sprout size={18} aria-hidden="true" />, count: cycleCounts.postSevrage, route: '/cycles/post-sevrage' },
    { id: 'croiss', label: 'Croissance', icon: <TrendingUp size={18} aria-hidden="true" />, count: cycleCounts.croissance, route: '/cycles/croissance' },
    { id: 'engrais', label: 'Engraissement', icon: <Home size={18} aria-hidden="true" />, count: cycleCounts.engraissement, route: '/cycles/engraissement' },
    { id: 'finition', label: 'Finition', icon: <Award size={18} aria-hidden="true" />, count: cycleCounts.finition, route: '/cycles/finition' },
    { id: 'repro', label: 'Reproduction', icon: <Heart size={18} aria-hidden="true" />, count: cycleCounts.reproduction, route: '/cycles/repro' },
    { id: 'sortie', label: 'Sortie', icon: <Truck size={18} aria-hidden="true" />, count: cycleCounts.sortie, route: '/cycles/sortie' },
  ];

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <TopBarSync
            crumbs={['Pilotage', 'Cheptel']}
            onMariusClick={() => {
              const evt = new CustomEvent('open-chatbot');
              window.dispatchEvent(evt);
            }}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* ── En-tête ───────────────────────────────────────────── */}
            <header>
              <Eyebrow dotColor="accent">Cheptel · Ferme {FARM_CONFIG.FARM_ID}</Eyebrow>
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
                Troupeau
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                {totalAnimals} animaux suivis · {summary.pleines} pleines · {summary.maternite} maternité · {summary.vides} vides
              </div>
            </header>

            {/* ── Synth strip + mini KPIs loges ────────────────────── */}
            <section
              aria-label="Synthèse troupeau et occupation des loges"
              role="group"
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 12,
                padding: '14px 16px',
                boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  gap: '6px 14px',
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  color: 'var(--ink-soft)',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: 'var(--ink)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {summary.total} truie{summary.total > 1 ? 's' : ''}
                </span>
                <span style={{ color: 'var(--muted)', opacity: 0.4 }}>|</span>
                <span>{summary.pleines} pleines</span>
                <span style={{ color: 'var(--muted)', opacity: 0.4 }}>|</span>
                <span>{summary.maternite} maternité</span>
                <span style={{ color: 'var(--muted)', opacity: 0.4 }}>|</span>
                <span>{summary.vides} vides</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 14,
                }}
              >
                <LogesMiniBar label="Mat." occ={summary.mat} />
                <LogesMiniBar label="P-sev" occ={summary.post} />
                <LogesMiniBar label="Eng." occ={summary.eng} />
              </div>
            </section>

            {/* ── Pipeline reproduction (funnel statuts) ───────────── */}
            <ReproFunnel
              total={summary.total}
              pleines={summary.pleines}
              maternite={summary.maternite}
              vides={summary.vides}
            />

            {/* ── Sub-tabs (pills) ─────────────────────────────────── */}
            <div
              role="tablist"
              aria-label="Sélectionner une vue du troupeau"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                paddingBottom: 4,
              }}
            >
              {SUB_TABS.map((t) => {
                const active = activeSubTab === t.id;
                const count = tabCounts[t.id];
                const countLabel = t.id === 'loges'
                  ? `${count}/${totalLogesCapacity}`
                  : String(count).padStart(2, '0');
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`troupeau-panel-${t.id}`}
                    id={`troupeau-tab-${t.id}`}
                    onClick={() => handleSubTabChange(t.id)}
                    className="pressable"
                    style={{
                      minHeight: 44,
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-pill)',
                      background: active ? 'var(--color-accent-500)' : 'var(--bg-surface)',
                      color: active ? 'var(--bg-surface)' : 'var(--ink-soft)',
                      border: `1px solid ${active ? 'var(--color-accent-500)' : 'var(--line)'}`,
                      fontFamily: 'DMMono, ui-monospace, monospace',
                      fontSize: 11,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'transform 160ms var(--ease-emil), background 200ms var(--ease-emil)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>{t.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        opacity: 0.75,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {countLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Panels ───────────────────────────────────────────── */}
            <div
              role="tabpanel"
              id={`troupeau-panel-${activeSubTab}`}
              aria-labelledby={`troupeau-tab-${activeSubTab}`}
              className="animate-fade-in"
            >
              {activeSubTab === 'truies' && (
                <TroupeauTruiesView searchText={searchTruies} setSearchText={setSearchTruies} />
              )}
              {activeSubTab === 'verrats' && (
                <TroupeauVerratsView searchText={searchVerrats} setSearchText={setSearchVerrats} />
              )}
              {activeSubTab === 'porcelets' && (
                <TroupeauPorceletsView searchText={searchPorcelets} setSearchText={setSearchPorcelets} />
              )}
              {activeSubTab === 'loges' && <TroupeauLogesView />}
            </div>

            {/* ── Cycles biologiques ───────────────────────────────── */}
            <section aria-label="Cycles biologiques">
              <Eyebrow dotColor="accent">Cycles biologiques</Eyebrow>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                {CYCLE_TILES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(t.route)}
                    aria-label={`${t.label} · ${t.count}`}
                    className="pressable"
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 12,
                      padding: '14px 14px',
                      boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      minHeight: 96,
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
                      {t.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'BigShoulders, system-ui, sans-serif',
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          letterSpacing: '-0.005em',
                        }}
                      >
                        {t.label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'DMMono, ui-monospace, monospace',
                          fontSize: 11,
                          letterSpacing: '0.06em',
                          color: 'var(--muted)',
                          marginTop: 2,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {String(t.count).padStart(2, '0')} {t.id === 'repro' ? 'truie(s)' : 'bande(s)'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ───────────────────────────────────────────────────────

const ALERT_FILL: Record<LogeOccupationAlerte, string> = {
  OK: 'var(--color-accent-500)',
  HIGH: 'var(--color-amber-pork)',
  FULL: 'var(--color-pig)',
};

interface LogesMiniBarProps {
  label: string;
  occ: { occupees: number; capacite: number; tauxPct: number; alerte: LogeOccupationAlerte };
}

const LogesMiniBar: React.FC<LogesMiniBarProps> = ({ label, occ }) => {
  const width = Math.min(occ.tauxPct, 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 9.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 11,
            color: 'var(--ink)',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {occ.occupees}/{occ.capacite}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: 'var(--bg-app)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            background: ALERT_FILL[occ.alerte],
            borderRadius: 999,
            transition: 'width 240ms var(--ease-emil)',
          }}
        />
      </div>
    </div>
  );
};

interface ReproFunnelProps {
  total: number;
  pleines: number;
  maternite: number;
  vides: number;
}

const ReproFunnel: React.FC<ReproFunnelProps> = ({ total, pleines, maternite, vides }) => {
  const stages = [
    { id: 'attente', label: 'Attente saillie', value: vides, color: 'var(--muted)' },
    { id: 'pleines', label: 'Pleines', value: pleines, color: 'var(--color-accent-500)' },
    { id: 'maternite', label: 'Maternité', value: maternite, color: 'var(--color-amber-pork-deep)' },
    { id: 'surveiller', label: 'Surveiller', value: 0, color: 'var(--color-amber-pork)' },
    { id: 'reforme', label: 'Réforme', value: Math.max(0, total - pleines - maternite - vides), color: 'var(--color-pig)' },
  ];
  const max = Math.max(1, ...stages.map(s => s.value));

  return (
    <section
      aria-label="Pipeline reproduction"
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Eyebrow dotColor="accent" withRule={false}>
        Pipeline reproduction
      </Eyebrow>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
          gap: 8,
        }}
      >
        {stages.map((s) => {
          const pct = (s.value / max) * 100;
          return (
            <div
              key={s.id}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}
            >
              <div
                style={{
                  fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  color: s.value > 0 ? s.color : 'var(--muted)',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  height: 4,
                  background: 'var(--bg-app)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: s.color,
                    borderRadius: 999,
                    transition: 'width 240ms var(--ease-emil)',
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 9.5,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TroupeauHub;
