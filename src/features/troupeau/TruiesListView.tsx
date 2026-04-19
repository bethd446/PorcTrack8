import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import {
  Search,
  MoreVertical,
  Baby,
  PackageCheck,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import { DataRow, Chip, SectionDivider } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { TruieIcon } from '../../components/icons';
import type { Truie } from '../../types/farm';
import { FARM_CONFIG } from '../../config/farm';
import { enqueueUpdateRow } from '../../services/offlineQueue';

/** Filter bucket keys. `all` shows every truie. */
type FilterKey = 'all' | 'pleine' | 'maternite' | 'attente' | 'surveiller';

interface FilterDef {
  key: FilterKey;
  label: string;
  match: (t: Truie) => boolean;
}

const FILTERS: FilterDef[] = [
  { key: 'all',         label: 'Toutes',        match: () => true },
  { key: 'pleine',      label: 'Pleines',       match: (t) => /pleine/i.test(t.statut) },
  { key: 'maternite',   label: 'Maternité',     match: (t) => /mater|allait|lactation/i.test(t.statut) },
  { key: 'attente',     label: 'En attente',    match: (t) => /attente|saillie|vide/i.test(t.statut) },
  { key: 'surveiller',  label: 'À surveiller',  match: (t) => /surveill|réform|reforme/i.test(t.statut) },
];

/** Valid filter keys parsed from ?statut=X. */
const FILTER_KEYS: readonly FilterKey[] = [
  'all',
  'pleine',
  'maternite',
  'attente',
  'surveiller',
];

function isFilterKey(s: string | null): s is FilterKey {
  return !!s && (FILTER_KEYS as readonly string[]).includes(s);
}

/** Chip tone mapping derived from the truie statut. */
function toneForStatut(statut: string): ChipTone {
  const s = statut.toLowerCase();
  if (s.includes('pleine'))                                  return 'accent';
  if (s.includes('mater') || s.includes('allait') ||
      s.includes('lactation'))                               return 'gold';
  if (s.includes('surveill') || s.includes('réform') ||
      s.includes('reforme'))                                 return 'amber';
  return 'default';
}

/** DD/MM/YYYY → Date | null (local time, midnight). */
function parseFrDate(value: string | undefined): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!d || !mo || !y) return null;
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Integer day offset from today (negative = past, positive = future). */
function daysUntilFr(frDate: string | undefined): number | null {
  const dt = parseFrDate(frDate);
  if (!dt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return Math.round((dt.getTime() - today.getTime()) / 86_400_000);
}

interface EcheanceBadge {
  label: string;
  tone: ChipTone;
}

/**
 * Derive a single "échéance" badge for a truie.
 * Priorité :
 *   1. Maternité → "Sevrage J+X/21" (J+ depuis J0 de la lactation, approximé
 *      par `dateMBPrevue` faute de `dateMBReelle` côté SUIVI_TRUIES).
 *   2. Pleine/Attente → MB prévue (red ≤14j, amber ≤30j, default >30j).
 */
function echeanceFor(t: Truie): EcheanceBadge | null {
  const isMater = /mater|allait|lactation/i.test(t.statut);
  const offset = daysUntilFr(t.dateMBPrevue);

  if (isMater) {
    if (offset === null) return null;
    // En maternité : MB est dans le passé → offset négatif. J+ = -offset.
    const dayInLactation = Math.max(0, -offset);
    // Cycle canonique 21 jours ; on borne l'affichage.
    const display = Math.min(dayInLactation, 99);
    const tone: ChipTone =
      dayInLactation >= 21 ? 'red' : dayInLactation >= 18 ? 'amber' : 'gold';
    return { label: `Sevrage J+${display}/21`, tone };
  }

  if (offset === null) return null;
  if (offset < 0) {
    // MB prévue dépassée sans être en maternité → urgence rouge
    return { label: `MB J${offset}`, tone: 'red' };
  }
  if (offset <= 14) return { label: `MB J-${offset}`, tone: 'red' };
  if (offset <= 30) return { label: `MB J-${offset}`, tone: 'amber' };
  // >30j : rappel discret
  if (t.dateMBPrevue) {
    const short = t.dateMBPrevue.split('/').slice(0, 2).join('/');
    return { label: `MB ${short}`, tone: 'default' };
  }
  return null;
}

/** Skeleton placeholder row. Declared at module scope so React 19 does not
 *  treat it as a component-created-during-render (react-hooks/static-components). */
const SkeletonRow: React.FC = () => (
  <div
    className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0"
    aria-hidden="true"
  >
    <div className="flex-1 min-w-0 space-y-2">
      <div className="h-[14px] w-2/3 rounded bg-bg-2" />
      <div className="h-[11px] w-1/2 rounded bg-bg-2" />
    </div>
    <div className="h-[18px] w-14 rounded bg-bg-2 shrink-0" />
  </div>
);

/** Quick action target statuts (value written back to Sheets). */
const STATUT_PLEINE = 'Pleine';
const STATUT_SEVREE = 'En attente saillie'; // Post-sevrage → cycle redémarre
const STATUT_SURVEILLER = 'À surveiller';

type ActionKey = 'pleine' | 'sevree' | 'surveiller' | 'detail';

interface ActionDef {
  key: ActionKey;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  available: (t: Truie) => boolean;
}

const ACTIONS: ActionDef[] = [
  {
    key: 'pleine',
    label: 'Marquer pleine',
    Icon: Baby,
    available: (t) => /attente|saillie|vide/i.test(t.statut),
  },
  {
    key: 'sevree',
    label: 'Marquer sevrée',
    Icon: PackageCheck,
    available: (t) => /mater|allait|lactation/i.test(t.statut),
  },
  {
    key: 'surveiller',
    label: 'À surveiller',
    Icon: AlertTriangle,
    available: () => true,
  },
  {
    key: 'detail',
    label: 'Voir détail',
    Icon: Eye,
    available: () => true,
  },
];

/**
 * TruiesListView — liste dense des truies (Agritech cockpit).
 *
 * N.B. Ce composant coexiste avec `CheptelView` qui reste monté sur `/cheptel`.
 * Monté sur `/troupeau/truies`.
 *
 * Query params :
 *   ?statut=pleine|maternite|attente|surveiller  → filtre pré-sélectionné
 *   (provient typiquement du `TruieStatutPipeline` sur TroupeauHub).
 */
const TruiesListView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { truies, loading, refreshData } = useFarm();

  const initialFilter: FilterKey = useMemo(() => {
    const q = new URLSearchParams(location.search).get('statut');
    return isFilterKey(q) ? q : 'all';
  }, [location.search]);

  const [filter, setFilter]       = useState<FilterKey>(initialFilter);
  const [searchText, setSearchText] = useState('');
  const [menuFor, setMenuFor]     = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Keep local filter in sync if the URL changes (e.g. second tap on pipeline)
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  // Reflect current filter in URL without navigation history spam
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const current = params.get('statut');
    const target = filter === 'all' ? null : filter;
    if (current === target) return;
    if (target) params.set('statut', target);
    else params.delete('statut');
    const next = params.toString();
    navigate(
      { pathname: location.pathname, search: next ? `?${next}` : '' },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Close dropdown on outside-click / Escape
  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e: MouseEvent): void => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuFor(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuFor]);

  const activeFilter = useMemo(
    () => FILTERS.find(f => f.key === filter) ?? FILTERS[0],
    [filter]
  );

  // Filtrage + recherche + tri
  const filteredTruies = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return truies
      .filter(activeFilter.match)
      .filter(t => {
        if (!q) return true;
        const hay = [
          t.id,
          t.displayId,
          t.nom ?? '',
          t.boucle ?? '',
        ].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) =>
        a.displayId.localeCompare(b.displayId, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [truies, activeFilter, searchText]);

  // Compteurs live par bucket (basés sur la liste COMPLÈTE, pas la recherche)
  const counts = useMemo(() => {
    const acc: Record<FilterKey, number> = {
      all: truies.length,
      pleine: 0,
      maternite: 0,
      attente: 0,
      surveiller: 0,
    };
    for (const t of truies) {
      for (const f of FILTERS) {
        if (f.key === 'all') continue;
        if (f.match(t)) acc[f.key] += 1;
      }
    }
    return acc;
  }, [truies]);

  // Ration moyenne sur TOUTES les truies (pas le filtre)
  const rationMoy = useMemo(() => {
    if (truies.length === 0) return 0;
    const total = truies.reduce((s, t) => s + (t.ration || 0), 0);
    return Math.round((total / truies.length) * 10) / 10;
  }, [truies]);

  const handleRefresh = async (e: CustomEvent<{ complete: () => void }>) => {
    await refreshData();
    e.detail.complete();
  };

  const runAction = async (t: Truie, action: ActionKey): Promise<void> => {
    setMenuFor(null);
    if (action === 'detail') {
      navigate(`/troupeau/truies/${t.id}`);
      return;
    }

    const nextStatut =
      action === 'pleine'     ? STATUT_PLEINE    :
      action === 'sevree'     ? STATUT_SEVREE    :
      action === 'surveiller' ? STATUT_SURVEILLER : null;
    if (!nextStatut) return;

    setPendingAction(t.id);
    try {
      await enqueueUpdateRow(
        'TRUIES_REPRODUCTION',
        'ID',
        t.id,
        { Statut: nextStatut },
      );
      // Refresh pour refléter le changement dès le retour worker.
      await refreshData();
    } catch (err) {
       
      console.error('[TruiesListView] action error', err);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader
            title="Truies"
            subtitle={`${truies.length} actives · ${FARM_CONFIG.FARM_ID}`}
            backTo="/troupeau"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Filter chips (horizontal scroll, role=tablist) */}
            <div
              className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1"
              role="tablist"
              aria-label="Filtres statut truie"
              style={{ scrollbarWidth: 'none' }}
            >
              {FILTERS.map(f => {
                const count = counts[f.key];
                const isActive = f.key === filter;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    onClick={() => setFilter(f.key)}
                    aria-selected={isActive}
                    aria-controls="truies-liste"
                    className={[
                      'pressable shrink-0 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5',
                      'transition-colors duration-150',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                      isActive
                        ? 'bg-accent-dim/30 border-accent text-accent'
                        : 'bg-bg-1 border-border text-text-1 hover:bg-bg-2',
                    ].join(' ')}
                  >
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wide">
                      {f.label}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-text-2">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search (font-mono) */}
            <label
              className="flex items-center gap-2 rounded-md border border-border bg-bg-1 px-3 py-2 focus-within:border-accent transition-colors"
            >
              <Search size={14} className="text-text-2 shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Boucle · nom · ID"
                aria-label="Rechercher une truie par boucle, nom ou ID"
                className="w-full bg-transparent border-none outline-none font-mono text-[13px] text-text-0 placeholder:text-text-2"
              />
            </label>

            {/* Stats strip */}
            <div className="flex items-center justify-between gap-3 card-dense py-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="kpi-label">Résultats</span>
                <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
                  {filteredTruies.length}
                  <span className="text-text-2 font-medium"> / {truies.length}</span>
                </span>
              </div>
              <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="kpi-label">Ration moyenne</span>
                <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
                  {rationMoy.toFixed(1)}
                  <span className="text-text-2 font-medium"> kg/j</span>
                </span>
              </div>
            </div>

            <SectionDivider
              label={
                activeFilter.key === 'all'
                  ? `Truies · ${filteredTruies.length}`
                  : `${activeFilter.label} · ${filteredTruies.length}`
              }
            />

            {/* Liste */}
            {loading && filteredTruies.length === 0 ? (
              <div
                className="rounded-md border border-border bg-bg-1 overflow-hidden"
                role="status"
                aria-busy="true"
                aria-label="Chargement des truies"
              >
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : filteredTruies.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up"
                role="status"
              >
                <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
                  <TruieIcon size={48} />
                </div>
                <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
                  {filter !== 'all'
                    ? `Aucune truie · filtre ${activeFilter.label}`
                    : searchText
                      ? 'Aucune truie trouvée'
                      : 'Aucune truie'}
                </h3>
                <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
                  {filter !== 'all'
                    ? 'Essayez un autre filtre ou réinitialisez.'
                    : searchText
                      ? "Modifiez la recherche ou vérifiez que Google Sheets est à jour."
                      : "Votre cheptel est vide pour l'instant."}
                </p>
                {filter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="pressable mt-5 h-11 px-5 rounded-md bg-accent text-bg-0 text-[13px] font-medium transition-colors"
                  >
                    Réinitialiser le filtre
                  </button>
                ) : null}
              </div>
            ) : (
              <div
                id="truies-liste"
                role="list"
                aria-label="Liste des truies"
                className="rounded-md border border-border bg-bg-1 overflow-hidden relative"
              >
                {filteredTruies.map(t => {
                  const boucle = t.boucle ? `B.${t.boucle}` : '—';
                  const namePart = t.nom ? ` ${t.nom}` : '';
                  const primary = `${boucle} · ${t.displayId}${namePart}`;

                  const secondaryParts: string[] = [t.statut];
                  if (t.ration) {
                    secondaryParts.push(`${t.ration}kg`);
                  }
                  const secondary = secondaryParts.join(' · ');

                  const echeance = echeanceFor(t);
                  const isMenuOpen = menuFor === t.id;
                  const isPending = pendingAction === t.id;
                  const availableActions = ACTIONS.filter(a => a.available(t));

                  return (
                    <div role="listitem" key={t.id} className="relative">
                      <DataRow
                        primary={primary}
                        secondary={secondary}
                        accessory={
                          <div className="flex items-center gap-1.5">
                            {echeance ? (
                              <Chip
                                label={echeance.label}
                                tone={echeance.tone}
                                size="xs"
                              />
                            ) : null}
                            <Chip
                              label={t.statut}
                              tone={toneForStatut(t.statut)}
                              size="xs"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuFor(isMenuOpen ? null : t.id);
                              }}
                              aria-label={`Actions pour ${t.displayId}`}
                              aria-haspopup="menu"
                              aria-expanded={isMenuOpen}
                              disabled={isPending}
                              className={[
                                'pressable inline-flex h-8 w-8 items-center justify-center rounded-md',
                                'text-text-2 hover:bg-bg-2 hover:text-text-0',
                                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                                isPending ? 'opacity-40 cursor-not-allowed' : '',
                              ].join(' ')}
                            >
                              {isPending ? (
                                <span className="animate-pulse font-mono text-[10px]">
                                  …
                                </span>
                              ) : (
                                <MoreVertical size={14} aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        }
                        onClick={() => navigate(`/troupeau/truies/${t.id}`)}
                      />

                      {isMenuOpen ? (
                        <div
                          ref={menuRef}
                          role="menu"
                          aria-label={`Actions ${t.displayId}`}
                          className={[
                            'absolute right-2 top-[calc(100%-6px)] z-20',
                            'min-w-[200px] rounded-md border border-border bg-bg-1',
                            'shadow-lg overflow-hidden',
                            'animate-scale-in origin-top-right',
                          ].join(' ')}
                        >
                          {availableActions.map((a, idx) => {
                            const Icon = a.Icon;
                            return (
                              <button
                                key={a.key}
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void runAction(t, a.key);
                                }}
                                style={{ transitionDelay: `${idx * 30}ms` }}
                                className={[
                                  'pressable w-full flex items-center gap-2.5 px-3 py-2.5 text-left',
                                  'text-text-0 hover:bg-bg-2',
                                  'font-mono text-[12px] uppercase tracking-wide',
                                  'border-b border-border last:border-b-0',
                                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]',
                                ].join(' ')}
                              >
                                <Icon size={14} aria-hidden="true" />
                                <span>{a.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AgritechLayout>
        <AgritechNav />
      </IonContent>
    </IonPage>
  );
};

export default TruiesListView;
