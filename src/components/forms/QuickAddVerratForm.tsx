/**
 * QuickAddVerratForm — Création rapide d'un verrat (Sprint 5 v76)
 * ════════════════════════════════════════════════════════════════════════
 * Sheet bottom v76 · Code mono auto-gen · Boucle · Date naissance ·
 * Origine/lignée libre · Ration kg/j stepper.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Check, Minus, Plus, X } from 'lucide-react';

import { AppToast, useAppToast } from '../agritech';
import { insertBoar } from '../../services/supabaseWrites';
import { enqueueInsert, isOnline } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
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
  const suggestedId = useMemo(() => suggestNextVerratId(verrats), [verrats]);
  const [code, setCode] = useState<string>(suggestedId);
  const [boucle, setBoucle] = useState<string>('');
  const [dateNaissance, setDateNaissance] = useState<string>('');
  const [origine, setOrigine] = useState<string>('');
  const [ration, setRation] = useState<string>('2.4');
  const [errors, setErrors] = useState<AddVerratValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const { show: showToast, toastProps } = useAppToast();

  const [lastKey, setLastKey] = useState<{ isOpen: boolean; suggestedId: string }>({ isOpen, suggestedId });
  if (lastKey.isOpen !== isOpen || lastKey.suggestedId !== suggestedId) {
    setLastKey({ isOpen, suggestedId });
    if (isOpen) {
      setCode(suggestedId); setBoucle(''); setDateNaissance(''); setOrigine(''); setRation('2.4');
      setErrors({}); setSaving(false);
    }
  }

  const handleClose = useCallback(() => { if (!saving) onClose(); }, [onClose, saving]);
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const adjustRation = (delta: number): void => {
    const current = parseFloat((ration || '0').replace(',', '.')) || 0;
    const next = Math.max(0, Math.min(10, +(current + delta).toFixed(1)));
    setRation(next.toFixed(1));
  };

  const isValid = !!code.trim() && !!boucle.trim();

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent): Promise<void> => {
    if (e) e.preventDefault();
    const result = validateAddVerrat({
      id: code, boucle, nom: '', race: '', dateNaissance, origine, loge: '', statut: 'Actif', ration,
    });
    if (!result.ok || !result.values) { setErrors(result.errors); return; }
    setErrors({}); setSaving(true);
    try {
      const online = isOnline();
      if (online) await insertBoar(result.values);
      else await enqueueInsert('boars', result.values as Record<string, unknown>);
      showToast(online ? 'Verrat ajouté' : 'Verrat en file · sync auto', online ? 'success' : 'info', { duration: 1800 });
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement', 'error', { duration: 1800 });
    } finally { setSaving(false); }
  };

  const errMsg = (msg?: string): React.ReactNode =>
    msg ? <span role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)' }}>{msg}</span> : null;

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={handleClose} breakpoints={[0, 1]} initialBreakpoint={1} className="agritech-bottom-sheet pt-sheet-modal pt-screen" aria-label="Ajouter un verrat">
        <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
          <form className="sheet" onSubmit={handleSubmit} noValidate aria-label="Création d'un verrat" style={{ position: 'relative', height: '100%', maxHeight: '100%' }}>
            <span className="sheet__handle" />
            <header className="sheet__head">
              <div>
                <div className="eyebrow">Nouveau verrat</div>
                <h2 className="sheet__title">Ajouter un verrat</h2>
              </div>
              <button type="button" className="sheet__close" onClick={handleClose} aria-label="Fermer" disabled={saving}>
                <X size={14} aria-hidden="true" />
              </button>
            </header>
            <div className="sheet__body">
              <div className="field">
                <label className="label--v77" htmlFor="add-verrat-code">CODE <span className="hint">auto-généré</span></label>
                <input id="add-verrat-code" ref={firstFieldRef} className={`field__input mono${code ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={10} autoCapitalize="characters" aria-label="Code du verrat" aria-required="true" aria-invalid={!!errors.id} placeholder="V-004" value={code} onChange={e => setCode(e.target.value)} disabled={saving} autoComplete="off" />
                {errMsg(errors.id)}
              </div>
              <div className="field">
                <label className="label--v77" htmlFor="add-verrat-boucle">BOUCLE <span className="req">requis</span></label>
                <input id="add-verrat-boucle" className={`field__input mono${boucle ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={30} aria-label="Boucle du verrat" aria-required="true" aria-invalid={!!errors.boucle} placeholder="CI-V04-26" value={boucle} onChange={e => setBoucle(e.target.value)} disabled={saving} autoComplete="off" />
                {errMsg(errors.boucle)}
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
                {errMsg(errors.ration)}
              </div>
            </div>
            <footer className="sheet__foot">
              <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={saving} aria-label="Annuler et fermer">Annuler</button>
              <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={saving || !isValid} aria-busy={saving} aria-label="Ajouter le verrat au troupeau">
                {saving ? 'Enregistrement…' : <><Check size={14} aria-hidden="true" /> Enregistrer le verrat</>}
              </button>
            </footer>
          </form>
        </div>
      </IonModal>
      <AppToast {...toastProps} />
    </>
  );
};

export default QuickAddVerratForm;
