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

// V75-n F-26 : seuils poids pour fallback quand dateMB absente.
// Cohérents avec les seuils GTTT documentés (cf. config/farm.ts).
const POIDS_SOUS_MERE_MAX_KG = 7;
const POIDS_POST_SEVRAGE_MAX_KG = 25;
const POIDS_CROISSANCE_MAX_KG = 60;

function joursDepuisMB(dateMB: string): number | null {
  const d = new Date(dateMB);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function derivePorceletPhase(
  porcelet: Pick<PorceletIndividuel, 'poidsCourantKg'>,
  bande: Pick<BandePorcelets, 'dateMB'>,
): PorceletPhase | null {
  const poids = porcelet.poidsCourantKg ?? 0;

  // Priorité 1 : poids ≥ 100kg force FINITION
  if (poids >= FINITION_POIDS_KG) return 'FINITION';

  // Priorité 2 : si dateMB connue, calcul par jours
  if (bande.dateMB) {
    const j = joursDepuisMB(bande.dateMB);
    if (j !== null) {
      if (j < SEVRAGE_J) return 'SOUS_MERE';
      if (j < POST_SEVRAGE_FIN_J) return 'POST_SEVRAGE';
      if (j < CROISSANCE_FIN_J) return 'CROISSANCE';
      if (j < ENGRAISSEMENT_FIN_J) return 'ENGRAISSEMENT';
      return 'FINITION';
    }
  }

  // Priorité 3 (V75-n F-26) : fallback par poids si pas de dateMB.
  // Évite que la pill phase soit absente sur les bandes EN COURS sans dateMB
  // saisie (cf. B-AUDIT-CR : régression de visibilité pill).
  if (poids > 0) {
    if (poids < POIDS_SOUS_MERE_MAX_KG) return 'SOUS_MERE';
    if (poids < POIDS_POST_SEVRAGE_MAX_KG) return 'POST_SEVRAGE';
    if (poids < POIDS_CROISSANCE_MAX_KG) return 'CROISSANCE';
    return 'ENGRAISSEMENT';
  }

  return null;
}
