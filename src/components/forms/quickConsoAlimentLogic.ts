/**
 * quickConsoAlimentLogic — helpers purs pour QuickConsoAlimentForm
 * ════════════════════════════════════════════════════════════════════════
 * V21-3 (2026-05-01).
 *
 * Logique métier extraite du composant React pour permettre des tests
 * unitaires sans DOM :
 *   • parseConsoNum     — parse FR ("12,5" → 12.5)
 *   • toIsoDateInput    — date du jour au format YYYY-MM-DD
 *   • filterActiveBandes — bandes actives (statut ≠ Vendu/RECAP)
 *   • validateConsoForm — règles de validation
 *   • buildConsoPayload — payload INSERT feed_consumption_logs
 */

import type { BandePorcelets } from '../../types/farm';
import type { FeedConsoInsertInput } from '../../services/feedConsumptionAnalyzer';

export type ConsoSubject = 'BANDE' | 'TRUIE';

export interface ConsoFormInput {
  subject: ConsoSubject;
  bandeId: string;
  truieId: string;
  alimentId: string;
  qtyKg: string;
  dateConso: string;
  notes: string;
}

export interface ConsoValidation {
  ok: boolean;
  errors: Record<string, string>;
}

/** Parse une valeur numérique (accepte virgule décimale FR). */
export function parseConsoNum(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Format date du jour en YYYY-MM-DD (pour input[type=date]). */
export function toIsoDateInput(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Statuts considérés comme "inactifs" pour les bandes (filtrage combobox). */
const INACTIVE_STATUTS = new Set(['vendu', 'vendus', 'recap', 'archivée', 'archivee']);

/** Filtre les bandes actives (utilisable dans la combobox). */
export function filterActiveBandes(bandes: BandePorcelets[]): BandePorcelets[] {
  return bandes.filter(b => {
    const s = String(b.statut || '').trim().toLowerCase();
    return !INACTIVE_STATUTS.has(s);
  });
}

/**
 * Valide les inputs du form de saisie conso aliment.
 * Règles :
 *   - subject = BANDE → bandeId requis
 *   - subject = TRUIE → truieId requis
 *   - alimentId requis
 *   - qty entre 0 (exclu) et 500 (inclu)
 *   - dateConso non vide et parseable
 *   - notes max 200 chars
 */
export function validateConsoForm(input: ConsoFormInput): ConsoValidation {
  const errors: Record<string, string> = {};

  if (input.subject === 'BANDE') {
    if (!input.bandeId.trim()) errors.bandeId = 'Bande requise';
  } else if (input.subject === 'TRUIE') {
    if (!input.truieId.trim()) errors.truieId = 'Truie requise';
  } else {
    errors.subject = 'Sujet invalide';
  }

  if (!input.alimentId.trim()) {
    errors.alimentId = 'Aliment requis';
  }

  const qty = parseConsoNum(input.qtyKg);
  if (qty == null) {
    errors.qtyKg = 'Quantité requise';
  } else if (qty <= 0) {
    errors.qtyKg = 'Quantité > 0 requise';
  } else if (qty > 500) {
    errors.qtyKg = 'Max 500 kg par saisie';
  }

  if (!input.dateConso.trim()) {
    errors.dateConso = 'Date requise';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateConso)) {
    errors.dateConso = 'Format AAAA-MM-JJ attendu';
  }

  if (input.notes.length > 200) {
    errors.notes = 'Max 200 caractères';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Construit le payload prêt à être inséré dans `feed_consumption_logs`.
 * Présuppose que `validateConsoForm` a déjà été appelé.
 */
export function buildConsoPayload(input: ConsoFormInput): FeedConsoInsertInput {
  const qty = parseConsoNum(input.qtyKg) ?? 0;
  return {
    batch_id: input.subject === 'BANDE' ? input.bandeId : null,
    sow_id: input.subject === 'TRUIE' ? input.truieId : null,
    produit_aliment_id: input.alimentId || null,
    date_conso: input.dateConso,
    qty_kg: qty,
    notes: input.notes.trim() || null,
  };
}
