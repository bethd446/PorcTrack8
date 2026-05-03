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

import TopBarSync from '../../components/design/TopBarSync';
import {
  Section,
  Card,
  Button,
  Tag,
  IconBox,
  StatsGrid,
  Stat,
  Tabs,
  safeDisplay,
} from '../../design-system';

import TroupeauTruiesView from '../troupeau/TroupeauTruiesView';
import TroupeauVerratsView from '../troupeau/TroupeauVerratsView';
import TroupeauPorceletsView from '../troupeau/TroupeauPorceletsView';
import TroupeauLogesListView from '../troupeau/TroupeauLogesListView';
import QuickAddBandeForm from '../../components/forms/QuickAddBandeForm';

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

  const [searchTruies, setSearchTruies] = useState('');
  const [searchVerrats, setSearchVerrats] = useState('');
  const [searchPorcelets, setSearchPorcelets] = useState('');
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

  const tabOptions = SUB_TABS.map((t) => ({
    value: t.id,
    label: t.label,
    count: tabCounts[t.id],
  }));

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

          <div className="pt-page" style={{ padding: '8px 18px 24px', maxWidth: 1100, margin: '0 auto' }}>
            <Section label={`Élevage · ${nomFerme}`} />
            <h1 style={{ fontSize: 'var(--pt-text-display)', marginBottom: 4 }}>Élevage</h1>
            <p style={{ color: 'var(--pt-text-muted)', margin: '0 0 4px', fontSize: 14 }}>
              {summary.total} truie{summary.total > 1 ? 's' : ''} · {verrats.length} verrat{verrats.length > 1 ? 's' : ''} ({totalAnimals} animaux)
            </p>
            <p style={{ color: 'var(--pt-text-subtle)', margin: '0 0 16px', fontSize: 13 }}>
              {truieBreakdown}
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/troupeau/classement')}
                ariaLabel="Voir le classement des reproducteurs"
              >
                <Trophy size={15} aria-hidden="true" />
                <span>Classement Top Truies & Verrats</span>
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>

            <section aria-label="Aperçu des loges">
              <Section label="APERÇU" />
              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <LogesMiniBar label="Mat." occ={summary.mat} />
                  <LogesMiniBar label="P-sev" occ={summary.post} />
                  <LogesMiniBar label="Eng." occ={summary.eng} />
                </div>
              </Card>
            </section>

            <section aria-label="Inventaire">
              <Section label="INVENTAIRE" />
              <Card>
                <StatsGrid cols={4}>
                  <Stat value={activeTruies.length} label="Truies" />
                  <Stat value={verrats.length} label="Verrats" />
                  <Stat
                    value={`${summary.mat.occupees + summary.post.occupees + summary.eng.occupees}/${totalLogesCapacity}`}
                    label="Loges"
                  />
                  <Stat value={realBandes.length} label="Bandes" />
                </StatsGrid>
              </Card>
            </section>

            <Section label="TROUPEAU" />

            <div style={{ marginBottom: 16 }}>
              <Tabs
                value={activeSubTab}
                onChange={(v) => {
                  if (isSubTab(v)) handleSubTabChange(v);
                }}
                options={tabOptions}
                ariaLabel="Sélectionner une vue du troupeau"
              />
            </div>

            {activeSubTab === 'truies' && (
              <TroupeauTruiesView searchText={searchTruies} setSearchText={setSearchTruies} />
            )}
            {activeSubTab === 'verrats' && (
              <TroupeauVerratsView searchText={searchVerrats} setSearchText={setSearchVerrats} />
            )}
            {activeSubTab === 'porcelets' && (
              <TroupeauPorceletsView searchText={searchPorcelets} setSearchText={setSearchPorcelets} />
            )}
            {activeSubTab === 'loges' && <TroupeauLogesListView />}
            {activeSubTab === 'bandes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setAddBandeOpen(true)}
                    ariaLabel="Ajouter une bande historique"
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
            )}
            {activeSubTab === 'batiments' && (
              <BatimentsSummary onSeeAll={() => navigate('/troupeau/batiments')} />
            )}
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
  OK: 'var(--pt-accent)',
  HIGH: 'var(--pt-warning)',
  FULL: 'var(--pt-danger)',
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
            fontSize: 'var(--pt-text-label)',
            letterSpacing: 'var(--pt-tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--pt-text-subtle)',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--pt-text)',
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
          background: 'var(--pt-surface-alt)',
          borderRadius: 'var(--pt-radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            background: ALERT_FILL[occ.alerte],
            borderRadius: 'var(--pt-radius-pill)',
            transition: 'width 240ms ease',
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

type TagVariant = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning' | 'success';

function bandeStatutTagVariant(statut: string | undefined): TagVariant {
  const s = (statut ?? '').toLowerCase();
  if (/sous m[èe]re|maternit/.test(s)) return 'success';
  if (/sevr/.test(s)) return 'accent';
  return 'default';
}

const BandesInline: React.FC<BandesInlineProps> = ({ bandes, onOpen, onSeeAll }) => {
  if (bandes.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', color: 'var(--pt-text-muted)', fontSize: 14 }}>
          Aucune bande active.
        </div>
      </Card>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {bandes.map((b) => {
        const tagVariant = bandeStatutTagVariant(b.statut);
        const code = safeDisplay(b.idPortee ?? b.id);
        const truie = b.truie ? ` · ${safeDisplay(b.truie)}` : '';
        return (
          <div key={b.id}>
            <Card
              compact
              interactive
              onClick={() => onOpen(b.id)}
              ariaLabel={`Ouvrir bande ${code}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 44 }}>
                <IconBox tone="accent">
                  <Layers size={20} aria-hidden="true" />
                </IconBox>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pt-text)' }}>
                    {code}{truie}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--pt-text-muted)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {typeof b.vivants === 'number' ? `${b.vivants} viv.` : '—'}
                  </div>
                </div>
                {b.statut ? <Tag variant={tagVariant}>{b.statut}</Tag> : null}
                <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--pt-text-subtle)', flexShrink: 0 }} />
              </div>
            </Card>
          </div>
        );
      })}
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
    <Card>
      <StatsGrid cols={3}>
        {stats.map((s) => (
          <div key={s.label}>
            <Stat value={s.cap} label={`${s.label} (loges)`} />
          </div>
        ))}
      </StatsGrid>
      <div style={{ marginTop: 16 }}>
        <Button variant="secondary" size="sm" onClick={onSeeAll}>
          Voir le plan complet
        </Button>
      </div>
    </Card>
  );
};

export default TroupeauHub;
