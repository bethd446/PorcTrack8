/**
 * performanceAnalyzer — calculs purs de performance (Truie / Verrat).
 * ─────────────────────────────────────────────────────────────────
 * Pas de dépendance React, pas d'I/O. 100 % stateless, 100 % testable.
 *
 * Les fonctions publiques :
 *   • `computeTruiePerformance`  — synthèse technique d'une truie
 *   • `computeVerratPerformance` — synthèse technique d'un verrat
 *
 * Les formules de score et les seuils de tier sont documentés dans chaque
 * fonction (voir JSDoc). Ils sont volontairement simples et explicables
 * au porcher — on préfère la transparence à une optimisation statistique.
 */

import type {
  Truie,
  Verrat,
  BandePorcelets,
  Saillie,
  TruiePerformance,
  VerratPerformance,
  PerformanceTier,
} from '../types/farm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse une date dd/MM/yyyy → timestamp. 0 si invalide. */
const parseFr = (s?: string | null): number => {
  if (!s) return 0;
  const parts = s.split('/');
  if (parts.length !== 3) return 0;
  const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  const ts = d.getTime();
  return Number.isFinite(ts) ? ts : 0;
};

/** Division sûre : retourne 0 si dénominateur = 0. */
const safeDiv = (num: number, den: number): number => (den === 0 ? 0 : num / den);

/** Clamp un nombre dans [min, max]. */
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

/** Arrondi à 1 décimale. */
const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Retourne la date la plus récente (format dd/MM/yyyy) parmi une liste.
 * `undefined` si toutes les dates sont vides/invalides.
 */
const latestDate = (dates: (string | undefined)[]): string | undefined => {
  let best = 0;
  let bestStr: string | undefined;
  for (const d of dates) {
    const ts = parseFr(d);
    if (ts > best) {
      best = ts;
      bestStr = d;
    }
  }
  return bestStr;
};

/**
 * Convertit un score numérique en tier. Appliqué à tous les scores composites.
 *
 *  ≥ 85 → ELITE | ≥ 70 → BON | ≥ 55 → MOYEN | ≥ 40 → FAIBLE | < 40 → INSUFFISANT
 */
export function scoreToTier(score: number): PerformanceTier {
  if (score >= 85) return 'ELITE';
  if (score >= 70) return 'BON';
  if (score >= 55) return 'MOYEN';
  if (score >= 40) return 'FAIBLE';
  return 'INSUFFISANT';
}

// ─── Matching portées ↔ saillies ─────────────────────────────────────────────

/**
 * Retourne les portées (bandes) attribuables à une truie donnée.
 *
 * Deux critères disjoints (OR) :
 *   1. `b.truie === truie.id` (match direct par ID)
 *   2. `b.boucleMere === truie.boucle` (match via boucle — legacy)
 */
export function findPorteesForTruie(truie: Truie, bandes: BandePorcelets[]): BandePorcelets[] {
  return bandes.filter(
    b =>
      (b.truie && b.truie === truie.id) ||
      (!!truie.boucle && b.boucleMere === truie.boucle),
  );
}

/**
 * Détermine si une saillie a abouti à une portée enregistrée.
 * Match : même truie ET date MB de la bande ±5j de la date MB prévue de la saillie.
 * Si `dateMBPrevue` est absente, on accepte toute bande de la même truie dans
 * les 115+20 jours suivant la saillie (fenêtre large de secours).
 */
export function saillieHasPortee(
  saillie: Saillie,
  bandes: BandePorcelets[],
): boolean {
  return bandes.some(b => {
    const matchId = !!saillie.truieId && b.truie === saillie.truieId;
    const matchBoucle = !!saillie.truieBoucle && b.boucleMere === saillie.truieBoucle;
    if (!matchId && !matchBoucle) return false;
    const bandeTs = parseFr(b.dateMB);
    if (!bandeTs) return false;
    const prevuTs = parseFr(saillie.dateMBPrevue);
    if (prevuTs) {
      const deltaDays = Math.abs(bandeTs - prevuTs) / 86_400_000;
      return deltaDays <= 5;
    }
    // Fallback : fenêtre [saillie + 95j, saillie + 135j] ≈ gestation ±
    const saillieTs = parseFr(saillie.dateSaillie);
    if (!saillieTs) return false;
    const deltaDays = (bandeTs - saillieTs) / 86_400_000;
    return deltaDays >= 95 && deltaDays <= 135;
  });
}

/**
 * Retourne les portées engendrées par un verrat : pour chaque saillie du verrat,
 * cherche la bande matchée (si elle existe).
 */
export function findPorteesForVerrat(
  verrat: Verrat,
  saillies: Saillie[],
  bandes: BandePorcelets[],
): BandePorcelets[] {
  const verratSaillies = saillies.filter(
    s => s.verratId === verrat.id || s.verratId === verrat.displayId,
  );
  const result: BandePorcelets[] = [];
  const seen = new Set<string>();
  for (const s of verratSaillies) {
    for (const b of bandes) {
      if (seen.has(b.id)) continue;
      const matchId = !!s.truieId && b.truie === s.truieId;
      const matchBoucle = !!s.truieBoucle && b.boucleMere === s.truieBoucle;
      if (!matchId && !matchBoucle) continue;
      const bandeTs = parseFr(b.dateMB);
      if (!bandeTs) continue;
      const prevuTs = parseFr(s.dateMBPrevue);
      if (prevuTs) {
        if (Math.abs(bandeTs - prevuTs) / 86_400_000 <= 5) {
          result.push(b);
          seen.add(b.id);
        }
      } else {
        const saillieTs = parseFr(s.dateSaillie);
        if (saillieTs) {
          const deltaDays = (bandeTs - saillieTs) / 86_400_000;
          if (deltaDays >= 95 && deltaDays <= 135) {
            result.push(b);
            seen.add(b.id);
          }
        }
      }
    }
  }
  return result;
}

// ─── Score composite ────────────────────────────────────────────────────────

/**
 * Calcul du score composite d'une truie (0-100).
 *
 * Formule :
 *   score = moyNV × 5
 *         + tauxSurvieNaissance × 0.5
 *         + tauxSevrage × 0.3
 *         + (tauxFertilite - 50) × 0.4
 *
 * Le biais -50 sur la fertilité récompense > 50 % et pénalise < 50 %.
 * Ordre de grandeur visé : une truie « bonne » (NV=12, survie=95 %, sevrage=90 %,
 * fertilité=80 %) → 60 + 47.5 + 27 + 12 = 146.5 → capé à 100 = ELITE.
 */
function computeTruieScore(perf: {
  moyNV: number;
  tauxSurvieNaissance: number;
  tauxSevrage: number;
  tauxFertilite: number;
}): number {
  const raw =
    perf.moyNV * 5 +
    perf.tauxSurvieNaissance * 0.5 +
    perf.tauxSevrage * 0.3 +
    (perf.tauxFertilite - 50) * 0.4;
  return clamp(round1(raw), 0, 100);
}

/**
 * Score composite d'un verrat (0-100).
 *
 * Formule :
 *   score = tauxSuccesSaillie × 0.5 + moyNVEngendrees × 4
 *
 * Un verrat avec 80 % de réussite et NV moyen 12 → 40 + 48 = 88 → ELITE.
 */
function computeVerratScore(perf: {
  tauxSuccesSaillie: number;
  moyNVEngendrees: number;
}): number {
  const raw = perf.tauxSuccesSaillie * 0.5 + perf.moyNVEngendrees * 4;
  return clamp(round1(raw), 0, 100);
}

// ─── API publique ────────────────────────────────────────────────────────────

/**
 * Calcule la performance composite d'une truie à partir des portées et des
 * saillies connues.
 *
 * Les portées sont matchées via `findPorteesForTruie` (id OU boucleMere).
 * On filtre les lignes RECAP en amont (déjà fait par mapBande).
 *
 * Si aucune portée : tier = `INSUFFISANT`, score = 0, toutes les métriques à 0.
 */
export function computeTruiePerformance(
  truie: Truie,
  bandes: BandePorcelets[],
  saillies: Saillie[],
): TruiePerformance {
  const portees = findPorteesForTruie(truie, bandes);
  const porteesAvecMB = portees.filter(p => !!p.dateMB);

  const totalNV = porteesAvecMB.reduce((acc, p) => acc + (p.nv ?? 0), 0);
  const totalMorts = porteesAvecMB.reduce((acc, p) => acc + (p.morts ?? 0), 0);
  const totalVivants = porteesAvecMB.reduce((acc, p) => acc + (p.vivants ?? 0), 0);
  const totalSevres = porteesAvecMB
    .filter(p => !!p.dateSevrageReelle)
    .reduce((acc, p) => acc + (p.vivants ?? 0), 0);

  const nbPortees = portees.length;
  const nbPorteesAvecMB = porteesAvecMB.length;
  const moyNV = round1(safeDiv(totalNV, nbPorteesAvecMB));
  const moyMortsParPortee = round1(safeDiv(totalMorts, nbPorteesAvecMB));
  const tauxSurvieNaissance = round1(safeDiv(totalVivants * 100, totalNV));
  const tauxSevrage = round1(safeDiv(totalSevres * 100, totalNV));

  const mySaillies = saillies.filter(
    s => s.truieId === truie.id || (!!truie.boucle && s.truieBoucle === truie.boucle),
  );
  const nbSaillies = mySaillies.length;
  const nbSailliesReussies = mySaillies.filter(s => saillieHasPortee(s, bandes)).length;
  const tauxFertilite = round1(safeDiv(nbSailliesReussies * 100, nbSaillies));

  const dernierSailliesDate = latestDate(mySaillies.map(s => s.dateSaillie));
  const dernierMBDate = latestDate(porteesAvecMB.map(p => p.dateMB));

  // Données insuffisantes → tier explicite, score 0.
  if (nbPortees === 0) {
    return {
      nbPortees: 0,
      nbPorteesAvecMB: 0,
      moyNV: 0,
      moyMortsParPortee: 0,
      tauxSurvieNaissance: 0,
      tauxSevrage: 0,
      nbSaillies,
      nbSailliesReussies,
      tauxFertilite,
      dernierSailliesDate,
      dernierMBDate: undefined,
      scoreCompetence: 0,
      tier: 'INSUFFISANT',
    };
  }

  const scoreCompetence = computeTruieScore({
    moyNV,
    tauxSurvieNaissance,
    tauxSevrage,
    tauxFertilite,
  });

  return {
    nbPortees,
    nbPorteesAvecMB,
    moyNV,
    moyMortsParPortee,
    tauxSurvieNaissance,
    tauxSevrage,
    nbSaillies,
    nbSailliesReussies,
    tauxFertilite,
    dernierSailliesDate,
    dernierMBDate,
    scoreCompetence,
    tier: scoreToTier(scoreCompetence),
  };
}

/**
 * Calcule la performance d'un verrat : saillies effectuées + portées engendrées.
 *
 * Une portée est attribuée au verrat si elle correspond à une de ses saillies
 * via `findPorteesForVerrat` (match truie + date MB).
 *
 * Si aucune saillie : tier = `INSUFFISANT`, score = 0.
 *
 * Note : le paramètre `_truies` est conservé dans la signature pour des usages
 * futurs (enrichissement affichage saillie → nom truie) — actuellement non utilisé
 * dans la logique de calcul.
 */
export function computeVerratPerformance(
  verrat: Verrat,
  bandes: BandePorcelets[],
  saillies: Saillie[],
  _truies: Truie[],
): VerratPerformance {
  const mySaillies = saillies.filter(
    s => s.verratId === verrat.id || s.verratId === verrat.displayId,
  );
  const nbSaillies = mySaillies.length;

  const porteesEngendrees = findPorteesForVerrat(verrat, saillies, bandes);
  const porteesAvecMB = porteesEngendrees.filter(p => !!p.dateMB);
  const nbPorteesEngendrees = porteesAvecMB.length;

  const totalNV = porteesAvecMB.reduce((acc, p) => acc + (p.nv ?? 0), 0);
  const moyNVEngendrees = round1(safeDiv(totalNV, nbPorteesEngendrees));
  const tauxSuccesSaillie = round1(safeDiv(nbPorteesEngendrees * 100, nbSaillies));

  const derniereSailliesDate = latestDate(mySaillies.map(s => s.dateSaillie));

  if (nbSaillies === 0) {
    return {
      nbSaillies: 0,
      nbPorteesEngendrees: 0,
      moyNVEngendrees: 0,
      tauxSuccesSaillie: 0,
      derniereSailliesDate: undefined,
      scoreFertilite: 0,
      tier: 'INSUFFISANT',
    };
  }

  const scoreFertilite = computeVerratScore({ tauxSuccesSaillie, moyNVEngendrees });

  return {
    nbSaillies,
    nbPorteesEngendrees,
    moyNVEngendrees,
    tauxSuccesSaillie,
    derniereSailliesDate,
    scoreFertilite,
    tier: scoreToTier(scoreFertilite),
  };
}
