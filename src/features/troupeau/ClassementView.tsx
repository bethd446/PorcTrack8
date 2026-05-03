import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { Award } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import TopBarSync from '../../components/design/TopBarSync';
import { SectionDivider } from '../../components/agritech';
import EmptyStateShared from '../../components/design/EmptyState';
import { Tag, DataTable, PageHeader } from '../../design-system';
import { useFarm } from '../../context/FarmContext';
import {
  buildClassementRows,
  type ClassementRow,
  type ClassementSortBy,
} from '../../services/reproducteursClassement';

type FilterKey = 'TOUS' | 'TRUIE' | 'VERRAT';

type Tier = ClassementRow['tier'];

interface FilterOption {
  id: FilterKey;
  label: string;
}

interface SortOption {
  id: ClassementSortBy;
  label: string;
}

const FILTERS: ReadonlyArray<FilterOption> = [
  { id: 'TOUS', label: 'Tous' },
  { id: 'TRUIE', label: 'Truies' },
  { id: 'VERRAT', label: 'Verrats' },
];

const SORTS: ReadonlyArray<SortOption> = [
  { id: 'score', label: 'Score' },
  { id: 'tauxReussite', label: 'Réussite' },
  { id: 'nbPortees', label: 'Portées' },
  { id: 'porceletsMoyens', label: 'Porcelets' },
];

type TagVariant = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning';
const TIER_VARIANTS: Record<Tier, TagVariant> = {
  ELITE: 'primary',
  BON: 'accent',
  MOYEN: 'soft',
  FAIBLE: 'warning',
  INSUFFISANT: 'danger',
};

const TIER_LABEL: Record<Tier, string> = {
  ELITE: 'Élite',
  BON: 'Bon',
  MOYEN: 'Moyen',
  FAIBLE: 'Faible',
  INSUFFISANT: 'Insuf.',
};

function formatScore(score: number): string {
  return Number.isFinite(score) ? Math.round(score).toString() : '—';
}

function formatPorcelets(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : '—';
}

function formatTaux(t: number): string {
  return Number.isFinite(t) ? `${Math.round(t)}%` : '—';
}

const ClassementView: React.FC = () => {
  const navigate = useNavigate();
  const { truies, verrats, bandes, saillies } = useFarm();

  const [filter, setFilter] = useState<FilterKey>('TOUS');
  const [sortBy, setSortBy] = useState<ClassementSortBy>('score');

  const rows = useMemo<ClassementRow[]>(
    () => buildClassementRows({ truies, verrats, bandes, saillies, filter, sortBy }),
    [truies, verrats, bandes, saillies, filter, sortBy],
  );

  const counts = useMemo(() => {
    const all = buildClassementRows({
      truies,
      verrats,
      bandes,
      saillies,
      filter: 'TOUS',
      sortBy,
    });
    return {
      TOUS: all.length,
      TRUIE: all.filter((r) => r.type === 'TRUIE').length,
      VERRAT: all.filter((r) => r.type === 'VERRAT').length,
    } as Record<FilterKey, number>;
  }, [truies, verrats, bandes, saillies, sortBy]);

  const handleRowClick = (row: ClassementRow): void => {
    navigate(row.href);
  };

  const handleResetFilters = (): void => {
    setFilter('TOUS');
    setSortBy('score');
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <TopBarSync
            crumbs={['Performance', 'Classement']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />
          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-5"
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            <div className="flex flex-col gap-4">
      {/* V41 Phase C3 — Header sobre via PageHeader (eyebrow + h1 + subtitle 1 ligne) */}
      <PageHeader
        eyebrow="Pilotage · Classement"
        title="Classement reproducteurs"
        subtitle="Top et flop par score composite"
      />

      {/* ── Filtre type ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span
          id="classement-filter-label"
          className="shrink-0 text-[10px] uppercase tracking-wide text-text-2"
        >
          Type
        </span>
        <div
          role="radiogroup"
          aria-labelledby="classement-filter-label"
          className="flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Filtrer par ${f.label}`}
                onClick={() => setFilter(f.id)}
                className={`pressable shrink-0 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-wide border transition-colors flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  active
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-transparent border-border text-text-1 hover:text-text-0'
                }`}
              >
                {f.label}
                <span
                  className={`text-[10px] tabular-nums ${active ? 'text-accent/70' : 'text-text-2'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tri ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span
          id="classement-sort-label"
          className="shrink-0 text-[10px] uppercase tracking-wide text-text-2"
        >
          Trier par
        </span>
        <div
          role="radiogroup"
          aria-labelledby="classement-sort-label"
          className="flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {SORTS.map((s) => {
            const active = sortBy === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Trier par ${s.label}`}
                onClick={() => setSortBy(s.id)}
                className={`pressable shrink-0 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-wide border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  active
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-transparent border-border text-text-1 hover:text-text-0'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Compteur ───────────────────────────────────────────── */}
      <SectionDivider
        label={`${rows.length} reproducteur${rows.length !== 1 ? 's' : ''}`}
      />

      {/* ── Empty state ────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <EmptyStateShared
            size="sm"
            icon={<Award size={20} aria-hidden="true" />}
            title="Aucun reproducteur"
            description="Aucun reproducteur correspondant au filtre."
          />
          <button
            type="button"
            onClick={handleResetFilters}
            className="pressable inline-flex items-center gap-2 h-9 px-4 rounded-full bg-accent text-bg-0 text-[11px] font-medium uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Réinitialiser filtres
          </button>
        </div>
      ) : (
        <>
          {/* ── Mobile : cartes empilées ──────────────────────── */}
          <ul
            role="list"
            aria-label="Classement reproducteurs (mobile)"
            className="flex flex-col gap-2 sm:hidden"
          >
            {rows.map((row, idx) => (
              <li key={`${row.type}-${row.id}`} role="listitem">
                <RowCardMobile
                  row={row}
                  rank={idx + 1}
                  onClick={() => handleRowClick(row)}
                />
              </li>
            ))}
          </ul>

          {/* V40 C1 — Desktop : <DataTable> du DS V2 */}
          <div className="hidden sm:block">
            <DataTable<ClassementRow & { rank: number }>
              ariaLabel="Classement reproducteurs"
              columns={[
                { key: 'rank', label: '#', width: 48, render: (row) => <span className="tabular-nums" style={{ color: 'var(--pt-text-subtle)' }}>#{row.rank}</span> },
                { key: 'displayId', label: 'Nom', render: (row) => <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--pt-text)' }}>{row.displayId}</span> },
                { key: 'type', label: 'Type', render: (row) => <TypeBadge type={row.type} /> },
                { key: 'score', label: 'Score', render: (row) => <TierBadge tier={row.tier} score={row.score} /> },
                { key: 'nbPortees', label: 'Portées', render: (row) => <span className="tabular-nums">{row.nbPortees}</span> },
                { key: 'porceletsMoyens', label: 'Porcelets', render: (row) => <span className="tabular-nums">{formatPorcelets(row.porceletsMoyens)}</span> },
                { key: 'tauxReussite', label: 'Réussite', render: (row) => <span className="tabular-nums">{formatTaux(row.tauxReussite)}</span> },
              ]}
              rows={rows.map((r, idx) => ({ ...r, id: `${r.type}-${r.id}`, rank: idx + 1 }))}
              onRowClick={(row) => handleRowClick(row)}
            />
          </div>
        </>
      )}
            </div>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────
// V41 Phase C3 : <Th> et <RowDesktop> supprimés (V40 a déjà migré la table
// desktop vers <DataTable> du DS V2).

interface RowProps {
  row: ClassementRow;
  rank: number;
  onClick: () => void;
}

const TierBadge: React.FC<{ tier: Tier; score: number }> = ({ tier, score }) => (
  <span aria-label={`Tier ${TIER_LABEL[tier]} score ${formatScore(score)}`}>
    <Tag variant={TIER_VARIANTS[tier]}>
      {TIER_LABEL[tier]} <span className="tabular-nums">{formatScore(score)}</span>
    </Tag>
  </span>
);

const TypeBadge: React.FC<{ type: ClassementRow['type'] }> = ({ type }) => (
  <Tag variant={type === 'TRUIE' ? 'soft' : 'default'}>
    {type === 'TRUIE' ? 'Truie' : 'Verrat'}
  </Tag>
);

const RowCardMobile: React.FC<RowProps> = ({ row, rank, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Rang ${rank} ${row.type === 'TRUIE' ? 'Truie' : 'Verrat'} ${row.displayId} score ${formatScore(row.score)}`}
    className="pressable w-full text-left flex flex-col gap-1.5 rounded-xl bg-bg-1 border border-border p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
  >
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] tabular-nums text-text-2 shrink-0">
        #{rank}
      </span>
      <TypeBadge type={row.type} />
      <span className="text-[13px] font-semibold text-text-0 tabular-nums truncate flex-1 min-w-0">
        {row.displayId}
      </span>
      <span className="shrink-0">
        <TierBadge tier={row.tier} score={row.score} />
      </span>
    </div>
    <div className="text-[11px] text-text-2 tabular-nums">
      {row.nbPortees} portée{row.nbPortees !== 1 ? 's' : ''} ·{' '}
      {formatPorcelets(row.porceletsMoyens)} porcelets ·{' '}
      {formatTaux(row.tauxReussite)} réussite
    </div>
  </button>
);

// V41 Phase C3 : RowDesktop supprimé (DataTable du DS V2 prend le relais).

export default ClassementView;
