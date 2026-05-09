import type { BandePorcelets, PorceletIndividuel } from '../../types/farm';

export type PorceletPhase =
  | 'SOUS_MERE'
  | 'POST_SEVRAGE'
  | 'CROISSANCE'
  | 'ENGRAISSEMENT'
  | 'FINITION';

const FINITION_POIDS_KG = 100;
const SEVRAGE_J = 28;
const POST_SEVRAGE_FIN_J = 63;   // 28 + 35
const CROISSANCE_FIN_J = 100;    // 63 + 37
const ENGRAISSEMENT_FIN_J = 180; // 100 + 80

function joursDepuisMB(dateMB: string): number | null {
  const d = new Date(dateMB);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function derivePorceletPhase(
  porcelet: Pick<PorceletIndividuel, 'poidsCourantKg'>,
  bande: Pick<BandePorcelets, 'dateMB'>,
): PorceletPhase | null {
  // Priorité 1 : poids ≥ 100kg force FINITION
  if ((porcelet.poidsCourantKg ?? 0) >= FINITION_POIDS_KG) {
    return 'FINITION';
  }

  if (!bande.dateMB) return null;
  const j = joursDepuisMB(bande.dateMB);
  if (j === null) return null;

  if (j < SEVRAGE_J) return 'SOUS_MERE';
  if (j < POST_SEVRAGE_FIN_J) return 'POST_SEVRAGE';
  if (j < CROISSANCE_FIN_J) return 'CROISSANCE';
  if (j < ENGRAISSEMENT_FIN_J) return 'ENGRAISSEMENT';
  return 'FINITION';
}
