/**
 * Tests unitaires — reproductionDashboard
 * ════════════════════════════════════════
 * Couverture des 5 étapes du cycle truie + dédoublonnages.
 */

import { describe, expect, it } from 'vitest';
import { buildReproductionDashboard } from './reproductionDashboard';
import type {
  Truie,
  Saillie,
  BandePorcelets,
  TruieStatut,
  BandeStatut,
} from '../types/farm';

// ─── Fixtures ────────────────────────────────────────────────────────────────

let truieCount = 0;
function makeTruie(statut: TruieStatut, overrides: Partial<Truie> = {}): Truie {
  truieCount += 1;
  const id = overrides.id ?? `T${String(truieCount).padStart(2, '0')}`;
  return {
    id,
    displayId: id,
    boucle: `FR-${id}`,
    statut,
    ration: 3,
    synced: true,
    ...overrides,
  };
}

let bandeCount = 0;
function makeBande(
  statut: BandeStatut,
  overrides: Partial<BandePorcelets> = {},
): BandePorcelets {
  bandeCount += 1;
  const id = overrides.id ?? `B${String(bandeCount).padStart(2, '0')}`;
  return {
    id,
    idPortee: overrides.idPortee ?? `P${String(bandeCount).padStart(2, '0')}`,
    statut,
    vivants: 10,
    synced: true,
    ...overrides,
  };
}

function makeSaillie(truieId: string, dateSaillie: string): Saillie {
  return {
    truieId,
    truieBoucle: `FR-${truieId}`,
    dateSaillie,
    verratId: 'V01',
    statut: 'Active',
  };
}

const TODAY = new Date(2026, 4, 1); // 2026-05-01

// ─── Étape 1 — À saillir ─────────────────────────────────────────────────────

describe('buildReproductionDashboard — étape 1 (À saillir)', () => {
  it('liste les truies VIDE ou CHALEUR avec contexte temporel', () => {
    const truies: Truie[] = [
      makeTruie('Vide', { id: 'T01', displayId: 'T01' }),
      makeTruie('Chaleur', { id: 'T02', displayId: 'T02' }),
      makeTruie('Pleine', { id: 'T03', displayId: 'T03' }), // exclu
      makeTruie('En maternité', { id: 'T04', displayId: 'T04' }), // exclu
      makeTruie('Réforme', { id: 'T05', displayId: 'T05' }), // exclu
    ];
    const bandes: BandePorcelets[] = [
      // Sevrage de T01 il y a 12 jours.
      makeBande('Sevrés', { truie: 'T01', dateSevrageReelle: '19/04/2026' }),
    ];
    const saillies: Saillie[] = [];

    const dash = buildReproductionDashboard(truies, saillies, bandes, TODAY);

    expect(dash.asaillir.map(i => i.truie.id)).toEqual(['T01', 'T02']);
    const t01 = dash.asaillir.find(i => i.truie.id === 'T01');
    expect(t01?.reason).toMatch(/Sevr/i);
    expect(t01?.daysSinceLastAction).toBe(12);
    const t02 = dash.asaillir.find(i => i.truie.id === 'T02');
    expect(t02?.reason).toMatch(/chaleur/i);
  });
});

// ─── Étape 2 — Écho J28 en attente ───────────────────────────────────────────

describe('buildReproductionDashboard — étape 2 (Écho en attente)', () => {
  it('garde les saillies ≥ 21j sans MB et truie non confirmée pleine', () => {
    const truies: Truie[] = [
      // Truie statut INCONNU/VIDE — saillie pas tranchée.
      makeTruie('Vide', { id: 'T10', displayId: 'T10', boucle: 'FR-T10' }),
      // Truie déjà confirmée Pleine → on n'inclut pas (écho déjà tranché).
      makeTruie('Pleine', { id: 'T11', displayId: 'T11', boucle: 'FR-T11' }),
    ];
    const saillies: Saillie[] = [
      makeSaillie('T10', '08/04/2026'), // ≥21j → inclus
      makeSaillie('T11', '06/04/2026'), // truie pleine → exclu
      makeSaillie('T10', '20/04/2026'), // <21j → exclu (saillie récente)
    ];
    const bandes: BandePorcelets[] = [];

    const dash = buildReproductionDashboard(truies, saillies, bandes, TODAY);

    expect(dash.echo.length).toBe(1);
    expect(dash.echo[0].truie.id).toBe('T10');
    expect(dash.echo[0].daysSinceSaillie).toBeGreaterThanOrEqual(21);
  });
});

// ─── Étape 3 — Mise-bas imminente ────────────────────────────────────────────

describe('buildReproductionDashboard — étape 3 (MB imminente)', () => {
  it('liste truies dont la dateMBPrevue est dans J-3 .. J+5', () => {
    const truies: Truie[] = [
      // demain (J-1) — inclus
      makeTruie('Pleine', { id: 'T20', displayId: 'T20', dateMBPrevue: '02/05/2026' }),
      // J+3 dépassé — inclus (retard)
      makeTruie('Pleine', { id: 'T21', displayId: 'T21', dateMBPrevue: '28/04/2026' }),
      // dans 10 jours — exclu
      makeTruie('Pleine', { id: 'T22', displayId: 'T22', dateMBPrevue: '11/05/2026' }),
      // pas de dateMBPrevue — exclu
      makeTruie('Pleine', { id: 'T23', displayId: 'T23' }),
    ];
    const dash = buildReproductionDashboard(truies, [], [], TODAY);
    expect(dash.mbImminente.map(i => i.truie.id).sort()).toEqual(['T20', 'T21']);
  });
});

// ─── Étape 4 — En maternité ──────────────────────────────────────────────────

describe('buildReproductionDashboard — étape 4 (En maternité)', () => {
  it('liste truies maternité avec bande sous-mère J+0 → J+28', () => {
    const truies: Truie[] = [
      makeTruie('En maternité', { id: 'T30', displayId: 'T30', boucle: 'FR-T30' }),
      makeTruie('En maternité', { id: 'T31', displayId: 'T31', boucle: 'FR-T31' }),
    ];
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère', { truie: 'T30', boucleMere: 'FR-T30', dateMB: '21/04/2026' }), // J+10
      makeBande('Sous mère', { truie: 'T31', boucleMere: 'FR-T31', dateMB: '01/03/2026' }), // J+61 → exclu (post-sevrage / retard fort)
    ];

    const dash = buildReproductionDashboard(truies, [], bandes, TODAY);

    expect(dash.enMaternite.map(i => i.truie.id)).toEqual(['T30']);
    expect(dash.enMaternite[0].daysSinceMB).toBe(10);
  });
});

// ─── Étape 5 — À sevrer ──────────────────────────────────────────────────────

describe('buildReproductionDashboard — étape 5 (À sevrer)', () => {
  it('liste les bandes sous-mère dont la date prévue est atteinte ou dépassée', () => {
    const truies: Truie[] = [
      makeTruie('En maternité', { id: 'T40', displayId: 'T40', boucle: 'FR-T40' }),
    ];
    const bandes: BandePorcelets[] = [
      // Bande prévue avant aujourd'hui : retard 2j
      makeBande('Sous mère', {
        truie: 'T40',
        boucleMere: 'FR-T40',
        dateMB: '01/04/2026',
        dateSevragePrevue: '29/04/2026',
      }),
      // Bande dont la date prévue est dans le futur : exclu
      makeBande('Sous mère', {
        truie: 'T40',
        dateMB: '20/04/2026',
        dateSevragePrevue: '18/05/2026',
      }),
      // Bande déjà sevrée (statut) → computeBandePhase la sort de SOUS_MERE
      makeBande('Sevrés', { truie: 'T40', dateSevrageReelle: '20/04/2026' }),
    ];

    const dash = buildReproductionDashboard(truies, [], bandes, TODAY);

    expect(dash.asevrer.length).toBe(1);
    expect(dash.asevrer[0].daysOverdue).toBe(2);
  });
});
