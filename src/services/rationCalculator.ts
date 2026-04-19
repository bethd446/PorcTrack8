/**
 * Calculateur de rations — formules aliment validées technicien.
 * ════════════════════════════════════════════════════════════════
 *
 * Fonctions pures (pas d'I/O, pas de state). Consomme les formules
 * typées depuis `src/config/aliments.ts` et produit des quantités
 * exactes pour une masse totale donnée.
 *
 * Règles de calcul :
 *  - Ingrédient : `kg = (pourcent / 100) × masseTotaleKg`
 *  - Additif kg/T : `g = dose × masseTotaleKg` (1 kg/T × 1 T = 1 kg = 1000 g)
 *  - Additif g/T : `g = dose × (masseTotaleKg / 1000)`
 *
 * Formatage : `formatQuantite` bascule automatiquement entre grammes
 * (< 1 kg) et kilogrammes (≥ 1 kg) pour lisibilité terrain.
 */

import type { FormuleAliment, AdditifLigne } from '../config/aliments';

export interface IngredientCalcule {
  nom: string;
  pourcent: number;
  /** Quantité exacte en kg pour la masse totale demandée. */
  kg: number;
}

export interface AdditifCalcule {
  nom: string;
  /** Dose de référence (ex. "1 kg/T", "300 g/T"). */
  doseRef: string;
  /** Quantité calculée, exprimée en grammes (unité pivot uniforme). */
  quantite: number;
  /** Même quantité déjà formatée pour affichage (kg ou g selon magnitude). */
  quantiteAffiche: string;
}

export interface CalculResult {
  /** Masse totale en entrée (kg). */
  masseTotaleKg: number;
  /** Ingrédients calculés dans l'ordre de la formule. */
  ingredients: IngredientCalcule[];
  /** Additifs calculés dans l'ordre de la formule. */
  additifs: AdditifCalcule[];
  /** Somme des pourcentages base (devrait être 100). */
  totalBasePct: number;
  /** Avertissements non bloquants (ex. somme % ≠ 100). */
  warnings: string[];
}

/** Formate une dose technicien pour affichage ("1 kg/T", "300 g/T"). */
function formatDoseRef(additif: AdditifLigne): string {
  return `${additif.dose} ${additif.unite}`;
}

/**
 * Convertit une dose additif → grammes, pour une masse totale donnée.
 *  - kg/T : 1 tonne = 1000 kg. `g = (dose × 1000) × (masse / 1000) = dose × masse`
 *  - g/T : `g = dose × (masse / 1000)`
 */
function additifEnGrammes(additif: AdditifLigne, masseTotaleKg: number): number {
  if (additif.unite === 'kg/T') {
    return additif.dose * masseTotaleKg;
  }
  // g/T
  return additif.dose * (masseTotaleKg / 1000);
}

/**
 * Formate une quantité en grammes — < 1000 g → "g", sinon "kg".
 * Retourne toujours une chaîne courte, FR-friendly (point décimal,
 * pour éviter confusion avec les séparateurs locaux sur mobile).
 */
export function formatQuantite(grammes: number): string {
  if (!isFinite(grammes)) return '—';
  if (grammes < 1000) {
    return `${grammes.toFixed(1)} g`;
  }
  return `${(grammes / 1000).toFixed(2)} kg`;
}

/** Somme des pourcentages ingrédients — attendu = 100. */
export function totalPourcentBase(formule: FormuleAliment): number {
  return formule.ingredients.reduce((sum, i) => sum + i.pourcent, 0);
}

/**
 * Calcule la composition détaillée d'une ration pour une masse donnée.
 *
 * @param formule     Formule validée (cf. FORMULES_ALIMENT).
 * @param masseTotaleKg Masse cible en kg (>= 0, utilement > 0).
 */
export function calculerRation(
  formule: FormuleAliment,
  masseTotaleKg: number,
): CalculResult {
  const warnings: string[] = [];
  const masse = Number.isFinite(masseTotaleKg) && masseTotaleKg > 0 ? masseTotaleKg : 0;

  const ingredients: IngredientCalcule[] = formule.ingredients.map((ing) => ({
    nom: ing.nom,
    pourcent: ing.pourcent,
    kg: (ing.pourcent / 100) * masse,
  }));

  const additifs: AdditifCalcule[] = formule.additifs.map((add) => {
    const quantite = additifEnGrammes(add, masse);
    return {
      nom: add.nom,
      doseRef: formatDoseRef(add),
      quantite,
      quantiteAffiche: formatQuantite(quantite),
    };
  });

  const totalBasePct = totalPourcentBase(formule);
  if (Math.abs(totalBasePct - 100) > 0.01) {
    warnings.push(
      `Somme des ingrédients = ${totalBasePct}% (attendu 100%). Vérifier la formule.`,
    );
  }
  if (masseTotaleKg <= 0) {
    warnings.push('Masse totale nulle ou négative — calcul non significatif.');
  }

  return {
    masseTotaleKg: masse,
    ingredients,
    additifs,
    totalBasePct,
    warnings,
  };
}

/** Conso journalière (kg) pour un effectif et une ration unitaire. */
export function consoJournaliereKg(
  effectif: number,
  rationKgParSujetJour: number,
): number {
  if (effectif <= 0 || rationKgParSujetJour <= 0) return 0;
  return effectif * rationKgParSujetJour;
}

/** Conso totale (kg) sur N jours. */
export function consoTotaleKg(
  effectif: number,
  rationKgParSujetJour: number,
  jours: number,
): number {
  if (jours <= 0) return 0;
  return consoJournaliereKg(effectif, rationKgParSujetJour) * jours;
}
