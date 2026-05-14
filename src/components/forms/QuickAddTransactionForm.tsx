/**
 * QuickAddTransactionForm — Création rapide d'une transaction FINANCES
 * ════════════════════════════════════════════════════════════════════════
 * Date · Type · Catégorie · Libellé · Montant · Bande · Notes.
 *
 * Submit → `insertFinance(...)` depuis la row canonique
 *   [DATE (dd/MM/yyyy), CATEGORIE, LIBELLE, MONTANT, TYPE, BANDE_ID, NOTES].
 *
 * Conforme FORM_CONTRACT : shell `<QuickActionSheet>`, `<form onSubmit>`,
 * toast canonique `useToast()`, validation `{ ok, errors, row }` +
 * `<FieldError>`, reset-on-open `lastOpenKey`, garde double-clic
 * `closeTimerRef` + cleanup.
 *
 * Compagnon tests : QuickAddTransactionForm.test.tsx
 * Logique pure : ./quickAddTransactionLogic.ts
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { insertFinance } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import type { FinanceType } from '../../types/farm';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
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
  const { showToast } = useToast();

  const [date, setDate] = useState<string>(() => todayIso());
  const [type, setType] = useState<FinanceType>(defaultType);
  const [categorie, setCategorie] = useState<TransactionCategorie>('ALIMENT');
  const [libelle, setLibelle] = useState<string>('');
  const [montant, setMontant] = useState<string>('');
  const [bandeId, setBandeId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<AddTransactionValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultType: FinanceType }>({
    isOpen,
    defaultType,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultType !== defaultType) {
    setLastOpenKey({ isOpen, defaultType });
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
      showToast(
        online ? 'Transaction ajoutée' : 'Transaction en file · sync auto',
        online ? 'success' : 'info',
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
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
      eyebrow="Nouvelle transaction"
      title="Ajouter une transaction"
      ariaLabel="Création d'une nouvelle transaction"
      saving={saving}
      isValid
      onSubmit={handleSubmit}
      submitLabel="Ajouter"
      submitAriaLabel="Ajouter la transaction"
    >
      <div className="field">
        <label className="label--v77" htmlFor="add-tx-date">
          DATE <span className="req">requis</span>
        </label>
        <input
          id="add-tx-date"
          ref={firstFieldRef}
          className={`field__input mono${date ? ' filled' : ' field__input--ghost'}`}
          type="date"
          aria-label="Date de la transaction"
          aria-required="true"
          aria-invalid={!!errors.date}
          value={date}
          onChange={e => setDate(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.date} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-tx-type">TYPE</label>
        <select
          id="add-tx-type"
          className={`field__input${type ? ' filled' : ''}`}
          aria-label="Type"
          value={type}
          onChange={e => setType(e.target.value as FinanceType)}
          disabled={saving}
        >
          {TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-tx-cat">CATÉGORIE</label>
        <select
          id="add-tx-cat"
          className={`field__input${categorie ? ' filled' : ''}`}
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
        </select>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-tx-libelle">
          LIBELLÉ <span className="req">requis</span>
        </label>
        <input
          id="add-tx-libelle"
          className={`field__input${libelle ? ' filled' : ' field__input--ghost'}`}
          type="text"
          maxLength={80}
          aria-label="Libellé de la transaction"
          aria-required="true"
          aria-invalid={!!errors.libelle}
          placeholder="Ex: Sac aliment croissance"
          value={libelle}
          onChange={e => setLibelle(e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.libelle} />
        {!errors.libelle ? (
          <span className="hint">{libelle.trim().length}/80</span>
        ) : null}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-tx-montant">
          MONTANT FCFA <span className="req">requis</span>
        </label>
        <input
          id="add-tx-montant"
          className={`field__input mono${montant ? ' filled' : ' field__input--ghost'}`}
          type="number"
          inputMode="decimal"
          min={0}
          step={1}
          aria-label="Montant en FCFA"
          aria-required="true"
          aria-invalid={!!errors.montant}
          placeholder="0"
          value={montant}
          onChange={e => setMontant(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.montant} />
        {!errors.montant ? (
          <span className="hint">Valeur strictement positive</span>
        ) : null}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-tx-bande">
          BANDE LIÉE <span className="hint">optionnel</span>
        </label>
        <select
          id="add-tx-bande"
          className={`field__input${bandeId ? ' filled' : ''}`}
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
        </select>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-tx-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="add-tx-notes"
          className={`field__input${notes ? ' filled' : ' field__input--ghost'}`}
          maxLength={200}
          rows={3}
          aria-label="Notes libres sur la transaction"
          aria-invalid={!!errors.notes}
          placeholder="Observations, référence facture…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.notes} />
        {!errors.notes ? (
          <span className="hint">{notes.trim().length}/200</span>
        ) : null}
      </div>
    </QuickActionSheet>
  );
};

export default QuickAddTransactionForm;
