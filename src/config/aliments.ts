/**
 * Formules aliment validées par technicien — Ferme K13, avril 2026.
 * ═════════════════════════════════════════════════════════════════
 *
 * 5 formules couvrant tous les stades du cycle :
 *  - Porcelets : Démarrage 1 (post-sevrage, 7-15 kg)
 *  - Engraissement : Croissance (25-50 kg) + Finition (50-100 kg)
 *  - Reproduction : Truie gestante + Truie lactation
 *
 * Structures typées — consommées par le calculateur de ration
 * (`src/services/rationCalculator.ts`) et l'écran
 * `src/features/ressources/FormulesView.tsx`.
 *
 * NOTE : ces formules sont des constantes métier (pas des données de
 * référence côté Sheets). Toute modification nécessite validation
 * technicien + mise à jour de ce fichier.
 */

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

/** Catalogue des 5 formules validées — source de vérité unique. */
export const FORMULES_ALIMENT: FormuleAliment[] = [
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

/** Lookup sur code — undefined si code inconnu. */
export function findFormuleByPhase(code: PhaseCode): FormuleAliment | undefined {
  return FORMULES_ALIMENT.find((f) => f.code === code);
}
