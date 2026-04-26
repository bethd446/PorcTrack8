/**
 * performanceAnalyzer.ts — Moteur d'analyse génétique et aide à la décision
 */

import type { BandePorcelets, PerformanceTier, Saillie, Truie, TruiePerformance, Verrat } from '../types/farm';
import type {
  TruiePerformanceReport,
  ScoreProlificite,
  DecisionReforme
} from '../types/performance.types';

// ─── Helpers de Date ─────────────────────────────────────────────────────────

function parseFrDate(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(+fr[3], +fr[2] - 1, +fr[1]);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return null;
}

function diffDays(d1: Date, d2: Date): number {
  return Math.round(Math.abs(d2.getTime() - d1.getTime()) / 86400000);
}

// ─── Logique Pure ────────────────────────────────────────────────────────────

/**
 * Calcule le score basé sur la prolificité moyenne (Nés Vivants)
 */
export function calculerScoreProlificite(portees: BandePorcelets[]): ScoreProlificite {
  if (portees.length === 0) return 'STANDARD';

  const nésVivants = portees.map(p => p.nv ?? 0);
  const moyenne = nésVivants.reduce((a, b) => a + b, 0) / nésVivants.length;

  if (moyenne > 12) return 'ELITE';
  if (moyenne >= 9) return 'STANDARD';
  return 'SOUS_PERF';
}

/**
 * Analyse si les performances sont en baisse sur les 3 dernières portées
 */
export function analyserTendanceCarriere(portees: BandePorcelets[]): boolean {
  if (portees.length < 3) return false;

  // Tri par date de mise-bas (plus récente en dernier pour l'ordre temporel)
  const sorted = [...portees].sort((a, b) => {
    const da = parseFrDate(a.dateMB)?.getTime() || 0;
    const db = parseFrDate(b.dateMB)?.getTime() || 0;
    return da - db;
  });

  const last3 = sorted.slice(-3);
  // NV : P1 > P2 > P3
  return (last3[0].nv ?? 0) > (last3[1].nv ?? 0) && (last3[1].nv ?? 0) > (last3[2].nv ?? 0);
}

/**
 * Calcule l'Intervalle Sevrage-Saillie moyen
 */
export function calculerISSEMoyen(portees: BandePorcelets[], saillies: Saillie[]): number | null {
  const isses: number[] = [];

  portees.forEach(p => {
    if (!p.dateSevrageReelle) return;
    const dSevrage = parseFrDate(p.dateSevrageReelle);
    if (!dSevrage) return;

    // Trouver la première saillie après ce sevrage
    const sSuivante = saillies
      .map(s => ({ ...s, date: parseFrDate(s.dateSaillie) }))
      .filter(s => s.date && s.date > dSevrage)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())[0];

    if (sSuivante && sSuivante.date) {
      isses.push(diffDays(dSevrage, sSuivante.date));
    }
  });

  if (isses.length === 0) return null;
  return Math.round(isses.reduce((a, b) => a + b, 0) / isses.length);
}

/**
 * Calcule le taux de survie global (Naissance -> Sevrage)
 */
export function calculerSurvieGlobale(portees: BandePorcelets[]): number {
  const totalNV = portees.reduce((acc, p) => acc + (p.nv ?? 0), 0);
  const totalVivants = portees.reduce((acc, p) => acc + (p.vivants ?? 0), 0);

  if (totalNV === 0) return 100;
  return Math.round((totalVivants / totalNV) * 100);
}

// ─── Fonction Principale Consolidée ──────────────────────────────────────────

/**
 * Génère une fiche de mérite complète pour une truie
 */
export function genererFicheMerite(
  truie: Truie,
  portees: BandePorcelets[],
  saillies: Saillie[]
): TruiePerformanceReport {
  const score = calculerScoreProlificite(portees);
  const isDeclining = analyserTendanceCarriere(portees);
  const isse = calculerISSEMoyen(portees, saillies);
  const survie = calculerSurvieGlobale(portees);

  let decision: DecisionReforme = 'GARDER';
  let verdictBio = '';

  // Logique de décision et verdict
  if (isDeclining) {
    decision = 'REFORMER';
    verdictBio = 'Baisse de performance détectée sur 3 cycles consécutifs. Recommandation : Réforme après sevrage.';
  } else if (score === 'SOUS_PERF') {
    decision = 'REFORMER';
    verdictBio = 'Prolificité trop faible (< 9 NV). Truie non rentable.';
  } else if (isse !== null && isse > 10) {
    decision = 'A_SURVEILLER';
    verdictBio = `Retour en chaleur tardif (ISSE: ${isse}j). Surveiller le prochain cycle.`;
  } else if (score === 'ELITE') {
    decision = 'GARDER';
    verdictBio = `Truie exceptionnelle (Élite). ${isse ? `ISSE excellent (${isse}j).` : ''} À conserver prioritairement.`;
  } else {
    decision = 'GARDER';
    verdictBio = 'Performances stables. Truie productive.';
  }

  // Cas cochette (pas encore de portée)
  if (portees.length === 0) {
    verdictBio = 'Jeune truie (Cochette). En attente de ses premières performances.';
    decision = 'GARDER';
  }

  return {
    score,
    isseMoyen: isse,
    tauxSurvieGlobal: survie,
    isDeclining,
    verdictBio,
    decision
  };
}

/** Trouve les portées d'une truie (par ID ou boucle). */
export function findPorteesForTruie(truie: Truie, bandes: BandePorcelets[]): BandePorcelets[] {
  return bandes.filter(b =>
    b.truie === truie.id || (!!truie.boucle && b.boucleMere === truie.boucle)
  );
}

/** Mappe un score composite (0-100) vers un PerformanceTier. */
export function scoreToTier(score: number): PerformanceTier {
  if (score >= 85) return 'ELITE';
  if (score >= 70) return 'BON';
  if (score >= 55) return 'MOYEN';
  if (score >= 40) return 'FAIBLE';
  return 'INSUFFISANT';
}

/** Calcule la performance brute d'une truie. */
export function computeTruiePerformance(
  truie: Truie,
  bandes: BandePorcelets[],
  saillies: Saillie[]
): TruiePerformance {
  const portees = findPorteesForTruie(truie, bandes);
  const nbPortees = portees.length;

  if (nbPortees === 0) {
    return {
      nbPortees: 0, nbPorteesAvecMB: 0, moyNV: 0, moyMortsParPortee: 0,
      tauxSurvieNaissance: 0, tauxSevrage: 0,
      nbSaillies: 0, nbSailliesReussies: 0, tauxFertilite: 0,
      scoreCompetence: 0, tier: 'INSUFFISANT',
    };
  }

  const nbPorteesAvecMB = portees.filter(p => !!p.dateMB).length;
  const totalNV = portees.reduce((acc, p) => acc + (p.nv ?? 0), 0);
  const totalVivants = portees.reduce((acc, p) => acc + (p.vivants ?? 0), 0);
  const totalMorts = portees.reduce((acc, p) => acc + (p.morts ?? 0), 0);

  const moyNV = totalNV / nbPortees;
  const moyMortsParPortee = totalMorts / nbPortees;
  const tauxSurvieNaissance = totalNV > 0 ? (totalVivants / totalNV) * 100 : 0;
  const tauxSevrage = totalNV > 0 ? (totalVivants / totalNV) * 100 : 0;

  const myTruieSaillies = saillies.filter(
    s => s.truieId === truie.id || s.truieId === truie.displayId
  );
  const nbSaillies = myTruieSaillies.length;
  const nbSailliesReussies = nbPortees;
  const tauxFertilite = nbSaillies > 0
    ? Math.min(100, Math.round((nbSailliesReussies / nbSaillies) * 100))
    : 0;

  const mbDates = portees.map(p => p.dateMB).filter(Boolean).sort().reverse();
  const dernierMBDate = mbDates[0];

  // Score composite 0-100
  const scoreNV = Math.min(100, (moyNV / 14) * 100);
  const scoreCompetence = Math.round(scoreNV * 0.4 + tauxSurvieNaissance * 0.4 + tauxFertilite * 0.2);

  return {
    nbPortees, nbPorteesAvecMB, moyNV, moyMortsParPortee,
    tauxSurvieNaissance, tauxSevrage,
    nbSaillies, nbSailliesReussies, tauxFertilite,
    dernierMBDate,
    scoreCompetence,
    tier: scoreToTier(scoreCompetence),
  };
}

/** Trouve les portées issues des saillies d'un verrat (par truieId + dateMBPrevue ±5j). */
export function findPorteesForVerrat(
  verrat: Verrat,
  saillies: Saillie[],
  bandes: BandePorcelets[],
): BandePorcelets[] {
  const vSaillies = saillies.filter(
    s => s.verratId === verrat.id || s.verratId === verrat.displayId,
  );
  const found = new Map<string, BandePorcelets>();

  for (const s of vSaillies) {
    const prevDate = parseSaillieDate(s.dateMBPrevue);
    if (!prevDate) continue;

    for (const b of bandes) {
      if (b.truie !== s.truieId) continue;
      const mbDate = parseSaillieDate(b.dateMB);
      if (!mbDate) continue;
      const delta = Math.abs((mbDate.getTime() - prevDate.getTime()) / 86_400_000);
      if (delta <= 5) found.set(b.id, b);
    }
  }
  return [...found.values()];
}

// ─── VerratPerformance ────────────────────────────────────────────────────────

export interface VerratPerformance {
  nbSaillies: number;
  tauxSuccesSaillie: number;   // %
  nbPorteesEngendrees: number;
  moyNVEngendrees: number;
  scoreFertilite: number;      // 0-100
  tier: PerformanceTier;
}

/**
 * Calcule la performance d'un verrat à partir de son historique de saillies
 * et des portées qui en ont résulté (même truie, mise-bas dans les 120j).
 */
export function computeVerratPerformance(
  verrat: Verrat,
  bandes: BandePorcelets[],
  saillies: Saillie[],
  _truies: Truie[],
): VerratPerformance {
  const vSaillies = saillies.filter(
    (s) => s.verratId === verrat.id || s.verratId === verrat.displayId,
  );

  const nbSaillies = vSaillies.length;
  if (nbSaillies === 0) {
    return { nbSaillies: 0, tauxSuccesSaillie: 0, nbPorteesEngendrees: 0, moyNVEngendrees: 0, scoreFertilite: 0, tier: 'INSUFFISANT' };
  }

  // Associe chaque saillie à une portée via truieId + dateMBPrevue ±5j
  let porteesTrouvees = 0;
  let totalNV = 0;

  for (const s of vSaillies) {
    const prevDate = parseSaillieDate(s.dateMBPrevue);
    if (!prevDate) continue;

    const portee = bandes.find((b) => {
      if (b.truie !== s.truieId) return false;
      const mbDate = parseSaillieDate(b.dateMB);
      if (!mbDate) return false;
      const delta = Math.abs((mbDate.getTime() - prevDate.getTime()) / 86_400_000);
      return delta <= 5;
    });

    if (portee) {
      porteesTrouvees++;
      totalNV += portee.nv ?? 0;
    }
  }

  const tauxSucces = Math.round((porteesTrouvees / nbSaillies) * 100);
  const moyNV = porteesTrouvees > 0 ? totalNV / porteesTrouvees : 0;
  const score = Math.round(tauxSucces * 0.6 + Math.min((moyNV / 14) * 100, 100) * 0.4);

  return {
    nbSaillies,
    tauxSuccesSaillie: tauxSucces,
    nbPorteesEngendrees: porteesTrouvees,
    moyNVEngendrees: Math.round(moyNV * 10) / 10,
    scoreFertilite: score,
    tier: scoreToTier(score),
  };
}

function parseSaillieDate(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(+fr[3], +fr[2] - 1, +fr[1]);
  const iso = Date.parse(s);
  return Number.isNaN(iso) ? null : new Date(iso);
}
