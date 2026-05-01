import React, { useEffect, useMemo, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import type { ColumnDef } from '@tanstack/react-table';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { Chip, SectionDivider } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { DataTable } from '../../components/ui/data-table';
import type { Truie } from '../../types/farm';
import { FARM_CONFIG } from '../../config/farm';
import { normaliseStatut } from '../../lib/truieStatut';

/** Filter bucket keys. `all` shows every truie. */
type FilterKey = 'all' | 'pleine' | 'maternite' | 'attente' | 'surveiller';

interface FilterDef {
  key: FilterKey;
  label: string;
  match: (t: Truie) => boolean;
}

const FILTERS: FilterDef[] = [
  { key: 'all',         label: 'Toutes',        match: () => true },
  { key: 'pleine',      label: 'Pleines',       match: (t) => normaliseStatut(t.statut) === 'PLEINE' },
  { key: 'maternite',   label: 'Maternité',     match: (t) => normaliseStatut(t.statut) === 'MATERNITE' },
  { key: 'attente',     label: 'En attente',    match: (t) => normaliseStatut(t.statut) === 'VIDE' },
  { key: 'surveiller',  label: 'À surveiller',  match: (t) => {
    const c = normaliseStatut(t.statut);
    return c === 'SURVEILLANCE' || c === 'REFORME';
  } },
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
  switch (normaliseStatut(statut)) {
    case 'PLEINE':       return 'accent';
    case 'MATERNITE':    return 'gold';
    case 'SURVEILLANCE': return 'amber';
    case 'REFORME':      return 'amber';
    case 'FLUSHING':     return 'amber';
    case 'CHALEUR':      return 'coral';
    case 'VIDE':
    case 'INCONNU':
    default:             return 'default';
  }
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
  const isMater = normaliseStatut(t.statut) === 'MATERNITE';
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
  const [lastInitialFilter, setLastInitialFilter] = useState<FilterKey>(initialFilter);

  // Keep local filter in sync if the URL changes (e.g. second tap on pipeline)
  // Render-time sync — avoids cascading renders from setState-in-effect.
  if (lastInitialFilter !== initialFilter) {
    setLastInitialFilter(initialFilter);
    setFilter(initialFilter);
  }

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

  const activeFilter = useMemo(
    () => FILTERS.find(f => f.key === filter) ?? FILTERS[0],
    [filter]
  );

  // Filtrage par statut (search + tri gérés par DataTable / TanStack)
  const filteredTruies = useMemo(() => {
    return truies
      .filter(activeFilter.match)
      .sort((a, b) =>
        a.displayId.localeCompare(b.displayId, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [truies, activeFilter]);

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

  const columns = useMemo<ColumnDef<Truie>[]>(() => [
    {
      accessorKey: 'displayId',
      header: 'Code',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'DMMono, ui-monospace, monospace', fontSize: 12 }}>
          {row.original.displayId}
        </span>
      ),
    },
    {
      accessorKey: 'nom',
      header: 'Nom',
      cell: ({ row }) => row.original.nom ?? '—',
    },
    {
      accessorKey: 'boucle',
      header: 'Boucle',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'DMMono, ui-monospace, monospace', fontSize: 12 }}>
          {row.original.boucle ? `B.${row.original.boucle}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'race',
      header: 'Race',
      cell: ({ row }) => row.original.race ?? '—',
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: ({ row }) => (
        <Chip label={row.original.statut} tone={toneForStatut(row.original.statut)} size="xs" />
      ),
    },
    {
      accessorKey: 'nbPortees',
      header: 'Parité',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'DMMono, ui-monospace, monospace', fontSize: 12 }}>
          {row.original.nbPortees ?? 0}
        </span>
      ),
    },
    {
      accessorKey: 'dateMBPrevue',
      header: 'MB prévue',
      cell: ({ row }) => {
        const e = echeanceFor(row.original);
        return e ? <Chip label={e.label} tone={e.tone} size="xs" /> : '—';
      },
    },
  ], []);

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

            <DataTable<Truie, unknown>
              columns={columns}
              data={filteredTruies}
              searchColumn="displayId"
              searchPlaceholder="Rechercher par code..."
              emptyMessage={
                loading
                  ? 'Chargement...'
                  : filter !== 'all'
                    ? `Aucune truie · filtre ${activeFilter.label}`
                    : 'Aucune truie'
              }
              onRowClick={(t) => navigate(`/troupeau/truies/${t.id}`)}
            />
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default TruiesListView;
