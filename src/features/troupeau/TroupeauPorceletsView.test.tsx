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
import type { BandePorcelets, BandeStatut, Loge } from '../../types/farm';
import {
  joursPostSevrage,
  logeNumeroPrefixed,
} from './TroupeauPorceletsView';

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
    poidsInitialKg: 0,
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

  it('section Post-sevrage : 6 loges (4 occupées 23/22/28/29, 2 vides)', () => {
    const repart = FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION;
    expect(repart.length).toBe(6);
    expect(repart.map(l => l.id)).toEqual(['Loge 1', 'Loge 2', 'Loge 3', 'Loge 4', 'Loge 5', 'Loge 6']);
    expect(repart.map(l => l.porcelets)).toEqual([23, 22, 28, 29, 0, 0]);
    expect(computePostSevrageTotal()).toBe(102); // total inchangé (loges 5+6 = 0)
  });
});

// ─── V25 — Refonte par loge ────────────────────────────────────────────────

function makeLoge(
  id: string,
  numero: string,
  type: Loge['type'],
  active = true,
): Loge {
  return { id, numero, type, active };
}

/**
 * Reproduit fidèlement la dérivation `occupiedLoges` du composant :
 * une bande active (filterReal) avec un logeId connu → 1 ligne par loge.
 */
function computeOccupiedLoges(
  bandes: BandePorcelets[],
  loges: Loge[],
): { logeId: string; bandeId: string; vivants: number; numeroPrefixed: string }[] {
  const real = Bandes.filterReal(bandes);
  const byLoge = new Map<string, BandePorcelets>();
  for (const b of real) {
    if (b.logeId) byLoge.set(b.logeId, b);
  }
  const out: { logeId: string; bandeId: string; vivants: number; numeroPrefixed: string }[] = [];
  for (const l of loges) {
    const b = byLoge.get(l.id);
    if (!b) continue;
    out.push({
      logeId: l.id,
      bandeId: b.id,
      vivants: b.vivants ?? 0,
      numeroPrefixed: logeNumeroPrefixed(l),
    });
  }
  return out;
}

/** Loges porcelets vides (parmi types M/PS/C/E/F). */
function computeEmptyLoges(
  bandes: BandePorcelets[],
  loges: Loge[],
): Loge[] {
  const occupied = new Set(computeOccupiedLoges(bandes, loges).map(o => o.logeId));
  const PORC_TYPES: Loge['type'][] = [
    'MATERNITE',
    'POST_SEVRAGE',
    'CROISSANCE',
    'ENGRAISSEMENT',
    'FINITION',
  ];
  return loges.filter(l => PORC_TYPES.includes(l.type) && !occupied.has(l.id));
}

describe('TroupeauPorceletsView — V25 vue par loge', () => {
  it('logeNumeroPrefixed : préfixe selon type (M-/PS-/C-/E-/F-)', () => {
    expect(logeNumeroPrefixed(makeLoge('a', '01', 'MATERNITE'))).toBe('M-01');
    expect(logeNumeroPrefixed(makeLoge('b', '02', 'POST_SEVRAGE'))).toBe('PS-02');
    expect(logeNumeroPrefixed(makeLoge('c', '03', 'CROISSANCE'))).toBe('C-03');
    expect(logeNumeroPrefixed(makeLoge('d', '04', 'ENGRAISSEMENT'))).toBe('E-04');
    expect(logeNumeroPrefixed(makeLoge('e', '05', 'FINITION'))).toBe('F-05');
  });

  it('logeNumeroPrefixed : ne double pas le préfixe si déjà présent', () => {
    expect(logeNumeroPrefixed(makeLoge('a', 'M-01', 'MATERNITE'))).toBe('M-01');
    expect(logeNumeroPrefixed(makeLoge('b', 'PS-02', 'POST_SEVRAGE'))).toBe('PS-02');
  });

  it('joursPostSevrage : calcul depuis dateSevrageReelle (priorité)', () => {
    const today = new Date(Date.UTC(2026, 4, 1));
    const b: BandePorcelets = {
      id: 'B1',
      idPortee: 'P1',
      statut: 'Sevrés',
      poidsInitialKg: 0,
      synced: true,
      dateSevrageReelle: '2026-04-21',
      dateSevragePrevue: '2026-04-15',
    };
    expect(joursPostSevrage(b, today)).toBe(10);
  });

  it('joursPostSevrage : fallback sur dateSevragePrevue', () => {
    const today = new Date(Date.UTC(2026, 4, 1));
    const b: BandePorcelets = {
      id: 'B1',
      idPortee: 'P1',
      statut: 'Sous mère',
      poidsInitialKg: 0,
      synced: true,
      dateSevragePrevue: '2026-04-26',
    };
    expect(joursPostSevrage(b, today)).toBe(5);
  });

  it('joursPostSevrage : null si aucune date', () => {
    const today = new Date(Date.UTC(2026, 4, 1));
    const b: BandePorcelets = {
      id: 'B1',
      idPortee: 'P1',
      statut: 'Sous mère',
      poidsInitialKg: 0,
      synced: true,
    };
    expect(joursPostSevrage(b, today)).toBeNull();
  });

  it('rend la liste par loge avec correctes infos', () => {
    counter = 0;
    const loges: Loge[] = [
      makeLoge('L-M1', '01', 'MATERNITE'),
      makeLoge('L-PS1', '01', 'POST_SEVRAGE'),
      makeLoge('L-PS2', '02', 'POST_SEVRAGE'),
      makeLoge('L-E1', '01', 'ENGRAISSEMENT'),
    ];
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère', 12, { logeId: 'L-M1', poidsMoyenKg: 8 }),
      makeBande('Sevrés', 22, { logeId: 'L-PS1', poidsMoyenKg: 18 }),
      makeBande('RECAP', 0, { logeId: 'L-PS2' }), // exclu par filterReal
    ];
    const occupied = computeOccupiedLoges(bandes, loges);
    expect(occupied).toHaveLength(2);
    expect(occupied[0]).toMatchObject({
      logeId: 'L-M1',
      vivants: 12,
      numeroPrefixed: 'M-01',
    });
    expect(occupied[1]).toMatchObject({
      logeId: 'L-PS1',
      vivants: 22,
      numeroPrefixed: 'PS-01',
    });

    const empty = computeEmptyLoges(bandes, loges);
    // L-PS2 et L-E1 sont vides (RECAP exclue)
    expect(empty.map(l => l.id).sort()).toEqual(['L-E1', 'L-PS2']);
  });

  it('compte total têtes & nb bandes pour le summary strip', () => {
    counter = 0;
    const loges: Loge[] = [
      makeLoge('L-M1', '01', 'MATERNITE'),
      makeLoge('L-M2', '02', 'MATERNITE'),
      makeLoge('L-PS1', '01', 'POST_SEVRAGE'),
    ];
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère', 11, { logeId: 'L-M1' }),
      makeBande('Sous mère', 13, { logeId: 'L-M2' }),
      makeBande('Sevrés', 22, { logeId: 'L-PS1' }),
    ];
    const occupied = computeOccupiedLoges(bandes, loges);
    const total = occupied.reduce((s, o) => s + o.vivants, 0);
    expect(occupied).toHaveLength(3);
    expect(total).toBe(46);
  });
});
