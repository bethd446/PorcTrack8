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
import React, { useState, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Home } from 'lucide-react';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { TabsMini } from '../components/ds/TabsMini';
import { Pill, type PillVariant } from '../components/ds/Pill';
import { ListItem } from '../components/ds/ListItem';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import { PigSilhouette } from '../components/v70/icons/PigSilhouette';
import { useFarm } from '../../context/FarmContext';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';

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

const TAB_DATA: Record<AnimalTab, { stubs: AnimalStub[]; species: 'truie' | 'verrat' | 'porcelet' | 'bande'; sectionLabel: string; routePrefix: string; icon: React.ReactNode }> = {
  truies: { stubs: STUBS_TRUIES, species: 'truie', sectionLabel: '50 truies', routePrefix: '/troupeau/truies/', icon: <PigSilhouette size={18} /> },
  verrats: { stubs: STUBS_VERRATS, species: 'verrat', sectionLabel: '3 verrats', routePrefix: '/troupeau/verrats/', icon: <PigSilhouette size={18} /> },
  porcelets: { stubs: STUBS_PORCELETS, species: 'porcelet', sectionLabel: '92 porcelets', routePrefix: '/troupeau/bandes/', icon: <PigSilhouette size={16} /> },
  bandes: { stubs: STUBS_BANDES, species: 'bande', sectionLabel: '6 bandes actives', routePrefix: '/troupeau/bandes/', icon: <Boxes size={18} /> },
  loges: { stubs: STUBS_LOGES, species: 'bande', sectionLabel: 'Loges', routePrefix: '/troupeau/loges/', icon: <Home size={18} /> },
};

export const AnimalsV70: React.FC = () => {
  const navigate = useNavigate();
  const { bandes, truies, verrats } = useFarm();
  const [tab, setTab] = useState<AnimalTab>('truies');
  const [filter, setFilter] = useState<AnimalFilter>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  // V71.1 — counts live (étaient hardcodés 50/28/11/6/92/24)
  const counts = useMemo(() => {
    const truiesPleines = truies.filter(t => /pleine|gestante|gestation/i.test(t.statut ?? '')).length;
    const truiesMater = truies.filter(t => /maternit[eé]|allaitante|allaitement/i.test(t.statut ?? '')).length;
    const truiesVides = truies.filter(t => /attente saillie|vide|sevr[eé]e/i.test(t.statut ?? '')).length;
    const porcelets = bandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0);
    return {
      truies: truies.length,
      truiesPleines,
      truiesMater,
      truiesVides,
      verrats: verrats.length,
      porcelets,
      bandes: bandes.length,
      totalAnimaux: truies.length + verrats.length + porcelets,
    };
  }, [truies, verrats, bandes]);

  // Données réelles via FarmContext quand dispo, sinon stubs cosmétiques V70
  const realStubs = useMemo<Record<AnimalTab, AnimalStub[] | null>>(() => ({
    truies: truies?.length
      ? truies.slice(0, 8).map(t => {
          const s = (t.statut ?? '').toLowerCase();
          const isPleine = /pleine|gestante|gestation/.test(s);
          const isMater = /maternité|maternite|allaitante|allaitement/.test(s);
          const isVide = /attente saillie|vide|sevrée|sevree/.test(s);
          return {
            id: t.displayId ?? t.id,
            status: t.statut ?? 'Truie active',
            statusLabel: isPleine ? 'Pleine' : isMater ? 'Maternité' : isVide ? 'Vide' : (t.statut ?? 'Active'),
            pillVariant: (isPleine ? 'success' : isMater ? 'warm' : isVide ? 'warning' : 'info') as PillVariant,
          };
        })
      : null,
    verrats: verrats?.length
      ? verrats.slice(0, 8).map(v => ({
          id: v.displayId ?? v.id,
          status: v.statut ?? 'Verrat',
          statusLabel: v.statut === 'Actif' ? 'Actif' : 'Inactif',
          pillVariant: (v.statut === 'Actif' ? 'success' : 'warning') as PillVariant,
        }))
      : null,
    bandes: bandes?.length
      ? bandes.slice(0, 8).map(b => ({
          // ID utilisé pour l'affichage + nav : on prend l'UUID réel
          id: b.id,
          status: `${b.truie ? `Mère ${b.truie} · ` : ''}${b.dateMB ? `MB ${b.dateMB}` : 'En cours'}${b.nv ? ` · ${b.nv} NV` : ''}`,
          statusLabel: b.statut ?? 'Active',
          pillVariant: 'success' as PillVariant,
        }))
      : null,
    porcelets: null, // pas de table porcelets dédiée pour le moment
    loges: null,
  }), [bandes, truies, verrats]);

  const fabLabel: Record<AnimalTab, string> = {
    truies: 'Ajouter une truie',
    verrats: 'Ajouter un verrat',
    porcelets: 'Ajouter un porcelet',
    bandes: 'Ajouter une bande',
    loges: 'Ajouter une loge',
  };

  // V71.1 — section label dynamique depuis counts réels
  const sectionLabel: Record<AnimalTab, string> = {
    truies: `${counts.truies} truies`,
    verrats: `${counts.verrats} verrats`,
    porcelets: `${counts.porcelets} porcelets`,
    bandes: `${counts.bandes} bandes actives`,
    loges: TAB_DATA.loges.sectionLabel, // pas de count loges via FarmContext
  };

  // V71.1 — list filtré par search + filter (truies seulement)
  // V74 — pour bandes/loges, on ne fallback PLUS sur les stubs hardcodés :
  // si la donnée réelle est vide → empty state V73 affiché (au lieu de
  // 6 fausses bandes / 5 fausses loges). Truies/verrats/porcelets gardent
  // les stubs cosmétiques V70 tant que la donnée FarmContext est absente.
  const baseList = (tab === 'bandes' || tab === 'loges')
    ? (realStubs[tab] ?? [])
    : (realStubs[tab] ?? TAB_DATA[tab].stubs);
  const filteredList = useMemo(() => {
    let list = baseList;
    if (tab === 'truies' && filter !== 'all') {
      list = list.filter(it => {
        const s = (it.statusLabel ?? '').toLowerCase();
        if (filter === 'pleines') return /pleine/i.test(s);
        if (filter === 'maternite') return /maternit/i.test(s);
        if (filter === 'vides') return /vide/i.test(s);
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        it.id.toLowerCase().includes(q) ||
        (it.status ?? '').toLowerCase().includes(q) ||
        (it.statusLabel ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [baseList, filter, search, tab]);

  return (
    <div className="phone-content" style={{ padding: '24px 24px 168px', maxWidth: 600, margin: '0 auto' }}>
      <div
        style={{
          position: 'relative',
          height: 160,
          marginBottom: 16,
          borderRadius: 16,
          overflow: 'hidden',
          background: "url('/images/ambiance-territoire.webp') center/cover no-repeat",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(6,78,59,0.55) 100%)',
          }}
        />
        <span
          className="ft-heading"
          style={{
            position: 'absolute',
            left: 16,
            bottom: 12,
            color: 'white',
            fontSize: 14,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontWeight: 700,
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          Vue d'ensemble
        </span>
      </div>

      <MariusGreeting pageContext="élevage" />

      <PageHeader
        eyebrow={`Élevage · ${counts.totalAnimaux} animaux`}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`🔍  Rechercher ${baseList[0]?.id ?? '...'}`}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              background: 'transparent',
              fontFamily: 'inherit',
              padding: '8px 10px',
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
            <Pill variant={filter === 'all' ? 'primary' : 'ghost'}>{`Toutes (${counts.truies})`}</Pill>
          </button>
          <button
            type="button"
            onClick={() => setFilter('pleines')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            aria-pressed={filter === 'pleines'}
          >
            <Pill variant={filter === 'pleines' ? 'primary' : 'ghost'}>{`Pleines (${counts.truiesPleines})`}</Pill>
          </button>
          <button
            type="button"
            onClick={() => setFilter('maternite')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            aria-pressed={filter === 'maternite'}
          >
            <Pill variant={filter === 'maternite' ? 'primary' : 'ghost'}>{`Maternité (${counts.truiesMater})`}</Pill>
          </button>
          <button
            type="button"
            onClick={() => setFilter('vides')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            aria-pressed={filter === 'vides'}
          >
            <Pill variant={filter === 'vides' ? 'primary' : 'ghost'}>{`Vides (${counts.truiesVides})`}</Pill>
          </button>
        </div>
      )}

      <Section label={sectionLabel[tab]}>
        {filteredList.length === 0 ? (
          search.trim() ? (
            <div style={{ padding: 18, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
              {`Aucun résultat pour « ${search} »`}
            </div>
          ) : (() => {
            // V74 — empty state V73 contextualisé : bandes / loges / défaut
            const emptyCopy = tab === 'bandes'
              ? {
                  alt: 'Couloir bâtiment porcin calme, loge libre prête à accueillir une bande',
                  title: 'Aucune bande active',
                  desc: 'Crée ta première bande pour démarrer le suivi.',
                }
              : tab === 'loges'
              ? {
                  alt: 'Loge propre vide, paille fraîche',
                  title: 'Aucune loge configurée',
                  desc: 'Ajoute tes loges pour activer le suivi par bande.',
                }
              : {
                  alt: 'Loge propre vide, paille fraîche',
                  title: 'Aucun animal',
                  desc: 'Loge prête. Ajoute ton premier animal.',
                };
            return (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  aspectRatio: '4 / 3',
                  margin: '12px 0',
                  background: '#f5efe2',
                }}
                data-testid={`empty-state-${tab}`}
              >
                <picture>
                  <source srcSet="/images/v73/empty-states/aucun-animal.webp" type="image/webp" />
                  <img
                    src="/images/v73/empty-states/aucun-animal.jpg"
                    alt={emptyCopy.alt}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </picture>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.62) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-end',
                    padding: '20px 22px',
                    gap: 12,
                  }}
                >
                  <div style={{ color: '#fff' }}>
                    <div
                      style={{
                        fontFamily: 'var(--pt-font-display)',
                        fontWeight: 700,
                        fontSize: 18,
                        lineHeight: 1.1,
                        marginBottom: 4,
                      }}
                    >
                      {emptyCopy.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>
                      {emptyCopy.desc}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    aria-label={fabLabel[tab]}
                    style={{
                      alignSelf: 'flex-start',
                      background: '#fff',
                      color: 'var(--pt-ink)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontFamily: 'var(--pt-font-display)',
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    }}
                  >
                    {fabLabel[tab]}
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          filteredList.map((it) => (
            <ListItem
              key={it.id}
              avatar={<EntityAvatar species={TAB_DATA[tab].species} size="md" shortCode={it.id.slice(0, 8)} />}
              title={it.id.length > 16 ? `Bande ${it.id.slice(0, 8)}…` : it.id}
              subtitle={it.status}
              trailing={
                <>
                  <Pill variant={it.pillVariant}>{it.statusLabel}</Pill>
                  <span className="list-arrow">›</span>
                </>
              }
              onClick={() => navigate(`${TAB_DATA[tab].routePrefix}${it.id}`)}
            />
          ))
        )}
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
