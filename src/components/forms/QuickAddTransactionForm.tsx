/**
 * QuickAddTransactionForm — Création rapide d'une transaction FINANCES
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : Date · Type · Catégorie · Libellé · Montant · Bande · Notes.
 *
 * Submit → `enqueueAppendRow('FINANCES', [DATE, CATEGORIE, LIBELLE, MONTANT,
 *           TYPE, BANDE_ID, NOTES])` — ordre canonique tel que spécifié mission.
 *
 * - Date : input[type=date] (yyyy-MM-dd) → converti en dd/MM/yyyy pour Sheets.
 * - Type : 'REVENU' | 'DEPENSE' (boutons radio).
 * - Catégorie : liste canonique ALIMENT, VETO, VETERINAIRE, MAIN_OEUVRE,
 *   MAINTENANCE, VENTE_PORCS, VENTE_AUTRE, AUTRE.
 * - Libellé : text obligatoire, max 80.
 * - Montant FCFA : number obligatoire, > 0.
 * - Bande liée : select parmi les bandes actives (optionnel).
 * - Notes : textarea max 200.
 *
 * Toast online/offline + refreshData au succès.
 *
 * Exports nommés (utilisés par les tests) :
 *   - validateAddTransaction()
 *   - buildAddTransactionRow()
 *   - CATEGORIES, TYPES
 */

import React, { useCallback, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button, RadioGroup } from '@/design-system';
import { insertFinance } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import type { FinanceType } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  CATEGORIES,
  TYPES,
  todayIso,
  validateAddTransaction,
  type AddTransactionValidation,
  type TransactionCategorie,
} from './quickAddTransactionLogic';

// ─── Props composant ────────────────────────────────────────────────────────

interface QuickAddTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Type par défaut à sélectionner à l'ouverture. */
  defaultType?: FinanceType;
}

// ─── Composant ──────────────────────────────────────────────────────────────

const QuickAddTransactionForm: React.FC<QuickAddTransactionFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'DEPENSE',
}) => {
  const { bandes, refreshData } = useFarm();

  const [date, setDate] = useState<string>(() => todayIso());
  const [type, setType] = useState<FinanceType>(defaultType);
  const [categorie, setCategorie] = useState<TransactionCategorie>('ALIMENT');
  const [libelle, setLibelle] = useState<string>('');
  const [montant, setMontant] = useState<string>('');
  const [bandeId, setBandeId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<AddTransactionValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset à l'ouverture (render-time sync)
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; defaultType: FinanceType }>({
    isOpen,
    defaultType,
  });
  if (lastKey.isOpen !== isOpen || lastKey.defaultType !== defaultType) {
    setLastKey({ isOpen, defaultType });
    if (isOpen) {
      setDate(todayIso());
      setType(defaultType);
      setCategorie(defaultType === 'REVENU' ? 'VENTE_PORCS' : 'ALIMENT');
      setLibelle('');
      setMontant('');
      setBandeId('');
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc ferme + focus auto premier input
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddTransaction({
      date, type, categorie, libelle, montant, bandeId, notes,
    });
    if (!result.ok || !result.row) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const row = result.row;
      const noteParts: string[] = [];
      const bandeRef = row[5] as string;
      if (bandeRef) noteParts.push(`bande:${bandeRef}`);
      noteParts.push(`categorie:${row[1] as string}`);
      noteParts.push(`date:${row[0] as string}`);
      const userNote = (row[6] as string) ?? '';
      if (userNote) noteParts.push(userNote);
      await insertFinance({
        poste: row[2] as string,
        type: row[4] as string,
        mensuel_fcfa: row[3] as number,
        notes: noteParts.join(' · '),
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(online ? 'Transaction ajoutée' : 'Transaction en file · sync auto');
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Nouvelle transaction"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création d'une nouvelle transaction"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <p className="text-mono-label text-text-1">
              Ajouter une transaction
            </p>
          </div>

          <FormField label="Date" required error={errors.date}>
            <Input
              id="add-tx-date"
              ref={firstFieldRef}
              type="date"
              aria-label="Date de la transaction"
              aria-required="true"
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? 'add-tx-date-error' : undefined}
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={saving}
              invalid={!!errors.date}
            />
          </FormField>

          {/* V70.9 : Radio DS dédié — remplace le radiogroup custom */}
          <RadioGroup
            label="Type"
            value={type}
            onChange={(v) => setType(v as typeof type)}
            disabled={saving}
            options={TYPES.map((t) => ({ value: t, label: t }))}
          />

          <FormField label="Catégorie">
            <Select
              id="add-tx-cat"
              aria-label="Catégorie de la transaction"
              value={categorie}
              onChange={e => setCategorie(e.target.value as TransactionCategorie)}
              disabled={saving}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Libellé"
            required
            hint={`${libelle.trim().length}/80`}
            error={errors.libelle}
          >
            <Input
              id="add-tx-libelle"
              type="text"
              maxLength={80}
              aria-label="Libellé de la transaction"
              aria-required="true"
              aria-invalid={!!errors.libelle}
              aria-describedby={
                errors.libelle ? 'add-tx-libelle-error' : 'add-tx-libelle-hint'
              }
              placeholder="Ex: Sac aliment croissance"
              value={libelle}
              onChange={e => setLibelle(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.libelle}
            />
          </FormField>

          <FormField
            label="Montant FCFA"
            required
            hint="Valeur strictement positive"
            error={errors.montant}
          >
            <Input
              id="add-tx-montant"
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              aria-label="Montant en FCFA"
              aria-required="true"
              aria-invalid={!!errors.montant}
              aria-describedby={
                errors.montant ? 'add-tx-montant-error' : 'add-tx-montant-hint'
              }
              className="font-mono text-[22px] tabular-nums text-right"
              placeholder="0"
              value={montant}
              onChange={e => setMontant(e.target.value)}
              disabled={saving}
              invalid={!!errors.montant}
            />
          </FormField>

          <FormField label="Bande liée" hint="optionnel">
            <Select
              id="add-tx-bande"
              aria-label="Bande liée à la transaction"
              value={bandeId}
              onChange={e => setBandeId(e.target.value)}
              disabled={saving}
            >
              <option value="">— aucune —</option>
              {bandes.map(b => (
                <option key={b.id} value={b.id}>
                  {b.idPortee || b.id}
                  {b.truie ? ` · ${b.truie}` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Notes"
            hint={errors.notes ? undefined : `${notes.trim().length}/200`}
            error={errors.notes}
          >
            <Textarea
              id="add-tx-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes libres sur la transaction"
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'add-tx-notes-error' : 'add-tx-notes-hint'
              }
              placeholder="Observations, référence facture…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-2 sticky bottom-0 bg-bg-1 -mx-4 px-4 pb-2 border-t border-border">
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
              ariaLabel="Ajouter la transaction"
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

export default QuickAddTransactionForm;
