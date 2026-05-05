/**
 * V70 — AnimalsV70 (page /troupeau, archétype Hub)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html lignes 1082-1176
 *
 * Décision A Christophe :
 * - Tab nav label : "Élevage" (BottomNav Phase 2 OK)
 * - H1 page : "Mes animaux" (titre lu par l'utilisateur, plus chaleureux)
 *
 * Phase 3B : page Hub catégoriel — TabsMini 5 catégories, search bar,
 * filter pills, liste truies stubs. FAB ajout (Phase F branchera contexte).
 */
import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { TabsMini } from '../components/ds/TabsMini';
import { Pill, type PillVariant } from '../components/ds/Pill';
import { ListItem } from '../components/ds/ListItem';
import { EntityAvatar } from '../../components/ds/EntityAvatar';

const QuickAddTruieForm = lazy(() => import('../../components/forms/QuickAddTruieForm'));
const QuickAddVerratForm = lazy(() => import('../../components/forms/QuickAddVerratForm'));
const QuickAddBandeForm = lazy(() => import('../../components/forms/QuickAddBandeForm'));
const QuickAddPorceletForm = lazy(() => import('../../components/forms/QuickAddPorceletForm'));
const QuickAddLogeForm = lazy(() => import('../../components/forms/QuickAddLogeForm'));

type AnimalTab = 'truies' | 'verrats' | 'porcelets' | 'bandes' | 'loges';
type AnimalFilter = 'all' | 'pleines' | 'maternite' | 'vides';

interface TruieStub {
  id: string;
  status: string;
  statusLabel: string;
  pillVariant: PillVariant;
}

const STUBS_TRUIES: TruieStub[] = [
  { id: 'T-001', status: 'En attente saillie', statusLabel: 'Vide', pillVariant: 'warning' },
  { id: 'T-002', status: 'Gestation J42', statusLabel: 'Pleine', pillVariant: 'success' },
  { id: 'T-003', status: 'Allaitante J12', statusLabel: 'Maternité', pillVariant: 'warm' },
  { id: 'T-018', status: 'Mise-bas imminente', statusLabel: 'Urgent', pillVariant: 'danger' },
  { id: 'T-024', status: 'Sevrage J+2', statusLabel: 'À sevrer', pillVariant: 'info' },
];

export const AnimalsV70: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AnimalTab>('truies');
  const [filter, setFilter] = useState<AnimalFilter>('all');
  const [addOpen, setAddOpen] = useState(false);

  const fabLabel: Record<AnimalTab, string> = {
    truies: 'Ajouter une truie',
    verrats: 'Ajouter un verrat',
    porcelets: 'Ajouter un porcelet',
    bandes: 'Ajouter une bande',
    loges: 'Ajouter une loge',
  };

  return (
    <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Élevage · 145 animaux"
        title="Mes animaux"
        subtitle="Truies, verrats, porcelets, bandes, loges"
      />

      <TabsMini
        value={tab}
        onChange={(v) => setTab(v as AnimalTab)}
        options={[
          { value: 'truies', label: 'Truies' },
          { value: 'verrats', label: 'Verrats' },
          { value: 'porcelets', label: 'Porcelets' },
          { value: 'bandes', label: 'Bandes' },
          { value: 'loges', label: 'Loges' },
        ]}
      />

      <Card>
        <div style={{ padding: 4 }}>
          <input
            type="search"
            placeholder="🔍 Rechercher T-001..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: 12,
              background: 'transparent',
              fontFamily: 'inherit',
            }}
            aria-label="Rechercher un animal"
          />
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-pressed={filter === 'all'}
        >
          <Pill variant={filter === 'all' ? 'primary' : 'ghost'}>Toutes (50)</Pill>
        </button>
        <button
          type="button"
          onClick={() => setFilter('pleines')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-pressed={filter === 'pleines'}
        >
          <Pill variant={filter === 'pleines' ? 'primary' : 'ghost'}>Pleines (28)</Pill>
        </button>
        <button
          type="button"
          onClick={() => setFilter('maternite')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-pressed={filter === 'maternite'}
        >
          <Pill variant={filter === 'maternite' ? 'primary' : 'ghost'}>Maternité (11)</Pill>
        </button>
        <button
          type="button"
          onClick={() => setFilter('vides')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-pressed={filter === 'vides'}
        >
          <Pill variant={filter === 'vides' ? 'primary' : 'ghost'}>Vides (6)</Pill>
        </button>
      </div>

      <Section label="50 truies">
        {STUBS_TRUIES.map((t) => (
          <ListItem
            key={t.id}
            avatar={<EntityAvatar species="truie" size="md" shortCode={t.id} />}
            title={t.id}
            subtitle={t.status}
            trailing={
              <>
                <Pill variant={t.pillVariant}>{t.statusLabel}</Pill>
                <span className="list-arrow">›</span>
              </>
            }
            onClick={() => navigate(`/troupeau/truies/${t.id}`)}
          />
        ))}
      </Section>

      <button
        type="button"
        className="fab"
        aria-label={fabLabel[tab]}
        onClick={() => setAddOpen(true)}
        style={{
          background: 'var(--pt-primary)',
          border: 'none',
          color: 'white',
          fontSize: 28,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        +
      </button>

      <Suspense fallback={null}>
        {tab === 'truies' && <QuickAddTruieForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
        {tab === 'verrats' && <QuickAddVerratForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
        {tab === 'bandes' && <QuickAddBandeForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
        {tab === 'porcelets' && <QuickAddPorceletForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
        {tab === 'loges' && <QuickAddLogeForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
      </Suspense>
    </div>
  );
};
