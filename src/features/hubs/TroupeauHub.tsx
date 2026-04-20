/**
 * TroupeauHub — /troupeau (tab 02)
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte multi-vues (2026-04-19) — Hub "Troupeau" avec 4 sous-onglets :
 *
 *   [ TRUIES ]  [ VERRATS ]  [ PORCELETS ]  [ LOGES ]
 *
 * Structure :
 *   1. AgritechHeader
 *   2. Summary strip (P6) — 4 KPI rapides + 3 barres occupation loges
 *   3. Barre segmented 4-tabs — sous-onglets persistés en query `?view=…`
 *   4. Vue selon activeSubTab :
 *      - 'truies'    → logique historique (search + filters + liste DataRow)
 *      - 'verrats'   → <TroupeauVerratsView/>  (lazy, créé par Agent 2)
 *      - 'porcelets' → <TroupeauPorceletsView/> (lazy, créé par Agent 3)
 *      - 'loges'     → <TroupeauLogesView/>     (lazy, créé par Agent 4)
 *
 * P2 : filtre CHALEUR ajouté, filtres à count=0 cachés (sauf 'tout').
 * P5 : search étendue (displayId/id/nom/boucle/stade).
 * P6 : summary strip header avec barres compactes loges OK/HIGH/FULL.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IonContent,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonPage,
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

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { TruieIcon } from '../../components/icons';
import { Chip, SectionDivider, type ChipTone } from '../../components/agritech';
import QuickAddTruieForm from '../../components/forms/QuickAddTruieForm';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import { useFarm } from '../../context/FarmContext';
import type { Truie } from '../../types/farm';
import { normaliseStatut } from '../../lib/truieStatut';
import { isArchivedTruie } from '../../lib/truieHelpers';
import { Bandes } from '../../services/bandAnalysisEngine';
import type { LogeOccupation, LogeOccupationAlerte } from '../../services/bandesAggregator';
import { kvGet, kvSet } from '../../services/kvStore';

// ─── Lazy views (créées en parallèle par Agents 2/3/4) ───────────────────────
// Les modules Verrats / Porcelets / Loges sont chargés en lazy via dynamic
// import. Si un module n'existe pas encore (Agent 3/4 en cours), le catch
// retourne un placeholder au lieu de crasher la vue entière.
//
// NB : on ignore le type-resolve via un helper `loadModule` car TS est strict
// sur les imports statiques — les modules Porcelets/Loges sont créés en
// parallèle et peuvent ne pas exister au moment du typecheck.

type LazyModule = { default: React.ComponentType };

function lazyWithFallback(path: string, name: string): React.LazyExoticComponent<React.ComponentType> {
  return React.lazy(async (): Promise<LazyModule> => {
    try {
      // @vite-ignore : chemin dynamique résolu runtime
      const mod = (await import(/* @vite-ignore */ path)) as LazyModule;
      return mod;
    } catch {
      return { default: () => <SubViewPlaceholder name={name} /> };
    }
  });
}

const TroupeauVerratsView = lazyWithFallback(
  '../troupeau/TroupeauVerratsView',
  'Verrats',
);
const TroupeauPorceletsView = lazyWithFallback(
  '../troupeau/TroupeauPorceletsView',
  'Porcelets',
);
const TroupeauLogesView = lazyWithFallback(
  '../troupeau/TroupeauLogesView',
  'Loges',
);

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

// ─── Filters (vue Truies) ────────────────────────────────────────────────────

type FilterKey = 'tout' | 'pleines' | 'maternite' | 'chaleur' | 'vides' | 'reforme';

interface StatutVisu {
  label: string;
  tone: ChipTone;
  filter: FilterKey;
}

/**
 * Mappe un statut truie libre (depuis la feuille) vers :
 *  - un libellé court pour la chip
 *  - un tone de couleur (gold = maternité, accent = pleine, coral = chaleur, red = réforme)
 *  - un filter bucket
 *
 * La sémantique passe par `normaliseStatut` (source unique). Le mapping
 * visuel (label/tone/filter) reste local car propre à cette vue.
 */
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

// ─── Meta short text ────────────────────────────────────────────────────────

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

// ─── Composant ──────────────────────────────────────────────────────────────

const TroupeauHub: React.FC = () => {
  const { truies, verrats, bandes } = useFarm();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Sous-onglet (persisté en query ?view=…)
  const viewParam = searchParams.get('view');
  const initialSubTab: SubTab = isSubTab(viewParam) ? viewParam : 'truies';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab);

  // Sync query ↔ state si l'URL change (ex : deep link, back button).
  // L'effet ne déclenche un re-render que si la valeur DIFFÈRE vraiment (pas
  // de boucle). Le setState-in-effect est volontaire et idiomatique ici : on
  // synchronise la source externe (URL) avec le state local.
  useEffect(() => {
    if (isSubTab(viewParam) && viewParam !== activeSubTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSubTab(viewParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParam]);

  const handleSubTabChange = (tab: SubTab): void => {
    setActiveSubTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'truies') {
      next.delete('view'); // 'truies' = défaut, garde l'URL propre
    } else {
      next.set('view', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const today = useMemo(() => new Date(), []);

  /**
   * Liste des truies ACTIVES uniquement.
   *
   * Les IDs réformés (T08, T17 — cf. `ARCHIVED_TRUIE_IDS` dans
   * `src/lib/truieHelpers.ts`) ne sont plus sur le site mais restent
   * référencés dans l'historique repro. On filtre en amont.
   */
  const activeTruies = useMemo(
    () => truies.filter((t) => !isArchivedTruie(t.id)),
    [truies],
  );

  // ── Summary strip (P6) — loges occupation
  const realBandes = useMemo(() => Bandes.filterReal(bandes), [bandes]);

  const summary = useMemo(() => {
    const countByFilter = (f: FilterKey): number =>
      activeTruies.filter((t) => statutVisu(t.statut).filter === f).length;

    return {
      total: activeTruies.length,
      pleines: countByFilter('pleines'),
      maternite: countByFilter('maternite'),
      vides: countByFilter('vides'),
      mat: Bandes.logesMaternite(activeTruies),
      post: Bandes.logesPostSevrage(realBandes, today),
      eng: Bandes.logesEngraissement(realBandes, today),
    };
  }, [activeTruies, realBandes, today]);

  const porceletCount = useMemo(
    () =>
      realBandes.reduce((acc, b) => {
        const v = (b as unknown as { vivants?: number; effectif?: number }).vivants
          ?? (b as unknown as { vivants?: number; effectif?: number }).effectif
          ?? 0;
        return acc + (typeof v === 'number' ? v : 0);
      }, 0),
    [realBandes],
  );

  // Compteurs affichés dans les sous-onglets (badges)
  const tabCounts: Record<SubTab, number> = {
    truies: activeTruies.length,
    verrats: verrats.length,
    porcelets: porceletCount,
    loges: summary.mat.capacite + summary.post.capacite + summary.eng.capacite,
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="TROUPEAU"
            subtitle={`Ferme K13 · ${activeTruies.length + verrats.length} animaux`}
          />

          <div className="px-4 pt-3 pb-32 flex flex-col gap-4">
            {/* ── P6 Summary strip ─────────────────────────────────────── */}
            <SummaryStrip
              total={summary.total}
              pleines={summary.pleines}
              maternite={summary.maternite}
              vides={summary.vides}
              mat={summary.mat}
              post={summary.post}
              eng={summary.eng}
            />

            {/* ── P1 Sous-onglets ──────────────────────────────────────── */}
            <div
              role="tablist"
              aria-label="Sélectionner une vue du troupeau"
              className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide"
            >
              {SUB_TABS.map((t) => {
                const active = activeSubTab === t.id;
                const count = tabCounts[t.id];
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    aria-controls={`troupeau-panel-${t.id}`}
                    id={`troupeau-tab-${t.id}`}
                    onClick={() => handleSubTabChange(t.id)}
                    className={`pressable shrink-0 rounded-full px-3.5 py-2 ft-heading text-[12px] uppercase tracking-wide border transition-colors flex items-center gap-2 ${
                      active
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-transparent border-border text-text-1 hover:text-text-0'
                    }`}
                  >
                    {t.label}
                    <span
                      className={`font-mono tabular-nums text-[10px] ${
                        active ? 'text-accent/70' : 'text-text-2'
                      }`}
                    >
                      {String(count).padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Panels ───────────────────────────────────────────────── */}
            {activeSubTab === 'truies' ? (
              <div
                role="tabpanel"
                id="troupeau-panel-truies"
                aria-labelledby="troupeau-tab-truies"
                className="flex flex-col gap-4"
              >
                <TruiesPanel activeTruies={activeTruies} today={today} />
              </div>
            ) : (
              <Suspense
                fallback={
                  <div
                    role="tabpanel"
                    id={`troupeau-panel-${activeSubTab}`}
                    aria-labelledby={`troupeau-tab-${activeSubTab}`}
                    className="card-dense text-center py-10 font-mono text-[12px] text-text-2"
                  >
                    Chargement…
                  </div>
                }
              >
                <div
                  role="tabpanel"
                  id={`troupeau-panel-${activeSubTab}`}
                  aria-labelledby={`troupeau-tab-${activeSubTab}`}
                >
                  {activeSubTab === 'verrats' && <TroupeauVerratsView />}
                  {activeSubTab === 'porcelets' && <TroupeauPorceletsView />}
                  {activeSubTab === 'loges' && <TroupeauLogesView />}
                </div>
              </Suspense>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── P6 Summary strip ────────────────────────────────────────────────────────

interface SummaryStripProps {
  total: number;
  pleines: number;
  maternite: number;
  vides: number;
  mat: LogeOccupation;
  post: LogeOccupation;
  eng: LogeOccupation;
}

const SummaryStrip: React.FC<SummaryStripProps> = ({
  total,
  pleines,
  maternite,
  vides,
  mat,
  post,
  eng,
}) => (
  <div
    className="card-dense flex flex-col gap-2.5"
    role="group"
    aria-label="Synthèse troupeau et occupation des loges"
  >
    {/* Ligne 1 — comptages */}
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono tabular-nums text-[12px] text-text-1">
      <span className="text-text-0 font-semibold">
        {total} truie{total > 1 ? 's' : ''}
      </span>
      <span className="text-text-2">·</span>
      <span>{pleines} pleines</span>
      <span className="text-text-2">·</span>
      <span>{maternite} maternité</span>
      <span className="text-text-2">·</span>
      <span>{vides} vides</span>
    </div>

    {/* Ligne 2 — barres loges */}
    <div className="grid grid-cols-3 gap-2">
      <LogesMiniBar label="Maternité" occ={mat} />
      <LogesMiniBar label="Post-sev." occ={post} />
      <LogesMiniBar label="Engr." occ={eng} />
    </div>
  </div>
);

interface LogesMiniBarProps {
  label: string;
  occ: LogeOccupation;
}

const ALERT_BAR_CLASS: Record<LogeOccupationAlerte, string> = {
  OK: 'bg-accent',
  HIGH: 'bg-amber',
  FULL: 'bg-red',
};

const LogesMiniBar: React.FC<LogesMiniBarProps> = ({ label, occ }) => {
  const width = Math.min(occ.tauxPct, 100);
  const pad2 = (n: number): string => String(n).padStart(2, '0');
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-text-2 truncate">
          {label}
        </span>
        <span className="font-mono tabular-nums text-[11px] text-text-0 shrink-0">
          {pad2(occ.occupees)}/{pad2(occ.capacite)}
        </span>
      </div>
      <div
        className="h-1 w-full bg-bg-2 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={occ.tauxPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Loges ${label} ${occ.tauxPct}%`}
      >
        <div
          className={`h-full ${ALERT_BAR_CLASS[occ.alerte]} rounded-full transition-[width]`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

// ─── Vue Truies (logique historique inlined) ─────────────────────────────────

type SortKey = 'recent' | 'mbPrevue' | 'parite' | 'id';

const SORT_OPTIONS: ReadonlyArray<{ id: SortKey; label: string }> = [
  { id: 'recent', label: 'Récent' },
  { id: 'mbPrevue', label: 'MB prévue' },
  { id: 'parite', label: 'Parité' },
  { id: 'id', label: 'ID' },
];

type ViewMode = 'list' | 'grid';

const VIEW_MODE_KEY = 'troupeau_view_mode';

/** Parse dd/mm/yyyy → timestamp (ms). null si non parseable. */
function parseDateMsFR(dateFr: string | undefined): number | null {
  if (!dateFr) return null;
  const parts = dateFr.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Natural sort clé pour les IDs ("T2" < "T10"). */
function idSortKey(t: Truie): string {
  const raw = String(t.displayId || t.id || '');
  // Zero-pad la partie numérique pour un compare lexicographique stable
  return raw.replace(/\d+/g, (n) => n.padStart(6, '0')).toUpperCase();
}

interface TruiesPanelProps {
  activeTruies: Truie[];
  today: Date;
}

const TruiesPanel: React.FC<TruiesPanelProps> = ({ activeTruies, today }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>('tout');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');

  // P8 — View mode (liste vs grille), persisté via kvStore
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = kvGet(VIEW_MODE_KEY);
    return stored === 'grid' ? 'grid' : 'list';
  });

  useEffect(() => {
    // fire-and-forget : persist change
    kvSet(VIEW_MODE_KEY, viewMode).catch(() => {
      /* silent — un fail de persistance ne casse pas la vue */
    });
  }, [viewMode]);

  // P7 — Bottom sheets
  const [addOpen, setAddOpen] = useState(false);
  const [saillieOpen, setSaillieOpen] = useState(false);

  // P5 — Filtrage + recherche étendue + P3 — Tri
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

    // P3 — Tri (copie défensive pour ne pas muter `activeTruies`)
    if (sortBy === 'recent') return base;
    const arr = [...base];
    if (sortBy === 'mbPrevue') {
      arr.sort((a, b) => {
        const da = parseDateMsFR(a.dateMBPrevue);
        const db = parseDateMsFR(b.dateMBPrevue);
        if (da === null && db === null) return 0;
        if (da === null) return 1; // null à la fin
        if (db === null) return -1;
        return da - db; // ascendant : les plus proches d'abord
      });
    } else if (sortBy === 'parite') {
      arr.sort((a, b) => (b.nbPortees ?? -1) - (a.nbPortees ?? -1));
    } else if (sortBy === 'id') {
      arr.sort((a, b) => idSortKey(a).localeCompare(idSortKey(b)));
    }
    return arr;
  }, [activeTruies, filter, searchText, sortBy]);

  // Compteurs par filter bucket
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

  // P2 — filtres à count=0 cachés (sauf 'tout')
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

  // ── Swipe-action handlers (P4) ───────────────────────────────────────
  const handleSaillir = (t: Truie): void => {
    navigate(
      `/troupeau/truies/${encodeURIComponent(t.id)}?action=saillie`,
    );
  };
  const handleSoigner = (t: Truie): void => {
    navigate(`/troupeau/truies/${encodeURIComponent(t.id)}?action=soin`);
  };

  return (
    <>
      {/* ── Toolbar : toggle viewMode + bouton "Nouvelle truie" ─────── */}
      <div className="flex items-center justify-between gap-2">
        <ViewModeToggle
          mode={viewMode}
          onChange={setViewMode}
        />
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Ajouter une nouvelle truie"
          className="pressable inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-accent/40 text-accent font-mono text-[11px] uppercase tracking-wide hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors"
        >
          <Plus size={14} aria-hidden="true" />
          Nouvelle truie
        </button>
      </div>

      {/* ── Recherche ───────────────────────────────────────────── */}
      <div className="relative">
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="ID, nom, boucle, stade…"
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

      {/* ── P3 Tri segmented ────────────────────────────────────── */}
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
                {String(count).padStart(2, '0')}
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
        <EmptyState hasSearch={searchText.trim().length > 0} />
      ) : viewMode === 'grid' ? (
        <ul
          role="list"
          aria-label="Grille des truies"
          className="grid grid-cols-2 gap-2"
        >
          {filtered.map((t) => {
            const v = statutVisu(t.statut);
            const meta = truieMeta(t, today);
            return (
              <li key={t.id} role="listitem">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/troupeau/truies/${encodeURIComponent(t.id)}`)
                  }
                  aria-label={`Truie ${t.displayId || t.id} · ${v.label}`}
                  className="pressable w-full flex flex-col items-center gap-2 rounded-xl bg-bg-1 border border-border p-3 aspect-square justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <TruieIcon size={32} aria-hidden="true" />
                  <div className="font-mono text-[14px] font-semibold text-text-0 tabular-nums">
                    {t.displayId || t.id}
                  </div>
                  <Chip label={v.label} tone={v.tone} size="xs" />
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
            return (
              <IonItemSliding key={t.id}>
                <li role="listitem">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/troupeau/truies/${encodeURIComponent(t.id)}`)
                    }
                    className="pressable w-full text-left flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-bg-2 flex items-center justify-center text-text-1 shrink-0">
                      <TruieIcon size={22} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[14px] font-semibold text-text-0">
                        {t.displayId || t.id}
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
                      <span className="font-mono text-[10px] uppercase tracking-wide">
                        Saillir
                      </span>
                    </div>
                  </IonItemOption>
                  <IonItemOption
                    color="danger"
                    aria-label={`Enregistrer un soin pour ${t.displayId || t.id}`}
                    onClick={() => handleSoigner(t)}
                  >
                    <div className="flex flex-col items-center gap-1 px-2">
                      <Syringe size={18} aria-hidden="true" />
                      <span className="font-mono text-[10px] uppercase tracking-wide">
                        Soigner
                      </span>
                    </div>
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            );
          })}
        </ul>
      )}

      {/* ── BottomSheets ────────────────────────────────────────── */}
      <QuickAddTruieForm
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <QuickSaillieForm
        isOpen={saillieOpen}
        onClose={() => setSaillieOpen(false)}
      />
    </>
  );
};

// ─── ViewMode toggle (P8) ───────────────────────────────────────────────────

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ mode, onChange }) => (
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

// ─── Empty state ─────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ hasSearch: boolean }> = ({ hasSearch }) => (
  <div
    className="card-dense text-center py-12 animate-fade-in-up"
    role="status"
  >
    <div className="inline-flex w-12 h-12 rounded-xl bg-bg-1 border border-border items-center justify-center text-text-2 mb-3">
      <Users size={22} aria-hidden="true" />
    </div>
    <h3 className="ft-heading text-[14px] uppercase text-text-0">
      {hasSearch ? 'Aucun résultat' : 'Aucune truie'}
    </h3>
    <p className="font-mono text-[11px] text-text-2 mt-2">
      {hasSearch
        ? 'Aucune truie ne correspond à ta recherche.'
        : 'Ta feuille TRUIES est vide ou non accessible.'}
    </p>
  </div>
);

// ─── Sub-view placeholder (pour les vues Agents 2/3/4 pas encore créées) ─────

const SubViewPlaceholder: React.FC<{ name: string }> = ({ name }) => (
  <div className="card-dense text-center py-12" role="status">
    <h3 className="ft-heading text-[14px] uppercase text-text-0">{name}</h3>
    <p className="font-mono text-[11px] text-text-2 mt-2">
      Vue en cours de création…
    </p>
  </div>
);

export default TroupeauHub;
