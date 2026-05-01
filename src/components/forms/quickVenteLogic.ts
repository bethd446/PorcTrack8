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
export const VENTE_ABATTOIR_NOM_MAX = 60;
export const VENTE_STATUT_VENDUE = 'Vendue';

/** Canaux de vente possibles. */
export const VENTE_CANAUX = ['ABATTOIR', 'DIRECT', 'DEMI_GROS', 'AUTRE'] as const;
export type VenteCanal = (typeof VENTE_CANAUX)[number];

/** Seuil de rendement carcasse considéré "bon" (badge vert ≥, amber sinon). */
export const VENTE_RENDEMENT_SEUIL_BON = 75;
/** Borne haute pour valider un rendement carcasse plausible (~85% max physiologique). */
export const VENTE_RENDEMENT_MAX_PCT = 85;

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

/**
 * Rendement carcasse (%) = poids_carcasse / poids_vif × 100.
 * Retourne NaN si inputs invalides.
 */
export function computeRendementCarcasse(
  poidsCarcasseKg: number,
  poidsVifKg: number,
): number {
  if (!Number.isFinite(poidsCarcasseKg) || poidsCarcasseKg <= 0) return Number.NaN;
  if (!Number.isFinite(poidsVifKg) || poidsVifKg <= 0) return Number.NaN;
  return Math.round((poidsCarcasseKg / poidsVifKg) * 1000) / 10;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface VenteValidationInput {
  nbVendus: number;
  vivantsActuels: number;
  poidsMoyenKg: number;
  prixUnitaireFCFA: number;
  acheteur: string;
  dateIso: string;
  /** Canal de vente (optionnel, par défaut DIRECT côté composant). */
  canal?: VenteCanal;
  /** Si canal = ABATTOIR, ces 3 champs sont validés ensemble. */
  abattoirNom?: string;
  poidsCarcasseKg?: number;
  prixCarcasseFCFAKg?: number;
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

  // ── Canal de vente (optionnel mais validé si présent) ────────────────────
  if (input.canal !== undefined && !VENTE_CANAUX.includes(input.canal)) {
    errors.canal = 'Canal de vente invalide';
  }

  // ── Si ABATTOIR : nom + poids carcasse + prix carcasse requis ─────────────
  if (input.canal === 'ABATTOIR') {
    const nomTrim = (input.abattoirNom ?? '').trim();
    if (!nomTrim) {
      errors.abattoirNom = 'Nom abattoir requis';
    } else if (nomTrim.length > VENTE_ABATTOIR_NOM_MAX) {
      errors.abattoirNom = `Max ${VENTE_ABATTOIR_NOM_MAX} caractères`;
    }

    if (
      !Number.isFinite(input.poidsCarcasseKg) ||
      (input.poidsCarcasseKg ?? 0) <= 0
    ) {
      errors.poidsCarcasse = 'Poids carcasse > 0 requis';
    } else {
      const totalVif =
        Number.isFinite(input.poidsMoyenKg) && Number.isFinite(input.nbVendus)
          ? input.poidsMoyenKg * input.nbVendus
          : Number.NaN;
      // Rendement = carcasse / vif × 100. Doit rester ≤ VENTE_RENDEMENT_MAX_PCT.
      if (Number.isFinite(totalVif) && totalVif > 0) {
        const pct = ((input.poidsCarcasseKg as number) / totalVif) * 100;
        if (pct > VENTE_RENDEMENT_MAX_PCT) {
          errors.poidsCarcasse = `Rendement > ${VENTE_RENDEMENT_MAX_PCT}% impossible`;
        }
      }
    }

    if (
      !Number.isFinite(input.prixCarcasseFCFAKg) ||
      (input.prixCarcasseFCFAKg ?? 0) <= 0
    ) {
      errors.prixCarcasse = 'Prix carcasse > 0 requis';
    }
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
  /** Patch carcasse (camelCase métier) à appliquer en plus du patch legacy. */
  carcassePatch: Record<string, SheetCell>;
  /** Patch carcasse (snake_case Postgres) prêt pour `updateBatchByCode`. */
  carcasseDbPatch: Record<string, SheetCell>;
  /** Rendement carcasse (%) si calculable, sinon null. */
  rendementPct: number | null;
}

export interface BuildVentePayloadsArgs {
  bande: Pick<BandePorcelets, 'id' | 'idPortee' | 'vivants' | 'notes' | 'statut'>;
  nbVendus: number;
  poidsMoyenKg: number;
  prixUnitaireFCFA: number;
  acheteur: string;
  dateIso: string; // YYYY-MM-DD
  notes?: string;
  /** Canal de vente. Par défaut indéfini (legacy = DIRECT). */
  canal?: VenteCanal;
  /** Champs carcasse (ABATTOIR uniquement). */
  abattoirNom?: string;
  poidsCarcasseKg?: number;
  prixCarcasseFCFAKg?: number;
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
    canal, abattoirNom, poidsCarcasseKg, prixCarcasseFCFAKg,
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

  // ── Patch carcasse (camelCase métier + snake_case DB) ──────────────────
  const carcassePatch: Record<string, SheetCell> = {};
  const carcasseDbPatch: Record<string, SheetCell> = {};
  let rendementPct: number | null = null;

  if (canal) {
    carcassePatch.canalVente = canal;
    carcasseDbPatch.canal_vente = canal;
  }

  const totalVif =
    Number.isFinite(poidsMoyenKg) && Number.isFinite(nbVendus) && nbVendus > 0
      ? Math.round(poidsMoyenKg * nbVendus * 100) / 100
      : null;

  if (canal === 'ABATTOIR') {
    if (totalVif !== null) {
      carcassePatch.poidsVifKg = totalVif;
      carcasseDbPatch.poids_vif_kg = totalVif;
    }
    const nomTrim = (abattoirNom ?? '').trim();
    if (nomTrim) {
      carcassePatch.abattoirNom = nomTrim;
      carcasseDbPatch.abattoir_nom = nomTrim;
    }
    if (Number.isFinite(poidsCarcasseKg) && (poidsCarcasseKg ?? 0) > 0) {
      const c = poidsCarcasseKg as number;
      carcassePatch.poidsCarcasseKg = c;
      carcasseDbPatch.poids_carcasse_kg = c;
      if (totalVif !== null) {
        const pct = computeRendementCarcasse(c, totalVif);
        if (Number.isFinite(pct)) {
          rendementPct = pct;
          carcassePatch.rendementCarcassePct = pct;
          carcasseDbPatch.rendement_carcasse_pct = pct;
        }
      }
    }
    if (Number.isFinite(prixCarcasseFCFAKg) && (prixCarcasseFCFAKg ?? 0) > 0) {
      const p = prixCarcasseFCFAKg as number;
      carcassePatch.prixCarcasseFCFAKg = p;
      carcasseDbPatch.prix_carcasse_fcfa_kg = p;
    }
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
  if (canal) notesParts.push(`canal:${canal}`);
  if (canal === 'ABATTOIR') {
    if ((abattoirNom ?? '').trim()) notesParts.push(`abattoir:${(abattoirNom as string).trim()}`);
    if (Number.isFinite(poidsCarcasseKg) && (poidsCarcasseKg ?? 0) > 0) {
      notesParts.push(`carcasse:${poidsCarcasseKg}kg`);
    }
    if (rendementPct !== null) notesParts.push(`rendement:${rendementPct}%`);
    if (Number.isFinite(prixCarcasseFCFAKg) && (prixCarcasseFCFAKg ?? 0) > 0) {
      notesParts.push(`prix_carcasse:${prixCarcasseFCFAKg}FCFA/kg`);
    }
  }
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
    carcassePatch,
    carcasseDbPatch,
    rendementPct,
  };
}
