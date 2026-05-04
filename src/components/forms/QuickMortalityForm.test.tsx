/**
 * Tests unitaires — QuickMortalityForm
 * ═════════════════════════════════════
 * L'environnement vitest est configuré en mode `node` (pas de jsdom), donc on
 * teste la logique métier pure extraite du composant :
 *   - clampDeaths : bornage du nombre de morts
 *   - computeMortalityPatch : patch absolue (idempotence)
 *   - submitMortality : orchestration append + update avec mocks
 */

import { describe, expect, it, vi } from 'vitest';
import {
  clampDeaths,
  computeMortalityPatch,
  buildMortalityHealthLog,
  submitMortality,
  MORTALITY_BOUNDS,
} from './QuickMortalityForm';
import type { BandePorcelets } from '../../types/farm';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-001',
    idPortee: 'P-001',
    truie: 'T-12',
    statut: 'Post-sevrage',
    nv: 14,
    vivants: 12,
    morts: 2,
    poidsInitialKg: 0,
    synced: true,
    ...overrides,
  };
}

// ─── clampDeaths ─────────────────────────────────────────────────────────────

describe('clampDeaths', () => {
  it('clamp le minimum à 1', () => {
    expect(clampDeaths(0)).toBe(1);
    expect(clampDeaths(-5)).toBe(1);
  });

  it('clamp le maximum à 20', () => {
    expect(clampDeaths(21)).toBe(20);
    expect(clampDeaths(999)).toBe(20);
    expect(clampDeaths(MORTALITY_BOUNDS.max + 1)).toBe(MORTALITY_BOUNDS.max);
  });

  it('accepte une valeur valide dans la borne', () => {
    expect(clampDeaths(1)).toBe(1);
    expect(clampDeaths(7)).toBe(7);
    expect(clampDeaths(20)).toBe(20);
  });

  it('renvoie MIN sur NaN / Infinity', () => {
    expect(clampDeaths(Number.NaN)).toBe(1);
    expect(clampDeaths(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it('tronque les décimaux vers le bas', () => {
    expect(clampDeaths(3.9)).toBe(3);
    expect(clampDeaths(1.1)).toBe(1);
  });
});

// ─── computeMortalityPatch ───────────────────────────────────────────────────

describe('computeMortalityPatch', () => {
  it('soustrait les morts du total vivants', () => {
    const patch = computeMortalityPatch({ vivants: 12, morts: 2, nv: 14 }, 3);
    expect(patch).toEqual({ VIVANTS: 9, MORTS: 5 });
  });

  it('renvoie des valeurs absolues (idempotent vis-à-vis d\'un replay)', () => {
    const bande = { vivants: 10, morts: 0, nv: 10 };
    const patchA = computeMortalityPatch(bande, 2);
    const patchB = computeMortalityPatch(bande, 2);
    // Même input -> même output : la queue peut rejouer sans double soustraction
    expect(patchA).toEqual(patchB);
    expect(patchA).toEqual({ VIVANTS: 8, MORTS: 2 });
  });

  it('borne les vivants à 0 (pas de négatif)', () => {
    const patch = computeMortalityPatch({ vivants: 2, morts: 0, nv: 2 }, 5);
    expect(patch.VIVANTS).toBe(0);
    expect(patch.MORTS).toBe(5);
  });

  it('déduit morts depuis nv - vivants si morts undefined', () => {
    const patch = computeMortalityPatch({ vivants: 10, nv: 14 }, 1);
    // morts inférés = 14 - 10 = 4, +1 = 5
    expect(patch).toEqual({ VIVANTS: 9, MORTS: 5 });
  });

  it('traite vivants undefined comme 0', () => {
    const patch = computeMortalityPatch({}, 2);
    expect(patch).toEqual({ VIVANTS: 0, MORTS: 2 });
  });
});

// ─── buildMortalityHealthLog ─────────────────────────────────────────────────

describe('buildMortalityHealthLog', () => {
  it('produit un payload health_logs Supabase conforme', () => {
    const now = new Date('2026-04-19T10:00:00.000Z');
    const values = buildMortalityHealthLog({
      bandeId: 'B-001',
      nbMorts: 2,
      observation: '  écrasement loge 3  ',
      auteur: 'Pierre',
      now,
    });
    expect(values).toEqual({
      log_date: '2026-04-19',
      log_type: 'MORTALITE',
      animal_type: 'BANDE',
      animal_code: 'B-001',
      affected_animals: 2,
      notes: 'écrasement loge 3',
      operator: 'Pierre',
    });
  });

  it('preserve le compte d\'animaux affectés (1 mort)', () => {
    const values = buildMortalityHealthLog({
      bandeId: 'B-001',
      nbMorts: 1,
      observation: '',
      auteur: 'A',
    });
    expect(values.affected_animals).toBe(1);
    expect(values.notes).toBe('');
  });
});

// ─── submitMortality ─────────────────────────────────────────────────────────

describe('submitMortality', () => {
  it('valid submit : insertHealthLog + updateBatchByCode (helpers Supabase)', async () => {
    const insertHealthLog = vi.fn().mockResolvedValue({});
    const updateBatchByCode = vi.fn().mockResolvedValue({});
    const bande = makeBande({ id: 'B-042', vivants: 12, morts: 2, nv: 14 });
    const fixedNow = new Date('2026-04-19T10:00:00.000Z');

    const result = await submitMortality(bande, 3, 'écrasement loge 3', {
      insertHealthLog,
      updateBatchByCode,
      getAuteur: () => 'Tester',
      isOnline: () => true,
      now: () => fixedNow,
    });

    expect(insertHealthLog).toHaveBeenCalledTimes(1);
    expect(insertHealthLog).toHaveBeenCalledWith({
      log_date: '2026-04-19',
      log_type: 'MORTALITE',
      animal_type: 'BANDE',
      animal_code: 'B-042',
      affected_animals: 3,
      notes: 'écrasement loge 3',
      operator: 'Tester',
    });

    expect(updateBatchByCode).toHaveBeenCalledTimes(1);
    expect(updateBatchByCode).toHaveBeenCalledWith('B-042', {
      porcelets_nes_vivants: 9,
      nb_mort_nes: 5,
    });

    expect(result).toEqual({
      online: true,
      nbMorts: 3,
      patch: { VIVANTS: 9, MORTS: 5 },
    });
  });

  it('borne max : 25 est réduit à 20 avant enregistrement', async () => {
    const insertHealthLog = vi.fn().mockResolvedValue({});
    const updateBatchByCode = vi.fn().mockResolvedValue({});
    const bande = makeBande({ id: 'B-001', vivants: 30, morts: 0, nv: 30 });

    const result = await submitMortality(bande, 25, '', {
      insertHealthLog,
      updateBatchByCode,
      getAuteur: () => 'A',
      isOnline: () => true,
    });

    expect(result.nbMorts).toBe(20);
    expect(updateBatchByCode).toHaveBeenCalledWith('B-001', {
      porcelets_nes_vivants: 10,
      nb_mort_nes: 20,
    });
    const insertArgs = insertHealthLog.mock.calls[0][0] as { affected_animals: number };
    expect(insertArgs.affected_animals).toBe(20);
  });

  it('offline mode : online=false est propagé pour toast contextualisé', async () => {
    const insertHealthLog = vi.fn().mockResolvedValue({});
    const updateBatchByCode = vi.fn().mockResolvedValue({});
    const bande = makeBande();

    const result = await submitMortality(bande, 1, '', {
      insertHealthLog,
      updateBatchByCode,
      getAuteur: () => 'A',
      isOnline: () => false,
    });

    expect(insertHealthLog).toHaveBeenCalledTimes(1);
    expect(updateBatchByCode).toHaveBeenCalledTimes(1);
    expect(result.online).toBe(false);
    expect(result.nbMorts).toBe(1);
  });

  it('insertHealthLog précède updateBatchByCode (ordre audit trail)', async () => {
    const calls: string[] = [];
    const insertHealthLog = vi.fn().mockImplementation(async () => {
      calls.push('insert');
    });
    const updateBatchByCode = vi.fn().mockImplementation(async () => {
      calls.push('update');
    });

    await submitMortality(
      makeBande({ id: 'B-777', vivants: 10, morts: 0, nv: 10 }),
      2,
      'loge 2',
      {
        insertHealthLog,
        updateBatchByCode,
        getAuteur: () => 'A',
        isOnline: () => true,
      },
    );

    expect(calls).toEqual(['insert', 'update']);
    expect(insertHealthLog).toHaveBeenCalledTimes(1);
    expect(updateBatchByCode).toHaveBeenCalledTimes(1);
  });

  it('propage une erreur insertHealthLog (pas de faux succès silencieux)', async () => {
    const insertHealthLog = vi.fn().mockRejectedValue(new Error('Supabase KO'));
    const updateBatchByCode = vi.fn().mockResolvedValue({});

    await expect(
      submitMortality(makeBande(), 1, '', {
        insertHealthLog,
        updateBatchByCode,
        getAuteur: () => 'A',
        isOnline: () => true,
      }),
    ).rejects.toThrow('Supabase KO');

    expect(updateBatchByCode).not.toHaveBeenCalled();
  });
});

// ─── Tests structurels (source-grep) ─────────────────────────────────────────
// L'environnement node-only ne permet pas de render le composant (IonModal
// a besoin du DOM Ionic). On vérifie donc à la source les contrats clés :
//   - defaultBandeId est bien utilisé pour initialiser selectedBandeId
//   - le bouton submit est désactivé si !selectedBandeId
// Ces contrats sont critiques et seraient cassés par un refacto silencieux.

describe('QuickMortalityForm · contrats UI (source-grep)', () => {
  // Import FS au niveau du bloc pour ne pas polluer le top-level de tests
  // déjà orienté logique métier pure.
  const SRC = (() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path');
    return fs.readFileSync(
      path.resolve(__dirname, 'QuickMortalityForm.tsx'),
      'utf-8',
    );
  })();

  it('initialise selectedBandeId depuis defaultBandeId (pré-sélection bande)', () => {
    // Contrat : useState<string>(defaultBandeId ?? '') — pré-sélection à l'ouverture
    expect(SRC).toMatch(
      /useState<string>\(\s*defaultBandeId\s*\?\?\s*''\s*\)/,
    );
    // Contrat : useEffect resync si defaultBandeId change pendant que isOpen
    expect(SRC).toMatch(
      /if\s*\(\s*isOpen\s*&&\s*defaultBandeId\s*\)\s*\{\s*setSelectedBandeId\(\s*defaultBandeId\s*\)/,
    );
  });

  it('désactive le bouton submit quand aucune bande sélectionnée', () => {
    // Contrat : disabled inclut !selectedBandeId
    expect(SRC).toMatch(/disabled=\{[^}]*!selectedBandeId[^}]*\}/);
    // Contrat : disabled inclut aussi saving + bandesDispo vide
    expect(SRC).toMatch(/disabled=\{[^}]*saving[^}]*\}/);
    expect(SRC).toMatch(/bandesDispo\.length\s*===\s*0/);
  });

  it('V44 archétype 5 : utilise Select + Segment + FormField DS (0 IonSelect/IonSegment)', () => {
    // Migration V44 : 0 Ionic UI primitives — DS V2 uniquement.
    expect(SRC).not.toMatch(/<IonSelect\b/);
    expect(SRC).not.toMatch(/<IonSegment\b/);
    expect(SRC).not.toMatch(/<IonToast\b/);
    expect(SRC).toMatch(/<Select\b/);
    expect(SRC).toMatch(/<Segment\b/);
    expect(SRC).toMatch(/<FormField\b/);
  });
});
