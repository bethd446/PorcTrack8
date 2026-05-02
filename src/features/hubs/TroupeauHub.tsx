import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { ChevronRight, Plus, Trophy } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import { useTroupeau } from '../../context/TroupeauContext';
import { useMeta } from '../../context/FarmContext';
import { normaliseStatut } from '../../lib/truieStatut';
import { Bandes } from '../../services/bandAnalysisEngine';
import type { LogeOccupationAlerte } from '../../services/bandesAggregator';
import { useTroupeauPipeline } from '../../hooks/useTroupeauStats';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { FARM_CONFIG } from '../../config/farm';

import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';

import TroupeauTruiesView from '../troupeau/TroupeauTruiesView';
import TroupeauVerratsView from '../troupeau/TroupeauVerratsView';
import TroupeauPorceletsView from '../troupeau/TroupeauPorceletsView';
import TroupeauLogesView from '../troupeau/TroupeauLogesView';
import QuickAddBandeForm from '../../components/forms/QuickAddBandeForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';

// ─── Sub-tabs ────────────────────────────────────────────────────────────────

type SubTab = 'truies' | 'verrats' | 'porcelets' | 'loges' | 'bandes' | 'batiments';

const SUB_TABS: ReadonlyArray<{ id: SubTab; label: string }> = [
  { id: 'truies', label: 'Truies' },
  { id: 'verrats', label: 'Verrats' },
  { id: 'porcelets', label: 'Porcelets' },
  { id: 'loges', label: 'Loges' },
  { id: 'bandes', label: 'Bandes' },
  { id: 'batiments', label: 'Bâtiments' },
];

function isSubTab(v: string | null): v is SubTab {
  return (
    v === 'truies' ||
    v === 'verrats' ||
    v === 'porcelets' ||
    v === 'loges' ||
    v === 'bandes' ||
    v === 'batiments'
  );
}

const TroupeauHub: React.FC = () => {
  const navigate = useNavigate();
  const { verrats, bandes } = useTroupeau();
  const { nomFerme } = useMeta();
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

  // CTA "Bande historique" — ouverture du form
  const [addBandeOpen, setAddBandeOpen] = useState(false);

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
      chaleur: activeTruies.filter(t => isCanon(t.statut, 'CHALEUR')).length,
      flushing: activeTruies.filter(t => isCanon(t.statut, 'FLUSHING')).length,
      surveillance: activeTruies.filter(t => isCanon(t.statut, 'SURVEILLANCE')).length,
      reforme: activeTruies.filter(t => isCanon(t.statut, 'REFORME')).length,
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
    bandes: realBandes.length,
    batiments: 3,
  };

  const totalAnimals = activeTruies.length + verrats.length;

  const truieBreakdown = useMemo(() => {
    const segments: string[] = [
      `${summary.pleines} pleines`,
      `${summary.maternite} maternité`,
      `${summary.vides} vides`,
    ];
    if (summary.chaleur > 0) segments.push(`${summary.chaleur} chaleur`);
    if (summary.flushing > 0) segments.push(`${summary.flushing} flushing`);
    if (summary.surveillance > 0) segments.push(`${summary.surveillance} à surveiller`);
    if (summary.reforme > 0) segments.push(`${summary.reforme} réforme`);
    return segments.join(' · ');
  }, [summary]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <TopBarSync
            crumbs={['Élevage']}
            onMariusClick={() => {
              const evt = new CustomEvent('open-chatbot');
              window.dispatchEvent(evt);
            }}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* ── En-tête ───────────────────────────────────────────── */}
            {/* AUDIT-5 : vocabulaire canonique "Élevage" partout (vs ancien
                mélange Cheptel/Troupeau/Élevage). Cohérent avec bottom-tab. */}
            <header>
              <Eyebrow dotColor="accent">Élevage · {nomFerme}</Eyebrow>
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
                Élevage
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                {summary.total} truie{summary.total > 1 ? 's' : ''} · {verrats.length} verrat{verrats.length > 1 ? 's' : ''} ({totalAnimals} animaux) — {truieBreakdown}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate('/troupeau/classement')}
                  aria-label="Voir le classement des reproducteurs"
                  className="pressable inline-flex items-center gap-2 h-10 px-4 rounded-full bg-accent text-bg-0 font-mono text-[12px] font-medium uppercase tracking-wide shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-opacity"
                >
                  <Trophy size={15} aria-hidden="true" />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                    <span>Classement</span>
                    <span style={{ fontSize: 9, opacity: 0.85, textTransform: 'none', letterSpacing: 0 }}>
                      Top truies & verrats par score
                    </span>
                  </span>
                </button>
              </div>
            </header>

            {/* ── Mini KPIs loges (occupation Mat/P-sev/Eng) ──────────── */}
            <section
              aria-label="Occupation des loges"
              role="group"
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 12,
                padding: '14px 16px',
                boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
              }}
            >
              <LogesMiniBar label="Mat." occ={summary.mat} />
              <LogesMiniBar label="P-sev" occ={summary.post} />
              <LogesMiniBar label="Eng." occ={summary.eng} />
            </section>

            {/* ── Sub-tabs (Radix) ─────────────────────────────────── */}
            <Tabs
              value={activeSubTab}
              onValueChange={(v) => {
                if (isSubTab(v)) handleSubTabChange(v);
              }}
            >
              <TabsList aria-label="Sélectionner une vue du troupeau">
                {SUB_TABS.map((t) => {
                  const count = tabCounts[t.id];
                  const countLabel = t.id === 'loges'
                    ? `${count}/${totalLogesCapacity}`
                    : String(count);
                  return (
                    <TabsTrigger key={t.id} value={t.id} id={`troupeau-tab-${t.id}`} style={{ minHeight: 36, gap: 8 }}>
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
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <TabsContent value="truies" className="animate-fade-in">
                <TroupeauTruiesView searchText={searchTruies} setSearchText={setSearchTruies} />
              </TabsContent>
              <TabsContent value="verrats" className="animate-fade-in">
                <TroupeauVerratsView searchText={searchVerrats} setSearchText={setSearchVerrats} />
              </TabsContent>
              <TabsContent value="porcelets" className="animate-fade-in">
                <TroupeauPorceletsView searchText={searchPorcelets} setSearchText={setSearchPorcelets} />
              </TabsContent>
              <TabsContent value="loges" className="animate-fade-in">
                <TroupeauLogesView />
              </TabsContent>
              <TabsContent value="bandes" className="animate-fade-in">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setAddBandeOpen(true)}
                      aria-label="Ajouter une bande historique"
                      className="pressable inline-flex items-center gap-2 h-10 px-4 rounded-full bg-accent text-bg-0 font-mono text-[12px] font-medium uppercase tracking-wide shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-opacity"
                    >
                      <Plus size={15} aria-hidden="true" />
                      Ajouter une bande historique
                    </button>
                  </div>
                  <BandesInline
                    bandes={realBandes}
                    onOpen={(id) => navigate(`/troupeau/bandes/${id}`)}
                    onSeeAll={() => navigate('/troupeau/bandes')}
                  />
                </div>
              </TabsContent>
              <TabsContent value="batiments" className="animate-fade-in">
                <BatimentsSummary onSeeAll={() => navigate('/troupeau/batiments')} />
              </TabsContent>
            </Tabs>
          </div>

          <QuickAddBandeForm
            isOpen={addBandeOpen}
            onClose={() => setAddBandeOpen(false)}
          />
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

// ─── BandesInline ──────────────────────────────────────────────────────────

interface BandesInlineProps {
  bandes: ReadonlyArray<{ id: string; idPortee?: string; truie?: string; statut?: string; vivants?: number; dateMB?: string }>;
  onOpen: (id: string) => void;
  onSeeAll: () => void;
}

const BandesInline: React.FC<BandesInlineProps> = ({ bandes, onOpen, onSeeAll }) => {
  if (bandes.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 12,
          padding: '20px 16px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 13,
        }}
      >
        Aucune bande active.
      </div>
    );
  }
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        overflow: 'hidden',
      }}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {bandes.map((b, idx) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onOpen(b.id)}
              className="pressable"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderTop: idx === 0 ? 'none' : '1px solid var(--bg-app)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'BigShoulders, system-ui, sans-serif',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {b.idPortee ?? b.id}
                  {b.truie ? ` · ${b.truie}` : ''}
                </div>
                <div
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 10.5,
                    letterSpacing: '0.06em',
                    color: 'var(--muted)',
                    marginTop: 2,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {b.statut ?? '—'}
                  {typeof b.vivants === 'number' ? ` · ${b.vivants} viv.` : ''}
                </div>
              </div>
              <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--muted)', flexShrink: 0 }} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSeeAll}
        className="pressable"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--bg-app)',
          padding: '12px 16px',
          fontFamily: 'DMMono, ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--color-accent-600)',
          cursor: 'pointer',
        }}
      >
        Voir toutes les bandes
      </button>
    </div>
  );
};

// ─── BatimentsSummary ──────────────────────────────────────────────────────

interface BatimentsSummaryProps {
  onSeeAll: () => void;
}

const BatimentsSummary: React.FC<BatimentsSummaryProps> = ({ onSeeAll }) => {
  const stats = [
    { label: 'Maternité', cap: FARM_CONFIG.MATERNITE_LOGES_CAPACITY },
    { label: 'Post-sevrage', cap: FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY },
    { label: 'Engraissement', cap: FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY },
  ];
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {stats.map((s) => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 9.5,
                letterSpacing: '0.04em',
                color: 'var(--muted)',
                fontWeight: 600,
              }}
            >
              {s.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {s.cap}
            </span>
            <span
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: '0.06em',
                color: 'var(--muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              loges
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onSeeAll}
        className="pressable"
        style={{
          alignSelf: 'flex-start',
          background: 'var(--color-accent-100)',
          color: 'var(--color-accent-600)',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontFamily: 'DMMono, ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Voir le plan complet
      </button>
    </div>
  );
};

export default TroupeauHub;
