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

import React, { useCallback, useEffect, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueAppendRow, type SheetCell } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { FinanceType } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

// ─── Types & constantes ─────────────────────────────────────────────────────

export const TYPES: ReadonlyArray<FinanceType> = ['REVENU', 'DEPENSE'];

export const CATEGORIES = [
  'ALIMENT',
  'VETO',
  'VETERINAIRE',
  'MAIN_OEUVRE',
  'MAINTENANCE',
  'VENTE_PORCS',
  'VENTE_AUTRE',
  'AUTRE',
] as const;

export type TransactionCategorie = (typeof CATEGORIES)[number];

export interface AddTransactionDraft {
  /** ISO yyyy-MM-dd (input[type=date]). */
  date: string;
  type: FinanceType;
  categorie: TransactionCategorie;
  libelle: string;
  /** Chaîne brute — parsing / validation tolèrent virgule décimale FR. */
  montant: string;
  /** ID de bande (optionnel). */
  bandeId: string;
  notes: string;
}

export interface AddTransactionValidation {
  ok: boolean;
  errors: {
    date?: string;
    libelle?: string;
    montant?: string;
    notes?: string;
  };
  row?: SheetCell[];
}

// ─── Helpers purs ───────────────────────────────────────────────────────────

/** Convertit ISO yyyy-MM-dd en dd/MM/yyyy (format Sheets GAS). Vide si falsy. */
export function isoToFrDate(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Date du jour au format ISO yyyy-MM-dd (pour valeur initiale de l'input). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Parse un montant texte (tolère virgule décimale FR). Retourne null si invalide. */
function parseMontant(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validation + construction de la ligne Sheets.
 *
 * Règles :
 *   - date : format ISO yyyy-MM-dd obligatoire.
 *   - libelle : non vide après trim, max 80.
 *   - montant : > 0 (strict).
 *   - notes : max 200.
 *
 * Colonnes renvoyées (ordre canonique) :
 *   [DATE (dd/MM/yyyy), CATEGORIE, LIBELLE, MONTANT, TYPE, BANDE_ID, NOTES]
 */
export function validateAddTransaction(
  draft: AddTransactionDraft,
): AddTransactionValidation {
  const errors: AddTransactionValidation['errors'] = {};

  const date = String(draft.date ?? '').trim();
  if (!date) {
    errors.date = 'Date requise';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = 'Format invalide';
  }

  const libelle = String(draft.libelle ?? '').trim();
  if (!libelle) {
    errors.libelle = 'Libellé requis';
  } else if (libelle.length > 80) {
    errors.libelle = 'Max 80 caractères';
  }

  const montant = parseMontant(draft.montant);
  if (montant === null) {
    errors.montant = 'Montant requis';
  } else if (montant <= 0) {
    errors.montant = 'Montant doit être > 0';
  }

  const notes = String(draft.notes ?? '');
  if (notes.length > 200) {
    errors.notes = 'Max 200 caractères';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const categorie: TransactionCategorie = draft.categorie ?? 'AUTRE';
  const type: FinanceType = draft.type ?? 'DEPENSE';
  const bandeId = String(draft.bandeId ?? '').trim();

  const row: SheetCell[] = [
    isoToFrDate(date),   // DATE (dd/MM/yyyy)
    categorie,           // CATEGORIE
    libelle,             // LIBELLE
    montant as number,   // MONTANT
    type,                // TYPE
    bandeId,             // BANDE_ID
    notes.trim(),        // NOTES
  ];

  return { ok: true, errors: {}, row };
}

/** Helper exposé pour tests : construit la row uniquement (sans contrôle ok). */
export function buildAddTransactionRow(
  draft: AddTransactionDraft,
): SheetCell[] | null {
  const v = validateAddTransaction(draft);
  return v.row ?? null;
}

// ─── Props composant ────────────────────────────────────────────────────────

export interface QuickAddTransactionFormProps {
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

  // Reset à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    setDate(todayIso());
    setType(defaultType);
    setCategorie(defaultType === 'REVENU' ? 'VENTE_PORCS' : 'ALIMENT');
    setLibelle('');
    setMontant('');
    setBandeId('');
    setNotes('');
    setErrors({});
    setSaving(false);
  }, [isOpen, defaultType]);

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
      await enqueueAppendRow('FINANCES', result.row);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(online ? 'Transaction ajoutée' : 'Transaction en file · sync auto');
      try {
        await refreshData();
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

  // ─── Classes réutilisables ────────────────────────────────────────────
  const inputBase =
    'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2 font-mono text-[14px] outline-none transition-colors duration-[160ms] focus:border-accent focus:ring-1 focus:ring-accent';
  const inputOk = 'border-border hover:border-text-2';
  const inputErr = 'border-red';
  const labelCls =
    'block font-mono text-[11px] uppercase tracking-wide text-text-2';
  const hintCls = 'font-mono text-[10px] text-text-2 tabular-nums';
  const errCls = 'font-mono text-[11px] text-red';

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
            <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
              Ajouter une transaction
            </p>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="add-tx-date" className={labelCls}>
              Date <span className="text-red normal-case">· requis</span>
            </label>
            <input
              id="add-tx-date"
              ref={firstFieldRef}
              type="date"
              aria-label="Date de la transaction"
              aria-required="true"
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? 'add-tx-date-error' : undefined}
              className={[inputBase, errors.date ? inputErr : inputOk].join(' ')}
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={saving}
            />
            {errors.date ? (
              <p id="add-tx-date-error" role="alert" className={errCls}>
                {errors.date}
              </p>
            ) : null}
          </div>

          {/* Type (radio group REVENU / DEPENSE) */}
          <div className="space-y-1.5">
            <span
              id="add-tx-type-label"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Type
            </span>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-labelledby="add-tx-type-label"
            >
              {TYPES.map(t => {
                const selected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Type ${t}`}
                    onClick={() => setType(t)}
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

          {/* Catégorie (select) */}
          <div className="space-y-1.5">
            <label htmlFor="add-tx-cat" className={labelCls}>
              Catégorie
            </label>
            <select
              id="add-tx-cat"
              aria-label="Catégorie de la transaction"
              className={[inputBase, inputOk].join(' ')}
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

          {/* Libellé */}
          <div className="space-y-1.5">
            <label htmlFor="add-tx-libelle" className={labelCls}>
              Libellé <span className="text-red normal-case">· requis</span>
            </label>
            <input
              id="add-tx-libelle"
              type="text"
              maxLength={80}
              aria-label="Libellé de la transaction"
              aria-required="true"
              aria-invalid={!!errors.libelle}
              aria-describedby={
                errors.libelle ? 'add-tx-libelle-error' : 'add-tx-libelle-hint'
              }
              className={[inputBase, errors.libelle ? inputErr : inputOk].join(' ')}
              placeholder="Ex: Sac aliment croissance"
              value={libelle}
              onChange={e => setLibelle(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            <p id="add-tx-libelle-hint" className={hintCls}>
              {libelle.trim().length}/80
            </p>
            {errors.libelle ? (
              <p id="add-tx-libelle-error" role="alert" className={errCls}>
                {errors.libelle}
              </p>
            ) : null}
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <label htmlFor="add-tx-montant" className={labelCls}>
              Montant FCFA <span className="text-red normal-case">· requis</span>
            </label>
            <input
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
              className={[
                'w-full h-14 rounded-md px-4',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[22px] tabular-nums text-right',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.montant ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="0"
              value={montant}
              onChange={e => setMontant(e.target.value)}
              disabled={saving}
            />
            <p id="add-tx-montant-hint" className={hintCls}>
              Valeur strictement positive
            </p>
            {errors.montant ? (
              <p id="add-tx-montant-error" role="alert" className={errCls}>
                {errors.montant}
              </p>
            ) : null}
          </div>

          {/* Bande liée (optionnel) */}
          <div className="space-y-1.5">
            <label htmlFor="add-tx-bande" className={labelCls}>
              Bande liée <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <select
              id="add-tx-bande"
              aria-label="Bande liée à la transaction"
              className={[inputBase, inputOk].join(' ')}
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

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="add-tx-notes" className={labelCls}>
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="add-tx-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes libres sur la transaction"
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'add-tx-notes-error' : 'add-tx-notes-hint'
              }
              className={[
                'w-full rounded-md px-3 py-2',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes ? inputErr : inputOk,
              ].join(' ')}
              placeholder="Observations, référence facture…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
            <p id="add-tx-notes-hint" className={hintCls}>
              {notes.trim().length}/200
            </p>
            {errors.notes ? (
              <p id="add-tx-notes-error" role="alert" className={errCls}>
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
              aria-label="Ajouter la transaction"
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

export default QuickAddTransactionForm;
