import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Trophy } from 'lucide-react';

import Eyebrow from '../../components/design/Eyebrow';
import { SectionDivider } from '../../components/agritech';
import EmptyStateShared from '../../components/design/EmptyState';
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

const TIER_CLASSES: Record<Tier, string> = {
  ELITE: 'text-success bg-success/10',
  BON: 'text-accent bg-accent/10',
  MOYEN: 'text-text-1 bg-bg-1',
  FAIBLE: 'text-amber bg-amber/10',
  INSUFFISANT: 'text-red bg-red/10',
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
    <div className="flex flex-col gap-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Eyebrow customDotColor="var(--module-naissage)">Performance · Classement</Eyebrow>
        <h1 className="ft-heading text-[22px] uppercase tracking-tight text-text-0 flex items-center gap-2">
          <Trophy size={20} aria-hidden="true" className="text-accent" />
          Classement reproducteurs
        </h1>
        <p className="font-mono text-[12px] text-text-2">
          Top et flop des truies et verrats par score composite
        </p>
      </div>

      {/* ── Filtre type ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span
          id="classement-filter-label"
          className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-text-2"
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
                className={`pressable shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide border transition-colors flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
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
          className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-text-2"
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
                className={`pressable shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
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
            className="pressable inline-flex items-center gap-2 h-9 px-4 rounded-full bg-accent text-bg-0 font-mono text-[11px] font-medium uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
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

          {/* ── Desktop : table classique ─────────────────────── */}
          <div className="hidden sm:block card-dense !p-0 overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-bg-1 z-10">
                <tr className="border-b border-border">
                  <Th className="w-12 text-left">#</Th>
                  <Th className="text-left">Nom</Th>
                  <Th className="text-left">Type</Th>
                  <Th className="text-right">Score</Th>
                  <Th className="text-right">Portées</Th>
                  <Th className="text-right">Porcelets</Th>
                  <Th className="text-right">Réussite</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <RowDesktop
                    key={`${row.type}-${row.id}`}
                    row={row}
                    rank={idx + 1}
                    onClick={() => handleRowClick(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <th
    scope="col"
    className={`font-mono text-[10px] uppercase tracking-wide text-text-2 px-3 py-2 ${className}`}
  >
    {children}
  </th>
);

interface RowProps {
  row: ClassementRow;
  rank: number;
  onClick: () => void;
}

const TierBadge: React.FC<{ tier: Tier; score: number }> = ({ tier, score }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${TIER_CLASSES[tier]}`}
    aria-label={`Tier ${TIER_LABEL[tier]} score ${formatScore(score)}`}
  >
    <span>{TIER_LABEL[tier]}</span>
    <span className="tabular-nums">{formatScore(score)}</span>
  </span>
);

const TypeBadge: React.FC<{ type: ClassementRow['type'] }> = ({ type }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide border ${
      type === 'TRUIE'
        ? 'border-accent/30 text-accent bg-accent/5'
        : 'border-border text-text-1 bg-bg-1'
    }`}
  >
    {type === 'TRUIE' ? 'Truie' : 'Verrat'}
  </span>
);

const RowCardMobile: React.FC<RowProps> = ({ row, rank, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Rang ${rank} ${row.type === 'TRUIE' ? 'Truie' : 'Verrat'} ${row.displayId} score ${formatScore(row.score)}`}
    className="pressable w-full text-left flex flex-col gap-1.5 rounded-xl bg-bg-1 border border-border p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
  >
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono text-[11px] tabular-nums text-text-2 shrink-0">
        #{rank}
      </span>
      <TypeBadge type={row.type} />
      <span className="font-mono text-[13px] font-semibold text-text-0 tabular-nums truncate flex-1 min-w-0">
        {row.displayId}
      </span>
      <span className="shrink-0">
        <TierBadge tier={row.tier} score={row.score} />
      </span>
    </div>
    <div className="font-mono text-[11px] text-text-2 tabular-nums">
      {row.nbPortees} portée{row.nbPortees !== 1 ? 's' : ''} ·{' '}
      {formatPorcelets(row.porceletsMoyens)} porcelets ·{' '}
      {formatTaux(row.tauxReussite)} réussite
    </div>
  </button>
);

const RowDesktop: React.FC<RowProps> = ({ row, rank, onClick }) => (
  <tr
    role="button"
    tabIndex={0}
    aria-label={`Rang ${rank} ${row.type === 'TRUIE' ? 'Truie' : 'Verrat'} ${row.displayId}`}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    className="border-b border-border last:border-b-0 cursor-pointer hover:bg-bg-1/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
  >
    <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-text-2">
      #{rank}
    </td>
    <td className="px-3 py-2.5 font-mono text-[13px] font-semibold text-text-0 tabular-nums truncate max-w-[160px]">
      {row.displayId}
    </td>
    <td className="px-3 py-2.5">
      <TypeBadge type={row.type} />
    </td>
    <td className="px-3 py-2.5 text-right">
      <TierBadge tier={row.tier} score={row.score} />
    </td>
    <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-text-1 text-right">
      {row.nbPortees}
    </td>
    <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-text-1 text-right">
      {formatPorcelets(row.porceletsMoyens)}
    </td>
    <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-text-1 text-right">
      {formatTaux(row.tauxReussite)}
    </td>
  </tr>
);

export default ClassementView;
