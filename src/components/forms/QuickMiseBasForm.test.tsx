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
} from './QuickMiseBasForm';
import type { BandePorcelets } from '../../types/farm';

// ── Mock global offlineQueue (on importe les fonctions réelles uniquement
// pour que des tests potentiellement futurs puissent s'en servir ; les tests
// de ce fichier utilisent des mocks passés en paramètre via submitMiseBas).
type EnqueueAppendArgs = [sheet: string, values: (string | number | boolean | null)[]];
type EnqueueUpdateArgs = [
  sheet: string,
  idHeader: string,
  idValue: string,
  patch: Record<string, string | number | boolean | null>,
];
const enqueueAppendRowMock = vi.fn<(...args: EnqueueAppendArgs) => Promise<void>>(
  async () => undefined,
);
const enqueueUpdateRowMock = vi.fn<(...args: EnqueueUpdateArgs) => Promise<void>>(
  async () => undefined,
);
vi.mock('../../services/offlineQueue', () => ({
  enqueueAppendRow: (...args: EnqueueAppendArgs) => enqueueAppendRowMock(...args),
  enqueueUpdateRow: (...args: EnqueueUpdateArgs) => enqueueUpdateRowMock(...args),
}));

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
  enqueueAppendRowMock.mockClear();
  enqueueUpdateRowMock.mockClear();
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

describe('[5] submitMiseBas — 2 enqueues (append bande + update truie)', () => {
  it('append PORCELETS_BANDES_DETAIL puis update SUIVI_TRUIES_REPRODUCTION', async () => {
    const appendRow = vi.fn().mockResolvedValue(undefined);
    const updateRow = vi.fn().mockResolvedValue(undefined);
    const calls: string[] = [];
    appendRow.mockImplementation(async () => { calls.push('append'); });
    updateRow.mockImplementation(async () => { calls.push('update'); });

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
        appendRow,
        updateRow,
        isOnline: () => true,
      },
    );

    expect(result).toMatchObject({ online: true, idPortee: '26-T7-02' });
    // Ordre préservé : append avant update (audit trail first)
    expect(calls).toEqual(['append', 'update']);
    expect(appendRow).toHaveBeenCalledTimes(1);
    expect(updateRow).toHaveBeenCalledTimes(1);

    // Sheet cible + colonnes canoniques
    expect(appendRow.mock.calls[0][0]).toBe('PORCELETS_BANDES_DETAIL');
    const row = appendRow.mock.calls[0][1] as unknown[];
    // [ID Portée, Truie, Boucle mère, Date MB, NV, Morts, Vivants,
    //  Date sevrage prévue, Date sevrage réelle, Statut, Notes]
    expect(row[0]).toBe('26-T7-02');
    expect(row[1]).toBe('T07');
    expect(row[2]).toBe('B.21');
    expect(row[3]).toBe('19/04/2026');   // dd/MM/yyyy
    expect(row[4]).toBe(13);              // NV (nés totaux)
    expect(row[5]).toBe(1);               // Morts
    expect(row[6]).toBe(12);              // Vivants (= 13 - 1)
    expect(row[7]).toBe('17/05/2026');   // MB + 28j
    expect(row[8]).toBe('');              // Date sevrage réelle
    expect(row[9]).toBe('Sous mère');    // Statut
    // Notes : concatène poids moyen + note libre
    expect(row[10]).toMatch(/Poids moyen 1\.40 kg/);
    expect(row[10]).toMatch(/MB 04:30/);

    // Update truie : statut Maternité
    expect(updateRow).toHaveBeenCalledWith(
      'SUIVI_TRUIES_REPRODUCTION',
      'ID',
      'T07',
      { STATUT: 'Maternité' },
    );
  });

  it('buildMiseBasRow produit la row canonique sans poidsMoyen (notes nues)', () => {
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
    expect(row).toEqual([
      '26-T9-01',
      'T09',
      'B.31',
      '19/04/2026',
      10,
      0,
      10,
      '17/05/2026',
      '',
      'Sous mère',
      'sans note poids',
    ]);
  });

  it('propage une erreur si append échoue (update non tenté)', async () => {
    const appendRow = vi.fn().mockRejectedValue(new Error('Preferences KO'));
    const updateRow = vi.fn().mockResolvedValue(undefined);

    const v = validateMiseBas(makeDraft());
    await expect(
      submitMiseBas(
        v.normalized!,
        { idPortee: '26-T7-02', truieId: 'T07', boucleMere: 'B.21', notes: '' },
        { appendRow, updateRow, isOnline: () => true },
      ),
    ).rejects.toThrow('Preferences KO');

    expect(updateRow).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [6] Offline — isOnline=false propagé pour toast contextualisé
// ═══════════════════════════════════════════════════════════════════════════

describe('[6] offline queue', () => {
  it('isOnline=false est propagé sur le result (toast affiche "en file")', async () => {
    const appendRow = vi.fn().mockResolvedValue(undefined);
    const updateRow = vi.fn().mockResolvedValue(undefined);

    const v = validateMiseBas(makeDraft());
    const result = await submitMiseBas(
      v.normalized!,
      { idPortee: '26-T7-02', truieId: 'T07', boucleMere: 'B.21', notes: '' },
      {
        appendRow,
        updateRow,
        isOnline: () => false,
      },
    );

    // Les 2 enqueues ont quand même eu lieu (pattern offline-first)
    expect(appendRow).toHaveBeenCalledTimes(1);
    expect(updateRow).toHaveBeenCalledTimes(1);
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
    expect(SRC).toMatch(/<IonSelect\b/);
    expect(SRC).toMatch(/interface="popover"/);
  });

  it('désactive submit si !truieId ou saving', () => {
    expect(SRC).toMatch(/disabled=\{[^}]*!truieId[^}]*\}/);
    expect(SRC).toMatch(/disabled=\{[^}]*saving[^}]*\}/);
  });

  it('appelle enqueueAppendRow("PORCELETS_BANDES_DETAIL") + enqueueUpdateRow("SUIVI_TRUIES_REPRODUCTION")', () => {
    expect(SRC).toMatch(/enqueueAppendRow/);
    expect(SRC).toMatch(/enqueueUpdateRow/);
    expect(SRC).toMatch(/PORCELETS_BANDES_DETAIL/);
    expect(SRC).toMatch(/SUIVI_TRUIES_REPRODUCTION/);
    expect(SRC).toMatch(/Maternit/); // statut truie basculé en Maternité
  });
});
