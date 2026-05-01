/**
 * Tests unitaires — QuickMiseBasForm (logic-level, node env)
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env. On teste la logique pure + l'orchestration
 * submit avec mocks. 6 cas couverts :
 *   [1] Render — defaults, suggestions ID portée, extractTruieNumber
 *   [2] Validation — truie obligatoire
 *   [3] Validation — cohérence NV (vivants + morts-nés = totaux)
 *   [4] Auto-génération ID portée (pattern `{YY}-T{N}-{SEQ:02}`, évite doublons)
 *   [5] Submit enqueue les 2 actions (append bande + update truie statut)
 *   [6] Offline queue (isOnline=false propagé pour toast)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractTruieNumber,
  suggestIdPortee,
  validateMiseBas,
  buildMiseBasRow,
  addDaysToSheetsDate,
  submitMiseBas,
  MISE_BAS_BOUNDS,
  type MiseBasDraft,
  type MiseBasBatchValues,
} from './QuickMiseBasForm';
import type { BandePorcelets } from '../../types/farm';


// ── Fixtures ────────────────────────────────────────────────────────────────

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: '26-T7-01',
    idPortee: '26-T7-01',
    truie: 'T07',
    boucleMere: 'B.21',
    statut: 'Sous mère',
    nv: 12,
    morts: 1,
    vivants: 11,
    dateMB: '10/04/2026',
    synced: true,
    ...overrides,
  };
}

function makeDraft(overrides: Partial<MiseBasDraft> = {}): MiseBasDraft {
  return {
    truieId: 'T07',
    idPortee: '26-T7-02',
    dateIso: '2026-04-19',
    heure: '04:30',
    nesVivants: '12',
    mortsNes: '1',
    nesTotaux: '13',
    poidsMoyen: '1.4',
    notes: 'MB sans assistance',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// [1] Render — defaults, helpers purs
// ═══════════════════════════════════════════════════════════════════════════

describe('[1] render — helpers & defaults', () => {
  it('extractTruieNumber extrait les chiffres ("T07" → 7, "T14" → 14)', () => {
    expect(extractTruieNumber('T07')).toBe(7);
    expect(extractTruieNumber('T14')).toBe(14);
    expect(extractTruieNumber('T1')).toBe(1);
    expect(extractTruieNumber('')).toBe(0);
    expect(extractTruieNumber('foo')).toBe(0);
  });

  it('addDaysToSheetsDate ajoute correctement 28 jours', () => {
    expect(addDaysToSheetsDate('01/04/2026', 28)).toBe('29/04/2026');
    expect(addDaysToSheetsDate('19/04/2026', 28)).toBe('17/05/2026');
  });

  it('addDaysToSheetsDate retourne "" sur input invalide', () => {
    expect(addDaysToSheetsDate('', 28)).toBe('');
    expect(addDaysToSheetsDate('not a date', 28)).toBe('');
  });

  it('MISE_BAS_BOUNDS expose les bornes attendues', () => {
    expect(MISE_BAS_BOUNDS.minNes).toBe(0);
    expect(MISE_BAS_BOUNDS.maxNes).toBe(25);
    expect(MISE_BAS_BOUNDS.sevrageJours).toBe(28);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [2] Validation — truie obligatoire
// ═══════════════════════════════════════════════════════════════════════════

describe('[2] validation truie obligatoire', () => {
  it('truieId vide → erreur', () => {
    const r = validateMiseBas(makeDraft({ truieId: '' }));
    expect(r.ok).toBe(false);
    expect(r.errors.truieId).toBeTruthy();
  });

  it('truieId whitespace → erreur', () => {
    const r = validateMiseBas(makeDraft({ truieId: '   ' }));
    expect(r.ok).toBe(false);
    expect(r.errors.truieId).toBeTruthy();
  });

  it('truieId renseigné → pas d\'erreur truieId', () => {
    const r = validateMiseBas(makeDraft({ truieId: 'T07' }));
    expect(r.errors.truieId).toBeUndefined();
  });

  it('idPortee vide → erreur', () => {
    const r = validateMiseBas(makeDraft({ idPortee: '' }));
    expect(r.ok).toBe(false);
    expect(r.errors.idPortee).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [3] Validation — cohérence NV (vivants + morts-nés = totaux)
// ═══════════════════════════════════════════════════════════════════════════

describe('[3] validation cohérence NV', () => {
  it('12 vivants + 1 mort-né = 13 totaux → ok', () => {
    const r = validateMiseBas(
      makeDraft({ nesVivants: '12', mortsNes: '1', nesTotaux: '13' }),
    );
    expect(r.ok).toBe(true);
    expect(r.normalized?.nesVivants).toBe(12);
    expect(r.normalized?.mortsNes).toBe(1);
    expect(r.normalized?.nesTotaux).toBe(13);
  });

  it('12 + 1 ≠ 14 → erreur coherence', () => {
    const r = validateMiseBas(
      makeDraft({ nesVivants: '12', mortsNes: '1', nesTotaux: '14' }),
    );
    expect(r.ok).toBe(false);
    expect(r.errors.coherence).toBeTruthy();
  });

  it('0 vivants + 5 morts-nés = 5 totaux (mortalité totale) → ok', () => {
    const r = validateMiseBas(
      makeDraft({ nesVivants: '0', mortsNes: '5', nesTotaux: '5' }),
    );
    expect(r.ok).toBe(true);
  });

  it('nesVivants > 25 → erreur nesVivants', () => {
    const r = validateMiseBas(
      makeDraft({ nesVivants: '26', mortsNes: '0', nesTotaux: '26' }),
    );
    expect(r.ok).toBe(false);
    expect(r.errors.nesVivants).toBeTruthy();
  });

  it('nesVivants vide → erreur', () => {
    const r = validateMiseBas(
      makeDraft({ nesVivants: '', mortsNes: '0', nesTotaux: '' }),
    );
    expect(r.ok).toBe(false);
    expect(r.errors.nesVivants).toBeTruthy();
  });

  it('poidsMoyen vide → ok (champ optionnel)', () => {
    const r = validateMiseBas(makeDraft({ poidsMoyen: '' }));
    expect(r.ok).toBe(true);
    expect(r.normalized?.poidsMoyen).toBeUndefined();
  });

  it('poidsMoyen hors bornes → erreur (0.3 trop bas)', () => {
    const r = validateMiseBas(makeDraft({ poidsMoyen: '0.3' }));
    expect(r.ok).toBe(false);
    expect(r.errors.poidsMoyen).toBeTruthy();
  });

  it('poidsMoyen accepte virgule FR', () => {
    const r = validateMiseBas(makeDraft({ poidsMoyen: '1,5' }));
    expect(r.ok).toBe(true);
    expect(r.normalized?.poidsMoyen).toBe(1.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [4] Auto-génération ID portée
// ═══════════════════════════════════════════════════════════════════════════

describe('[4] suggestIdPortee — auto-génération ID portée', () => {
  const when = new Date(2026, 3, 19); // 19 avril 2026 → YY = "26"

  it('première portée de la truie → SEQ = 01', () => {
    expect(suggestIdPortee('T07', [], when)).toBe('26-T7-01');
  });

  it('respecte le pattern strict {YY}-T{N}-{SEQ:02} (pas de zero-pad sur N)', () => {
    expect(suggestIdPortee('T14', [], when)).toBe('26-T14-01');
    expect(suggestIdPortee('T1', [], when)).toBe('26-T1-01');
  });

  it('incrémente SEQ si une portée existe déjà pour cette truie cette année', () => {
    const bandes = [makeBande({ idPortee: '26-T7-01', truie: 'T07' })];
    expect(suggestIdPortee('T07', bandes, when)).toBe('26-T7-02');
  });

  it('prend max(SEQ) + 1 (pas juste count)', () => {
    // Même si seul 03 existe, on doit renvoyer 04 (pas 02).
    const bandes = [
      makeBande({ idPortee: '26-T7-03', truie: 'T07' }),
    ];
    expect(suggestIdPortee('T07', bandes, when)).toBe('26-T7-04');
  });

  it('isole les portées de la truie demandée (T07 ≠ T09)', () => {
    const bandes = [
      makeBande({ idPortee: '26-T9-01', truie: 'T09' }),
      makeBande({ idPortee: '26-T9-02', truie: 'T09' }),
    ];
    // Aucune portée T07 cette année → 01
    expect(suggestIdPortee('T07', bandes, when)).toBe('26-T7-01');
  });

  it('isole par année (portées 2025 n\'impactent pas 2026)', () => {
    const bandes = [
      makeBande({ idPortee: '25-T7-01', truie: 'T07' }),
      makeBande({ idPortee: '25-T7-02', truie: 'T07' }),
    ];
    expect(suggestIdPortee('T07', bandes, when)).toBe('26-T7-01');
  });

  it('truie sans numéro → renvoie ""', () => {
    expect(suggestIdPortee('', [], when)).toBe('');
    expect(suggestIdPortee('foo', [], when)).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [5] Submit enqueue les 2 actions
// ═══════════════════════════════════════════════════════════════════════════

describe('[5] submitMiseBas — insertBatch + updateSowByCode (helpers Supabase)', () => {
  it('insertBatch puis updateSowByCode ({ statut: Maternité })', async () => {
    const calls: string[] = [];
    const insertBatch = vi.fn().mockImplementation(async () => { calls.push('insert'); return {}; });
    const updateSowByCode = vi.fn().mockImplementation(async () => { calls.push('update'); return {}; });

    const draft = makeDraft();
    const v = validateMiseBas(draft);
    expect(v.ok).toBe(true);

    const result = await submitMiseBas(
      v.normalized!,
      {
        idPortee: '26-T7-02',
        truieId: 'T07',
        boucleMere: 'B.21',
        notes: 'MB 04:30',
      },
      {
        insertBatch,
        updateSowByCode,
        isOnline: () => true,
      },
    );

    expect(result).toMatchObject({ online: true, idPortee: '26-T7-02' });
    expect(calls).toEqual(['insert', 'update']);
    expect(insertBatch).toHaveBeenCalledTimes(1);
    expect(updateSowByCode).toHaveBeenCalledTimes(1);

    const row = insertBatch.mock.calls[0][0] as MiseBasBatchValues;
    expect(row.code_id).toBe('26-T7-02');
    expect(row.sow_code).toBe('T07');
    expect(row.boucle_mere).toBe('B.21');
    expect(row.date_mise_bas).toBe('2026-04-19');
    expect(row.porcelets_nes_total).toBe(13);
    expect(row.nb_mort_nes).toBe(1);
    expect(row.porcelets_nes_vivants).toBe(12);
    expect(row.date_sevrage_prevue).toBe('2026-05-17');
    expect(row.statut).toBe('Sous mère');
    expect(row.phase).toBe('maternite');
    expect(row.notes).toMatch(/Poids moyen 1\.40 kg/);
    expect(row.notes).toMatch(/MB 04:30/);

    expect(updateSowByCode).toHaveBeenCalledWith('T07', { statut: 'Maternité' });
  });

  it('buildMiseBasRow produit le payload Supabase sans poidsMoyen (notes nues)', () => {
    const row = buildMiseBasRow({
      idPortee: '26-T9-01',
      truieId: 'T09',
      boucleMere: 'B.31',
      dateMbSheets: '19/04/2026',
      nv: 10,
      mortsNes: 0,
      vivants: 10,
      dateSevragePrevue: '17/05/2026',
      notes: 'sans note poids',
    });
    expect(row).toEqual({
      code_id: '26-T9-01',
      sow_code: 'T09',
      boucle_mere: 'B.31',
      date_mise_bas: '2026-04-19',
      porcelets_nes_total: 10,
      nb_mort_nes: 0,
      porcelets_nes_vivants: 10,
      date_sevrage_prevue: '2026-05-17',
      statut: 'Sous mère',
      phase: 'maternite',
      notes: 'sans note poids',
    });
  });

  it('propage une erreur si insertBatch échoue (updateSowByCode non tenté)', async () => {
    const insertBatch = vi.fn().mockRejectedValue(new Error('Supabase KO'));
    const updateSowByCode = vi.fn().mockResolvedValue({});

    const v = validateMiseBas(makeDraft());
    await expect(
      submitMiseBas(
        v.normalized!,
        { idPortee: '26-T7-02', truieId: 'T07', boucleMere: 'B.21', notes: '' },
        { insertBatch, updateSowByCode, isOnline: () => true },
      ),
    ).rejects.toThrow('Supabase KO');

    expect(updateSowByCode).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [6] Offline — isOnline=false propagé pour toast contextualisé
// ═══════════════════════════════════════════════════════════════════════════

describe('[6] offline queue', () => {
  it('isOnline=false est propagé sur le result (toast affiche "en file")', async () => {
    const insertBatch = vi.fn().mockResolvedValue({});
    const updateSowByCode = vi.fn().mockResolvedValue({});

    const v = validateMiseBas(makeDraft());
    const result = await submitMiseBas(
      v.normalized!,
      { idPortee: '26-T7-02', truieId: 'T07', boucleMere: 'B.21', notes: '' },
      {
        insertBatch,
        updateSowByCode,
        isOnline: () => false,
      },
    );

    expect(insertBatch).toHaveBeenCalledTimes(1);
    expect(updateSowByCode).toHaveBeenCalledTimes(1);
    expect(result.online).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [7] Contrats UI (source-grep) — valide que le composant respecte ses props
// ═══════════════════════════════════════════════════════════════════════════

describe('QuickMiseBasForm · contrats UI (source-grep)', () => {
  const SRC = (() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path');
    return fs.readFileSync(
      path.resolve(__dirname, 'QuickMiseBasForm.tsx'),
      'utf-8',
    );
  })();

  it('initialise truieId depuis defaultTruieId (pré-sélection)', () => {
    expect(SRC).toMatch(
      /useState<string>\(\s*defaultTruieId\s*\?\?\s*''\s*\)/,
    );
  });

  it('utilise IonSelect avec interface="popover" (pas de <select> natif)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path');
    const truieField = fs.readFileSync(
      path.resolve(__dirname, 'quickMiseBas/MiseBasTruieField.tsx'),
      'utf-8',
    );
    expect(truieField).toMatch(/<IonSelect\b/);
    expect(truieField).toMatch(/interface="popover"/);
  });

  it('désactive submit si !truieId ou saving', () => {
    expect(SRC).toMatch(/disabled=\{[^}]*!truieId[^}]*\}/);
    expect(SRC).toMatch(/disabled=\{[^}]*saving[^}]*\}/);
  });

  it('appelle insertBatch + updateSowByCode (helpers Supabase typés)', () => {
    expect(SRC).toMatch(/insertBatch\b/);
    expect(SRC).toMatch(/updateSowByCode\b/);
    expect(SRC).toMatch(/Maternit/);
  });
});
