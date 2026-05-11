/**
 * QuickAddLogeForm — Création rapide d'une loge (Sprint 5 v76)
 * ════════════════════════════════════════════════════════════════════════
 * Sheet bottom v76 · Type radio-chips · Code auto-gen · Capacité stepper ·
 * Position libre.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { IonModal, IonToast } from '@ionic/react';
import { Check, Minus, Plus, X } from 'lucide-react';

import { createLoge, listLoges } from '../../services/supabaseWrites';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
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
  const [type, setType] = useState<ChipType>('MATERNITE');
  const [code, setCode] = useState('');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [capacite, setCapacite] = useState<string>('12');
  const [position, setPosition] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [existingLoges, setExistingLoges] = useState<Loge[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then(rows => { if (!cancelled) setExistingLoges(rows.filter(l => l.active)); })
      .catch(() => { if (!cancelled) setExistingLoges([]); });
    return () => { cancelled = true; };
  }, [isOpen]);

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

  const handleClose = useCallback(() => { if (!saving) onClose(); }, [onClose, saving]);
  useEscapeKey(isOpen && !saving, handleClose);
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

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent): Promise<void> => {
    if (e) e.preventDefault();
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
      setToast('Loge créée');
      onSuccess?.(created);
      onClose();
    } catch (err) {
      setToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement');
    } finally { setSaving(false); }
  };

  const errMsg = (msg?: string): React.ReactNode =>
    msg ? <span role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)' }}>{msg}</span> : null;

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={handleClose} breakpoints={[0, 1]} initialBreakpoint={1} className="agritech-bottom-sheet pt-sheet-modal pt-screen" aria-label="Ajouter une loge">
        <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
          <form className="sheet" onSubmit={handleSubmit} noValidate aria-label="Création d'une loge" style={{ position: 'relative', height: '100%', maxHeight: '100%' }}>
            <span className="sheet__handle" />
            <header className="sheet__head">
              <div>
                <div className="eyebrow">Nouvelle loge</div>
                <h2 className="sheet__title">Ajouter une loge</h2>
              </div>
              <button type="button" className="sheet__close" onClick={handleClose} aria-label="Fermer" disabled={saving}>
                <X size={14} aria-hidden="true" />
              </button>
            </header>
            <div className="sheet__body">
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
                {errMsg(errors.numero)}
              </div>
              <div className="field">
                <label className="label--v77" htmlFor="add-loge-capacite">CAPACITÉ MAX</label>
                <div className="stepper">
                  <button type="button" onClick={() => adjustCapacite(-1)} aria-label="Diminuer capacité" disabled={saving}><Minus size={14} aria-hidden="true" /></button>
                  <input id="add-loge-capacite" type="number" inputMode="numeric" min={0} max={500} step={1} aria-label="Capacité max" aria-invalid={!!errors.capaciteMax} placeholder="0" value={capacite} onChange={e => setCapacite(e.target.value)} disabled={saving} />
                  <span className="stepper-label">animaux</span>
                  <button type="button" onClick={() => adjustCapacite(1)} aria-label="Augmenter capacité" disabled={saving}><Plus size={14} aria-hidden="true" /></button>
                </div>
                {errMsg(errors.capaciteMax)}
              </div>
              <div className="field">
                <label className="label--v77" htmlFor="add-loge-position">POSITION <span className="hint">libre</span></label>
                <input id="add-loge-position" className={`field__input${position ? ' filled' : ' field__input--ghost'}`} type="text" maxLength={50} aria-label="Position" placeholder="ex. bâtiment A · case 4" value={position} onChange={e => setPosition(e.target.value)} disabled={saving} autoComplete="off" />
              </div>
            </div>
            <footer className="sheet__foot">
              <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={saving} aria-label="Annuler et fermer">Annuler</button>
              <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={saving || !isValid} aria-busy={saving} aria-label="Créer la loge">
                {saving ? 'Création…' : <><Check size={14} aria-hidden="true" /> Enregistrer la loge</>}
              </button>
            </footer>
          </form>
        </div>
      </IonModal>
      <IonToast isOpen={toast !== ''} message={toast} duration={1800} onDidDismiss={() => setToast('')} position="bottom" />
    </>
  );
};

export default QuickAddLogeForm;
