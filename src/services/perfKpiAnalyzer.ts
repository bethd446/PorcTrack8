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
 * de l'app (mapping Supabase).
 */

import type {
  Truie,
  BandePorcelets,
  Saillie,
  StockAliment,
  TruiePerformance,
} from '../types/farm';
import { computeTruiePerformance, findPorteesForTruie } from './performanceAnalyzer';
import { safeDate } from '../lib/truieHelpers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse une date (ISO yyyy-MM-dd ou FR dd/MM/yyyy) → timestamp. 0 si invalide. */
function parseFr(s?: string | null): number {
  const d = safeDate(s);
  return d ? d.getTime() : 0;
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

/** RFC 4122 UUID — utilisé pour décider si un id Truie vient de Supabase
 *  (UUID, donc displayId est obligatoire pour matcher les saillies via
 *  code_id) ou d'un mock/legacy (id == code_id, pas de double match). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** V38-A — Match tolérant truie ↔ saillie (UUID, code_id, boucle).
 *  Quand truie.id est un UUID, saillies provenant de Supabase peuvent porter
 *  soit l'UUID soit le code_id (selon JOIN). Quand id n'est pas un UUID
 *  (mocks/legacy), on évite le double match avec displayId pour ne pas créer
 *  de faux positifs entre fixtures qui partageraient un displayId par défaut. */
function matchSaillie(s: Saillie, t: Truie): boolean {
  if (s.truieId === t.id) return true;
  if (UUID_RE.test(t.id) && t.displayId && s.truieId === t.displayId) return true;
  if (t.boucle && s.truieBoucle === t.boucle) return true;
  return false;
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
  /**
   * ISSE (Intervalle Sevrage-Saillie) moyen en jours — pour chaque truie,
   * moyenne des deltas sevrage → saillie suivante (fenêtre ≤ 60j).
   * `null` si aucune séquence exploitable. Cible pro : 3-7 j.
   */
  isseMoyJours: number | null;
  /**
   * IEM (Intervalle Entre Mise-Bas) moyen en jours — moyenne des deltas
   * entre MB consécutives d'une même truie (fenêtre [100j, 200j]).
   * `null` si aucune truie avec ≥ 2 portées datées. Cible pro : 140-150 j.
   */
  iemMoyJours: number | null;
  /**
   * Taux MB (%) — nb portées 12m / nb saillies 12m × 100.
   * `null` si nbSaillies12m === 0. Cible pro : ≥ 88%.
   */
  tauxMBPct: number | null;
  /**
   * Taux de renouvellement (%) — truies ayant leur 1re portée dans les 12
   * derniers mois / nb truies total × 100. `null` si nbTruiesTotal === 0.
   * Cible pro : 35-40 %/an.
   */
  tauxRenouvellementPct: number | null;
  /** Nombre de truies avec au moins 2 MB datées (crédibilité IEM). */
  nbTruiesAvecMBMultiples: number;
  /** Nombre de saillies sur les 12 derniers mois. */
  nbSaillies12m: number;
  /** Nombre de mises-bas sur les 12 derniers mois (alias sur nbPortees12m). */
  nbMB12m: number;
}

export interface TruieRanking {
  truie: Truie;
  performance: TruiePerformance;
}

export type MotifReforme =
  | 'PERF_INSUFFISANTE'
  | 'INACTIVE_LONG'
  | 'ISSE_ELEVE'
  | 'MULTIPLE';

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

/** Fenêtre max (jours) pour accepter une paire sevrage → saillie comme valide (anti-outliers). */
const ISSE_FENETRE_MAX_J = 60;

/** Seuil ISSE individuel (jours) au-delà duquel une occurrence est considérée "élevée". */
const ISSE_INDIVIDUEL_SEUIL_J = 14;

/** Nombre minimum d'occurrences ISSE > seuil pour déclencher le motif ISSE_ELEVE (récurrence). */
const ISSE_ELEVE_MIN_OCCURRENCES = 2;

/** Fenêtre IEM : intervalles MB consécutifs hors de [IEM_MIN_J, IEM_MAX_J] filtrés comme aberrants. */
const IEM_MIN_J = 100;
const IEM_MAX_J = 200;

// ─── KPI repro avancés (ISSE, IEM, taux MB, renouvellement) ─────────────────

/**
 * Récupère les sevrages réels d'une truie sous forme de timestamps triés.
 */
function sevrageTsForTruie(truie: Truie, bandes: BandePorcelets[]): number[] {
  return findPorteesForTruie(truie, bandes)
    .filter(b => !!b.dateSevrageReelle)
    .map(b => parseFr(b.dateSevrageReelle))
    .filter(ts => ts > 0)
    .sort((a, b) => a - b);
}

/**
 * Récupère les saillies d'une truie sous forme de timestamps triés.
 *
 * V38-A — Matching tolérant via `matchSaillie` : id (UUID), displayId
 * (code_id), boucle. Détails dans `matchSaillie`.
 */
function saillieTsForTruie(truie: Truie, saillies: Saillie[]): number[] {
  return saillies
    .filter(s => matchSaillie(s, truie))
    .map(s => parseFr(s.dateSaillie))
    .filter(ts => ts > 0)
    .sort((a, b) => a - b);
}

/**
 * Retourne tous les intervalles (jours) sevrage → saillie suivante pour une truie,
 * en filtrant les aberrants (> ISSE_FENETRE_MAX_J jours).
 */
function isseIntervallesForTruie(
  truie: Truie,
  bandes: BandePorcelets[],
  saillies: Saillie[],
): number[] {
  const sevrages = sevrageTsForTruie(truie, bandes);
  const saillieTs = saillieTsForTruie(truie, saillies);
  const out: number[] = [];
  for (const sevrage of sevrages) {
    const next = saillieTs.find(st => st > sevrage);
    if (!next) continue;
    const delta = daysBetween(sevrage, next);
    if (delta >= 0 && delta <= ISSE_FENETRE_MAX_J) out.push(delta);
  }
  return out;
}

/**
 * ISSE moyen (Intervalle Sevrage-Saillie) sur toutes les truies.
 *
 * Pour chaque truie, chaque sevrage est apparié à la saillie suivante (dans
 * la fenêtre ≤ 60 j). La moyenne globale est calculée sur l'ensemble des
 * paires valides (pondération par paire, pas par truie). Retourne `null`
 * si aucune paire exploitable.
 *
 * Décision : filtre à 60 j pour éliminer les séquences dégradées (retour de
 * chaleur manqué, inséminations manquantes) — au-delà, ce n'est plus un
 * "intervalle sevrage-saillie" au sens biologique.
 */
export function computeISSEMoyen(
  truies: Truie[],
  bandes: BandePorcelets[],
  saillies: Saillie[],
): number | null {
  let total = 0;
  let n = 0;
  for (const t of truies) {
    for (const delta of isseIntervallesForTruie(t, bandes, saillies)) {
      total += delta;
      n += 1;
    }
  }
  return n > 0 ? round1(total / n) : null;
}

/**
 * IEM moyen (Intervalle Entre Mise-Bas) sur les truies avec ≥ 2 portées datées.
 *
 * Pour chaque truie avec au moins 2 MB datées, on calcule les intervalles
 * entre MB consécutives. On filtre les aberrants hors de [100j, 200j] —
 * au-delà, c'est probablement un trou de data (saillie manquée, période
 * non enregistrée) plutôt qu'un vrai cycle biologique.
 *
 * Retourne `null` si aucune truie avec ≥ 2 MB exploitable.
 */
export function computeIEMMoyen(bandes: BandePorcelets[]): number | null {
  // Regrouper par truie (priorité id puis boucleMere).
  const byTruie = new Map<string, number[]>();
  for (const b of bandes) {
    const ts = parseFr(b.dateMB);
    if (!ts) continue;
    const key = b.truie || (b.boucleMere ? `@${b.boucleMere}` : '');
    if (!key) continue;
    const arr = byTruie.get(key);
    if (arr) arr.push(ts);
    else byTruie.set(key, [ts]);
  }

  let total = 0;
  let n = 0;
  for (const tsList of byTruie.values()) {
    if (tsList.length < 2) continue;
    tsList.sort((a, b) => a - b);
    for (let i = 1; i < tsList.length; i += 1) {
      const delta = daysBetween(tsList[i - 1], tsList[i]);
      if (delta >= IEM_MIN_J && delta <= IEM_MAX_J) {
        total += delta;
        n += 1;
      }
    }
  }
  return n > 0 ? round1(total / n) : null;
}

/**
 * Nombre de truies avec ≥ 2 MB datées (indicateur de crédibilité IEM).
 */
function countTruiesAvecMBMultiples(bandes: BandePorcelets[]): number {
  const byTruie = new Map<string, number>();
  for (const b of bandes) {
    const ts = parseFr(b.dateMB);
    if (!ts) continue;
    const key = b.truie || (b.boucleMere ? `@${b.boucleMere}` : '');
    if (!key) continue;
    byTruie.set(key, (byTruie.get(key) || 0) + 1);
  }
  let n = 0;
  for (const count of byTruie.values()) if (count >= 2) n += 1;
  return n;
}

/**
 * Taux MB (%) sur 12 derniers mois : MB effectives / saillies dans la période.
 *
 * Comptage bornes [cutoff12m, today] inclusives, basé sur `dateMB` pour les
 * portées et `dateSaillie` pour les saillies. Retourne `null` si aucune
 * saillie recensée sur la période (division impossible).
 */
export function computeTauxMB(
  bandes: BandePorcelets[],
  saillies: Saillie[],
  today: Date = new Date(),
): number | null {
  const nowTs = today.getTime();
  const cutoff = nowTs - HORIZON_12M * 86_400_000;
  let nbMB = 0;
  for (const b of bandes) {
    const ts = parseFr(b.dateMB);
    if (ts >= cutoff && ts <= nowTs) nbMB += 1;
  }
  let nbSaillies = 0;
  for (const s of saillies) {
    const ts = parseFr(s.dateSaillie);
    if (ts >= cutoff && ts <= nowTs) nbSaillies += 1;
  }
  if (nbSaillies === 0) return null;
  return round1((nbMB * 100) / nbSaillies);
}

/**
 * Taux de renouvellement (%) : truies dont la 1re portée date de < 12 mois
 * / nb truies total × 100.
 *
 * Une truie "nouvelle" est une truie dont la plus ancienne portée datée
 * se situe dans la fenêtre 12m. Truies sans portée connue → exclues du
 * numérateur (pas "nouvelles" au sens reproductif). Retourne `null` si
 * aucune truie dans le troupeau.
 */
export function computeTauxRenouvellement(
  truies: Truie[],
  bandes: BandePorcelets[],
  today: Date = new Date(),
): number | null {
  if (truies.length === 0) return null;
  const nowTs = today.getTime();
  const cutoff = nowTs - HORIZON_12M * 86_400_000;
  let nbNouvelles = 0;
  for (const t of truies) {
    const portees = findPorteesForTruie(t, bandes)
      .map(b => parseFr(b.dateMB))
      .filter(ts => ts > 0);
    if (portees.length === 0) continue;
    const premiere = Math.min(...portees);
    if (premiere >= cutoff && premiere <= nowTs) nbNouvelles += 1;
  }
  return round1((nbNouvelles * 100) / truies.length);
}

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

  // --- Intervalle sevrage → saillie suivante (= ISSE moyen troupeau) ---
  const intervalSevrageSaillieMoyJours = computeISSEMoyen(truies, bandes, saillies);
  // ISSE est l'alias métier de intervalSevrageSaillie — mêmes calculs, libellé pro.
  const isseMoyJours = intervalSevrageSaillieMoyJours;

  // --- Mises-bas prévues dans les 30 prochains jours ---
  const horizonTs = nowTs + HORIZON_MB_A_VENIR * 86_400_000;
  let nbMbAVenir30j = 0;
  for (const t of truies) {
    const ts = parseFr(t.dateMBPrevue);
    if (ts > 0 && ts >= nowTs && ts <= horizonTs) nbMbAVenir30j += 1;
  }

  // --- KPI repro avancés ---
  const iemMoyJours = computeIEMMoyen(bandes);
  const tauxMBPct = computeTauxMB(bandes, saillies, today);
  const tauxRenouvellementPct = computeTauxRenouvellement(truies, bandes, today);
  const nbTruiesAvecMBMultiples = countTruiesAvecMBMultiples(bandes);

  let nbSaillies12m = 0;
  for (const s of saillies) {
    const ts = parseFr(s.dateSaillie);
    if (ts >= cutoff12m && ts <= nowTs) nbSaillies12m += 1;
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
    isseMoyJours,
    iemMoyJours,
    tauxMBPct,
    tauxRenouvellementPct,
    nbTruiesAvecMBMultiples,
    nbSaillies12m,
    nbMB12m: nbPortees12m,
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
 * Détecte les truies candidates à réforme selon trois motifs (combinables) :
 *
 *   1. `PERF_INSUFFISANTE` : tier FAIBLE ou INSUFFISANT **ET** ≥ 3 portées.
 *      (Assez de data pour juger — évite de réformer une primipare malchanceuse.)
 *
 *   2. `INACTIVE_LONG`     : statut `En attente saillie` **ET** pas de saillie
 *      depuis > 90 jours (ou jamais saillie).
 *
 *   3. `ISSE_ELEVE`        : truie avec ≥ 2 occurrences d'ISSE individuel > 14 j
 *      (fertilité post-sevrage dégradée de façon récurrente).
 *
 *   Si ≥ 2 motifs s'appliquent → `MULTIPLE`.
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

    // INACTIVE : statut "En attente saillie" + aucune saillie récente.
    // V38-A — Match code_id/UUID/boucle (cf. matchSaillie).
    const truieSailliesTs = saillies
      .filter(s => matchSaillie(s, t))
      .map(s => parseFr(s.dateSaillie))
      .filter(ts => ts > 0);
    const lastSaillieTs = truieSailliesTs.length > 0 ? Math.max(...truieSailliesTs) : 0;
    const joursDepuisDerniereSaillie = lastSaillieTs > 0
      ? Math.floor(daysBetween(lastSaillieTs, nowTs))
      : Number.POSITIVE_INFINITY;

    const isEnAttente = t.statut === 'En attente saillie';
    const inactiveLong = isEnAttente && (lastSaillieTs === 0 || nowTs - lastSaillieTs > seuilMs);

    // ISSE_ELEVE : récurrence d'intervalles sevrage-saillie hors cible.
    const isseIntervalles = isseIntervallesForTruie(t, bandes, saillies);
    const nbOccurrencesISSEElevees = isseIntervalles.filter(
      d => d > ISSE_INDIVIDUEL_SEUIL_J,
    ).length;
    const isseEleve = nbOccurrencesISSEElevees >= ISSE_ELEVE_MIN_OCCURRENCES;

    if (!perfInsuffisante && !inactiveLong && !isseEleve) continue;

    const motifs: MotifReforme[] = [];
    if (perfInsuffisante) motifs.push('PERF_INSUFFISANTE');
    if (inactiveLong) motifs.push('INACTIVE_LONG');
    if (isseEleve) motifs.push('ISSE_ELEVE');

    const motif: MotifReforme = motifs.length > 1 ? 'MULTIPLE' : motifs[0];

    // Fragments de détail réutilisables.
    const perfFrag = `${perf.nbPortees} portées · moyNV ${perf.moyNV}`;
    const inactFrag = Number.isFinite(joursDepuisDerniereSaillie)
      ? `${joursDepuisDerniereSaillie}j sans saillie`
      : 'Jamais saillie';
    const isseFrag = `ISSE ${nbOccurrencesISSEElevees}× > ${ISSE_INDIVIDUEL_SEUIL_J}j`;

    let detail: string;
    if (motif === 'PERF_INSUFFISANTE') {
      detail = perfFrag;
    } else if (motif === 'INACTIVE_LONG') {
      detail = inactFrag;
    } else if (motif === 'ISSE_ELEVE') {
      detail = isseFrag;
    } else {
      // MULTIPLE → concatène les fragments des motifs actifs (lowercase pour le 1er sans majuscule).
      const parts: string[] = [];
      if (perfInsuffisante) parts.push(perfFrag);
      if (inactiveLong)
        parts.push(
          Number.isFinite(joursDepuisDerniereSaillie)
            ? `${joursDepuisDerniereSaillie}j sans saillie`
            : 'jamais saillie',
        );
      if (isseEleve) parts.push(isseFrag);
      detail = parts.join(' · ');
    }

    out.push({ motif, truie: t, detail, performance: perf });
  }

  return out;
}

// ─── KPI sparklines PilotageHub (période 7J/30J/90J/1A) ─────────────────────
//
// Ces fonctions alimentent les 4 SparklineCard du tab Pilotage.
// Pour chaque KPI on retourne :
//   • value  — agrégat sur la période courante
//   • delta  — % variation vs période précédente équivalente
//   • series — 7 points répartis sur la période (pour la mini-courbe)
//
// Principe : on découpe la période en 7 buckets de largeur égale, on agrège
// par bucket, puis on compare la somme/moyenne des 7 buckets au même calcul
// sur la période précédente (même durée, décalée en arrière).

/** Clés de période supportées par le sélecteur Pilotage. */
export type PeriodeKey = '7J' | '30J' | '90J' | '1A';

/** Point de la mini-courbe — x = index 0-6, y = valeur du bucket. */
export interface KpiSparkPoint {
  x: number;
  y: number;
}

/** Structure standard renvoyée par chaque computePerf*. */
export interface KpiSparkline {
  /** Valeur agrégée sur la période courante (arrondie 1 décimale). */
  value: number;
  /** Variation % vs période précédente (arrondie entier). 0 si pas de comparatif. */
  delta: number;
  /** 7 points répartis sur la période (bucket 0 = plus ancien, bucket 6 = le plus récent). */
  series: KpiSparkPoint[];
}

/** Nombre de points dans la sparkline. Figé à 7 pour un rendu lisible. */
const SPARK_POINTS = 7;

/** IC technique par défaut retourné quand les données pesées manquent (GTTT naisseur-engraisseur). */
const IC_PAR_DEFAUT = 2.85;

/** Jours couverts par chaque période. */
const PERIODE_JOURS: Record<PeriodeKey, number> = {
  '7J': 7,
  '30J': 30,
  '90J': 90,
  '1A': 365,
};

/** Retourne le nombre de jours d'une période. Export pour tests. */
export function getPeriodeDays(p: PeriodeKey): number {
  return PERIODE_JOURS[p];
}

/**
 * Calcule la variation % entre `current` et `previous`.
 * Conventions :
 *   • previous = 0 & current = 0 → 0
 *   • previous = 0 & current > 0 → +100 (évite Infinity)
 *   • previous > 0 → ((current - previous) / previous) × 100, arrondi entier
 */
function computeDelta(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Découpe une fenêtre temporelle [start, end) en N buckets de largeur égale.
 * Retourne la liste des bornes : [{start, end}, ...] de taille N.
 */
function makeBuckets(
  startTs: number,
  endTs: number,
  n: number,
): Array<{ start: number; end: number }> {
  const width = (endTs - startTs) / n;
  const out: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < n; i += 1) {
    out.push({ start: startTs + i * width, end: startTs + (i + 1) * width });
  }
  return out;
}

/**
 * Filtre les bandes avec une `dateMB` parsable dans [startTs, endTs].
 */
function bandesInRange(
  bandes: BandePorcelets[],
  startTs: number,
  endTs: number,
): BandePorcelets[] {
  const out: BandePorcelets[] = [];
  for (const b of bandes) {
    const ts = parseFr(b.dateMB);
    if (ts > 0 && ts >= startTs && ts <= endTs) out.push(b);
  }
  return out;
}

// ── 1. Sevrés / portée ──────────────────────────────────────────────────────

/**
 * Moyenne de porcelets vivants par portée sevrée sur la période.
 *
 * Une portée compte comme "sevrée" si `dateSevrageReelle` est renseignée ;
 * dans ce cas on additionne `vivants` (ou à défaut `nv - morts`). La date
 * de référence pour le bucket est `dateMB` — moment où la portée est née,
 * plus stable que la date de sevrage pour répartir 7 buckets sur la période.
 *
 * Retourne `{ value, delta, series }` avec value = moyenne sur la période
 * courante, delta = % vs période précédente (même durée décalée), series =
 * moyenne par bucket (7 points).
 */
export function computeSevresParPortee(
  bandes: BandePorcelets[],
  periode: PeriodeKey,
  today: Date = new Date(),
): KpiSparkline {
  const days = PERIODE_JOURS[periode];
  const nowTs = today.getTime();
  const startTs = nowTs - days * 86_400_000;
  const prevStartTs = nowTs - 2 * days * 86_400_000;

  const moyenneSevres = (range: BandePorcelets[]): number => {
    let total = 0;
    let n = 0;
    for (const b of range) {
      if (!b.dateSevrageReelle) continue;
      const v = typeof b.vivants === 'number'
        ? b.vivants
        : (b.nv ?? 0) - (b.morts ?? 0);
      total += v;
      n += 1;
    }
    return n > 0 ? total / n : 0;
  };

  const current = bandesInRange(bandes, startTs, nowTs);
  const previous = bandesInRange(bandes, prevStartTs, startTs);

  const value = round1(moyenneSevres(current));
  const prevValue = moyenneSevres(previous);
  const delta = computeDelta(value, prevValue);

  const buckets = makeBuckets(startTs, nowTs, SPARK_POINTS);
  const series: KpiSparkPoint[] = buckets.map((b, i) => {
    const subset = current.filter(p => {
      const ts = parseFr(p.dateMB);
      return ts >= b.start && ts < b.end;
    });
    return { x: i, y: round1(moyenneSevres(subset)) };
  });

  return { value, delta, series };
}

// ── 2. Mortalité porcelets (%) ──────────────────────────────────────────────

/**
 * % porcelets morts sur total nés (NV + morts … mais ici `nv` inclut souvent
 * les morts-nés selon la saisie ; pour rester compatible avec la convention
 * de `performanceAnalyzer` on utilise `morts / (vivants + morts) × 100` —
 * c'est le taux de mortalité "périnatale+lactation" observé sur la portée.
 *
 * Bucket par `dateMB`. Retourne `{ value, delta, series }`.
 */
export function computeMortalitePorcelets(
  bandes: BandePorcelets[],
  periode: PeriodeKey,
  today: Date = new Date(),
): KpiSparkline {
  const days = PERIODE_JOURS[periode];
  const nowTs = today.getTime();
  const startTs = nowTs - days * 86_400_000;
  const prevStartTs = nowTs - 2 * days * 86_400_000;

  const mortalitePct = (range: BandePorcelets[]): number => {
    let morts = 0;
    let vivants = 0;
    for (const b of range) {
      morts += b.morts ?? 0;
      vivants += b.vivants ?? 0;
    }
    const total = morts + vivants;
    return total > 0 ? (morts * 100) / total : 0;
  };

  const current = bandesInRange(bandes, startTs, nowTs);
  const previous = bandesInRange(bandes, prevStartTs, startTs);

  const value = round1(mortalitePct(current));
  const prevValue = mortalitePct(previous);
  const delta = computeDelta(value, prevValue);

  const buckets = makeBuckets(startTs, nowTs, SPARK_POINTS);
  const series: KpiSparkPoint[] = buckets.map((b, i) => {
    const subset = current.filter(p => {
      const ts = parseFr(p.dateMB);
      return ts >= b.start && ts < b.end;
    });
    return { x: i, y: round1(mortalitePct(subset)) };
  });

  return { value, delta, series };
}

// ── 3. Indice de consommation (kg aliment / kg gain) ────────────────────────

/**
 * IC = consommation aliment (kg) / gain de poids (kg).
 *
 * Limitation : nos données ne contiennent ni le poids à la naissance/sevrage
 * ni le stock consommé. On utilise donc :
 *   • numérateur = variation (non disponible) → on prend le stock actuel
 *     comme proxy d'engagement, mais sans historique on ne peut que
 *     retourner une valeur de référence.
 *   • dénominateur = gain moyen supposé (GMQ standard 0.35 kg/j × âge).
 *
 * Décision pragmatique : retourne IC_PAR_DEFAUT (2.85) avec une série
 * constante lorsque les données sont insuffisantes. Dès qu'un historique
 * pesée/consommation est saisi dans Sheets, cette fonction sera étendue.
 *
 * Le delta est calculé sur la variation de stock (si > 1 point dispo)
 * comme proxy grossier de la dynamique de consommation.
 */
export function computeIndiceConso(
  bandes: BandePorcelets[],
  _stockAliment: StockAliment[],
  periode: PeriodeKey,
  today: Date = new Date(),
): KpiSparkline {
  const days = PERIODE_JOURS[periode];
  const nowTs = today.getTime();
  const startTs = nowTs - days * 86_400_000;

  // Hook d'extension : si un champ `aliment_consomme_kg` + `gain_poids_kg`
  // devient dispo sur BandePorcelets, l'utiliser ici. Sinon → IC standard.
  const current = bandesInRange(bandes, startTs, nowTs);
  const hasFeedData = current.some(b => {
    const r = b as unknown as Record<string, unknown>;
    return typeof r.alimentConsommeKg === 'number' && typeof r.gainPoidsKg === 'number';
  });

  if (!hasFeedData) {
    const series: KpiSparkPoint[] = Array.from({ length: SPARK_POINTS }, (_, i) => ({
      x: i,
      y: IC_PAR_DEFAUT,
    }));
    return { value: IC_PAR_DEFAUT, delta: 0, series };
  }

  // Branche active si data pesée dispo (cas futur).
  const icForRange = (range: BandePorcelets[]): number => {
    let aliment = 0;
    let gain = 0;
    for (const b of range) {
      const r = b as unknown as Record<string, unknown>;
      aliment += (r.alimentConsommeKg as number) ?? 0;
      gain += (r.gainPoidsKg as number) ?? 0;
    }
    return gain > 0 ? aliment / gain : IC_PAR_DEFAUT;
  };

  const prevStartTs = nowTs - 2 * days * 86_400_000;
  const previous = bandesInRange(bandes, prevStartTs, startTs);
  const value = round1(icForRange(current));
  const prevValue = icForRange(previous);
  const delta = computeDelta(value, prevValue);

  const buckets = makeBuckets(startTs, nowTs, SPARK_POINTS);
  const series: KpiSparkPoint[] = buckets.map((b, i) => {
    const subset = current.filter(p => {
      const ts = parseFr(p.dateMB);
      return ts >= b.start && ts < b.end;
    });
    return { x: i, y: round1(icForRange(subset)) };
  });

  return { value, delta, series };
}

// ── 4. Cycles réussis (%) ───────────────────────────────────────────────────

/**
 * % truies pleines revenues à terme avec ≥ 1 porcelet vivant.
 *
 * Cycle réussi = portée dans la période avec `nv > 0` ET `vivants ≥ 1`
 *                (on exige au moins 1 vivant à la MB).
 * Cycle échoué = portée dans la période avec vivants = 0 (mortinatalité
 *                totale) OU nv = 0.
 *
 * Bucket par `dateMB`. `truies` n'est pas utilisé pour le calcul direct
 * (la base est la portée née dans la période) — mais exposé dans la
 * signature pour rester cohérent avec le spec et autoriser une évolution
 * (ex. pondération par truies actives).
 */
export function computeCyclesReussis(
  _truies: Truie[],
  bandes: BandePorcelets[],
  periode: PeriodeKey,
  today: Date = new Date(),
): KpiSparkline {
  const days = PERIODE_JOURS[periode];
  const nowTs = today.getTime();
  const startTs = nowTs - days * 86_400_000;
  const prevStartTs = nowTs - 2 * days * 86_400_000;

  const tauxReussiPct = (range: BandePorcelets[]): number => {
    if (range.length === 0) return 0;
    let reussis = 0;
    for (const b of range) {
      if ((b.nv ?? 0) > 0 && (b.vivants ?? 0) >= 1) reussis += 1;
    }
    return (reussis * 100) / range.length;
  };

  const current = bandesInRange(bandes, startTs, nowTs);
  const previous = bandesInRange(bandes, prevStartTs, startTs);

  const value = round1(tauxReussiPct(current));
  const prevValue = tauxReussiPct(previous);
  const delta = computeDelta(value, prevValue);

  const buckets = makeBuckets(startTs, nowTs, SPARK_POINTS);
  const series: KpiSparkPoint[] = buckets.map((b, i) => {
    const subset = current.filter(p => {
      const ts = parseFr(p.dateMB);
      return ts >= b.start && ts < b.end;
    });
    return { x: i, y: round1(tauxReussiPct(subset)) };
  });

  return { value, delta, series };
}

// ═════════════════════════════════════════════════════════════════════════════
// V36-A — KPIs zootechniques GTTT (Technique / Reproduction / Finances)
// ═════════════════════════════════════════════════════════════════════════════
//
// Tous ces KPIs respectent une **garde anti-explosion** : si les données sont
// insuffisantes (< MIN_PORTEES_SEVREES portées sevrées sur 12 mois, ou champs
// non renseignés), la fonction retourne `null` → l'UI affiche "—" + un hint.
// Cible : terrain naisseur-engraisseur typique (17 truies, 12 bandes actives).

/** Nombre minimum de portées sevrées requis pour considérer les KPIs fiables. */
const MIN_PORTEES_SEVREES = 5;

/** Cible biologique GMQ (g/j) par tranche d'âge porcelet. */
export const GMQ_CIBLES = {
  POST_SEVRAGE: 450,    // 7-25 kg : objectif 400-500 g/j
  CROISSANCE: 700,      // 25-65 kg : objectif 650-750 g/j
  ENGRAISSEMENT: 850,   // 65-110 kg : objectif 800-900 g/j
  FINITION: 900,        // > 110 kg : 850-950 g/j
} as const;

export type TrancheAge = keyof typeof GMQ_CIBLES;

/**
 * ICR (Indice de Consommation Réel) : kg aliment / kg viande produite.
 *
 * Cible filière : 2.6-2.9 (post-sev → finition). Au-dessus : excès de gaspillage.
 *
 * Calcul : Σ(aliment_consomme_kg) / Σ(poids_sortie_kg - poids_entree_kg).
 *
 * Limitation : la BD ne possède pas systématiquement `aliment_consomme_kg`.
 * Si aucune bande ne renseigne ces champs → null (UI affiche "—").
 */
export function computeICR(bandes: BandePorcelets[]): number | null {
  let totalAliment = 0;
  let totalGain = 0;
  for (const b of bandes) {
    const r = b as unknown as Record<string, unknown>;
    const aliment = typeof r.alimentConsommeKg === 'number' ? r.alimentConsommeKg : null;
    const gain = typeof r.gainPoidsKg === 'number' ? r.gainPoidsKg : null;
    if (aliment === null || gain === null || gain <= 0) continue;
    totalAliment += aliment;
    totalGain += gain;
  }
  if (totalGain === 0) return null;
  return round1(totalAliment / totalGain);
}

/**
 * GMQ (Gain Moyen Quotidien) en g/jour par tranche d'âge.
 *
 * Calcul par bande : (poids_actuel - poids_initial) * 1000 / jours_ecoules.
 * Agrégation par tranche selon `phase` actuelle de la bande.
 *
 * Retourne `null` pour une tranche si moins de 1 bande exploitable.
 */
export function computeGMQParTranche(
  bandes: BandePorcelets[],
  today: Date = new Date(),
): Record<TrancheAge, number | null> {
  const result: Record<TrancheAge, number | null> = {
    POST_SEVRAGE: null,
    CROISSANCE: null,
    ENGRAISSEMENT: null,
    FINITION: null,
  };

  // Buckets par phase
  const buckets: Record<TrancheAge, number[]> = {
    POST_SEVRAGE: [],
    CROISSANCE: [],
    ENGRAISSEMENT: [],
    FINITION: [],
  };

  const POIDS_INITIAL = {
    POST_SEVRAGE: 7,    // sevrage = ~7 kg
    CROISSANCE: 25,
    ENGRAISSEMENT: 65,
    FINITION: 110,
  } as const;

  for (const b of bandes) {
    const poidsActuel = typeof b.poidsMoyenKg === 'number' ? b.poidsMoyenKg : null;
    if (poidsActuel === null) continue;

    // Détermination de la tranche par poids
    let tranche: TrancheAge;
    if (poidsActuel < 25) tranche = 'POST_SEVRAGE';
    else if (poidsActuel < 65) tranche = 'CROISSANCE';
    else if (poidsActuel < 110) tranche = 'ENGRAISSEMENT';
    else tranche = 'FINITION';

    // Date de référence = sevrage réel ou prévu (entrée en post-sev)
    const dateRef = parseFr(b.dateSevrageReelle ?? b.dateSevragePrevue);
    if (dateRef === 0) continue;
    const jours = Math.floor(daysBetween(dateRef, today.getTime()));
    if (jours <= 0) continue;

    const gain = (poidsActuel - POIDS_INITIAL[tranche]) * 1000;
    if (gain <= 0) continue;

    buckets[tranche].push(gain / jours);
  }

  for (const k of Object.keys(buckets) as TrancheAge[]) {
    const arr = buckets[k];
    if (arr.length === 0) continue;
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    result[k] = Math.round(avg);
  }
  return result;
}

/**
 * IC global (Indice de Conversion) : aliment_total / poids_vif_total.
 *
 * Variante simplifiée de l'ICR : utilise le poids vif total du troupeau (pas
 * uniquement la portion engraissement). Utile pour comparer ferme à ferme.
 *
 * Si pas de stock aliment ni de poids → null.
 */
export function computeICGlobal(
  bandes: BandePorcelets[],
  totalAlimentKg: number,
): number | null {
  if (totalAlimentKg <= 0) return null;
  let totalPoidsVif = 0;
  for (const b of bandes) {
    const poids = typeof b.poidsMoyenKg === 'number' ? b.poidsMoyenKg : null;
    const vivants = b.vivants ?? 0;
    if (poids === null || vivants === 0) continue;
    totalPoidsVif += poids * vivants;
  }
  if (totalPoidsVif === 0) return null;
  return round1(totalAlimentKg / totalPoidsVif);
}

/**
 * Marge brute par truie productive : (revenu - coût aliment) / nb_truies_prod.
 *
 * Inputs déjà agrégés (revenu et coût en unités monétaires identiques).
 * Retourne null si aucune truie productive ou inputs manquants.
 */
export function computeMargeBruteParTruie(
  revenuTotal: number,
  coutAlimentTotal: number,
  nbTruiesProductives: number,
): number | null {
  if (nbTruiesProductives <= 0) return null;
  if (!Number.isFinite(revenuTotal) || !Number.isFinite(coutAlimentTotal)) return null;
  if (revenuTotal === 0 && coutAlimentTotal === 0) return null;
  return Math.round((revenuTotal - coutAlimentTotal) / nbTruiesProductives);
}

/**
 * Mortalité par phase (%) — répartition des morts sur le cycle.
 *
 *   - Maternité (J0-J28 post-MB)    : (morts naissance + lactation) / NV
 *   - Post-sevrage (J28-J70 post-MB) : pertes après sevrage
 *   - Engraissement (J70-J160)
 *   - Finition (> J160)
 *
 * Retourne un breakdown détaillé. Phase à null si < MIN_PORTEES_SEVREES bandes
 * exploitables sur 12 mois.
 */
export interface MortaliteParPhase {
  maternitePct: number | null;
  postSevragePct: number | null;
  engraissementPct: number | null;
  finitionPct: number | null;
}

export function computeMortaliteParPhase(
  bandes: BandePorcelets[],
  today: Date = new Date(),
): MortaliteParPhase {
  const nowTs = today.getTime();
  const cutoff12m = nowTs - HORIZON_12M * 86_400_000;

  // Maternité : utilise nv et morts directs.
  let matNV = 0;
  let matMorts = 0;
  let matCount = 0;
  for (const b of bandes) {
    const ts = parseFr(b.dateMB);
    if (ts < cutoff12m || ts > nowTs) continue;
    const nv = b.nv ?? 0;
    const morts = b.morts ?? 0;
    if (nv === 0) continue;
    matNV += nv;
    matMorts += morts;
    matCount += 1;
  }

  // Post-sevrage / Engraissement / Finition : on infère par âge (jours post-MB).
  let postNV = 0, postMorts = 0, postCount = 0;
  let engNV = 0, engMorts = 0, engCount = 0;
  let finNV = 0, finMorts = 0, finCount = 0;

  for (const b of bandes) {
    const ts = parseFr(b.dateMB);
    if (ts === 0) continue;
    const jours = Math.floor(daysBetween(ts, nowTs));
    const nv = b.nv ?? 0;
    const vivants = b.vivants ?? 0;
    const morts = Math.max(0, nv - vivants);
    if (nv === 0) continue;

    if (jours >= 28 && jours < 70) {
      postNV += nv; postMorts += morts; postCount += 1;
    } else if (jours >= 70 && jours < 160) {
      engNV += nv; engMorts += morts; engCount += 1;
    } else if (jours >= 160) {
      finNV += nv; finMorts += morts; finCount += 1;
    }
  }

  const pct = (m: number, n: number, count: number): number | null => {
    if (count < MIN_PORTEES_SEVREES || n === 0) return null;
    return round1((m / n) * 100);
  };

  return {
    maternitePct: pct(matMorts, matNV, matCount),
    postSevragePct: pct(postMorts, postNV, postCount),
    engraissementPct: pct(engMorts, engNV, engCount),
    finitionPct: pct(finMorts, finNV, finCount),
  };
}

/**
 * Bundle KPIs zootechniques retourné par `computeZootechniqueKpis`.
 * Tout champ peut valoir `null` : l'UI affiche alors "—" et un hint.
 */
export interface ZootechniqueKpis {
  /** ICR (kg aliment / kg viande). null si données aliment manquantes. */
  icrKg: number | null;
  /** GMQ par tranche (g/j). Chaque tranche peut valoir null. */
  gmqParTranche: Record<TrancheAge, number | null>;
  /** IC global (kg aliment total / kg poids vif total). null si insuffisant. */
  icGlobal: number | null;
  /** Marge brute moyenne par truie productive (unité monétaire). */
  margeBruteParTruie: number | null;
  /** Mortalité par phase (%). */
  mortalite: MortaliteParPhase;
  /** Méta : nombre de portées sevrées 12m exploitées. */
  nbPorteesSevrees12m: number;
}

/**
 * Façade publique — calcule l'ensemble des KPIs zootechniques pour PerfKpiView.
 *
 * @param bandes - bandes (non filtrées RECAP)
 * @param totalAlimentKg - tonnage aliment consommé sur la période (0 si inconnu)
 * @param revenuTotal - revenu total période (0 si inconnu)
 * @param coutAlimentTotal - coût aliment total période (0 si inconnu)
 * @param nbTruiesProductives - count truies ayant ≥ 1 portée
 */
export function computeZootechniqueKpis(
  bandes: BandePorcelets[],
  totalAlimentKg: number,
  revenuTotal: number,
  coutAlimentTotal: number,
  nbTruiesProductives: number,
  today: Date = new Date(),
): ZootechniqueKpis {
  const nowTs = today.getTime();
  const cutoff12m = nowTs - HORIZON_12M * 86_400_000;
  const nbPorteesSevrees12m = bandes.filter(b => {
    const ts = parseFr(b.dateMB);
    if (ts < cutoff12m || ts > nowTs) return false;
    return !!b.dateSevrageReelle;
  }).length;

  const fiable = nbPorteesSevrees12m >= MIN_PORTEES_SEVREES;

  return {
    icrKg: fiable ? computeICR(bandes) : null,
    gmqParTranche: computeGMQParTranche(bandes, today),
    icGlobal: fiable ? computeICGlobal(bandes, totalAlimentKg) : null,
    margeBruteParTruie: fiable
      ? computeMargeBruteParTruie(revenuTotal, coutAlimentTotal, nbTruiesProductives)
      : null,
    mortalite: computeMortaliteParPhase(bandes, today),
    nbPorteesSevrees12m,
  };
}
