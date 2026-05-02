/**
 * QuickAddLogeForm — Création rapide d'une loge (V24)
 * ════════════════════════════════════════════════════════════════════════
 * Form minimal pour ajouter une loge depuis QuickEditBandeForm (sélecteur
 * "+ Nouvelle loge"). V6-C enrichira ce formulaire (page admin /troupeau/loges).
 *
 * Champs : numéro (text required) · type (select 9 valeurs) · bâtiment (opt)
 * · capacité (0..500 opt) · notes (opt). Submit → `createLoge(...)`.
 */

import React, { useCallback, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { createLoge } from '../../services/supabaseWrites';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import type { Loge, LogeType } from '../../types/farm';

const LOGE_TYPES: { value: LogeType; label: string }[] = [
  { value: 'MATERNITE', label: 'Maternité' },
  { value: 'POST_SEVRAGE', label: 'Post-sevrage' },
  { value: 'CROISSANCE', label: 'Croissance' },
  { value: 'ENGRAISSEMENT', label: 'Engraissement' },
  { value: 'FINITION', label: 'Finition' },
  { value: 'GESTANTE', label: 'Gestante' },
  { value: 'VERRAT', label: 'Verrat' },
  { value: 'INFIRMERIE', label: 'Infirmerie' },
  { value: 'AUTRE', label: 'Autre' },
];

interface QuickAddLogeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (loge: Loge) => void;
}

const QuickAddLogeForm: React.FC<QuickAddLogeFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [numero, setNumero] = useState('');
  const [type, setType] = useState<LogeType>('MATERNITE');
  const [batiment, setBatiment] = useState('');
  const [capaciteMax, setCapaciteMax] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setNumero('');
      setType('MATERNITE');
      setBatiment('');
      setCapaciteMax('');
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!numero.trim()) errs.numero = 'Numéro requis';
    else if (numero.trim().length > 20) errs.numero = 'Maximum 20 caractères';
    if (capaciteMax) {
      const n = Number(capaciteMax);
      if (!Number.isFinite(n) || n < 0 || n > 500) {
        errs.capaciteMax = 'Capacité 0..500';
      }
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const created = await createLoge({
        numero: numero.trim(),
        type,
        batiment: batiment.trim() || undefined,
        capaciteMax: capaciteMax ? Number(capaciteMax) : undefined,
        notes: notes.trim() || undefined,
      });
      setToast('Loge créée');
      onSuccess?.(created);
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
      );
    } finally {
      setSaving(false);
    }
  };

  const inputBase = (hasError: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[14px]',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      hasError ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  const labelCls =
    'block font-mono text-[11px] uppercase tracking-wide text-text-2';

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Nouvelle loge"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création loge"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Ajouter une loge
              </p>
              <p className="font-mono text-[10px] text-text-2 mt-0.5">
                Numéro libre · type · capacité optionnelle
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-loge-numero" className={labelCls}>
              Numéro <span className="text-red normal-case">· requis</span>
            </label>
            <input
              id="add-loge-numero"
              ref={firstFieldRef}
              type="text"
              maxLength={20}
              aria-invalid={!!errors.numero}
              aria-describedby={errors.numero ? 'add-loge-numero-error' : undefined}
              className={inputBase(!!errors.numero)}
              placeholder="Ex: M-01"
              value={numero}
              onChange={e => setNumero(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {errors.numero ? (
              <p
                id="add-loge-numero-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.numero}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-loge-type" className={labelCls}>
              Type <span className="text-red normal-case">· requis</span>
            </label>
            <select
              id="add-loge-type"
              className={inputBase(false)}
              value={type}
              onChange={e => setType(e.target.value as LogeType)}
            >
              {LOGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-loge-batiment" className={labelCls}>
              Bâtiment <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <input
              id="add-loge-batiment"
              type="text"
              maxLength={30}
              className={inputBase(false)}
              placeholder="Ex: Bât. A"
              value={batiment}
              onChange={e => setBatiment(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-loge-capacite" className={labelCls}>
              Capacité max{' '}
              <span className="text-text-2 normal-case">· optionnel (0-500)</span>
            </label>
            <input
              id="add-loge-capacite"
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              step={1}
              aria-invalid={!!errors.capaciteMax}
              aria-describedby={
                errors.capaciteMax ? 'add-loge-capacite-error' : undefined
              }
              className={inputBase(!!errors.capaciteMax)}
              placeholder="0"
              value={capaciteMax}
              onChange={e => setCapaciteMax(e.target.value)}
            />
            {errors.capaciteMax ? (
              <p
                id="add-loge-capacite-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.capaciteMax}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-loge-notes" className={labelCls}>
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="add-loge-notes"
              maxLength={200}
              className={[
                'w-full rounded-md px-3 py-3',
                'bg-bg-0 border border-border text-text-0',
                'font-mono text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                'min-h-[72px] resize-y',
              ].join(' ')}
              placeholder="Observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className={[
                'pressable flex-1 h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-bg-1 border border-border text-text-1',
                'font-mono text-[12px] font-bold uppercase tracking-wide',
                saving ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'font-mono text-[13px] font-bold uppercase tracking-wide',
                saving ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
              ].join(' ')}
            >
              {saving ? (
                <span className="animate-pulse">Création…</span>
              ) : (
                <>
                  <span>Créer la loge</span>
                  <Save size={14} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={1800}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default QuickAddLogeForm;
