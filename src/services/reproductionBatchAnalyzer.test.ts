/**
 * Tests unitaires — reproductionBatchAnalyzer (V23-S2)
 * ════════════════════════════════════════════════════════
 * Couverture : groupement par fenêtre, calcul progression, statut cascade,
 * findBandeForSaillie, formatBatchLabel.
 */

import { describe, expect, it } from 'vitest';
import {
  buildReproBatches,
  findBandeForSaillie,
  formatBatchLabel,
} from './reproductionBatchAnalyzer';
import type {
  Truie,
  Saillie,
  BandePorcelets,
  TruieStatut,
  BandeStatut,
} from '../types/farm';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(id: string, statut: TruieStatut, overrides: Partial<Truie> = {}): Truie {
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

function makeSaillie(truieId: string, dateSaillie: string): Saillie {
  return {
    truieId,
    truieBoucle: `FR-${truieId}`,
    dateSaillie,
    verratId: 'V01',
    statut: 'CONFIRMEE',
  };
}

function makeBande(
  id: string,
  truieId: string,
  statut: BandeStatut,
  overrides: Partial<BandePorcelets> = {},
): BandePorcelets {
  return {
    id,
    idPortee: `P${id}`,
    truie: truieId,
    boucleMere: `FR-${truieId}`,
    statut,
    vivants: 10,
    poidsInitialKg: 0,
    synced: true,
    ...overrides,
  };
}

const TODAY = new Date(2026, 4, 1); // 2026-05-01

// ─── 1. Liste vide ──────────────────────────────────────────────────────────

describe('buildReproBatches — cas vide', () => {
  it('retourne [] sur saillies vides', () => {
    const out = buildReproBatches({ truies: [], saillies: [], bandes: [], today: TODAY });
    expect(out).toEqual([]);
  });
});

// ─── 2. 3 saillies serrées → 1 batch ────────────────────────────────────────

describe('buildReproBatches — groupement 1 batch', () => {
  it('regroupe 3 saillies espacées de 1-2j en 1 batch', () => {
    const truies = [
      makeTruie('T01', 'Pleine'),
      makeTruie('T02', 'Pleine'),
      makeTruie('T03', 'Pleine'),
    ];
    const saillies = [
      makeSaillie('T01', '15/04/2026'),
      makeSaillie('T02', '16/04/2026'),
      makeSaillie('T03', '17/04/2026'),
    ];
    const out = buildReproBatches({ truies, saillies, bandes: [], today: TODAY });
    expect(out).toHaveLength(1);
    expect(out[0].saillies).toHaveLength(3);
    expect(out[0].truies).toHaveLength(3);
    expect(out[0].windowStart).toBe('2026-04-15');
    expect(out[0].windowEnd).toBe('2026-04-17');
    expect(out[0].id).toBe('2026-04-16-batch');
  });
});

// ─── 3. 3 saillies sur 12j → 2 batches ──────────────────────────────────────

describe('buildReproBatches — groupement 2 batches', () => {
  it('sépare en 2 batches quand l\'écart dépasse windowDays', () => {
    const truies = [
      makeTruie('T01', 'Pleine'),
      makeTruie('T02', 'Pleine'),
      makeTruie('T03', 'Pleine'),
    ];
    const saillies = [
      makeSaillie('T01', '01/04/2026'),
      makeSaillie('T02', '03/04/2026'),
      makeSaillie('T03', '13/04/2026'),
    ];
    const out = buildReproBatches({ truies, saillies, bandes: [], today: TODAY, windowDays: 5 });
    expect(out).toHaveLength(2);
    expect(out[0].saillies).toHaveLength(2);
    expect(out[1].saillies).toHaveLength(1);
  });
});

// ─── 4. Batch sans bande liée ──────────────────────────────────────────────

describe('buildReproBatches — batch sans bande', () => {
  it('miseBas=0, statut EN_SAILLIE quand truies pas pleines', () => {
    const truies = [
      makeTruie('T01', 'En attente saillie'),
      makeTruie('T02', 'En attente saillie'),
    ];
    const saillies = [
      makeSaillie('T01', '15/04/2026'),
      makeSaillie('T02', '16/04/2026'),
    ];
    const out = buildReproBatches({ truies, saillies, bandes: [], today: TODAY });
    expect(out).toHaveLength(1);
    expect(out[0].progression.miseBas).toBe(0);
    expect(out[0].progression.echos).toBe(0);
    expect(out[0].statut).toBe('EN_SAILLIE');
    expect(out[0].nbPortees).toBe(0);
  });
});

// ─── 5. Batch avec 1/2 saillies → bande liée → MATERNITE ────────────────────

describe('buildReproBatches — batch en maternité', () => {
  it('miseBas=0.5, statut MATERNITE quand 1 bande sur 2', () => {
    const truies = [
      makeTruie('T01', 'En maternité'),
      makeTruie('T02', 'Pleine'),
    ];
    const saillies = [
      makeSaillie('T01', '01/01/2026'),
      makeSaillie('T02', '02/01/2026'),
    ];
    // Bande pour T01 : dateMB ≈ 01/01/2026 + 115j = 26/04/2026
    const bandes = [
      makeBande('B01', 'T01', 'Sous mère', { dateMB: '26/04/2026', vivants: 12 }),
    ];
    const out = buildReproBatches({ truies, saillies, bandes, today: TODAY });
    expect(out).toHaveLength(1);
    expect(out[0].progression.miseBas).toBe(0.5);
    expect(out[0].statut).toBe('MATERNITE');
    expect(out[0].porceletsVivants).toBe(12);
    expect(out[0].nbPortees).toBe(1);
  });
});

// ─── 6. Batch toutes bandes sevrées → TERMINE ───────────────────────────────

describe('buildReproBatches — batch terminé', () => {
  it('statut TERMINE quand 100% des bandes sont sevrées', () => {
    const truies = [
      makeTruie('T01', 'En attente saillie'),
      makeTruie('T02', 'En attente saillie'),
    ];
    const saillies = [
      makeSaillie('T01', '01/01/2026'),
      makeSaillie('T02', '02/01/2026'),
    ];
    const bandes = [
      makeBande('B01', 'T01', 'Sevrés', {
        dateMB: '26/04/2026',
        dateSevrageReelle: '24/04/2026',
        vivants: 10,
      }),
      makeBande('B02', 'T02', 'Sevrés', {
        dateMB: '27/04/2026',
        dateSevrageReelle: '25/04/2026',
        vivants: 11,
      }),
    ];
    const out = buildReproBatches({ truies, saillies, bandes, today: TODAY });
    expect(out).toHaveLength(1);
    expect(out[0].progression.miseBas).toBe(1);
    expect(out[0].progression.sevrages).toBe(1);
    expect(out[0].statut).toBe('TERMINE');
    expect(out[0].porceletsVivants).toBe(21);
  });
});

// ─── 7. findBandeForSaillie : match dans tolérance ──────────────────────────

describe('findBandeForSaillie — match', () => {
  it('matche une bande dont dateMB est saillie+115j ±10j', () => {
    const saillie = makeSaillie('T01', '01/01/2026');
    // 01/01/2026 + 115j = 26/04/2026. On teste à 28/04 (Δ=2j, < 10).
    const bande = makeBande('B01', 'T01', 'Sous mère', { dateMB: '28/04/2026' });
    expect(findBandeForSaillie(saillie, [bande])).toBe(bande);
  });
});

// ─── 8. findBandeForSaillie : pas de match ─────────────────────────────────

describe('findBandeForSaillie — no match', () => {
  it('retourne null quand dateMB hors tolérance', () => {
    const saillie = makeSaillie('T01', '01/01/2026');
    // 01/01/2026 + 115j = 26/04/2026. Bande à 15/05 (Δ=19j, > 10).
    const bande = makeBande('B01', 'T01', 'Sous mère', { dateMB: '15/05/2026' });
    expect(findBandeForSaillie(saillie, [bande])).toBeNull();
  });

  it('retourne null quand truie ne correspond pas', () => {
    const saillie = makeSaillie('T01', '01/01/2026');
    const bande = makeBande('B01', 'T05', 'Sous mère', { dateMB: '26/04/2026' });
    expect(findBandeForSaillie(saillie, [bande])).toBeNull();
  });
});

// ─── 9. formatBatchLabel ────────────────────────────────────────────────────

describe('formatBatchLabel', () => {
  it('produit "Vague du JJ/MM/YYYY — N saillies"', () => {
    const truies = [makeTruie('T01', 'Pleine'), makeTruie('T02', 'Pleine')];
    const saillies = [
      makeSaillie('T01', '15/04/2026'),
      makeSaillie('T02', '16/04/2026'),
    ];
    const [batch] = buildReproBatches({ truies, saillies, bandes: [], today: TODAY });
    expect(formatBatchLabel(batch)).toBe('Vague du 15/04/2026 — 2 saillies');
  });

  it('singulier sur 1 saillie', () => {
    const truies = [makeTruie('T01', 'Pleine')];
    const saillies = [makeSaillie('T01', '15/04/2026')];
    const [batch] = buildReproBatches({ truies, saillies, bandes: [], today: TODAY });
    expect(formatBatchLabel(batch)).toBe('Vague du 15/04/2026 — 1 saillie');
  });
});

// ─── Bonus : statut GESTATION ───────────────────────────────────────────────

describe('buildReproBatches — statut GESTATION', () => {
  it('GESTATION quand ≥80% truies pleines, pas de bande', () => {
    const truies = [
      makeTruie('T01', 'Pleine'),
      makeTruie('T02', 'Pleine'),
      makeTruie('T03', 'Pleine'),
      makeTruie('T04', 'Pleine'),
      makeTruie('T05', 'En attente saillie'),
    ];
    const saillies = [
      makeSaillie('T01', '15/04/2026'),
      makeSaillie('T02', '16/04/2026'),
      makeSaillie('T03', '17/04/2026'),
      makeSaillie('T04', '18/04/2026'),
      makeSaillie('T05', '19/04/2026'),
    ];
    const out = buildReproBatches({ truies, saillies, bandes: [], today: TODAY });
    expect(out).toHaveLength(1);
    expect(out[0].progression.echos).toBeGreaterThanOrEqual(0.8);
    expect(out[0].progression.miseBas).toBe(0);
    expect(out[0].statut).toBe('GESTATION');
  });
});
