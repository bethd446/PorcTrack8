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
import { FormField, Input, Select, Textarea, Button, Checkbox } from '@/design-system';
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

          <FormField label="Nom" required error={errors.nom}>
            <Input
              id="add-fourn-nom"
              ref={firstFieldRef}
              type="text"
              aria-label="Nom du fournisseur"
              maxLength={80}
              aria-required="true"
              aria-invalid={!!errors.nom}
              aria-describedby={errors.nom ? 'add-fourn-nom-error' : undefined}
              placeholder="Ex: ProvAlim Côte d'Ivoire"
              value={nom}
              onChange={e => setNom(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.nom}
            />
          </FormField>

          <FormField label="Type">
            <Select
              id="add-fourn-type"
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
            </Select>
          </FormField>

          <FormField
            label="WhatsApp"
            hint={errors.whatsappNumber ? undefined : 'Min 8 chiffres. Préfixe pays inclus si possible.'}
            error={errors.whatsappNumber}
          >
            <Input
              id="add-fourn-wa"
              type="tel"
              aria-label="WhatsApp"
              inputMode="tel"
              maxLength={20}
              aria-invalid={!!errors.whatsappNumber}
              aria-describedby={
                errors.whatsappNumber ? 'add-fourn-wa-error' : 'add-fourn-wa-hint'
              }
              className="tabular-nums"
              placeholder="+225 07 00 00 00"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.whatsappNumber}
            />
          </FormField>

          <FormField label="Email" hint="optionnel" error={errors.email}>
            <Input
              id="add-fourn-email"
              type="email"
              aria-label="Email"
              inputMode="email"
              maxLength={120}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'add-fourn-email-error' : undefined}
              placeholder="contact@fournisseur.ci"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.email}
            />
          </FormField>

          <FormField label="Notes" hint="optionnel" error={errors.notes}>
            <Textarea
              id="add-fourn-notes"
              aria-label="Notes"
              maxLength={500}
              rows={3}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? 'add-fourn-notes-error' : undefined}
              placeholder="Délais de livraison, conditions, contact terrain…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
          </FormField>

          {/* V70.9 : Checkbox DS dédié — remplace l'input natif custom */}
          <Checkbox
            id="add-fourn-default"
            label="Fournisseur par défaut pour ce type"
            checked={isDefault}
            onChange={setIsDefault}
            disabled={saving}
          />

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
              ariaLabel="Annuler et fermer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              aria-busy={saving}
              ariaLabel="Ajouter le fournisseur"
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
                  Ajouter
                  <Save size={14} aria-hidden="true" />
                </span>
              )}
            </Button>
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
