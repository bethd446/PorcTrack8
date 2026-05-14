/**
 * QuickAddVerratForm — Création rapide d'un verrat (Sprint 5 v76)
 * ════════════════════════════════════════════════════════════════════════
 * Sheet bottom v76 · Code mono auto-gen · Boucle · Date naissance ·
 * Origine/lignée libre · Ration kg/j stepper.
 *
 * Conforme au contrat (FORM_CONTRACT) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace useAppToast local)
 *  - rendu d'erreur via `<FieldError>` (remplace `errMsg()` inline)
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *  - reset-on-open via `lastKey` render-phase
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

import { useToast } from '../../context/ToastContext';
import { insertBoar } from '../../services/supabaseWrites';
import { enqueueInsert, isOnline } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import {
  suggestNextVerratId,
  validateAddVerrat,
  type AddVerratValidation,
} from './quickAddVerratLogic';

interface QuickAddVerratFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddVerratForm: React.FC<QuickAddVerratFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const { verrats, refreshData } = useFarm();
  const { showToast } = useToast();
  const suggestedId = useMemo(() => suggestNextVerratId(verrats), [verrats]);
  // V81 Sprint 2 — unicité côté client (code + boucle) avant INSERT
  const uniqueness = useMemo(
    () => ({
      existingCodes: new Set(verrats.map((v) => (v.displayId || v.id || '').toUpperCase()).filter(Boolean)),
      existingBoucles: new Set(verrats.map((v) => (v.boucle || '').toUpperCase()).filter(Boolean)),
    }),
    [verrats],
  );
  const [code, setCode] = useState<string>(suggestedId);
  const [boucle, setBoucle] = useState<string>('');
  const [dateNaissance, setDateNaissance] = useState<string>('');
  const [origine, setOrigine] = useState<string>('');
  const [ration, setRation] = useState<string>('2.4');
  const [errors, setErrors] = useState<AddVerratValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastKey, setLastKey] = useState<{ isOpen: boolean; suggestedId: string }>({ isOpen, suggestedId });
  if (lastKey.isOpen !== isOpen || lastKey.suggestedId !== suggestedId) {
    setLastKey({ isOpen, suggestedId });
    if (isOpen) {
      setCode(suggestedId); setBoucle(''); setDateNaissance(''); setOrigine(''); setRation('2.4');
      setErrors({}); setSaving(false);
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

  const adjustRation = (delta: number): void => {
    const current = parseFloat((ration || '0').replace(',', '.')) || 0;
    const next = Math.max(0, Math.min(10, +(current + delta).toFixed(1)));
    setRation(next.toFixed(1));
  };

  const isValid = !!code.trim() && !!boucle.trim();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddVerrat({
      id: code, boucle, nom: '', race: '', dateNaissance, origine, loge: '', statut: 'Actif', ration,
    }, uniqueness);
    if (!result.ok || !result.values) { setErrors(result.errors); return; }
    setErrors({}); setSaving(true);
    try {
      const online = isOnline();
      if (online) await insertBoar(result.values);
      else await enqueueInsert('boars', result.values as Record<string, unknown>);
      showToast(online ? 'Verrat ajouté' : 'Verrat en file · sync auto', online ? 'success' : 'info', 1800);
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // (FORM_CONTRACT). setSaving n'est reset qu'en cas d'erreur (catch).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement', 'error', 1800);
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouveau verrat"
      title="Ajouter un verrat"
      ariaLabel="Ajouter un verrat"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer le verrat"
      submitAriaLabel="Ajouter le verrat au troupeau"
    >
      <div className="field">
        <label className="label--v77" htmlFor="add-verrat-code">CODE <span className="hint">auto-généré</span></label>
        <input id="add-verrat-code" ref={firstFieldRef} className={`field__input mono${code ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={10} autoCapitalize="characters" aria-label="Code du verrat" aria-required="true" aria-invalid={!!errors.id} placeholder="V-004" value={code} onChange={e => setCode(e.target.value)} disabled={saving} autoComplete="off" />
        <FieldError message={errors.id} />
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-verrat-boucle">BOUCLE <span className="req">requis</span></label>
        <input id="add-verrat-boucle" className={`field__input mono${boucle ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={30} aria-label="Boucle du verrat" aria-required="true" aria-invalid={!!errors.boucle} placeholder="CI-V04-26" value={boucle} onChange={e => setBoucle(e.target.value)} disabled={saving} autoComplete="off" />
        <FieldError message={errors.boucle} />
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-verrat-naissance">DATE NAISSANCE</label>
        <input id="add-verrat-naissance" className={`field__input mono${dateNaissance ? ' filled' : ' field__input--ghost'}`} type="date" aria-label="Date de naissance" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} disabled={saving} />
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-verrat-origine">ORIGINE / LIGNÉE</label>
        <input id="add-verrat-origine" className={`field__input${origine ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={50} aria-label="Origine ou lignée" placeholder="Pietrain · INERA Bouaké" value={origine} onChange={e => setOrigine(e.target.value)} disabled={saving} autoComplete="off" />
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-verrat-ration">RATION <span className="hint">kg / jour</span></label>
        <div className="stepper">
          <button type="button" onClick={() => adjustRation(-0.1)} aria-label="Diminuer ration" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
          <input id="add-verrat-ration" type="number" inputMode="decimal" min={0} max={10} step={0.1} aria-label="Ration en kg/j" aria-invalid={!!errors.ration} placeholder="2.4" value={ration} onChange={e => setRation(e.target.value)} disabled={saving} />
          <span className="stepper-label">kg/j</span>
          <button type="button" onClick={() => adjustRation(0.1)} aria-label="Augmenter ration" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
        </div>
        <FieldError message={errors.ration} />
      </div>
    </QuickActionSheet>
  );
};

export default QuickAddVerratForm;
