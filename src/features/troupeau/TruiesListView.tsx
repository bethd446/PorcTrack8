import React, { useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import { DataRow, Chip, SectionDivider } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { TruieIcon } from '../../components/icons';
import type { Truie } from '../../types/farm';

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

/**
 * TruiesListView — liste dense des truies (Agritech cockpit).
 *
 * N.B. Ce composant coexiste avec `CheptelView` qui reste monté sur `/cheptel`.
 * Monté sur `/troupeau/truies`.
 */
const TruiesListView: React.FC = () => {
  const navigate = useNavigate();
  const { truies, loading, refreshData } = useFarm();

  const [filter, setFilter]       = useState<FilterKey>('all');
  const [searchText, setSearchText] = useState('');

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

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader
            title="Truies"
            subtitle={`${truies.length} actives · A130`}
            backTo="/troupeau"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Filter bar (horizontal scroll) */}
            <div
              className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1"
              role="group"
              aria-label="Filtres statut"
              style={{ scrollbarWidth: 'none' }}
            >
              {FILTERS.map(f => {
                const count = f.key === 'all'
                  ? truies.length
                  : truies.filter(f.match).length;
                const isActive = f.key === filter;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    aria-pressed={isActive}
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
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <TruieIcon size={48} className="text-text-2" />
                <p className="text-[14px] font-medium text-text-1">
                  Aucune truie trouvée
                </p>
                {searchText || filter !== 'all' ? (
                  <p className="font-mono text-[11px] text-text-2">
                    Essayez d'élargir les filtres
                  </p>
                ) : null}
              </div>
            ) : (
              <div
                role="list"
                aria-label="Liste des truies"
                className="rounded-md border border-border bg-bg-1 overflow-hidden"
              >
                {filteredTruies.map(t => {
                  const boucle = t.boucle ? `B.${t.boucle}` : '—';
                  const namePart = t.nom ? ` ${t.nom}` : '';
                  const primary = `${boucle} · ${t.displayId}${namePart}`;

                  const secondaryParts: string[] = [t.statut];
                  if (t.dateMBPrevue) {
                    secondaryParts.push(`MB prév. ${t.dateMBPrevue}`);
                  }
                  if (t.ration) {
                    secondaryParts.push(`${t.ration}kg`);
                  }
                  const secondary = secondaryParts.join(' · ');

                  return (
                    <div role="listitem" key={t.id}>
                      <DataRow
                        primary={primary}
                        secondary={secondary}
                        accessory={
                          <Chip
                            label={t.statut}
                            tone={toneForStatut(t.statut)}
                            size="xs"
                          />
                        }
                        onClick={() => navigate(`/troupeau/truies/${t.id}`)}
                      />
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
