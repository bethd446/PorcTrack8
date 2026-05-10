/**
 * QuickAddPorceletForm — Création d'un porcelet (Sprint 5 v76)
 * ════════════════════════════════════════════════════════════════════════
 * Sheet bottom v76 · Bande select · Boucle libre · Sexe radio-chips ·
 * Poids naissance stepper.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonModal, IonToast } from '@ionic/react';
import { AlertTriangle, Check, Minus, Plus, X } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { addPorcelet } from '../../services/supabaseWrites';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  findDuplicateBoucle,
  validateAddPorcelet,
  type AddPorceletErrors,
  type DuplicateBoucleMatch,
} from './quickAddPorceletLogic';
import type { PorceletSexe, PorceletIndividuel } from '../../types/farm';

interface QuickAddPorceletFormProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  existingBoucles: Set<string>;
  existingPorcelets?: ReadonlyArray<PorceletIndividuel>;
  resolveBatchCodeId?: (batchId: string) => string | undefined;
  onSuccess?: (porcelet: PorceletIndividuel) => void;
}

const SEXE_CHOICES: ReadonlyArray<{ value: PorceletSexe; label: string }> = [
  { value: 'M', label: 'Mâle' },
  { value: 'F', label: 'Femelle' },
  { value: 'INCONNU', label: 'Inconnu' },
];

const QuickAddPorceletForm: React.FC<QuickAddPorceletFormProps> = ({
  isOpen, onClose, batchId, existingBoucles, existingPorcelets, resolveBatchCodeId, onSuccess,
}) => {
  void existingBoucles;
  const { bandes } = useFarm();
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batchId);
  const [boucle, setBoucle] = useState<string>('');
  const [sexe, setSexe] = useState<PorceletSexe>('INCONNU');
  const [poidsCourantKg, setPoidsCourantKg] = useState<string>('');
  const [errors, setErrors] = useState<AddPorceletErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [duplicate, setDuplicate] = useState<DuplicateBoucleMatch | null>(null);

  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setSelectedBatchId(batchId); setBoucle(''); setSexe('INCONNU');
      setPoidsCourantKg(''); setErrors({}); setSaving(false); setDuplicate(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    if (!existingPorcelets || existingPorcelets.length === 0) { setDuplicate(null); return; }
    const trimmed = boucle.trim();
    if (!trimmed) { setDuplicate(null); return; }
    const handle = setTimeout(() => {
      const m = findDuplicateBoucle(trimmed, sexe, existingPorcelets);
      setDuplicate(m);
    }, 300);
    return () => clearTimeout(handle);
  }, [boucle, sexe, existingPorcelets, isOpen]);

  const handleClose = useCallback(() => { if (!saving) onClose(); }, [onClose, saving]);
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(isOpen);

  const noUniquenessSet = useMemo(() => new Set<string>(), []);

  const adjustPoids = (delta: number): void => {
    const cur = parseFloat((poidsCourantKg || '0').replace(',', '.')) || 0;
    const next = Math.max(0.5, Math.min(5, +(cur + delta).toFixed(2)));
    setPoidsCourantKg(next.toFixed(2));
  };

  const isValid = !!selectedBatchId && !!boucle.trim();

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent): Promise<void> => {
    if (e) e.preventDefault();
    const result = validateAddPorcelet(
      { boucle, sexe, poidsCourantKg, notes: '' },
      noUniquenessSet,
    );
    if (!result.ok || !result.values) { setErrors(result.errors); return; }
    setErrors({}); setSaving(true);
    try {
      const created = await addPorcelet({
        batchId: selectedBatchId,
        boucle: result.values.boucle,
        sexe: result.values.sexe,
        poidsCourantKg: result.values.poidsCourantKg,
        notes: result.values.notes,
      });
      setToast('Porcelet ajouté');
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      setToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement');
    } finally { setSaving(false); }
  };

  const errMsg = (msg?: string): React.ReactNode =>
    msg ? <span role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)' }}>{msg}</span> : null;

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={handleClose} className="agritech-bottom-sheet pt-sheet-modal" aria-label="Ajouter un porcelet">
        <div className="ion-page" style={{ position: 'relative', overflow: 'auto' }}>
          <form className="sheet" onSubmit={handleSubmit} noValidate aria-label="Ajout d'un porcelet" style={{ position: 'relative', height: '100%', maxHeight: '100%' }}>
            <div className="sheet__handle" />
            <header className="sheet__head">
              <div>
                <div className="eyebrow">Nouveau porcelet</div>
                <h2>Ajouter un porcelet</h2>
              </div>
              <button type="button" className="sheet__close" onClick={handleClose} aria-label="Fermer" disabled={saving}>
                <X size={14} aria-hidden="true" />
              </button>
            </header>
            <div className="sheet__body">
              <div className="field">
                <label className="field__label" htmlFor="add-porcelet-bande">BANDE <span className="req">requis</span></label>
                <select id="add-porcelet-bande" ref={firstFieldRef} className={`field__input${selectedBatchId ? ' mono filled' : ' field__input--ghost'}`} aria-label="Bande" aria-required="true" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} disabled={saving}>
                  <option value="">— Sélectionner —</option>
                  {bandes.map(b => (
                    <option key={b.id} value={b.id}>{b.idPortee || b.id}{b.truie ? ` · ${b.truie}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="add-porcelet-boucle">BOUCLE</label>
                <input id="add-porcelet-boucle" className={`field__input mono${boucle ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={15} autoCapitalize="characters" aria-label="Boucle" aria-required="true" aria-invalid={!!errors.boucle} placeholder="CR-13" value={boucle} onChange={e => setBoucle(e.target.value)} disabled={saving} autoComplete="off" />
                {duplicate ? (
                  <div role="status" aria-live="polite" data-testid="add-porcelet-dup-warning" style={{ marginTop: 6, padding: '6px 10px', border: '1px solid #fcd34d', background: '#fffbeb', borderRadius: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <AlertTriangle size={12} aria-hidden="true" style={{ marginTop: 2, color: '#92400e', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: '#92400e' }}>
                      Cette boucle existe déjà : "{duplicate.boucle}" (sexe {duplicate.sexe})
                      {(() => {
                        const code = resolveBatchCodeId ? resolveBatchCodeId(duplicate.batchId) : undefined;
                        return code ? ` dans bande ${code}` : '';
                      })()}
                      . Continue si c'est intentionnel.
                    </span>
                  </div>
                ) : null}
                {errMsg(errors.boucle)}
              </div>
              <div className="field">
                <label className="field__label">SEXE</label>
                <div className="radio-chips" role="radiogroup" aria-label="Sexe">
                  {SEXE_CHOICES.map(s => (
                    <button key={s.value} type="button" className="radio-chip" role="radio" aria-checked={sexe === s.value} onClick={() => setSexe(s.value)} disabled={saving}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="add-porcelet-poids">POIDS NAISSANCE <span className="hint">kg</span></label>
                <div className="stepper">
                  <button type="button" onClick={() => adjustPoids(-0.05)} aria-label="Diminuer poids" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
                  <input id="add-porcelet-poids" type="number" inputMode="decimal" step={0.05} min={0.5} max={5} aria-label="Poids en kg" aria-invalid={!!errors.poidsCourantKg} placeholder="1.4" value={poidsCourantKg} onChange={e => setPoidsCourantKg(e.target.value)} disabled={saving} />
                  <span className="stepper-label">kg</span>
                  <button type="button" onClick={() => adjustPoids(0.05)} aria-label="Augmenter poids" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
                </div>
                {errMsg(errors.poidsCourantKg)}
              </div>
            </div>
            <footer className="sheet__foot">
              <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={saving} aria-label="Annuler et fermer">Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={saving || !isValid} aria-busy={saving} aria-label="Enregistrer le porcelet">
                {saving ? 'Enregistrement…' : <><Check size={14} aria-hidden="true" /> Enregistrer le porcelet</>}
              </button>
            </footer>
          </form>
        </div>
      </IonModal>
      <IonToast isOpen={toast !== ''} message={toast} duration={1800} onDidDismiss={() => setToast('')} position="bottom" />
    </>
  );
};

export default QuickAddPorceletForm;
