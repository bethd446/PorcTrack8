/**
 * QuickAddMortaliteLotForm — Saisie d'une mortalité par cause (V80 P0 #2).
 *
 * Conforme FORM_CONTRACT Phase 1 :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace useAppToast local)
 *  - helpers date partagés `_formHelpers` (todayIso)
 *  - validation inline → état `errors` + rendu via `<FieldError>`
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '../../context/ToastContext';
import { insertMortaliteLot } from '../../services/repos/lots.repo';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';

interface QuickAddMortaliteLotFormProps {
  isOpen: boolean;
  lotId: string;
  lotCode?: string;
  /** V81 Sprint 7 — Effectif vivant restant (initial - morts). Si fourni,
   *  borne nbMorts ≤ effectifRestant pour éviter les KPIs faussés. */
  effectifRestant?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const CAUSE_PRESETS = [
  'Maladie respiratoire',
  'Diarrhée',
  'Écrasement',
  'Cannibalisme',
  'Boiterie / accident',
  'Mort subite',
  'Autre',
] as const;

const QuickAddMortaliteLotForm: React.FC<QuickAddMortaliteLotFormProps> = ({
  isOpen,
  lotId,
  lotCode,
  effectifRestant,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [date, setDate] = useState<string>(todayIso());
  const [nbMorts, setNbMorts] = useState<string>('1');
  const [cause, setCause] = useState<string>('');
  const [causeLibre, setCauseLibre] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean }>({ isOpen });
  if (lastOpenKey.isOpen !== isOpen) {
    setLastOpenKey({ isOpen });
    if (isOpen) {
      setDate(todayIso());
      setNbMorts('1');
      setCause('');
      setCauseLibre('');
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

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!date) errs.date = 'Date requise';
    const n = parseInt(nbMorts, 10);
    if (!Number.isFinite(n) || n <= 0) errs.nbMorts = 'Nb morts > 0';
    // V81 Sprint 7 — Cap sur l'effectif vivant restant : on ne peut pas
    // déclarer plus de morts qu'il n'y a de porcs dans le lot.
    else if (typeof effectifRestant === 'number' && n > effectifRestant) {
      errs.nbMorts = `Lot a ${effectifRestant} porc${effectifRestant > 1 ? 's' : ''} vivant${effectifRestant > 1 ? 's' : ''}`;
    }
    return errs;
  };

  const isValid = !!date && parseInt(nbMorts, 10) > 0;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!lotId) {
      showToast('Lot inconnu', 'error');
      return;
    }
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const finalCause = cause === 'Autre' ? causeLibre.trim() : cause.trim();
      await insertMortaliteLot({
        lot_id: lotId,
        date,
        nb_morts: parseInt(nbMorts, 10),
        cause: finalCause || null,
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(
        online ? 'Mortalité enregistrée' : 'Mortalité en file · sync auto',
        online ? 'success' : 'info',
        1800,
      );
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // pendant la fenêtre 1.5s de toast (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
        'error', 2200,
      );
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Mortalité"
      title={`Signaler une perte${lotCode ? ` · ${lotCode}` : ''}`}
      ariaLabel="Saisie d'une mortalité"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      submitAriaLabel="Enregistrer la mortalité"
    >
      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="mort-lot-date">
            DATE <span className="req">requis</span>
          </label>
          <input
            id="mort-lot-date"
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
          <label className="label--v77" htmlFor="mort-lot-nb">
            NB MORTS <span className="req">requis</span>
          </label>
          <input
            id="mort-lot-nb"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            className={`field__input mono${nbMorts ? ' filled' : ' field__input--ghost'}`}
            aria-required="true"
            aria-invalid={!!errors.nbMorts}
            placeholder="1"
            value={nbMorts}
            onChange={(e) => setNbMorts(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.nbMorts} />
        </div>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="mort-lot-cause">
          CAUSE <span className="hint">optionnel</span>
        </label>
        <select
          id="mort-lot-cause"
          className={`field__input${cause ? ' mono filled' : ' field__input--ghost'}`}
          value={cause}
          onChange={(e) => setCause(e.target.value)}
          disabled={saving}
        >
          <option value="">— Sélectionner —</option>
          {CAUSE_PRESETS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {cause === 'Autre' && (
        <div className="field">
          <label className="label--v77" htmlFor="mort-lot-cause-libre">
            DÉTAIL <span className="hint">libre</span>
          </label>
          <input
            id="mort-lot-cause-libre"
            type="text"
            className={`field__input${causeLibre ? ' mono filled' : ' field__input--ghost'}`}
            placeholder="Précise la cause…"
            value={causeLibre}
            onChange={(e) => setCauseLibre(e.target.value)}
            maxLength={120}
            disabled={saving}
          />
        </div>
      )}
    </QuickActionSheet>
  );
};

export default QuickAddMortaliteLotForm;
