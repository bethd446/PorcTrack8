/**
 * Tests — TroupeauPorceletsView
 * ══════════════════════════════
 * Environnement `node` (vitest) sans DOM → on teste la logique de dérivation
 * de données réellement utilisée par la vue : filtrage via
 * `Bandes.filterReal`, partitionnement Sous mère / Engraissement, totalisation
 * des 4 loges post-sevrage via `FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION`.
 *
 * Chaque test reproduit fidèlement le calcul interne du composant
 * (sans monter React), garantissant que les chiffres affichés restent corrects
 * si les helpers changent.
 */

import { describe, expect, it } from 'vitest';
import { Bandes } from '../../services/bandAnalysisEngine';
import { FARM_CONFIG } from '../../config/farm';
import type { BandePorcelets, BandeStatut } from '../../types/farm';

// ─── Fixtures ───────────────────────────────────────────────────────────────

let counter = 0;
function makeBande(
  statut: BandeStatut,
  vivants: number,
  opts: Partial<BandePorcelets> = {},
): BandePorcelets {
  counter += 1;
  return {
    id: `B${counter}`,
    idPortee: `P${counter}`,
    statut,
    vivants,
    synced: true,
    ...opts,
  };
}

/** Helper : date ISO (YYYY-MM-DD) n jours avant aujourd'hui. */
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Reproduit la logique du composant : bandes "Sous mère" après filterReal. */
function computeSousMere(bandes: BandePorcelets[]): BandePorcelets[] {
  return Bandes.filterReal(bandes).filter(b => /sous.m/i.test(b.statut || ''));
}

/** Reproduit la logique du composant : somme des porcelets dans les 4 loges. */
function computePostSevrageTotal(): number {
  return FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.reduce(
    (sum, l) => sum + l.porcelets,
    0,
  );
}

/** Reproduit la logique du composant : total porcelets affichés (sous mère + post-sevrage). */
function computeTotalPorcelets(bandes: BandePorcelets[]): number {
  const real = Bandes.filterReal(bandes);
  const sm = Bandes.countSm(real);
  return sm.porcelets + computePostSevrageTotal();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TroupeauPorceletsView — logique de dérivation', () => {
  it('empty state : aucune bande active → sousMere vide & hasAnyActive = false', () => {
    const bandes: BandePorcelets[] = [];
    const real = Bandes.filterReal(bandes);
    expect(real.length).toBe(0);
    expect(computeSousMere(bandes).length).toBe(0);
    // hasAnyActive = realBandes.length > 0
    expect(real.length > 0).toBe(false);
  });

  it('summary strip : 48 sous mère + 102 post-sevrage = 150 total', () => {
    // 4 portées maternité de 12 porcelets chacune → 48 porcelets sous mère.
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère', 12),
      makeBande('Sous mère', 12),
      makeBande('Sous mère', 12),
      makeBande('Sous mère', 12),
    ];
    const sm = Bandes.countSm(Bandes.filterReal(bandes));
    expect(sm.portees).toBe(4);
    expect(sm.porcelets).toBe(48);
    expect(computePostSevrageTotal()).toBe(102);
    expect(computeTotalPorcelets(bandes)).toBe(150);
  });

  it('section Sous mère : affiche les 4 bandes de maternité (RECAP exclue)', () => {
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère', 11),
      makeBande('Sous mère', 13),
      makeBande('Sous mère', 10),
      makeBande('Sous mère', 14),
      makeBande('Sevrés', 22, { dateSevrageReelle: daysAgoIso(10) }),
      makeBande('RECAP', 0),
    ];
    const sousMere = computeSousMere(bandes);
    expect(sousMere.length).toBe(4);
    // Aucune ligne RECAP ne doit être rendue.
    expect(sousMere.every(b => b.statut !== 'RECAP')).toBe(true);
    // Totaux cohérents avec countSm.
    const sm = Bandes.countSm(Bandes.filterReal(bandes));
    expect(sm.portees).toBe(4);
    expect(sm.porcelets).toBe(11 + 13 + 10 + 14);
  });

  it('section Post-sevrage : 4 loges avec les bons chiffres (23 / 22 / 28 / 29)', () => {
    const repart = FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION;
    expect(repart.length).toBe(4);
    expect(repart.map(l => l.id)).toEqual(['Loge 1', 'Loge 2', 'Loge 3', 'Loge 4']);
    expect(repart.map(l => l.porcelets)).toEqual([23, 22, 28, 29]);
    expect(computePostSevrageTotal()).toBe(102);
  });
});
