/**
 * QuickAddLogeForm — Création rapide d'une loge.
 * ════════════════════════════════════════════════════════════════════════
 * Migré au FORM_CONTRACT (Phase 2 · Batch C) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace IonToast local)
 *  - rendu d'erreur via `<FieldError>` (remplace `errMsg()` inline)
 *  - reset-on-open via `lastOpen` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Champs : Type radio-chips · Code auto-gen · Capacité stepper · Position libre.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

import { useToast } from '../../context/ToastContext';
import { createLoge, listLoges } from '../../services/supabaseWrites';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import type { Loge, LogeType } from '../../types/farm';

interface QuickAddLogeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (loge: Loge) => void;
}

type ChipType = 'MATERNITE' | 'POST_SEVRAGE' | 'ENGRAISSEMENT';
const TYPE_CHOICES: ReadonlyArray<{ value: ChipType; label: string; prefix: string }> = [
  { value: 'MATERNITE', label: 'Maternité', prefix: 'M' },
  { value: 'POST_SEVRAGE', label: 'Post-sev.', prefix: 'PS' },
  { value: 'ENGRAISSEMENT', label: 'Engrais.', prefix: 'E' },
];

const QuickAddLogeForm: React.FC<QuickAddLogeFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [type, setType] = useState<ChipType>('MATERNITE');
  const [code, setCode] = useState('');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [capacite, setCapacite] = useState<string>('12');
  const [position, setPosition] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [existingLoges, setExistingLoges] = useState<Loge[]>([]);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then(rows => { if (!cancelled) setExistingLoges(rows.filter(l => l.active)); })
      .catch(() => { if (!cancelled) setExistingLoges([]); });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  const suggestCode = useCallback((t: ChipType): string => {
    const prefix = TYPE_CHOICES.find(c => c.value === t)?.prefix ?? 'X';
    const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    let max = 0;
    for (const l of existingLoges) {
      const m = (l.numero || '').match(re);
      if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    }
    return `${prefix}-${String(max + 1).padStart(2, '0')}`;
  }, [existingLoges]);

  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setType('MATERNITE'); setCode(''); setCodeManuallyEdited(false);
      setCapacite('12'); setPosition(''); setErrors({}); setSaving(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    if (codeManuallyEdited) return;
    setCode(suggestCode(type));
  }, [isOpen, type, suggestCode, codeManuallyEdited]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);
  const firstFieldRef = useFocusFirstInput<HTMLButtonElement>(isOpen);

  const adjustCapacite = (delta: number): void => {
    const cur = parseInt(capacite || '0', 10) || 0;
    const next = Math.max(0, Math.min(500, cur + delta));
    setCapacite(String(next));
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const trimmed = code.trim();
    if (!trimmed) errs.numero = 'Code requis';
    else if (trimmed.length > 20) errs.numero = 'Maximum 20 caractères';
    else if (existingLoges.some(l => l.numero.trim().toLowerCase() === trimmed.toLowerCase())) {
      errs.numero = `Code "${trimmed}" déjà utilisé`;
    }
    if (capacite) {
      const n = Number(capacite);
      if (!Number.isFinite(n) || n < 0 || n > 500) errs.capaciteMax = 'Capacité 0..500';
    }
    return errs;
  };

  const isValid = !!code.trim();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({}); setSaving(true);
    try {
      const created = await createLoge({
        numero: code.trim(),
        type: type as LogeType,
        batiment: position.trim() || undefined,
        capaciteMax: capacite ? Number(capacite) : undefined,
      });
      showToast('Loge créée', 'success');
      onSuccess?.(created);
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
      eyebrow="Nouvelle loge"
      title="Ajouter une loge"
      ariaLabel="Ajouter une loge"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer la loge"
      savingLabel="Création…"
      submitAriaLabel="Créer la loge"
    >
      <div className="field">
        <label className="label--v77">CATÉGORIE</label>
        <div className="radio-chips--cards" role="radiogroup" aria-label="Catégorie">
          {TYPE_CHOICES.map((t, i) => (
            <button key={t.value} ref={i === 0 ? firstFieldRef : undefined} type="button" className={`radio-chip--card${type === t.value ? ' is-selected' : ''}`} role="radio" aria-checked={type === t.value} onClick={() => { setType(t.value); setCodeManuallyEdited(false); }} disabled={saving}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-loge-code">CODE <span className="hint">auto selon type</span></label>
        <input id="add-loge-code" className={`field__input mono${code ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={20} aria-label="Code de la loge" aria-required="true" aria-invalid={!!errors.numero} placeholder="M-04" value={code} onChange={e => { setCode(e.target.value); setCodeManuallyEdited(true); }} disabled={saving} autoComplete="off" />
        <FieldError message={errors.numero} />
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-loge-capacite">CAPACITÉ MAX</label>
        <div className="stepper">
          <button type="button" onClick={() => adjustCapacite(-1)} aria-label="Diminuer capacité" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
          <input id="add-loge-capacite" type="number" inputMode="numeric" min={0} max={500} step={1} aria-label="Capacité max" aria-invalid={!!errors.capaciteMax} placeholder="0" value={capacite} onChange={e => setCapacite(e.target.value)} disabled={saving} />
          <span className="stepper-label">animaux</span>
          <button type="button" onClick={() => adjustCapacite(1)} aria-label="Augmenter capacité" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
        </div>
        <FieldError message={errors.capaciteMax} />
      </div>
      <div className="field">
        <label className="label--v77" htmlFor="add-loge-position">POSITION <span className="hint">libre</span></label>
        <input id="add-loge-position" className={`field__input${position ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={50} aria-label="Position" placeholder="ex. bâtiment A · case 4" value={position} onChange={e => setPosition(e.target.value)} disabled={saving} autoComplete="off" />
      </div>
    </QuickActionSheet>
  );
};

export default QuickAddLogeForm;
