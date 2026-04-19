/**
 * Tests unitaires — Calculateur de rations.
 * ═══════════════════════════════════════════
 *
 * Couverture :
 *  - Linéarité des ingrédients sur plusieurs masses (100, 250, 1000 kg).
 *  - Conversion d'unités additifs (kg/T et g/T).
 *  - Formatage g/kg (seuil 1000 g).
 *  - Invariant : somme des pourcentages = 100 pour toutes les formules.
 *  - Conso journalière et totale.
 */

import { describe, expect, it } from 'vitest';
import {
  calculerRation,
  formatQuantite,
  totalPourcentBase,
  consoJournaliereKg,
  consoTotaleKg,
} from './rationCalculator';
import {
  FORMULES_ALIMENT,
  findFormuleByPhase,
  type FormuleAliment,
} from '../config/aliments';

/** Retrouve une formule en TS-safe (throw si absente : protège des typos). */
function getFormule(code: Parameters<typeof findFormuleByPhase>[0]): FormuleAliment {
  const f = findFormuleByPhase(code);
  if (!f) throw new Error(`Formule ${code} introuvable`);
  return f;
}

describe('rationCalculator · calculerRation · Démarrage 1', () => {
  const demarrage = getFormule('DEMARRAGE_1');

  it('calcule Démarrage 1 pour 1000 kg (1 tonne) — valeurs exactes', () => {
    const r = calculerRation(demarrage, 1000);
    expect(r.ingredients).toEqual([
      { nom: 'Romelko', pourcent: 50, kg: 500 },
      { nom: 'KPC 5', pourcent: 3, kg: 30 },
      { nom: 'Maïs', pourcent: 34, kg: 340 },
      { nom: 'Son de blé', pourcent: 3, kg: 30 },
      { nom: 'Tourteau de soja', pourcent: 10, kg: 100 },
    ]);
    expect(r.warnings).toEqual([]);
  });

  it('calcule Démarrage 1 pour 100 kg — valeurs divisées par 10', () => {
    const r = calculerRation(demarrage, 100);
    expect(r.ingredients.map((i) => i.kg)).toEqual([50, 3, 34, 3, 10]);
  });

  it('calcule Démarrage 1 pour 250 kg — linéarité intermédiaire', () => {
    const r = calculerRation(demarrage, 250);
    // Romelko 50% → 125 kg ; KPC 5 3% → 7.5 kg ; Maïs 34% → 85 kg ;
    // Son 3% → 7.5 kg ; Soja 10% → 25 kg.
    expect(r.ingredients.map((i) => i.kg)).toEqual([125, 7.5, 85, 7.5, 25]);
  });

  it('gère masse = 0 : retourne des kg nuls + warning', () => {
    const r = calculerRation(demarrage, 0);
    expect(r.ingredients.every((i) => i.kg === 0)).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('rationCalculator · additifs · conversions d\'unités', () => {
  const demarrage = getFormule('DEMARRAGE_1');

  it('additif kg/T : 1 kg/T × 1000 kg = 1000 g exactement', () => {
    const r = calculerRation(demarrage, 1000);
    const lysine = r.additifs.find((a) => a.nom === 'Lysine');
    expect(lysine).toBeDefined();
    expect(lysine?.quantite).toBe(1000); // 1 kg = 1000 g
    expect(lysine?.quantiteAffiche).toBe('1.00 kg');
  });

  it('additif g/T : 300 g/T × 500 kg = 150 g', () => {
    const r = calculerRation(demarrage, 500);
    const enzymes = r.additifs.find((a) => a.nom === 'Enzymes');
    expect(enzymes).toBeDefined();
    expect(enzymes?.quantite).toBe(150);
    expect(enzymes?.quantiteAffiche).toBe('150.0 g');
  });

  it('additif kg/T dose fractionnaire : 0.5 kg/T × 1000 kg = 500 g', () => {
    const r = calculerRation(demarrage, 1000);
    const methionine = r.additifs.find((a) => a.nom === 'Méthionine');
    expect(methionine?.quantite).toBe(500);
    expect(methionine?.quantiteAffiche).toBe('500.0 g');
  });
});

describe('rationCalculator · formatQuantite', () => {
  it('< 1000 g → format grammes 1 décimale', () => {
    expect(formatQuantite(500)).toBe('500.0 g');
    expect(formatQuantite(0)).toBe('0.0 g');
    expect(formatQuantite(999.9)).toBe('999.9 g');
  });

  it('>= 1000 g → format kg 2 décimales', () => {
    expect(formatQuantite(1000)).toBe('1.00 kg');
    expect(formatQuantite(1500)).toBe('1.50 kg');
    expect(formatQuantite(12345)).toBe('12.35 kg');
  });
});

describe('rationCalculator · invariants', () => {
  it('toutes les formules ont une somme d\'ingrédients = 100%', () => {
    for (const f of FORMULES_ALIMENT) {
      expect(totalPourcentBase(f), `Formule ${f.code}`).toBe(100);
    }
  });

  it('calculerRation ne produit aucun warning pour les formules canoniques (masse > 0)', () => {
    for (const f of FORMULES_ALIMENT) {
      const r = calculerRation(f, 1000);
      expect(r.warnings, `Formule ${f.code}`).toEqual([]);
    }
  });
});

describe('rationCalculator · conso journalière/totale', () => {
  it('conso journalière = effectif × ration', () => {
    expect(consoJournaliereKg(17, 2.5)).toBeCloseTo(42.5, 5);
  });

  it('conso journalière avec effectif = 0 → 0', () => {
    expect(consoJournaliereKg(0, 2.5)).toBe(0);
  });

  it('conso totale sur N jours', () => {
    expect(consoTotaleKg(10, 2, 30)).toBe(600); // 10 × 2 × 30
  });

  it('conso totale avec jours <= 0 → 0', () => {
    expect(consoTotaleKg(10, 2, 0)).toBe(0);
    expect(consoTotaleKg(10, 2, -5)).toBe(0);
  });
});
