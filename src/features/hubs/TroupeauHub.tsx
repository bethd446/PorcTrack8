import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { ChevronRight, Layers, Plus, Trophy } from 'lucide-react';

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
import {
  Card,
  Button,
  SectionHeader,
  Tag,
  IconBox,
} from '../../components/design-system';

import TroupeauTruiesView from '../troupeau/TroupeauTruiesView';
import TroupeauVerratsView from '../troupeau/TroupeauVerratsView';
import TroupeauPorceletsView from '../troupeau/TroupeauPorceletsView';
import TroupeauLogesListView from '../troupeau/TroupeauLogesListView';
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
                className="text-page-title"
                style={{ margin: '8px 0 4px' }}
              >
                Élevage
              </h1>
              <div
                className="text-body"
                style={{ color: 'var(--muted)' }}
              >
                {summary.total} truie{summary.total > 1 ? 's' : ''} · {verrats.length} verrat{verrats.length > 1 ? 's' : ''} ({totalAnimals} animaux) — {truieBreakdown}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/troupeau/classement')}
                  aria-label="Voir le classement des reproducteurs"
                >
                  <Trophy size={15} aria-hidden="true" />
                  <span>Classement</span>
                </Button>
              </div>
            </header>

            {/* ── Aperçu loges (occupation Mat/P-sev/Eng) ──────────── */}
            <section aria-label="Aperçu des loges">
              <SectionHeader label="Aperçu" />
              <Card
                role="group"
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 14,
                }}
              >
                <LogesMiniBar label="Mat." occ={summary.mat} />
                <LogesMiniBar label="P-sev" occ={summary.post} />
                <LogesMiniBar label="Eng." occ={summary.eng} />
              </Card>
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
                <TroupeauLogesListView />
              </TabsContent>
              <TabsContent value="bandes" className="animate-fade-in">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setAddBandeOpen(true)}
                      aria-label="Ajouter une bande historique"
                    >
                      <Plus size={15} aria-hidden="true" />
                      Ajouter une bande
                    </Button>
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
            fontFamily: 'var(--font-mono)',
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
            fontFamily: 'var(--font-mono)',
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

/** Map statut bande → variant Tag V29 (palette DNA "Aujourd'hui"). */
function bandeStatutTagVariant(
  statut: string | undefined,
): 'default' | 'accent' | 'primary' | 'success' | 'warning' {
  const s = (statut ?? '').toLowerCase();
  if (/sous m[èe]re|maternit/.test(s)) return 'success';
  if (/sevr/.test(s)) return 'accent';
  if (/recap/.test(s)) return 'default';
  return 'default';
}

const BandesInline: React.FC<BandesInlineProps> = ({ bandes, onOpen, onSeeAll }) => {
  if (bandes.length === 0) {
    return (
      <Card>
        <div
          style={{
            textAlign: 'center',
            color: 'var(--ds-text-muted)',
            fontSize: 'var(--ds-text-small)',
          }}
        >
          Aucune bande active.
        </div>
      </Card>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {bandes.map((b) => {
          const tagVariant = bandeStatutTagVariant(b.statut);
          return (
            <li key={b.id}>
              <Card
                as="button"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({
                  type: 'button',
                  onClick: () => onOpen(b.id),
                  'aria-label': `Ouvrir bande ${b.idPortee ?? b.id}`,
                } as any)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  minHeight: 44,
                }}
              >
                <IconBox tone="accent">
                  <Layers size={20} aria-hidden="true" />
                </IconBox>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--ds-font-serif)',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ds-text)',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {b.idPortee ?? b.id}
                    {b.truie ? ` · ${b.truie}` : ''}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--ds-font-sans)',
                      fontSize: 'var(--ds-text-small)',
                      color: 'var(--ds-text-muted)',
                      marginTop: 2,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {typeof b.vivants === 'number' ? `${b.vivants} viv.` : '—'}
                  </div>
                </div>
                {b.statut ? (
                  <Tag variant={tagVariant}>{b.statut}</Tag>
                ) : null}
                <ChevronRight
                  size={18}
                  aria-hidden="true"
                  style={{ color: 'var(--ds-text-subtle)', flexShrink: 0 }}
                />
              </Card>
            </li>
          );
        })}
      </ul>
      <Button variant="ghost" size="sm" onClick={onSeeAll}>
        Voir toutes les bandes
      </Button>
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
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                fontFamily: 'var(--ds-font-sans)',
                fontSize: 'var(--ds-text-label)',
                letterSpacing: 'var(--ds-tracking-label)',
                color: 'var(--ds-text-subtle)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {s.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--ds-font-serif)',
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--ds-text)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {s.cap}
            </span>
            <span
              style={{
                fontFamily: 'var(--ds-font-sans)',
                fontSize: 12,
                color: 'var(--ds-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              loges
            </span>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onSeeAll}
        style={{ alignSelf: 'flex-start' }}
      >
        Voir le plan complet
      </Button>
    </Card>
  );
};

export default TroupeauHub;
