/* eslint-disable react-refresh/only-export-components */
/**
 * QuickEchographieForm — Saisie d'un résultat d'échographie (J28-J35).
 * ════════════════════════════════════════════════════════════════════════
 * Migré FORM_CONTRACT Phase 2 (batch A) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (remplace l'IonToast local)
 *  - helpers date partagés `_formHelpers` (todayIso)
 *  - validation `validateEchographie` → { ok, errors, normalized },
 *    rendu d'erreur via `<FieldError>`
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * La sélection porte sur une SAILLIE (pas une truie/verrat) → `<select>`
 * natif conservé : `EntityPicker` est réservé aux entités truie/verrat.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stethoscope } from 'lucide-react';

import { FormField, Input, Select, Textarea, Section, RadioGroup } from '@/design-system';
import {
  listPendingEchographies,
  updateSaillie,
  updateSowByCode,
  type PendingSaillie,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { useFocusFirstInput } from './useFormA11y';
import { todayIso } from './_formHelpers';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
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

const QuickEchographieForm: React.FC<QuickEchographieFormProps> = ({
  isOpen,
  onClose,
  defaultTruieDisplayId,
  onSuccess,
}) => {
  const { refreshData } = useFarm();
  const { showToast } = useToast();

  const [pending, setPending] = useState<PendingSaillie[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [saillieId, setSaillieId] = useState<string>('');
  const [statut, setStatut] = useState<EchoStatut | ''>('');
  const [dateEchoIso, setDateEchoIso] = useState<string>(todayIso());
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<EchographieValidationErrors>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
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
      setDateEchoIso(todayIso());
      setNotes('');
      setErrors({});
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

  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(
    isOpen,
  ) as unknown as React.RefObject<HTMLSelectElement>;

  const selectedSaillie = useMemo(
    () => pending.find(p => p.saillie_id === saillieId) ?? null,
    [pending, saillieId],
  );

  const isValid = !!saillieId && !!statut;

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

      showToast(
        `Échographie ${result.normalized.statut.toLowerCase()} enregistrée`,
        'success',
        2400,
      );

      try {
        await refreshData(true);
      } catch {
        /* noop */
      }

      if (onSuccess) onSuccess();

      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // pendant la fenêtre 1.5s de toast success (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[QuickEchographieForm] enregistrement échoué:', err);
      showToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement échographie',
        'error',
        4000,
      );
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Échographie"
      title="Saisir une échographie"
      ariaLabel="Saisie d'une échographie"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      submitAriaLabel="Enregistrer l'échographie"
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

      <Section label="INFORMATIONS PRINCIPALES" />

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
          max={todayIso()}
          onChange={e => setDateEchoIso(e.target.value)}
          disabled={saving}
          invalid={!!errors.dateEchoIso}
        />
      </FormField>

      <Section label="RÉSULTAT" />

      <RadioGroup
        label="Résultat"
        value={statut}
        onChange={(v) => setStatut(v as typeof statut)}
        disabled={saving}
        options={STATUT_OPTIONS.map(opt => ({
          value: opt.value,
          label: opt.label,
          ariaLabel: `${opt.label} — ${opt.help}`,
        }))}
      />
      <FieldError message={errors.statut} />

      <Section label="DÉTAILS" />

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
    </QuickActionSheet>
  );
};

export default QuickEchographieForm;
