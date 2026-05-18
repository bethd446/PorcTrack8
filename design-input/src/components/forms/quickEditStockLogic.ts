/**
 * QuickEditStock — Logique pure (validation + helpers).
 * ════════════════════════════════════════════════════════════════════════
 * Isolée (sans React / Ionic) pour être testable en environnement `node`
 * (vitest sans jsdom).
 *
 * Différence vs QuickRefillForm :
 *   - QuickRefillForm AJOUTE une quantité (réappro, flow porcher).
 *   - QuickEditStock CORRIGE les informations du stock (flow admin).
 *
 * Règles de validation :
 *   - kind=ALIMENT : `libelle` obligatoire, trim, 1..60 chars.
 *   - kind=VETO    : `produit` obligatoire, trim, 1..60 chars. `type`/`usage`
 *                    optionnels, trim, max 60 chars.
 *   - `stockActuel` : nombre fini, 0..9999, step 0.1.
 *   - `seuilAlerte` : nombre fini, 0..9999 (pas nécessairement ≤ stockActuel).
 *   - `unite` : texte non vide, max 20 chars.
 *   - `statut` : 'OK' | 'BAS' | 'RUPTURE'.
 *   - `notes`  : optionnel, max 200 chars.
 *
 * Patch retourné utilise les noms de colonnes GAS canoniques :
 *   Aliment : LIBELLE, STOCK_ACTUEL, UNITE, SEUIL_ALERTE, STATUT_STOCK, NOTES
 *   Véto    : PRODUIT, TYPE, USAGE, STOCK_ACTUEL, UNITE, SEUIL_ALERTE,
 *             STATUT_STOCK, NOTES
 */

import type { SheetCell } from '../../services/offlineQueue';
import type { StockAliment, StockVeto, StockStatut } from '../../types/farm';

// ─── Types publics ──────────────────────────────────────────────────────────

export type StockKind = 'ALIMENT' | 'VETO';

export type EditableStatut = 'OK' | 'BAS' | 'RUPTURE';

export interface StockEditErrors {
  libelle?: string;
  produit?: string;
  type?: string;
  usage?: string;
  stockActuel?: string;
  unite?: string;
  seuilAlerte?: string;
  statut?: string;
  notes?: string;
}

export interface StockEditInput {
  kind: StockKind;
  libelle?: string; // aliment uniquement
  produit?: string; // véto uniquement
  type?: string; // véto uniquement
  usage?: string; // véto uniquement
  stockActuel: string; // raw input
  unite: string;
  seuilAlerte: string; // raw input
  statut: EditableStatut;
  notes: string;
}

export interface StockEditValidation {
  ok: boolean;
  patch?: Record<string, SheetCell>;
  sheetName?: 'STOCK_ALIMENTS' | 'STOCK_VETO';
  errors: StockEditErrors;
}

// ─── Helpers internes ───────────────────────────────────────────────────────

function parseNum(raw: string): number {
  const s = String(raw ?? '').replace(',', '.').trim();
  if (s === '') return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// ─── Helpers publics ────────────────────────────────────────────────────────

/**
 * Recalcule le statut d'un stock à partir du stock actuel + seuil d'alerte.
 *  - stockActuel === 0           → RUPTURE
 *  - stockActuel <= seuilAlerte  → BAS (si seuil > 0)
 *  - sinon                       → OK
 *
 * Note : comportement légèrement plus permissif que `quickRefillLogic.recomputeStatut`
 * (qui traite stock < 0 comme RUPTURE) car ici stockActuel est toujours
 * borné ≥ 0 par l'input type="number" min=0.
 */
export function recomputeStatut(
  stockActuel: number,
  seuilAlerte: number,
): EditableStatut {
  if (!Number.isFinite(stockActuel) || stockActuel <= 0) return 'RUPTURE';
  if (Number.isFinite(seuilAlerte) && seuilAlerte > 0 && stockActuel <= seuilAlerte) {
    return 'BAS';
  }
  return 'OK';
}

/** Retourne le libellé affichable (libelle si aliment, produit sinon). */
export function stockLabelFor(
  item: StockAliment | StockVeto,
  kind: StockKind,
): string {
  if (kind === 'ALIMENT') return (item as StockAliment).libelle ?? '';
  return (item as StockVeto).produit ?? '';
}

/** Pré-remplit l'input de formulaire depuis un StockAliment/Veto existant. */
export function toStockEditInput(
  item: StockAliment | StockVeto,
  kind: StockKind,
): StockEditInput {
  const statutRaw = ((item as StockAliment).statutStock
    ?? (item as StockVeto).statutStock
    ?? 'OK') as StockStatut;
  const statut: EditableStatut =
    statutRaw === 'BAS' || statutRaw === 'RUPTURE' ? statutRaw : 'OK';
  if (kind === 'ALIMENT') {
    const a = item as StockAliment;
    return {
      kind,
      libelle: a.libelle ?? '',
      stockActuel: String(a.stockActuel ?? 0),
      unite: a.unite ?? '',
      seuilAlerte: String(a.seuilAlerte ?? 0),
      statut,
      notes: a.notes ?? '',
    };
  }
  const v = item as StockVeto;
  return {
    kind,
    produit: v.produit ?? '',
    type: v.type ?? '',
    usage: v.usage ?? '',
    stockActuel: String(v.stockActuel ?? 0),
    unite: v.unite ?? '',
    seuilAlerte: String(v.seuilAlerte ?? 0),
    statut,
    notes: v.notes ?? '',
  };
}

/**
 * Valide l'input formulaire et construit le patch Sheets + sheetName cible.
 * Patch partiel : seules les clés présentes sont envoyées.
 */
export function validateStockEdit(input: StockEditInput): StockEditValidation {
  const errors: StockEditErrors = {};

  // ── Identité
  if (input.kind === 'ALIMENT') {
    const lib = (input.libelle ?? '').trim();
    if (lib.length === 0) errors.libelle = 'Libellé requis';
    else if (lib.length > 60) errors.libelle = 'Libellé trop long (max 60)';
  } else {
    const prod = (input.produit ?? '').trim();
    if (prod.length === 0) errors.produit = 'Produit requis';
    else if (prod.length > 60) errors.produit = 'Produit trop long (max 60)';

    const type = (input.type ?? '').trim();
    if (type.length > 60) errors.type = 'Type trop long (max 60)';

    const usage = (input.usage ?? '').trim();
    if (usage.length > 60) errors.usage = 'Usage trop long (max 60)';
  }

  // ── Stock
  const stock = parseNum(input.stockActuel);
  if (!Number.isFinite(stock)) errors.stockActuel = 'Stock actuel requis';
  else if (stock < 0) errors.stockActuel = 'Stock actuel ≥ 0';
  else if (stock > 9999) errors.stockActuel = 'Stock actuel ≤ 9999';

  // ── Seuil
  const seuil = parseNum(input.seuilAlerte);
  if (!Number.isFinite(seuil)) errors.seuilAlerte = 'Seuil requis';
  else if (seuil < 0) errors.seuilAlerte = 'Seuil ≥ 0';
  else if (seuil > 9999) errors.seuilAlerte = 'Seuil ≤ 9999';

  // ── Unité
  const unite = (input.unite ?? '').trim();
  if (unite.length === 0) errors.unite = 'Unité requise';
  else if (unite.length > 20) errors.unite = 'Unité trop longue (max 20)';

  // ── Statut
  if (
    input.statut !== 'OK' &&
    input.statut !== 'BAS' &&
    input.statut !== 'RUPTURE'
  ) {
    errors.statut = 'Statut invalide';
  }

  // ── Notes
  const notes = (input.notes ?? '').trim();
  if (notes.length > 200) errors.notes = 'Notes trop longues (max 200)';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // ── Patch
  const stockRounded = Math.round(stock * 10) / 10;
  const seuilRounded = Math.round(seuil * 10) / 10;

  if (input.kind === 'ALIMENT') {
    return {
      ok: true,
      errors: {},
      sheetName: 'STOCK_ALIMENTS',
      patch: {
        LIBELLE: (input.libelle ?? '').trim(),
        STOCK_ACTUEL: stockRounded,
        UNITE: unite,
        SEUIL_ALERTE: seuilRounded,
        STATUT_STOCK: input.statut,
        NOTES: notes,
      },
    };
  }

  return {
    ok: true,
    errors: {},
    sheetName: 'STOCK_VETO',
    patch: {
      PRODUIT: (input.produit ?? '').trim(),
      TYPE: (input.type ?? '').trim(),
      USAGE: (input.usage ?? '').trim(),
      STOCK_ACTUEL: stockRounded,
      UNITE: unite,
      SEUIL_ALERTE: seuilRounded,
      STATUT_STOCK: input.statut,
      NOTES: notes,
    },
  };
}
