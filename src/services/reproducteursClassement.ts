/**
 * reproducteursClassement — Classement unifié truies + verrats.
 * ────────────────────────────────────────────────────────────────────────────
 * Pure functions, zéro I/O, zéro dépendance React. Sert la page "Classement
 * reproducteurs" (Sprint V23-S3) en agrégeant deux sources :
 *   • Truies : `rankTruiesByPerformance` (existant, perfKpiAnalyzer)
 *   • Verrats : nouveau ranking (basé sur saillies + bandes)
 *
 * Toutes les dates en entrée respectent le format dd/MM/yyyy.
 */
import type { Truie, Verrat, Saillie, BandePorcelets } from '../types/farm';
import {
  computeTruiePerformance,
} from './performanceAnalyzer';
import {
  rankTruiesByPerformance,
  type TruieRanking,
} from './perfKpiAnalyzer';
import { safeDate } from '../lib/truieHelpers';

// ─── Helpers internes ────────────────────────────────────────────────────────

/** Parse une date (ISO yyyy-MM-dd ou FR dd/MM/yyyy) → timestamp. 0 si invalide. */
function parseFr(s?: string | null): number {
  const d = safeDate(s);
  return d ? d.getTime() : 0;
}

/** Tier business à partir d'un score 0-100. */
function scoreToTier(
  score: number,
): 'ELITE' | 'BON' | 'MOYEN' | 'FAIBLE' | 'INSUFFISANT' {
  if (score >= 80) return 'ELITE';
  if (score >= 60) return 'BON';
  if (score >= 40) return 'MOYEN';
  if (score >= 20) return 'FAIBLE';
  return 'INSUFFISANT';
}

// ─── Constantes métier ──────────────────────────────────────────────────────

/** Durée moyenne de gestation en jours (saillie → mise-bas). */
const GESTATION_JOURS = 115;

/** Tolérance ± autour de la fenêtre saillie + GESTATION pour matcher une bande. */
const FENETRE_MB_JOURS = 10;

/** Seuil minimal de saillies pour que le verrat puisse être classé "flop". */
const MIN_SAILLIES_FLOP = 3;

/** Cible biologique de prolificité (NV moyens) — sature le score à ce niveau. */
const CIBLE_PROLIFICITE_NV = 14;

// ─── Types publics ───────────────────────────────────────────────────────────

/** Performance verrat — basée sur saillies réussies. */
export interface VerratPerformance {
  verrat: Verrat;
  /** Nombre total de saillies effectuées. */
  nbSaillies: number;
  /** Nombre de saillies confirmées (qui ont mené à une mise-bas). */
  nbSailliesReussies: number;
  /** Taux de réussite % (0-100). */
  tauxReussitePct: number;
  /** Moyenne porcelets nés vivants par mise-bas issue de ses saillies. */
  porceletsVivantsMoyenne: number;
  /** Score composite 0-100 = 60% taux réussite + 40% prolificité (rapportée à 14 cible). */
  scoreCompetence: number;
  /** Tier selon le score : ELITE ≥80, BON ≥60, MOYEN ≥40, FAIBLE ≥20, INSUFFISANT <20. */
  tier: 'ELITE' | 'BON' | 'MOYEN' | 'FAIBLE' | 'INSUFFISANT';
}

export interface VerratRanking {
  verrat: Verrat;
  performance: VerratPerformance;
}

/** Critère de tri pour la page UI. */
export type ClassementSortBy =
  | 'score'
  | 'tauxReussite'
  | 'nbPortees'
  | 'porceletsMoyens';

export interface ClassementRow {
  type: 'TRUIE' | 'VERRAT';
  /** Pour affichage. */
  id: string;
  displayId: string;
  /** Score composite 0-100. */
  score: number;
  /** Tier business. */
  tier: 'ELITE' | 'BON' | 'MOYEN' | 'FAIBLE' | 'INSUFFISANT';
  /** Métriques principales pour la table. */
  nbPortees: number;
  porceletsMoyens: number;
  tauxReussite: number; //  %
  /** Pour navigation détail. */
  href: string;
}

// ─── computeVerratPerformance ────────────────────────────────────────────────

/**
 * Calcule la performance d'un verrat depuis ses saillies + bandes liées.
 *
 * Une saillie est "réussie" s'il existe une bande dont :
 *   • `truie` (boucle/id) correspond à `saillie.truieId`
 *   • `dateMB` ≈ `saillie.dateSaillie` + 115j ± 10j
 *
 * Les saillies sans `dateSaillie` parseable sont ignorées (warn console).
 */
export function computeVerratPerformance(
  verrat: Verrat,
  bandes: BandePorcelets[],
  saillies: Saillie[],
): VerratPerformance {
  const vSaillies = saillies.filter(
    s => s.verratId === verrat.id || s.verratId === verrat.displayId,
  );

  let nbSaillies = 0;
  let nbReussies = 0;
  let totalNV = 0;
  // Une bande ne peut compter qu'une fois (évite double-match si un verrat
  // a saillé la même truie à plusieurs reprises dans une fenêtre proche).
  const bandesConsommees = new Set<string>();

  for (const s of vSaillies) {
    const tsSaillie = parseFr(s.dateSaillie);
    if (tsSaillie === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[reproducteursClassement] Saillie ignorée — dateSaillie non parseable (verrat ${verrat.id})`,
        s.dateSaillie,
      );
      continue;
    }
    nbSaillies += 1;

    const tsAttenduMin =
      tsSaillie + (GESTATION_JOURS - FENETRE_MB_JOURS) * 86_400_000;
    const tsAttenduMax =
      tsSaillie + (GESTATION_JOURS + FENETRE_MB_JOURS) * 86_400_000;

    // On cherche une bande de la même truie dans la fenêtre, non encore consommée.
    // Match truie : la bande référence la truie soit par id soit par boucle.
    // Les comparaisons ignorent les undefined/empty pour éviter les faux-match
    // (ex: deux bandes sans boucleMere ne matchent PAS une saillie sans truieBoucle).
    const sTruieId = s.truieId || '';
    const sTruieBoucle = s.truieBoucle || '';
    const portee = bandes.find(b => {
      if (bandesConsommees.has(b.id)) return false;
      const bTruie = b.truie || '';
      const bBoucleMere = b.boucleMere || '';
      const truieMatch =
        (!!sTruieId && bTruie === sTruieId) ||
        (!!sTruieBoucle && bTruie === sTruieBoucle) ||
        (!!sTruieBoucle && bBoucleMere === sTruieBoucle) ||
        (!!sTruieId && bBoucleMere === sTruieId);
      if (!truieMatch) return false;
      const tsMB = parseFr(b.dateMB);
      if (tsMB === 0) return false;
      return tsMB >= tsAttenduMin && tsMB <= tsAttenduMax;
    });

    if (portee) {
      nbReussies += 1;
      totalNV += portee.nv ?? 0;
      bandesConsommees.add(portee.id);
    }
  }

  const tauxReussiteFraction = nbSaillies === 0 ? 0 : nbReussies / nbSaillies;
  const tauxReussitePct = Math.round(tauxReussiteFraction * 100);
  const porceletsVivantsMoyenne =
    nbReussies === 0 ? 0 : Math.round((totalNV / nbReussies) * 10) / 10;
  const prolificiteFraction = Math.min(
    1,
    porceletsVivantsMoyenne / CIBLE_PROLIFICITE_NV,
  );
  const scoreCompetence = Math.round(
    (tauxReussiteFraction * 0.6 + prolificiteFraction * 0.4) * 100,
  );

  return {
    verrat,
    nbSaillies,
    nbSailliesReussies: nbReussies,
    tauxReussitePct,
    porceletsVivantsMoyenne,
    scoreCompetence,
    tier: scoreToTier(scoreCompetence),
  };
}

// ─── rankVerratsByPerformance ────────────────────────────────────────────────

/**
 * Top 3 / flop 3 verrats par score composite.
 *
 *   • top  : tier ELITE ou BON, tri score desc, limite 3
 *   • flop : tier FAIBLE ou INSUFFISANT AVEC nbSaillies ≥ 3
 *            (un verrat fraîchement introduit ne peut pas être classé flop),
 *            tri score asc, limite 3.
 */
export function rankVerratsByPerformance(
  verrats: Verrat[],
  bandes: BandePorcelets[],
  saillies: Saillie[],
): { top: VerratRanking[]; flop: VerratRanking[] } {
  const rankings: VerratRanking[] = verrats.map(v => ({
    verrat: v,
    performance: computeVerratPerformance(v, bandes, saillies),
  }));

  const top = rankings
    .filter(r => r.performance.tier === 'ELITE' || r.performance.tier === 'BON')
    .sort((a, b) => b.performance.scoreCompetence - a.performance.scoreCompetence)
    .slice(0, 3);

  const flop = rankings
    .filter(
      r =>
        (r.performance.tier === 'FAIBLE' ||
          r.performance.tier === 'INSUFFISANT') &&
        r.performance.nbSaillies >= MIN_SAILLIES_FLOP,
    )
    .sort((a, b) => a.performance.scoreCompetence - b.performance.scoreCompetence)
    .slice(0, 3);

  return { top, flop };
}

// ─── buildClassementRows ─────────────────────────────────────────────────────

/** Construit la ClassementRow d'une truie. */
function truieRowFromRanking(r: TruieRanking): ClassementRow {
  return {
    type: 'TRUIE',
    id: r.truie.id,
    displayId: r.truie.displayId || r.truie.id,
    score: r.performance.scoreCompetence,
    tier: r.performance.tier,
    nbPortees: r.performance.nbPortees,
    porceletsMoyens: Math.round(r.performance.moyNV * 10) / 10,
    tauxReussite: Math.round(r.performance.tauxFertilite),
    href: `/troupeau/truies/${r.truie.id}`,
  };
}

/** Construit la ClassementRow d'un verrat. */
function verratRowFromPerf(perf: VerratPerformance): ClassementRow {
  return {
    type: 'VERRAT',
    id: perf.verrat.id,
    displayId: perf.verrat.displayId || perf.verrat.id,
    score: perf.scoreCompetence,
    tier: perf.tier,
    nbPortees: perf.nbSailliesReussies,
    porceletsMoyens: perf.porceletsVivantsMoyenne,
    tauxReussite: perf.tauxReussitePct,
    href: `/troupeau/verrats/${perf.verrat.id}`,
  };
}

/** Comparateur descendant pour un champ numérique du row. */
function descBy(field: keyof ClassementRow): (a: ClassementRow, b: ClassementRow) => number {
  return (a, b) => {
    const av = a[field] as number;
    const bv = b[field] as number;
    return bv - av;
  };
}

/**
 * Construit la liste unifiée triée pour la table UI.
 * Inclut TOUS les reproducteurs (top + middle + flop), pas seulement top/flop.
 * Tri par défaut : score desc.
 */
export function buildClassementRows(args: {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  saillies: Saillie[];
  /** Filtre 'TRUIE' | 'VERRAT' | 'TOUS'. */
  filter: 'TRUIE' | 'VERRAT' | 'TOUS';
  sortBy: ClassementSortBy;
}): ClassementRow[] {
  const { truies, verrats, bandes, saillies, filter, sortBy } = args;

  const rows: ClassementRow[] = [];

  if (filter === 'TRUIE' || filter === 'TOUS') {
    for (const t of truies) {
      const perf = computeTruiePerformance(t, bandes, saillies);
      rows.push(
        truieRowFromRanking({ truie: t, performance: perf }),
      );
    }
  }

  if (filter === 'VERRAT' || filter === 'TOUS') {
    for (const v of verrats) {
      const perf = computeVerratPerformance(v, bandes, saillies);
      rows.push(verratRowFromPerf(perf));
    }
  }

  switch (sortBy) {
    case 'tauxReussite':
      rows.sort(descBy('tauxReussite'));
      break;
    case 'nbPortees':
      rows.sort(descBy('nbPortees'));
      break;
    case 'porceletsMoyens':
      rows.sort(descBy('porceletsMoyens'));
      break;
    case 'score':
    default:
      rows.sort(descBy('score'));
      break;
  }

  return rows;
}

// Réexport pour confort des consommateurs (UI page classement).
export { rankTruiesByPerformance };
export type { TruieRanking };
