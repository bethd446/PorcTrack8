/**
 * PendingBandesBanner — Onboarding forcé V26-FORM.
 * ════════════════════════════════════════════════════════════════════════
 * Affiche un banner haut de page tant qu'il reste des bandes
 * `validation_status='PENDING'` pour la ferme courante.
 *
 * Tap → ouvre QuickAddBandeFromLogeForm en mode édition sur la 1ère PENDING.
 * Au submit du form, la bande passe à VALIDATED et le banner se réactualise.
 *
 * Hook custom exposé pour les tests : `usePendingBandes()`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { supabase } from '../../services/supabaseClient';
import QuickAddBandeFromLogeForm from '../forms/QuickAddBandeFromLogeForm';

// ─── Hook : count des bandes PENDING ─────────────────────────────────────────

export interface PendingBandesState {
  count: number;
  firstPendingId: string | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * Détecte si une bande est mâle.
 * Convention christophe : code_id = `B-YYYYMMDD-{loge}{M|F}` (ex L3M, QM, L5RM).
 * Le dernier caractère encode le sexe : M = mâle, F = femelle.
 * Exporté pour tests.
 */
export function isMaleBatch(code_id: string | null | undefined): boolean {
  if (!code_id) return false;
  return code_id.trim().toUpperCase().endsWith('M');
}

/**
 * Trie les bandes : MÂLES d'abord, puis FEMELLES, puis ordre alphabétique
 * sur le code_id. Demande métier christophe — ordre carnet papier.
 */
export function sortBandesPendingMaleFirst<T extends { code_id?: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const am = isMaleBatch(a.code_id);
    const bm = isMaleBatch(b.code_id);
    if (am && !bm) return -1;
    if (!am && bm) return 1;
    return (a.code_id ?? '').localeCompare(b.code_id ?? '');
  });
}

/**
 * Hook qui interroge Supabase pour récupérer la liste des bandes
 * `validation_status='PENDING'` pour la ferme courante (RLS filtre déjà par
 * farm_id côté serveur). Tri MÂLES en premier puis FEMELLES (demande métier).
 * Retourne l'ID de la 1ère pour l'ouvrir au tap.
 */
export function usePendingBandes(): PendingBandesState {
  const [count, setCount] = useState(0);
  const [firstPendingId, setFirstPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('batches') as any)
          .select('id, code_id')
          .eq('validation_status', 'PENDING');
        if (cancelled) return;
        if (error || !Array.isArray(data)) {
          setCount(0);
          setFirstPendingId(null);
        } else {
          const sorted = sortBandesPendingMaleFirst(
            data as Array<{ id: string; code_id?: string | null }>,
          );
          setCount(sorted.length);
          setFirstPendingId(sorted[0]?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setCount(0);
          setFirstPendingId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { count, firstPendingId, loading, refresh };
}

// ─── Banner ──────────────────────────────────────────────────────────────────

interface PendingBandesBannerProps {
  /** Override pour les tests : injecte un state custom au lieu de fetcher. */
  injectedState?: PendingBandesState;
}

const PendingBandesBanner: React.FC<PendingBandesBannerProps> = ({ injectedState }) => {
  const realState = usePendingBandes();
  const state = injectedState ?? realState;
  const [editOpen, setEditOpen] = useState(false);

  const handleOpen = (): void => {
    if (state.firstPendingId) setEditOpen(true);
  };

  if (state.loading || state.count === 0) return null;

  const label = `${state.count} bande${state.count > 1 ? 's' : ''} à valider`;

  return (
    <>
      <div
        role="alert"
        aria-live="polite"
        data-testid="pending-bandes-banner"
        className="px-4 pt-3"
      >
        <button
          type="button"
          onClick={handleOpen}
          className="pressable w-full flex items-center justify-between gap-3 px-3 py-3 rounded-md border border-amber bg-amber/10 hover:bg-amber/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2"
          aria-label={`${label} — clique pour compléter`}
          data-testid="pending-bandes-banner-cta"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle size={18} className="text-amber shrink-0" aria-hidden="true" />
            <div className="flex flex-col min-w-0 text-left">
              <span className="font-mono text-[12px] font-bold uppercase tracking-wide text-amber">
                {label}
              </span>
              <span className="font-mono text-[11px] text-text-1">
                Clique pour compléter les informations manquantes.
              </span>
            </div>
          </div>
          <span
            className="font-mono text-[10px] uppercase tracking-wide text-amber"
            aria-hidden="true"
          >
            Compléter →
          </span>
        </button>
      </div>

      {state.firstPendingId ? (
        <QuickAddBandeFromLogeForm
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            state.refresh();
          }}
          editPendingBatchId={state.firstPendingId}
        />
      ) : null}
    </>
  );
};

export default PendingBandesBanner;
