/**
 * QuickAddPeseeLotForm — Saisie d'une pesée hebdo sur un lot (V80 P0 #2).
 *
 * Pattern V77 sheet bottom — sobre : date, poids moyen, nb porcs pesés, notes.
 */
import React, { useCallback, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Check, X } from 'lucide-react';

import { AppToast, useAppToast } from '../agritech';
import { insertPeseeLot } from '../../services/repos/lots.repo';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

interface QuickAddPeseeLotFormProps {
  isOpen: boolean;
  lotId: string;
  lotCode?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const QuickAddPeseeLotForm: React.FC<QuickAddPeseeLotFormProps> = ({
  isOpen,
  lotId,
  lotCode,
  onClose,
  onSuccess,
}) => {
  const [date, setDate] = useState<string>(todayIso());
  const [poidsMoy, setPoidsMoy] = useState<string>('');
  const [nbPesees, setNbPesees] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { show: showToast, toastProps } = useAppToast();

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

  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [onClose, saving]);
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!date) errs.date = 'Date requise';
    const p = parseFloat(poidsMoy);
    if (!Number.isFinite(p) || p <= 0 || p > 200) errs.poidsMoy = 'Poids 0-200 kg';
    const n = parseInt(nbPesees, 10);
    if (!Number.isFinite(n) || n <= 0) errs.nbPesees = 'Nb porcs > 0';
    return errs;
  };

  const isValid =
    date && parseFloat(poidsMoy) > 0 && parseInt(nbPesees, 10) > 0;

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
      await insertPeseeLot({
        lot_id: lotId,
        date,
        poids_moyen: parseFloat(poidsMoy),
        nb_porcs_pesees: parseInt(nbPesees, 10),
        notes: notes.trim() || null,
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(online ? 'Pesée enregistrée' : 'Pesée en file · sync auto', online ? 'success' : 'info', { duration: 1800 });
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
        aria-label="Pesée lot"
      >
        <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
          <form
            className="sheet"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Saisie d'une pesée de lot"
            style={{ position: 'relative', height: '100%', maxHeight: '100%' }}
          >
            <span className="sheet__handle" />
            <header className="sheet__head">
              <div>
                <div className="eyebrow">Pesée hebdo</div>
                <h2 className="sheet__title">Peser le lot{lotCode ? ` · ${lotCode}` : ''}</h2>
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
                  {errMsg(errors.date)}
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
                  {errMsg(errors.nbPesees)}
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
                {errMsg(errors.poidsMoy)}
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
                aria-label="Enregistrer la pesée"
              >
                {saving ? 'Enregistrement…' : <><Check size={14} aria-hidden="true" /> Enregistrer pesée</>}
              </button>
            </footer>
          </form>
        </div>
      </IonModal>
      <AppToast {...toastProps} />
    </>
  );
};

export default QuickAddPeseeLotForm;
