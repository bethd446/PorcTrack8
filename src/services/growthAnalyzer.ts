/**
 * growthAnalyzer — Suivi de croissance des bandes porcelets
 * ═══════════════════════════════════════════════════════════
 * Parse les notes NOTES_TERRAIN (TYPE_ANIMAL='BANDE') écrites par
 * QuickPeseeForm pour reconstituer l'historique des pesées d'une bande,
 * calculer le GMQ (Gain Moyen Quotidien en g/j) entre pesées successives
 * et comparer aux références race porcine.
 *
 * Pure functions, zéro dépendance React — testable en Node.
 *
 * Références biologiques (standards professionnels porc) :
 *   SOUS_MERE       0-21 j    GMQ 180-250 g/j   poids sortie 5-6 kg
 *   POST_SEVRAGE    21-70 j   GMQ 400-500 g/j   poids sortie 22-26 kg
 *   ENGRAISSEMENT   70-180 j  GMQ 750-900 g/j   poids finition 110-120 kg
 *
 * Alerte SOUS_CIBLE si GMQ réel < 80% de la cible phase.
 */

import type { Note } from '../types';
import type { BandePorcelets } from '../types/farm';
import { computeBandePhase, type BandePhase } from './bandesAggregator';
import { logger } from './logger';

// ─── Types publics ──────────────────────────────────────────────────────────

export interface PeseeRecord {
  /** Date ISO YYYY-MM-DD. */
  date: string;
  nbPeses: number;
  /** Poids moyen en kg. */
  poidsMoyen: number;
  /** Écart-type en kg (optionnel). */
  ecartType?: number;
  /** Observation libre (après le dernier `·`). */
  observation?: string;
}

export interface GMQEntry {
  fromDate: string;
  toDate: string;
  joursEcart: number;
  /** GMQ en grammes par jour. */
  gmqGrammesParJour: number;
  poidsDebut: number;
  poidsFin: number;
}

export type GrowthAlerte = 'OK' | 'SOUS_CIBLE' | 'NOUS_PEU_DE_DATA';

export interface BandeGrowthStats {
  /** Pesées triées ASC par date. */
  pesees: PeseeRecord[];
  dernierPoids?: number;
  dernierGMQ?: GMQEntry;
  /** Moyenne pondérée du GMQ sur tout l'historique (g/j). 0 si < 2 pesées. */
  gmqMoyenGlobal: number;
  phaseCourante: BandePhase;
  /** Fourchette cible de la phase courante (g/j). */
  gmqCibleActuel: { min: number; max: number };
  alerte: GrowthAlerte;
  /** Projection poids finition — ENGRAISSEMENT uniquement. */
  poidsProjeteFin?: number;
  joursDepuisDerniere?: number;
}

// ─── Constantes biologiques ─────────────────────────────────────────────────

/** Cibles GMQ (g/j) par phase d'élevage. */
const GMQ_CIBLES: Record<BandePhase, { min: number; max: number }> = {
  SOUS_MERE: { min: 180, max: 250 },
  POST_SEVRAGE: { min: 400, max: 500 },
  ENGRAISSEMENT: { min: 750, max: 900 },
  INCONNU: { min: 0, max: 0 },
};

/** Seuil déclenchement alerte SOUS_CIBLE : GMQ réel < 80% de la cible min. */
const SEUIL_ALERTE_RATIO = 0.8;

/** Poids finition cible (kg) pour projection ENGRAISSEMENT. */
const POIDS_FINITION_CIBLE = 115;

/** Filtres anti-aberration. */
const POIDS_MIN_KG = 0;
const POIDS_MAX_KG = 200;

// ─── Parsing ────────────────────────────────────────────────────────────────

/**
 * Regex extraction pesée depuis texte libre.
 * Tolère : "Pesée", "Pesee", "pesée", variantes espaces.
 * Capture : nb porcelets · poids moy · écart-type (optionnel).
 *
 * Groupes :
 *   1: nb (entier)
 *   2: poids moyen (kg, décimal)
 *   3: écart-type (kg, décimal, optionnel)
 */
const PESEE_REGEX =
  /pes[ée]e?\s+(\d+)\s+porc\w*\s*[·\-]\s*([\d.,]+)\s*kg(?:[^·±]*±\s*([\d.,]+))?/i;

/**
 * Convertit une chaîne numérique française ("5,4") ou anglo ("5.4") en number.
 * Retourne `NaN` si parsing échoue.
 */
function parseNum(raw: string): number {
  return Number(raw.replace(',', '.'));
}

/**
 * Extrait l'observation : tout ce qui suit le dernier `·` s'il n'y a pas de
 * token technique (kg, J+, ±). Sinon undefined.
 */
function extractObservation(texte: string): string | undefined {
  const parts = texte.split('·').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return undefined;
  // Dernier segment — ignore s'il contient des tokens techniques
  const last = parts[parts.length - 1];
  if (/^j\s*\+?\d+$/i.test(last)) return undefined;
  if (/kg/i.test(last)) return undefined;
  if (/^±/.test(last)) return undefined;
  if (/^pes[ée]e?/i.test(last)) return undefined;
  return last || undefined;
}

/**
 * Valide qu'une chaîne date ISO YYYY-MM-DD est bien parseable.
 * Retourne `true` si la date est valide, `false` sinon.
 */
function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return !Number.isNaN(d.getTime());
}

/**
 * Parse une note terrain en `PeseeRecord` si elle contient une pesée.
 * Retourne `null` si le format ne matche pas ou si les données sont aberrantes.
 */
export function parsePeseeFromNote(note: Note): PeseeRecord | null {
  if (!note || typeof note.texte !== 'string') return null;
  const match = PESEE_REGEX.exec(note.texte);
  if (!match) return null;

  const nb = Number(match[1]);
  const poids = parseNum(match[2]);
  const ecart = match[3] !== undefined ? parseNum(match[3]) : undefined;

  if (!Number.isFinite(nb) || nb <= 0) return null;
  if (!Number.isFinite(poids) || poids <= POIDS_MIN_KG || poids > POIDS_MAX_KG) {
    logger.warn('growthAnalyzer', 'Poids aberrant ignoré', {
      noteId: note.id,
      poids,
    });
    return null;
  }
  if (ecart !== undefined && (!Number.isFinite(ecart) || ecart < 0)) {
    // Écart-type aberrant → on garde la pesée sans écart
    return {
      date: note.date,
      nbPeses: nb,
      poidsMoyen: poids,
      observation: extractObservation(note.texte),
    };
  }

  if (!isValidIsoDate(note.date)) {
    logger.warn('growthAnalyzer', 'Date invalide ignorée', {
      noteId: note.id,
      date: note.date,
    });
    return null;
  }

  return {
    date: note.date,
    nbPeses: nb,
    poidsMoyen: poids,
    ecartType: ecart,
    observation: extractObservation(note.texte),
  };
}

/**
 * Extrait toutes les pesées d'une bande donnée, triées ASC par date.
 *
 * @param bandeId ID de la bande (ex: "B07")
 * @param notes Liste de notes terrain (typiquement `useFarm().notes`)
 */
export function extractPeseesForBande(
  bandeId: string,
  notes: readonly Note[],
): PeseeRecord[] {
  const result: PeseeRecord[] = [];
  for (const n of notes) {
    if (n.animalType !== 'BANDE') continue;
    if (n.animalId !== bandeId) continue;
    const pesee = parsePeseeFromNote(n);
    if (pesee) result.push(pesee);
  }
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

// ─── Calculs GMQ ────────────────────────────────────────────────────────────

/**
 * Calcule le nombre de jours entiers entre deux dates ISO YYYY-MM-DD.
 * Retourne 0 si l'une des dates est invalide ou si elles sont identiques.
 */
function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Calcule la liste des GMQ entre chaque paire de pesées consécutives.
 *
 * - 0 ou 1 pesée → `[]`
 * - 2 pesées → 1 entry
 * - N pesées → N-1 entries
 *
 * Gestion :
 * - Si 2 pesées à la même date → joursEcart=0, GMQ=0 (on évite division par 0)
 * - Poids décroissant → GMQ négatif (laissé tel quel, le caller peut détecter)
 */
export function computeGMQ(pesees: readonly PeseeRecord[]): GMQEntry[] {
  if (pesees.length < 2) return [];
  const entries: GMQEntry[] = [];
  for (let i = 1; i < pesees.length; i += 1) {
    const prev = pesees[i - 1];
    const curr = pesees[i];
    const jours = daysBetween(prev.date, curr.date);
    const deltaKg = curr.poidsMoyen - prev.poidsMoyen;
    const gmq = jours > 0 ? Math.round((deltaKg * 1000) / jours) : 0;
    entries.push({
      fromDate: prev.date,
      toDate: curr.date,
      joursEcart: jours,
      gmqGrammesParJour: gmq,
      poidsDebut: prev.poidsMoyen,
      poidsFin: curr.poidsMoyen,
    });
  }
  return entries;
}

/**
 * Retourne la fourchette cible (min/max en g/j) pour une phase donnée.
 */
export function gmqCibleForPhase(
  phase: BandePhase,
): { min: number; max: number } {
  return GMQ_CIBLES[phase];
}

/**
 * Projette le poids en finition pour une bande en ENGRAISSEMENT.
 *
 * @param currentWeight Poids actuel (kg)
 * @param gmqMoy GMQ moyen observé (g/j)
 * @param joursRestants Nombre de jours jusqu'à la finition cible
 * @returns Poids projeté (kg) arrondi à 1 décimale
 */
export function projectPoidsFinition(
  currentWeight: number,
  gmqMoy: number,
  joursRestants: number,
): number {
  const gainKg = (gmqMoy * Math.max(0, joursRestants)) / 1000;
  return Math.round((currentWeight + gainKg) * 10) / 10;
}

/**
 * Calcule le GMQ moyen pondéré sur tout l'historique d'une bande.
 * Pondération par nombre de jours de chaque intervalle.
 */
function weightedAverageGMQ(gmqEntries: readonly GMQEntry[]): number {
  if (gmqEntries.length === 0) return 0;
  let totalJours = 0;
  let totalGrammes = 0;
  for (const e of gmqEntries) {
    if (e.joursEcart <= 0) continue;
    totalJours += e.joursEcart;
    totalGrammes += e.gmqGrammesParJour * e.joursEcart;
  }
  return totalJours > 0 ? Math.round(totalGrammes / totalJours) : 0;
}

/**
 * Produit la synthèse croissance complète d'une bande.
 * Combine parsing notes + calculs GMQ + phase + alerte + projection.
 *
 * @param bande La bande concernée
 * @param notes Notes terrain (toutes animaltype confondues — filtrées en interne)
 * @param today Date de référence (par défaut `new Date()`)
 */
export function computeBandeGrowthStats(
  bande: BandePorcelets,
  notes: readonly Note[],
  today: Date = new Date(),
): BandeGrowthStats {
  const pesees = extractPeseesForBande(bande.id, notes);
  const phaseCourante = computeBandePhase(bande, today);
  const gmqCibleActuel = gmqCibleForPhase(phaseCourante);

  if (pesees.length === 0) {
    return {
      pesees,
      gmqMoyenGlobal: 0,
      phaseCourante,
      gmqCibleActuel,
      alerte: 'NOUS_PEU_DE_DATA',
    };
  }

  const gmqEntries = computeGMQ(pesees);
  const dernierGMQ = gmqEntries.length > 0
    ? gmqEntries[gmqEntries.length - 1]
    : undefined;
  const gmqMoyenGlobal = weightedAverageGMQ(gmqEntries);
  const derniere = pesees[pesees.length - 1];
  const dernierPoids = derniere.poidsMoyen;

  // Jours depuis dernière pesée
  const jDepuis = daysBetween(derniere.date, today.toISOString().slice(0, 10));
  const joursDepuisDerniere = jDepuis >= 0 ? jDepuis : 0;

  // Alerte
  let alerte: GrowthAlerte;
  if (pesees.length < 2 || gmqCibleActuel.min === 0) {
    alerte = 'NOUS_PEU_DE_DATA';
  } else {
    const seuil = gmqCibleActuel.min * SEUIL_ALERTE_RATIO;
    alerte = gmqMoyenGlobal < seuil ? 'SOUS_CIBLE' : 'OK';
  }

  // Projection finition — ENGRAISSEMENT uniquement + GMQ moyen positif
  let poidsProjeteFin: number | undefined;
  if (phaseCourante === 'ENGRAISSEMENT' && gmqMoyenGlobal > 0) {
    const joursPourAtteindreCible =
      Math.max(0, Math.round(((POIDS_FINITION_CIBLE - dernierPoids) * 1000) / gmqMoyenGlobal));
    poidsProjeteFin = projectPoidsFinition(
      dernierPoids,
      gmqMoyenGlobal,
      joursPourAtteindreCible,
    );
  }

  return {
    pesees,
    dernierPoids,
    dernierGMQ,
    gmqMoyenGlobal,
    phaseCourante,
    gmqCibleActuel,
    alerte,
    poidsProjeteFin,
    joursDepuisDerniere,
  };
}
