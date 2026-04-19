/**
 * perfKpiAnalyzer — Agrégats de performance troupeau (GTTT naisseur-engraisseur).
 * ────────────────────────────────────────────────────────────────────────────────
 * Pure functions, zéro I/O, zéro dépendance React. Construit sur
 * `performanceAnalyzer.ts` pour le scoring individuel des truies.
 *
 * Trois fonctions publiques :
 *   • `computeGlobalKpis`          — KPI globaux troupeau (sevrés/truie/an, NV moyen…)
 *   • `rankTruiesByPerformance`    — top 3 / flop 3 par score composite
 *   • `detectTruiesAReformer`      — truies candidates à réforme (perf ou inactivité)
 *
 * Toutes les dates en entrée respectent le format dd/MM/yyyy — identique au reste
 * de l'app (mapping Google Sheets).
 */

import type {
  Truie,
  BandePorcelets,
  Saillie,
  TruiePerformance,
} from '../types/farm';
import { computeTruiePerformance, findPorteesForTruie } from './performanceAnalyzer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse une date dd/MM/yyyy → timestamp. 0 si invalide. */
function parseFr(s?: string | null): number {
  if (!s) return 0;
  const parts = s.split('/');
  if (parts.length !== 3) return 0;
  const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  const ts = d.getTime();
  return Number.isFinite(ts) ? ts : 0;
}

/** Division sûre : retourne 0 si dénominateur = 0. */
function safeDiv(num: number, den: number): number {
  return den === 0 ? 0 : num / den;
}

/** Arrondi à 1 décimale. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Jours entre deux timestamps (≥ 0 si b > a). */
function daysBetween(a: number, b: number): number {
  return (b - a) / 86_400_000;
}

// ─── Types publics ───────────────────────────────────────────────────────────

export interface GlobalKpis {
  /** Nombre total de truies référencées. */
  nbTruiesTotal: number;
  /** Truies ayant eu au moins 1 portée (toutes périodes confondues). */
  nbTruiesProductives: number;
  /** Portées avec MB sur les 12 derniers mois. */
  nbPortees12m: number;
  /** Total porcelets sevrés (vivants des portées avec dateSevrageReelle) sur 12 derniers mois. */
  nbSevrés12m: number;
  /** Moyenne des nés vivants sur toutes les portées avec MB, 12 derniers mois. */
  moyNV: number;
  /** (Morts / NV) × 100, agrégé sur portées 12 derniers mois. */
  tauxMortaliteNaissanceSevrage: number;
  /** Sevrés par truie productive, extrapolé sur 12 mois. */
  sevresParTruieAn: number;
  /** Portées par truie productive, extrapolé sur 12 mois. */
  porteesParTruieAn: number;
  /** Intervalle moyen entre sevrage réel et saillie suivante (jours). `null` si aucune paire. */
  intervalSevrageSaillieMoyJours: number | null;
  /** Mises-bas prévues dans les 30 prochains jours. */
  nbMbAVenir30j: number;
}

export interface TruieRanking {
  truie: Truie;
  performance: TruiePerformance;
}

export type MotifReforme = 'PERF_INSUFFISANTE' | 'INACTIVE_LONG' | 'MULTIPLE';

export interface TruiesAReformer {
  motif: MotifReforme;
  truie: Truie;
  detail: string;
  performance?: TruiePerformance;
}

// ─── Constantes métier ──────────────────────────────────────────────────────

/** Seuil minimal de portées pour juger la performance (évite sanction sur primipare). */
const MIN_PORTEES_POUR_JUGER = 3;

/** Nombre de jours sans saillie pour déclarer une truie inactive (statut En attente saillie). */
const JOURS_INACTIVE_SEUIL = 90;

/** Horizon pour les mises-bas à venir (jours). */
const HORIZON_MB_A_VENIR = 30;

/** Période d'agrégation pour les KPI globaux (jours). */
const HORIZON_12M = 365;

// ─── computeGlobalKpis ───────────────────────────────────────────────────────

/**
 * Calcule les KPI globaux du troupeau.
 *
 * Logique d'extrapolation — décision clé :
 *   Les KPI "par truie / an" sont extrapolés linéairement sur 12 mois
 *   à partir de la période réellement couverte par les données. Exemple :
 *   si les données couvrent 6 mois, on multiplie les compteurs 6-mois par 2.
 *
 *   Période couverte = min(365, max(daysBetween(plus_ancienne_MB, today), 30))
 *   Le seuil plancher de 30 jours évite de projeter à l'infini sur des
 *   données fraîches (< 1 mois → extrapolation * 12+).
 *
 * Intervalle sevrage → saillie :
 *   Pour chaque truie, on parcourt ses portées triées par dateSevrageReelle
 *   croissante et on cherche la saillie suivante de la même truie. Le delta
 *   en jours entre sevrage et saillie est accumulé. Seules les paires valides
 *   (delta ≥ 0 et ≤ 60j — filtre anti-outliers) sont retenues.
 */
export function computeGlobalKpis(
  truies: Truie[],
  bandes: BandePorcelets[],
  saillies: Saillie[],
  today: Date = new Date(),
): GlobalKpis {
  const nowTs = today.getTime();
  const cutoff12m = nowTs - HORIZON_12M * 86_400_000;

  // --- Comptage truies productives (toutes périodes) ---
  const nbTruiesTotal = truies.length;
  let nbTruiesProductives = 0;
  for (const t of truies) {
    if (findPorteesForTruie(t, bandes).length > 0) nbTruiesProductives += 1;
  }

  // --- Agrégats portées 12 derniers mois ---
  const portees12m = bandes.filter(b => {
    const ts = parseFr(b.dateMB);
    return ts > 0 && ts >= cutoff12m && ts <= nowTs;
  });

  const nbPortees12m = portees12m.length;
  let sumNV = 0;
  let sumMorts = 0;
  let sumSevres = 0;
  for (const p of portees12m) {
    sumNV += p.nv ?? 0;
    sumMorts += p.morts ?? 0;
    if (p.dateSevrageReelle) sumSevres += p.vivants ?? 0;
  }

  const moyNV = round1(safeDiv(sumNV, nbPortees12m));
  const tauxMortaliteNaissanceSevrage = round1(safeDiv(sumMorts * 100, sumNV));

  // --- Période réellement couverte (pour extrapolation) ---
  let oldestTs = nowTs;
  for (const b of bandes) {
    const ts = parseFr(b.dateMB);
    if (ts > 0 && ts < oldestTs && ts >= cutoff12m) oldestTs = ts;
  }
  const joursCouverts = Math.max(30, Math.min(HORIZON_12M, daysBetween(oldestTs, nowTs)));
  const facteurAnnualisation = HORIZON_12M / joursCouverts;

  const sevresParTruieAn =
    nbTruiesProductives > 0
      ? round1((sumSevres / nbTruiesProductives) * facteurAnnualisation)
      : 0;
  const porteesParTruieAn =
    nbTruiesProductives > 0
      ? round1((nbPortees12m / nbTruiesProductives) * facteurAnnualisation)
      : 0;

  // --- Intervalle sevrage → saillie suivante ---
  let totalDeltaJours = 0;
  let nbPaires = 0;
  for (const t of truies) {
    const porteesSevrees = findPorteesForTruie(t, bandes)
      .filter(b => !!b.dateSevrageReelle)
      .map(b => parseFr(b.dateSevrageReelle))
      .filter(ts => ts > 0)
      .sort((a, b) => a - b);

    const truieSaillies = saillies
      .filter(s => s.truieId === t.id || (!!t.boucle && s.truieBoucle === t.boucle))
      .map(s => parseFr(s.dateSaillie))
      .filter(ts => ts > 0)
      .sort((a, b) => a - b);

    for (const sevrageTs of porteesSevrees) {
      // Chercher la 1re saillie postérieure au sevrage.
      const next = truieSaillies.find(st => st > sevrageTs);
      if (!next) continue;
      const delta = daysBetween(sevrageTs, next);
      // Filtre anti-outliers : on ignore les paires > 60j (manque probable de data
      // intermédiaire ou réforme ponctuelle).
      if (delta >= 0 && delta <= 60) {
        totalDeltaJours += delta;
        nbPaires += 1;
      }
    }
  }
  const intervalSevrageSaillieMoyJours =
    nbPaires > 0 ? round1(totalDeltaJours / nbPaires) : null;

  // --- Mises-bas prévues dans les 30 prochains jours ---
  const horizonTs = nowTs + HORIZON_MB_A_VENIR * 86_400_000;
  let nbMbAVenir30j = 0;
  for (const t of truies) {
    const ts = parseFr(t.dateMBPrevue);
    if (ts > 0 && ts >= nowTs && ts <= horizonTs) nbMbAVenir30j += 1;
  }

  return {
    nbTruiesTotal,
    nbTruiesProductives,
    nbPortees12m,
    nbSevrés12m: sumSevres,
    moyNV,
    tauxMortaliteNaissanceSevrage,
    sevresParTruieAn,
    porteesParTruieAn,
    intervalSevrageSaillieMoyJours,
    nbMbAVenir30j,
  };
}

// ─── rankTruiesByPerformance ─────────────────────────────────────────────────

/**
 * Top / flop des truies par score composite.
 *
 *   - `top`  : tier ELITE ou BON, tri score desc, limite 3
 *   - `flop` : tier FAIBLE ou INSUFFISANT **AVEC nbPortees >= 3**
 *              (un primipare ne peut pas être classé faible), tri score asc, limite 3
 *
 * Décision : on exclut explicitement les truies sans portée (score=0 par défaut)
 * du flop pour ne pas polluer la liste avec des truies fraîchement introduites.
 */
export function rankTruiesByPerformance(
  truies: Truie[],
  bandes: BandePorcelets[],
  saillies: Saillie[],
): { top: TruieRanking[]; flop: TruieRanking[] } {
  const rankings: TruieRanking[] = truies.map(t => ({
    truie: t,
    performance: computeTruiePerformance(t, bandes, saillies),
  }));

  const top = rankings
    .filter(r => r.performance.tier === 'ELITE' || r.performance.tier === 'BON')
    .sort((a, b) => b.performance.scoreCompetence - a.performance.scoreCompetence)
    .slice(0, 3);

  const flop = rankings
    .filter(
      r =>
        (r.performance.tier === 'FAIBLE' || r.performance.tier === 'INSUFFISANT') &&
        r.performance.nbPortees >= MIN_PORTEES_POUR_JUGER,
    )
    .sort((a, b) => a.performance.scoreCompetence - b.performance.scoreCompetence)
    .slice(0, 3);

  return { top, flop };
}

// ─── detectTruiesAReformer ───────────────────────────────────────────────────

/**
 * Détecte les truies candidates à réforme selon deux motifs (combinables) :
 *
 *   1. `PERF_INSUFFISANTE` : tier FAIBLE ou INSUFFISANT **ET** ≥ 3 portées.
 *      (Assez de data pour juger — évite de réformer une primipare malchanceuse.)
 *
 *   2. `INACTIVE_LONG`     : statut `En attente saillie` **ET** pas de saillie
 *      depuis > 90 jours (ou jamais saillie).
 *
 *   Si les deux motifs s'appliquent → `MULTIPLE`.
 *
 * Les truies en statut `Pleine`, `En maternité` ou `À surveiller` sont exclues
 * du motif INACTIVE (elles sont par définition en cycle actif).
 */
export function detectTruiesAReformer(
  truies: Truie[],
  bandes: BandePorcelets[],
  saillies: Saillie[],
  today: Date = new Date(),
): TruiesAReformer[] {
  const nowTs = today.getTime();
  const seuilMs = JOURS_INACTIVE_SEUIL * 86_400_000;

  const out: TruiesAReformer[] = [];

  for (const t of truies) {
    const perf = computeTruiePerformance(t, bandes, saillies);

    const perfInsuffisante =
      (perf.tier === 'FAIBLE' || perf.tier === 'INSUFFISANT') &&
      perf.nbPortees >= MIN_PORTEES_POUR_JUGER;

    // INACTIVE : statut "En attente saillie" + aucune saillie récente
    const truieSaillies = saillies
      .filter(s => s.truieId === t.id || (!!t.boucle && s.truieBoucle === t.boucle))
      .map(s => parseFr(s.dateSaillie))
      .filter(ts => ts > 0);
    const lastSaillieTs = truieSaillies.length > 0 ? Math.max(...truieSaillies) : 0;
    const joursDepuisDerniereSaillie = lastSaillieTs > 0
      ? Math.floor(daysBetween(lastSaillieTs, nowTs))
      : Number.POSITIVE_INFINITY;

    const isEnAttente = t.statut === 'En attente saillie';
    const inactiveLong = isEnAttente && (lastSaillieTs === 0 || nowTs - lastSaillieTs > seuilMs);

    if (!perfInsuffisante && !inactiveLong) continue;

    const motif: MotifReforme =
      perfInsuffisante && inactiveLong
        ? 'MULTIPLE'
        : perfInsuffisante
          ? 'PERF_INSUFFISANTE'
          : 'INACTIVE_LONG';

    let detail: string;
    if (motif === 'PERF_INSUFFISANTE') {
      detail = `${perf.nbPortees} portées · moyNV ${perf.moyNV}`;
    } else if (motif === 'INACTIVE_LONG') {
      detail = Number.isFinite(joursDepuisDerniereSaillie)
        ? `${joursDepuisDerniereSaillie}j sans saillie`
        : 'Jamais saillie';
    } else {
      const inactDetail = Number.isFinite(joursDepuisDerniereSaillie)
        ? `${joursDepuisDerniereSaillie}j sans saillie`
        : 'jamais saillie';
      detail = `${perf.nbPortees} portées · moyNV ${perf.moyNV} · ${inactDetail}`;
    }

    out.push({ motif, truie: t, detail, performance: perf });
  }

  return out;
}
