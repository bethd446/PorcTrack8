/**
 * Tests unitaires — Planificateur d'Alimentation
 * ════════════════════════════════════════════════
 * Couvre :
 *  - Consommation journalière (effectif × ration) par catégorie.
 *  - Matching libellé StockAliment → type d'aliment.
 *  - Jours de couverture (stock / conso), edge cases (conso = 0).
 *  - Plan complet : totaux + tri par urgence.
 */

import { describe, expect, it } from 'vitest';
import {
  RATION_DEFAULTS,
  COVERAGE_THRESHOLDS,
  consommationCategorie,
  matchFeedType,
  joursCouverture,
  statutCouverture,
  buildCategoryConsumptions,
  buildFeedCoverage,
  buildAlimentationPlan,
  sortCoveragesByUrgency,
  truiesEnAttente,
  truiesPleines,
  truiesEnMaternite,
  porceletsSousMere,
  porceletsSevres,
} from './alimentationPlanner';
import type { Truie, Verrat, BandePorcelets, StockAliment } from '../types/farm';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: 'T001',
    displayId: 'T-001',
    boucle: 'B-001',
    statut: 'Pleine',
    ration: 0,
    synced: true,
    ...overrides,
  };
}

function makeVerrat(overrides: Partial<Verrat> = {}): Verrat {
  return {
    id: 'V001',
    displayId: 'V-001',
    boucle: 'B-V01',
    statut: 'Actif',
    ration: 0,
    synced: true,
    ...overrides,
  };
}

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'BP-001',
    idPortee: 'P-001',
    statut: 'Sous mère',
    vivants: 10,
    synced: true,
    ...overrides,
  };
}

function makeStock(overrides: Partial<StockAliment> = {}): StockAliment {
  return {
    id: 'S001',
    libelle: 'Aliment Truie Gestation',
    stockActuel: 100,
    unite: 'kg',
    seuilAlerte: 50,
    statutStock: 'OK',
    ...overrides,
  };
}

// ─── 1. consommationCategorie ────────────────────────────────────────────────

describe('consommationCategorie — effectif × ration', () => {
  it('retourne effectif × ration pour des entrées positives', () => {
    expect(consommationCategorie(10, 2.5)).toBe(25);
  });

  it('retourne 0 si effectif = 0', () => {
    expect(consommationCategorie(0, 3)).toBe(0);
  });

  it('retourne 0 si ration = 0', () => {
    expect(consommationCategorie(12, 0)).toBe(0);
  });

  it('retourne 0 si valeurs négatives (anti-corruption)', () => {
    expect(consommationCategorie(-3, 2)).toBe(0);
    expect(consommationCategorie(3, -2)).toBe(0);
  });
});

// ─── 2. buildCategoryConsumptions ────────────────────────────────────────────

describe('buildCategoryConsumptions — par catégorie', () => {
  it('truies pleines : 8 truies × ration 2.5 (fallback) = 20 kg/j', () => {
    const truies = Array.from({ length: 8 }, (_, i) =>
      makeTruie({ id: `T${i}`, statut: 'Pleine' })
    );
    const plan = buildCategoryConsumptions({ truies, verrats: [], bandes: [] });
    const pleines = plan.find(c => c.key === 'TRUIES_PLEINES');
    expect(pleines?.effectif).toBe(8);
    expect(pleines?.rationMoyenne).toBe(RATION_DEFAULTS.TRUIE_GESTATION);
    expect(pleines?.consommationJournaliere).toBe(20);
    expect(pleines?.feedType).toBe('TRUIE_GESTATION');
  });

  it('truies en maternité : utilise la ration individuelle quand > 0', () => {
    const truies = [
      makeTruie({ id: 'T1', statut: 'En maternité', ration: 6 }),
      makeTruie({ id: 'T2', statut: 'En maternité', ration: 5 }),
    ];
    const plan = buildCategoryConsumptions({ truies, verrats: [], bandes: [] });
    const mat = plan.find(c => c.key === 'TRUIES_MATERNITE');
    expect(mat?.effectif).toBe(2);
    expect(mat?.rationMoyenne).toBe(5.5); // moyenne 6 + 5
    expect(mat?.consommationJournaliere).toBe(11); // 2 × 5.5
    expect(mat?.feedType).toBe('TRUIE_LACTATION');
  });

  it('porcelets sevrés : 30 porcelets × 0.6 = 18 kg/j', () => {
    const bandes = [
      makeBande({ id: 'B1', statut: 'Sevrés', vivants: 20 }),
      makeBande({ id: 'B2', statut: 'Sevrés', vivants: 10 }),
    ];
    const plan = buildCategoryConsumptions({ truies: [], verrats: [], bandes });
    const sevres = plan.find(c => c.key === 'PORCELETS_SEVRES');
    expect(sevres?.effectif).toBe(30);
    expect(sevres?.rationMoyenne).toBe(RATION_DEFAULTS.PORCELET_SEVRE);
    expect(sevres?.consommationJournaliere).toBeCloseTo(18, 6);
    expect(sevres?.feedType).toBe('DEUXIEME_AGE');
  });

  it('filtres de statut — attente, pleines, maternité distinctes', () => {
    const truies = [
      makeTruie({ id: 'A', statut: 'En attente saillie' }),
      makeTruie({ id: 'B', statut: 'Pleine' }),
      makeTruie({ id: 'C', statut: 'En maternité' }),
      makeTruie({ id: 'D', statut: 'À surveiller' }),
    ];
    expect(truiesEnAttente(truies).map(t => t.id)).toEqual(['A']);
    expect(truiesPleines(truies).map(t => t.id)).toEqual(['B']);
    expect(truiesEnMaternite(truies).map(t => t.id)).toEqual(['C']);
  });

  it('porcelets sous-mère vs sevrés — filtres distincts', () => {
    const bandes = [
      makeBande({ id: 'B1', statut: 'Sous mère', vivants: 10 }),
      makeBande({ id: 'B2', statut: 'Sevrés', vivants: 15 }),
      makeBande({ id: 'B3', statut: 'RECAP', vivants: 100 }),
    ];
    expect(porceletsSousMere(bandes)).toBe(10);
    expect(porceletsSevres(bandes)).toBe(15);
  });

  it('verrats : fallback ration VERRAT si ration individuelle nulle', () => {
    const verrats = [
      makeVerrat({ id: 'V1', ration: 0 }),
      makeVerrat({ id: 'V2', ration: 0 }),
    ];
    const plan = buildCategoryConsumptions({ truies: [], verrats, bandes: [] });
    const v = plan.find(c => c.key === 'VERRATS');
    expect(v?.effectif).toBe(2);
    expect(v?.rationMoyenne).toBe(RATION_DEFAULTS.VERRAT);
    expect(v?.consommationJournaliere).toBe(6); // 2 × 3
  });
});

// ─── 3. matchFeedType ────────────────────────────────────────────────────────

describe('matchFeedType — libellé StockAliment → type', () => {
  it('matche "Aliment truie gestation" → TRUIE_GESTATION', () => {
    expect(matchFeedType('Aliment truie gestation')).toBe('TRUIE_GESTATION');
    expect(matchFeedType('ALIMENT TRUIE GESTATION')).toBe('TRUIE_GESTATION');
    expect(matchFeedType('truie gestante premium')).toBe('TRUIE_GESTATION');
  });

  it('matche "Aliment truie lactation" → TRUIE_LACTATION (pas gestation)', () => {
    expect(matchFeedType('Aliment truie lactation')).toBe('TRUIE_LACTATION');
    expect(matchFeedType('Truie allaitante KPC')).toBe('TRUIE_LACTATION');
    expect(matchFeedType('truie maternité')).toBe('TRUIE_LACTATION');
  });

  it('matche "Aliment 1er âge" / "premier âge" → PREMIER_AGE', () => {
    expect(matchFeedType('Aliment 1er âge')).toBe('PREMIER_AGE');
    expect(matchFeedType('Premier âge porcelet')).toBe('PREMIER_AGE');
    expect(matchFeedType('1ere age')).toBe('PREMIER_AGE');
  });

  it('matche "2e âge" / "post-sevrage" → DEUXIEME_AGE', () => {
    expect(matchFeedType('Aliment 2e âge')).toBe('DEUXIEME_AGE');
    expect(matchFeedType('Post-sevrage porcelet')).toBe('DEUXIEME_AGE');
    expect(matchFeedType('Deuxième âge')).toBe('DEUXIEME_AGE');
  });

  it('matche "Verrat" → VERRAT', () => {
    expect(matchFeedType('Aliment verrat')).toBe('VERRAT');
  });

  it('retourne null sur libellé non reconnu', () => {
    expect(matchFeedType('Tourteau de soja brut')).toBeNull();
    expect(matchFeedType('XYZ-42')).toBeNull();
    expect(matchFeedType('')).toBeNull();
  });

  it('fallback porcelet générique → PREMIER_AGE', () => {
    expect(matchFeedType('Aliment porcelet')).toBe('PREMIER_AGE');
  });
});

// ─── 4. joursCouverture & statutCouverture ──────────────────────────────────

describe('joursCouverture & statutCouverture', () => {
  it('stock 100 kg / conso 20 kg/j = 5 jours', () => {
    expect(joursCouverture(100, 20)).toBe(5);
  });

  it('conso = 0 → Infinity (aliment jamais consommé)', () => {
    expect(joursCouverture(100, 0)).toBe(Infinity);
  });

  it('stock = 0 → 0 jours', () => {
    expect(joursCouverture(0, 10)).toBe(0);
  });

  it('statut CRITIQUE si < 7 jours', () => {
    expect(statutCouverture(3)).toBe('CRITIQUE');
    expect(statutCouverture(COVERAGE_THRESHOLDS.CRITIQUE - 0.1)).toBe('CRITIQUE');
  });

  it('statut HAUTE si 7 ≤ jours < 14', () => {
    expect(statutCouverture(COVERAGE_THRESHOLDS.CRITIQUE)).toBe('HAUTE');
    expect(statutCouverture(10)).toBe('HAUTE');
  });

  it('statut OK si ≥ 14 jours', () => {
    expect(statutCouverture(COVERAGE_THRESHOLDS.HAUTE)).toBe('OK');
    expect(statutCouverture(30)).toBe('OK');
  });

  it('statut INCONNU si Infinity (conso = 0)', () => {
    expect(statutCouverture(Infinity)).toBe('INCONNU');
  });
});

// ─── 5. buildFeedCoverage ───────────────────────────────────────────────────

describe('buildFeedCoverage — couverture par aliment', () => {
  it('cumule la conso de toutes les catégories ciblant le même type', () => {
    // 2 catégories TRUIE_GESTATION : attente + pleines
    const categories = buildCategoryConsumptions({
      truies: [
        makeTruie({ id: 'T1', statut: 'En attente saillie' }),
        makeTruie({ id: 'T2', statut: 'Pleine' }),
        makeTruie({ id: 'T3', statut: 'Pleine' }),
      ],
      verrats: [],
      bandes: [],
    });
    const stock = makeStock({ libelle: 'Aliment truie gestation', stockActuel: 300 });
    const cov = buildFeedCoverage(stock, categories);
    // 3 truies × 2.5 = 7.5 kg/j → 300 / 7.5 = 40 jours
    expect(cov.consommationJournaliere).toBe(7.5);
    expect(cov.joursCouverture).toBe(40);
    expect(cov.statutCouverture).toBe('OK');
    expect(cov.feedType).toBe('TRUIE_GESTATION');
    expect(cov.categoriesConsommatrices.length).toBe(2);
  });

  it('aliment non reconnu → feedType=null, conso=0, statut=INCONNU', () => {
    const categories = buildCategoryConsumptions({
      truies: [makeTruie({ statut: 'Pleine' })],
      verrats: [],
      bandes: [],
    });
    const stock = makeStock({ libelle: 'Tourteau soja', stockActuel: 500 });
    const cov = buildFeedCoverage(stock, categories);
    expect(cov.feedType).toBeNull();
    expect(cov.consommationJournaliere).toBe(0);
    expect(cov.joursCouverture).toBe(Infinity);
    expect(cov.statutCouverture).toBe('INCONNU');
  });

  it('déclenche CRITIQUE si couverture < 7j', () => {
    const categories = buildCategoryConsumptions({
      truies: Array.from({ length: 10 }, (_, i) =>
        makeTruie({ id: `T${i}`, statut: 'Pleine' })
      ),
      verrats: [],
      bandes: [],
    });
    // 10 × 2.5 = 25 kg/j ; stock 100 → 4 jours
    const stock = makeStock({ libelle: 'Aliment truie gestation', stockActuel: 100 });
    const cov = buildFeedCoverage(stock, categories);
    expect(cov.joursCouverture).toBe(4);
    expect(cov.statutCouverture).toBe('CRITIQUE');
  });
});

// ─── 6. buildAlimentationPlan (intégration) ─────────────────────────────────

describe('buildAlimentationPlan — plan complet', () => {
  it('produit totaux cohérents sur jeu réaliste', () => {
    const truies = [
      makeTruie({ id: 'T1', statut: 'Pleine' }),
      makeTruie({ id: 'T2', statut: 'Pleine' }),
      makeTruie({ id: 'T3', statut: 'En maternité', ration: 5 }),
    ];
    const verrats = [makeVerrat({ id: 'V1' })];
    const bandes = [
      makeBande({ id: 'B1', statut: 'Sous mère', vivants: 10 }),
      makeBande({ id: 'B2', statut: 'Sevrés', vivants: 20 }),
    ];
    const stockAliment = [
      makeStock({ id: 'S1', libelle: 'Aliment truie gestation', stockActuel: 100 }),
      makeStock({ id: 'S2', libelle: 'Aliment truie lactation', stockActuel: 50 }),
      makeStock({ id: 'S3', libelle: 'Aliment 1er âge', stockActuel: 60 }),
      makeStock({ id: 'S4', libelle: 'Aliment 2e âge', stockActuel: 200 }),
    ];
    const plan = buildAlimentationPlan({ truies, verrats, bandes, stockAliment });

    // Conso : 2×2.5 (truies pleines) + 1×5 (materné) + 1×3 (verrat)
    //         + 10×0.3 (sous mère) + 20×0.6 (sevrés)
    //       = 5 + 5 + 3 + 3 + 12 = 28 kg/j
    expect(plan.consommationJournaliereTotale).toBeCloseTo(28, 6);
    expect(plan.stockTotal).toBe(410);
    expect(plan.coverages.length).toBe(4);
    expect(plan.categories.length).toBe(7);
  });

  it('jours couverture moyenne ignore les Infinity', () => {
    const truies = [makeTruie({ statut: 'Pleine' })]; // 2.5 kg/j
    const stockAliment = [
      makeStock({ libelle: 'Aliment truie gestation', stockActuel: 100 }),
      makeStock({ libelle: 'Tourteau soja', stockActuel: 9999 }), // non matché
    ];
    const plan = buildAlimentationPlan({
      truies,
      verrats: [],
      bandes: [],
      stockAliment,
    });
    // La moyenne ne doit PAS être Infinity à cause du stock non matché.
    expect(plan.joursCouvertureMoyenne).toBe(40); // 100 / 2.5
  });
});

// ─── 7. sortCoveragesByUrgency ──────────────────────────────────────────────

describe('sortCoveragesByUrgency', () => {
  it('CRITIQUE avant HAUTE avant OK avant INCONNU', () => {
    const truies = Array.from({ length: 20 }, (_, i) =>
      makeTruie({ id: `T${i}`, statut: 'Pleine' })
    ); // 50 kg/j
    const stockAliment = [
      makeStock({ id: 'OK', libelle: 'Aliment truie gestation', stockActuel: 1000 }), // 20j OK
      makeStock({ id: 'CRIT', libelle: 'Aliment truie gestation', stockActuel: 100 }), // 2j CRIT
      makeStock({ id: 'UNK', libelle: 'Soja', stockActuel: 500 }),                     // INCONNU
      makeStock({ id: 'HAUTE', libelle: 'Aliment truie gestation', stockActuel: 500 }), // 10j HAUTE
    ];
    const plan = buildAlimentationPlan({
      truies,
      verrats: [],
      bandes: [],
      stockAliment,
    });
    const sorted = sortCoveragesByUrgency(plan.coverages);
    expect(sorted.map(c => c.stock.id)).toEqual(['CRIT', 'HAUTE', 'OK', 'UNK']);
  });
});
