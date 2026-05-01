import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
} from '@ionic/react';
import {
  Heart,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  Syringe,
  Users,
} from 'lucide-react';

import { TruieIcon } from '../../components/icons';
import { Chip, SectionDivider, type ChipTone } from '../../components/agritech';
import EmptyStateShared from '../../components/design/EmptyState';
import QuickAddTruieForm from '../../components/forms/QuickAddTruieForm';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import type { Truie } from '../../types/farm';
import { normaliseStatut } from '../../lib/truieStatut';
import { kvGet, kvSet } from '../../services/kvStore';
import { useTroupeauPipeline } from '../../hooks/useTroupeauStats';

// ─── Types & Helpers ─────────────────────────────────────────────────────────

type FilterKey = 'tout' | 'pleines' | 'maternite' | 'chaleur' | 'vides' | 'reforme';

interface StatutVisu {
  label: string;
  tone: ChipTone;
  filter: FilterKey;
}

function statutVisu(statut: string | undefined): StatutVisu {
  const canon = normaliseStatut(statut);
  switch (canon) {
    case 'PLEINE':
      return { label: 'Pleine', tone: 'accent', filter: 'pleines' };
    case 'MATERNITE':
      return { label: 'Maternité', tone: 'gold', filter: 'maternite' };
    case 'CHALEUR':
      return { label: 'Chaleur', tone: 'coral', filter: 'chaleur' };
    case 'VIDE':
      return { label: 'Vide', tone: 'default', filter: 'vides' };
    case 'REFORME':
      return { label: 'Réforme', tone: 'red', filter: 'reforme' };
    case 'SURVEILLANCE':
      return { label: 'Surveillance', tone: 'amber', filter: 'tout' };
    case 'FLUSHING':
      return { label: 'Flushing', tone: 'amber', filter: 'tout' };
    case 'INCONNU':
    default:
      return { label: statut || '—', tone: 'default', filter: 'tout' };
  }
}

function daysSince(dateFr: string | undefined, today: Date): number | null {
  if (!dateFr) return null;
  const parts = dateFr.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  const diffMs = today.getTime() - dt.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  return Number.isFinite(days) ? days : null;
}

function truieMeta(t: Truie, today: Date): string {
  const v = statutVisu(t.statut);
  if (v.filter === 'maternite' && t.dateMBPrevue) {
    const j = daysSince(t.dateMBPrevue, today);
    if (j === null) return `MB prévue ${t.dateMBPrevue}`;
    if (j < 0) return `MB J${j}`;
    if (j === 0) return `MB aujourd'hui`;
    return `MB J+${j}`;
  }
  if (v.filter === 'pleines' && t.dateMBPrevue) {
    const j = daysSince(t.dateMBPrevue, today);
    return j !== null && j < 0
      ? `MB prévue ${t.dateMBPrevue} · dans ${-j}j`
      : `Gestation · MB ${t.dateMBPrevue}`;
  }
  if (v.filter === 'reforme') {
    return typeof t.nbPortees === 'number'
      ? `${t.nbPortees} portées · à sortir`
      : 'À sortir';
  }
  if (v.filter === 'vides') {
    return t.stade ? `Stade ${t.stade}` : 'En attente de saillie';
  }
  if (v.filter === 'chaleur') {
    return t.stade ? `Chaleur · ${t.stade}` : 'Chaleur détectée';
  }
  return t.stade || t.statut || '—';
}

type SortKey = 'recent' | 'mbPrevue' | 'parite' | 'id';

const SORT_OPTIONS: ReadonlyArray<{ id: SortKey; label: string }> = [
  { id: 'recent', label: 'Récent' },
  { id: 'mbPrevue', label: 'MB prévue' },
  { id: 'parite', label: 'Parité' },
  { id: 'id', label: 'ID' },
];

type ViewMode = 'list' | 'grid';
const VIEW_MODE_KEY = 'troupeau_view_mode';

function parseDateMsFR(dateFr: string | undefined): number | null {
  if (!dateFr) return null;
  const parts = dateFr.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  return dt.getTime();
}

function idSortKey(t: Truie): string {
  const raw = String(t.displayId || t.id || '');
  return raw.replace(/\d+/g, (n) => n.padStart(6, '0')).toUpperCase();
}

function isBoucleLikeQuery(q: string): boolean {
  const s = q.trim().toLowerCase();
  if (s.length === 0) return false;
  if (/\d/.test(s)) return true;
  return s.startsWith('b.') || s.startsWith('b ') || s === 'b' || s.startsWith('fr-');
}

function boucleMatches(boucle: string | undefined, q: string): boolean {
  if (!boucle || !q) return false;
  return boucle.toLowerCase().includes(q.trim().toLowerCase());
}

interface TroupeauTruiesViewProps {
  searchText: string;
  setSearchText: (val: string) => void;
}

// ─── Composant ──────────────────────────────────────────────────────────────

const TroupeauTruiesView: React.FC<TroupeauTruiesViewProps> = ({ searchText, setSearchText }) => {
  const navigate = useNavigate();
  const { activeTruies } = useTroupeauPipeline();
  const today = useMemo(() => new Date(), []);

  const [filter, setFilter] = useState<FilterKey>('tout');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = kvGet(VIEW_MODE_KEY);
    return stored === 'grid' ? 'grid' : 'list';
  });

  useEffect(() => {
    kvSet(VIEW_MODE_KEY, viewMode).catch(() => {});
  }, [viewMode]);

  const [addOpen, setAddOpen] = useState(false);
  const [saillieOpen, setSaillieOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const base = activeTruies.filter((t) => {
      const v = statutVisu(t.statut);
      if (filter !== 'tout' && v.filter !== filter) return false;
      if (q) {
        const haystack = [t.displayId, t.id, t.nom, t.boucle, t.stade]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'recent') return base;
    const arr = [...base];
    if (sortBy === 'mbPrevue') {
      arr.sort((a, b) => {
        const da = parseDateMsFR(a.dateMBPrevue);
        const db = parseDateMsFR(b.dateMBPrevue);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    } else if (sortBy === 'parite') {
      arr.sort((a, b) => (b.nbPortees ?? -1) - (a.nbPortees ?? -1));
    } else if (sortBy === 'id') {
      arr.sort((a, b) => idSortKey(a).localeCompare(idSortKey(b)));
    }
    return arr;
  }, [activeTruies, filter, searchText, sortBy]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      tout: activeTruies.length,
      pleines: 0,
      maternite: 0,
      chaleur: 0,
      vides: 0,
      reforme: 0,
    };
    for (const t of activeTruies) {
      const v = statutVisu(t.statut);
      if (v.filter !== 'tout') c[v.filter] += 1;
    }
    return c;
  }, [activeTruies]);

  const ALL_FILTERS: ReadonlyArray<{ id: FilterKey; label: string }> = [
    { id: 'tout', label: 'Tout' },
    { id: 'pleines', label: 'Pleines' },
    { id: 'maternite', label: 'Maternité' },
    { id: 'chaleur', label: 'Chaleur' },
    { id: 'vides', label: 'Vides' },
    { id: 'reforme', label: 'Réforme' },
  ];
  const visibleFilters = ALL_FILTERS.filter(
    (f) => f.id === 'tout' || counts[f.id] > 0,
  );

  const handleSaillir = (t: Truie): void => {
    navigate(`/troupeau/truies/${encodeURIComponent(t.id)}?action=saillie`);
  };
  const handleSoigner = (t: Truie): void => {
    navigate(`/troupeau/truies/${encodeURIComponent(t.id)}?action=soin`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── CTA primaire : ajouter une truie + toggle viewMode ─────── */}
      <div className="flex items-center justify-between gap-2">
        <ViewModeToggle
          mode={viewMode}
          onChange={setViewMode}
        />
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Ajouter une truie"
          className="pressable inline-flex items-center gap-2 h-10 px-4 rounded-full bg-accent text-bg-0 font-mono text-[12px] font-medium uppercase tracking-wide shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-opacity"
        >
          <Plus size={15} aria-hidden="true" />
          Ajouter une truie
        </button>
      </div>

      {/* ── Recherche ───────────────────────────────────────────── */}
      <div className="relative">
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="ID, boucle, nom, stade…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Rechercher une truie par ID, nom, boucle ou stade"
          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-bg-2 border border-border font-mono text-[13px] text-text-0 placeholder:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* ── Tri segmented ────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span
          id="truies-sort-label"
          className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-text-2"
        >
          Trier par
        </span>
        <div
          role="radiogroup"
          aria-labelledby="truies-sort-label"
          className="flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {SORT_OPTIONS.map((o) => {
            const active = sortBy === o.id;
            return (
              <button
                key={o.id}
                role="radio"
                aria-checked={active}
                aria-label={`Trier par ${o.label}`}
                onClick={() => setSortBy(o.id)}
                className={`pressable shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  active
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-transparent border-border text-text-1 hover:text-text-0'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Segmented filters (scrollable) ──────────────────────── */}
      <div
        role="tablist"
        aria-label="Filtrer par statut"
        className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide"
      >
        {visibleFilters.map((f) => {
          const active = filter === f.id;
          const count = counts[f.id];
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={`pressable shrink-0 rounded-full px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-wide border transition-colors flex items-center gap-1.5 ${
                active
                  ? 'bg-bg-2 border-teal text-teal'
                  : 'bg-transparent border-border text-text-1 hover:text-text-0'
              }`}
            >
              {f.label}
              <span
                className={`text-[10px] tabular-nums ${active ? 'text-teal/70' : 'text-text-2'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Divider + compteur résultats ────────────────────────── */}
      <SectionDivider
        label={`${filtered.length} truie${filtered.length !== 1 ? 's' : ''}`}
      />

      {/* ── Liste ou Grille ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyStateShared
          size="sm"
          icon={<Users size={20} aria-hidden="true" />}
          title={searchText.trim().length > 0 ? 'Aucun résultat' : 'Aucune truie'}
          description={
            searchText.trim().length > 0
              ? 'Aucune truie ne correspond à ta recherche.'
              : 'Ta feuille TRUIES est vide ou non accessible.'
          }
        />
      ) : viewMode === 'grid' ? (
        <ul
          role="list"
          aria-label="Grille des truies"
          className="grid grid-cols-2 gap-2"
        >
          {filtered.map((t) => {
            const v = statutVisu(t.statut);
            const meta = truieMeta(t, today);
            const q = searchText.trim();
            const highlightBoucle =
              isBoucleLikeQuery(q) && boucleMatches(t.boucle, q);
            const boucleClass = highlightBoucle ? 'text-accent' : 'text-text-1';
            return (
              <li key={t.id} role="listitem">
                <button
                  type="button"
                  onClick={() => navigate(`/troupeau/truies/${encodeURIComponent(t.id)}`)}
                  aria-label={`Truie ${t.displayId || t.id}${t.boucle ? ` boucle ${t.boucle}` : ''} · ${v.label}`}
                  className="pressable w-full flex flex-col items-center gap-1.5 rounded-xl bg-bg-1 border border-border p-3 aspect-square justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <TruieIcon size={30} aria-hidden="true" />
                  <div className="font-mono text-[14px] font-semibold text-text-0 tabular-nums">
                    {t.displayId || t.id}
                  </div>
                  <Chip label={v.label} tone={v.tone} size="xs" />
                  {t.boucle ? (
                    <div
                      className={`ft-code text-[18px] font-semibold tabular-nums leading-none ${boucleClass}`}
                      aria-label={`Boucle ${t.boucle}`}
                    >
                      {t.boucle}
                    </div>
                  ) : (
                    <div className="ft-code text-[18px] text-text-2 leading-none" aria-hidden="true">
                      —
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-text-2 truncate w-full text-center">
                    {meta}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul
          role="list"
          aria-label="Liste des truies"
          className="card-dense !p-0 overflow-hidden"
        >
          {filtered.map((t) => {
            const v = statutVisu(t.statut);
            const meta = truieMeta(t, today);
            const q = searchText.trim();
            const highlightBoucle =
              isBoucleLikeQuery(q) && boucleMatches(t.boucle, q);
            const boucleClass = highlightBoucle ? 'text-accent' : 'text-text-1';
            return (
              <IonItemSliding key={t.id}>
                <li role="listitem">
                  <button
                    type="button"
                    onClick={() => navigate(`/troupeau/truies/${encodeURIComponent(t.id)}`)}
                    aria-label={`Truie ${t.displayId || t.id}${t.boucle ? ` boucle ${t.boucle}` : ''} · ${v.label}`}
                    className="pressable w-full text-left flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-bg-2 flex items-center justify-center text-text-1 shrink-0">
                      <TruieIcon size={22} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-mono text-[14px] font-semibold text-text-0 tabular-nums">
                          {t.displayId || t.id}
                        </span>
                        {t.boucle ? (
                          <>
                            <span className="font-mono text-[12px] text-text-2" aria-hidden="true">·</span>
                            <span className={`ft-code text-[13px] tabular-nums ${boucleClass}`} aria-label={`Boucle ${t.boucle}`}>
                              {t.boucle}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <div className="font-mono text-[11px] text-text-2 mt-0.5 truncate">
                        {meta}
                      </div>
                    </div>
                    <Chip label={v.label} tone={v.tone} size="xs" />
                  </button>
                </li>
                <IonItemOptions side="end">
                  <IonItemOption
                    color="warning"
                    aria-label={`Enregistrer une saillie pour ${t.displayId || t.id}`}
                    onClick={() => handleSaillir(t)}
                  >
                    <div className="flex flex-col items-center gap-1 px-2">
                      <Heart size={18} aria-hidden="true" />
                      <span className="font-mono text-[10px] uppercase tracking-wide">Saillir</span>
                    </div>
                  </IonItemOption>
                  <IonItemOption
                    color="danger"
                    aria-label={`Enregistrer un soin pour ${t.displayId || t.id}`}
                    onClick={() => handleSoigner(t)}
                  >
                    <div className="flex flex-col items-center gap-1 px-2">
                      <Syringe size={18} aria-hidden="true" />
                      <span className="font-mono text-[10px] uppercase tracking-wide">Soigner</span>
                    </div>
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            );
          })}
        </ul>
      )}

      <QuickAddTruieForm isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <QuickSaillieForm isOpen={saillieOpen} onClose={() => setSaillieOpen(false)} />
    </div>
  );
};

// ─── ViewMode toggle ────────────────────────────────────────────────────────

const ViewModeToggle: React.FC<{ mode: ViewMode; onChange: (m: ViewMode) => void }> = ({
  mode,
  onChange,
}) => (
  <div
    role="radiogroup"
    aria-label="Mode d'affichage de la liste des truies"
    className="inline-flex rounded-full border border-border bg-bg-1 p-0.5"
  >
    <button
      type="button"
      role="radio"
      aria-checked={mode === 'list'}
      aria-label="Affichage en liste"
      onClick={() => onChange('list')}
      className={`pressable inline-flex items-center justify-center h-8 w-8 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
        mode === 'list' ? 'bg-accent text-bg-0' : 'text-text-1 hover:text-text-0'
      }`}
    >
      <ListIcon size={18} aria-hidden="true" />
    </button>
    <button
      type="button"
      role="radio"
      aria-checked={mode === 'grid'}
      aria-label="Affichage en grille"
      onClick={() => onChange('grid')}
      className={`pressable inline-flex items-center justify-center h-8 w-8 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
        mode === 'grid' ? 'bg-accent text-bg-0' : 'text-text-1 hover:text-text-0'
      }`}
    >
      <LayoutGrid size={18} aria-hidden="true" />
    </button>
  </div>
);

export default TroupeauTruiesView;
