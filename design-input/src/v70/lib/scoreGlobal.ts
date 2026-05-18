/**
 * V75-o B.2 (F-31) — Score global troupeau (Vue Performance).
 *
 * Synthétise 4 KPIs en un grade A/B/C/D actionnable. Avant : 4 chiffres en
 * silos sans synthèse → testeur ne savait pas si "globalement OK ou non".
 *
 * Pondération (somme = 100) :
 *  - ISSE (sevrés/truie/an)        50 % — repère métier #1
 *  - Taux MB (saillies → MB)       30 % — fiabilité reproduction
 *  - NV moyen (nés vivants)        10 % — productivité immédiate
 *  - Mortalité naiss.→sevrage      10 % — qualité maternité (inversé)
 *
 * Grades :
 *  - score ≥ 80 → A (Excellent)
 *  - 60-80      → B (Bon)
 *  - 40-60      → C (À améliorer)
 *  - < 40       → D (Critique)
 *
 * Si < 5 cycles clos : grade EN_CONSTRUCTION (données insuffisantes pour
 * fiabiliser le score). Évite de noter "D critique" un éleveur en démarrage.
 */
import type { GlobalKpis } from '../../services/perfKpiAnalyzer';
import type { FarmProfile } from '../../lib/farmProfile';

export type ScoreLevel = 'A' | 'B' | 'C' | 'D' | 'EN_CONSTRUCTION';

export interface ScoreGlobal {
  /** Score normalisé sur 100. 0 si EN_CONSTRUCTION. */
  score: number;
  level: ScoreLevel;
  /** Libellé prêt à afficher (ex: "Score 72 — Bon"). */
  label: string;
  /** Sous-titre explicatif (méthodologie ou progression). */
  detail: string;
}

const SEUIL_CYCLES_MIN = 5;
/**
 * Seuil minimal de portées historiques pour considérer qu'il existe au moins
 * un cycle complet (saillie → sevrage). Sous ce seuil OU si l'ISSE annualisée
 * est nulle, on reste en EN_CONSTRUCTION : éviter qu'une ferme en démarrage
 * voie un "D Critique 19/100" alors qu'aucun sevrage n'a encore eu lieu.
 */
const SEUIL_PORTEES_HISTORIQUES = 3;

/** Mappe une valeur observée vs cible et tolérance vers un score 0-100. */
function scoreFromTarget(value: number | null, target: number, tolerance: number): number {
  if (value === null || !Number.isFinite(value)) return 0;
  // Plus on est au-dessus de target, mieux c'est ; perte progressive sous target.
  if (value >= target) return 100;
  const ratio = Math.max(0, (value - (target - tolerance)) / tolerance);
  return Math.round(Math.max(0, Math.min(100, ratio * 100)));
}

/** Mortalité : plus c'est bas, mieux c'est. cible 5%, tolérance 15%. */
function scoreFromMortalite(pct: number | null): number {
  if (pct === null || !Number.isFinite(pct)) return 0;
  if (pct <= 5) return 100;
  if (pct >= 20) return 0;
  return Math.round(((20 - pct) / 15) * 100);
}

function levelFromScore(score: number): ScoreLevel {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function levelLabel(level: ScoreLevel): string {
  switch (level) {
    case 'A':
      return 'Excellent';
    case 'B':
      return 'Bon';
    case 'C':
      return 'À améliorer';
    case 'D':
      return 'Critique';
    case 'EN_CONSTRUCTION':
      return 'En construction';
  }
}

export function computeScoreGlobal(
  kpis: GlobalKpis | null | undefined,
  profil: FarmProfile = 'cycle_complet',
): ScoreGlobal {
  if (!kpis) {
    return {
      score: 0,
      level: 'EN_CONSTRUCTION',
      label: 'En construction',
      detail: 'Données insuffisantes',
    };
  }

  // V80 — Engraisseur : pas de KPIs ISSE/TauxMB pertinents. Tant que A5
  // n'a pas livré GMQ/IC live, on affiche EN_CONSTRUCTION (placeholder).
  if (profil === 'engraisseur') {
    return {
      score: 0,
      level: 'EN_CONSTRUCTION',
      label: 'En construction',
      detail: 'Module Engraissement à venir (GMQ / IC)',
    };
  }

  const cyclesClos = kpis.nbPortees12m ?? 0;
  const isseAnnuel = kpis.sevresParTruieAn ?? 0;
  // ISSE = 0 ou trop peu de portées historiques → empty state explicite,
  // pas de note D Critique sur une ferme qui n'a pas encore eu de sevrage.
  if (
    cyclesClos < SEUIL_CYCLES_MIN ||
    isseAnnuel === 0 ||
    cyclesClos < SEUIL_PORTEES_HISTORIQUES
  ) {
    const seuilAffiche = Math.max(SEUIL_CYCLES_MIN, SEUIL_PORTEES_HISTORIQUES);
    return {
      score: 0,
      level: 'EN_CONSTRUCTION',
      label: 'En construction',
      detail:
        isseAnnuel === 0
          ? 'En attente du 1er sevrage complet'
          : `${cyclesClos}/${seuilAffiche} cycles nécessaires`,
    };
  }

  // ISSE : cible 12, tolérance 4 (donc 8 = 0%, 12 = 100%).
  const sIsse = scoreFromTarget(kpis.sevresParTruieAn ?? 0, 12, 4);
  // Taux MB : cible 88%, tolérance 18% (70% = 0, 88% = 100%).
  const sTauxMB = scoreFromTarget(kpis.tauxMBPct ?? 0, 88, 18);
  // NV/portée : cible 13, tolérance 4 (9 = 0%, 13 = 100%).
  const sNV = scoreFromTarget(kpis.moyNV ?? 0, 13, 4);
  // Mortalité naiss→sevrage (inversé).
  const sMort = scoreFromMortalite(kpis.tauxMortaliteNaissanceSevrage ?? null);

  const score = Math.round(sIsse * 0.5 + sTauxMB * 0.3 + sNV * 0.1 + sMort * 0.1);
  const level = levelFromScore(score);

  return {
    score,
    level,
    label: `${score}/100 — ${levelLabel(level)}`,
    detail: `ISSE 50% · Taux MB 30% · NV 10% · Mortalité 10% · ${cyclesClos} cycles`,
  };
}

export function levelLabelOf(level: ScoreLevel): string {
  return levelLabel(level);
}
