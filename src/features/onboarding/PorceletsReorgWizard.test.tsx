// @vitest-environment jsdom
/**
 * Tests unitaires — PorceletsReorgWizard (V72-P4 "Refonte wizard")
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre la logique métier exportée :
 *   1. avgPoids() : moyenne arrondie au dixième + cas vides
 *   2. poidsCohorent() : plages par stade (warning soft)
 *   3. filtrePorcelets() : filtre sexe + tranche poids
 *   4. validationNumeroBandeUnique() : non vide + pas dans la liste existante
 *   5. repartitionPorceletsParLoge() : F/M sur 2 loges, MIXTE 1 loge
 *   6. MAX_PORCELETS_PAR_BANDE constante
 */
import { describe, it, expect } from 'vitest';

import {
  MAX_PORCELETS_PAR_BANDE,
  avgPoids,
  filtrePorcelets,
  poidsCohorent,
  repartitionPorceletsParLoge,
  validationNumeroBandeUnique,
} from './PorceletsReorgWizard';

describe('PorceletsReorgWizard — helpers métier (V72-P4)', () => {
  describe('MAX_PORCELETS_PAR_BANDE', () => {
    it('vaut 40 (règle métier stricte Christophe)', () => {
      expect(MAX_PORCELETS_PAR_BANDE).toBe(40);
    });
  });

  describe('avgPoids', () => {
    it('retourne null pour liste vide', () => {
      expect(avgPoids([])).toBeNull();
    });

    it('retourne null si toutes les valeurs sont null', () => {
      expect(avgPoids([{ poids_courant_kg: null }, { poids_courant_kg: null }])).toBeNull();
    });

    it('ignore les null et calcule la moyenne sur les valeurs valides', () => {
      const avg = avgPoids([
        { poids_courant_kg: 10 },
        { poids_courant_kg: 20 },
        { poids_courant_kg: null },
      ]);
      expect(avg).toBe(15);
    });

    it('arrondit au dixième', () => {
      const avg = avgPoids([
        { poids_courant_kg: 8.5 },
        { poids_courant_kg: 8.2 },
        { poids_courant_kg: 7.8 },
      ]);
      expect(avg).toBe(8.2);
    });
  });

  describe('poidsCohorent', () => {
    it('retourne true si poids null (pas de blocage)', () => {
      expect(poidsCohorent('Post-sevrage', null)).toBe(true);
    });

    it('Post-sevrage : 5-25 kg cohérent', () => {
      expect(poidsCohorent('Post-sevrage', 10)).toBe(true);
      expect(poidsCohorent('Post-sevrage', 5)).toBe(true);
      expect(poidsCohorent('Post-sevrage', 25)).toBe(true);
    });

    it('Post-sevrage : hors plage déclenche warning', () => {
      expect(poidsCohorent('Post-sevrage', 4)).toBe(false);
      expect(poidsCohorent('Post-sevrage', 30)).toBe(false);
    });

    it('Sous mère : < 7 kg', () => {
      expect(poidsCohorent('Sous mère', 5)).toBe(true);
      expect(poidsCohorent('Sous mère', 10)).toBe(false);
    });

    it('Finition : 80-120 kg', () => {
      expect(poidsCohorent('Finition', 100)).toBe(true);
      expect(poidsCohorent('Finition', 50)).toBe(false);
    });
  });

  describe('filtrePorcelets', () => {
    const porcelets = [
      { id: '1', boucle: 'B-001', sexe: 'M' as const, poids_courant_kg: 8 },
      { id: '2', boucle: 'B-002', sexe: 'F' as const, poids_courant_kg: 4 },
      { id: '3', boucle: 'B-003', sexe: 'M' as const, poids_courant_kg: 18 },
      { id: '4', boucle: 'B-004', sexe: 'F' as const, poids_courant_kg: 35 },
      { id: '5', boucle: 'B-005', sexe: null, poids_courant_kg: null },
    ];

    it('ALL/ALL retourne tous les porcelets', () => {
      expect(filtrePorcelets(porcelets, 'ALL', 'ALL')).toHaveLength(5);
    });

    it('M filtre uniquement les mâles', () => {
      const r = filtrePorcelets(porcelets, 'M', 'ALL');
      expect(r).toHaveLength(2);
      expect(r.every((p) => p.sexe === 'M')).toBe(true);
    });

    it('F filtre uniquement les femelles', () => {
      const r = filtrePorcelets(porcelets, 'F', 'ALL');
      expect(r).toHaveLength(2);
      expect(r.every((p) => p.sexe === 'F')).toBe(true);
    });

    it('LT5 filtre poids < 5 kg', () => {
      const r = filtrePorcelets(porcelets, 'ALL', 'LT5');
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('2');
    });

    it('5_15 filtre 5 ≤ poids < 15', () => {
      const r = filtrePorcelets(porcelets, 'ALL', '5_15');
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('1');
    });

    it('15_30 filtre 15 ≤ poids < 30', () => {
      const r = filtrePorcelets(porcelets, 'ALL', '15_30');
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('3');
    });

    it('GT30 filtre poids ≥ 30', () => {
      const r = filtrePorcelets(porcelets, 'ALL', 'GT30');
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('4');
    });

    it('combine sexe + poids', () => {
      const r = filtrePorcelets(porcelets, 'F', 'GT30');
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('4');
    });

    it('exclut les porcelets sans poids des filtres poids', () => {
      const r = filtrePorcelets(porcelets, 'ALL', 'LT5');
      expect(r.find((p) => p.id === '5')).toBeUndefined();
    });
  });

  describe('validationNumeroBandeUnique', () => {
    const existing = [{ code_id: '001' }, { code_id: '2026-A' }, { code_id: 'BANDE-MARS' }];

    it('refuse une chaîne vide', () => {
      expect(validationNumeroBandeUnique('', existing)).toBe(false);
      expect(validationNumeroBandeUnique('   ', existing)).toBe(false);
    });

    it('accepte un numéro non utilisé', () => {
      expect(validationNumeroBandeUnique('002', existing)).toBe(true);
      expect(validationNumeroBandeUnique('2026-B', existing)).toBe(true);
    });

    it('refuse un numéro déjà existant (case-insensitive + trim)', () => {
      expect(validationNumeroBandeUnique('001', existing)).toBe(false);
      expect(validationNumeroBandeUnique('  001  ', existing)).toBe(false);
      expect(validationNumeroBandeUnique('bande-mars', existing)).toBe(false);
      expect(validationNumeroBandeUnique('BANDE-mars', existing)).toBe(false);
    });

    it('liste vide → tout numéro non vide est unique', () => {
      expect(validationNumeroBandeUnique('001', [])).toBe(true);
    });
  });

  describe('repartitionPorceletsParLoge', () => {
    const porcelets = [
      { id: 'p1', sexe: 'F' as const },
      { id: 'p2', sexe: 'F' as const },
      { id: 'p3', sexe: 'M' as const },
      { id: 'p4', sexe: 'M' as const },
      { id: 'p5', sexe: null },
    ];

    it('Loge 1 = MIXTE → tous les porcelets sur loge1, loge2 ignorée', () => {
      const r = repartitionPorceletsParLoge(porcelets, 'MIXTE', 'L1', 'L2');
      expect(r).toHaveLength(5);
      expect(r.every((x) => x.logeId === 'L1')).toBe(true);
    });

    it('Loge 1 = F sans loge 2 → tout sur loge1', () => {
      const r = repartitionPorceletsParLoge(porcelets, 'F', 'L1', null);
      expect(r.every((x) => x.logeId === 'L1')).toBe(true);
    });

    it('Loge 1 = F + Loge 2 → F sur L1, M sur L2, sexe inconnu reste sur L1', () => {
      const r = repartitionPorceletsParLoge(porcelets, 'F', 'L1', 'L2');
      expect(r.find((x) => x.porceletId === 'p1')?.logeId).toBe('L1'); // F
      expect(r.find((x) => x.porceletId === 'p2')?.logeId).toBe('L1'); // F
      expect(r.find((x) => x.porceletId === 'p3')?.logeId).toBe('L2'); // M
      expect(r.find((x) => x.porceletId === 'p4')?.logeId).toBe('L2'); // M
      expect(r.find((x) => x.porceletId === 'p5')?.logeId).toBe('L1'); // null → L1
    });

    it('Loge 1 = M + Loge 2 → M sur L1, F sur L2', () => {
      const r = repartitionPorceletsParLoge(porcelets, 'M', 'L1', 'L2');
      expect(r.find((x) => x.porceletId === 'p1')?.logeId).toBe('L2'); // F → L2
      expect(r.find((x) => x.porceletId === 'p3')?.logeId).toBe('L1'); // M → L1
      expect(r.find((x) => x.porceletId === 'p5')?.logeId).toBe('L1'); // null → L1
    });

    it('liste vide retourne []', () => {
      expect(repartitionPorceletsParLoge([], 'F', 'L1', 'L2')).toEqual([]);
    });
  });
});
