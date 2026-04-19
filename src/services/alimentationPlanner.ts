/**
 * PorcTrack — Planificateur d'Alimentation (GTTT)
 * ═════════════════════════════════════════════════
 *
 * Calcule la consommation journalière par catégorie d'animaux et
 * la couverture (en jours) des aliments en stock. Pur côté client —
 * aucune mutation du state, aucun I/O.
 *
 * Catégories biologiques (naisseur-engraisseur) :
 *   - Truies en attente saillie / à surveiller → aliment TRUIE GESTATION
 *   - Truies pleines                           → aliment TRUIE GESTATION
 *   - Truies en maternité (allaitantes)        → aliment TRUIE LACTATION
 *   - Verrats                                  → aliment VERRAT (fallback gestation)
 *   - Porcelets sous-mère                      → aliment 1ER ÂGE (post J+7)
 *   - Porcelets sevrés                         → aliment 2E ÂGE (post-sevrage)
 *
 * Les rations individuelles (champ `ration` sur Truie/Verrat) priment
 * sur la ration moyenne de la catégorie quand présentes et > 0.
 */

import type {
  Truie,
  Verrat,
  BandePorcelets,
  StockAliment,
} from '../types/farm';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES BIOLOGIQUES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rations moyennes de fallback (kg/j/animal) utilisées quand la
 * ration individuelle n'est pas renseignée.
 */
export const RATION_DEFAULTS = {
  TRUIE_GESTATION: 2.5,
  TRUIE_LACTATION: 5,
  VERRAT: 3,
  PORCELET_SOUS_MERE: 0.3,
  PORCELET_SEVRE: 0.6,
} as const;

/** Seuils d'alerte sur la couverture stock (en jours). */
export const COVERAGE_THRESHOLDS = {
  /** En dessous : CRITIQUE — réappro urgente (rupture imminente). */
  CRITIQUE: 7,
  /** En dessous (et ≥ CRITIQUE) : HAUTE — à commander cette semaine. */
  HAUTE: 14,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Clé logique de catégorie — stable pour tri / UI / tests. */
export type FeedCategoryKey =
  | 'TRUIES_ATTENTE'
  | 'TRUIES_PLEINES'
  | 'TRUIES_MATERNITE'
  | 'TRUIES_SURVEILLER'
  | 'VERRATS'
  | 'PORCELETS_SOUS_MERE'
  | 'PORCELETS_SEVRES';

/** Type d'aliment ciblé par une catégorie. Sert au matching StockAliment. */
export type FeedType =
  | 'TRUIE_GESTATION'
  | 'TRUIE_LACTATION'
  | 'VERRAT'
  | 'PREMIER_AGE'
  | 'DEUXIEME_AGE';

/** Bilan conso pour une catégorie d'animaux. */
export interface CategoryConsumption {
  key: FeedCategoryKey;
  /** Libellé FR pour l'UI (ex: "Truies pleines"). */
  label: string;
  /** Nombre d'animaux dans la catégorie. */
  effectif: number;
  /** Ration journalière moyenne effective (kg/j/animal). */
  rationMoyenne: number;
  /** Consommation journalière totale (kg/j). */
  consommationJournaliere: number;
  /** Type d'aliment que cette catégorie consomme. */
  feedType: FeedType;
}

/** Bilan couverture pour un aliment stocké. */
export interface FeedCoverage {
  stock: StockAliment;
  /** Type détecté via matching du libellé (null si aucun match). */
  feedType: FeedType | null;
  /** Catégories consommant cet aliment (références pour l'UI). */
  categoriesConsommatrices: CategoryConsumption[];
  /** Conso journalière cumulée (kg/j) de toutes les catégories ciblant ce type. */
  consommationJournaliere: number;
  /** Jours de couverture restants — Infinity si conso = 0. */
  joursCouverture: number;
  /** Niveau d'urgence dérivé de `joursCouverture`. */
  statutCouverture: 'CRITIQUE' | 'HAUTE' | 'OK' | 'INCONNU';
}

/** Résultat complet de la planification. */
export interface AlimentationPlan {
  categories: CategoryConsumption[];
  coverages: FeedCoverage[];
  /** Consommation journalière cumulée tous aliments confondus. */
  consommationJournaliereTotale: number;
  /** Stock total (kg) — somme de `stockActuel`. */
  stockTotal: number;
  /** Jours de couverture moyens (pondérés par conso). Infinity si conso = 0. */
  joursCouvertureMoyenne: number;
}

export interface PlanInput {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  stockAliment: StockAliment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Teste si un statut truie correspond à la catégorie demandée.
 * Tolère la casse + les variations Sheets (statuts fallback `string`).
 */
function statutIncludes(statut: string, needle: string): boolean {
  return statut.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Moyenne des rations individuelles > 0, ou valeur fallback si aucune
 * ration valide. Évite les NaN en cas de liste vide.
 */
function rationMoyenneOuFallback(
  animals: Array<{ ration: number }>,
  fallback: number
): number {
  const valides = animals.filter(a => typeof a.ration === 'number' && a.ration > 0);
  if (valides.length === 0) return fallback;
  const sum = valides.reduce((s, a) => s + a.ration, 0);
  return sum / valides.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCUL DES CONSOMMATIONS PAR CATÉGORIE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtre les truies en attente de saillie (statut inclut "attente").
 * → consomment de l'aliment truie gestation.
 */
export function truiesEnAttente(truies: Truie[]): Truie[] {
  return truies.filter(t => statutIncludes(t.statut, 'attente'));
}

/**
 * Filtre les truies pleines (statut inclut "Pleine", case insensitive).
 * → consomment de l'aliment truie gestation.
 */
export function truiesPleines(truies: Truie[]): Truie[] {
  return truies.filter(t => statutIncludes(t.statut, 'pleine'));
}

/**
 * Filtre les truies en maternité / allaitantes (statut inclut "maternité").
 * → consomment de l'aliment truie lactation.
 */
export function truiesEnMaternite(truies: Truie[]): Truie[] {
  return truies.filter(t => statutIncludes(t.statut, 'maternité'));
}

/**
 * Filtre les truies à surveiller (statut inclut "surveiller").
 * → consomment de l'aliment truie gestation (ration conservatoire).
 */
export function truiesASurveiller(truies: Truie[]): Truie[] {
  return truies.filter(t => statutIncludes(t.statut, 'surveiller'));
}

/**
 * Compte les porcelets vivants dans les bandes « Sous mère ».
 * → consomment de l'aliment 1er âge (post J+7 — avant c'est le lait).
 */
export function porceletsSousMere(bandes: BandePorcelets[]): number {
  return bandes
    .filter(b => statutIncludes(b.statut, 'sous mère') || statutIncludes(b.statut, 'sous mere'))
    .reduce((sum, b) => sum + (b.vivants ?? 0), 0);
}

/**
 * Compte les porcelets vivants dans les bandes « Sevrés ».
 * → consomment de l'aliment 2e âge (post-sevrage).
 */
export function porceletsSevres(bandes: BandePorcelets[]): number {
  return bandes
    .filter(b => statutIncludes(b.statut, 'sevré'))
    .reduce((sum, b) => sum + (b.vivants ?? 0), 0);
}

/**
 * Calcule la consommation journalière (kg/j) d'une catégorie :
 *   effectif × ration moyenne effective.
 *
 * Retourne 0 si effectif = 0 (pas de conso = pas de consommation).
 */
export function consommationCategorie(
  effectif: number,
  rationMoyenne: number
): number {
  if (effectif <= 0 || rationMoyenne <= 0) return 0;
  return effectif * rationMoyenne;
}

/**
 * Produit le bilan complet des 7 catégories GTTT à partir du troupeau.
 * Retourne toutes les catégories — y compris celles à 0 animaux — pour
 * que l'UI puisse les afficher en "non concerné" si besoin.
 */
export function buildCategoryConsumptions(
  input: Pick<PlanInput, 'truies' | 'verrats' | 'bandes'>
): CategoryConsumption[] {
  const { truies, verrats, bandes } = input;

  const attente = truiesEnAttente(truies);
  const pleines = truiesPleines(truies);
  const maternite = truiesEnMaternite(truies);
  const surveiller = truiesASurveiller(truies);

  const nPorceletsSousMere = porceletsSousMere(bandes);
  const nPorceletsSevres = porceletsSevres(bandes);

  const rationAttente = rationMoyenneOuFallback(attente, RATION_DEFAULTS.TRUIE_GESTATION);
  const rationPleines = rationMoyenneOuFallback(pleines, RATION_DEFAULTS.TRUIE_GESTATION);
  const rationMaternite = rationMoyenneOuFallback(maternite, RATION_DEFAULTS.TRUIE_LACTATION);
  const rationSurveiller = rationMoyenneOuFallback(surveiller, RATION_DEFAULTS.TRUIE_GESTATION);
  const rationVerrats = rationMoyenneOuFallback(verrats, RATION_DEFAULTS.VERRAT);

  return [
    {
      key: 'TRUIES_ATTENTE',
      label: 'Truies en attente saillie',
      effectif: attente.length,
      rationMoyenne: rationAttente,
      consommationJournaliere: consommationCategorie(attente.length, rationAttente),
      feedType: 'TRUIE_GESTATION',
    },
    {
      key: 'TRUIES_PLEINES',
      label: 'Truies pleines',
      effectif: pleines.length,
      rationMoyenne: rationPleines,
      consommationJournaliere: consommationCategorie(pleines.length, rationPleines),
      feedType: 'TRUIE_GESTATION',
    },
    {
      key: 'TRUIES_MATERNITE',
      label: 'Truies en maternité',
      effectif: maternite.length,
      rationMoyenne: rationMaternite,
      consommationJournaliere: consommationCategorie(maternite.length, rationMaternite),
      feedType: 'TRUIE_LACTATION',
    },
    {
      key: 'TRUIES_SURVEILLER',
      label: 'Truies à surveiller',
      effectif: surveiller.length,
      rationMoyenne: rationSurveiller,
      consommationJournaliere: consommationCategorie(surveiller.length, rationSurveiller),
      feedType: 'TRUIE_GESTATION',
    },
    {
      key: 'VERRATS',
      label: 'Verrats',
      effectif: verrats.length,
      rationMoyenne: rationVerrats,
      consommationJournaliere: consommationCategorie(verrats.length, rationVerrats),
      feedType: 'VERRAT',
    },
    {
      key: 'PORCELETS_SOUS_MERE',
      label: 'Porcelets sous-mère',
      effectif: nPorceletsSousMere,
      rationMoyenne: RATION_DEFAULTS.PORCELET_SOUS_MERE,
      consommationJournaliere: consommationCategorie(
        nPorceletsSousMere,
        RATION_DEFAULTS.PORCELET_SOUS_MERE
      ),
      feedType: 'PREMIER_AGE',
    },
    {
      key: 'PORCELETS_SEVRES',
      label: 'Porcelets sevrés',
      effectif: nPorceletsSevres,
      rationMoyenne: RATION_DEFAULTS.PORCELET_SEVRE,
      consommationJournaliere: consommationCategorie(
        nPorceletsSevres,
        RATION_DEFAULTS.PORCELET_SEVRE
      ),
      feedType: 'DEUXIEME_AGE',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING LIBELLÉ ALIMENT → TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détecte le type d'aliment d'après le libellé StockAliment.
 * Stratégie : recherche de mots-clés case-insensitive, **lactation/maternité
 * testées AVANT gestation** pour éviter qu'un libellé "Aliment truie lactation"
 * matche bêtement sur "truie".
 *
 * Retourne `null` si aucun match — le stock sera alors classé "non catégorisé".
 *
 * @example matchFeedType('Aliment truie gestation') === 'TRUIE_GESTATION'
 * @example matchFeedType('Aliment 1er âge')         === 'PREMIER_AGE'
 * @example matchFeedType('Tourteau de soja')        === null
 */
export function matchFeedType(libelle: string): FeedType | null {
  const l = libelle.toLowerCase();

  // VERRAT en premier — mot rarement combiné.
  if (l.includes('verrat')) return 'VERRAT';

  // Truie : lactation/maternité AVANT gestation (sinon collision).
  if (l.includes('truie')) {
    if (l.includes('lactation') || l.includes('allait') || l.includes('maternité') || l.includes('maternite')) {
      return 'TRUIE_LACTATION';
    }
    if (l.includes('gestation') || l.includes('gestant')) {
      return 'TRUIE_GESTATION';
    }
    // Truie sans sous-type → gestation par défaut (majorité du cycle).
    return 'TRUIE_GESTATION';
  }

  // Porcelets / aliments 1er-2e âge.
  // 2e âge / post-sevrage AVANT 1er âge (overlap sur "porcelet").
  if (
    l.includes('2e âge') ||
    l.includes('2eme age') ||
    l.includes('2ème âge') ||
    l.includes('post-sevrage') ||
    l.includes('post sevrage') ||
    l.includes('deuxième') ||
    l.includes('deuxieme')
  ) {
    return 'DEUXIEME_AGE';
  }

  if (
    l.includes('1er âge') ||
    l.includes('1er age') ||
    l.includes('1ere') ||
    l.includes('premier âge') ||
    l.includes('premier age') ||
    l.includes('première') ||
    l.includes('premiere')
  ) {
    return 'PREMIER_AGE';
  }

  // Fallback générique "porcelet" sans précision → 1er âge (le plus jeune).
  if (l.includes('porcelet')) return 'PREMIER_AGE';

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COUVERTURE STOCK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Jours de couverture = stockActuel / consommationJournaliere.
 * - Si conso = 0 → `Infinity` (stock inutilisé, couverture infinie).
 * - Si stock ≤ 0 → 0.
 */
export function joursCouverture(
  stockActuel: number,
  consommationJournaliere: number
): number {
  if (stockActuel <= 0) return 0;
  if (consommationJournaliere <= 0) return Infinity;
  return stockActuel / consommationJournaliere;
}

/**
 * Dérive le statut de couverture depuis les jours restants.
 * - < 7j  → CRITIQUE (rupture imminente)
 * - < 14j → HAUTE    (à commander sous la semaine)
 * - ≥ 14j → OK
 *
 * `INCONNU` réservé au cas où la couverture est Infinity (conso=0)
 * pour que l'UI ne clame pas faussement "OK" sur un aliment jamais
 * consommé (p. ex. aliment non matché à une catégorie).
 */
export function statutCouverture(
  jours: number
): 'CRITIQUE' | 'HAUTE' | 'OK' | 'INCONNU' {
  if (!isFinite(jours)) return 'INCONNU';
  if (jours < COVERAGE_THRESHOLDS.CRITIQUE) return 'CRITIQUE';
  if (jours < COVERAGE_THRESHOLDS.HAUTE) return 'HAUTE';
  return 'OK';
}

/**
 * Pour un `StockAliment` donné, calcule :
 *  1. son type détecté via `matchFeedType(libelle)`,
 *  2. la conso cumulée des catégories qui ciblent ce type,
 *  3. les jours de couverture + statut.
 */
export function buildFeedCoverage(
  stock: StockAliment,
  categories: CategoryConsumption[]
): FeedCoverage {
  const feedType = matchFeedType(stock.libelle);
  const categoriesConsommatrices = feedType
    ? categories.filter(c => c.feedType === feedType && c.consommationJournaliere > 0)
    : [];
  const consommationJournaliere = categoriesConsommatrices.reduce(
    (sum, c) => sum + c.consommationJournaliere,
    0
  );
  const jours = joursCouverture(stock.stockActuel, consommationJournaliere);

  return {
    stock,
    feedType,
    categoriesConsommatrices,
    consommationJournaliere,
    joursCouverture: jours,
    statutCouverture: statutCouverture(jours),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANIFICATION COMPLÈTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le plan d'alimentation complet depuis les données FarmContext.
 * Fonction pure — pas d'I/O, pas d'horloge. Mémoïsable côté React.
 */
export function buildAlimentationPlan(input: PlanInput): AlimentationPlan {
  const categories = buildCategoryConsumptions(input);
  const coverages = input.stockAliment.map(s => buildFeedCoverage(s, categories));

  const consommationJournaliereTotale = categories.reduce(
    (sum, c) => sum + c.consommationJournaliere,
    0
  );
  const stockTotal = input.stockAliment.reduce((sum, s) => sum + (s.stockActuel ?? 0), 0);

  // Moyenne pondérée par conso : ignore les aliments sans conso (Infinity)
  // pour rester représentatif du risque réel.
  const finiteCoverages = coverages.filter(
    c => isFinite(c.joursCouverture) && c.consommationJournaliere > 0
  );
  const sumDenom = finiteCoverages.reduce((s, c) => s + c.consommationJournaliere, 0);
  const joursCouvertureMoyenne =
    sumDenom > 0
      ? finiteCoverages.reduce(
          (s, c) => s + c.joursCouverture * c.consommationJournaliere,
          0
        ) / sumDenom
      : Infinity;

  return {
    categories,
    coverages,
    consommationJournaliereTotale,
    stockTotal,
    joursCouvertureMoyenne,
  };
}

/**
 * Trie les couvertures du plus urgent au moins urgent (CRITIQUE d'abord).
 * Utilisé pour afficher les "Stock critique" en tête dans l'UI.
 */
export function sortCoveragesByUrgency(coverages: FeedCoverage[]): FeedCoverage[] {
  const order: Record<FeedCoverage['statutCouverture'], number> = {
    CRITIQUE: 0,
    HAUTE: 1,
    OK: 2,
    INCONNU: 3,
  };
  return [...coverages].sort((a, b) => {
    const diff = order[a.statutCouverture] - order[b.statutCouverture];
    if (diff !== 0) return diff;
    // À statut égal, on remonte les couvertures les plus courtes.
    return a.joursCouverture - b.joursCouverture;
  });
}
