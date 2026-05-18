/**
 * quickAddVetoLogic — Pure helpers & types for QuickAddVetoForm
 * ════════════════════════════════════════════════════════════════════════
 * Fichier jumeau de `QuickAddVetoForm.tsx`. Les consommateurs (tests,
 * autres forms) doivent importer ces symboles ICI — indispensable pour
 * que Fast Refresh fonctionne sur le `.tsx`.
 */

import type { SheetCell } from '../../services/offlineQueue';
import type { StockVeto } from '../../types/farm';
import { recomputeStatut } from './quickRefillLogic';

// ─── Constantes (suggestions datalist) ───────────────────────────────────────

export const TYPE_SUGGESTIONS: ReadonlyArray<string> = [
  'Antiparasitaire',
  'Antibiotique',
  'Vaccin',
  'Vitamine',
  'Hormone',
  'Désinfectant',
];

export const USAGE_SUGGESTIONS: ReadonlyArray<string> = [
  'Prévention',
  'Traitement',
  'Curatif',
  'Maintenance',
];

export const UNITE_SUGGESTIONS: ReadonlyArray<string> = [
  'mL',
  'doses',
  'unités',
  'flacons',
  'sachets',
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AddVetoDraft {
  id: string;
  produit: string;
  type: string;
  usage: string;
  stockActuel: string;
  unite: string;
  seuilAlerte: string;
  notes: string;
}

export interface AddVetoValidation {
  ok: boolean;
  errors: {
    id?: string;
    produit?: string;
    unite?: string;
    stockActuel?: string;
    seuilAlerte?: string;
  };
  row?: SheetCell[];
}

// ─── Pure helpers (testés unitairement) ──────────────────────────────────────

export function suggestNextVetoId(
  vetos: ReadonlyArray<Pick<StockVeto, 'id'>>,
): string {
  let maxN = 0;
  for (const v of vetos) {
    const m = String(v.id ?? '').match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  const next = maxN > 0 ? maxN + 1 : 1;
  return `V${String(next).padStart(2, '0')}`;
}

/** Parse un nombre non-négatif (accepte virgule décimale FR). */
function parseNonNegative(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function validateAddVeto(draft: AddVetoDraft): AddVetoValidation {
  const errors: AddVetoValidation['errors'] = {};

  const id = String(draft.id ?? '').trim().toUpperCase();
  if (!id) errors.id = 'ID requis';

  const produit = String(draft.produit ?? '').trim();
  if (!produit) errors.produit = 'Produit requis';

  const unite = String(draft.unite ?? '').trim();
  if (!unite) errors.unite = 'Unité requise';

  const stockActuel = parseNonNegative(draft.stockActuel);
  if (stockActuel === null) {
    errors.stockActuel = 'Stock ≥ 0 requis';
  }

  const seuilAlerte = parseNonNegative(draft.seuilAlerte);
  if (seuilAlerte === null) {
    errors.seuilAlerte = 'Seuil ≥ 0 requis';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const stockNum = stockActuel as number;
  const seuilNum = seuilAlerte as number;
  const type = String(draft.type ?? '').trim();
  const usage = String(draft.usage ?? '').trim();
  const notes = String(draft.notes ?? '').trim();
  const statut = recomputeStatut(stockNum, seuilNum);

  const row: SheetCell[] = [
    id,          // ID
    produit,     // PRODUIT / LIBELLÉ
    type,        // TYPE
    usage,       // USAGE
    stockNum,    // STOCK_ACTUEL
    unite,       // UNITE
    seuilNum,    // SEUIL_ALERTE
    statut,      // STATUT (auto)
    notes,       // NOTES
  ];

  return { ok: true, errors: {}, row };
}

export function buildAddVetoRow(draft: AddVetoDraft): SheetCell[] | null {
  const v = validateAddVeto(draft);
  return v.row ?? null;
}
