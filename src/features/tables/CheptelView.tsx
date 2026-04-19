import React, { useState, useMemo } from 'react';
import {
  IonPage, IonContent,
  IonRefresher, IonRefresherContent,
} from '@ionic/react';
import { Search, ChevronRight, Tag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { Chip, SectionDivider } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { TruieIcon, VerratIcon } from '../../components/icons';
import { getStatusConfig } from '../../components/PremiumUI';
import { FARM_CONFIG } from '../../config/farm';

interface CheptelViewProps {
  /** Optional forced tab — used by the `/troupeau/truies` · `/troupeau/verrats` redirects. */
  initialTab?: 'TRUIE' | 'VERRAT';
}

type TabKey = 'TRUIE' | 'VERRAT';

/** Chip tone derived from the statut string. Mirrors TruiesListView's tone map
 *  with extra coverage for verrats (actif / inactif / réforme / mort). */
function toneForStatut(statut?: string): ChipTone {
  if (!statut) return 'default';
  const s = statut.toLowerCase();
  if (s.includes('pleine')) return 'accent';
  if (s.includes('mater') || s.includes('allait') || s.includes('lactation')) return 'gold';
  if (s.includes('surveill') || s.includes('réform') || s.includes('reforme')) return 'amber';
  if (s.includes('morte') || s.includes('mort'))                               return 'red';
  if (s.includes('inactif'))                                                   return 'default';
  if (s.includes('actif'))                                                     return 'accent';
  return 'default';
}

/** Skeleton row — dark. Module scope to avoid react-hooks/static-components. */
const SkeletonRow: React.FC = () => (
  <div
    className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0"
    aria-hidden="true"
  >
    <div className="h-10 w-10 rounded-md bg-bg-2 shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="h-[14px] w-2/3 rounded bg-bg-2" />
      <div className="h-[11px] w-1/2 rounded bg-bg-2" />
    </div>
    <div className="h-[18px] w-14 rounded bg-bg-2 shrink-0" />
  </div>
);

/** Empty state enrichi — icône custom + copy chaleureuse. */
const EmptyStateV2: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
}> = ({ icon, title, description }) => (
  <div
    className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up"
    role="status"
  >
    <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
      {icon}
    </div>
    <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
      {title}
    </h3>
    {description ? (
      <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
        {description}
      </p>
    ) : null}
  </div>
);

const CheptelView: React.FC<CheptelViewProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { truies, verrats, loading, refreshData } = useFarm();

  // Derive initial tab from explicit prop → URL query (?tab=verrat) → default TRUIE.
  const queryTab = new URLSearchParams(location.search).get('tab');
  const resolvedInitial: TabKey =
    initialTab ?? (queryTab === 'verrat' ? 'VERRAT' : 'TRUIE');
  const [tab, setTab] = useState<TabKey>(resolvedInitial);
  const [searchText, setSearchText] = useState('');

  const filteredItems = useMemo(() => {
    const list = tab === 'TRUIE' ? truies : verrats;
    const q = searchText.trim().toLowerCase();
    return list
      .filter(a => {
        if (!q) return true;
        const haystack = [
          a.id,
          a.displayId,
          a.nom || '',
          a.boucle || '',
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) =>
        a.displayId.localeCompare(b.displayId, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [truies, verrats, tab, searchText]);

  // Status groupings — memo'd so the label pipeline is not rerun on every keystroke.
  const truieStatGroups = useMemo(() => {
    const groups: Record<string, { count: number; tone: ChipTone }> = {};
    truies.forEach(t => {
      const key = getStatusConfig(t.statut).label;
      if (!groups[key]) groups[key] = { count: 0, tone: toneForStatut(t.statut) };
      groups[key].count += 1;
    });
    return groups;
  }, [truies]);

  const verratStatGroups = useMemo(() => {
    const groups: Record<string, { count: number; tone: ChipTone }> = {};
    verrats.forEach(v => {
      const key = v.statut || 'Actif';
      if (!groups[key]) groups[key] = { count: 0, tone: toneForStatut(v.statut) };
      groups[key].count += 1;
    });
    return groups;
  }, [verrats]);

  const currentGroups = tab === 'TRUIE' ? truieStatGroups : verratStatGroups;
  const groupsEntries: Array<[string, { count: number; tone: ChipTone }]> =
    Object.entries(currentGroups);

  const subtitle =
    tab === 'TRUIE'
      ? `${truies.length} truie${truies.length > 1 ? 's' : ''} · ${FARM_CONFIG.FARM_ID}`
      : `${verrats.length} verrat${verrats.length > 1 ? 's' : ''} · ${FARM_CONFIG.FARM_ID}`;

  const EmptyIcon = tab === 'TRUIE' ? TruieIcon : VerratIcon;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={(e) => refreshData().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader title="Cheptel" subtitle={subtitle}>
            {/* Search (dark) */}
            <label
              className="flex items-center gap-2 rounded-md border border-border bg-bg-1 px-3 py-2 focus-within:border-accent transition-colors"
            >
              <Search size={14} className="text-text-2 shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Chercher par nom, ID ou boucle..."
                aria-label="Rechercher un animal par nom, ID ou boucle"
                className="w-full bg-transparent border-none outline-none font-mono text-[13px] text-text-0 placeholder:text-text-2"
              />
            </label>

            {/* Custom pill ToggleGroup TRUIE / VERRAT */}
            <div
              role="tablist"
              aria-label="Type d'animal"
              className="mt-3 inline-flex w-full items-center gap-1 rounded-md border border-border bg-bg-1 p-1"
            >
              {(['TRUIE', 'VERRAT'] as const).map(key => {
                const isActive = tab === key;
                const Icon = key === 'TRUIE' ? TruieIcon : VerratIcon;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(key)}
                    className={[
                      'pressable flex-1 inline-flex items-center justify-center gap-2 rounded-sm px-3 py-1.5',
                      'transition-colors duration-150',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                      isActive
                        ? 'bg-accent text-bg-0'
                        : 'bg-transparent text-text-1 hover:bg-bg-2',
                    ].join(' ')}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wide">
                      {key === 'TRUIE' ? 'Truies' : 'Verrats'}
                    </span>
                  </button>
                );
              })}
            </div>
          </AgritechHeader>

          <div className="px-4 pt-4 pb-32 flex flex-col gap-4">
            {/* Statuts troupeau */}
            <section aria-label="Répartition des statuts">
              <SectionDivider
                label={tab === 'TRUIE' ? 'Statuts Troupeau' : 'Statuts Verrats'}
              />
              <div className="card-dense">
                {groupsEntries.length === 0 ? (
                  <p className="font-mono text-[12px] text-text-2">
                    {tab === 'TRUIE' ? 'Aucune truie enregistrée' : 'Aucun verrat enregistré'}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {groupsEntries.map(([label, { count, tone }]) => (
                      <div
                        key={label}
                        className="inline-flex items-baseline gap-2"
                      >
                        <span className="font-mono tabular-nums text-[18px] font-bold text-text-0">
                          {count}
                        </span>
                        <Chip label={label} tone={tone} size="xs" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Liste */}
            <SectionDivider
              label={
                tab === 'TRUIE'
                  ? `Truies · ${filteredItems.length}`
                  : `Verrats · ${filteredItems.length}`
              }
            />

            {loading && filteredItems.length === 0 ? (
              <div
                className="rounded-md border border-border bg-bg-1 overflow-hidden"
                role="status"
                aria-busy="true"
                aria-label="Chargement du cheptel"
              >
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : filteredItems.length === 0 ? (
              tab === 'TRUIE' ? (
                <EmptyStateV2
                  icon={<EmptyIcon size={48} />}
                  title="Aucune truie trouvée"
                  description={
                    searchText
                      ? "Modifiez la recherche ou vérifiez que Google Sheets est à jour."
                      : "Votre cheptel n'a pas encore de truies enregistrées."
                  }
                />
              ) : (
                <EmptyStateV2
                  icon={<EmptyIcon size={48} />}
                  title="Aucun verrat"
                  description={
                    searchText
                      ? "Modifiez la recherche ou vérifiez que Google Sheets est à jour."
                      : "Votre cheptel n'a pas encore de verrats enregistrés."
                  }
                />
              )
            ) : (
              <div
                role="list"
                aria-label={tab === 'TRUIE' ? 'Liste des truies' : 'Liste des verrats'}
                className="rounded-md border border-border bg-bg-1 overflow-hidden"
              >
                {filteredItems.map((item) => {
                  let gestPct: number | null = null;
                  if (tab === 'TRUIE' && item.dateMBPrevue && item.statut?.toUpperCase().includes('PLEINE')) {
                    try {
                      const parts = item.dateMBPrevue.split('/');
                      if (parts.length === 3) {
                        const mbDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
                        const gestStart = new Date(mbDate.getTime() - 115 * 86400000);
                        const now = new Date();
                        const elapsed = (now.getTime() - gestStart.getTime()) / 86400000;
                        gestPct = Math.min(100, Math.max(0, Math.round(elapsed / 115 * 100)));
                      }
                    } catch {
                      /* parse error ignored */
                    }
                  }

                  const secondaryText = tab === 'TRUIE'
                    ? ((item as { stade?: string }).stade ?? '')
                    : ((item as { origine?: string }).origine ?? '');
                  const secondaryBits = [secondaryText, item.ration ? `${item.ration}kg` : null]
                    .filter(Boolean)
                    .join(' · ');

                  const Icon = tab === 'TRUIE' ? TruieIcon : VerratIcon;
                  const destination = tab === 'TRUIE'
                    ? `/cheptel/truie/${item.id}`
                    : `/cheptel/verrat/${item.id}`;

                  return (
                    <div role="listitem" key={item.id}>
                      <button
                        type="button"
                        onClick={() => navigate(destination)}
                        aria-label={`Ouvrir la fiche de ${item.nom || item.displayId}`}
                        className={[
                          'data-row pressable flex w-full items-center gap-3 px-3 py-3 text-left',
                          'border-b border-border last:border-b-0',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]',
                        ].join(' ')}
                      >
                        {/* Avatar icon + displayId badge */}
                        <div className="relative shrink-0">
                          <div className="h-10 w-10 rounded-md bg-bg-2 border border-border flex items-center justify-center">
                            <Icon size={20} className="text-text-1" />
                          </div>
                          <span
                            className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-sm bg-accent text-bg-0 font-mono font-semibold text-[9px] tabular-nums shadow-sm"
                          >
                            {item.displayId}
                          </span>
                        </div>

                        {/* Main info */}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-text-0">
                            {item.nom || `Sujet ${item.displayId}`}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 min-w-0">
                            {item.boucle ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-text-2 truncate">
                                <Tag size={10} className="text-accent shrink-0" aria-hidden="true" />
                                B.{item.boucle}
                              </span>
                            ) : null}
                            {secondaryBits ? (
                              <span className="font-mono text-[11px] text-text-2 truncate">
                                {secondaryBits}
                              </span>
                            ) : null}
                          </div>
                          {gestPct !== null ? (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-bg-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-accent rounded-full transition-[width]"
                                  style={{ width: `${gestPct}%` }}
                                />
                              </div>
                              <span className="font-mono tabular-nums text-[11px] font-semibold text-accent">
                                {gestPct}%
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {/* Status chip + chevron */}
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <Chip
                            label={getStatusConfig(item.statut).label || item.statut || '—'}
                            tone={toneForStatut(item.statut)}
                            size="xs"
                          />
                          <ChevronRight
                            size={14}
                            className="text-text-2"
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default CheptelView;
