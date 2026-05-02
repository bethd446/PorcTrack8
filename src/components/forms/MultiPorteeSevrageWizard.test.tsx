// @vitest-environment jsdom
/**
 * Tests unitaires — MultiPorteeSevrageWizard (V23-S1)
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Step 1 : ne peut pas avancer sans sélection
 *  [2] Step 2 : ne peut pas avancer si poids destination invalide
 *  [3] Step 2 : warning visible si total destinations ≠ total source
 *  [4] Step 3 : Valider déclenche updateBatchByCode + insertBatch attendus
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';

import type { BandePorcelets, Truie, Verrat } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => ({
  updateBatchByCode: vi.fn().mockResolvedValue({}),
  updateSowByCode: vi.fn().mockResolvedValue({}),
  insertBatch: vi.fn().mockResolvedValue({ id: 'uuid-batch-new' }),
  resolveSowIdByCode: vi.fn().mockResolvedValue('uuid-sow-1'),
  addBatchSource: vi.fn().mockResolvedValue({ id: 'bs-1' }),
}));

interface MockFarm {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  refreshData: ReturnType<typeof vi.fn>;
}
let mockFarm: MockFarm;

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => mockFarm,
}));

vi.mock('@ionic/react', () => ({
  IonToast: ({ isOpen, message }: { isOpen: boolean; message: string }) =>
    isOpen ? <div role="status" data-testid="toast">{message}</div> : null,
  IonModal: ({
    isOpen,
    children,
    'aria-label': ariaLabel,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    'aria-label'?: string;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={ariaLabel}>
        {children}
      </div>
    ) : null,
}));

import {
  addBatchSource,
  insertBatch,
  updateBatchByCode,
} from '../../services/supabaseWrites';
import MultiPorteeSevrageWizard from './MultiPorteeSevrageWizard';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeBande(
  overrides: Partial<BandePorcelets> = {},
): BandePorcelets {
  return {
    id: 'B-26-T7-01',
    idPortee: '26-T7-01',
    truie: 'T07',
    statut: 'Sous mère',
    dateMB: '2026-04-04',
    vivants: 12,
    poidsInitialKg: 0,
    synced: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFarm = {
    truies: [],
    verrats: [],
    bandes: [
      makeBande({ id: 'B1', idPortee: '26-T7-01', truie: 'T07', vivants: 12 }),
      makeBande({ id: 'B2', idPortee: '26-T8-01', truie: 'T08', vivants: 11 }),
      makeBande({
        id: 'B3',
        idPortee: '26-T9-01',
        truie: 'T09',
        statut: 'Engraissement',
        vivants: 10,
      }),
    ],
    refreshData: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('MultiPorteeSevrageWizard', () => {
  it("[1] Step 1 : ne peut pas avancer sans sélection", () => {
    render(
      <MultiPorteeSevrageWizard isOpen onClose={() => undefined} />,
    );
    const next = screen.getByRole('button', { name: /Suivant/i });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    // Sécurité : un click ne fait pas avancer
    fireEvent.click(next);
    expect(screen.getByText(/Étape 1 \/ 3/i)).toBeTruthy();
  });

  it("[2] Step 2 : ne peut pas avancer si une destination a poids invalide", () => {
    render(
      <MultiPorteeSevrageWizard isOpen onClose={() => undefined} />,
    );

    // Step 1 → sélection portée
    fireEvent.click(screen.getByLabelText(/Sélectionner 26-T7-01/i));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    expect(screen.getByText(/Étape 2 \/ 3/i)).toBeTruthy();

    // Step 2 → on saisit nb mais poids hors plage (60 kg → > 50 → bloquant)
    fireEvent.change(
      screen.getByLabelText(/Nb porcelets destination 1/i),
      { target: { value: '12' } },
    );
    fireEvent.change(
      screen.getByLabelText(/Poids moyen destination 1/i),
      { target: { value: '60' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // L'étape ne passe pas → l'alert apparaît, on est toujours en step 2
    expect(screen.getByRole('alert').textContent).toMatch(/poids hors plage/i);
    expect(screen.getByText(/Étape 2 \/ 3/i)).toBeTruthy();
  });

  it("[3] Step 2 : indicateur d'écart visible si total destinations ≠ total source", () => {
    render(
      <MultiPorteeSevrageWizard isOpen onClose={() => undefined} />,
    );

    // Sélectionner deux portées (12 + 11 = 23)
    fireEvent.click(screen.getByLabelText(/Sélectionner 26-T7-01/i));
    fireEvent.click(screen.getByLabelText(/Sélectionner 26-T8-01/i));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));

    // Saisir 10 dans destination 1 → 13 restants
    fireEvent.change(
      screen.getByLabelText(/Nb porcelets destination 1/i),
      { target: { value: '10' } },
    );

    // Le compteur affiche 10 / 23
    expect(screen.getByText(/10 \/ 23 affectés/i)).toBeTruthy();
    expect(screen.getByText(/\(\+13\)/)).toBeTruthy();
  });

  it("[4] Step 3 : Valider déclenche updateBatchByCode + insertBatch", async () => {
    render(
      <MultiPorteeSevrageWizard isOpen onClose={() => undefined} />,
    );

    // Step 1
    fireEvent.click(screen.getByLabelText(/Sélectionner 26-T7-01/i));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2 — destination valide
    fireEvent.change(
      screen.getByLabelText(/Nb porcelets destination 1/i),
      { target: { value: '12' } },
    );
    fireEvent.change(
      screen.getByLabelText(/Poids moyen destination 1/i),
      { target: { value: '6.5' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3 — confirmer
    expect(screen.getByText(/Étape 3 \/ 3/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Valider sevrage/i }));

    await waitFor(() => {
      expect(updateBatchByCode).toHaveBeenCalledTimes(1);
    });
    const [srcCode, srcPatch] = (
      updateBatchByCode as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(srcCode).toBe('26-T7-01');
    expect(srcPatch).toMatchObject({
      statut: 'Sevré',
      phase: 'post-sevrage',
      porcelets_sevrene_total: 12,
    });

    await waitFor(() => {
      expect(insertBatch).toHaveBeenCalledTimes(1);
    });
    const [insertPayload] = (
      insertBatch as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(insertPayload).toMatchObject({
      porcelets_nes_vivants: 12,
      porcelets_sevrene_total: 12,
      poids_moyen_sevrage_kg: 6.5,
      statut: 'Sevré',
      phase: 'post-sevrage',
    });
    expect(insertPayload.code_id).toMatch(/^B-/);
  });

  it("[5] V6-B : addBatchSource appelé N fois pour N sources", async () => {
    render(
      <MultiPorteeSevrageWizard isOpen onClose={() => undefined} />,
    );

    // Step 1 — sélection 2 portées (T07 + T08, total 23 vivants)
    fireEvent.click(screen.getByLabelText(/Sélectionner 26-T7-01/i));
    fireEvent.click(screen.getByLabelText(/Sélectionner 26-T8-01/i));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2 — destination unique
    fireEvent.change(
      screen.getByLabelText(/Nb porcelets destination 1/i),
      { target: { value: '23' } },
    );
    fireEvent.change(
      screen.getByLabelText(/Poids moyen destination 1/i),
      { target: { value: '6.5' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3 — confirmer
    fireEvent.click(screen.getByRole('button', { name: /Valider sevrage/i }));

    await waitFor(() => {
      expect(addBatchSource).toHaveBeenCalledTimes(2);
    });
    const calls = (addBatchSource as ReturnType<typeof vi.fn>).mock.calls;
    // Chaque call doit avoir batchId, sowId, nbPorcelets borné [1, 30]
    for (const [args] of calls) {
      expect(args.batchId).toBe('uuid-batch-new');
      expect(args.sowId).toBe('uuid-sow-1');
      expect(args.nbPorcelets).toBeGreaterThanOrEqual(1);
      expect(args.nbPorcelets).toBeLessThanOrEqual(30);
    }
  });
});
