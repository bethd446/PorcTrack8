/**
 * TroupeauHub — /troupeau (tab 02)
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte Claude Design v2 (2026-04-20) — "Troupeau" de la bottom nav.
 *
 * Structure (mockup 02-troupeau) :
 *   1. Header
 *   2. Barre de recherche (ID truie)
 *   3. Segmented filters scrollables (TOUT · PLEINES · MATERNITÉ · VIDES · RÉFORME)
 *   4. SectionDivider "{N} TRUIES"
 *   5. Liste DataRow (icône TruieIcon + ID + meta + chip statut)
 *
 * Accès Verrats / Bandes → via HubTile Cockpit (Mon élevage).
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { Search, Users } from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { TruieIcon } from '../../components/icons';
import { Chip, SectionDivider, type ChipTone } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import type { Truie } from '../../types/farm';
import { normaliseStatut } from '../../lib/truieStatut';
import { isArchivedTruie } from '../../lib/truieHelpers';

// ─── Filters ────────────────────────────────────────────────────────────────

type FilterKey = 'tout' | 'pleines' | 'maternite' | 'vides' | 'reforme';

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
      return { label: 'Chaleur', tone: 'coral', filter: 'vides' };
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
  return t.stade || t.statut || '—';
}

// ─── Composant ──────────────────────────────────────────────────────────────

const TroupeauHub: React.FC = () => {
  const navigate = useNavigate();
  const { truies } = useFarm();

  const [filter, setFilter] = useState<FilterKey>('tout');
  const [searchText, setSearchText] = useState('');

  const today = useMemo(() => new Date(), []);

  /**
   * Liste des truies ACTIVES uniquement.
   *
   * Les IDs réformés (T08, T17 — cf. `ARCHIVED_TRUIE_IDS` dans
   * `src/lib/truieHelpers.ts`) ne sont plus sur le site mais restent
   * référencés dans l'historique repro (feuille `SUIVI_REPRODUCTION_ACTUEL`
   * et dérivées). Il ne faut PAS les afficher dans la liste du troupeau
   * ni les compter dans le total du header / des segments — sinon on
   * voit "19 truies" au lieu des 17 réellement en élevage.
   *
   * On filtre ici, en amont de tout (search, statut, compteurs), pour que
   * TOUTES les vues dérivées soient cohérentes.
   */
  const activeTruies = useMemo(
    () => truies.filter((t) => !isArchivedTruie(t.id)),
    [truies],
  );

  // Filtrage + recherche
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return activeTruies.filter((t) => {
      const v = statutVisu(t.statut);
      if (filter !== 'tout' && v.filter !== filter) return false;
      if (q) {
        const id = (t.displayId || t.id || '').toLowerCase();
        if (!id.includes(q)) return false;
      }
      return true;
    });
  }, [activeTruies, filter, searchText]);

  // Compteurs par filter bucket
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      tout: activeTruies.length,
      pleines: 0,
      maternite: 0,
      vides: 0,
      reforme: 0,
    };
    for (const t of activeTruies) {
      const v = statutVisu(t.statut);
      if (v.filter !== 'tout') c[v.filter] += 1;
    }
    return c;
  }, [activeTruies]);

  const FILTERS: ReadonlyArray<{ id: FilterKey; label: string }> = [
    { id: 'tout', label: 'Tout' },
    { id: 'pleines', label: 'Pleines' },
    { id: 'maternite', label: 'Maternité' },
    { id: 'vides', label: 'Vides' },
    { id: 'reforme', label: 'Réforme' },
  ];

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="TROUPEAU"
            subtitle={`${activeTruies.length} truie${activeTruies.length > 1 ? 's' : ''} · ferme K13`}
          />

          <div className="px-4 pt-3 pb-32 flex flex-col gap-4">
            {/* ── Recherche ID truie ──────────────────────────────────── */}
            <div className="relative">
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="ID truie…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                aria-label="Rechercher une truie"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-bg-2 border border-border font-mono text-[13px] text-text-0 placeholder:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none"
                aria-hidden="true"
              />
            </div>

            {/* ── Segmented filters (scrollable) ──────────────────────── */}
            <div
              role="tablist"
              aria-label="Filtrer par statut"
              className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide"
            >
              {FILTERS.map((f) => {
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
                    <span className={`text-[10px] tabular-nums ${active ? 'text-teal/70' : 'text-text-2'}`}>
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

            {/* ── Liste ───────────────────────────────────────────────── */}
            {filtered.length === 0 ? (
              <EmptyState hasSearch={searchText.trim().length > 0} />
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
                    <li key={t.id} role="listitem">
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
                  );
                })}
              </ul>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

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

export default TroupeauHub;
