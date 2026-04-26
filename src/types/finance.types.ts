/**
 * finance.types.ts — Contrat de données pour l'analyse de rentabilité
 */

export type RentabiliteStatut = 'EXCELLENT' | 'CORRECT' | 'DEFICITAIRE';

export interface BandeROIEstimate {
  /** Somme des coûts alimentaires par phase passée */
  coutAlimentaireEstime: number;
  /** Coûts sanitaires et fixes (nbPorcs * COUTS_FIXES_PAR_PORC) */
  coutFixeEstime: number;
  /** Somme de tous les coûts */
  coutTotalEstime: number;
  /** Chiffre d'affaires si vendu au poids actuel (ou sortie) */
  revenuBrutProjete: number;
  /** Revenu brut - Coût total */
  margeNetteProjetee: number;
  /** Marge / Coût Total (en %) */
  roiPct: number;
  statutRentabilite: RentabiliteStatut;
}

export interface ConsoPhase {
  phase: string;
  jours: number;
  consoKg: number;
  coutFCFA: number;
}
