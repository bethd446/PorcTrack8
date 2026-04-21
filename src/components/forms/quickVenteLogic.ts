/**
 * Logique pure de vente de porcs — sans dépendance React / Ionic.
 * ══════════════════════════════════════════════════════════════════════
 * Isolée ici pour être testée en environnement `node` (vitest) sans monter
 * l'arbre React. Le composant `QuickVenteForm` importe ces helpers.
 *
 * Schéma métier :
 *  - Une vente soustrait des porcs vivants d'une bande (VIVANTS -= nbVendus).
 *  - Si VIVANTS tombe à 0, la bande passe en statut 'Vendue'.
 *  - Une ligne FINANCES de type REVENU est ajoutée avec :
 *      DATE · CATEGORIE · LIBELLE · MONTANT · TYPE · NOTES
 *      (dd/MM/yyyy · VENTE_PORCS · "Vente N porcs <acheteur>" · montant · REVENU · notes)
 *  - Les NOTES de la bande sont horodatées avec la vente pour audit trail.
 */

import type { SheetCell } from '../../services/offlineQueue';
import type { BandePorcelets } from '../../types/farm';

// ─── Constantes métier ──────────────────────────────────────────────────────

export const VENTE_MAX_POIDS_KG = 200;
export const VENTE_NOTES_MAX = 200;
export const VENTE_ACHETEUR_MAX = 60;
export const VENTE_STATUT_VENDUE = 'Vendue';

// ─── Helpers date ───────────────────────────────────────────────────────────

/** Date du jour en "YYYY-MM-DD" (pour <input type="date">). */
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

// ─── Calcul montant ─────────────────────────────────────────────────────────

/**
 * Montant total d'une vente = nombre × poids moyen × prix unitaire.
 * Arrondi à l'entier (les FCFA n'ont pas de centimes).
 * Retourne 0 si un des inputs est invalide.
 */
export function computeVenteMontant(
  nbVendus: number,
  poidsMoyenKg: number,
  prixUnitaireFCFA: number,
): number {
  if (!Number.isFinite(nbVendus) || nbVendus <= 0) return 0;
  if (!Number.isFinite(poidsMoyenKg) || poidsMoyenKg <= 0) return 0;
  if (!Number.isFinite(prixUnitaireFCFA) || prixUnitaireFCFA <= 0) return 0;
  return Math.round(nbVendus * poidsMoyenKg * prixUnitaireFCFA);
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface VenteValidationInput {
  nbVendus: number;
  vivantsActuels: number;
  poidsMoyenKg: number;
  prixUnitaireFCFA: number;
  acheteur: string;
  dateIso: string;
}

export interface VenteValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

/**
 * Valide les inputs d'une vente.
 * Règles :
 *  - nbVendus ≥ 1 et ≤ vivantsActuels
 *  - poidsMoyenKg > 0 et ≤ VENTE_MAX_POIDS_KG
 *  - prixUnitaireFCFA > 0
 *  - acheteur non vide (≤ 60 chars)
 *  - dateIso présente
 */
export function validateVente(input: VenteValidationInput): VenteValidationResult {
  const errors: Record<string, string> = {};

  if (!Number.isFinite(input.nbVendus) || input.nbVendus <= 0) {
    errors.nbVendus = 'Nombre de porcs requis (> 0)';
  } else if (!Number.isInteger(input.nbVendus)) {
    errors.nbVendus = 'Nombre entier requis';
  } else if (input.nbVendus > input.vivantsActuels) {
    errors.nbVendus = `Max ${input.vivantsActuels} vivants`;
  }

  if (!Number.isFinite(input.poidsMoyenKg) || input.poidsMoyenKg <= 0) {
    errors.poids = 'Poids moyen > 0 requis';
  } else if (input.poidsMoyenKg > VENTE_MAX_POIDS_KG) {
    errors.poids = `Max ${VENTE_MAX_POIDS_KG} kg`;
  }

  if (!Number.isFinite(input.prixUnitaireFCFA) || input.prixUnitaireFCFA <= 0) {
    errors.prix = 'Prix unitaire > 0 requis';
  }

  const acheteurTrim = (input.acheteur ?? '').trim();
  if (!acheteurTrim) {
    errors.acheteur = 'Acheteur requis';
  } else if (acheteurTrim.length > VENTE_ACHETEUR_MAX) {
    errors.acheteur = `Max ${VENTE_ACHETEUR_MAX} caractères`;
  }

  if (!input.dateIso) {
    errors.date = 'Date requise';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

// ─── Payloads ───────────────────────────────────────────────────────────────

export interface VentePayloads {
  /** UPDATE PORCELETS_BANDES_DETAIL par ID. */
  bandeSheet: 'PORCELETS_BANDES_DETAIL';
  bandeIdHeader: 'ID';
  bandeIdValue: string;
  bandePatch: Record<string, SheetCell>;
  /** APPEND FINANCES (REVENU) — toujours présent. */
  financeValues: SheetCell[];
  /** Montant total de la vente (FCFA). */
  montant: number;
  /** Vivants restants après la vente (0 → bande archivée). */
  vivantsRestants: number;
  /** True si la bande est totalement vendue (vivants=0). */
  bandeVendue: boolean;
}

export interface BuildVentePayloadsArgs {
  bande: Pick<BandePorcelets, 'id' | 'idPortee' | 'vivants' | 'notes' | 'statut'>;
  nbVendus: number;
  poidsMoyenKg: number;
  prixUnitaireFCFA: number;
  acheteur: string;
  dateIso: string; // YYYY-MM-DD
  notes?: string;
}

/**
 * Concatène les notes existantes avec un horodatage vente (non destructif).
 * Format : "<existing> | Vente DD/MM/YYYY".
 */
export function buildBandeNotes(
  existing: string | undefined,
  dateFr: string,
  nbVendus: number,
): string {
  const stamp = `Vente ${nbVendus} porc${nbVendus > 1 ? 's' : ''} ${dateFr}`;
  const trimmed = (existing ?? '').trim();
  return trimmed ? `${trimmed} | ${stamp}` : stamp;
}

/**
 * Construit les payloads pour enqueue :
 *  1. UPDATE PORCELETS_BANDES_DETAIL { VIVANTS, NOTES, [STATUT] }
 *  2. APPEND FINANCES [date, VENTE_PORCS, libelle, montant, REVENU, bandeId, notes]
 *
 * Si vivants - nbVendus === 0, ajoute STATUT='Vendue' au patch.
 */
export function buildVentePayloads(args: BuildVentePayloadsArgs): VentePayloads {
  const {
    bande, nbVendus, poidsMoyenKg, prixUnitaireFCFA,
    acheteur, dateIso, notes,
  } = args;

  const currentVivants = Number(bande.vivants) || 0;
  const vivantsRestants = Math.max(0, currentVivants - nbVendus);
  const bandeVendue = vivantsRestants === 0;
  const dateFr = toFrDate(dateIso);
  const montant = computeVenteMontant(nbVendus, poidsMoyenKg, prixUnitaireFCFA);

  const bandePatch: Record<string, SheetCell> = {
    VIVANTS: vivantsRestants,
    NOTES: buildBandeNotes(bande.notes, dateFr, nbVendus),
  };
  if (bandeVendue) {
    bandePatch.STATUT = VENTE_STATUT_VENDUE;
  }

  const acheteurTrim = acheteur.trim();
  const libelle = `Vente ${nbVendus} porc${nbVendus > 1 ? 's' : ''} ${acheteurTrim}`;
  const notesTrim = (notes ?? '').trim();
  const bandeRef = bande.idPortee || bande.id;
  // Assembler notes FINANCES : metadata bande + acheteur + notes libres
  const notesParts: string[] = [
    `bande:${bandeRef}`,
    `qte:${nbVendus}`,
    `poids:${poidsMoyenKg}kg`,
    `prix:${prixUnitaireFCFA}FCFA/kg`,
    `acheteur:${acheteurTrim}`,
  ];
  if (notesTrim) notesParts.push(notesTrim);

  // FINANCES schema : DATE · CATEGORIE · LIBELLE · MONTANT · TYPE · NOTES
  const financeValues: SheetCell[] = [
    dateFr,
    'VENTE_PORCS',
    libelle,
    montant,
    'REVENU',
    notesParts.join(' · '),
  ];

  return {
    bandeSheet: 'PORCELETS_BANDES_DETAIL',
    bandeIdHeader: 'ID',
    bandeIdValue: bande.id,
    bandePatch,
    financeValues,
    montant,
    vivantsRestants,
    bandeVendue,
  };
}
