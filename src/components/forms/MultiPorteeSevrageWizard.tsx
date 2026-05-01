/**
 * MultiPorteeSevrageWizard — V23-S1
 * ════════════════════════════════════════════════════════════════════════════
 * Sevrage groupé multi-portées → multi-bandes destinations en 1 modal.
 *
 * Cas typique : 5 truies sèvrent (60 porcelets) → 2 bandes de 30 (M / F ou
 * par loge). Wizard 3 steps :
 *   1) sélection portées source (multi-check)
 *   2) définition N bandes destinations (poids cible 5-7 kg, loge optionnelle)
 *   3) confirmation + écriture séquentielle (best-effort, log des échecs)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import { ArrowRight, Baby, CheckCircle2, Plus, Scale, X } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import {
  insertBatch,
  resolveSowIdByCode,
  updateBatchByCode,
  updateSowByCode,
} from '../../services/supabaseWrites';
import { useEscapeKey } from './useFormA11y';
import type { BandePorcelets } from '../../types/farm';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MultiPorteeSevrageWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface DestinationBande {
  uid: string;
  codeId: string;
  nbPorcelets: string;
  poidsKg: string;
  loge: string;
}

type Step = 1 | 2 | 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayIsoLocal(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function daysBetween(iso: string | undefined, ref: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return Math.max(0, Math.round((ref.getTime() - d.getTime()) / 86_400_000));
}

function makeDestinationCode(dateIso: string, idx: number): string {
  const compact = dateIso.replaceAll('-', '');
  return `B-${compact}-${String(idx).padStart(2, '0')}`;
}

function newDestination(dateIso: string, idx: number): DestinationBande {
  return {
    uid: `dst-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    codeId: makeDestinationCode(dateIso, idx),
    nbPorcelets: '',
    poidsKg: '',
    loge: '',
  };
}

function isBandeEligible(b: BandePorcelets): boolean {
  const s = (b.statut || '').toLowerCase();
  const hasMB = !!b.dateMB;
  return hasMB && (s.includes('sous') || s.includes('mater'));
}

// ── Composant ────────────────────────────────────────────────────────────────

const MultiPorteeSevrageWizard: React.FC<MultiPorteeSevrageWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { bandes, refreshData } = useFarm();

  const bandesEligibles = useMemo<BandePorcelets[]>(
    () => bandes.filter(isBandeEligible),
    [bandes],
  );

  const [step, setStep] = useState<Step>(1);
  const [dateIso, setDateIso] = useState<string>(todayIsoLocal());
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<DestinationBande[]>(() => [
    newDestination(todayIsoLocal(), 1),
  ]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const firstWeightRef = useRef<HTMLInputElement | null>(null);

  // Reset à chaque ouverture
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    if (isOpen) {
      const today = todayIsoLocal();
      setStep(1);
      setDateIso(today);
      setSelectedSourceIds([]);
      setDestinations([newDestination(today, 1)]);
      setSaving(false);
      setSuccess(false);
      setError('');
    }
  }

  useEscapeKey(isOpen && !saving, onClose);

  useEffect(() => {
    if (step === 2) {
      // Saisie rapide : focus auto sur poids destination 1
      const t = setTimeout(() => firstWeightRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [step]);

  // ── Dérivés ────────────────────────────────────────────────────────────────

  const selectedSources = useMemo(
    () =>
      bandesEligibles.filter(b =>
        selectedSourceIds.includes(b.idPortee || b.id),
      ),
    [bandesEligibles, selectedSourceIds],
  );

  const totalSource = useMemo(
    () => selectedSources.reduce((acc, b) => acc + (b.vivants ?? 0), 0),
    [selectedSources],
  );

  const totalDestination = useMemo(
    () =>
      destinations.reduce((acc, d) => {
        const n = parseInt(d.nbPorcelets, 10);
        return acc + (Number.isFinite(n) && n > 0 ? n : 0);
      }, 0),
    [destinations],
  );

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateDestinations(): string | null {
    if (destinations.length === 0) return 'Au moins 1 destination requise';
    for (const [i, d] of destinations.entries()) {
      if (!d.codeId.trim()) return `Destination ${i + 1} : ID requis`;
      const nb = parseInt(d.nbPorcelets, 10);
      if (!Number.isFinite(nb) || nb <= 0) {
        return `Destination ${i + 1} : nb porcelets requis`;
      }
      const p = parseFloat(d.poidsKg.replace(',', '.'));
      if (!Number.isFinite(p)) {
        return `Destination ${i + 1} : poids moyen requis`;
      }
      if (p < 0.5 || p > 50) {
        return `Destination ${i + 1} : poids hors plage (0.5–50 kg)`;
      }
    }
    if (totalDestination > totalSource) {
      return `Total destinations (${totalDestination}) > total source (${totalSource})`;
    }
    return null;
  }

  function poidsWarning(p: number): boolean {
    return Number.isFinite(p) && (p < 4 || p > 10);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleSource = (code: string): void => {
    setSelectedSourceIds(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    );
  };

  const updateDestination = (
    uid: string,
    patch: Partial<DestinationBande>,
  ): void => {
    setDestinations(prev =>
      prev.map(d => (d.uid === uid ? { ...d, ...patch } : d)),
    );
  };

  const addDestination = (): void => {
    setDestinations(prev => [
      ...prev,
      newDestination(dateIso, prev.length + 1),
    ]);
  };

  const removeDestination = (uid: string): void => {
    setDestinations(prev =>
      prev.length === 1 ? prev : prev.filter(d => d.uid !== uid),
    );
  };

  const goNext = (): void => {
    setError('');
    if (step === 1) {
      if (selectedSourceIds.length === 0) {
        setError('Sélectionne au moins 1 portée source');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const v = validateDestinations();
      if (v) {
        setError(v);
        return;
      }
      setStep(3);
      return;
    }
  };

  const goPrev = (): void => {
    setError('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleConfirm = async (): Promise<void> => {
    setError('');
    const v = validateDestinations();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    const failures: string[] = [];

    // 1) Marque les portées source comme sevrées + libère les truies
    for (const src of selectedSources) {
      const code = src.idPortee || src.id;
      try {
        await updateBatchByCode(code, {
          date_sevrage: dateIso,
          statut: 'Sevré',
          phase: 'post-sevrage',
          porcelets_sevrene_total: src.vivants ?? 0,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(`Source ${code} : ${msg}`);
        console.warn('[multi-sevrage] update source failed', code, e);
      }
      const truieCode = src.truie?.trim();
      if (truieCode) {
        try {
          await updateSowByCode(truieCode, { statut: 'En attente saillie' });
        } catch (e) {
          console.warn('[multi-sevrage] libération truie échouée', truieCode, e);
        }
      }
    }

    // 2) Crée chaque bande destination (best-effort)
    // sow_id : on rattache la 1ère truie source par défaut (FK requise null-able)
    let primarySowUuid: string | null = null;
    const primarySowCode = selectedSources[0]?.truie?.trim();
    if (primarySowCode) {
      try {
        primarySowUuid = await resolveSowIdByCode(primarySowCode);
      } catch (e) {
        console.warn('[multi-sevrage] resolve sow failed', primarySowCode, e);
      }
    }

    for (const dst of destinations) {
      const nb = parseInt(dst.nbPorcelets, 10);
      const poids = parseFloat(dst.poidsKg.replace(',', '.'));
      try {
        await insertBatch({
          code_id: dst.codeId.trim(),
          sow_id: primarySowUuid,
          boar_id: null,
          date_mise_bas: null,
          date_sevrage: dateIso,
          porcelets_nes_vivants: nb,
          porcelets_nes_total: nb,
          porcelets_sevrene_total: nb,
          poids_moyen_sevrage_kg: poids,
          poids_moyen_kg: poids,
          statut: 'Sevré',
          phase: 'post-sevrage',
          loge: dst.loge.trim() || null,
          notes: `Issu sevrage groupé (${selectedSources.length} portées)`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(`Destination ${dst.codeId} : ${msg}`);
        console.warn('[multi-sevrage] insert destination failed', dst.codeId, e);
      }
    }

    // 3) Reste source vs destinations → toast non bloquant
    if (totalDestination < totalSource) {
      setToast({
        open: true,
        message: `Attention : ${totalSource - totalDestination} porcelets non répartis`,
      });
    }

    if (failures.length > 0) {
      setError(`Échec partiel — ${failures.length} opération(s) en erreur`);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setToast({
      open: true,
      message: `Sevrage groupé · ${selectedSources.length}→${destinations.length} bandes`,
    });
    try {
      await refreshData(true);
    } catch {
      /* noop */
    }
    if (onSuccess) onSuccess();
    setTimeout(() => {
      setSuccess(false);
      setSaving(false);
      onClose();
    }, 1400);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const today = useMemo(() => new Date(), []);

  const renderStep1 = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 border-b border-border bg-bg-1 px-4 py-3">
        <p className="font-mono text-[12px] uppercase tracking-wide text-text-2">
          Étape 1 / 3 — Portées source
        </p>
        <p className="mt-1 font-heading text-[16px] uppercase tracking-wide tabular-nums">
          {selectedSourceIds.length} portée(s) · {totalSource} porcelets
        </p>
      </div>

      {bandesEligibles.length === 0 ? (
        <p className="font-mono text-[12px] uppercase tracking-wide text-text-2">
          Aucune portée éligible (Sous mère / Maternité avec date MB)
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Portées éligibles">
          {bandesEligibles.map(b => {
            const code = b.idPortee || b.id;
            const checked = selectedSourceIds.includes(code);
            const j = daysBetween(b.dateMB, today);
            return (
              <li key={b.id}>
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-bg-0 p-3 hover:border-accent"
                  data-testid={`source-${code}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSource(code)}
                    className="h-5 w-5 accent-accent"
                    aria-label={`Sélectionner ${code}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] tabular-nums text-text-0">
                      {code}
                      {b.truie ? ` · ${b.truie}` : ''}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                      {b.vivants ?? 0} vivants
                      {j !== null ? ` · J+${j}` : ''}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const renderStep2 = (): React.ReactNode => {
    const remaining = totalSource - totalDestination;
    const remainingClass =
      remaining < 0 ? 'text-red' : remaining > 0 ? 'text-amber-pork' : 'text-accent';

    return (
      <div className="space-y-4">
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 border-b border-border bg-bg-1 px-4 py-3">
          <p className="font-mono text-[12px] uppercase tracking-wide text-text-2">
            Étape 2 / 3 — Bandes destinations
          </p>
          <p className="mt-1 font-heading text-[16px] uppercase tracking-wide tabular-nums">
            {totalDestination} / {totalSource} affectés
            <span className={`ml-2 ${remainingClass}`}>
              ({remaining >= 0 ? '+' : ''}
              {remaining})
            </span>
          </p>
        </div>

        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          }}
        >
          {destinations.map((d, idx) => {
            const poidsNum = parseFloat(d.poidsKg.replace(',', '.'));
            const showWarning = poidsWarning(poidsNum);
            return (
              <div
                key={d.uid}
                className="space-y-2 rounded-md border border-border bg-bg-0 p-3"
                data-testid={`destination-${idx}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                    Destination {idx + 1}
                  </p>
                  {destinations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDestination(d.uid)}
                      aria-label={`Retirer destination ${idx + 1}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-2 hover:text-red"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={d.codeId}
                  onChange={e =>
                    updateDestination(d.uid, { codeId: e.target.value })
                  }
                  aria-label={`ID bande destination ${idx + 1}`}
                  className="w-full rounded-md border border-border bg-bg-0 px-2 py-2 font-mono text-[12px] outline-none focus:border-accent"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  value={d.nbPorcelets}
                  onChange={e =>
                    updateDestination(d.uid, {
                      nbPorcelets: e.target.value.replace(/[^\d]/g, ''),
                    })
                  }
                  placeholder="Nb"
                  aria-label={`Nb porcelets destination ${idx + 1}`}
                  className="w-full rounded-md border border-border bg-bg-0 px-2 py-2 text-center font-mono text-[16px] tabular-nums outline-none focus:border-accent"
                />

                <div className="relative">
                  <Scale
                    size={14}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-text-2"
                    aria-hidden="true"
                  />
                  <input
                    ref={idx === 0 ? firstWeightRef : undefined}
                    type="text"
                    inputMode="decimal"
                    value={d.poidsKg}
                    onChange={e =>
                      updateDestination(d.uid, {
                        poidsKg: e.target.value.replace(/[^\d.,]/g, ''),
                      })
                    }
                    placeholder="kg"
                    aria-label={`Poids moyen destination ${idx + 1}`}
                    className="w-full rounded-md border border-border bg-bg-0 py-2 pl-7 pr-2 text-center font-mono text-[14px] tabular-nums outline-none focus:border-accent"
                  />
                </div>

                {showWarning && (
                  <p className="rounded-sm bg-amber-pork/15 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-amber-pork">
                    Hors 4–10 kg
                  </p>
                )}

                <input
                  type="text"
                  value={d.loge}
                  onChange={e =>
                    updateDestination(d.uid, { loge: e.target.value })
                  }
                  placeholder="Loge"
                  aria-label={`Loge destination ${idx + 1}`}
                  className="w-full rounded-md border border-border bg-bg-0 px-2 py-2 font-mono text-[12px] outline-none focus:border-accent"
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addDestination}
          className="pressable inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border font-mono text-[12px] uppercase tracking-wide text-text-1"
        >
          <Plus size={14} aria-hidden="true" />
          Ajouter destination
        </button>
      </div>
    );
  };

  const renderStep3 = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 border-b border-border bg-bg-1 px-4 py-3">
        <p className="font-mono text-[12px] uppercase tracking-wide text-text-2">
          Étape 3 / 3 — Confirmation
        </p>
        <p className="mt-1 font-heading text-[16px] uppercase tracking-wide tabular-nums">
          {selectedSources.length} portées → {destinations.length} bandes
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="multi-sevrage-date"
          className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
        >
          Date de sevrage
        </label>
        <input
          id="multi-sevrage-date"
          type="date"
          value={dateIso}
          onChange={e => setDateIso(e.target.value)}
          disabled={saving}
          className="h-12 w-full rounded-md border border-border bg-bg-0 px-3 font-mono text-[13px] outline-none focus:border-accent"
        />
      </div>

      <div className="rounded-md border border-border bg-bg-0 p-3">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-2">
          Sources ({totalSource} porcelets)
        </p>
        <ul className="space-y-1">
          {selectedSources.map(s => (
            <li
              key={s.id}
              className="font-mono text-[12px] tabular-nums text-text-0"
            >
              {s.idPortee || s.id} · {s.vivants ?? 0} vivants
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-border bg-bg-0 p-3">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-2">
          Destinations ({totalDestination} porcelets)
        </p>
        <ul className="space-y-1">
          {destinations.map(d => (
            <li
              key={d.uid}
              className="font-mono text-[12px] tabular-nums text-text-0"
            >
              {d.codeId} · {d.nbPorcelets || 0} porcelets · {d.poidsKg || '—'} kg
              {d.loge ? ` · ${d.loge}` : ''}
            </li>
          ))}
        </ul>
      </div>

      {totalDestination !== totalSource && (
        <p className="rounded-sm bg-amber-pork/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-amber-pork">
          Écart {totalSource - totalDestination} porcelets — non bloquant
        </p>
      )}
    </div>
  );

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Sevrage multi-portées"
        height="full"
      >
        {success ? (
          <div
            className="flex flex-col items-center justify-center py-20"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={64}
              className="mb-4 text-accent"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="font-heading text-[18px] uppercase tracking-wide">
              Sevrage groupé enregistré
            </p>
          </div>
        ) : (
          <div className="space-y-5" aria-label="Wizard sevrage multi-portées">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <Baby size={18} aria-hidden="true" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Regrouper plusieurs portées en bandes
              </p>
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {error && (
              <p
                role="alert"
                className="font-mono text-[11px] uppercase tracking-wide text-red"
              >
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pt-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={saving}
                  className="pressable h-14 flex-1 rounded-md border border-border bg-bg-1 font-mono text-[12px] font-bold uppercase tracking-wide text-text-1"
                >
                  Retour
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="pressable h-14 flex-1 rounded-md border border-border bg-bg-1 font-mono text-[12px] font-bold uppercase tracking-wide text-text-1"
                >
                  Annuler
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={
                    saving ||
                    (step === 1 && selectedSourceIds.length === 0)
                  }
                  className="pressable inline-flex h-14 flex-[2] items-center justify-center gap-2 rounded-md bg-accent font-mono text-[13px] font-bold uppercase tracking-wide text-bg-0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Suivant
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving}
                  aria-busy={saving}
                  className="pressable inline-flex h-14 flex-[2] items-center justify-center gap-2 rounded-md bg-accent font-mono text-[13px] font-bold uppercase tracking-wide text-bg-0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? (
                    <span className="animate-pulse">Enregistrement…</span>
                  ) : (
                    <>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Valider sevrage
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      <IonToast
        isOpen={toast.open}
        message={toast.message}
        duration={2400}
        position="bottom"
        onDidDismiss={() => setToast({ open: false, message: '' })}
      />
    </>
  );
};

export default MultiPorteeSevrageWizard;
