/**
 * Tests pour mbWorkflowService — uniquement les helpers purs ré-exportés
 * (selectSailliesProchesMB) et la validation interne des payloads via mocks.
 *
 * Les fonctions impliquant Supabase sont testées via mocks de base : on ne
 * vérifie pas le réseau ici, juste que les payloads construits sont corrects
 * et que les invariants d'entrée échouent comme prévu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabaseClient avant import du service
vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'farm-uuid-1' } } },
        error: null,
      })),
    },
    from: vi.fn(),
  },
}));

vi.mock('./supabaseWrites', () => ({
  insertBatch: vi.fn(async (payload: Record<string, unknown>) => ({
    id: 'new-batch-id',
    code_id: payload.code_id as string,
  })),
  // V71-P2 phase C : mbWorkflowService consomme aussi le getter farm-id.
  getCurrentFarmIdRef: vi.fn(() => null),
}));

import {
  confirmMiseBas,
  submitDailyCheck,
  type ConfirmMiseBasPayload,
} from './mbWorkflowService';
import { insertBatch } from './supabaseWrites';
import { supabase } from './supabaseClient';

const PAYLOAD_OK: ConfirmMiseBasPayload = {
  saillie_id: 'saillie-uuid',
  sow_id: 'sow-uuid',
  boar_id: 'boar-uuid',
  date_saillie: '2026-01-08',
  date_mise_bas: '2026-05-02',
  porcelets_nes_total: 12,
  porcelets_nes_vivants: 11,
  nb_mort_nes: 1,
  poids_portee_naissance_kg: 16.5,
  nb_males_naissance: 5,
  nb_femelles_naissance: 6,
  loge_id: 'loge-uuid',
  code_id: 'B-20260502-MB-T07',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('confirmMiseBas — invariants', () => {
  it('throw si saillie_id manquant', async () => {
    await expect(confirmMiseBas({ ...PAYLOAD_OK, saillie_id: '' })).rejects.toThrow(
      /saillie_id/,
    );
  });

  it('throw si loge_id manquant', async () => {
    await expect(confirmMiseBas({ ...PAYLOAD_OK, loge_id: '' })).rejects.toThrow(
      /loge_id/,
    );
  });

  it('throw si nbVivants > nbTotal', async () => {
    await expect(
      confirmMiseBas({ ...PAYLOAD_OK, porcelets_nes_total: 5, porcelets_nes_vivants: 10 }),
    ).rejects.toThrow(/porcelets_nes_vivants/);
  });

  it('throw si nbTotal < 1', async () => {
    await expect(
      confirmMiseBas({ ...PAYLOAD_OK, porcelets_nes_total: 0 }),
    ).rejects.toThrow(/porcelets_nes_total/);
  });
});

describe('confirmMiseBas — payload construit', () => {
  it('insertBatch appelé avec phase=SOUS_MERE et validation_status=VALIDATED', async () => {
    await confirmMiseBas(PAYLOAD_OK);
    expect(insertBatch).toHaveBeenCalledOnce();
    const arg = (insertBatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(arg.phase).toBe('SOUS_MERE');
    expect(arg.statut).toBe('Sous mère');
    expect(arg.validation_status).toBe('VALIDATED');
    expect(arg.code_id).toBe('B-20260502-MB-T07');
    expect(arg.loge_id).toBe('loge-uuid');
    expect(arg.porcelets_nes_total).toBe(12);
    expect(arg.porcelets_nes_vivants).toBe(11);
    expect(arg.nb_mort_nes).toBe(1);
    expect(arg.poids_portee_naissance_kg).toBe(16.5);
    // poids_moyen_kg auto-dérivé = 16.5 / 11 = 1.5
    expect(arg.poids_moyen_kg).toBeCloseTo(1.5, 4);
  });

  it('notes contient M/F si fournis', async () => {
    await confirmMiseBas(PAYLOAD_OK);
    const arg = (insertBatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(arg.notes).toMatch(/M=5/);
    expect(arg.notes).toMatch(/F=6/);
  });

  it('notes null si M/F absents', async () => {
    await confirmMiseBas({
      ...PAYLOAD_OK,
      nb_males_naissance: null,
      nb_femelles_naissance: null,
    });
    const arg = (insertBatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(arg.notes).toBeNull();
  });

  it('poids_moyen_kg null si poids portée non fourni', async () => {
    await confirmMiseBas({ ...PAYLOAD_OK, poids_portee_naissance_kg: null });
    const arg = (insertBatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(arg.poids_moyen_kg).toBeNull();
  });

  it('retourne id + code_id', async () => {
    const r = await confirmMiseBas(PAYLOAD_OK);
    expect(r.id).toBe('new-batch-id');
    expect(r.code_id).toBe('B-20260502-MB-T07');
  });
});

describe('submitDailyCheck — invariants', () => {
  it('throw si batch_id manquant', async () => {
    await expect(
      submitDailyCheck({
        batch_id: '',
        morts_jour: 0,
        comportement: null,
        truie_alimentation: null,
        mamelles_utilisees: null,
        diarrhee: null,
        respiration_ok: null,
        lampe_ok: null,
        eau_ok: null,
        notes: null,
        photo_url: null,
      }),
    ).rejects.toThrow(/batch_id/);
  });

  it('throw si morts_jour négatif', async () => {
    await expect(
      submitDailyCheck({
        batch_id: 'b1',
        morts_jour: -1,
        comportement: null,
        truie_alimentation: null,
        mamelles_utilisees: null,
        diarrhee: null,
        respiration_ok: null,
        lampe_ok: null,
        eau_ok: null,
        notes: null,
        photo_url: null,
      }),
    ).rejects.toThrow(/morts_jour/);
  });

  it('upsert avec onConflict batch_id,date_check', async () => {
    const upsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn(async () => ({ data: { id: 'check-id' }, error: null })),
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any).mockReturnValue({ upsert: upsertMock });

    const r = await submitDailyCheck({
      batch_id: 'batch-1',
      date_check: '2026-05-02',
      morts_jour: 1,
      comportement: 'NORMAL',
      truie_alimentation: 'OUI',
      mamelles_utilisees: true,
      diarrhee: 'AUCUN',
      respiration_ok: true,
      lampe_ok: true,
      eau_ok: true,
      notes: 'RAS',
      photo_url: null,
    });
    expect(r.id).toBe('check-id');
    expect(upsertMock).toHaveBeenCalledOnce();
    const upsertArgs = upsertMock.mock.calls[0];
    expect(upsertArgs[1]).toEqual({ onConflict: 'batch_id,date_check' });
    expect(upsertArgs[0].farm_id).toBe('farm-uuid-1');
    expect(upsertArgs[0].batch_id).toBe('batch-1');
    expect(upsertArgs[0].date_check).toBe('2026-05-02');
    expect(upsertArgs[0].morts_jour).toBe(1);
  });
});
