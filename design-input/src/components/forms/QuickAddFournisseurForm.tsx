/**
 * QuickAddFournisseurForm — Création rapide d'un fournisseur
 * ════════════════════════════════════════════════════════════════════════
 *
 * Nom · Type (ALIMENT/PHARMACIE/GENETIQUE/AUTRE) · WhatsApp · Email · Notes ·
 * is_default. Submit → `insertFournisseur(...)`.
 *
 * Conforme FORM_CONTRACT : shell `<QuickActionSheet>`, `<form onSubmit>`,
 * toast canonique `useToast()`, validation `{ ok, errors, payload }` +
 * `<FieldError>`, reset-on-open `lastOpenKey`, garde double-clic
 * `closeTimerRef` + cleanup.
 *
 * Compagnon tests : QuickAddFournisseurForm.test.tsx
 * Logique pure : ./quickAddFournisseurLogic.ts
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { insertFournisseur } from '../../services/supabaseWrites';
import { useToast } from '../../context/ToastContext';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
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
  const { showToast } = useToast();

  const [nom, setNom] = useState('');
  const [type, setType] = useState<string>('ALIMENT');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<AddFournisseurValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<boolean>(isOpen);
  if (lastOpenKey !== isOpen) {
    setLastOpenKey(isOpen);
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
      showToast('Fournisseur ajouté', 'success');
      if (onSuccess) onSuccess();
      // Garde double-clic : saving maintenu jusqu'au onClose (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
        'error',
        4000,
      );
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouveau fournisseur"
      title="Carnet fournisseurs"
      ariaLabel="Création d'un nouveau fournisseur"
      saving={saving}
      isValid
      onSubmit={handleSubmit}
      submitLabel="Ajouter"
      submitAriaLabel="Ajouter le fournisseur"
    >
      <div className="field">
        <label className="label--v77" htmlFor="add-fourn-nom">
          NOM <span className="req">requis</span>
        </label>
        <input
          id="add-fourn-nom"
          ref={firstFieldRef}
          className={`field__input${nom ? ' filled' : ' field__input--ghost'}`}
          type="text"
          maxLength={80}
          aria-label="Nom du fournisseur"
          aria-required="true"
          aria-invalid={!!errors.nom}
          placeholder="Ex: ProvAlim Côte d'Ivoire"
          value={nom}
          onChange={e => setNom(e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.nom} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-fourn-type">TYPE</label>
        <select
          id="add-fourn-type"
          className={`field__input${type ? ' filled' : ''}`}
          aria-label="Type"
          aria-invalid={!!errors.type}
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
        <FieldError message={errors.type} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-fourn-wa">WHATSAPP</label>
        <input
          id="add-fourn-wa"
          className={`field__input mono${whatsappNumber ? ' filled' : ' field__input--ghost'}`}
          type="tel"
          inputMode="tel"
          maxLength={20}
          aria-label="WhatsApp"
          aria-invalid={!!errors.whatsappNumber}
          placeholder="+225 07 00 00 00"
          value={whatsappNumber}
          onChange={e => setWhatsappNumber(e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.whatsappNumber} />
        {!errors.whatsappNumber ? (
          <span className="hint">Min 8 chiffres. Préfixe pays inclus si possible.</span>
        ) : null}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-fourn-email">
          EMAIL <span className="hint">optionnel</span>
        </label>
        <input
          id="add-fourn-email"
          className={`field__input${email ? ' filled' : ' field__input--ghost'}`}
          type="email"
          inputMode="email"
          maxLength={120}
          aria-label="Email"
          aria-invalid={!!errors.email}
          placeholder="contact@fournisseur.ci"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.email} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-fourn-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="add-fourn-notes"
          className={`field__input${notes ? ' filled' : ' field__input--ghost'}`}
          maxLength={500}
          rows={3}
          aria-label="Notes"
          aria-invalid={!!errors.notes}
          placeholder="Délais de livraison, conditions, contact terrain…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.notes} />
      </div>

      <div className="field">
        <label className="checkbox-row">
          <input
            id="add-fourn-default"
            type="checkbox"
            checked={isDefault}
            onChange={e => setIsDefault(e.target.checked)}
            disabled={saving}
          />
          <span>Fournisseur par défaut pour ce type</span>
        </label>
      </div>
    </QuickActionSheet>
  );
};

export default QuickAddFournisseurForm;
