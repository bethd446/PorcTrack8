/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Stethoscope, Check, CheckCircle2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button } from '@/design-system';
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
              <p className="mt-2 text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
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

            <FormField
              label="Truie (saillie ≥ 21 j)"
              hint={pending.length === 0 && !pendingLoading ? "Aucune saillie en attente d'écho." : undefined}
              error={errors.saillieId}
            >
              <Select
                id="echo-saillie"
                ref={firstFieldRef}
                aria-label="Sélectionner la truie à confirmer"
                aria-required="true"
                aria-invalid={!!errors.saillieId}
                aria-describedby={errors.saillieId ? 'echo-saillie-error' : undefined}
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
              </Select>
            </FormField>

            <FormField label="Date écho" error={errors.dateEchoIso}>
              <Input
                id="echo-date"
                type="date"
                aria-label="Date de l'échographie"
                aria-required="true"
                aria-invalid={!!errors.dateEchoIso}
                aria-describedby={errors.dateEchoIso ? 'echo-date-error' : undefined}
                className="font-mono tabular-nums"
                value={dateEchoIso}
                max={todayIsoLocal()}
                onChange={e => setDateEchoIso(e.target.value)}
                disabled={saving}
                invalid={!!errors.dateEchoIso}
              />
            </FormField>

            {/* TODO V44: Radio DS missing — radiogroup custom conservé */}
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
                        'text-[12px] uppercase tracking-wide',
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
                <p role="alert" className="text-[10px] text-red">
                  {errors.statut}
                </p>
              ) : null}
            </div>

            <FormField
              label={`Note (${notes.length}/${ECHO_BOUNDS.maxNotes})`}
              error={errors.notes}
            >
              <Textarea
                id="echo-notes"
                aria-label="Note libre sur l'échographie"
                aria-invalid={!!errors.notes}
                aria-describedby={errors.notes ? 'echo-notes-error' : undefined}
                rows={2}
                maxLength={ECHO_BOUNDS.maxNotes}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
              />
            </FormField>

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={saving}
                ariaLabel="Annuler et fermer"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !saillieId || !statut}
                aria-busy={saving}
                ariaLabel="Enregistrer l'échographie"
              >
                {saving ? 'Enregistrement…' : (
                  <span className="inline-flex items-center gap-2">
                    <Check size={16} aria-hidden="true" />
                    Enregistrer
                  </span>
                )}
              </Button>
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
