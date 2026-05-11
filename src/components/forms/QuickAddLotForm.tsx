/**
 * QuickAddLotForm — Création d'un lot d'engraissement (V80 P0 #2).
 *
 * Sheet bottom (pattern V77/V78) — réception lot : code, date arrivée,
 * fournisseur (libre), nb porcs, poids moyen, prix unitaire.
 */
import React, { useCallback, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Check, X } from 'lucide-react';

import { AppToast, useAppToast } from '../agritech';
import { insertLot } from '../../services/repos/lots.repo';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

interface QuickAddLotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);
const defaultCode = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `LOT-${y}${m}${day}`;
};

const QuickAddLotForm: React.FC<QuickAddLotFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [code, setCode] = useState<string>(defaultCode());
  const [dateArrivee, setDateArrivee] = useState<string>(todayIso());
  const [fournisseur, setFournisseur] = useState<string>('');
  const [nbPorcs, setNbPorcs] = useState<string>('');
  const [poidsMoy, setPoidsMoy] = useState<string>('');
  const [prixUnit, setPrixUnit] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { show: showToast, toastProps } = useAppToast();

  // Reset quand on ré-ouvre.
  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setCode(defaultCode());
      setDateArrivee(todayIso());
      setFournisseur('');
      setNbPorcs('');
      setPoidsMoy('');
      setPrixUnit('');
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
    if (!code.trim()) errs.code = 'Code requis';
    if (!dateArrivee) errs.dateArrivee = 'Date requise';
    const n = parseInt(nbPorcs, 10);
    if (!Number.isFinite(n) || n <= 0) errs.nbPorcs = 'Nb porcs invalide (> 0)';
    if (poidsMoy) {
      const p = parseFloat(poidsMoy);
      if (!Number.isFinite(p) || p <= 0 || p > 200) errs.poidsMoy = 'Poids 0-200 kg';
    }
    if (prixUnit) {
      const px = parseFloat(prixUnit);
      if (!Number.isFinite(px) || px < 0) errs.prixUnit = 'Prix invalide';
    }
    return errs;
  };

  const isValid = code.trim() && dateArrivee && parseInt(nbPorcs, 10) > 0;

  const handleSubmit = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await insertLot({
        code: code.trim(),
        date_arrivee: dateArrivee,
        fournisseur: fournisseur.trim() || null,
        nb_porcs_initial: parseInt(nbPorcs, 10),
        poids_moyen_arrivee: poidsMoy ? parseFloat(poidsMoy) : null,
        prix_unitaire_achat: prixUnit ? parseFloat(prixUnit) : null,
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(online ? 'Lot créé' : 'Lot en file · sync auto', online ? 'success' : 'info', { duration: 1800 });
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
        aria-label="Réception d'un lot"
      >
        <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
          <form
            className="sheet"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Création d'un lot d'engraissement"
            style={{ position: 'relative', height: '100%', maxHeight: '100%' }}
          >
            <span className="sheet__handle" />
            <header className="sheet__head">
              <div>
                <div className="eyebrow">Engraissement</div>
                <h2 className="sheet__title">Réceptionner un lot</h2>
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
              <div className="field">
                <label className="label--v77" htmlFor="add-lot-code">
                  CODE LOT <span className="req">requis</span>
                </label>
                <input
                  id="add-lot-code"
                  ref={firstFieldRef}
                  type="text"
                  className={`field__input mono${code ? ' filled' : ' field__input--ghost'}`}
                  aria-required="true"
                  aria-invalid={!!errors.code}
                  placeholder="LOT-20260512"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={saving}
                  maxLength={50}
                />
                {errMsg(errors.code)}
              </div>

              <div className="field--inline">
                <div className="field">
                  <label className="label--v77" htmlFor="add-lot-date">
                    ARRIVÉE <span className="req">requis</span>
                  </label>
                  <input
                    id="add-lot-date"
                    type="date"
                    className={`field__input mono${dateArrivee ? ' filled' : ' field__input--ghost'}`}
                    aria-required="true"
                    aria-invalid={!!errors.dateArrivee}
                    value={dateArrivee}
                    onChange={(e) => setDateArrivee(e.target.value)}
                    disabled={saving}
                  />
                  {errMsg(errors.dateArrivee)}
                </div>
                <div className="field">
                  <label className="label--v77" htmlFor="add-lot-nb">
                    NB PORCS <span className="req">requis</span>
                  </label>
                  <input
                    id="add-lot-nb"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={5000}
                    className={`field__input mono${nbPorcs ? ' filled' : ' field__input--ghost'}`}
                    aria-required="true"
                    aria-invalid={!!errors.nbPorcs}
                    placeholder="50"
                    value={nbPorcs}
                    onChange={(e) => setNbPorcs(e.target.value)}
                    disabled={saving}
                  />
                  {errMsg(errors.nbPorcs)}
                </div>
              </div>

              <div className="field">
                <label className="label--v77" htmlFor="add-lot-fournisseur">
                  FOURNISSEUR <span className="hint">optionnel</span>
                </label>
                <input
                  id="add-lot-fournisseur"
                  type="text"
                  className={`field__input${fournisseur ? ' mono filled' : ' field__input--ghost'}`}
                  placeholder="Nom du naisseur / coopérative…"
                  value={fournisseur}
                  onChange={(e) => setFournisseur(e.target.value)}
                  disabled={saving}
                  maxLength={120}
                />
              </div>

              <div className="field--inline">
                <div className="field">
                  <label className="label--v77" htmlFor="add-lot-poids">
                    POIDS MOY. ARRIVÉE <span className="hint">kg · optionnel</span>
                  </label>
                  <input
                    id="add-lot-poids"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={200}
                    step="0.1"
                    className={`field__input mono${poidsMoy ? ' filled' : ' field__input--ghost'}`}
                    aria-invalid={!!errors.poidsMoy}
                    placeholder="25.0"
                    value={poidsMoy}
                    onChange={(e) => setPoidsMoy(e.target.value)}
                    disabled={saving}
                  />
                  {errMsg(errors.poidsMoy)}
                </div>
                <div className="field">
                  <label className="label--v77" htmlFor="add-lot-prix">
                    PRIX UNIT. <span className="hint">FCFA · optionnel</span>
                  </label>
                  <input
                    id="add-lot-prix"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="1"
                    className={`field__input mono${prixUnit ? ' filled' : ' field__input--ghost'}`}
                    aria-invalid={!!errors.prixUnit}
                    placeholder="35000"
                    value={prixUnit}
                    onChange={(e) => setPrixUnit(e.target.value)}
                    disabled={saving}
                  />
                  {errMsg(errors.prixUnit)}
                </div>
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
                aria-label="Créer le lot"
              >
                {saving ? 'Enregistrement…' : <><Check size={14} aria-hidden="true" /> Créer le lot</>}
              </button>
            </footer>
          </form>
        </div>
      </IonModal>
      <AppToast {...toastProps} />
    </>
  );
};

export default QuickAddLotForm;
