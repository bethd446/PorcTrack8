/**
 * Formules aliment — typage + valeurs par défaut + agrégation depuis Sheets.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * 5 phases couvrant tous les stades du cycle :
 *  - Porcelets : Démarrage 1 (post-sevrage, 7-15 kg)
 *  - Engraissement : Croissance (25-50 kg) + Finition (50-100 kg)
 *  - Reproduction : Truie gestante + Truie lactation
 *
 * Structures typées — consommées par le calculateur de ration
 * (`src/services/rationCalculator.ts`) et l'écran
 * `src/features/ressources/FormulesView.tsx`.
 *
 * Source de vérité **runtime** : feuille Google Sheets `ALIMENT_FORMULES`
 * (long format — cf. `FormuleRowSheets` dans `src/types/farm.ts`).
 * Les valeurs par défaut ci-dessous sont utilisées si la feuille est
 * indisponible ou vide — l'app reste fonctionnelle hors-ligne.
 *
 * Pipeline : Sheets (long rows) → `mapFormuleRow` → `aggregateFormulesFromRows`
 *         → `FormuleAliment[]` → `FormulesView` + `calculerRation`.
 */
import type { FormuleRowSheets } from '../types/farm';

export type PhaseCode =
  | 'DEMARRAGE_1'
  | 'CROISSANCE'
  | 'FINITION'
  | 'TRUIE_GESTATION'
  | 'TRUIE_LACTATION';

export interface IngredientLigne {
  /** Nom affiché de l'ingrédient (ex. "Romelko", "Maïs"). */
  nom: string;
  /** Pourcentage du total de la formule (somme = 100 pour une formule valide). */
  pourcent: number;
}

export interface AdditifLigne {
  /** Nom affiché de l'additif (ex. "Lysine", "Enzymes"). */
  nom: string;
  /** Dose exprimée dans l'unité `unite`. */
  dose: number;
  /** Unité de dosage : kg par tonne d'aliment ou g par tonne. */
  unite: 'kg/T' | 'g/T';
}

export interface FormuleAliment {
  /** Identifiant machine (stable). */
  code: PhaseCode;
  /** Nom affiché complet (ex. "Porcelets — Démarrage 1"). */
  nom: string;
  /** Description de la phase (ex. "Post-sevrage (J21-J42)"). */
  phase: string;
  /** Plage de poids cible (ex. "7 → 15 kg"). */
  poidsRange: string;
  /** Composition base (somme pourcent = 100). */
  ingredients: IngredientLigne[];
  /** Additifs minéraux / enzymes (ajoutés par-dessus la base). */
  additifs: AdditifLigne[];
}

/**
 * Valeurs par défaut (5 formules validées technicien K13 · 04/2026).
 * Utilisées si la feuille `ALIMENT_FORMULES` est indisponible ou vide.
 * Le nom FORMULES_ALIMENT_FALLBACK est requis par le contrat public.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const FORMULES_ALIMENT_FALLBACK: FormuleAliment[] = [
  {
    code: 'DEMARRAGE_1',
    nom: 'Porcelets — Démarrage 1',
    phase: 'Post-sevrage (J21-J42)',
    poidsRange: '7 → 15 kg',
    ingredients: [
      { nom: 'Romelko', pourcent: 50 },
      { nom: 'KPC 5', pourcent: 3 },
      { nom: 'Maïs', pourcent: 34 },
      { nom: 'Son de blé', pourcent: 3 },
      { nom: 'Tourteau de soja', pourcent: 10 },
    ],
    additifs: [
      { nom: 'Lysine', dose: 1, unite: 'kg/T' },
      { nom: 'Méthionine', dose: 0.5, unite: 'kg/T' },
      { nom: 'Enzymes', dose: 300, unite: 'g/T' },
    ],
  },
  {
    code: 'CROISSANCE',
    nom: 'Croissance',
    phase: 'Engraissement — phase 1',
    poidsRange: '25 → 50 kg',
    ingredients: [
      { nom: 'KPC 5', pourcent: 5 },
      { nom: 'Maïs', pourcent: 68 },
      { nom: 'Son de blé', pourcent: 10 },
      { nom: 'Tourteau de soja', pourcent: 17 },
    ],
    additifs: [
      { nom: 'Lysine', dose: 1, unite: 'kg/T' },
      { nom: 'Enzymes', dose: 250, unite: 'g/T' },
    ],
  },
  {
    code: 'FINITION',
    nom: 'Finition',
    phase: 'Engraissement — phase 2',
    poidsRange: '50 → 100 kg',
    ingredients: [
      { nom: 'KPC 5', pourcent: 5 },
      { nom: 'Maïs', pourcent: 70 },
      { nom: 'Son de blé', pourcent: 15 },
      { nom: 'Tourteau de soja', pourcent: 10 },
    ],
    additifs: [
      { nom: 'Lysine', dose: 0.5, unite: 'kg/T' },
      { nom: 'Enzymes', dose: 200, unite: 'g/T' },
    ],
  },
  {
    code: 'TRUIE_GESTATION',
    nom: 'Truie gestante',
    phase: 'Gestation (J0-J113)',
    poidsRange: 'Truies pleines',
    ingredients: [
      { nom: 'KPC 5', pourcent: 5 },
      { nom: 'Maïs', pourcent: 58 },
      { nom: 'Son de blé', pourcent: 30 },
      { nom: 'Tourteau de soja', pourcent: 7 },
    ],
    additifs: [{ nom: 'Enzymes', dose: 200, unite: 'g/T' }],
  },
  {
    code: 'TRUIE_LACTATION',
    nom: 'Truie lactation',
    phase: 'Maternité (J0-J21 post-mise bas)',
    poidsRange: 'Truies allaitantes',
    ingredients: [
      { nom: 'KPC 5', pourcent: 6 },
      { nom: 'Maïs', pourcent: 58 },
      { nom: 'Son de blé', pourcent: 18 },
      { nom: 'Tourteau de soja', pourcent: 18 },
    ],
    additifs: [
      { nom: 'Lysine', dose: 1, unite: 'kg/T' },
      { nom: 'Enzymes', dose: 300, unite: 'g/T' },
    ],
  },
];

/** Libellés courts (chip / labels UI) indexés par code. */
export const PHASE_LABELS: Record<PhaseCode, string> = {
  DEMARRAGE_1: 'Démarrage 1',
  CROISSANCE: 'Croissance',
  FINITION: 'Finition',
  TRUIE_GESTATION: 'Gestation',
  TRUIE_LACTATION: 'Lactation',
};

/** Tone Chip associée à chaque phase (cohérence visuelle transverse). */
export const PHASE_TONES: Record<PhaseCode, 'accent' | 'amber' | 'blue' | 'gold'> = {
  DEMARRAGE_1: 'amber',
  CROISSANCE: 'accent',
  FINITION: 'accent',
  TRUIE_GESTATION: 'blue',
  TRUIE_LACTATION: 'gold',
};

/**
 * Alias rétro-compatible — conserve l'ancien symbole exporté.
 * Les anciens appelants (tests, alimentationPlanner, etc.) continuent
 * à fonctionner sans breaking change d'API.
 */
export const FORMULES_ALIMENT: FormuleAliment[] = FORMULES_ALIMENT_FALLBACK;

/** Lookup sur code — undefined si code inconnu. */
export function findFormuleByPhase(code: PhaseCode): FormuleAliment | undefined {
  return FORMULES_ALIMENT_FALLBACK.find((f) => f.code === code);
}

// ─── Agrégation long-format Sheets → FormuleAliment[] ────────────────────────

/** Codes phase connus — utilisé pour filtrer / typer à l'agrégation. */
const KNOWN_PHASE_CODES: readonly PhaseCode[] = [
  'DEMARRAGE_1',
  'CROISSANCE',
  'FINITION',
  'TRUIE_GESTATION',
  'TRUIE_LACTATION',
];

/** Libellés phase par défaut si Sheets ne renseigne pas `NOM_PHASE`. */
const PHASE_DEFAULT_NOMS: Record<PhaseCode, { nom: string; phase: string; poidsRange: string }> = {
  DEMARRAGE_1: {
    nom: 'Porcelets — Démarrage 1',
    phase: 'Post-sevrage (J21-J42)',
    poidsRange: '7 → 15 kg',
  },
  CROISSANCE: {
    nom: 'Croissance',
    phase: 'Engraissement — phase 1',
    poidsRange: '25 → 50 kg',
  },
  FINITION: {
    nom: 'Finition',
    phase: 'Engraissement — phase 2',
    poidsRange: '50 → 100 kg',
  },
  TRUIE_GESTATION: {
    nom: 'Truie gestante',
    phase: 'Gestation (J0-J113)',
    poidsRange: 'Truies pleines',
  },
  TRUIE_LACTATION: {
    nom: 'Truie lactation',
    phase: 'Maternité (J0-J21 post-mise bas)',
    poidsRange: 'Truies allaitantes',
  },
};

/**
 * Agrège les lignes long-format lues depuis `ALIMENT_FORMULES` en objets
 * `FormuleAliment`.
 *
 * Règles :
 *  - Groupement par `codePhase` (seuls les codes connus sont retenus).
 *  - Tri intra-groupe par `ordre` asc (stable pour égaux).
 *  - Sépare INGREDIENT (→ `ingredients` avec `%`) vs ADDITIF (→ `additifs` avec kg/T ou g/T).
 *  - Un composant avec unité incohérente (ingrédient non-%, additif en %) est ignoré.
 *  - `nomPhase` / `poidsRange` : pris du 1er row rencontré ; sinon constantes locales.
 *  - Ordre des phases de sortie : suit `KNOWN_PHASE_CODES` (stable).
 *
 * Retourne un tableau vide si aucune ligne exploitable — l'appelant
 * bascule alors sur `FORMULES_ALIMENT_FALLBACK`.
 */
export function aggregateFormulesFromRows(rows: FormuleRowSheets[]): FormuleAliment[] {
  const groups = new Map<PhaseCode, FormuleRowSheets[]>();

  for (const row of rows) {
    const code = row.codePhase.trim().toUpperCase() as PhaseCode;
    if (!KNOWN_PHASE_CODES.includes(code)) continue;
    const bucket = groups.get(code);
    if (bucket) bucket.push(row);
    else groups.set(code, [row]);
  }

  const out: FormuleAliment[] = [];

  for (const code of KNOWN_PHASE_CODES) {
    const bucket = groups.get(code);
    if (!bucket || bucket.length === 0) continue;

    // Tri stable par ordre asc
    const sorted = [...bucket].sort((a, b) => a.ordre - b.ordre);

    const ingredients: IngredientLigne[] = [];
    const additifs: AdditifLigne[] = [];

    for (const r of sorted) {
      if (r.typeComposant === 'INGREDIENT') {
        if (r.unite !== '%') continue; // un ingrédient doit être exprimé en %
        ingredients.push({ nom: r.nom, pourcent: r.valeur });
      } else {
        if (r.unite === '%') continue; // un additif doit être en kg/T ou g/T
        additifs.push({ nom: r.nom, dose: r.valeur, unite: r.unite });
      }
    }

    // Skip si aucun ingrédient (une phase sans base n'est pas calculable)
    if (ingredients.length === 0) continue;

    const defaults = PHASE_DEFAULT_NOMS[code];
    const first = sorted[0];

    out.push({
      code,
      nom: first.nomPhase?.trim() || defaults.nom,
      phase: defaults.phase,
      poidsRange: first.poidsRange?.trim() || defaults.poidsRange,
      ingredients,
      additifs,
    });
  }

  return out;
}
