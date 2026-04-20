/**
 * Tests unitaires — QuickAddTruieForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` env (pas de jsdom). On teste :
 *   [1] render : suggestion d'ID (`suggestNextTruieId`) + forme initiale
 *       du draft par défaut.
 *   [2] validation ID (format /^T\d+$/i, vide rejeté, non-"T" rejeté).
 *   [3] validation Boucle (vide/whitespace rejeté).
 *   [4] submit → enqueueAppendRow appelé avec la sheet canonique et la
 *       row dans l'ordre colonne attendu.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  suggestNextTruieId,
  validateAddTruie,
  buildAddTruieRow,
  STADES,
} from './QuickAddTruieForm';
import type { SheetCell } from '../../services/offlineQueue';

// ── Mock global de offlineQueue ──────────────────────────────────────────
type EnqueueAppendRowArgs = [sheet: string, values: SheetCell[]];
const enqueueAppendRowMock = vi.fn<(...args: EnqueueAppendRowArgs) => Promise<void>>(
  async () => undefined,
);
vi.mock('../../services/offlineQueue', () => ({
  enqueueAppendRow: (...args: EnqueueAppendRowArgs) => enqueueAppendRowMock(...args),
}));

// Reflect the actual submit the component does, isolé pour tests node.
async function submitAddTruie(draft: {
  id: string;
  boucle: string;
  nom: string;
  stade: 'Jeune' | 'Adulte' | 'Reproductrice';
  ration: string;
  refreshData: () => Promise<void>;
}): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  const v = validateAddTruie({
    id: draft.id,
    boucle: draft.boucle,
    nom: draft.nom,
    stade: draft.stade,
    ration: draft.ration,
  });
  if (!v.ok || !v.row) {
    return { ok: false, errors: v.errors };
  }
  const { enqueueAppendRow } = await import('../../services/offlineQueue');
  await enqueueAppendRow('SUIVI_TRUIES_REPRODUCTION', v.row);
  await draft.refreshData();
  return { ok: true };
}

beforeEach(() => {
  enqueueAppendRowMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// [1] Render / suggestion ID initiale
// ═══════════════════════════════════════════════════════════════════════════

describe('[1] render — suggestNextTruieId + defaults', () => {
  it('suggère T20 quand la liste est vide (fallback)', () => {
    expect(suggestNextTruieId([])).toBe('T20');
  });

  it('suggère max(id) + 1 avec zero-padding', () => {
    expect(
      suggestNextTruieId([{ id: 'T05' }, { id: 'T12' }, { id: 'T07' }]),
    ).toBe('T13');
  });

  it('ignore les IDs non numériques mais préserve le max trouvable', () => {
    expect(
      suggestNextTruieId([{ id: 'T08' }, { id: 'xxx' }, { id: 'T15' }]),
    ).toBe('T16');
  });

  it('expose STADES avec les 3 valeurs attendues', () => {
    expect(STADES).toEqual(['Jeune', 'Adulte', 'Reproductrice']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [2] Validation ID
// ═══════════════════════════════════════════════════════════════════════════

describe('[2] validation ID', () => {
  const base = {
    boucle: 'FR-00123',
    nom: '',
    stade: 'Adulte' as const,
    ration: '3',
  };

  it('ID vide → erreur', () => {
    const v = validateAddTruie({ ...base, id: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.id).toBeTruthy();
  });

  it('ID sans "T" initial → erreur', () => {
    const v = validateAddTruie({ ...base, id: '42' });
    expect(v.ok).toBe(false);
    expect(v.errors.id).toBeTruthy();
  });

  it('ID "T" sans chiffre → erreur', () => {
    const v = validateAddTruie({ ...base, id: 'T' });
    expect(v.ok).toBe(false);
    expect(v.errors.id).toBeTruthy();
  });

  it('ID "T20" accepté', () => {
    const v = validateAddTruie({ ...base, id: 'T20' });
    expect(v.ok).toBe(true);
    expect(v.errors.id).toBeUndefined();
  });

  it('ID minuscule "t20" accepté et normalisé en "T20"', () => {
    const v = validateAddTruie({ ...base, id: 't20' });
    expect(v.ok).toBe(true);
    expect(v.row?.[0]).toBe('T20');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [3] Validation Boucle
// ═══════════════════════════════════════════════════════════════════════════

describe('[3] validation Boucle', () => {
  const base = {
    id: 'T20',
    nom: '',
    stade: 'Adulte' as const,
    ration: '3',
  };

  it('boucle vide → erreur', () => {
    const v = validateAddTruie({ ...base, boucle: '' });
    expect(v.ok).toBe(false);
    expect(v.errors.boucle).toBeTruthy();
  });

  it('boucle whitespace → erreur', () => {
    const v = validateAddTruie({ ...base, boucle: '   ' });
    expect(v.ok).toBe(false);
    expect(v.errors.boucle).toBeTruthy();
  });

  it('boucle valide → ok + trim appliqué', () => {
    const v = validateAddTruie({ ...base, boucle: '  FR-42  ' });
    expect(v.ok).toBe(true);
    // row[2] = BOUCLE
    expect(v.row?.[2]).toBe('FR-42');
  });

  it('ration hors bornes → erreur', () => {
    expect(validateAddTruie({ ...base, boucle: 'FR', ration: '-1' }).ok).toBe(false);
    expect(validateAddTruie({ ...base, boucle: 'FR', ration: '11' }).ok).toBe(false);
    // bornes incluses
    expect(validateAddTruie({ ...base, boucle: 'FR', ration: '0' }).ok).toBe(true);
    expect(validateAddTruie({ ...base, boucle: 'FR', ration: '10' }).ok).toBe(true);
  });

  it('ration en virgule décimale FR acceptée', () => {
    const v = validateAddTruie({ ...base, boucle: 'FR', ration: '3,5' });
    expect(v.ok).toBe(true);
    expect(v.row?.[8]).toBe(3.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// [4] Submit enqueue
// ═══════════════════════════════════════════════════════════════════════════

describe('[4] submit → enqueueAppendRow', () => {
  it('appelle enqueueAppendRow avec sheet + row canonique', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddTruie({
      id: 'T21',
      boucle: 'FR-98765',
      nom: 'Hermione',
      stade: 'Reproductrice',
      ration: '4.2',
      refreshData,
    });

    expect(out.ok).toBe(true);
    expect(enqueueAppendRowMock).toHaveBeenCalledTimes(1);
    expect(enqueueAppendRowMock).toHaveBeenCalledWith(
      'SUIVI_TRUIES_REPRODUCTION',
      [
        'T21',                // ID
        'Hermione',           // NOM
        'FR-98765',           // BOUCLE
        'En attente saillie', // STATUT
        'Reproductrice',      // STADE
        0,                    // NB_PORTEES
        '',                   // DERNIERE_PORTEE_NV
        '',                   // DATE_MB_PREVUE
        4.2,                  // RATION KG/J
        '',                   // NOTES
      ],
    );
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('submit invalide → pas d\'enqueue, pas de refresh', async () => {
    const refreshData = vi.fn(async () => undefined);
    const out = await submitAddTruie({
      id: 'invalid',
      boucle: '',
      nom: '',
      stade: 'Adulte',
      ration: 'abc',
      refreshData,
    });
    expect(out.ok).toBe(false);
    expect(out.errors?.id).toBeTruthy();
    expect(out.errors?.boucle).toBeTruthy();
    expect(out.errors?.ration).toBeTruthy();
    expect(enqueueAppendRowMock).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });

  it('buildAddTruieRow renvoie null si validation échoue', () => {
    expect(buildAddTruieRow({
      id: '',
      boucle: '',
      nom: '',
      stade: 'Adulte',
      ration: '',
    })).toBeNull();
  });
});
