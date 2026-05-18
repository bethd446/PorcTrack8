/**
 * quickAddTransactionLogic — Pure helpers & types for QuickAddTransactionForm
 * ════════════════════════════════════════════════════════════════════════
 * Fichier jumeau de `QuickAddTransactionForm.tsx` : contient la logique
 * pure testable (validation, build row, conversion de dates) ainsi que les
 * constantes et types partagés.
 *
 * Les consommateurs (tests, autres forms comme QuickEditTransactionForm)
 * doivent importer ces symboles ICI — indispensable pour que Fast Refresh
 * fonctionne sur le `.tsx` (qui ne doit exporter que le composant).
 */

import type { SheetCell } from '../../services/offlineQueue';
import type { FinanceType } from '../../types/farm';

// ─── Constantes ──────────────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers purs ────────────────────────────────────────────────────────────

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
