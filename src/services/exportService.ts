/**
 * exportService.ts — Service de préparation des données pour le reporting
 */

import { FARM_CONFIG } from '../config/farm';
import { genererRapportGlobal } from './financialAnalyzer';
import { countBandesByPhase } from './bandesAggregator';
import type { BandePorcelets, TransitionBande, Truie, Saillie } from '../types/farm';
import type { FarmAlert } from './alertEngine';

export interface AuditSnapshot {
  date: string;
  farmName: string;
  inventory: {
    maternite: number;
    postSevrage: number;
    croissance: number;
    engraissement: number;
    finition: number;
    totalPorcelets: number;
  };
  finance: {
    margeGlobale: number;
    revenuProjete: number;
    detteAlimentaire: number;
    coutsFixes: number;
  };
  urgences: FarmAlert[];
  topBande?: string;
  flopBande?: string;
}

/**
 * Prépare un instantané complet de l'exploitation pour l'audit
 */
export function prepareAuditSnapshot(
  bandes: BandePorcelets[],
  transitions: TransitionBande[],
  alerts: FarmAlert[]
): AuditSnapshot {
  const today = new Date();
  const globalFinance = genererRapportGlobal(bandes, transitions);
  const counts = countBandesByPhase(bandes, today);

  return {
    date: today.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    farmName: FARM_CONFIG.FARM_NAME,
    inventory: {
      maternite: counts.SOUS_MERE,
      postSevrage: counts.POST_SEVRAGE,
      croissance: counts.CROISSANCE,
      engraissement: counts.ENGRAISSEMENT,
      finition: counts.FINITION,
      totalPorcelets: bandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0)
    },
    finance: {
      margeGlobale: globalFinance.margeGlobaleEstimee,
      revenuProjete: globalFinance.totalRevenuProjete,
      detteAlimentaire: globalFinance.totalCoutAlimentaire,
      coutsFixes: globalFinance.totalCoutFixe
    },
    urgences: alerts.filter(a => a.priority === 'CRITIQUE' || a.priority === 'HAUTE'),
    topBande: globalFinance.topBande?.bande.idPortee,
    flopBande: globalFinance.flopBande?.bande.idPortee
  };
}
