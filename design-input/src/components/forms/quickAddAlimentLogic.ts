/**
 * quickAddAlimentLogic — Pure helpers & types for QuickAddAlimentForm
 * ════════════════════════════════════════════════════════════════════════
 * Fichier jumeau de `QuickAddAlimentForm.tsx` : contient la logique pure
 * testable (validation, build row, suggest ID) + constantes & types.
 *
 * Les consommateurs (tests, autres forms) doivent importer ces symboles
 * ICI plutôt que depuis le .tsx — c'est indispensable pour que Fast
 * Refresh fonctionne sur le .tsx (qui ne doit exporter que le composant).
 */

import type { SheetCell } from '../../services/offlineQueue';
import type { StockAliment, StockStatut } from '../../types/farm';
import { recomputeStatut } from './quickRefillLogic';

// ─── Types ───────────────────────────────────────────────────────────────────

export const UNITE_SUGGESTIONS: ReadonlyArray<string> = [
  'kg',
  'sac',
  'tonne',
];

export interface AddAlimentDraft {
  id: string;
  libelle: string;
  stockActuel: string;
  unite: string;
  seuilAlerte: string;
  notes: string;
}

export interface AddAlimentValidation {
  ok: boolean;
  errors: {
    id?: string;
    libelle?: string;
    stockActuel?: string;
    unite?: string;
    seuilAlerte?: string;
    notes?: string;
  };
  row?: SheetCell[];
  statut?: StockStatut;
}

// ─── Pure helpers (testés unitairement) ──────────────────────────────────────

/**
 * Suggère un nouvel ID aliment sous forme `A<nn>` à partir de la liste existante.
 */
export function suggestNextAlimentId(
  aliments: ReadonlyArray<Pick<StockAliment, 'id'>>,
): string {
  let maxN = 0;
  for (const a of aliments) {
    const m = String(a.id ?? '').match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  const next = maxN > 0 ? maxN + 1 : 1;
  return `A${String(next).padStart(2, '0')}`;
}

/** Parse une valeur numérique (accepte virgule décimale FR). */
function parseNum(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validation + construction de la ligne Sheets (ordre canonique STOCK_ALIMENTS).
 */
export function validateAddAliment(
  draft: AddAlimentDraft,
): AddAlimentValidation {
  const errors: AddAlimentValidation['errors'] = {};

  const id = String(draft.id ?? '').trim().toUpperCase();
  if (!id) {
    errors.id = 'ID requis';
  } else if (!/^A\d+$/.test(id)) {
    errors.id = 'Format invalide (ex: A01)';
  }

  const libelle = String(draft.libelle ?? '').trim();
  if (!libelle) {
    errors.libelle = 'Libellé requis';
  } else if (libelle.length > 60) {
    errors.libelle = 'Libellé trop long (max 60)';
  }

  const stockActuel = parseNum(draft.stockActuel);
  if (stockActuel === null) {
    errors.stockActuel = 'Stock requis';
  } else if (stockActuel < 0) {
    errors.stockActuel = 'Stock doit être ≥ 0';
  }

  const unite = String(draft.unite ?? '').trim();
  if (!unite) {
    errors.unite = 'Unité requise';
  }

  const seuilAlerte = parseNum(draft.seuilAlerte);
  if (seuilAlerte === null) {
    errors.seuilAlerte = 'Seuil requis';
  } else if (seuilAlerte < 0) {
    errors.seuilAlerte = 'Seuil doit être ≥ 0';
  }

  const notes = String(draft.notes ?? '').trim();
  if (notes.length > 200) {
    errors.notes = 'Notes trop longues (max 200)';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const stockRounded = Math.round((stockActuel as number) * 10) / 10;
  const seuilRounded = Math.round((seuilAlerte as number) * 10) / 10;
  const statut = recomputeStatut(stockRounded, seuilRounded);

  const row: SheetCell[] = [
    id,             // ID
    libelle,        // LIBELLE
    stockRounded,   // STOCK_ACTUEL
    unite,          // UNITE
    seuilRounded,   // SEUIL_ALERTE
    statut,         // STATUT
    notes,          // NOTES
  ];

  return { ok: true, errors: {}, row, statut };
}

/** Helper exposé pour les tests : construit la row uniquement (sans valider). */
export function buildAddAlimentRow(draft: AddAlimentDraft): SheetCell[] | null {
  const v = validateAddAliment(draft);
  return v.row ?? null;
}
