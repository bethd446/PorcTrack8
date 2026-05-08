// @vitest-environment jsdom
/**
 * Tests unitaires — PorceletsReorgWizard (V72 "Création manuelle de bandes")
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre la logique métier exportée :
 *   1. buildBandeCodeId() : format `B-{YYMMDD}-L{numero}-{stadeCode}`
 *   2. avgPoids() : moyenne arrondie au dixième + cas vides
 *   3. poidsCohorent() : plages par stade (warning soft)
 *   4. filtrePorcelets() : filtre sexe + tranche poids
 *   5. typeLogeCoherent() : MIXTE toujours OK ; MALES/FEMELLES strict
 *   6. MAX_PORCELETS_PAR_BANDE constante
 */
import { describe, it, expect } from 'vitest';

import {
  MAX_PORCELETS_PAR_BANDE,
  avgPoids,
  buildBandeCodeId,
  filtrePorcelets,
  poidsCohorent,
  typeLogeCoherent,
} from './PorceletsReorgWizard';

describe('PorceletsReorgWizard — helpers métier', () => {
  describe('MAX_PORCELETS_PAR_BANDE', () => {
    it('vaut 40 (règle métier stricte Christophe)', () => {
      expect(MAX_PORCELETS_PAR_BANDE).toBe(40);
    });
  });

  describe('buildBandeCodeId', () => {
    it('formate en B-YYMMDD-L{numero}-{stadeCode} pour Post-sevrage', () => {
      const code = buildBandeCodeId('Post-sevrage', 'L7', new Date(2026, 4, 8));
      expect(code).toBe('B-260508-LL7-PS');
    });

    it('formate Maternité avec code MAT', () => {
      const code = buildBandeCodeId('Sous mère', '12', new Date(2026, 0, 1));
      expect(code).toBe('B-260101-L12-MAT');
    });

    it('formate Engraissement avec code ENG', () => {
      const code = buildBandeCodeId('Engraissement', 'L5', new Date(2026, 11, 31));
      expect(code).toBe('B-261231-LL5-ENG');
    });

    it('nettoie les caractères non alphanumériques du numéro de loge', () => {
      const code = buildBandeCodeId('Croissance', 'L-Rattrapage 5', new Date(2026, 0, 1));
      expect(code).toBe('B-260101-LLRattrapage5-CR');
    });

    it('utilise LX si numero vide ou seulement caractères spéciaux', () => {
      const code = buildBandeCodeId('Finition', '   ', new Date(2026, 0, 1));
      expect(code).toBe('B-260101-LLX-FIN');
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

  describe('typeLogeCoherent', () => {
    it('MIXTE est toujours cohérent', () => {
      expect(
        typeLogeCoherent('MIXTE', [
          { sexe: 'M' },
          { sexe: 'F' },
          { sexe: 'INCONNU' },
        ]),
      ).toBe(true);
    });

    it('MALES exige tous mâles', () => {
      expect(typeLogeCoherent('MALES', [{ sexe: 'M' }, { sexe: 'M' }])).toBe(true);
      expect(typeLogeCoherent('MALES', [{ sexe: 'M' }, { sexe: 'F' }])).toBe(false);
    });

    it('FEMELLES exige toutes femelles', () => {
      expect(typeLogeCoherent('FEMELLES', [{ sexe: 'F' }, { sexe: 'F' }])).toBe(true);
      expect(typeLogeCoherent('FEMELLES', [{ sexe: 'F' }, { sexe: 'M' }])).toBe(false);
    });

    it('liste vide est cohérente avec tous types', () => {
      expect(typeLogeCoherent('MALES', [])).toBe(true);
      expect(typeLogeCoherent('FEMELLES', [])).toBe(true);
      expect(typeLogeCoherent('MIXTE', [])).toBe(true);
    });
  });
});
