/**
 * QuickAddFournisseurForm — Création rapide d'un fournisseur
 * ════════════════════════════════════════════════════════════════════════
 *
 * BottomSheet : Nom · Type (ALIMENT/PHARMACIE/GENETIQUE/AUTRE) · WhatsApp ·
 * Email · Notes · is_default. Submit → `insertFournisseur(...)`.
 *
 * Compagnon tests : QuickAddFournisseurForm.test.tsx
 * Logique pure : ./quickAddFournisseurLogic.ts
 */

import React, { useCallback, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { insertFournisseur } from '../../services/supabaseWrites';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  FOURNISSEUR_TYPES,
  validateAddFournisseur,
  type AddFournisseurInput,
  type AddFournisseurValidation,
} from './quickAddFournisseurLogic';

interface QuickAddFournisseurFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddFournisseurForm: React.FC<QuickAddFournisseurFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [nom, setNom] = useState('');
  const [type, setType] = useState<string>('ALIMENT');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<AddFournisseurValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setNom('');
      setType('ALIMENT');
      setWhatsappNumber('');
      setEmail('');
      setNotes('');
      setIsDefault(false);
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const input: AddFournisseurInput = {
      nom,
      type,
      whatsappNumber,
      email,
      notes,
      isDefault,
    };
    const result = validateAddFournisseur(input);
    if (!result.ok || !result.payload) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await insertFournisseur(result.payload);
      setToast('Fournisseur ajouté');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Nouveau fournisseur"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création d'un nouveau fournisseur"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <p className="text-mono-label text-text-1">
              Carnet fournisseurs
            </p>
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-fourn-nom"
              className="block text-mono-label text-text-2"
            >
              Nom <span className="text-red normal-case">· obligatoire</span>
            </label>
            <input
              id="add-fourn-nom"
              ref={firstFieldRef}
              type="text"
              maxLength={80}
              aria-required="true"
              aria-invalid={!!errors.nom}
              aria-describedby={errors.nom ? 'add-fourn-nom-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-sans text-[14px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.nom ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: ProvAlim Côte d'Ivoire"
              value={nom}
              onChange={e => setNom(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.nom ? (
              <p id="add-fourn-nom-error" role="alert" className="text-[11px] text-red">
                {errors.nom}
              </p>
            ) : null}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-fourn-type"
              className="block text-mono-label text-text-2"
            >
              Type
            </label>
            <select
              id="add-fourn-type"
              aria-invalid={!!errors.type}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0',
                'text-[13px] uppercase',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.type ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              value={type}
              onChange={e => setType(e.target.value)}
              disabled={saving}
            >
              {FOURNISSEUR_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-fourn-wa"
              className="block text-mono-label text-text-2"
            >
              WhatsApp <span className="text-text-2 normal-case">· format international</span>
            </label>
            <input
              id="add-fourn-wa"
              type="tel"
              inputMode="tel"
              maxLength={20}
              aria-invalid={!!errors.whatsappNumber}
              aria-describedby={
                errors.whatsappNumber ? 'add-fourn-wa-error' : 'add-fourn-wa-hint'
              }
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'text-[14px] tabular-nums',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.whatsappNumber ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="+225 07 00 00 00"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.whatsappNumber ? (
              <p id="add-fourn-wa-error" role="alert" className="text-[11px] text-red">
                {errors.whatsappNumber}
              </p>
            ) : (
              <p id="add-fourn-wa-hint" className="text-[10px] text-text-2">
                Min 8 chiffres. Préfixe pays inclus si possible.
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-fourn-email"
              className="block text-mono-label text-text-2"
            >
              Email <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <input
              id="add-fourn-email"
              type="email"
              inputMode="email"
              maxLength={120}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'add-fourn-email-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-sans text-[14px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.email ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="contact@fournisseur.ci"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.email ? (
              <p id="add-fourn-email-error" role="alert" className="text-[11px] text-red">
                {errors.email}
              </p>
            ) : null}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-fourn-notes"
              className="block text-mono-label text-text-2"
            >
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="add-fourn-notes"
              maxLength={500}
              rows={3}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? 'add-fourn-notes-error' : undefined}
              className={[
                'w-full rounded-md px-3 py-2',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-sans text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Délais de livraison, conditions, contact terrain…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
            {errors.notes ? (
              <p id="add-fourn-notes-error" role="alert" className="text-[11px] text-red">
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* Default */}
          <div className="flex items-center gap-3">
            <input
              id="add-fourn-default"
              type="checkbox"
              className="h-5 w-5 rounded border-border accent-accent"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              disabled={saving}
            />
            <label
              htmlFor="add-fourn-default"
              className="text-mono-label text-text-1 cursor-pointer"
            >
              Fournisseur par défaut pour ce type
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              aria-label="Annuler et fermer"
              className={[
                'pressable flex-1 h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-bg-1 border border-border text-text-1',
                'text-[12px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms] hover:border-text-2',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              aria-label="Ajouter le fournisseur"
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'text-[13px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
              ].join(' ')}
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement…</span>
              ) : (
                <>
                  <span>Ajouter</span>
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

export default QuickAddFournisseurForm;
