/**
 * QuickEditTransactionForm — Édition rapide d'une transaction FINANCES
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : mêmes champs que Add, pré-remplis depuis la transaction.
 *
 * Submit → `enqueueUpdateRow('FINANCES', 'ID', transaction.id, patch)`.
 * Patch PARTIEL : seuls les champs modifiés sont inclus.
 *
 * Clés canoniques envoyées :
 *   DATE (dd/MM/yyyy), CATEGORIE, LIBELLE, MONTANT, TYPE, BANDE_ID, NOTES.
 *
 * La prop `transaction` est un `FinanceEntry & { id: string }` — l'id est
 * fourni par la vue appelante (clé ligne Sheets).
 *
 * Exports nommés (tests) :
 *   - validateEditTransaction()
 *   - buildEditPatch()
 *   - transactionToDraft()
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueUpdateRow, type SheetCell } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { FinanceEntry, FinanceType } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  CATEGORIES,
  TYPES,
  isoToFrDate,
  type TransactionCategorie,
} from './QuickAddTransactionForm';

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

export interface EditTransactionInitial extends EditTransactionDraft {}

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
    bandeId: '',   // `raw` non typé → on ne tente pas de deviner, champ re-saisissable
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

  const initial = useMemo<EditTransactionInitial>(
    () => transactionToDraft(transaction),
    [transaction],
  );

  const [draft, setDraft] = useState<EditTransactionDraft>(initial);
  const [errors, setErrors] = useState<EditTransactionValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset à chaque (re)ouverture / changement de transaction
  useEffect(() => {
    if (!isOpen) return;
    setDraft(initial);
    setErrors({});
    setSaving(false);
  }, [isOpen, initial]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc + focus auto
  useEscapeKey(isOpen && !saving, handleClose);
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
      setToast('Aucune modification');
      onClose();
      return;
    }

    setSaving(true);
    try {
      await enqueueUpdateRow('FINANCES', 'ID', transaction.id, result.patch);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(
        online
          ? 'Modifications enregistrées'
          : 'Modifications en file · sync auto',
      );
      try {
        await refreshData();
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement local',
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Classes ──────────────────────────────────────────────────────────
  const inputBase =
    'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2 font-mono text-[14px] outline-none transition-colors duration-[160ms] focus:border-accent focus:ring-1 focus:ring-accent';
  const inputOk = 'border-border hover:border-text-2';
  const inputErr = 'border-red';
  const labelCls =
    'block font-mono text-[11px] uppercase tracking-wide text-text-2';
  const hintCls = 'font-mono text-[10px] text-text-2 tabular-nums';
  const errCls = 'font-mono text-[11px] text-red';

  // Catégories : on injecte la valeur courante si hors liste canonique
  const catOptions = useMemo<string[]>(() => {
    const base = [...CATEGORIES] as string[];
    if (draft.categorie && !base.includes(draft.categorie)) {
      base.unshift(draft.categorie);
    }
    return base;
  }, [draft.categorie]);

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Éditer · ${transaction.id}`}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Édition d'une transaction"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Modifier la transaction
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 tabular-nums mt-0.5">
                {transaction.id}
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-date" className={labelCls}>
              Date <span className="text-red normal-case">· requis</span>
            </label>
            <input
              id="edit-tx-date"
              ref={firstFieldRef}
              type="date"
              aria-label="Date de la transaction"
              aria-required="true"
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? 'edit-tx-date-error' : undefined}
              className={[inputBase, errors.date ? inputErr : inputOk].join(' ')}
              value={draft.date}
              onChange={e => update('date', e.target.value)}
              disabled={saving}
            />
            {errors.date ? (
              <p id="edit-tx-date-error" role="alert" className={errCls}>
                {errors.date}
              </p>
            ) : null}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <span
              id="edit-tx-type-label"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Type
            </span>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-labelledby="edit-tx-type-label"
            >
              {TYPES.map(t => {
                const selected = draft.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Type ${t}`}
                    onClick={() => update('type', t)}
                    disabled={saving}
                    className={[
                      'pressable inline-flex items-center justify-center',
                      'flex-1 h-10 px-3 rounded-md border',
                      'font-mono text-[12px] uppercase tracking-wide',
                      'transition-colors duration-[160ms]',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                      selected
                        ? 'bg-accent text-bg-0 border-accent font-semibold'
                        : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                    ].join(' ')}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catégorie */}
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-cat" className={labelCls}>
              Catégorie
            </label>
            <select
              id="edit-tx-cat"
              aria-label="Catégorie de la transaction"
              className={[inputBase, inputOk].join(' ')}
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

          {/* Libellé */}
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-libelle" className={labelCls}>
              Libellé <span className="text-red normal-case">· requis</span>
            </label>
            <input
              id="edit-tx-libelle"
              type="text"
              maxLength={80}
              aria-label="Libellé de la transaction"
              aria-required="true"
              aria-invalid={!!errors.libelle}
              aria-describedby={
                errors.libelle ? 'edit-tx-libelle-error' : 'edit-tx-libelle-hint'
              }
              className={[inputBase, errors.libelle ? inputErr : inputOk].join(' ')}
              placeholder="Description"
              value={draft.libelle}
              onChange={e => update('libelle', e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            <p id="edit-tx-libelle-hint" className={hintCls}>
              {draft.libelle.trim().length}/80
            </p>
            {errors.libelle ? (
              <p id="edit-tx-libelle-error" role="alert" className={errCls}>
                {errors.libelle}
              </p>
            ) : null}
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-montant" className={labelCls}>
              Montant FCFA <span className="text-red normal-case">· requis</span>
            </label>
            <input
              id="edit-tx-montant"
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              aria-label="Montant en FCFA"
              aria-required="true"
              aria-invalid={!!errors.montant}
              aria-describedby={
                errors.montant ? 'edit-tx-montant-error' : 'edit-tx-montant-hint'
              }
              className={[
                'w-full h-14 rounded-md px-4',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[22px] tabular-nums text-right',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.montant ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="0"
              value={draft.montant}
              onChange={e => update('montant', e.target.value)}
              disabled={saving}
            />
            <p id="edit-tx-montant-hint" className={hintCls}>
              Valeur strictement positive
            </p>
            {errors.montant ? (
              <p id="edit-tx-montant-error" role="alert" className={errCls}>
                {errors.montant}
              </p>
            ) : null}
          </div>

          {/* Bande liée */}
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-bande" className={labelCls}>
              Bande liée <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <select
              id="edit-tx-bande"
              aria-label="Bande liée à la transaction"
              className={[inputBase, inputOk].join(' ')}
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

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="edit-tx-notes" className={labelCls}>
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="edit-tx-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes libres sur la transaction"
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'edit-tx-notes-error' : 'edit-tx-notes-hint'
              }
              className={[
                'w-full rounded-md px-3 py-2',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes ? inputErr : inputOk,
              ].join(' ')}
              placeholder="Observations…"
              value={draft.notes}
              onChange={e => update('notes', e.target.value)}
              disabled={saving}
            />
            <p id="edit-tx-notes-hint" className={hintCls}>
              {draft.notes.trim().length}/200
            </p>
            {errors.notes ? (
              <p id="edit-tx-notes-error" role="alert" className={errCls}>
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 sticky bottom-0 bg-bg-1 -mx-4 px-4 pb-2 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              aria-label="Annuler et fermer"
              className={[
                'pressable flex-1 h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-bg-1 border border-border text-text-1',
                'font-mono text-[12px] font-bold uppercase tracking-wide',
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
              aria-label="Enregistrer les modifications"
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'font-mono text-[13px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
              ].join(' ')}
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement…</span>
              ) : (
                <>
                  <span>Enregistrer</span>
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

export default QuickEditTransactionForm;
