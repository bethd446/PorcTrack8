/**
 * QuickAddPorceletForm — Création d'un porcelet.
 * ════════════════════════════════════════════════════════════════════════
 * Migré au FORM_CONTRACT (Phase 2 · Batch C) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace IonToast local)
 *  - rendu d'erreur via `<FieldError>` (remplace `errMsg()` inline)
 *  - reset-on-open via `lastOpen` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Champs : Bande select · Boucle libre · Sexe radio-chips · Poids naissance
 * stepper. Détection doublon boucle (warning non-bloquant).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Minus, Plus } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { addPorcelet } from '../../services/supabaseWrites';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
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
  const { showToast } = useToast();
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batchId);
  const [boucle, setBoucle] = useState<string>('');
  const [sexe, setSexe] = useState<PorceletSexe>('INCONNU');
  const [poidsCourantKg, setPoidsCourantKg] = useState<string>('');
  const [errors, setErrors] = useState<AddPorceletErrors>({});
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateBoucleMatch | null>(null);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setSelectedBatchId(batchId); setBoucle(''); setSexe('INCONNU');
      setPoidsCourantKg(''); setErrors({}); setSaving(false); setDuplicate(null);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

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

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(isOpen);

  const noUniquenessSet = useMemo(() => new Set<string>(), []);

  const adjustPoids = (delta: number): void => {
    const cur = parseFloat((poidsCourantKg || '0').replace(',', '.')) || 0;
    const next = Math.max(0.5, Math.min(5, +(cur + delta).toFixed(2)));
    setPoidsCourantKg(next.toFixed(2));
  };

  const isValid = !!selectedBatchId && !!boucle.trim();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
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
      showToast('Porcelet ajouté', 'success');
      if (onSuccess) onSuccess(created);
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic dans
      // la fenêtre 1.5s entre toast success et fermeture (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement', 'error');
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouveau porcelet"
      title="Ajouter un porcelet"
      ariaLabel="Ajout d'un porcelet"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer le porcelet"
      submitAriaLabel="Enregistrer le porcelet"
    >
      <div className="field">
        <label className="label--v77" htmlFor="add-porcelet-bande">BANDE <span className="req">requis</span></label>
        <select id="add-porcelet-bande" ref={firstFieldRef} className={`field__input${selectedBatchId ? ' mono filled' : ' field__input--ghost'}`} aria-label="Bande" aria-required="true" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} disabled={saving}>
          <option value="">— Sélectionner —</option>
          {bandes.map(b => (
            <option key={b.id} value={b.id}>{b.idPortee || b.id}{b.truie ? ` · ${b.truie}` : ''}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-porcelet-boucle">BOUCLE</label>
        <input id="add-porcelet-boucle" className={`field__input mono${boucle ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={15} autoCapitalize="characters" aria-label="Boucle" aria-required="true" aria-invalid={!!errors.boucle} placeholder="CR-13" value={boucle} onChange={e => setBoucle(e.target.value)} disabled={saving} autoComplete="off" />
        {duplicate ? (
          <div role="status" aria-live="polite" data-testid="add-porcelet-dup-warning" style={{ marginTop: 6, padding: '6px 10px', border: '1px solid var(--pt-warn-border-pale)', background: 'var(--pt-warn-bg-pale)', borderRadius: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <AlertTriangle size={12} aria-hidden="true" style={{ marginTop: 2, color: 'var(--pt-amber-ink)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-amber-ink)' }}>
              Cette boucle existe déjà : "{duplicate.boucle}" (sexe {duplicate.sexe})
              {(() => {
                const code = resolveBatchCodeId ? resolveBatchCodeId(duplicate.batchId) : undefined;
                return code ? ` dans bande ${code}` : '';
              })()}
              . Continue si c'est intentionnel.
            </span>
          </div>
        ) : null}
        <FieldError message={errors.boucle} />
      </div>
      <div className="field">
        <label className="label--v77">SEXE</label>
        <div className="radio-chips--cards" role="radiogroup" aria-label="Sexe">
          {SEXE_CHOICES.map(s => (
            <button key={s.value} type="button" className={`radio-chip--card${sexe === s.value ? ' is-selected' : ''}`} role="radio" aria-checked={sexe === s.value} onClick={() => setSexe(s.value)} disabled={saving}>{s.label}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-porcelet-poids">POIDS NAISSANCE <span className="hint">kg</span></label>
        <div className="stepper">
          <button type="button" onClick={() => adjustPoids(-0.05)} aria-label="Diminuer poids" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
          <input id="add-porcelet-poids" type="number" inputMode="decimal" step={0.05} min={0.5} max={5} aria-label="Poids en kg" aria-invalid={!!errors.poidsCourantKg} placeholder="1.4" value={poidsCourantKg} onChange={e => setPoidsCourantKg(e.target.value)} disabled={saving} />
          <span className="stepper-label">kg</span>
          <button type="button" onClick={() => adjustPoids(0.05)} aria-label="Augmenter poids" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
        </div>
        <FieldError message={errors.poidsCourantKg} />
      </div>
    </QuickActionSheet>
  );
};

export default QuickAddPorceletForm;
