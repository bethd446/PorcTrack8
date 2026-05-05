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

interface AnimalStub {
  id: string;
  status: string;
  statusLabel: string;
  pillVariant: PillVariant;
}

const STUBS_TRUIES: AnimalStub[] = [
  { id: 'T-001', status: 'En attente saillie', statusLabel: 'Vide', pillVariant: 'warning' },
  { id: 'T-002', status: 'Gestation J42', statusLabel: 'Pleine', pillVariant: 'success' },
  { id: 'T-003', status: 'Allaitante J12', statusLabel: 'Maternité', pillVariant: 'warm' },
  { id: 'T-018', status: 'Mise-bas imminente', statusLabel: 'Urgent', pillVariant: 'danger' },
  { id: 'T-024', status: 'Sevrage J+2', statusLabel: 'À sevrer', pillVariant: 'info' },
];

const STUBS_VERRATS: AnimalStub[] = [
  { id: 'V-001', status: 'Actif · 3 saillies / mois', statusLabel: 'Actif', pillVariant: 'success' },
  { id: 'V-002', status: 'Actif · jeune verrat', statusLabel: 'Actif', pillVariant: 'success' },
  { id: 'V-003', status: 'À évaluer · 0 saillie 30j', statusLabel: 'Inactif', pillVariant: 'warning' },
];

const STUBS_PORCELETS: AnimalStub[] = [
  { id: 'P-MAR-01', status: 'Bande mars · 14 kg', statusLabel: 'Croissance', pillVariant: 'info' },
  { id: 'P-MAR-02', status: 'Bande mars · 13.8 kg', statusLabel: 'Croissance', pillVariant: 'info' },
  { id: 'P-FEV-01', status: 'Bande février · 28 kg', statusLabel: 'Engraiss.', pillVariant: 'warm' },
  { id: 'P-JAN-01', status: 'Bande janvier · 95 kg', statusLabel: 'Finition', pillVariant: 'success' },
];

const STUBS_BANDES: AnimalStub[] = [
  { id: 'B-MAR', status: 'Mars 2026 · 8 truies · ISSE 12.4', statusLabel: 'Active', pillVariant: 'success' },
  { id: 'B-FEV', status: 'Février 2026 · 7 truies · ISSE 11.9', statusLabel: 'Active', pillVariant: 'success' },
  { id: 'B-JAN', status: 'Janvier 2026 · 9 truies · ISSE 11.2', statusLabel: 'Active', pillVariant: 'success' },
  { id: 'B-MAI', status: 'Mai 2026 · 11 truies · J+143 sevrage', statusLabel: 'Maternité', pillVariant: 'warm' },
  { id: 'B-AVR', status: 'Avril 2026 · saillies en cours', statusLabel: 'Saillie', pillVariant: 'info' },
  { id: 'B-DEC', status: 'Décembre 2025 · sortie abattoir', statusLabel: 'Finition', pillVariant: 'warning' },
];

const STUBS_LOGES: AnimalStub[] = [
  { id: 'L-MAT-01', status: 'Maternité · 1 truie + 12 porcelets', statusLabel: 'Occupée', pillVariant: 'warm' },
  { id: 'L-MAT-02', status: 'Maternité · 1 truie + 11 porcelets', statusLabel: 'Occupée', pillVariant: 'warm' },
  { id: 'L-PS-01', status: 'Post-sevrage · 24 porcelets', statusLabel: 'Pleine', pillVariant: 'success' },
  { id: 'L-PS-02', status: 'Post-sevrage · vide', statusLabel: 'Libre', pillVariant: 'info' },
  { id: 'L-ENG-01', status: 'Engraissement · 28 cochons', statusLabel: 'Pleine', pillVariant: 'success' },
];

const TAB_DATA: Record<AnimalTab, { stubs: AnimalStub[]; species: 'truie' | 'verrat' | 'porcelet' | 'bande'; sectionLabel: string; routePrefix: string; emoji: string }> = {
  truies: { stubs: STUBS_TRUIES, species: 'truie', sectionLabel: '50 truies', routePrefix: '/troupeau/truies/', emoji: '🐖' },
  verrats: { stubs: STUBS_VERRATS, species: 'verrat', sectionLabel: '3 verrats', routePrefix: '/troupeau/verrats/', emoji: '🐗' },
  porcelets: { stubs: STUBS_PORCELETS, species: 'porcelet', sectionLabel: '92 porcelets', routePrefix: '/troupeau/bandes/', emoji: '🐷' },
  bandes: { stubs: STUBS_BANDES, species: 'bande', sectionLabel: '6 bandes actives', routePrefix: '/troupeau/bandes/', emoji: '📦' },
  loges: { stubs: STUBS_LOGES, species: 'bande', sectionLabel: '24 loges', routePrefix: '/troupeau/loges/', emoji: '🏠' },
};

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
            placeholder={`🔍 Rechercher ${TAB_DATA[tab].stubs[0]?.id ?? '...'}...`}
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

      {/* Filtres pertinents pour Truies uniquement (pleines/maternité/vides) */}
      {tab === 'truies' && (
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
      )}

      <Section label={TAB_DATA[tab].sectionLabel}>
        {TAB_DATA[tab].stubs.map((it) => (
          <ListItem
            key={it.id}
            avatar={<EntityAvatar species={TAB_DATA[tab].species} size="md" shortCode={it.id} />}
            title={it.id}
            subtitle={it.status}
            trailing={
              <>
                <Pill variant={it.pillVariant}>{it.statusLabel}</Pill>
                <span className="list-arrow">›</span>
              </>
            }
            onClick={() => navigate(`${TAB_DATA[tab].routePrefix}${it.id}`)}
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
