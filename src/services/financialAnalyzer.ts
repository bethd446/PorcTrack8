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
      const consoJ = (config.CONSO_MOYENNE_J as any)[feed] || 0;
      const prixKg = (config.COUT_ALIMENT_KG as any)[feed] || 0;

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
