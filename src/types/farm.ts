export type DataSource = 'NETWORK' | 'CACHE' | 'FALLBACK';
export type SyncStatus = 'synced' | 'pending' | 'offline';

export interface TableIndexEntry {
  key: string;
  sheetName: string;
  headerRow: number;
  idHeader: string;
  module: string;
}

/**
 * Statuts autorisés côté UI. Fallback `string` pour tolérer les valeurs
 * Sheets non encore normalisées (legacy, stades intermédiaires).
 */
export type TruieStatut =
  | 'En attente saillie'
  | 'En maternité'
  | 'Pleine'
  | 'À surveiller'
  | string;

export type VerratStatut = 'Actif' | string;

export type BandeStatut = 'Sous mère' | 'Sevrés' | 'RECAP' | string;

export type StockStatut = 'OK' | 'BAS' | 'RUPTURE' | string;

export interface Truie {
  id: string;
  displayId: string;
  boucle: string;
  nom?: string;
  statut: TruieStatut;
  stade?: string;
  ration: number;
  nbPortees?: number;
  derniereNV?: number;
  dateMBPrevue?: string;
  notes?: string;
  synced: boolean;
  raw?: (string | number | boolean)[];
}

export interface Verrat {
  id: string;
  displayId: string;
  boucle: string;
  nom?: string;
  statut: VerratStatut;
  origine?: string;
  alimentation?: string;
  ration: number;
  notes?: string;
  synced: boolean;
  raw?: (string | number | boolean)[];
}

export interface BandePorcelets {
  id: string;
  idPortee: string;
  truie?: string;
  boucleMere?: string;
  dateMB?: string;
  nv?: number;
  morts?: number;
  vivants?: number;
  statut: BandeStatut;
  dateSevragePrevue?: string;
  dateSevrageReelle?: string;
  /** Nombre de mâles après séparation par sexe (J+70 post-sevrage). Undefined avant séparation. */
  nbMales?: number;
  /** Nombre de femelles après séparation. */
  nbFemelles?: number;
  /** Loge d'engraissement : 'M' (mâles) ou 'F' (femelles). Une bande séparée en 2 crée 2 lignes logiquement. */
  logeEngraissement?: 'M' | 'F';
  /** Date de séparation par sexe (dd/MM/yyyy ou ISO). */
  dateSeparation?: string;
  notes?: string;
  synced: boolean;
  raw?: (string | number | boolean)[];
}

export interface TraitementSante {
  id: string;
  date: string;
  cibleType: 'TRUIE' | 'VERRAT' | 'BANDE' | 'GENERAL';
  cibleId: string;
  typeSoin: string;
  traitement: string;
  observation: string;
  auteur?: string;
  synced: boolean;
}

export interface StockAliment {
  id: string;
  libelle: string;
  stockActuel: number;
  unite: string;
  seuilAlerte: number;
  statutStock: StockStatut;
  notes?: string;
}

export interface StockVeto {
  id: string;
  produit: string;
  type?: string;
  usage?: string;
  stockActuel: number;
  unite: string;
  stockMin?: number;
  seuilAlerte: number;
  statutStock?: StockStatut;
  notes?: string;
}

/**
 * Alerte lue depuis la feuille Sheets `ALERTES_ACTIVES`.
 * Distincte de l'`Alert`/`FarmAlert` calculée localement par `alertEngine`.
 * Les deux coexistent — `alertesServeur` reflète le backend, `alerts` reflète
 * le moteur local (GTTT).
 */
export interface AlerteServeur {
  priorite: 'CRITIQUE' | 'HAUTE' | 'NORMALE' | 'INFO';
  categorie: 'BANDES' | 'REPRO' | 'STOCK' | string;
  sujet: string;
  description: string;
  actionRequise: string;
  date: string;
}

/**
 * Une saillie enregistrée dans la feuille `SUIVI_REPRODUCTION_ACTUEL`.
 * Couple truie × verrat + date prévue de MB. Permet de relier un verrat
 * aux portées qu'il a engendrées (via match date MB).
 */
export interface Saillie {
  /** ID de la truie (ex: T01). Mappe la colonne `ID Truie`. */
  truieId: string;
  /** Boucle snapshot de la truie au moment de la saillie (optionnel). */
  truieBoucle?: string;
  /** Nom snapshot de la truie (optionnel). */
  truieNom?: string;
  /** Date de saillie au format dd/MM/yyyy. */
  dateSaillie: string;
  /** ID du verrat (ex: V01). */
  verratId: string;
  /** Date de mise-bas prévue au format dd/MM/yyyy (si connue). */
  dateMBPrevue?: string;
  /** Statut de la saillie (ex: CONFIRMEE, EN_ATTENTE, ECHEC). */
  statut?: string;
  notes?: string;
  raw?: unknown[];
}

/** Niveau de performance synthétique — code couleur dans l'UI. */
export type PerformanceTier = 'ELITE' | 'BON' | 'MOYEN' | 'FAIBLE' | 'INSUFFISANT';

/**
 * Performance calculée d'une truie à partir de ses portées + saillies.
 * Tous les nombres sont arrondis à 1 décimale côté UI ; brut ici.
 */
export interface TruiePerformance {
  nbPortees: number;
  /** Portées dont la MB est enregistrée (avec NV). */
  nbPorteesAvecMB: number;
  /** Moyenne NV sur toutes les portées. 0 si aucune. */
  moyNV: number;
  moyMortsParPortee: number;
  /** (Vivants / NV) × 100. 0 si NV = 0. */
  tauxSurvieNaissance: number;
  /** (Vivants sevrés / NV) × 100. 0 si NV = 0. */
  tauxSevrage: number;
  nbSaillies: number;
  /** Saillies ayant abouti à une portée enregistrée. */
  nbSailliesReussies: number;
  /** (Saillies réussies / saillies totales) × 100. 0 si aucune saillie. */
  tauxFertilite: number;
  dernierSailliesDate?: string;
  dernierMBDate?: string;
  /** Score composite 0-100. 0 si données insuffisantes (tier INSUFFISANT). */
  scoreCompetence: number;
  tier: PerformanceTier;
}

/**
 * Performance calculée d'un verrat à partir des saillies qu'il a effectuées
 * et des portées résultantes (matchées via saillie.truieId ↔ bande.truie).
 */
export interface VerratPerformance {
  nbSaillies: number;
  /** Portées engendrées (matchées via saillie → bande). */
  nbPorteesEngendrees: number;
  /** Moyenne NV des portées engendrées. 0 si aucune. */
  moyNVEngendrees: number;
  /** (Saillies → portée / saillies totales) × 100. */
  tauxSuccesSaillie: number;
  derniereSailliesDate?: string;
  /** Score composite 0-100. 0 si données insuffisantes. */
  scoreFertilite: number;
  tier: PerformanceTier;
}

export interface FarmState {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  sante: TraitementSante[];
  stockAliment: StockAliment[];
  stockVeto: StockVeto[];
  /** Headers Sheet par table (ordre réel des colonnes) — mis à jour à chaque fetch. */
  truiesHeader: string[];
  verratsHeader: string[];
  bandesHeader: string[];
  santeHeader: string[];
  stockAlimentHeader: string[];
  stockVetoHeader: string[];
  lastUpdate: number;
  syncStatus: SyncStatus;
}

// ─── FINANCES ────────────────────────────────────────────────────────────────

/** Type d'entrée financière : DEPENSE (charges) ou REVENU (ventes, subventions). */
export type FinanceType = 'DEPENSE' | 'REVENU';

/**
 * Entrée comptable brute lue depuis la feuille Sheets `FINANCES`.
 * Schéma présumé (tolérant aux variantes) :
 *   Date/Période · Catégorie · Libellé · Montant · Type · Notes
 *
 * `montant` est toujours positif (valeur absolue) ; le signe est porté par
 * `type`. Ça évite l'ambiguïté côté UI et permet des agrégats simples.
 */
export interface FinanceEntry {
  /** Date au format dd/MM/yyyy (FR) — ou chaîne vide si non renseignée. */
  date: string;
  /** Catégorie libre : ALIMENT, SANTE, GENETIQUE, ENERGIE, REVENU_VENTE… */
  categorie: string;
  /** Libellé libre (description saisie par l'utilisateur). */
  libelle: string;
  /** Montant en valeur absolue. Devise inférée côté analyzer. */
  montant: number;
  /** Sens de l'opération. */
  type: FinanceType;
  notes?: string;
  raw?: unknown[];
}

// ─── ALIMENT FORMULES (feuille ALIMENT_FORMULES) ─────────────────────────────

/**
 * Ligne brute (long format) lue depuis la feuille Sheets `ALIMENT_FORMULES`.
 * 1 ligne = 1 composant (ingrédient ou additif) pour 1 phase donnée.
 *
 * Clé logique unique : `codePhase + typeComposant + nom`.
 * L'agrégation en objets `FormuleAliment` est faite côté client via
 * `aggregateFormulesFromRows` (cf. src/config/aliments.ts).
 *
 * Unités :
 *  - INGREDIENT : `unite = '%'` toujours, `valeur` ∈ [0, 100]
 *  - ADDITIF    : `unite = 'kg/T' | 'g/T'`, `valeur` = dose
 */
export interface FormuleRowSheets {
  /** Code machine de la phase : DEMARRAGE_1, CROISSANCE, FINITION, TRUIE_GESTATION, TRUIE_LACTATION. */
  codePhase: string;
  /** Libellé affichable (ex. "Porcelets — Démarrage 1"). */
  nomPhase: string;
  /** Plage de poids (ex. "7 → 15 kg"). */
  poidsRange: string;
  /** Sépare ingrédients (composition base) et additifs (dosés). */
  typeComposant: 'INGREDIENT' | 'ADDITIF';
  /** Nom du composant (ex. "Romelko", "Lysine"). */
  nom: string;
  /** Valeur numérique — pourcent si INGREDIENT, dose si ADDITIF. */
  valeur: number;
  /** Unité d'expression. */
  unite: '%' | 'kg/T' | 'g/T';
  /** Ordre d'affichage intra-phase (1, 2, 3…). */
  ordre: number;
  /** Notes libres (optionnel). */
  notes?: string;
}

/**
 * Synthèse financière agrégée sur une période donnée (ex: "2026-04" ou "all").
 * Utilisée par l'UI FinancesView pour les KpiCard + bar chart par catégorie.
 */
export interface FinanceSummary {
  /** Identifiant de période : "YYYY-MM" ou "all". */
  periode: string;
  totalDepenses: number;
  totalRevenus: number;
  /** totalRevenus - totalDepenses. Peut être négatif. */
  margeNette: number;
  /** Détail par catégorie — dépenses et revenus séparés. */
  parCategorie: Record<string, { depenses: number; revenus: number }>;
}
