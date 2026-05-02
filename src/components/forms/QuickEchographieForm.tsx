/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Stethoscope, Check, CheckCircle2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import {
  listPendingEchographies,
  updateSaillie,
  updateSowByCode,
  type PendingSaillie,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  validateEchographie,
  sowStatusFromEcho,
  ECHO_BOUNDS,
  type EchoStatut,
  type EchographieDraft,
  type EchographieValidationErrors,
} from './quickEchographieLogic';

export {
  validateEchographie,
  sowStatusFromEcho,
  ECHO_BOUNDS,
  type EchoStatut,
  type EchographieDraft,
} from './quickEchographieLogic';

export interface QuickEchographieFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pré-sélectionne une truie (displayId) si on ouvre depuis la fiche truie. */
  defaultTruieDisplayId?: string;
  onSuccess?: () => void;
}

const STATUT_OPTIONS: ReadonlyArray<{ value: EchoStatut; label: string; help: string }> = [
  { value: 'CONFIRMEE', label: 'Confirmée', help: 'Gestation visible — truie pleine' },
  { value: 'VIDE', label: 'Vide', help: 'Pas de gestation — truie libérée' },
  { value: 'DOUTEUSE', label: 'Douteuse', help: 'À recontrôler J35' },
];

function todayIsoLocal(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const QuickEchographieForm: React.FC<QuickEchographieFormProps> = ({
  isOpen,
  onClose,
  defaultTruieDisplayId,
  onSuccess,
}) => {
  const { refreshData } = useFarm();

  const [pending, setPending] = useState<PendingSaillie[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [saillieId, setSaillieId] = useState<string>('');
  const [statut, setStatut] = useState<EchoStatut | ''>('');
  const [dateEchoIso, setDateEchoIso] = useState<string>(todayIsoLocal());
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<EchographieValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastOpenKey, setLastOpenKey] = useState<{
    isOpen: boolean;
    defaultTruieDisplayId: string | undefined;
  }>({ isOpen, defaultTruieDisplayId });
  if (
    lastOpenKey.isOpen !== isOpen ||
    lastOpenKey.defaultTruieDisplayId !== defaultTruieDisplayId
  ) {
    setLastOpenKey({ isOpen, defaultTruieDisplayId });
    if (isOpen) {
      setSaillieId('');
      setStatut('');
      setDateEchoIso(todayIsoLocal());
      setNotes('');
      setErrors({});
      setSuccess(false);
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  // Chargement des saillies en attente d'écho à l'ouverture.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setPendingLoading(true);
    listPendingEchographies({ minDaysAgo: 21 })
      .then(rows => {
        if (cancelled) return;
        setPending(rows);
        // Pré-sélection éventuelle si defaultTruieDisplayId fourni.
        if (defaultTruieDisplayId) {
          const match = rows.find(r => r.sow_code_id === defaultTruieDisplayId);
          if (match) setSaillieId(match.saillie_id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPending([]);
      })
      .finally(() => {
        if (cancelled) return;
        setPendingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, defaultTruieDisplayId]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(
    isOpen && !success,
  ) as unknown as React.RefObject<HTMLSelectElement>;

  const selectedSaillie = useMemo(
    () => pending.find(p => p.saillie_id === saillieId) ?? null,
    [pending, saillieId],
  );

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const draft: EchographieDraft = {
      saillieId,
      statut,
      dateEchoIso,
      notes,
    };
    const result = validateEchographie(draft);
    if (!result.ok || !result.normalized) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const patchResult = await updateSaillie(result.normalized.saillieId, {
        statut_echo: result.normalized.statut,
        date_echo: result.normalized.dateEchoIso,
        notes_echo: result.normalized.notes || null,
      });
      if (!patchResult.success) {
        throw new Error(patchResult.error ?? 'Echec mise à jour saillie');
      }

      // Mise à jour conditionnelle du statut de la truie.
      const newSowStatut = sowStatusFromEcho(result.normalized.statut);
      if (newSowStatut && selectedSaillie?.sow_code_id) {
        await updateSowByCode(selectedSaillie.sow_code_id, { statut: newSowStatut });
      }

      setSuccess(true);
      setToast({
        show: true,
        message: `Échographie ${result.normalized.statut.toLowerCase()} enregistrée`,
      });

      try {
        await refreshData(true);
      } catch {
        /* noop */
      }

      if (onSuccess) onSuccess();

      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[QuickEchographieForm] enregistrement échoué:', err);
      setToast({
        show: true,
        message:
          err instanceof Error
            ? `Erreur : ${err.message}`
            : 'Erreur enregistrement échographie',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Saisir une échographie"
        height="full"
      >
        {success ? (
          <div
            className="flex flex-col items-center justify-center py-20 animate-scale-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={64}
              className="text-accent mb-4"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="agritech-heading text-[18px] uppercase tracking-wide">
              Échographie enregistrée
            </p>
            {selectedSaillie?.sow_code_id ? (
              <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
                {selectedSaillie.sow_code_id} · {statut}
              </p>
            ) : null}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
            aria-label="Saisie d'une échographie"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <Stethoscope size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-mono-label text-text-1">
                  Confirmer la gestation (J28-J35)
                </p>
                <p className="text-mono-micro text-text-2 mt-0.5">
                  Une saillie « VIDE » libère la truie
                </p>
              </div>
            </div>

            {/* ── Sélection truie / saillie ─────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="echo-saillie"
                className="block text-mono-label text-text-2"
              >
                Truie (saillie ≥ 21 j)
              </label>
              <select
                id="echo-saillie"
                ref={firstFieldRef}
                aria-label="Sélectionner la truie à confirmer"
                aria-required="true"
                aria-invalid={!!errors.saillieId}
                aria-describedby={errors.saillieId ? 'echo-saillie-error' : undefined}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.saillieId ? 'border-red' : 'border-border',
                ].join(' ')}
                value={saillieId}
                onChange={e => setSaillieId(e.target.value)}
                disabled={saving || pendingLoading}
              >
                <option value="">—</option>
                {pending.map(p => {
                  const code = p.sow_code_id ?? '?';
                  const verrat = p.boar_code_id ? ` × ${p.boar_code_id}` : '';
                  return (
                    <option key={p.saillie_id} value={p.saillie_id}>
                      {code}{verrat} · J+{p.days_since}
                    </option>
                  );
                })}
              </select>
              {errors.saillieId ? (
                <p
                  id="echo-saillie-error"
                  role="alert"
                  className="font-mono text-[10px] text-red"
                >
                  {errors.saillieId}
                </p>
              ) : pending.length === 0 && !pendingLoading ? (
                <p className="font-mono text-[10px] text-text-2">
                  Aucune saillie en attente d'écho.
                </p>
              ) : null}
            </div>

            {/* ── Date écho ─────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="echo-date"
                className="block text-mono-label text-text-2"
              >
                Date écho
              </label>
              <input
                id="echo-date"
                type="date"
                aria-label="Date de l'échographie"
                aria-required="true"
                aria-invalid={!!errors.dateEchoIso}
                aria-describedby={errors.dateEchoIso ? 'echo-date-error' : undefined}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.dateEchoIso ? 'border-red' : 'border-border',
                ].join(' ')}
                value={dateEchoIso}
                max={todayIsoLocal()}
                onChange={e => setDateEchoIso(e.target.value)}
                disabled={saving}
              />
              {errors.dateEchoIso ? (
                <p
                  id="echo-date-error"
                  role="alert"
                  className="font-mono text-[10px] text-red"
                >
                  {errors.dateEchoIso}
                </p>
              ) : null}
            </div>

            {/* ── Résultat ──────────────────────────────────────────────── */}
            <div className="space-y-2">
              <span
                id="echo-statut-label"
                className="block text-mono-label text-text-2"
              >
                Résultat
              </span>
              <div
                className="grid grid-cols-3 gap-2"
                role="radiogroup"
                aria-labelledby="echo-statut-label"
                aria-required="true"
              >
                {STATUT_OPTIONS.map(opt => {
                  const isSelected = statut === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${opt.label} — ${opt.help}`}
                      onClick={() => setStatut(opt.value)}
                      disabled={saving}
                      className={[
                        'pressable inline-flex flex-col items-center justify-center',
                        'h-14 rounded-md border px-2',
                        'font-mono text-[12px] uppercase tracking-wide',
                        'transition-colors duration-[160ms]',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                        isSelected
                          ? 'bg-accent text-bg-0 border-accent font-semibold'
                          : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                      ].join(' ')}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.statut ? (
                <p role="alert" className="font-mono text-[10px] text-red">
                  {errors.statut}
                </p>
              ) : null}
            </div>

            {/* ── Notes ─────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="echo-notes"
                className="block text-mono-label text-text-2"
              >
                Note ({notes.length}/{ECHO_BOUNDS.maxNotes})
              </label>
              <textarea
                id="echo-notes"
                aria-label="Note libre sur l'échographie"
                aria-invalid={!!errors.notes}
                aria-describedby={errors.notes ? 'echo-notes-error' : undefined}
                rows={2}
                maxLength={ECHO_BOUNDS.maxNotes}
                className={[
                  'w-full rounded-md px-3 py-2',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.notes ? 'border-red' : 'border-border',
                ].join(' ')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
              />
              {errors.notes ? (
                <p
                  id="echo-notes-error"
                  role="alert"
                  className="font-mono text-[10px] text-red"
                >
                  {errors.notes}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                aria-label="Annuler et fermer"
                className={[
                  'pressable flex-1 h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-bg-1 border border-border text-text-1',
                  'font-mono text-[12px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms] hover:border-text-2',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  saving ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !saillieId || !statut}
                aria-label="Enregistrer l'échographie"
                aria-busy={saving}
                className={[
                  'pressable flex-[2] h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-accent text-bg-0',
                  'font-mono text-[13px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  (saving || !saillieId || !statut)
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:brightness-110',
                ].join(' ')}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <>
                    <Check size={16} aria-hidden="true" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={2400}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </>
  );
};

export default QuickEchographieForm;
