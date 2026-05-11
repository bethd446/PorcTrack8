/**
 * V70 — AnimalsV70 (page /troupeau, archétype Hub)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html lignes 1082-1176
 *
 * Décision A Christophe :
 * - Tab nav label : "Élevage" (BottomNav Phase 2 OK)
 * - H1 page : "Élevage" (alignement strict décision A — V75-c naming-coherence)
 *
 * Phase 3B : page Hub catégoriel — TabsMini 5 catégories, search bar,
 * filter pills, liste truies stubs. FAB ajout (Phase F branchera contexte).
 */
import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Boxes, Home, Eye, Edit3, Scale, LogOut, Search } from 'lucide-react';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { TabsMini } from '../components/ds/TabsMini';
import { Pill, type PillVariant } from '../components/ds/Pill';
import { ListItem } from '../components/ds/ListItem';
import { PorceletGroup } from '../components/PorceletGroup';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import {
  ToastProvider as V70ToastProvider,
  useToast as useV70Toast,
} from '../components/v70/Toast';
import { Dialog as V70Dialog } from '../components/v70/Dialog';
import { LongPressSheet as V70LongPressSheet } from '../components/v70/LongPressSheet';
import { useLongPress } from '../hooks/useLongPress';
import { useFarm, useMeta } from '../../context/FarmContext';
import { formatBandeName, isReformed, formatDateFr } from '../lib';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';
import ListingSkeleton from '../../components/design/ListingSkeleton';
import { useListingLoadingGuard } from '../../hooks/useListingLoadingGuard';

const QuickAddTruieForm = lazy(() => import('../../components/forms/QuickAddTruieForm'));
const QuickAddVerratForm = lazy(() => import('../../components/forms/QuickAddVerratForm'));
const QuickAddBandeForm = lazy(() => import('../../components/forms/QuickAddBandeForm'));
const QuickAddPorceletForm = lazy(() => import('../../components/forms/QuickAddPorceletForm'));
const QuickAddLogeForm = lazy(() => import('../../components/forms/QuickAddLogeForm'));
const LogesViewV77 = lazy(() => import('../../features/troupeau/LogesViewV77'));

type AnimalTab = 'truies' | 'verrats' | 'porcelets' | 'bandes' | 'loges';
type AnimalFilter = 'all' | 'pleines' | 'maternite' | 'vides' | 'a-vendre';

const VALID_ANIMAL_TABS: AnimalTab[] = ['truies', 'verrats', 'porcelets', 'bandes', 'loges'];
const isAnimalTab = (v: string | null): v is AnimalTab =>
  v !== null && (VALID_ANIMAL_TABS as string[]).includes(v);
// V75-n F-17 / F-23 — tri listings
type TruiesSort = 'code' | 'parite' | 'derniereMB' | 'statut';
type BandesSort = 'dateMB' | 'effectif' | 'statut';

interface AnimalStub {
  id: string;                  // identifiant utilisé pour la navigation (UUID OK)
  displayName?: string;        // nom affiché à l'utilisateur (optionnel — fallback sur id)
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

const TAB_DATA: Record<AnimalTab, { stubs: AnimalStub[]; species: 'truie' | 'verrat' | 'porcelet' | 'bande'; sectionLabel: string; routePrefix: string }> = {
  truies: { stubs: STUBS_TRUIES, species: 'truie', sectionLabel: '50 truies', routePrefix: '/troupeau/truies/' },
  verrats: { stubs: STUBS_VERRATS, species: 'verrat', sectionLabel: '3 verrats', routePrefix: '/troupeau/verrats/' },
  porcelets: { stubs: STUBS_PORCELETS, species: 'porcelet', sectionLabel: '92 porcelets', routePrefix: '/troupeau/bandes/' },
  bandes: { stubs: STUBS_BANDES, species: 'bande', sectionLabel: '6 bandes actives', routePrefix: '/troupeau/bandes/' },
  loges: { stubs: STUBS_LOGES, species: 'bande', sectionLabel: 'Loges', routePrefix: '/troupeau/loges/' },
};

export const AnimalsV70: React.FC = () => (
  <V70ToastProvider>
    <AnimalsV70Inner />
  </V70ToastProvider>
);

const AnimalsV70Inner: React.FC = () => {
  const navigate = useNavigate();
  const v70Toast = useV70Toast();
  const { bandes, truies, verrats } = useFarm();
  const { loading: farmLoading } = useMeta();
  // Pour bandes/loges, l'empty state est V73 (image + CTA), donc on guard.
  // Truies/verrats/porcelets utilisent les stubs cosmétiques V70 → pas de
  // faux empty state à craindre, le user voit toujours quelque chose.
  const tabBandesEmptyForLoading = useListingLoadingGuard(farmLoading, bandes.length);

  // V75-u P1 #5 — Sync URL ?view= ↔ tab pour deep-links (ex: /troupeau?view=verrats
  // depuis breadcrumb fiche détail). Sans cette synchro, naviguer directement vers
  // /troupeau?view=verrats laissait l'onglet Truies sélectionné.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: AnimalTab = isAnimalTab(searchParams.get('view'))
    ? (searchParams.get('view') as AnimalTab)
    : 'truies';
  const [tab, setTab] = useState<AnimalTab>(initialTab);

  // Sync state ← URL : nécessaire quand l'utilisateur arrive via un deep-link
  // (QR code, copier-coller, navigate replace) ou via back navigation depuis
  // une fiche détail dont le breadcrumb pointe vers /troupeau?view=...
  useEffect(() => {
    const urlTab = searchParams.get('view');
    if (isAnimalTab(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    setTab(v as AnimalTab);
    const next = new URLSearchParams(searchParams);
    next.set('view', v);
    setSearchParams(next, { replace: true });
  };

  const [filter, setFilter] = useState<AnimalFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedBandes, setExpandedBandes] = useState<Set<string>>(new Set());
  // V75-n F-17 / F-23 — tri listings (truies + bandes)
  const [truiesSort, setTruiesSort] = useState<TruiesSort>('code');
  const [bandesSort, setBandesSort] = useState<BandesSort>('dateMB');

  // V75-h : ouvrir le 1er groupe par défaut quand les bandes arrivent (data lazy via FarmContext).
  useEffect(() => {
    if (bandes.length > 0 && expandedBandes.size === 0) {
      setExpandedBandes(new Set([bandes[0].id]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandes.length]);

  const [addOpen, setAddOpen] = useState(false);

  // V77 P1-2 — pilote LongPressSheet + Dialog + Toast (Sprint 8 patterns)
  // Long-press 500ms sur une truie ouvre un sheet d'actions rapides.
  // Le clic standard reste navigate vers la fiche détail (pas de breaking change).
  const [lpTruie, setLpTruie] = useState<AnimalStub | null>(null);
  const [confirmReformTruie, setConfirmReformTruie] = useState<AnimalStub | null>(null);

  // V71.1 — counts live (étaient hardcodés 50/28/11/6/92/24)
  const counts = useMemo(() => {
    const truiesPleines = truies.filter(t => /pleine|gestante|gestation/i.test(t.statut ?? '')).length;
    const truiesMater = truies.filter(t => /maternit[eé]|allaitante|allaitement/i.test(t.statut ?? '')).length;
    const truiesVides = truies.filter(t => /attente saillie|vide|sevr[eé]e/i.test(t.statut ?? '')).length;
    const truiesAVendre = truies.filter(isReformed).length;
    const porcelets = bandes.reduce((acc, b) => {
      const active = (b.porcelets ?? []).filter(
        p => p.statut === 'VIVANT' || p.statut === 'MALADE' || p.statut === 'QUARANTAINE',
      ).length;
      return acc + active;
    }, 0);
    return {
      truies: truies.length,
      truiesPleines,
      truiesMater,
      truiesVides,
      truiesAVendre,
      verrats: verrats.length,
      porcelets,
      bandes: bandes.length,
      totalAnimaux: truies.length + verrats.length + porcelets,
    };
  }, [truies, verrats, bandes]);

  // Données réelles via FarmContext quand dispo, sinon stubs cosmétiques V70.
  // V75-n F-19 : retrait du slice(0, 8) (truies / verrats / bandes) — tout afficher.
  // V75-n F-17 / F-23 : tri appliqué sur les données originales (Truie / BandePorcelets)
  // avant mapping, pour avoir accès aux champs métier (nbPortees, dateMBPrevue, dateMB, nv).
  const realStubs = useMemo<Record<AnimalTab, AnimalStub[] | null>>(() => {
    // --- Tri truies ---
    const truiesSorted = truies?.length ? [...truies] : [];
    if (truiesSorted.length) {
      if (truiesSort === 'parite') {
        truiesSorted.sort((a, b) => (b.nbPortees ?? 0) - (a.nbPortees ?? 0));
      } else if (truiesSort === 'derniereMB') {
        // Plus récente d'abord (dateMBPrevue absente → fin de liste)
        truiesSorted.sort((a, b) => {
          const da = a.dateMBPrevue ? new Date(a.dateMBPrevue).getTime() : -Infinity;
          const db = b.dateMBPrevue ? new Date(b.dateMBPrevue).getTime() : -Infinity;
          return db - da;
        });
      } else if (truiesSort === 'statut') {
        truiesSorted.sort((a, b) => (a.statut ?? '').localeCompare(b.statut ?? ''));
      } else {
        // 'code' : ordre A-Z par displayId
        truiesSorted.sort((a, b) => (a.displayId ?? a.id).localeCompare(b.displayId ?? b.id));
      }
    }

    // --- Tri bandes ---
    const bandesSorted = bandes?.length ? [...bandes] : [];
    if (bandesSorted.length) {
      if (bandesSort === 'effectif') {
        bandesSorted.sort((a, b) => (b.nv ?? 0) - (a.nv ?? 0));
      } else if (bandesSort === 'statut') {
        bandesSorted.sort((a, b) => (a.statut ?? '').localeCompare(b.statut ?? ''));
      } else {
        // 'dateMB' : récente d'abord (dateMB absente → fin de liste)
        bandesSorted.sort((a, b) => {
          const da = a.dateMB ? new Date(a.dateMB).getTime() : -Infinity;
          const db = b.dateMB ? new Date(b.dateMB).getTime() : -Infinity;
          return db - da;
        });
      }
    }

    return {
      truies: truiesSorted.length
        ? truiesSorted.map(t => {
            const s = (t.statut ?? '').toLowerCase();
            const isPleine = /pleine|gestante|gestation/.test(s);
            const isMater = /maternité|maternite|allaitante|allaitement/.test(s);
            const isVide = /attente saillie|vide|sevrée|sevree/.test(s);
            const isAVendre = /réforme|reforme/.test(s);
            return {
              id: t.displayId ?? t.id,
              status: t.statut ?? 'Truie active',
              statusLabel: isPleine ? 'Pleine' : isMater ? 'Maternité' : isVide ? 'Vide' : isAVendre ? 'À vendre' : (t.statut ?? 'Active'),
              pillVariant: (isPleine ? 'success' : isMater ? 'warm' : isVide ? 'warning' : isAVendre ? 'ghost' : 'info') as PillVariant,
            };
          })
        : null,
      verrats: verrats?.length
        ? verrats.map(v => ({
            id: v.displayId ?? v.id,
            status: v.statut ?? 'Verrat',
            statusLabel: v.statut === 'Actif' ? 'Actif' : 'Inactif',
            pillVariant: (v.statut === 'Actif' ? 'success' : 'warning') as PillVariant,
          }))
        : null,
      bandes: bandesSorted.length
        ? bandesSorted.map(b => ({
            id: b.id,
            displayName: formatBandeName({
              id: b.id,
              idPortee: b.idPortee,
              truieMere: b.truie,
              dateMB: b.dateMB,
            }),
            // V75-n F-22 : NV → "nés vivants" (libellé explicite)
            status: `${b.truie ? `Mère ${b.truie} · ` : ''}${b.dateMB ? `MB ${formatDateFr(b.dateMB)}` : 'En cours'}${b.nv ? ` · ${b.nv} nés vivants` : ''}`,
            statusLabel: b.statut ?? 'Active',
            pillVariant: 'success' as PillVariant,
          }))
        : null,
      porcelets: null, // pas de table porcelets dédiée pour le moment
      loges: null,
    };
  }, [bandes, truies, verrats, truiesSort, bandesSort]);

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
        if (filter === 'a-vendre') return /à vendre|a vendre|réforme|reforme/i.test(s);
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      // V75-v P2#2 : normalise les zéros leading après tiret pour permettre
      // "T-1" → match T-001/T-010/.../T-019. Sans ça, includes("t-1") sur
      // "t-001" renvoie false (pas de "t-1" littéral dans la string).
      const stripPad = (s: string) => s.toLowerCase().replace(/-0+/g, '-');
      const qNorm = stripPad(q);
      list = list.filter(it => {
        const idNorm = stripPad(it.id);
        return (
          idNorm.includes(qNorm) ||
          it.id.toLowerCase().includes(q) ||
          (it.status ?? '').toLowerCase().includes(q) ||
          (it.statusLabel ?? '').toLowerCase().includes(q)
        );
      });
    }
    // V75-n F-19 : retrait du slice(0, 8). Tout afficher (perf OK pour fermes
    // 50-200 truies cibles. Pour > 200, ajouter pagination dans un sprint séparé).
    return list;
  }, [baseList, filter, search, tab]);

  // V77 — sub dynamique avec compteurs live par tab actif.
  // Décision A Christophe (V75-c) : H1 reste "Élevage" — alignement nav=h1.
  const tabSub: Record<AnimalTab, string> = {
    truies: `${counts.truies} truies · ${counts.truiesPleines} pleines · ${counts.truiesMater} en maternité`,
    verrats: `${counts.verrats} verrats actifs`,
    porcelets: `${counts.porcelets} porcelets en croissance`,
    bandes: `${counts.bandes} bandes actives`,
    loges: 'Suivi par bande · occupation par loge',
  };

  return (
    <div className="pt-screen phone-content" style={{ padding: '24px 24px 168px', maxWidth: 600, margin: '0 auto' }}>
      <MariusGreeting pageContext="élevage" />

      <header className="ph ph--primary">
        <div className="ph__row">
          <div>
            <div className="ph__eyebrow">
              {farmLoading && truies.length === 0 && bandes.length === 0
                ? 'Cheptel'
                : `Cheptel · ${counts.totalAnimaux} animaux`}
            </div>
            <h1 className="ph__h1">Élevage</h1>
            <p className="ph__sub">{tabSub[tab]}</p>
          </div>
        </div>
      </header>

      <TabsMini
        value={tab}
        onChange={handleTabChange}
        options={[
          { value: 'truies', label: 'Truies' },
          { value: 'verrats', label: 'Verrats' },
          { value: 'porcelets', label: 'Porcelets' },
          { value: 'bandes', label: 'Bandes' },
          { value: 'loges', label: 'Loges' },
        ]}
      />

      {tab !== 'loges' && (
        <Card>
          <div style={{ padding: '4px 4px 4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={16} aria-hidden="true" style={{ color: 'var(--pt-muted)', flexShrink: 0 }} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Rechercher ${baseList[0]?.id ?? '...'}`}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                background: 'transparent',
                fontFamily: 'inherit',
                padding: '8px 10px 8px 0',
              }}
              aria-label="Rechercher un animal"
            />
          </div>
        </Card>
      )}

      {/* Filtres pertinents pour Truies uniquement (pleines/maternité/vides) */}
      {tab === 'truies' && (
        <div className="pills" style={{ marginBottom: 14, marginTop: 14 }}>
          <button
            type="button"
            className={`pill${filter === 'all' ? ' is-active' : ''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            {`Toutes (${counts.truies})`}
          </button>
          <button
            type="button"
            className={`pill${filter === 'pleines' ? ' is-active' : ''}`}
            onClick={() => setFilter('pleines')}
            aria-pressed={filter === 'pleines'}
          >
            {`Pleines (${counts.truiesPleines})`}
          </button>
          <button
            type="button"
            className={`pill${filter === 'maternite' ? ' is-active' : ''}`}
            onClick={() => setFilter('maternite')}
            aria-pressed={filter === 'maternite'}
          >
            {`Maternité (${counts.truiesMater})`}
          </button>
          <button
            type="button"
            className={`pill${filter === 'vides' ? ' is-active' : ''}`}
            onClick={() => setFilter('vides')}
            aria-pressed={filter === 'vides'}
          >
            {`Vides (${counts.truiesVides})`}
          </button>
          <button
            type="button"
            className={`pill${filter === 'a-vendre' ? ' is-active' : ''}`}
            onClick={() => setFilter('a-vendre')}
            aria-pressed={filter === 'a-vendre'}
          >
            {`À vendre (${counts.truiesAVendre})`}
          </button>
          {/* V75-n F-17 — tri truies */}
          <select
            value={truiesSort}
            onChange={(e) => setTruiesSort(e.target.value as TruiesSort)}
            aria-label="Trier les truies"
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: 999,
              fontFamily: 'var(--pt-font-body)',
              fontSize: 12,
              border: '1px solid var(--pt-line)',
              background: 'var(--pt-bg)',
              color: 'var(--pt-ink)',
              cursor: 'pointer',
            }}
          >
            <option value="code">Code A-Z</option>
            <option value="parite">Parité ↓</option>
            <option value="derniereMB">Dernière MB ↓</option>
            <option value="statut">Statut</option>
          </select>
        </div>
      )}

      {/* V75-n F-23 — tri bandes */}
      {tab === 'bandes' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, marginTop: 14, justifyContent: 'flex-end' }}>
          <select
            value={bandesSort}
            onChange={(e) => setBandesSort(e.target.value as BandesSort)}
            aria-label="Trier les bandes"
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontFamily: 'var(--pt-font-body)',
              fontSize: 12,
              border: '1px solid var(--pt-line)',
              background: 'var(--pt-bg)',
              color: 'var(--pt-ink)',
              cursor: 'pointer',
            }}
          >
            <option value="dateMB">Date MB ↓</option>
            <option value="effectif">Effectif (NV) ↓</option>
            <option value="statut">Statut</option>
          </select>
        </div>
      )}

      {tab === 'loges' ? (
        <Suspense fallback={<ListingSkeleton count={3} />}>
          <LogesViewV77 onCreateClick={() => setAddOpen(true)} />
        </Suspense>
      ) : (
      <Section label={sectionLabel[tab]}>
        {tab === 'porcelets' ? (
          (() => {
            const q = search.trim().toLowerCase();
            const visibleBandes = q
              ? bandes.filter(b => {
                  const bandeNameLc = (
                    b.idPortee || `${b.truie ?? ''} ${b.dateMB ?? ''}`
                  ).toLowerCase();
                  if (bandeNameLc.includes(q)) return true;
                  return (b.porcelets ?? []).some(p => p.boucle.toLowerCase().includes(q));
                })
              : bandes;

            if (visibleBandes.length === 0) {
              return (
                <div style={{ padding: 18, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  {q ? `Aucun résultat pour « ${search} »` : 'Aucune bande active'}
                </div>
              );
            }

            return visibleBandes.map(b => {
              const matchesByBoucle = q
                ? (b.porcelets ?? []).some(p => p.boucle.toLowerCase().includes(q))
                : false;
              const isExpanded = expandedBandes.has(b.id) || matchesByBoucle;
              return (
                <PorceletGroup
                  key={b.id}
                  bande={b}
                  isExpanded={isExpanded}
                  onToggle={() => {
                    setExpandedBandes(prev => {
                      const next = new Set(prev);
                      if (next.has(b.id)) next.delete(b.id);
                      else next.add(b.id);
                      return next;
                    });
                  }}
                  onNavigateToBande={(id) => { navigate(`/troupeau/bandes/${id}`); }}
                />
              );
            });
          })()
        ) : filteredList.length === 0 ? (
          search.trim() ? (
            <div style={{ padding: 18, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
              {`Aucun résultat pour « ${search} »`}
            </div>
          ) : (tab === 'bandes' || tab === 'loges') && tabBandesEmptyForLoading ? (
            <ListingSkeleton count={3} />
          ) : (() => {
            // V76 — empty state DNA Terrain Vivant : icône Lucide grand format
            // + titre Big Shoulders + sub muted + CTA primary unique. Pattern
            // .empty (cf v70-global.css), conforme mockup 3c F.2.
            // V78 — entités (truies/verrats/porcelets) représentées par
            // EntityAvatar (audit A14 — pas d'icône d'entité custom).
            const emptyCopy: { iconNode: React.ReactNode; title: string; desc: string } = tab === 'bandes'
              ? {
                  iconNode: <Boxes size={38} strokeWidth={2} color="var(--pt-bande-fg)" aria-hidden />,
                  title: 'Aucune bande active',
                  desc: 'Crée ta première bande pour suivre les naissances.',
                }
              : tab === 'loges'
              ? {
                  iconNode: <Home size={38} strokeWidth={2} color="var(--pt-subtle)" aria-hidden />,
                  title: 'Aucune loge configurée',
                  desc: 'Ajoute tes loges pour activer le suivi par bande.',
                }
              : tab === 'truies'
              ? {
                  iconNode: <EntityAvatar species="truie" size="lg" />,
                  title: 'Aucune truie',
                  desc: 'Ajoute ta première truie pour démarrer le suivi.',
                }
              : tab === 'verrats'
              ? {
                  iconNode: <EntityAvatar species="verrat" size="lg" />,
                  title: 'Aucun verrat',
                  desc: 'Ajoute un verrat pour activer les saillies.',
                }
              : {
                  iconNode: <EntityAvatar species="porcelet" size="lg" />,
                  title: 'Aucun porcelet',
                  desc: 'Les porcelets apparaîtront automatiquement après mise-bas.',
                };
            const { iconNode, title, desc } = emptyCopy;
            return (
              <div className="empty-state empty" data-testid={`empty-state-${tab}`}>
                {iconNode}
                <div
                  style={{
                    fontFamily: 'var(--pt-font-display)',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    fontSize: 22,
                    letterSpacing: '-0.005em',
                    color: 'var(--pt-ink)',
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--pt-muted)', maxWidth: '32ch' }}>
                  {desc}
                </div>
                {tab !== 'porcelets' && (
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    aria-label={fabLabel[tab]}
                    style={{
                      marginTop: 6,
                      background: 'var(--pt-primary)',
                      color: 'var(--pt-warm)',
                      border: 'none',
                      borderRadius: 12,
                      padding: '11px 18px',
                      fontFamily: 'var(--pt-font-mono)',
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {fabLabel[tab]}
                  </button>
                )}
              </div>
            );
          })()
        ) : (
          filteredList.map((it) => (
            <TruieListRow
              key={it.id}
              it={it}
              tab={tab}
              onNavigate={() => navigate(`${TAB_DATA[tab].routePrefix}${it.id}`)}
              onLongPress={tab === 'truies' ? () => setLpTruie(it) : null}
            />
          ))
        )}
      </Section>
      )}

      {(tab === 'loges' || !(filteredList.length === 0 && !search.trim())) && (
        <button
          type="button"
          className="fab"
          aria-label={fabLabel[tab]}
          onClick={() => setAddOpen(true)}
          style={{
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          +
        </button>
      )}

      <Suspense fallback={null}>
        {tab === 'truies' && <QuickAddTruieForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
        {tab === 'verrats' && <QuickAddVerratForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
        {tab === 'bandes' && <QuickAddBandeForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
        {tab === 'porcelets' && <QuickAddPorceletForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
        {tab === 'loges' && <QuickAddLogeForm isOpen={addOpen} onClose={() => setAddOpen(false)} />}
      </Suspense>

      {/* V77 P1-2 — Long-press sheet (pilote Sprint 8) */}
      <V70LongPressSheet
        isOpen={lpTruie !== null}
        onClose={() => setLpTruie(null)}
        eyebrow="Truie"
        title={lpTruie?.id ?? ''}
        actions={[
          {
            icon: Eye,
            label: 'Voir la fiche',
            onClick: () => {
              if (!lpTruie) return;
              const target = lpTruie;
              setLpTruie(null);
              navigate(`/troupeau/truies/${target.id}`);
            },
          },
          {
            icon: Scale,
            label: 'Peser',
            onClick: () => {
              setLpTruie(null);
              v70Toast.showSuccess('Pesée à venir (chantier V77 P2)');
            },
          },
          {
            icon: Edit3,
            label: 'Modifier',
            onClick: () => {
              if (!lpTruie) return;
              const target = lpTruie;
              setLpTruie(null);
              navigate(`/troupeau/truies/${target.id}?edit=1`);
            },
          },
          {
            icon: LogOut,
            label: 'Marquer sortie',
            variant: 'danger',
            onClick: () => {
              setConfirmReformTruie(lpTruie);
              setLpTruie(null);
            },
          },
        ]}
      />

      {/* V77 P1-2 — Dialog confirmation sortie (pilote Sprint 8) */}
      <V70Dialog
        isOpen={confirmReformTruie !== null}
        onDismiss={() => setConfirmReformTruie(null)}
        title="Marquer la truie à sortir ?"
        body={
          confirmReformTruie
            ? `${confirmReformTruie.id} sera marquée pour sortie. Action réversible depuis la fiche.`
            : null
        }
        cancelLabel="Annuler"
        actionLabel="Confirmer la sortie"
        actionVariant="danger"
        onAction={() => {
          const target = confirmReformTruie;
          setConfirmReformTruie(null);
          if (target) {
            v70Toast.showWarning(`${target.id} marquée à sortir (preview démo)`);
          }
        }}
      />
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// Sous-composant : ligne ListItem avec long-press optionnel.
// Extrait pour pouvoir appeler useLongPress (hooks dans la map = anti-pattern).
// ───────────────────────────────────────────────────────────────────────────
interface TruieListRowProps {
  it: AnimalStub;
  tab: AnimalTab;
  onNavigate: () => void;
  onLongPress: (() => void) | null;
}

const TruieListRow: React.FC<TruieListRowProps> = ({ it, tab, onNavigate, onLongPress }) => {
  // Trigger flag pour ne PAS naviguer juste après un long-press réussi
  // (sinon onClick re-fire à pointerUp et écrase le sheet).
  const triggeredRef = React.useRef(false);
  const lpCallback = useCallback(() => {
    triggeredRef.current = true;
    onLongPress?.();
  }, [onLongPress]);
  const longPressHandlers = useLongPress(lpCallback, 500);
  const handlers = onLongPress ? longPressHandlers : undefined;

  const handleClick = () => {
    if (triggeredRef.current) {
      triggeredRef.current = false;
      return;
    }
    onNavigate();
  };

  return (
    <ListItem
      avatar={<EntityAvatar species={TAB_DATA[tab].species} size="md" shortCode={it.id.slice(0, 8)} />}
      title={it.displayName ?? (it.id.length > 16 ? `Bande ${it.id.slice(0, 8)}…` : it.id)}
      subtitle={it.status}
      trailing={
        <>
          <Pill variant={it.pillVariant}>{it.statusLabel}</Pill>
          <span className="list-arrow">›</span>
        </>
      }
      onClick={handleClick}
      pointerHandlers={handlers}
    />
  );
};
