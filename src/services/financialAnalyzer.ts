/**
 * financialAnalyzer.ts — Moteur de calcul de rentabilité (Theoretical Base)
 */

import { FARM_CONFIG } from '../config/farm';
import type { BandePorcelets, TransitionBande } from '../types/farm';
import type { BandeROIEstimate, ConsoPhase } from '../types/finance.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFrDate(s: string | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

function diffDays(d1: Date, d2: Date): number {
  return Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / 86400000));
}

// ─── Logique de Calcul ───────────────────────────────────────────────────────

/**
 * Calcule la consommation théorique basée sur les durées de phases.
 * Si pas de transition trouvée, on utilise l'âge actuel pour estimer.
 */
export function calculerRapportPhases(
  bande: BandePorcelets,
  historique: TransitionBande[],
  today: Date = new Date()
): ConsoPhase[] {
  const reports: ConsoPhase[] = [];
  const nbPorcs = bande.vivants ?? 0;
  if (nbPorcs === 0) return [];

  const config = FARM_CONFIG.FINANCE_CONFIG;
  const birthDate = parseFrDate(bande.dateMB);
  if (!birthDate) return [];

  // Phases à évaluer
  const phaseSequence = [
    { key: 'POST_SEVRAGE', feed: 'DEMARRAGE_2' },
    { key: 'CROISSANCE',   feed: 'CROISSANCE' },
    { key: 'ENGRAISSEMENT', feed: 'FINITION' },
    { key: 'FINITION',     feed: 'FINITION' }
  ];

  let currentRefDate = parseFrDate(bande.dateSevrageReelle || bande.dateSevragePrevue) || birthDate;

  phaseSequence.forEach(({ key, feed }) => {
    // Trouver si une transition VERS la phase suivante existe
    const transitionVersSuivante = historique.find(t => t.bandeId === bande.id && t.anciennePhase === key);

    let endDate: Date;
    if (transitionVersSuivante) {
      endDate = parseFrDate(transitionVersSuivante.date) || today;
    } else {
      // Toujours dans cette phase ou phases futures non atteintes
      endDate = today;
    }

    const joursInPhase = diffDays(currentRefDate, endDate);

    if (joursInPhase > 0) {
      const consoJ = (config.CONSO_MOYENNE_J as Record<string, number>)[feed] || 0;
      const prixKg = (config.COUT_ALIMENT_KG as Record<string, number>)[feed] || 0;

      const totalKg = joursInPhase * nbPorcs * consoJ;

      reports.push({
        phase: key,
        jours: joursInPhase,
        consoKg: Math.round(totalKg),
        coutFCFA: Math.round(totalKg * prixKg)
      });

      // La date de fin devient la date de début de la suivante
      currentRefDate = endDate;
    }
  });

  return reports;
}

/**
 * Génère le rapport ROI complet pour une bande
 */
export function genererRapportFinancierBande(
  bande: BandePorcelets,
  historique: TransitionBande[],
  poidsActuelOuSortieKg: number
): BandeROIEstimate {
  const phases = calculerRapportPhases(bande, historique);
  const nbPorcs = bande.vivants ?? 0;
  const config = FARM_CONFIG.FINANCE_CONFIG;

  const coutAlimentaireEstime = phases.reduce((acc, p) => acc + p.coutFCFA, 0);
  const coutFixeEstime = nbPorcs * config.COUTS_FIXES_PAR_PORC;
  const coutTotalEstime = coutAlimentaireEstime + coutFixeEstime;

  const revenuBrutProjete = poidsActuelOuSortieKg * nbPorcs * config.PRIX_VENTE_PORC_KG;
  const margeNetteProjetee = revenuBrutProjete - coutTotalEstime;

  const roiPct = coutTotalEstime > 0 ? (margeNetteProjetee / coutTotalEstime) * 100 : 0;

  let statutRentabilite: BandeROIEstimate['statutRentabilite'] = 'CORRECT';
  if (margeNetteProjetee < 0) statutRentabilite = 'DEFICITAIRE';
  else if (roiPct > 25) statutRentabilite = 'EXCELLENT';

  return {
    coutAlimentaireEstime,
    coutFixeEstime,
    coutTotalEstime,
    revenuBrutProjete,
    margeNetteProjetee,
    roiPct: Math.round(roiPct),
    statutRentabilite
  };
}

/**
 * Consolide les données financières de toutes les bandes actives
 */
export function genererRapportGlobal(
  bandes: BandePorcelets[],
  historique: TransitionBande[]
) {
  const today = new Date();

  // Heuristique de poids actuel par défaut pour les bandes actives
  const estimateWeight = (b: BandePorcelets) => {
    const sevDate = b.dateSevrageReelle || b.dateSevragePrevue;
    if (!sevDate) return 5;
    const parts = sevDate.split('/');
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    const days = Math.floor((today.getTime() - d.getTime()) / 86400000);
    return Math.min(25 + days * 0.65, 110);
  };

  const reports = bandes
    .filter(b => (b.vivants ?? 0) > 0 && !/vendu|archiv/i.test(b.statut || ''))
    .map(b => ({
      bande: b,
      report: genererRapportFinancierBande(b, historique, estimateWeight(b))
    }));

  const totalRevenuProjete = reports.reduce((acc, r) => acc + r.report.revenuBrutProjete, 0);
  const totalCoutAlimentaire = reports.reduce((acc, r) => acc + r.report.coutAlimentaireEstime, 0);
  const totalCoutFixe = reports.reduce((acc, r) => acc + r.report.coutFixeEstime, 0);
  const totalCout = totalCoutAlimentaire + totalCoutFixe;
  const margeGlobaleEstimee = totalRevenuProjete - totalCout;

  const totalNV = bandes.reduce((acc, b) => acc + (b.nv ?? 0), 0);
  const totalMorts = bandes.reduce((acc, b) => acc + (b.morts ?? 0), 0);
  const tauxMortaliteMoyen = totalNV > 0 ? (totalMorts / totalNV) * 100 : 0;

  // Top / Flop
  const sortedByROI = [...reports].sort((a, b) => b.report.roiPct - a.report.roiPct);

  return {
    totalRevenuProjete,
    totalCoutAlimentaire,
    totalCoutFixe,
    totalCout,
    margeGlobaleEstimee,
    tauxMortaliteMoyen,
    topBande: sortedByROI[0],
    flopBande: sortedByROI[sortedByROI.length - 1]
  };
}
