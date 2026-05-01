// @vitest-environment jsdom
/**
 * Tests unitaires — QuickSevrageForm (jsdom env)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Render : combobox Bande filtrée sur "Sous mère"
 *  [2] Aucune bande Sous mère → empty state explicite
 *  [3] Submit : updateBatchByCode + updateSowByCode appelés avec bons params
 *  [4] Toast succès UNIQUEMENT après confirmation DB (pas avant)
 *  [5] Erreur Supabase → setError visible, pas masqué par success
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';

import type { BandePorcelets, Truie, Verrat } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => ({
  updateBatchByCode: vi.fn().mockResolvedValue({}),
  updateSowByCode: vi.fn().mockResolvedValue({}),
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
  }) => (isOpen ? <div role="dialog" aria-label={ariaLabel}>{children}</div> : null),
}));

import {
  updateBatchByCode,
  updateSowByCode,
} from '../../services/supabaseWrites';
import QuickSevrageForm from './QuickSevrageForm';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-26-T7-01',
    idPortee: '26-T7-01',
    truie: 'T07',
    statut: 'Sous mère',
    vivants: 11,
    synced: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFarm = {
    truies: [],
    verrats: [],
    bandes: [],
    refreshData: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickSevrageForm', () => {
  it('[1] combobox Bande filtre sur statut "Sous mère"', () => {
    mockFarm.bandes = [
      makeBande({ id: 'B1', idPortee: '26-T7-01', statut: 'Sous mère' }),
      makeBande({ id: 'B2', idPortee: '26-T8-01', statut: 'Engraissement' }),
      makeBande({ id: 'B3', idPortee: '26-T9-01', statut: 'Sevré' }),
      makeBande({ id: 'B4', idPortee: '26-T10-01', statut: 'Maternité' }),
    ];

    render(<QuickSevrageForm isOpen onClose={() => undefined} />);

    const select = screen.getByLabelText('Bande') as HTMLSelectElement;
    const labels = Array.from(select.options).map(o => o.value);
    expect(labels).toContain('26-T7-01');
    expect(labels).toContain('26-T10-01');
    expect(labels).not.toContain('26-T8-01');
    expect(labels).not.toContain('26-T9-01');
  });

  it('[2] empty state explicite si aucune bande Sous mère', () => {
    mockFarm.bandes = [
      makeBande({ id: 'B1', idPortee: '26-T7-01', statut: 'Engraissement' }),
    ];
    render(<QuickSevrageForm isOpen onClose={() => undefined} />);
    expect(
      screen.getByText(/Aucune bande éligible \(sous mère\)/i),
    ).toBeTruthy();
  });

  it('[3] submit happy path : updateBatchByCode + updateSowByCode appelés', async () => {
    mockFarm.bandes = [makeBande()];

    render(
      <QuickSevrageForm
        isOpen
        onClose={() => undefined}
        defaultBandeId="26-T7-01"
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/Nombre de porcelets sevrés/i),
      { target: { value: '11' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(updateBatchByCode).toHaveBeenCalledTimes(1);
    });

    const [bandeCode, batchPatch] = (
      updateBatchByCode as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(bandeCode).toBe('26-T7-01');
    expect(batchPatch).toMatchObject({
      statut: 'Sevré',
      phase: 'post-sevrage',
      porcelets_sevrene_total: 11,
    });
    expect(batchPatch.date_sevrage).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await waitFor(() => {
      expect(updateSowByCode).toHaveBeenCalledTimes(1);
    });
    expect(updateSowByCode).toHaveBeenCalledWith('T07', {
      statut: 'En attente saillie',
    });
  });

  it('[4] toast succès UNIQUEMENT après confirmation DB (pas de faux toast)', async () => {
    let resolveBatch: (value: unknown) => void = () => undefined;
    (updateBatchByCode as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () =>
        new Promise(res => {
          resolveBatch = res;
        }),
    );
    mockFarm.bandes = [makeBande()];

    render(
      <QuickSevrageForm
        isOpen
        onClose={() => undefined}
        defaultBandeId="26-T7-01"
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/Nombre de porcelets sevrés/i),
      { target: { value: '11' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    // Avant résolution → pas de toast
    expect(screen.queryByTestId('toast')).toBeNull();

    // Résolution DB → toast doit apparaître
    await act(async () => {
      resolveBatch({});
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeTruthy();
    });
    expect(screen.getByTestId('toast').textContent).toMatch(
      /Sevrage enregistré/i,
    );
  });

  it('[5] erreur Supabase → setError visible (role=alert), pas de toast', async () => {
    (updateBatchByCode as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Supabase 503'),
    );
    mockFarm.bandes = [makeBande()];

    render(
      <QuickSevrageForm
        isOpen
        onClose={() => undefined}
        defaultBandeId="26-T7-01"
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/Nombre de porcelets sevrés/i),
      { target: { value: '11' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Supabase 503/);
    expect(screen.queryByTestId('toast')).toBeNull();
  });
});
