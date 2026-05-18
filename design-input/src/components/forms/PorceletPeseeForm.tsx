/**
 * PorceletPeseeForm — Pesée individuelle d'un porcelet (V83 mécanique).
 *
 * Branché sur le bouton « Peser » de PorceletDetailView. Saisie minimale :
 * date + poids + notes. INSERT direct dans `pesees` avec `porcelet_id`. Met
 * également à jour `porcelets_individuels.poids_courant_kg` pour conserver la
 * valeur courante affichée dans la fiche.
 *
 * Conforme FORM_CONTRACT :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()`
 *  - reset-on-open via `lastKey` render-phase
 *  - garde double-clic : `closeTimerRef` + cleanup `useEffect`
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '../../context/ToastContext';
import { insertPesee, updatePorcelet } from '../../services/supabaseWrites';
import { useFocusFirstInput } from './useFormA11y';
import { todayIso } from './_formHelpers';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';

export interface PorceletPeseeFormProps {
  isOpen: boolean;
  porceletId: string;
  porceletBoucle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const PorceletPeseeForm: React.FC<PorceletPeseeFormProps> = ({
  isOpen,
  porceletId,
  porceletBoucle,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [date, setDate] = useState<string>(todayIso());
  const [poids, setPoids] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastKey render-phase (FORM_CONTRACT).
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; id: string }>({
    isOpen,
    id: porceletId,
  });
  if (lastKey.isOpen !== isOpen || lastKey.id !== porceletId) {
    setLastKey({ isOpen, id: porceletId });
    if (isOpen) {
      setDate(todayIso());
      setPoids('');
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

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }, [onClose, saving]);

  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const poidsNum = parseFloat(poids.replace(',', '.'));
  const isValid = !!date && Number.isFinite(poidsNum) && poidsNum > 0 && poidsNum <= 200;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!porceletId) {
      showToast('Porcelet inconnu', 'error');
      return;
    }
    const errs: Record<string, string> = {};
    if (!date) errs.date = 'Date requise';
    if (!Number.isFinite(poidsNum) || poidsNum <= 0) errs.poids = 'Poids > 0 requis';
    else if (poidsNum > 200) errs.poids = 'Poids ≤ 200 kg';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await insertPesee({
        porcelet_id: porceletId,
        date_pesee: date,
        poids_kg: poidsNum,
        notes: notes.trim() || null,
      });
      // Met à jour le poids courant du porcelet pour cohérence d'affichage.
      try {
        await updatePorcelet(porceletId, { poidsCourantKg: poidsNum });
      } catch (e) {
        // best-effort : la pesée est l'événement principal, le snapshot n'est
        // que dérivé. On warn mais on n'échoue pas la soumission.
        console.warn('[PorceletPeseeForm] updatePorcelet failed', e);
      }
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(
        online ? 'Pesée enregistrée' : 'Pesée en file · sync auto',
        online ? 'success' : 'info',
        1800,
      );
      if (onSuccess) onSuccess();
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1200);
    } catch (err) {
      showToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
        'error',
        2200,
      );
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Pesée porcelet"
      title={`Peser${porceletBoucle ? ` · ${porceletBoucle}` : ''}`}
      ariaLabel="Pesée porcelet"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer pesée"
      submitAriaLabel="Enregistrer la pesée"
    >
      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="porcelet-pesee-date">
            DATE <span className="req">requis</span>
          </label>
          <input
            id="porcelet-pesee-date"
            ref={firstFieldRef}
            type="date"
            className={`field__input mono${date ? ' filled' : ' field__input--ghost'}`}
            aria-required="true"
            aria-invalid={!!errors.date}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.date} />
        </div>
        <div className="field">
          <label className="label--v77" htmlFor="porcelet-pesee-poids">
            POIDS <span className="req">kg</span>
          </label>
          <input
            id="porcelet-pesee-poids"
            type="number"
            inputMode="decimal"
            min={0}
            max={200}
            step="0.1"
            className={`field__input mono${poids ? ' filled' : ' field__input--ghost'}`}
            aria-required="true"
            aria-invalid={!!errors.poids}
            placeholder="8.5"
            value={poids}
            onChange={(e) => setPoids(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.poids} />
        </div>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="porcelet-pesee-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="porcelet-pesee-notes"
          className="field__input"
          style={{ minHeight: 64, resize: 'vertical' }}
          placeholder="Observation terrain…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          disabled={saving}
        />
      </div>
    </QuickActionSheet>
  );
};

export default PorceletPeseeForm;
