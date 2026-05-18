/**
 * QuickEditTransactionForm — Édition rapide d'une transaction FINANCES
 * ════════════════════════════════════════════════════════════════════════
 * Mêmes champs que Add, pré-remplis depuis la transaction.
 *
 * Submit → write Supabase direct sur la table `finances` (snake_case).
 * Patch PARTIEL : seuls les champs modifiés sont inclus.
 *
 * La prop `transaction` est un `FinanceEntry & { id: string }` — l'id est
 * fourni par la vue appelante (clé ligne Sheets).
 *
 * Conforme FORM_CONTRACT : shell `<QuickActionSheet>`, `<form onSubmit>`,
 * toast canonique `useToast()`, validation `{ ok, errors, patch }` +
 * `<FieldError>`, reset-on-open `lastOpenKey`, garde double-clic
 * `closeTimerRef` + cleanup.
 *
 * Les exports nommés (logique pure testable) sont conservés : la convention
 * de nommage canonique est `quickXxxLogic.ts` mais on NE RENOMME PAS les
 * fichiers existants en Phase 1 (cf. FORM_CONTRACT).
 *
 * Exports nommés (tests) :
 *   - validateEditTransaction()
 *   - buildEditPatch()
 *   - transactionToDraft()
 *   - frToIsoDate()
 */

/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type SheetCell } from '../../services/offlineQueue';
import { supabase } from '../../services/supabaseClient';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import type { FinanceEntry, FinanceType } from '../../types/farm';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import {
  CATEGORIES,
  TYPES,
  isoToFrDate,
  type TransactionCategorie,
} from './quickAddTransactionLogic';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FinanceEntryWithId = FinanceEntry & { id: string };

export interface EditTransactionDraft {
  date: string;       // ISO yyyy-MM-dd
  type: FinanceType;
  categorie: string;  // libre (on tolère valeurs legacy hors CATEGORIES)
  libelle: string;
  montant: string;    // texte brut (tolère "," décimal FR)
  bandeId: string;
  notes: string;
}

export type EditTransactionInitial = EditTransactionDraft;

export type EditTransactionPatch = Partial<{
  DATE: string;
  CATEGORIE: string;
  LIBELLE: string;
  MONTANT: number;
  TYPE: FinanceType;
  BANDE_ID: string;
  NOTES: string;
}> &
  Record<string, SheetCell>;

export interface EditTransactionValidation {
  ok: boolean;
  errors: {
    date?: string;
    libelle?: string;
    montant?: string;
    notes?: string;
  };
  patch?: EditTransactionPatch;
}

// ─── Helpers purs ───────────────────────────────────────────────────────────

/** Convertit dd/MM/yyyy en yyyy-MM-dd ; tolère ISO et retourne '' sinon. */
export function frToIsoDate(fr: string | undefined): string {
  if (!fr) return '';
  const iso = fr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = fr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  return `${m[3]}-${mm}-${dd}`;
}

function parseMontant(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Construit un draft initial depuis une FinanceEntry. */
export function transactionToDraft(
  tx: FinanceEntry,
): EditTransactionDraft {
  return {
    date: frToIsoDate(tx.date),
    type: tx.type,
    categorie: tx.categorie ?? '',
    libelle: tx.libelle ?? '',
    montant: tx.montant > 0 ? String(tx.montant) : '',
    bandeId: '',   // `raw` non typé -> on ne tente pas de deviner, champ re-saisissable
    notes: tx.notes ?? '',
  };
}

/**
 * Valide le draft et calcule un patch PARTIEL (seules les clés modifiées).
 *
 * Règles identiques à Add :
 *   - date ISO yyyy-MM-dd obligatoire.
 *   - libelle non vide, max 80.
 *   - montant > 0 (strict).
 *   - notes max 200.
 */
export function validateEditTransaction(
  input: EditTransactionDraft,
  initial: EditTransactionInitial,
): EditTransactionValidation {
  const errors: EditTransactionValidation['errors'] = {};

  const date = String(input.date ?? '').trim();
  if (!date) {
    errors.date = 'Date requise';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = 'Format invalide';
  }

  const libelle = String(input.libelle ?? '').trim();
  if (!libelle) {
    errors.libelle = 'Libellé requis';
  } else if (libelle.length > 80) {
    errors.libelle = 'Max 80 caractères';
  }

  const montant = parseMontant(input.montant);
  if (montant === null) {
    errors.montant = 'Montant requis';
  } else if (montant <= 0) {
    errors.montant = 'Montant doit être > 0';
  }

  const notes = String(input.notes ?? '');
  if (notes.length > 200) {
    errors.notes = 'Max 200 caractères';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const patch: EditTransactionPatch = {};

  // Date → format dd/MM/yyyy pour Sheets GAS
  if (input.date !== initial.date) patch.DATE = isoToFrDate(input.date);
  if (input.categorie !== initial.categorie) patch.CATEGORIE = input.categorie;
  if (libelle !== String(initial.libelle ?? '').trim()) patch.LIBELLE = libelle;
  const initialMontant = parseMontant(initial.montant);
  if (montant !== initialMontant) patch.MONTANT = montant as number;
  if (input.type !== initial.type) patch.TYPE = input.type;
  if (input.bandeId !== initial.bandeId) patch.BANDE_ID = input.bandeId;
  if (notes.trim() !== String(initial.notes ?? '').trim()) {
    patch.NOTES = notes.trim();
  }

  return { ok: true, errors: {}, patch };
}

/** Helper tests : expose directement le patch (vide si pas de changement). */
export function buildEditPatch(
  input: EditTransactionDraft,
  initial: EditTransactionInitial,
): EditTransactionPatch | null {
  const v = validateEditTransaction(input, initial);
  return v.patch ?? null;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface QuickEditTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: FinanceEntryWithId;
  onSuccess?: () => void;
}

// ─── Composant ──────────────────────────────────────────────────────────────

const QuickEditTransactionForm: React.FC<QuickEditTransactionFormProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}) => {
  const { bandes, refreshData } = useFarm();
  const { showToast } = useToast();

  const initial = useMemo<EditTransactionInitial>(
    () => transactionToDraft(transaction),
    [transaction],
  );

  const [draft, setDraft] = useState<EditTransactionDraft>(initial);
  const [errors, setErrors] = useState<EditTransactionValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; txId: string }>({
    isOpen,
    txId: transaction.id,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.txId !== transaction.id) {
    setLastOpenKey({ isOpen, txId: transaction.id });
    if (isOpen) {
      setDraft(initial);
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

  const update = useCallback(
    <K extends keyof EditTransactionDraft>(
      key: K,
      value: EditTransactionDraft[K],
    ) => {
      setDraft(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateEditTransaction(draft, initial);
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    // Aucune modification → on ferme juste avec un toast
    if (Object.keys(result.patch).length === 0) {
      showToast('Aucune modification', 'info');
      onClose();
      return;
    }

    setSaving(true);
    try {
      const supabasePatch: Record<string, unknown> = {};
      const p = result.patch as Record<string, unknown>;
      if ('LIBELLE' in p) supabasePatch.poste = p.LIBELLE;
      if ('TYPE' in p) supabasePatch.type = p.TYPE;
      if ('MONTANT' in p) supabasePatch.mensuel_fcfa = p.MONTANT;
      if ('NOTES' in p) supabasePatch.notes = p.NOTES;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('finances') as any)
        .update(supabasePatch)
        .eq('id', transaction.id);
      if (error) throw new Error(error.message);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(
        online ? 'Modifications enregistrées' : 'Modifications en file · sync auto',
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
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement local',
        'error',
        4000,
      );
      setSaving(false);
    }
  };

  // Catégories : on injecte la valeur courante si hors liste canonique
  const catOptions = useMemo<string[]>(() => {
    const base = [...CATEGORIES] as string[];
    if (draft.categorie && !base.includes(draft.categorie)) {
      base.unshift(draft.categorie);
    }
    return base;
  }, [draft.categorie]);

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Modifier la transaction"
      title={`Éditer · ${transaction.id}`}
      ariaLabel="Édition d'une transaction"
      saving={saving}
      isValid
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      submitAriaLabel="Enregistrer les modifications"
    >
      <div className="field">
        <label className="label--v77" htmlFor="edit-tx-date">
          DATE <span className="req">requis</span>
        </label>
        <input
          id="edit-tx-date"
          ref={firstFieldRef}
          className={`field__input mono${draft.date ? ' filled' : ' field__input--ghost'}`}
          type="date"
          aria-label="Date de la transaction"
          aria-required="true"
          aria-invalid={!!errors.date}
          value={draft.date}
          onChange={e => update('date', e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.date} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="edit-tx-type">TYPE</label>
        <select
          id="edit-tx-type"
          className={`field__input${draft.type ? ' filled' : ''}`}
          aria-label="Type"
          value={draft.type}
          onChange={e => update('type', e.target.value as FinanceType)}
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
        <label className="label--v77" htmlFor="edit-tx-cat">CATÉGORIE</label>
        <select
          id="edit-tx-cat"
          className={`field__input${draft.categorie ? ' filled' : ''}`}
          aria-label="Catégorie de la transaction"
          value={draft.categorie}
          onChange={e => update('categorie', e.target.value as TransactionCategorie)}
          disabled={saving}
        >
          {catOptions.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="edit-tx-libelle">
          LIBELLÉ <span className="req">requis</span>
        </label>
        <input
          id="edit-tx-libelle"
          className={`field__input${draft.libelle ? ' filled' : ' field__input--ghost'}`}
          type="text"
          maxLength={80}
          aria-label="Libellé de la transaction"
          aria-required="true"
          aria-invalid={!!errors.libelle}
          placeholder="Description"
          value={draft.libelle}
          onChange={e => update('libelle', e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.libelle} />
        {!errors.libelle ? (
          <span className="hint">{draft.libelle.trim().length}/80</span>
        ) : null}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="edit-tx-montant">
          MONTANT FCFA <span className="req">requis</span>
        </label>
        <input
          id="edit-tx-montant"
          className={`field__input mono${draft.montant ? ' filled' : ' field__input--ghost'}`}
          type="number"
          inputMode="decimal"
          min={0}
          step={1}
          aria-label="Montant en FCFA"
          aria-required="true"
          aria-invalid={!!errors.montant}
          placeholder="0"
          value={draft.montant}
          onChange={e => update('montant', e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.montant} />
        {!errors.montant ? (
          <span className="hint">Valeur strictement positive</span>
        ) : null}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="edit-tx-bande">
          BANDE LIÉE <span className="hint">optionnel</span>
        </label>
        <select
          id="edit-tx-bande"
          className={`field__input${draft.bandeId ? ' filled' : ''}`}
          aria-label="Bande liée à la transaction"
          value={draft.bandeId}
          onChange={e => update('bandeId', e.target.value)}
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
        <label className="label--v77" htmlFor="edit-tx-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="edit-tx-notes"
          className={`field__input${draft.notes ? ' filled' : ' field__input--ghost'}`}
          maxLength={200}
          rows={3}
          aria-label="Notes libres sur la transaction"
          aria-invalid={!!errors.notes}
          placeholder="Observations…"
          value={draft.notes}
          onChange={e => update('notes', e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.notes} />
        {!errors.notes ? (
          <span className="hint">{draft.notes.trim().length}/200</span>
        ) : null}
      </div>
    </QuickActionSheet>
  );
};

export default QuickEditTransactionForm;
