import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus } from 'lucide-react';

import Eyebrow from '../../components/design/Eyebrow';
import EmptyState from '../../components/design/EmptyState';
import { AnimalListItem, type ChipTone } from '../../components/agritech';
import QuickAddLogeForm from '../../components/forms/QuickAddLogeForm';

import { listLoges, getLogeContents } from '../../services/supabaseWrites';
import type { Loge, LogeType } from '../../types/farm';

/**
 * TroupeauLogesListView — Liste plate des loges (référentiel V24).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Sub-tab "Loges" de `/troupeau` (remplace IsoBarn 3D dans le hub).
 *
 *   - Filtres par type (chips)
 *   - Liste cards via AnimalListItem (pattern V5-A)
 *   - Tap → navigate(`/troupeau/loges/:id`)
 *   - Bouton "+ Nouvelle loge" → QuickAddLogeForm
 *   - Empty state si 0 loges
 *
 * Charge les loges depuis Supabase (`listLoges`) et calcule l'occupation par
 * loge via `getLogeContents` (un appel par loge — acceptable pour <30 loges).
 */

const LOGE_TYPE_LABELS: Record<LogeType, string> = {
  MATERNITE: 'Maternité',
  POST_SEVRAGE: 'Post-sevrage',
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
  GESTANTE: 'Gestante',
  VERRAT: 'Verrat',
  INFIRMERIE: 'Infirmerie',
  AUTRE: 'Autre',
};

type FilterValue = 'ALL' | LogeType;

const FILTER_OPTIONS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'MATERNITE', label: 'Maternité' },
  { value: 'POST_SEVRAGE', label: 'Post-sev' },
  { value: 'CROISSANCE', label: 'Croissance' },
  { value: 'ENGRAISSEMENT', label: 'Engraissement' },
  { value: 'FINITION', label: 'Finition' },
  { value: 'GESTANTE', label: 'Gestante' },
  { value: 'VERRAT', label: 'Verrat' },
  { value: 'INFIRMERIE', label: 'Infirmerie' },
  { value: 'AUTRE', label: 'Autre' },
];

function occupationTone(occupation: number, capaciteMax?: number): ChipTone {
  if (capaciteMax === undefined || capaciteMax <= 0) return 'default';
  const ratio = occupation / capaciteMax;
  if (ratio >= 1) return 'red';
  if (ratio >= 0.8) return 'amber';
  return 'default';
}

interface LogeWithOccupation extends Loge {
  occupation: number;
}

const TroupeauLogesListView: React.FC = () => {
  const navigate = useNavigate();

  const [loges, setLoges] = useState<LogeWithOccupation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>('ALL');
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listLoges();
      const active = list.filter((l) => l.active);
      // Pour chaque loge active, calcule l'occupation totale (truies + verrats + porcelets)
      const enriched = await Promise.all(
        active.map(async (l) => {
          try {
            const c = await getLogeContents(l.id);
            return { ...l, occupation: c.totalAnimaux };
          } catch {
            return { ...l, occupation: 0 };
          }
        }),
      );
      setLoges(enriched);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo<LogeWithOccupation[]>(() => {
    if (filter === 'ALL') return loges;
    return loges.filter((l) => l.type === filter);
  }, [loges, filter]);

  const handleAddSuccess = useCallback(() => {
    setAddOpen(false);
    void refresh();
  }, [refresh]);

  return (
    <section
      role="region"
      aria-label="Liste des loges"
      className="flex flex-col gap-4"
      data-testid="troupeau-loges-list-view"
    >
      {/* ── En-tête + CTA ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow dotColor="accent">Loges · {loges.length}</Eyebrow>
          <p
            className="mt-1.5 text-[13px]"
            style={{ color: 'var(--muted)' }}
          >
            Référentiel des emplacements physiques.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Ajouter une nouvelle loge"
          className="pressable inline-flex items-center gap-2 h-10 px-4 rounded-full bg-accent text-bg-0 font-mono text-[12px] font-medium uppercase tracking-wide shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-opacity"
        >
          <Plus size={14} aria-hidden="true" />
          Nouvelle loge
        </button>
      </div>

      {/* ── Filtres par type ──────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Filtrer par type de loge"
        className="flex flex-wrap gap-2"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(opt.value)}
              className={[
                'pressable h-8 px-3 rounded-full font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors',
                active
                  ? 'bg-accent text-bg-0'
                  : 'bg-bg-1 border border-border text-text-1 hover:bg-bg-2',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* ── Liste / loading / empty ───────────────────────────────────── */}
      {loading ? (
        <div
          className="card-dense p-4 text-center"
          role="status"
          aria-live="polite"
        >
          <p
            className="font-mono text-[12px]"
            style={{ color: 'var(--muted)' }}
          >
            Chargement…
          </p>
        </div>
      ) : loges.length === 0 ? (
        <EmptyState
          icon={<Home size={28} aria-hidden="true" />}
          title="Aucune loge configurée"
          description="Configure tes loges pour activer le suivi des occupations et des mouvements."
          action={
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="pressable inline-flex items-center gap-2 h-11 px-5 rounded-full bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <Plus size={14} aria-hidden="true" />
              Créer la première loge
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div
          className="card-dense p-4 text-center"
          role="status"
        >
          <p
            className="font-mono text-[12px]"
            style={{ color: 'var(--muted)' }}
          >
            Aucune loge pour ce filtre.
          </p>
        </div>
      ) : (
        <div
          className="card-dense overflow-hidden"
          data-testid="loges-list"
        >
          {filtered.map((l) => {
            const cap = l.capaciteMax;
            const chipLabel = cap !== undefined
              ? `${l.occupation}/${cap}`
              : `${l.occupation}`;
            const tone = occupationTone(l.occupation, cap);
            const secondaryParts: string[] = [LOGE_TYPE_LABELS[l.type]];
            if (l.batiment) secondaryParts.push(l.batiment);
            return (
              <AnimalListItem
                key={l.id}
                primary={l.numero}
                secondary={secondaryParts.join(' · ')}
                chip={{ label: chipLabel, tone }}
                onClick={() => navigate(`/troupeau/loges/${l.id}`)}
                ariaLabel={`Loge ${l.numero}, ${LOGE_TYPE_LABELS[l.type]}, occupation ${chipLabel}`}
              />
            );
          })}
        </div>
      )}

      <QuickAddLogeForm
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </section>
  );
};

export default TroupeauLogesListView;
