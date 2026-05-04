import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { ChevronRight, Layers, Plus } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import { useTroupeau } from '../../context/TroupeauContext';
import { useMeta } from '../../context/FarmContext';
import { normaliseStatut } from '../../lib/truieStatut';
import { Bandes } from '../../services/bandAnalysisEngine';
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
  PageHeader,
  safeDisplay,
} from '@/design-system';

import TroupeauTruiesView from '../troupeau/TroupeauTruiesView';
import TroupeauVerratsView from '../troupeau/TroupeauVerratsView';
import TroupeauPorceletsView from '../troupeau/TroupeauPorceletsView';
import TroupeauLogesListView from '../troupeau/TroupeauLogesListView';
import QuickAddBandeForm from '../../components/forms/QuickAddBandeForm';
import BatimentsSummary from './BatimentsSummary';

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
  useMeta(); // V41 : nomFerme retiré du header (eyebrow simplifié à "ÉLEVAGE")
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

  // V41 : totalAnimals + truieBreakdown supprimés (sous-titres métriques redondants
  // avec la VUE D'ENSEMBLE StatsGrid).

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
            {/* V41 Phase B — header sobre via PageHeader, pas de CTA, pas de métriques en sous-titre */}
            <PageHeader eyebrow="ÉLEVAGE" title="Élevage" subtitle="Le troupeau de ta ferme" />

            {/* V41 — 1 hero card unique : VUE D'ENSEMBLE = 4 stats clés (fusion APERÇU+INVENTAIRE) */}
            <section aria-label="Vue d'ensemble">
              <Section label="VUE D'ENSEMBLE" />
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

// V41 : ALERT_FILL + LogesMiniBar supprimés (section APERÇU retirée — fusion dans VUE D'ENSEMBLE StatsGrid).

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

export default TroupeauHub;
