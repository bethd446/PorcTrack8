/**
 * QuickAddPeseeLotForm — Saisie d'une pesée hebdo sur un lot (V80 P0 #2).
 *
 * Champs : date, poids moyen, nb porcs pesés, notes.
 *
 * Conforme FORM_CONTRACT Phase 2 :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()`
 *  - validation `validateAddPeseeLot` → { ok, errors, normalized } + `<FieldError>`
 *  - helpers date partagés `_formHelpers`
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '../../context/ToastContext';
import { insertPeseeLot } from '../../services/repos/lots.repo';
import { useFocusFirstInput } from './useFormA11y';
import { todayIso } from './_formHelpers';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import { validateAddPeseeLot } from './quickAddPeseeLotLogic';

interface QuickAddPeseeLotFormProps {
  isOpen: boolean;
  lotId: string;
  lotCode?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddPeseeLotForm: React.FC<QuickAddPeseeLotFormProps> = ({
  isOpen,
  lotId,
  lotCode,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [date, setDate] = useState<string>(todayIso());
  const [poidsMoy, setPoidsMoy] = useState<string>('');
  const [nbPesees, setNbPesees] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setDate(todayIso());
      setPoidsMoy('');
      setNbPesees('');
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const isValid =
    !!date && parseFloat(poidsMoy) > 0 && parseInt(nbPesees, 10) > 0;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!lotId) {
      showToast('Lot inconnu', 'error');
      return;
    }
    const result = validateAddPeseeLot({ date, poidsMoy, nbPesees });
    if (!result.ok || !result.normalized) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await insertPeseeLot({
        lot_id: lotId,
        date: result.normalized.date,
        poids_moyen: result.normalized.poidsMoy,
        nb_porcs_pesees: result.normalized.nbPesees,
        notes: notes.trim() || null,
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(online ? 'Pesée enregistrée' : 'Pesée en file · sync auto', online ? 'success' : 'info', 1800);
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // dans la fenêtre 1.5s avant fermeture (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement', 'error', 2200);
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Pesée hebdo"
      title={`Peser le lot${lotCode ? ` · ${lotCode}` : ''}`}
      ariaLabel="Pesée lot"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer pesée"
      submitAriaLabel="Enregistrer la pesée"
    >
      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="pesee-lot-date">
            DATE <span className="req">requis</span>
          </label>
          <input
            id="pesee-lot-date"
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
          <label className="label--v77" htmlFor="pesee-lot-nb">
            NB PESÉS <span className="req">requis</span>
          </label>
          <input
            id="pesee-lot-nb"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            className={`field__input mono${nbPesees ? ' filled' : ' field__input--ghost'}`}
            aria-required="true"
            aria-invalid={!!errors.nbPesees}
            placeholder="10"
            value={nbPesees}
            onChange={(e) => setNbPesees(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.nbPesees} />
        </div>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="pesee-lot-poids">
          POIDS MOYEN <span className="req">kg</span>
        </label>
        <input
          id="pesee-lot-poids"
          type="number"
          inputMode="decimal"
          min={0}
          max={200}
          step="0.1"
          className={`field__input mono${poidsMoy ? ' filled' : ' field__input--ghost'}`}
          aria-required="true"
          aria-invalid={!!errors.poidsMoy}
          placeholder="55.0"
          value={poidsMoy}
          onChange={(e) => setPoidsMoy(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.poidsMoy} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="pesee-lot-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="pesee-lot-notes"
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

export default QuickAddPeseeLotForm;
