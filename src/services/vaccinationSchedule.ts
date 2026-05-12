/**
 * vaccinationSchedule — Calendrier vaccinal porcin standard
 * ────────────────────────────────────────────────────────────────────────────
 * Référentiel des vaccinations recommandées en élevage porcin tropical
 * (Côte d'Ivoire, contexte K13). Le calendrier dépend du STADE (truie /
 * verrat / porcelet) et de l'ÂGE (jours depuis naissance).
 *
 * Source : protocoles standards adaptés du référentiel vétérinaire
 * IFIP/CEVA pour l'Afrique de l'Ouest (parvovirose, rouget, circovirus
 * PCV2, mycoplasma, peste classique).
 *
 * MVP v3.6.0 : module isolé, pure functions. Branchement notif J-1 +
 * décrément stock pharmacie laissé pour v3.6.x.
 */

export type VaccinationStage = 'porcelet' | 'truie' | 'verrat';

export interface VaccinationProtocol {
  id: string;
  /** Nom du vaccin / antigène. */
  vaccin: string;
  /** Maladie ciblée. */
  cible: string;
  /** Stade animal concerné. */
  stage: VaccinationStage;
  /** Âge en jours depuis naissance (pour porcelet) ou jours post-événement.  */
  jourDose1: number;
  /** Rappel optionnel (jours après la dose 1). */
  rappelJ?: number;
  /** Note métier (durée immunité, particularités). */
  note?: string;
  /** Priorité critique (PPC, parvo, rouget) vs informative (PCV2 optionnel). */
  critical: boolean;
}

/** Protocoles vaccinaux standard pour élevage tropical. */
export const VACCINATION_PROTOCOLS: ReadonlyArray<VaccinationProtocol> = [
  // ── Porcelets (programme classique post-sevrage) ──
  {
    id: 'porc-fer-j3',
    vaccin: 'Fer Dextran (Hématoge)',
    cible: 'Anémie ferriprive',
    stage: 'porcelet',
    jourDose1: 3,
    note: 'Injection IM ferreuse à J3. 2 mL/porcelet. Cruciale en tropical (mère pauvre en fer).',
    critical: true,
  },
  {
    id: 'porc-vermifuge-j21',
    vaccin: 'Vermifuge (Ivermectine)',
    cible: 'Vers ronds + gale',
    stage: 'porcelet',
    jourDose1: 21,
    rappelJ: 90,
    note: 'Renouveler entrée en croissance.',
    critical: true,
  },
  {
    id: 'porc-pcv2-j28',
    vaccin: 'Circovac (PCV2)',
    cible: 'Circovirus PCV2',
    stage: 'porcelet',
    jourDose1: 28,
    note: 'Sevrage = stress, vaccination optimale.',
    critical: false,
  },
  {
    id: 'porc-myco-j35',
    vaccin: 'Mycoflex (Mycoplasma)',
    cible: 'Pneumonie enzootique',
    stage: 'porcelet',
    jourDose1: 35,
    note: 'Cruciale en climat humide CI.',
    critical: true,
  },
  {
    id: 'porc-ppc-j60',
    vaccin: 'Pestiffa (Peste Porcine Classique)',
    cible: 'PPC (distinct PPA)',
    stage: 'porcelet',
    jourDose1: 60,
    rappelJ: 180,
    note: 'Vaccin disponible (différent PPA pour laquelle aucun vaccin).',
    critical: true,
  },
  // ── Truies (cycle reproductif) ──
  {
    id: 'truie-parvo-pre-saillie',
    vaccin: 'Parvovac + Rouget',
    cible: 'Parvovirose + Rouget',
    stage: 'truie',
    jourDose1: -21, // 21 jours avant la saillie
    rappelJ: 154, // 21 jours avant saillie suivante (cycle ~175j)
    note: 'À chaque cycle : primo-vacc en quarantaine, puis rappel avant chaque saillie.',
    critical: true,
  },
  {
    id: 'truie-circo-pre-mb',
    vaccin: 'Circovac (PCV2)',
    cible: 'Circovirus (transmission verticale)',
    stage: 'truie',
    jourDose1: 100, // J100 de gestation
    note: 'Protège porcelets via colostrum.',
    critical: false,
  },
  // ── Verrats (protocole simplifié) ──
  {
    id: 'verrat-parvo-rouget-annuel',
    vaccin: 'Parvovac + Rouget',
    cible: 'Parvovirose + Rouget',
    stage: 'verrat',
    jourDose1: 0,
    rappelJ: 180, // rappel semestriel
    note: 'Vaccination semestrielle pour fertilité optimale.',
    critical: true,
  },
];

export interface VaccinationDose {
  /** ID de l'animal concerné. */
  animalId: string;
  /** Affichage user (boucle ou displayId). */
  animalLabel: string;
  /** Protocole de référence. */
  protocol: VaccinationProtocol;
  /** Date où la dose est prévue. */
  dueDate: Date;
  /** Nombre de jours jusqu'à la dose (négatif = en retard). */
  daysUntil: number;
  /** Type de dose (primovaccination ou rappel). */
  doseType: 'primo' | 'rappel';
}

/**
 * Calcule la prochaine dose vaccinale prévue pour un animal donné.
 * @param naissance Date de naissance (pour porcelets) OU date de référence
 *                   pour truies/verrats (date d'entrée en cycle).
 * @param stage Stade animal.
 * @param today Date d'évaluation (par défaut maintenant).
 * @param protocols Optionnel : liste de protocoles à considérer (défaut : tous du stage).
 */
export function computeNextVaccinations(
  animalId: string,
  animalLabel: string,
  naissance: Date,
  stage: VaccinationStage,
  today: Date = new Date(),
  protocols: ReadonlyArray<VaccinationProtocol> = VACCINATION_PROTOCOLS,
): VaccinationDose[] {
  const doses: VaccinationDose[] = [];
  for (const p of protocols) {
    if (p.stage !== stage) continue;
    // Primo
    const primoDate = new Date(naissance.getTime() + p.jourDose1 * 24 * 60 * 60 * 1000);
    const daysToPrimo = Math.floor((primoDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (daysToPrimo >= -3 && daysToPrimo <= 60) {
      // Affichée si fenêtre raisonnable (-3 = peut faire encore, +60 = à anticiper).
      doses.push({
        animalId,
        animalLabel,
        protocol: p,
        dueDate: primoDate,
        daysUntil: daysToPrimo,
        doseType: 'primo',
      });
    }
    // Rappel
    if (p.rappelJ != null) {
      const rappelDate = new Date(primoDate.getTime() + p.rappelJ * 24 * 60 * 60 * 1000);
      const daysToRappel = Math.floor((rappelDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (daysToRappel >= -3 && daysToRappel <= 60) {
        doses.push({
          animalId,
          animalLabel,
          protocol: p,
          dueDate: rappelDate,
          daysUntil: daysToRappel,
          doseType: 'rappel',
        });
      }
    }
  }
  return doses.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Filtre les doses imminentes (dans les N prochains jours).
 */
export function dosesImminent(doses: VaccinationDose[], days = 7): VaccinationDose[] {
  return doses.filter(d => d.daysUntil >= -3 && d.daysUntil <= days);
}

/**
 * Format date FR pour affichage user (ex: "13/05").
 */
export function formatDoseDate(d: VaccinationDose): string {
  return d.dueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
