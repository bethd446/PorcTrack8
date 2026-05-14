/**
 * Logique pure de réapprovisionnement — sans dépendance React / Ionic.
 * ══════════════════════════════════════════════════════════════════════
 * Isolée ici pour être testée en environnement `node` (vitest) sans monter
 * l'arbre React. Le composant `QuickRefillForm` ré-exporte ces helpers pour
 * les imports existants.
 */

import type { SheetCell } from '../../services/offlineQueue';
import type { StockAliment, StockVeto } from '../../types/farm';

/** Item de stock passé au form — aliment OU véto, discriminé par `kind`. */
export type RefillStockItem =
  | (StockAliment & { kind: 'ALIMENT' })
  | (StockVeto & { kind: 'VETO' });

/** Normalise un StockAliment/StockVeto en RefillStockItem discriminé. */
export function toRefillItem(
  item: StockAliment | StockVeto,
  kind: 'ALIMENT' | 'VETO',
): RefillStockItem {
  return { ...(item as StockAliment & StockVeto), kind } as RefillStockItem;
}

/** Retourne le libellé affichable de l'item (libelle|produit). */
export function labelFor(item: RefillStockItem): string {
  if (item.kind === 'ALIMENT') return item.libelle;
  return item.produit;
}

/**
 * Recalcule le statut d'un stock après réapprovisionnement.
 *  - stock <= 0           → RUPTURE
 *  - stock <= seuilAlerte → BAS (si seuilAlerte > 0)
 *  - sinon                → OK
 */
export function recomputeStatut(
  newStock: number,
  seuilAlerte: number,
): 'OK' | 'BAS' | 'RUPTURE' {
  if (!Number.isFinite(newStock) || newStock <= 0) return 'RUPTURE';
  if (seuilAlerte > 0 && newStock <= seuilAlerte) return 'BAS';
  return 'OK';
}

/** Erreurs de validation du formulaire de réapprovisionnement. */
export interface RefillErrors {
  item?: string;
  quantite?: string;
  prix?: string;
  date?: string;
}

/** Entrée brute du formulaire de réapprovisionnement (champs texte). */
export interface RefillFormInput {
  hasItem: boolean;
  quantite: string;
  prixUnitaire: string;
  dateIso: string;
}

/** Résultat de validation au contrat `{ ok, errors, normalized }`. */
export interface RefillValidation {
  ok: boolean;
  errors: RefillErrors;
  normalized?: {
    quantite: number;
    prixUnitaire: number | undefined;
    dateIso: string;
  };
}

/** Parse un nombre tolérant la virgule décimale FR. NaN si invalide/vide. */
function parseRefillNum(raw: string): number {
  const n = parseFloat(String(raw ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Valide les champs du formulaire de réapprovisionnement (pur, testable).
 *  - item présent
 *  - quantite > 0
 *  - prixUnitaire optionnel, mais si fourni doit être ≥ 0
 *  - dateIso non vide
 */
export function validateRefill(input: RefillFormInput): RefillValidation {
  const errors: RefillErrors = {};

  if (!input.hasItem) errors.item = 'Produit manquant';

  const quantite = parseRefillNum(input.quantite);
  if (!Number.isFinite(quantite) || quantite <= 0) {
    errors.quantite = 'Quantité > 0 requise';
  }

  let prixUnitaire: number | undefined;
  if (input.prixUnitaire.trim()) {
    const prix = parseRefillNum(input.prixUnitaire);
    if (!Number.isFinite(prix) || prix < 0) {
      errors.prix = 'Prix invalide';
    } else {
      prixUnitaire = prix;
    }
  }

  if (!input.dateIso) errors.date = 'Date requise';

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: {},
    normalized: { quantite, prixUnitaire, dateIso: input.dateIso },
  };
}

/** Payloads préparés par buildRefillPayloads (utiles en test). */
export interface RefillPayloads {
  stockSheet: 'STOCK_ALIMENTS' | 'STOCK_VETO';
  stockIdHeader: 'ID';
  stockIdValue: string;
  stockPatch: Record<string, SheetCell>;
  financeValues: SheetCell[] | null;
}

/** Date du jour en "YYYY-MM-DD" (pour input date). */
export function toIsoDateInput(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" → "DD/MM/YYYY" (format FR pour FINANCES). */
export function toFrDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/**
 * Construit les payloads d'enregistrement (pur, testable sans React).
 *  - Toujours un UPDATE STOCK_*
 *  - Un APPEND FINANCES si montant > 0 (prix unitaire × quantité)
 */
export function buildRefillPayloads(args: {
  item: RefillStockItem;
  quantite: number;
  fournisseur?: string;
  prixUnitaire?: number;
  dateIso: string; // YYYY-MM-DD
}): RefillPayloads {
  const { item, quantite, fournisseur, prixUnitaire, dateIso } = args;
  const currentStock = Number(item.stockActuel) || 0;
  const newStock = +(currentStock + quantite).toFixed(3);
  const statut = recomputeStatut(newStock, item.seuilAlerte);

  const stockSheet: 'STOCK_ALIMENTS' | 'STOCK_VETO' =
    item.kind === 'ALIMENT' ? 'STOCK_ALIMENTS' : 'STOCK_VETO';

  const stockPatch: Record<string, SheetCell> = {
    STOCK_ACTUEL: newStock,
    STATUT_STOCK: statut,
  };

  const montant =
    prixUnitaire && Number.isFinite(prixUnitaire) && prixUnitaire > 0
      ? +(prixUnitaire * quantite).toFixed(2)
      : 0;

  let financeValues: SheetCell[] | null = null;
  if (montant > 0) {
    const dateFr = toFrDate(dateIso);
    const categorie = item.kind === 'ALIMENT' ? 'ALIMENT' : 'SANTE';
    const name = labelFor(item);
    const libelle = `Réapprovisionnement ${name}`;
    const notesParts: string[] = [`ref:${item.id}`, `qty:${quantite}`];
    if (fournisseur && fournisseur.trim()) {
      notesParts.push(`fournisseur:${fournisseur.trim()}`);
    }
    // FINANCES schema : DATE · CATEGORIE · LIBELLE · MONTANT · TYPE · NOTES
    financeValues = [
      dateFr,
      categorie,
      libelle,
      montant,
      'DEPENSE',
      notesParts.join(' · '),
    ];
  }

  return {
    stockSheet,
    stockIdHeader: 'ID',
    stockIdValue: item.id,
    stockPatch,
    financeValues,
  };
}
