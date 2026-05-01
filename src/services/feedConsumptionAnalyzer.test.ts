/**
 * Tests unitaires — feedConsumptionAnalyzer
 * ════════════════════════════════════════════════════════════════════════
 * Couvre les helpers purs : computeKgPorcProduit, computeICRatio,
 * computeVsTheoriquePct, buildICReel.
 *
 * `computeICReel` (qui touche Supabase) n'est pas testé ici — il sera
 * couvert par les tests d'intégration BandeDetailView.
 */

import { describe, expect, it } from 'vitest';
import {
  buildICReel,
  computeICRatio,
  computeKgPorcProduit,
  computeVsTheoriquePct,
  IC_THEORIQUE_DEFAUT,
  MIN_SAISIES_FIABLE,
  POIDS_NAISSANCE_KG,
  type FeedConsoLog,
} from './feedConsumptionAnalyzer';

describe('computeKgPorcProduit', () => {
  it('retourne (poids - naissance) × vivants pour des valeurs valides', () => {
    expect(computeKgPorcProduit(30, 10)).toBe((30 - POIDS_NAISSANCE_KG) * 10);
    expect(computeKgPorcProduit(110, 8)).toBe((110 - POIDS_NAISSANCE_KG) * 8);
  });

  it('retourne 0 quand le poids est inférieur ou égal à la naissance', () => {
    expect(computeKgPorcProduit(POIDS_NAISSANCE_KG, 10)).toBe(0);
    expect(computeKgPorcProduit(0.5, 10)).toBe(0);
  });

  it('retourne 0 quand vivants <= 0 ou inputs invalides', () => {
    expect(computeKgPorcProduit(30, 0)).toBe(0);
    expect(computeKgPorcProduit(30, -2)).toBe(0);
    expect(computeKgPorcProduit(Number.NaN, 10)).toBe(0);
  });
});

describe('computeICRatio', () => {
  it('retourne livre / produit avec arrondi 2 décimales', () => {
    expect(computeICRatio(2850, 1000)).toBe(2.85);
    expect(computeICRatio(300, 100)).toBe(3);
  });

  it('retourne 0 quand le dénominateur est nul ou négatif', () => {
    expect(computeICRatio(500, 0)).toBe(0);
    expect(computeICRatio(500, -10)).toBe(0);
  });
});

describe('computeVsTheoriquePct', () => {
  it('retourne un écart positif quand IC réel > théorique', () => {
    // 3.20 vs 2.85 → +12.3 %
    expect(computeVsTheoriquePct(3.2)).toBeCloseTo(12.3, 1);
  });

  it('retourne un écart négatif quand IC réel < théorique', () => {
    // 2.50 vs 2.85 → -12.3 %
    expect(computeVsTheoriquePct(2.5)).toBeCloseTo(-12.3, 1);
  });

  it('retourne 0 quand IC réel ou théorique est nul', () => {
    expect(computeVsTheoriquePct(0)).toBe(0);
    expect(computeVsTheoriquePct(2.85, 0)).toBe(0);
  });
});

describe('buildICReel', () => {
  const logs2: FeedConsoLog[] = [
    { qty_kg: 100, date_conso: '2026-04-01' },
    { qty_kg: 150, date_conso: '2026-04-15' },
  ];
  const logs5: FeedConsoLog[] = [
    { qty_kg: 100, date_conso: '2026-04-01' },
    { qty_kg: 100, date_conso: '2026-04-05' },
    { qty_kg: 100, date_conso: '2026-04-10' },
    { qty_kg: 100, date_conso: '2026-04-15' },
    { qty_kg: 100, date_conso: '2026-04-20' },
  ];

  it('calcule un IC réel correct avec saisies suffisantes', () => {
    const res = buildICReel(
      { id: 'B01', vivants: 10, poids_moyen_kg: 30 },
      logs5,
    );
    expect(res.bande_id).toBe('B01');
    expect(res.total_kg_livre).toBe(500);
    expect(res.total_kg_porc_produit).toBeCloseTo((30 - POIDS_NAISSANCE_KG) * 10, 1);
    expect(res.ic_reel).toBeGreaterThan(0);
    expect(res.fiable).toBe(true);
    expect(res.nb_saisies).toBe(5);
  });

  it('marque non fiable quand saisies < seuil minimum', () => {
    const res = buildICReel(
      { id: 'B02', vivants: 10, poids_moyen_kg: 30 },
      logs2,
    );
    expect(res.nb_saisies).toBe(2);
    expect(res.fiable).toBe(false);
    expect(MIN_SAISIES_FIABLE).toBe(3);
  });

  it('retourne ic_reel = 0 et écart 0 quand aucune saisie (empty state)', () => {
    const res = buildICReel(
      { id: 'B03', vivants: 10, poids_moyen_kg: 30 },
      [],
    );
    expect(res.total_kg_livre).toBe(0);
    expect(res.ic_reel).toBe(0);
    expect(res.vs_theorique_pct).toBe(0);
    expect(res.fiable).toBe(false);
  });

  it('calcule un écart % cohérent vs IC théorique', () => {
    // Bande qui consomme bien plus que théorique : 2000 kg pour 500 kg gain
    // → IC = 4.0 vs théorique 2.85 → écart ~ +40.4%
    const res = buildICReel(
      {
        id: 'B04',
        vivants: 10,
        poids_moyen_kg: POIDS_NAISSANCE_KG + 50,
      },
      [
        { qty_kg: 500, date_conso: '2026-04-01' },
        { qty_kg: 500, date_conso: '2026-04-05' },
        { qty_kg: 500, date_conso: '2026-04-10' },
        { qty_kg: 500, date_conso: '2026-04-15' },
      ],
    );
    expect(res.ic_reel).toBe(4);
    expect(res.vs_theorique_pct).toBeGreaterThan(0);
    expect(res.vs_theorique_pct).toBeCloseTo(
      ((4 - IC_THEORIQUE_DEFAUT) / IC_THEORIQUE_DEFAUT) * 100,
      1,
    );
  });
});
