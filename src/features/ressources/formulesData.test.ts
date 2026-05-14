import { describe, expect, it } from 'vitest';
import {
  FORMULES,
  FORMULES_MARCHE,
  computeCoutKg,
  type Formule,
} from './formulesData';

/**
 * Invariants des référentiels de formules d'aliment.
 * V82 — couvre FORMULES (mockup V78) + FORMULES_MARCHE (référentiel marché
 * Afrique de l'Ouest, prix réels 2026).
 */

const ALL_PILL_TONES = ['amber', 'soft', 'success', 'info', 'warm'] as const;

function checkInvariants(label: string, formules: Formule[]): void {
  describe(label, () => {
    it('chaque formule a une composition qui somme à 100 %', () => {
      for (const f of formules) {
        const total = f.ingredients.reduce((s, i) => s + i.pourcent, 0);
        expect(total, `${f.id} — somme pourcent`).toBe(100);
      }
    });

    it('pillTone ∈ {amber, soft, success, info, warm}', () => {
      for (const f of formules) {
        expect(ALL_PILL_TONES, `${f.id} — pillTone`).toContain(f.pillTone);
      }
    });

    it('id et codePhase sont non vides et uniques dans le référentiel', () => {
      const ids = new Set<string>();
      const codes = new Set<string>();
      for (const f of formules) {
        expect(f.id.length, `${f.id} — id non vide`).toBeGreaterThan(0);
        expect(f.codePhase.length, `${f.codePhase} — codePhase non vide`).toBeGreaterThan(0);
        expect(ids.has(f.id), `${f.id} — id dupliqué`).toBe(false);
        expect(codes.has(f.codePhase), `${f.codePhase} — codePhase dupliqué`).toBe(false);
        ids.add(f.id);
        codes.add(f.codePhase);
      }
    });

    it('chaque formule a au moins 1 ingrédient et 1 apport', () => {
      for (const f of formules) {
        expect(f.ingredients.length, `${f.id} — ingrédients`).toBeGreaterThan(0);
        expect(f.apports.length, `${f.id} — apports`).toBeGreaterThan(0);
      }
    });
  });
}

checkInvariants('FORMULES (mockup V78)', FORMULES);
checkInvariants('FORMULES_MARCHE (référentiel marché V82)', FORMULES_MARCHE);

describe('FORMULES_MARCHE — spécifique', () => {
  it('contient les 7 formules de référence attendues', () => {
    expect(FORMULES_MARCHE).toHaveLength(7);
    const codes = FORMULES_MARCHE.map((f) => f.codePhase);
    expect(codes).toEqual([
      'POST_SEVRAGE',
      'CROISSANCE_STD',
      'CROISSANCE_RAPIDE',
      'ENGRAISSEMENT_ECO',
      'FINITION',
      'TRUIE_GESTANTE',
      'TRUIE_ALLAITANTE',
    ]);
  });

  it('tous les prix matières et coûts sont strictement positifs', () => {
    for (const f of FORMULES_MARCHE) {
      expect(f.coutKgFcfa).toBeGreaterThan(0);
      for (const ing of f.ingredients) {
        expect(ing.prixKgFcfa, `${f.id}/${ing.nom}`).toBeGreaterThan(0);
        expect(ing.pourcent, `${f.id}/${ing.nom}`).toBeGreaterThan(0);
      }
    }
  });

  it('coutKgFcfa déclaré == computeCoutKg(ingredients) — calcul strict', () => {
    // FORMULES_MARCHE est conçu avec le calcul strict (contrairement à
    // FORMULES mockup V78 dont les coûts sont préenregistrés).
    for (const f of FORMULES_MARCHE) {
      expect(computeCoutKg(f.ingredients), `${f.id} — coût recalculé`).toBe(
        f.coutKgFcfa,
      );
    }
  });

  it('bandes est vide (rempli runtime par l\'app)', () => {
    for (const f of FORMULES_MARCHE) {
      expect(f.bandes, `${f.id} — bandes`).toEqual([]);
    }
  });
});
