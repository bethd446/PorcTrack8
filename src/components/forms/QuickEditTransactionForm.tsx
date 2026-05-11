/**
 * QuickEditTransactionForm — Édition rapide d'une transaction FINANCES
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : mêmes champs que Add, pré-remplis depuis la transaction.
 *
 * Submit → write Supabase direct sur la table `finances` (snake_case).
 * Patch PARTIEL : seuls les champs modifiés sont inclus.
 *
 * La prop `transaction` est un `FinanceEntry & { id: string }` — l'id est
 * fourni par la vue appelante (clé ligne Sheets).
 *
 * Exports nommés (tests) :
 *   - validateEditTransaction()
 *   - buildEditPatch()
 *   - transactionToDraft()
 */

/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button, RadioGroup } from '@/design-system';
import { type SheetCell } from '../../services/offlineQueue';
import { supabase } from '../../services/supabaseClient';
import { useFarm } from '../../context/FarmContext';
import type { FinanceEntry, FinanceType } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
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

  const initial = useMemo<EditTransactionInitial>(
    () => transactionToDraft(transaction),
    [transaction],
  );

  const [draft, setDraft] = useState<EditTransactionDraft>(initial);
  const [errors, setErrors] = useState<EditTransactionValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Render-time sync: reset when (re)opening or transaction changes.
  const [lastInitial, setLastInitial] = useState<{ isOpen: boolean; txId: string }>({
    isOpen,
    txId: transaction.id,
  });
  if (lastInitial.isOpen !== isOpen || lastInitial.txId !== transaction.id) {
    setLastInitial({ isOpen, txId: transaction.id });
    if (isOpen) {
      setDraft(initial);
      setErrors({});
      setSaving(false);
    }
  }

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
      setToast(
        online
          ? 'Modifications enregistrées'
          : 'Modifications en file · sync auto',
      );
      try {
        await refreshData(true);
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
              <p className="text-mono-label text-text-1">
                Modifier la transaction
              </p>
              <p className="text-mono-micro text-text-2 tabular-nums mt-0.5">
                {transaction.id}
              </p>
            </div>
          </div>

          <FormField label="Date" required error={errors.date}>
            <Input
              id="edit-tx-date"
              ref={firstFieldRef}
              type="date"
              aria-label="Date de la transaction"
              aria-required="true"
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? 'edit-tx-date-error' : undefined}
              value={draft.date}
              onChange={e => update('date', e.target.value)}
              disabled={saving}
              invalid={!!errors.date}
            />
          </FormField>

          {/* V70.9 : Radio DS dédié — remplace le radiogroup custom */}
          <RadioGroup
            label="Type"
            value={draft.type}
            onChange={(v) => update('type', v as typeof draft.type)}
            disabled={saving}
            options={TYPES.map((t) => ({ value: t, label: t }))}
          />

          <FormField label="Catégorie">
            <Select
              id="edit-tx-cat"
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
            </Select>
          </FormField>

          <FormField
            label="Libellé"
            required
            hint={`${draft.libelle.trim().length}/80`}
            error={errors.libelle}
          >
            <Input
              id="edit-tx-libelle"
              type="text"
              maxLength={80}
              aria-label="Libellé de la transaction"
              aria-required="true"
              aria-invalid={!!errors.libelle}
              aria-describedby={
                errors.libelle ? 'edit-tx-libelle-error' : 'edit-tx-libelle-hint'
              }
              placeholder="Description"
              value={draft.libelle}
              onChange={e => update('libelle', e.target.value)}
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
              className="font-mono text-[22px] tabular-nums text-right"
              placeholder="0"
              value={draft.montant}
              onChange={e => update('montant', e.target.value)}
              disabled={saving}
              invalid={!!errors.montant}
            />
          </FormField>

          <FormField label="Bande liée" hint="optionnel">
            <Select
              id="edit-tx-bande"
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
            </Select>
          </FormField>

          <FormField
            label="Notes"
            hint={errors.notes ? undefined : `${draft.notes.trim().length}/200`}
            error={errors.notes}
          >
            <Textarea
              id="edit-tx-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes libres sur la transaction"
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'edit-tx-notes-error' : 'edit-tx-notes-hint'
              }
              placeholder="Observations…"
              value={draft.notes}
              onChange={e => update('notes', e.target.value)}
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
              ariaLabel="Enregistrer les modifications"
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
                  Enregistrer
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

export default QuickEditTransactionForm;
