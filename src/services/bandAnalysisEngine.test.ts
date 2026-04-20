/**
 * Tests smoke — bandAnalysisEngine (façade unifiée)
 * ═══════════════════════════════════════════════════
 *
 * Vérifie que chaque namespace expose au moins une fonction **appelable**
 * (pas juste définie). On appelle chaque fonction publique avec des fixtures
 * minimalistes pour garantir que les ré-exports référencent bien les
 * implémentations des 4 services sources (aucune rupture d'import).
 *
 * Pas de vérification métier ici — les tests métier restent dans les fichiers
 * sources (`bandesAggregator.test.ts`, `growthAnalyzer.test.ts`, etc.).
 */

import { describe, expect, it } from 'vitest';
import { Bandes, Growth, Forecast, Perf } from './bandAnalysisEngine';
import type { BandePorcelets, Truie, Saillie } from '../types/farm';

// ─── Fixtures minimales ─────────────────────────────────────────────────────

const emptyBandes: BandePorcelets[] = [];
const emptyTruies: Truie[] = [];
const emptySaillies: Saillie[] = [];

describe('bandAnalysisEngine — namespaces', () => {
  // ─── Bandes ──────────────────────────────────────────────────────────────
  describe('Bandes', () => {
    it('expose des fonctions appelables', () => {
      expect(typeof Bandes.filterReal).toBe('function');
      expect(typeof Bandes.computePhase).toBe('function');
      expect(typeof Bandes.countByPhase).toBe('function');
      expect(typeof Bandes.logesMaternite).toBe('function');
      expect(typeof Bandes.logesPostSevrage).toBe('function');
      expect(typeof Bandes.logesEngraissement).toBe('function');
    });

    it('filterReal + countByPhase fonctionnent sur liste vide', () => {
      expect(Bandes.filterReal(emptyBandes)).toEqual([]);
      expect(Bandes.countByPhase(emptyBandes)).toEqual({
        SOUS_MERE: 0,
        POST_SEVRAGE: 0,
        ENGRAISSEMENT: 0,
      });
    });

    it('logesMaternite retourne une structure d\'occupation valide', () => {
      const occ = Bandes.logesMaternite(emptyTruies);
      expect(occ).toHaveProperty('occupees');
      expect(occ).toHaveProperty('capacite');
      expect(occ).toHaveProperty('tauxPct');
      expect(occ).toHaveProperty('alerte');
    });
  });

  // ─── Growth ──────────────────────────────────────────────────────────────
  describe('Growth', () => {
    it('expose des fonctions appelables', () => {
      expect(typeof Growth.gmq).toBe('function');
      expect(typeof Growth.growthStats).toBe('function');
      expect(typeof Growth.projectFinition).toBe('function');
      expect(typeof Growth.parsePesee).toBe('function');
    });

    it('gmq retourne [] sur moins de 2 pesées', () => {
      expect(Growth.gmq([])).toEqual([]);
      expect(
        Growth.gmq([
          { date: '2026-01-01', nbPeses: 10, poidsMoyen: 5 },
        ]),
      ).toEqual([]);
    });

    it('projectFinition calcule un gain linéaire', () => {
      // 5 kg + (500 g/j × 20 j) = 5 + 10 = 15 kg
      expect(Growth.projectFinition(5, 500, 20)).toBe(15);
    });
  });

  // ─── Forecast ────────────────────────────────────────────────────────────
  describe('Forecast', () => {
    it('expose des fonctions appelables', () => {
      expect(typeof Forecast.build).toBe('function');
      expect(typeof Forecast.week).toBe('function');
    });

    it('build retourne un rapport structuré sur données vides', () => {
      const report = Forecast.build({
        truies: emptyTruies,
        bandes: emptyBandes,
        saillies: emptySaillies,
      });
      expect(report.horizon14jEvents).toEqual([]);
      expect(Array.isArray(report.pressureByWeek)).toBe(true);
      expect(report.countByType).toEqual({
        MB: 0,
        SEVRAGE: 0,
        RETOUR_CHALEUR: 0,
        FINITION: 0,
        SATURATION: 0,
      });
    });

    it('week retourne un code ISO 8601 "YYYY-Www"', () => {
      const code = Forecast.week(new Date(2026, 3, 19)); // 19 avril 2026
      expect(code).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  // ─── Perf ────────────────────────────────────────────────────────────────
  describe('Perf', () => {
    it('expose des fonctions appelables', () => {
      expect(typeof Perf.sevresParPortee).toBe('function');
      expect(typeof Perf.mortalite).toBe('function');
      expect(typeof Perf.indiceConso).toBe('function');
      expect(typeof Perf.cyclesReussis).toBe('function');
      expect(typeof Perf.globalKpis).toBe('function');
    });

    it('globalKpis retourne un agrégat valide sur données vides', () => {
      const kpis = Perf.globalKpis(emptyTruies, emptyBandes, emptySaillies);
      expect(kpis.nbTruiesTotal).toBe(0);
      expect(kpis.nbPortees12m).toBe(0);
      expect(kpis.moyNV).toBe(0);
    });

    it('sevresParPortee retourne une sparkline structurée', () => {
      const spark = Perf.sevresParPortee(emptyBandes, '30J');
      expect(spark).toHaveProperty('value');
      expect(spark).toHaveProperty('delta');
      expect(Array.isArray(spark.series)).toBe(true);
      expect(spark.series.length).toBe(7);
    });

    it('periodeDays retourne le bon nombre de jours', () => {
      expect(Perf.periodeDays('7J')).toBe(7);
      expect(Perf.periodeDays('30J')).toBe(30);
      expect(Perf.periodeDays('90J')).toBe(90);
      expect(Perf.periodeDays('1A')).toBe(365);
    });
  });
});
