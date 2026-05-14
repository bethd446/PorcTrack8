/**
 * QuickAddLotForm — Création d'un lot d'engraissement (V80 P0 #2).
 *
 * Réception lot : code, date arrivée, fournisseur (libre), nb porcs,
 * poids moyen, prix unitaire.
 *
 * Conforme FORM_CONTRACT Phase 2 :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()`
 *  - validation `validateAddLot` → { ok, errors, normalized } + `<FieldError>`
 *  - helpers date partagés `_formHelpers`
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '../../context/ToastContext';
import { insertLot } from '../../services/repos/lots.repo';
import { useFocusFirstInput } from './useFormA11y';
import { todayIso } from './_formHelpers';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import { validateAddLot } from './quickAddLotLogic';

interface QuickAddLotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// V81 Sprint 7 — Code par défaut basé sur date+heure pour éviter collision
// si 2 lots arrivent le même jour. L'éleveur garde la possibilité d'éditer
// le code avant submit. Anti-collision côté DB en filet : index UNIQUE
// (farm_id, code) sur table lots (V80 migration).
const defaultCode = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `LOT-${y}${m}${day}-${hh}${mm}`;
};

const QuickAddLotForm: React.FC<QuickAddLotFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [code, setCode] = useState<string>(defaultCode());
  const [dateArrivee, setDateArrivee] = useState<string>(todayIso());
  const [fournisseur, setFournisseur] = useState<string>('');
  const [nbPorcs, setNbPorcs] = useState<string>('');
  const [poidsMoy, setPoidsMoy] = useState<string>('');
  const [prixUnit, setPrixUnit] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
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

  const isValid = !!code.trim() && !!dateArrivee && parseInt(nbPorcs, 10) > 0;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddLot({ code, dateArrivee, nbPorcs, poidsMoy, prixUnit });
    if (!result.ok || !result.normalized) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await insertLot({
        code: result.normalized.code,
        date_arrivee: result.normalized.dateArrivee,
        fournisseur: fournisseur.trim() || null,
        nb_porcs_initial: result.normalized.nbPorcs,
        poids_moyen_arrivee: result.normalized.poidsMoy,
        prix_unitaire_achat: result.normalized.prixUnit,
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(online ? 'Lot créé' : 'Lot en file · sync auto', online ? 'success' : 'info', 1800);
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
      eyebrow="Engraissement"
      title="Réceptionner un lot"
      ariaLabel="Réception d'un lot"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Créer le lot"
      submitAriaLabel="Créer le lot"
    >
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
        <FieldError message={errors.code} />
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
          <FieldError message={errors.dateArrivee} />
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
          <FieldError message={errors.nbPorcs} />
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
          <FieldError message={errors.poidsMoy} />
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
          <FieldError message={errors.prixUnit} />
        </div>
      </div>
    </QuickActionSheet>
  );
};

export default QuickAddLotForm;
