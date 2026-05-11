/**
 * QuickAddMortaliteLotForm — Saisie d'une mortalité par cause (V80 P0 #2).
 *
 * Pattern V77 sheet bottom — date, nb morts, cause (select préréglé + libre).
 */
import React, { useCallback, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Check, X } from 'lucide-react';

import { AppToast, useAppToast } from '../agritech';
import { insertMortaliteLot } from '../../services/repos/lots.repo';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

interface QuickAddMortaliteLotFormProps {
  isOpen: boolean;
  lotId: string;
  lotCode?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

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
  onClose,
  onSuccess,
}) => {
  const [date, setDate] = useState<string>(todayIso());
  const [nbMorts, setNbMorts] = useState<string>('1');
  const [cause, setCause] = useState<string>('');
  const [causeLibre, setCauseLibre] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { show: showToast, toastProps } = useAppToast();

  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setDate(todayIso());
      setNbMorts('1');
      setCause('');
      setCauseLibre('');
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [onClose, saving]);
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!date) errs.date = 'Date requise';
    const n = parseInt(nbMorts, 10);
    if (!Number.isFinite(n) || n <= 0) errs.nbMorts = 'Nb morts > 0';
    return errs;
  };

  const isValid = date && parseInt(nbMorts, 10) > 0;

  const handleSubmit = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
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
      showToast(online ? 'Mortalité enregistrée' : 'Mortalité en file · sync auto', online ? 'success' : 'info', { duration: 1800 });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement', 'error', { duration: 2200 });
    } finally {
      setSaving(false);
    }
  };

  const errMsg = (m?: string): React.ReactNode =>
    m ? (
      <span role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)' }}>
        {m}
      </span>
    ) : null;

  return (
    <>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={handleClose}
        breakpoints={[0, 1]}
        initialBreakpoint={1}
        className="agritech-bottom-sheet pt-sheet-modal pt-screen"
        aria-label="Mortalité lot"
      >
        <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
          <form
            className="sheet"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Saisie d'une mortalité"
            style={{ position: 'relative', height: '100%', maxHeight: '100%' }}
          >
            <span className="sheet__handle" />
            <header className="sheet__head">
              <div>
                <div className="eyebrow">Mortalité</div>
                <h2 className="sheet__title">Signaler une perte{lotCode ? ` · ${lotCode}` : ''}</h2>
              </div>
              <button
                type="button"
                className="sheet__close"
                onClick={handleClose}
                aria-label="Fermer"
                disabled={saving}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </header>

            <div className="sheet__body">
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
                  {errMsg(errors.date)}
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
                  {errMsg(errors.nbMorts)}
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
            </div>

            <footer className="sheet__foot">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleClose}
                disabled={saving}
                aria-label="Annuler et fermer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--lg btn--block"
                disabled={saving || !isValid}
                aria-busy={saving}
                aria-label="Enregistrer la mortalité"
              >
                {saving ? 'Enregistrement…' : <><Check size={14} aria-hidden="true" /> Enregistrer</>}
              </button>
            </footer>
          </form>
        </div>
      </IonModal>
      <AppToast {...toastProps} />
    </>
  );
};

export default QuickAddMortaliteLotForm;
