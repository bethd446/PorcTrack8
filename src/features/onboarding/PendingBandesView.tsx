/**
 * PendingBandesView — Écran V27-VALIDATION.
 * ════════════════════════════════════════════════════════════════════════
 * Liste TOUTES les bandes `validation_status='PENDING'` de la ferme courante,
 * triées MÂLES d'abord puis FEMELLES (demande métier christophe — ordre
 * carnet papier). Chaque row est tappable pour ouvrir
 * `QuickAddBandeFromLogeForm` en mode édition. Bouton bulk "Valider toutes
 * (avec valeurs actuelles)" qui passe toutes les bandes à VALIDATED en un
 * clic après confirmation.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react';

import { supabase } from '../../services/supabaseClient';
import {
  isMaleBatch,
  sortBandesPendingMaleFirst,
} from '../../components/onboarding/PendingBandesBanner';
import QuickAddBandeFromLogeForm from '../../components/forms/QuickAddBandeFromLogeForm';
import AnimalListItem from '../../components/agritech/AnimalListItem';
import type { ChipTone } from '../../components/agritech/Chip';
import { Button, PageHeader } from '@/design-system';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PendingBandeRow {
  id: string;
  code_id: string | null;
  phase: string | null;
  statut: string | null;
  loge_id: string | null;
  loge_numero?: string | null;
  porcelets_nes_vivants: number | null;
  poids_moyen_kg: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function phaseTone(phase: string | null | undefined): ChipTone {
  if (!phase) return 'default';
  const p = phase.toUpperCase();
  if (p.includes('MATERN')) return 'coral';
  if (p.includes('SEVRAGE') || p.includes('POST')) return 'teal';
  if (p.includes('CROISS')) return 'sage';
  if (p.includes('ENGRAIS') || p.includes('FINITION')) return 'amber';
  if (p.includes('GESTATION')) return 'blue';
  return 'default';
}

function phaseLabel(phase: string | null | undefined): string {
  if (!phase) return '—';
  return phase.replace(/_/g, ' ').toLowerCase();
}

// ─── Hook : fetch bandes PENDING ─────────────────────────────────────────────

interface UsePendingBandesListState {
  rows: PendingBandeRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePendingBandesList(): UsePendingBandesListState {
  const [rows, setRows] = useState<PendingBandeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: err } = await (supabase.from('batches') as any)
          .select(
            'id, code_id, phase, statut, loge_id, porcelets_nes_vivants, poids_moyen_kg',
          )
          .eq('validation_status', 'PENDING');
        if (cancelled) return;
        if (err || !Array.isArray(data)) {
          setRows([]);
          setError(err?.message ?? null);
        } else {
          // Récupère les numéros de loge en une 2e requête (best-effort).
          const logeIds = Array.from(
            new Set(
              (data as PendingBandeRow[])
                .map(r => r.loge_id)
                .filter((x): x is string => !!x),
            ),
          );
          let logeMap = new Map<string, string>();
          if (logeIds.length > 0) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fromAny = supabase.from as any;
              const { data: logesData } = await fromAny('loges')
                .select('id, numero')
                .in('id', logeIds);
              if (Array.isArray(logesData)) {
                logeMap = new Map(
                  (logesData as Array<{ id: string; numero: string }>).map(l => [
                    l.id,
                    l.numero,
                  ]),
                );
              }
            } catch {
              /* noop — best-effort */
            }
          }
          const enriched = (data as PendingBandeRow[]).map(r => ({
            ...r,
            loge_numero: r.loge_id ? logeMap.get(r.loge_id) ?? null : null,
          }));
          setRows(sortBandesPendingMaleFirst(enriched));
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { rows, loading, error, refresh };
}

// ─── Bulk validate ───────────────────────────────────────────────────────────

async function bulkValidate(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('batches') as any)
    .update({ validation_status: 'VALIDATED' })
    .in('id', ids);
  if (error) throw new Error(error.message);
}

// ─── Sub-component : section ─────────────────────────────────────────────────

interface PendingBandesSectionProps {
  title: string;
  rows: PendingBandeRow[];
  badge: 'M' | 'F';
  onTap: (id: string) => void;
}

const PendingBandesSection: React.FC<PendingBandesSectionProps> = ({
  title,
  rows,
  badge,
  onTap,
}) => {
  if (rows.length === 0) return null;
  return (
    <section
      aria-label={title}
      className="space-y-2"
      data-testid={`pending-section-${badge}`}
    >
      <h2 className="text-[11px] uppercase tracking-wide text-text-2 px-3 pt-2">
        {title} ({rows.length})
      </h2>
      <ul className="card-dense !p-0 overflow-hidden divide-y divide-border">
        {rows.map(r => {
          const code = r.code_id ?? '—';
          const eff = r.porcelets_nes_vivants ?? null;
          const poids = r.poids_moyen_kg ?? null;
          const loge = r.loge_numero ?? null;
          const meta = [
            eff != null ? `${eff} porc.` : null,
            poids != null ? `${poids} kg` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={r.id} data-testid={`pending-row-${r.id}`}>
              <AnimalListItem
                avatar={
                  <span
                    className={[
                      'text-[12px] font-bold',
                      badge === 'M' ? 'text-blue' : 'text-coral',
                    ].join(' ')}
                    aria-label={badge === 'M' ? 'Mâles' : 'Femelles'}
                  >
                    {badge}
                  </span>
                }
                primary={code}
                secondary={loge ? `Loge ${loge}` : 'Loge à choisir'}
                meta={meta || undefined}
                chip={{
                  label: phaseLabel(r.phase),
                  tone: phaseTone(r.phase),
                }}
                accessory={
                  <ChevronRight size={16} className="text-text-2" aria-hidden="true" />
                }
                onClick={() => onTap(r.id)}
                ariaLabel={`Compléter la bande ${code}`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

export interface PendingBandesViewProps {
  /** Override pour les tests : injecte un state custom au lieu de fetcher. */
  injectedState?: UsePendingBandesListState;
}

const PendingBandesView: React.FC<PendingBandesViewProps> = ({ injectedState }) => {
  const navigate = useNavigate();
  const realState = usePendingBandesList();
  const state = injectedState ?? realState;
  const { rows, loading, error, refresh } = state;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const males = rows.filter(r => isMaleBatch(r.code_id));
  const females = rows.filter(r => !isMaleBatch(r.code_id));

  const handleBack = (): void => {
    navigate(-1);
  };

  const handleBulkValidate = async (): Promise<void> => {
    setBulkSaving(true);
    setBulkError(null);
    try {
      await bulkValidate(rows.map(r => r.id));
      setBulkOpen(false);
      refresh();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : String(e));
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-bg-0 pb-24"
      data-testid="pending-bandes-view"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-0 border-b border-border px-3 py-3 flex items-start gap-2">
        <Button
          variant="ghost"
          size="small"
          onClick={handleBack}
          className="pressable inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-bg-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent mt-1"
          ariaLabel="Retour"
          data-testid="pending-bandes-back"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
        <div className="flex-1 min-w-0">
          <PageHeader
            eyebrow="Admin · Bandes en attente"
            title="Bandes en attente"
            subtitle="Validation des inscriptions"
          />
        </div>
      </header>

      <main className="px-3 py-4 space-y-5">
        {loading ? (
          <div data-testid="pending-bandes-skeleton" className="space-y-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-16 rounded-md bg-bg-2 animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="card-dense text-center py-8"
            data-testid="pending-bandes-error"
          >
            <p className="text-[12px] text-red">Erreur : {error}</p>
            <Button
              variant="secondary"
              size="small"
              onClick={refresh}
              className="pressable mt-3 inline-flex h-10 px-4 rounded-md bg-bg-2 border border-border text-[11px] uppercase tracking-wide hover:border-text-2"
            >
              Réessayer
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div
            className="card-dense text-center py-12 space-y-3"
            data-testid="pending-bandes-empty"
          >
            <p className="text-[15px] font-semibold text-text-0">
              Aucune bande à valider
            </p>
            <p className="text-[11px] text-text-2">
              Toutes les bandes ont été validées.
            </p>
            <Button
              variant="primary"
              onClick={handleBack}
              className="pressable inline-flex h-11 px-5 rounded-md bg-accent text-bg-0 text-[12px] font-bold uppercase tracking-wide hover:brightness-110"
              data-testid="pending-bandes-empty-back"
            >
              Retour
            </Button>
          </div>
        ) : (
          <>
            <PendingBandesSection
              title="Mâles"
              badge="M"
              rows={males}
              onTap={setEditingId}
            />
            <PendingBandesSection
              title="Femelles"
              badge="F"
              rows={females}
              onTap={setEditingId}
            />

            {/* Bulk validate CTA */}
            <div className="pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setBulkOpen(true)}
                className="pressable w-full h-12 rounded-md inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
                data-testid="pending-bandes-bulk-cta"
              >
                <CheckCheck size={14} aria-hidden="true" />
                Valider toutes (avec valeurs actuelles)
              </Button>
              <p className="text-[10px] text-text-2 mt-2 text-center">
                Garde les estimations en l'état pour les {rows.length} bandes.
              </p>
            </div>
          </>
        )}
      </main>

      {/* Edit form */}
      {editingId ? (
        <QuickAddBandeFromLogeForm
          isOpen={true}
          onClose={() => setEditingId(null)}
          onSuccess={() => {
            setEditingId(null);
            refresh();
          }}
          editPendingBatchId={editingId}
        />
      ) : null}

      {/* Bulk confirm dialog */}
      {bulkOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmation validation en bloc"
          data-testid="pending-bandes-bulk-confirm"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-3 pb-3 sm:p-4"
        >
          <div className="w-full max-w-md card-dense space-y-3 py-5">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-text-0">
              Valider {rows.length} bande{rows.length > 1 ? 's' : ''} ?
            </h3>
            <p className="text-[11px] text-text-2">
              Toutes les estimations actuelles (effectif, poids, phase) seront
              acceptées telles quelles. Tu pourras modifier les détails plus
              tard depuis la fiche bande.
            </p>
            {bulkError ? (
              <p
                role="alert"
                className="text-[11px] text-red"
                data-testid="pending-bandes-bulk-error"
              >
                Erreur : {bulkError}
              </p>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="secondary"
                onClick={() => setBulkOpen(false)}
                disabled={bulkSaving}
                className="pressable flex-1 h-11 rounded-md bg-bg-1 border border-border text-text-1 text-[11px] font-bold uppercase tracking-wide hover:border-text-2"
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkValidate}
                disabled={bulkSaving}
                aria-busy={bulkSaving}
                className="pressable flex-[2] h-11 rounded-md bg-accent text-bg-0 text-[11px] font-bold uppercase tracking-wide hover:brightness-110 disabled:opacity-40"
                data-testid="pending-bandes-bulk-confirm-btn"
              >
                {bulkSaving ? 'Validation…' : 'Valider toutes'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PendingBandesView;
