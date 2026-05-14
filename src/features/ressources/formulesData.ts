/**
 * formulesData — Données hardcodées des formules d'aliments (V78).
 * ══════════════════════════════════════════════════════════════════
 *
 * Source : mockup `docs/mockups/ressources-reproduction-mockup-v76.html`
 * section A.3 « Formules d'aliment » (lignes 583-722). 5 formules
 * réalistes adaptées au cycle GTTT porcin (post-sevrage → engraissement
 * → reproduction), avec composition, apports nutritionnels, coût/kg et
 * bandes utilisatrices courantes.
 *
 * Hors-ligne : ces données sont la source unique tant que la table
 * Supabase `produits_aliments` ou la sheet `ALIMENT_FORMULES` n'a pas
 * été branchée sur ces écrans (V79+).
 */

export type FormulePhaseCode =
  // Référentiel mockup V78 (FORMULES)
  | 'demarrage-1'
  | 'croissance-std'
  | 'engraissement-eco'
  | 'truies-allaitantes'
  | 'finition-premium'
  // Référentiel marché Afrique de l'Ouest V82 (FORMULES_MARCHE)
  | 'post-sevrage-demarrage'
  | 'croissance-standard'
  | 'croissance-rapide'
  | 'finition'
  | 'truie-gestante'
  | 'truie-allaitante';

export type FormulePillTone = 'amber' | 'soft' | 'success' | 'info' | 'warm';

export interface FormuleIngredient {
  /** Libellé de la matière première. */
  nom: string;
  /** Pourcentage de la formule (somme = 100). */
  pourcent: number;
  /** Prix unitaire matière (FCFA / kg). */
  prixKgFcfa: number;
}

export interface FormuleApportNutritionnel {
  /** Libellé court (ex. "Protéines", "Énergie"). */
  label: string;
  /** Valeur affichée (ex. "18,5 %", "3 200 kcal"). */
  valeur: string;
  /** Pourcentage d'atteinte de l'objectif (0-100, affichage barre). */
  ratio: number;
}

export interface FormuleBandeUtilisatrice {
  /** Identifiant bande (ex. "B-2026-04-A"). */
  id: string;
  /** Libellé phase (ex. "Post-sevrage"). */
  phase: string;
  /** Effectif (ex. 32). */
  effectif: number;
}

export interface Formule {
  /** Identifiant URL-safe (ex. "demarrage-1"). */
  id: FormulePhaseCode;
  /** Code phase machine (ex. "DEMARRAGE_1"). */
  codePhase: string;
  /** Nom affiché (ex. "Démarrage 1"). */
  nom: string;
  /** Description courte (ex. "Porcelets J28-J70 · 0,8 kg/j"). */
  description: string;
  /** Libellé de la pill phase (court, ex. "Post-sev."). */
  pillLabel: string;
  /** Variante visuelle de la pill (cohérence Pill DS). */
  pillTone: FormulePillTone;
  /** Coût final calculé (FCFA / kg de mélange). */
  coutKgFcfa: number;
  /** Date de mise à jour ISO (ex. "2026-04-12"). */
  dateMAJ: string;
  /** Composition (somme pourcent = 100). */
  ingredients: FormuleIngredient[];
  /** Apports nutritionnels mesurés. */
  apports: FormuleApportNutritionnel[];
  /** Bandes du troupeau qui consomment actuellement cette formule. */
  bandes: FormuleBandeUtilisatrice[];
}

/**
 * Calcule le coût/kg d'une formule à partir de la composition ingrédients.
 * Exposé pour vérification, mais les valeurs sont préenregistrées (les
 * arrondis du mockup ne reflètent pas un calcul strict).
 */
export function computeCoutKg(ingredients: FormuleIngredient[]): number {
  let total = 0;
  for (const ing of ingredients) {
    total += (ing.pourcent / 100) * ing.prixKgFcfa;
  }
  return Math.round(total);
}

export const FORMULES: Formule[] = [
  {
    id: 'demarrage-1',
    codePhase: 'DEMARRAGE_1',
    nom: 'Démarrage 1',
    description: 'Porcelets J28-J70 · 0,8 kg/j · digestible',
    pillLabel: 'Post-sev.',
    pillTone: 'info',
    coutKgFcfa: 310,
    dateMAJ: '2026-04-12',
    ingredients: [
      { nom: 'Maïs grain extrudé', pourcent: 35, prixKgFcfa: 230 },
      { nom: 'Tourteau soja 48', pourcent: 28, prixKgFcfa: 410 },
      { nom: 'Lait écrémé poudre', pourcent: 14, prixKgFcfa: 720 },
      { nom: 'Son de blé', pourcent: 15, prixKgFcfa: 160 },
      { nom: 'CMV starter + acides', pourcent: 8, prixKgFcfa: 540 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '20,5 %', ratio: 95 },
      { label: 'Lysine digestible', valeur: '1,35 %', ratio: 90 },
      { label: 'Énergie nette', valeur: '2 450 kcal/kg', ratio: 92 },
      { label: 'Calcium', valeur: '0,85 %', ratio: 80 },
      { label: 'Phosphore digest.', valeur: '0,42 %', ratio: 78 },
    ],
    bandes: [
      { id: 'B-2026-04-A', phase: 'Post-sevrage', effectif: 28 },
      { id: 'B-2026-04-B', phase: 'Post-sevrage', effectif: 31 },
    ],
  },
  {
    id: 'croissance-std',
    codePhase: 'CROISSANCE_STD',
    nom: 'Croissance standard',
    description: 'Porcs 25-50 kg · 1,6 kg/j · base maïs/soja',
    pillLabel: 'Croissance',
    pillTone: 'soft',
    coutKgFcfa: 195,
    dateMAJ: '2026-04-05',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 56, prixKgFcfa: 180 },
      { nom: 'Tourteau soja 44', pourcent: 18, prixKgFcfa: 360 },
      { nom: 'Son de blé', pourcent: 17, prixKgFcfa: 150 },
      { nom: 'Tourteau coton', pourcent: 5, prixKgFcfa: 220 },
      { nom: 'CMV croissance', pourcent: 4, prixKgFcfa: 380 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '17,2 %', ratio: 86 },
      { label: 'Lysine digestible', valeur: '1,05 %', ratio: 82 },
      { label: 'Énergie nette', valeur: '2 380 kcal/kg', ratio: 88 },
      { label: 'Calcium', valeur: '0,72 %', ratio: 75 },
      { label: 'Phosphore digest.', valeur: '0,33 %', ratio: 70 },
    ],
    bandes: [
      { id: 'B-2026-02-A', phase: 'Croissance', effectif: 30 },
      { id: 'B-2026-02-B', phase: 'Croissance', effectif: 27 },
      { id: 'B-2026-03-A', phase: 'Croissance', effectif: 25 },
    ],
  },
  {
    id: 'engraissement-eco',
    codePhase: 'ENGRAISSEMENT_ECO',
    nom: 'Engraissement éco',
    description: 'Porcs 50-90 kg · 2,4 kg/j · coût optimisé',
    pillLabel: 'Engrais.',
    pillTone: 'soft',
    coutKgFcfa: 165,
    dateMAJ: '2026-04-05',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 52, prixKgFcfa: 180 },
      { nom: 'Son de blé', pourcent: 22, prixKgFcfa: 150 },
      { nom: 'Tourteau soja 44', pourcent: 14, prixKgFcfa: 360 },
      { nom: 'Tourteau coton', pourcent: 9, prixKgFcfa: 220 },
      { nom: 'CMV engrais.', pourcent: 3, prixKgFcfa: 380 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '15,1 %', ratio: 75 },
      { label: 'Lysine digestible', valeur: '0,86 %', ratio: 72 },
      { label: 'Énergie nette', valeur: '2 290 kcal/kg', ratio: 82 },
      { label: 'Calcium', valeur: '0,62 %', ratio: 68 },
      { label: 'Phosphore digest.', valeur: '0,28 %', ratio: 65 },
    ],
    bandes: [
      { id: 'B-2025-12-A', phase: 'Engraissement', effectif: 24 },
      { id: 'B-2026-01-A', phase: 'Engraissement', effectif: 22 },
    ],
  },
  {
    id: 'truies-allaitantes',
    codePhase: 'TRUIE_LACTATION',
    nom: 'Truies allaitantes',
    description: 'Truie en maternité · 6 kg/j · max énergie',
    pillLabel: 'Maternité',
    pillTone: 'warm',
    coutKgFcfa: 245,
    dateMAJ: '2026-04-12',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 38, prixKgFcfa: 180 },
      { nom: 'Tourteau soja 48', pourcent: 22, prixKgFcfa: 410 },
      { nom: 'Son de blé', pourcent: 18, prixKgFcfa: 150 },
      { nom: 'Coquilles huître', pourcent: 10, prixKgFcfa: 90 },
      { nom: 'Huile palme', pourcent: 8, prixKgFcfa: 650 },
      { nom: 'CMV lactation', pourcent: 4, prixKgFcfa: 560 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '18,8 %', ratio: 92 },
      { label: 'Lysine digestible', valeur: '1,15 %', ratio: 88 },
      { label: 'Énergie nette', valeur: '2 620 kcal/kg', ratio: 96 },
      { label: 'Calcium', valeur: '1,05 %', ratio: 95 },
      { label: 'Phosphore digest.', valeur: '0,48 %', ratio: 88 },
    ],
    bandes: [
      { id: 'M-T-114', phase: 'Maternité', effectif: 4 },
      { id: 'M-T-118', phase: 'Maternité', effectif: 5 },
      { id: 'M-T-122', phase: 'Maternité', effectif: 3 },
    ],
  },
  {
    id: 'finition-premium',
    codePhase: 'FINITION_PREMIUM',
    nom: 'Finition premium',
    description: 'Porcs 90-110 kg · 3,1 kg/j · gain qualité carcasse',
    pillLabel: 'Finition',
    pillTone: 'amber',
    coutKgFcfa: 210,
    dateMAJ: '2026-04-12',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 60, prixKgFcfa: 180 },
      { nom: 'Tourteau soja 44', pourcent: 12, prixKgFcfa: 360 },
      { nom: 'Son de blé', pourcent: 15, prixKgFcfa: 150 },
      { nom: 'Orge', pourcent: 8, prixKgFcfa: 240 },
      { nom: 'CMV finition', pourcent: 5, prixKgFcfa: 380 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '14,3 %', ratio: 70 },
      { label: 'Lysine digestible', valeur: '0,78 %', ratio: 68 },
      { label: 'Énergie nette', valeur: '2 350 kcal/kg', ratio: 86 },
      { label: 'Calcium', valeur: '0,55 %', ratio: 62 },
      { label: 'Phosphore digest.', valeur: '0,25 %', ratio: 60 },
    ],
    bandes: [
      { id: 'B-2025-10-A', phase: 'Finition', effectif: 18 },
      { id: 'B-2025-11-A', phase: 'Finition', effectif: 20 },
    ],
  },
];

/** Référentiel de formules : mockup V78 ou marché Afrique de l'Ouest V82. */
export type FormuleSource = 'mockup' | 'marche';

/**
 * Lookup formule par id (URL slug). undefined si inconnu.
 *
 * V82 — `source` lève l'ambiguïté quand un id existe dans les 2 référentiels
 * (ex: `engraissement-eco`). Sans `source`, on cherche d'abord dans FORMULES
 * (compat historique) puis dans FORMULES_MARCHE.
 */
export function getFormuleById(id: string, source?: FormuleSource): Formule | undefined {
  if (source === 'marche') return FORMULES_MARCHE.find((f) => f.id === id);
  if (source === 'mockup') return FORMULES.find((f) => f.id === id);
  return FORMULES.find((f) => f.id === id) ?? FORMULES_MARCHE.find((f) => f.id === id);
}

/** Filtres pills disponibles. */
export interface PhaseFilter {
  value: string;
  label: string;
  count: number;
}

/** Calcule la liste des filtres pills à partir des formules (ordre stable). */
export function buildPhaseFilters(formules: Formule[]): PhaseFilter[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const f of formules) {
    const k = f.pillLabel;
    const cur = counts.get(k);
    if (cur) cur.count += 1;
    else counts.set(k, { label: k, count: 1 });
  }
  const opts: PhaseFilter[] = [
    { value: 'all', label: 'Toutes', count: formules.length },
  ];
  for (const [k, v] of counts) {
    opts.push({ value: k, label: v.label, count: v.count });
  }
  return opts;
}

// ════════════════════════════════════════════════════════════════════════════
// FORMULES_MARCHE — Référentiel marché Afrique de l'Ouest (V82, 2026-05-14)
// ════════════════════════════════════════════════════════════════════════════
//
// 7 formules de référence avec prix matières premières réels du marché
// ouest-africain (mai 2026). Destinées à TOUS les utilisateurs (naisseurs +
// engraisseurs), pas par-ferme — savoir métier universel.
//
// Sources prix matières premières (FCFA/kg, mai 2026) :
//   Maïs grain                  200  — marché local CI / Ghana
//   Tourteau de soja 48 %       420  — importé / local CI
//   Son de blé                  150  — local CI
//   Tourteau de coton 38 %      280  — estimation marché Mali / Burkina
//   Huile de palme brute        650  — estimation locale CI
//   Calcaire agricole            50  — estimation locale
//   CMV 5 % Sécurisé Vitalac   1482  — 37 060 FCFA / sac 25 kg (Vitalac CI)
//   CMV Truie 1,5 % Vitalac    1662  — 33 245 FCFA / sac 20 kg (Vitalac CI)
//   KPC 5 % De Heus            1040  — 26 000 FCFA / sac 25 kg (De Heus CI)
//
// Invariants vérifiés : somme(pourcent) = 100 par formule · coutKgFcfa =
// round(Σ pourcent/100 × prixKgFcfa) — couvert par formulesData.test.ts.
// ════════════════════════════════════════════════════════════════════════════

export const FORMULES_MARCHE: Formule[] = [
  // 1. Post-sevrage / Démarrage — Porcelets 7-25 kg
  {
    id: 'post-sevrage-demarrage',
    codePhase: 'POST_SEVRAGE',
    nom: 'Post-sevrage / Démarrage',
    description: 'Porcelets 7-25 kg · 1,2 kg/j · digestibilité et immunité',
    pillLabel: 'Démarrage',
    pillTone: 'amber',
    coutKgFcfa: 315,
    dateMAJ: '2026-05-14',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 60, prixKgFcfa: 200 },
      { nom: 'Tourteau de soja 48 %', pourcent: 24, prixKgFcfa: 420 },
      { nom: 'Son de blé', pourcent: 9, prixKgFcfa: 150 },
      { nom: 'CMV 5 % Sécurisé Vitalac', pourcent: 5, prixKgFcfa: 1482 },
      { nom: 'Huile de palme brute', pourcent: 1, prixKgFcfa: 650 },
      { nom: 'Calcaire agricole', pourcent: 1, prixKgFcfa: 50 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '19,2 %', ratio: 96 },
      { label: 'Lysine digestible', valeur: '1,15 %', ratio: 96 },
      { label: 'Énergie nette', valeur: '2 380 kcal/kg', ratio: 95 },
      { label: 'Calcium', valeur: '0,80 %', ratio: 100 },
      { label: 'Phosphore digest.', valeur: '0,38 %', ratio: 95 },
    ],
    bandes: [],
  },
  // 2. Croissance standard — Porcs 25-50 kg
  {
    id: 'croissance-standard',
    codePhase: 'CROISSANCE_STD',
    nom: 'Croissance standard',
    description: 'Porcs 25-50 kg · 2,5 kg/j · équilibre coût/performance',
    pillLabel: 'Croissance',
    pillTone: 'success',
    coutKgFcfa: 281,
    dateMAJ: '2026-05-14',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 66, prixKgFcfa: 200 },
      { nom: 'Tourteau de soja 48 %', pourcent: 18, prixKgFcfa: 420 },
      { nom: 'Son de blé', pourcent: 10, prixKgFcfa: 150 },
      { nom: 'KPC 5 % De Heus', pourcent: 5, prixKgFcfa: 1040 },
      { nom: 'Huile de palme brute', pourcent: 1, prixKgFcfa: 650 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '16,2 %', ratio: 88 },
      { label: 'Lysine digestible', valeur: '0,95 %', ratio: 90 },
      { label: 'Énergie nette', valeur: '2 310 kcal/kg', ratio: 92 },
      { label: 'Calcium', valeur: '0,65 %', ratio: 87 },
      { label: 'Phosphore digest.', valeur: '0,32 %', ratio: 86 },
    ],
    bandes: [],
  },
  // 3. Croissance rapide — Porcs 25-50 kg (GMQ maximisé)
  {
    id: 'croissance-rapide',
    codePhase: 'CROISSANCE_RAPIDE',
    nom: 'Croissance rapide',
    description: 'Porcs 25-50 kg · 2,7 kg/j · GMQ maximisé, protéines hautes',
    pillLabel: 'GMQ+',
    pillTone: 'info',
    coutKgFcfa: 309,
    dateMAJ: '2026-05-14',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 58, prixKgFcfa: 200 },
      { nom: 'Tourteau de soja 48 %', pourcent: 28, prixKgFcfa: 420 },
      { nom: 'Son de blé', pourcent: 7, prixKgFcfa: 150 },
      { nom: 'KPC 5 % De Heus', pourcent: 5, prixKgFcfa: 1040 },
      { nom: 'Huile de palme brute', pourcent: 2, prixKgFcfa: 650 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '19,0 %', ratio: 97 },
      { label: 'Lysine digestible', valeur: '1,08 %', ratio: 97 },
      { label: 'Énergie nette', valeur: '2 420 kcal/kg', ratio: 97 },
      { label: 'Calcium', valeur: '0,68 %', ratio: 90 },
      { label: 'Phosphore digest.', valeur: '0,35 %', ratio: 90 },
    ],
    bandes: [],
  },
  // 4. Engraissement éco — Porcs 50-90 kg
  // Tourteau de coton : vérifier gossypol < 100 mg/kg avant usage massif.
  {
    id: 'engraissement-eco',
    codePhase: 'ENGRAISSEMENT_ECO',
    nom: 'Engraissement éco',
    description: 'Porcs 50-90 kg · 3,0 kg/j · coût optimisé marché local',
    pillLabel: 'Éco',
    pillTone: 'soft',
    coutKgFcfa: 246,
    dateMAJ: '2026-05-14',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 68, prixKgFcfa: 200 },
      { nom: 'Tourteau de coton 38 %', pourcent: 14, prixKgFcfa: 280 },
      { nom: 'Son de blé', pourcent: 12, prixKgFcfa: 150 },
      { nom: 'KPC 5 % De Heus', pourcent: 5, prixKgFcfa: 1040 },
      { nom: 'Calcaire agricole', pourcent: 1, prixKgFcfa: 50 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '14,8 %', ratio: 82 },
      { label: 'Lysine digestible', valeur: '0,80 %', ratio: 82 },
      { label: 'Énergie nette', valeur: '2 250 kcal/kg', ratio: 88 },
      { label: 'Calcium', valeur: '0,58 %', ratio: 83 },
      { label: 'Phosphore digest.', valeur: '0,28 %', ratio: 80 },
    ],
    bandes: [],
  },
  // 5. Finition — Porcs 90-110 kg
  {
    id: 'finition',
    codePhase: 'FINITION',
    nom: 'Finition',
    description: 'Porcs 90-110 kg · 3,2 kg/j · qualité carcasse abattoir',
    pillLabel: 'Finition',
    pillTone: 'warm',
    coutKgFcfa: 272,
    dateMAJ: '2026-05-14',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 70, prixKgFcfa: 200 },
      { nom: 'Tourteau de soja 48 %', pourcent: 14, prixKgFcfa: 420 },
      { nom: 'Son de blé', pourcent: 10, prixKgFcfa: 150 },
      { nom: 'KPC 5 % De Heus', pourcent: 5, prixKgFcfa: 1040 },
      { nom: 'Huile de palme brute', pourcent: 1, prixKgFcfa: 650 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '13,8 %', ratio: 79 },
      { label: 'Lysine digestible', valeur: '0,76 %', ratio: 80 },
      { label: 'Énergie nette', valeur: '2 290 kcal/kg', ratio: 90 },
      { label: 'Calcium', valeur: '0,60 %', ratio: 84 },
      { label: 'Phosphore digest.', valeur: '0,28 %', ratio: 80 },
    ],
    bandes: [],
  },
  // 6. Truie gestante — J0-J107 de gestation
  {
    id: 'truie-gestante',
    codePhase: 'TRUIE_GESTANTE',
    nom: 'Truie gestante',
    description: 'Truies J0-J107 · 2,5 kg/j · ration stable gestation',
    pillLabel: 'Gestation',
    pillTone: 'soft',
    coutKgFcfa: 303,
    dateMAJ: '2026-05-14',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 61, prixKgFcfa: 200 },
      { nom: 'Tourteau de soja 48 %', pourcent: 18, prixKgFcfa: 420 },
      { nom: 'Son de blé', pourcent: 14, prixKgFcfa: 150 },
      { nom: 'CMV Truie 1,5 % Vitalac', pourcent: 5, prixKgFcfa: 1662 },
      { nom: 'Calcaire agricole', pourcent: 2, prixKgFcfa: 50 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '14,5 %', ratio: 92 },
      { label: 'Lysine digestible', valeur: '0,72 %', ratio: 90 },
      { label: 'Énergie nette', valeur: '2 150 kcal/kg', ratio: 88 },
      { label: 'Calcium', valeur: '0,85 %', ratio: 97 },
      { label: 'Phosphore digest.', valeur: '0,34 %', ratio: 92 },
    ],
    bandes: [],
  },
  // 7. Truie allaitante — Lactation J0-J35 post-mise bas
  {
    id: 'truie-allaitante',
    codePhase: 'TRUIE_ALLAITANTE',
    nom: 'Truie allaitante',
    description: 'Truies lactation J0-J35 · 5-7 kg/j · énergie max lactation',
    pillLabel: 'Lactation',
    pillTone: 'warm',
    coutKgFcfa: 332,
    dateMAJ: '2026-05-14',
    ingredients: [
      { nom: 'Maïs grain', pourcent: 55, prixKgFcfa: 200 },
      { nom: 'Tourteau de soja 48 %', pourcent: 26, prixKgFcfa: 420 },
      { nom: 'Son de blé', pourcent: 11, prixKgFcfa: 150 },
      { nom: 'CMV Truie 1,5 % Vitalac', pourcent: 5, prixKgFcfa: 1662 },
      { nom: 'Huile de palme brute', pourcent: 2, prixKgFcfa: 650 },
      { nom: 'Calcaire agricole', pourcent: 1, prixKgFcfa: 50 },
    ],
    apports: [
      { label: 'Protéines brutes', valeur: '17,1 %', ratio: 95 },
      { label: 'Lysine digestible', valeur: '0,92 %', ratio: 95 },
      { label: 'Énergie nette', valeur: '2 310 kcal/kg', ratio: 95 },
      { label: 'Calcium', valeur: '0,92 %', ratio: 98 },
      { label: 'Phosphore digest.', valeur: '0,40 %', ratio: 95 },
    ],
    bandes: [],
  },
];
