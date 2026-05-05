// @vitest-environment jsdom
/**
 * Tests unitaires — QuickSaillieForm (jsdom env)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Render : radiogroups Truie / Verrat avec items disponibles
 *  [2] defaultTruieDisplayId (V14) : préselection automatique
 *  [3] Aucune truie disponible → empty state
 *  [4] Submit happy path : insertSaillie appelée avec payload attendu
 *  [5] refreshData(true) appelée post-insert (V15 fix)
 *  [6] onClose appelé après save (timeout 1500)
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from '@testing-library/react';

import type { Truie, Verrat, BandePorcelets } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => ({
  insertSaillie: vi.fn().mockResolvedValue({ id: 'saillie-uuid-1' }),
  resolveSowIdByCode: vi.fn(async (code: string) => `sow-uuid-${code}`),
  resolveBoarIdByCode: vi.fn(async (code: string) => `boar-uuid-${code}`),
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
    isOpen ? <div role="status">{message}</div> : null,
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
  insertSaillie,
  resolveSowIdByCode,
  resolveBoarIdByCode,
} from '../../services/supabaseWrites';
import QuickSaillieForm from './QuickSaillieForm';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: 'sow-uuid-T07',
    displayId: 'T07',
    boucle: 'FR-0007',
    statut: 'Vide',
    ration: 6,
    synced: true,
    ...overrides,
  };
}

function makeVerrat(overrides: Partial<Verrat> = {}): Verrat {
  return {
    id: 'boar-uuid-V01',
    displayId: 'V01',
    boucle: 'FR-V01',
    statut: 'Actif',
    ration: 5,
    synced: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 19, 9, 0, 0));
  mockFarm = {
    truies: [],
    verrats: [],
    bandes: [],
    refreshData: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickSaillieForm', () => {
  it('[1] render : radiogroups Truie / Verrat avec items disponibles', () => {
    mockFarm.truies = [makeTruie({ displayId: 'T07' })];
    mockFarm.verrats = [makeVerrat({ displayId: 'V01' })];

    render(<QuickSaillieForm isOpen onClose={() => undefined} />);

    expect(screen.getByLabelText(/Sélectionner la truie T07/i)).toBeTruthy();
    expect(screen.getByLabelText(/Sélectionner le verrat V01/i)).toBeTruthy();
  });

  it('[2] defaultTruieDisplayId (V14) → truie préselectionnée', () => {
    mockFarm.truies = [
      makeTruie({ displayId: 'T07' }),
      makeTruie({ id: 'sow-uuid-T09', displayId: 'T09' }),
    ];
    mockFarm.verrats = [makeVerrat()];

    render(
      <QuickSaillieForm
        isOpen
        onClose={() => undefined}
        defaultTruieDisplayId="T09"
      />,
    );

    const radioT09 = screen.getByLabelText(/Sélectionner la truie T09/i);
    expect(radioT09.getAttribute('aria-checked')).toBe('true');
    const radioT07 = screen.getByLabelText(/Sélectionner la truie T07/i);
    expect(radioT07.getAttribute('aria-checked')).toBe('false');
  });

  it('[3] aucune truie disponible → empty state', () => {
    mockFarm.truies = [makeTruie({ statut: 'Gestation' })];
    mockFarm.verrats = [makeVerrat()];

    render(<QuickSaillieForm isOpen onClose={() => undefined} />);

    expect(screen.getByText(/Aucune truie disponible/i)).toBeTruthy();
  });

  it('[4] submit happy path : insertSaillie avec payload attendu', async () => {
    mockFarm.truies = [makeTruie({ displayId: 'T07' })];
    mockFarm.verrats = [makeVerrat({ displayId: 'V01' })];

    render(
      <QuickSaillieForm
        isOpen
        onClose={() => undefined}
        defaultTruieDisplayId="T07"
      />,
    );

    fireEvent.click(screen.getByLabelText(/Sélectionner le verrat V01/i));
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmer la saillie/i }),
    );

    // handleSave fait `await Promise.all([resolveSowIdByCode, resolveBoarIdByCode])`
    // puis `await insertSaillie`. Avec fakeTimers, on doit drainer les microtasks
    // manuellement pour que les awaits se résolvent.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(resolveSowIdByCode).toHaveBeenCalledWith('T07');
    expect(resolveBoarIdByCode).toHaveBeenCalledWith('V01');

    expect(insertSaillie).toHaveBeenCalledTimes(1);
    const payload = (insertSaillie as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload).toMatchObject({
      sow_id: 'sow-uuid-T07',
      boar_id: 'boar-uuid-V01',
      sow_code_id: 'T07',
      boar_code_id: 'V01',
      statut: 'SAILLIE',
    });
    expect(payload.date_saillie).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('[4b] date_saillie custom (rétro-saisie) propagée dans le payload', async () => {
    mockFarm.truies = [makeTruie({ displayId: 'T07' })];
    mockFarm.verrats = [makeVerrat({ displayId: 'V01' })];

    render(
      <QuickSaillieForm
        isOpen
        onClose={() => undefined}
        defaultTruieDisplayId="T07"
      />,
    );

    // Saisir une date 7 jours en arrière
    const past = new Date();
    past.setDate(past.getDate() - 7);
    const pastIso = past.toISOString().slice(0, 10);

    const dateInput = screen.getByLabelText(/Date de saillie/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: pastIso } });

    fireEvent.click(screen.getByLabelText(/Sélectionner le verrat V01/i));
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmer la saillie/i }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const payload = (insertSaillie as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.date_saillie).toBe(pastIso);
    expect(payload.notes).toMatch(/rétro-saisie/i);
  });

  it('[5] refreshData(true) appelée post-insert (V15 fix)', async () => {
    mockFarm.truies = [makeTruie({ displayId: 'T07' })];
    mockFarm.verrats = [makeVerrat({ displayId: 'V01' })];

    render(
      <QuickSaillieForm
        isOpen
        onClose={() => undefined}
        defaultTruieDisplayId="T07"
      />,
    );

    fireEvent.click(screen.getByLabelText(/Sélectionner le verrat V01/i));
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmer la saillie/i }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockFarm.refreshData).toHaveBeenCalledTimes(1);
    expect(mockFarm.refreshData).toHaveBeenCalledWith(true);
  });

  it('[6] onClose appelé après save (timeout 1500)', async () => {
    const onClose = vi.fn();
    mockFarm.truies = [makeTruie({ displayId: 'T07' })];
    mockFarm.verrats = [makeVerrat({ displayId: 'V01' })];

    render(
      <QuickSaillieForm
        isOpen
        onClose={onClose}
        defaultTruieDisplayId="T07"
      />,
    );

    fireEvent.click(screen.getByLabelText(/Sélectionner le verrat V01/i));
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmer la saillie/i }),
    );

    // Laisser les promesses se résoudre puis avancer le timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
