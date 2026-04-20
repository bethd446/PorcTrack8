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
  buildMortalityJournalRow,
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

// ─── buildMortalityJournalRow ────────────────────────────────────────────────

describe('buildMortalityJournalRow', () => {
  it('produit une ligne JOURNAL_SANTE conforme au schéma', () => {
    const now = new Date('2026-04-19T10:00:00.000Z');
    const row = buildMortalityJournalRow({
      bandeId: 'B-001',
      nbMorts: 2,
      observation: '  écrasement loge 3  ',
      auteur: 'Pierre',
      now,
    });
    expect(row).toEqual([
      '2026-04-19T10:00:00.000Z',
      'BANDE',
      'B-001',
      'MORTALITE',
      '2 morts',
      'écrasement loge 3',
      'Pierre',
    ]);
  });

  it('gère le singulier correctement', () => {
    const row = buildMortalityJournalRow({
      bandeId: 'B-001',
      nbMorts: 1,
      observation: '',
      auteur: 'A',
    });
    expect(row[4]).toBe('1 mort');
  });
});

// ─── submitMortality ─────────────────────────────────────────────────────────

describe('submitMortality', () => {
  it('valid submit : append JOURNAL_SANTE + update PORCELETS_BANDES_DETAIL', async () => {
    const appendRow = vi.fn().mockResolvedValue(undefined);
    const updateRow = vi.fn().mockResolvedValue(undefined);
    const bande = makeBande({ id: 'B-042', vivants: 12, morts: 2, nv: 14 });
    const fixedNow = new Date('2026-04-19T10:00:00.000Z');

    const result = await submitMortality(bande, 3, 'écrasement loge 3', {
      appendRow,
      updateRow,
      getAuteur: () => 'Tester',
      isOnline: () => true,
      now: () => fixedNow,
    });

    expect(appendRow).toHaveBeenCalledTimes(1);
    expect(appendRow).toHaveBeenCalledWith('JOURNAL_SANTE', [
      '2026-04-19T10:00:00.000Z',
      'BANDE',
      'B-042',
      'MORTALITE',
      '3 morts',
      'écrasement loge 3',
      'Tester',
    ]);

    expect(updateRow).toHaveBeenCalledTimes(1);
    expect(updateRow).toHaveBeenCalledWith('PORCELETS_BANDES_DETAIL', 'ID', 'B-042', {
      VIVANTS: 9,
      MORTS: 5,
    });

    expect(result).toEqual({
      online: true,
      nbMorts: 3,
      patch: { VIVANTS: 9, MORTS: 5 },
    });
  });

  it('borne max : 25 est réduit à 20 avant enregistrement', async () => {
    const appendRow = vi.fn().mockResolvedValue(undefined);
    const updateRow = vi.fn().mockResolvedValue(undefined);
    const bande = makeBande({ id: 'B-001', vivants: 30, morts: 0, nv: 30 });

    const result = await submitMortality(bande, 25, '', {
      appendRow,
      updateRow,
      getAuteur: () => 'A',
      isOnline: () => true,
    });

    expect(result.nbMorts).toBe(20);
    expect(updateRow).toHaveBeenCalledWith(
      'PORCELETS_BANDES_DETAIL',
      'ID',
      'B-001',
      { VIVANTS: 10, MORTS: 20 },
    );
    const appendArgs = appendRow.mock.calls[0][1] as unknown[];
    expect(appendArgs[4]).toBe('20 morts');
  });

  it('offline mode : online=false est propagé pour toast contextualisé', async () => {
    const appendRow = vi.fn().mockResolvedValue(undefined);
    const updateRow = vi.fn().mockResolvedValue(undefined);
    const bande = makeBande();

    const result = await submitMortality(bande, 1, '', {
      appendRow,
      updateRow,
      getAuteur: () => 'A',
      isOnline: () => false,
    });

    // Malgré l'offline, les deux enqueues ont été appelés (pattern offline-first)
    expect(appendRow).toHaveBeenCalledTimes(1);
    expect(updateRow).toHaveBeenCalledTimes(1);
    expect(result.online).toBe(false);
    expect(result.nbMorts).toBe(1);
  });

  it('append précède update (ordre des 2 enqueues préservé pour audit trail)', async () => {
    // Le journal (audit trail) doit être écrit avant la patch idempotente :
    // si la patch échoue, on garde au moins une trace de l'intention.
    const calls: string[] = [];
    const appendRow = vi.fn().mockImplementation(async () => {
      calls.push('append');
    });
    const updateRow = vi.fn().mockImplementation(async () => {
      calls.push('update');
    });

    await submitMortality(
      makeBande({ id: 'B-777', vivants: 10, morts: 0, nv: 10 }),
      2,
      'loge 2',
      {
        appendRow,
        updateRow,
        getAuteur: () => 'A',
        isOnline: () => true,
      },
    );

    expect(calls).toEqual(['append', 'update']);
    // Vérifie aussi que les deux ont bien été invoqués une seule fois
    expect(appendRow).toHaveBeenCalledTimes(1);
    expect(updateRow).toHaveBeenCalledTimes(1);
    // Le sheet cible de chaque enqueue reste correct
    expect(appendRow.mock.calls[0][0]).toBe('JOURNAL_SANTE');
    expect(updateRow.mock.calls[0][0]).toBe('PORCELETS_BANDES_DETAIL');
  });

  it('propage une erreur d\'enqueue (pas de faux succès silencieux)', async () => {
    // Si le premier enqueue échoue (ex: Preferences.set KO sur Android),
    // submitMortality doit rejeter pour que l'UI affiche une erreur plutôt
    // qu'un toast "enregistré" mensonger.
    const appendRow = vi.fn().mockRejectedValue(new Error('Preferences KO'));
    const updateRow = vi.fn().mockResolvedValue(undefined);

    await expect(
      submitMortality(makeBande(), 1, '', {
        appendRow,
        updateRow,
        getAuteur: () => 'A',
        isOnline: () => true,
      }),
    ).rejects.toThrow('Preferences KO');

    // L'update ne doit PAS avoir été tenté si l'append a échoué
    expect(updateRow).not.toHaveBeenCalled();
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

  it('utilise IonSelect (pas un <select> natif, bugué sur Android Capacitor)', () => {
    // Sur Android, <select> natif dans un IonModal avec breakpoints peut ne
    // pas s'ouvrir correctement à cause des transforms. IonSelect avec
    // interface="popover" est la solution éprouvée (cf. QuickHealthForm).
    expect(SRC).toMatch(/<IonSelect\b/);
    expect(SRC).toMatch(/interface="popover"/);
    expect(SRC).not.toMatch(/<select\s/);
  });
});
