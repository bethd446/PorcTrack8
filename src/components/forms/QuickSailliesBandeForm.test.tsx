// @vitest-environment jsdom
/**
 * Tests unitaires — QuickSailliesBandeForm (Sprint 11)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Render : eyebrow + titre + preview cycle prévu (Écho/MB/Sevrage)
 *  [2] Multi-select truies : checkboxes accumulent
 *  [3] Verrats cap à 2 : bouton 3e devient disabled
 *  [4] Preview cycle : MB = date+115j, Sevrage = date+143j
 *  [5] Submit : N truies × 1 verrat = N insertSaillie avec date_mb_prevue
 *  [6] Submit 2 verrats round-robin : truies alternent V1 → V2 → V1
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  within,
} from '@testing-library/react';

import type { Truie, Verrat } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => ({
  insertSaillie: vi.fn().mockResolvedValue({ id: 'saillie-uuid' }),
  resolveSowIdByCode: vi.fn(async (c: string) => `sow-uuid-${c}`),
  resolveBoarIdByCode: vi.fn(async (c: string) => `boar-uuid-${c}`),
}));

interface MockFarm {
  truies: Truie[];
  verrats: Verrat[];
  refreshData: ReturnType<typeof vi.fn>;
}
let mockFarm: MockFarm;

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => mockFarm,
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@ionic/react', () => ({
  IonModal: ({
    isOpen,
    children,
    'aria-label': ariaLabel,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    'aria-label'?: string;
  }) => (isOpen ? <div role="dialog" aria-label={ariaLabel}>{children}</div> : null),
  IonToast: () => null,
}));

import { insertSaillie } from '../../services/supabaseWrites';
import QuickSailliesBandeForm from './QuickSailliesBandeForm';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(displayId: string, statut = 'En attente saillie'): Truie {
  return {
    id: `sow-${displayId}`,
    displayId,
    boucle: `BCL-${displayId}`,
    statut: statut as Truie['statut'],
    ration: 6,
    synced: true,
  };
}

function makeVerrat(displayId: string): Verrat {
  return {
    id: `boar-${displayId}`,
    displayId,
    boucle: `BCL-${displayId}`,
    statut: 'Actif',
    ration: 5,
    synced: true,
  };
}

// Date courante figée pour calcul preview déterministe (UTC midi pour
// éviter les décalages timezone : .toISOString().slice(0,10) reste
// constant en local TZ négatif comme Europe/Paris).
const TODAY = new Date('2026-05-10T12:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
  mockFarm = {
    truies: [
      makeTruie('T01'),
      makeTruie('T02'),
      makeTruie('T03', 'Vide'),
      makeTruie('T99', 'Pleine'), // exclue (gestation)
    ],
    verrats: [makeVerrat('V01'), makeVerrat('V02'), makeVerrat('V03')],
    refreshData: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickSailliesBandeForm', () => {
  it('[1] render : eyebrow + titre + preview cycle prévu', () => {
    render(<QuickSailliesBandeForm isOpen onClose={() => undefined} />);

    // Eyebrow + titre BottomSheet : occurrences multiples acceptées.
    expect(screen.getAllByText(/Saillies en bande/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Saillir plusieurs truies en lot/i).length).toBeGreaterThan(0);

    // Preview cycle prévu présent même sans sélection.
    const preview = screen.getByTestId('cycle-preview');
    expect(within(preview).getByText(/Cycle prévu groupe/i)).toBeTruthy();
    expect(within(preview).getByText(/Écho J28/)).toBeTruthy();
    expect(within(preview).getByText(/MB attendues J115/)).toBeTruthy();
    expect(within(preview).getByText(/Sevrage prévu J143/)).toBeTruthy();
  });

  it('[2] multi-select truies : checkboxes accumulent', () => {
    render(<QuickSailliesBandeForm isOpen onClose={() => undefined} />);

    fireEvent.click(screen.getByLabelText('Sélectionner truie T01'));
    fireEvent.click(screen.getByLabelText('Sélectionner truie T02'));
    fireEvent.click(screen.getByLabelText('Sélectionner truie T03'));

    expect(screen.getByText(/3 truies sélectionnées/i)).toBeTruthy();

    // T99 (Pleine) exclue du DOM
    expect(screen.queryByLabelText('Sélectionner truie T99')).toBeNull();
  });

  it('[3] cap 2 verrats : bouton 3e disabled', () => {
    render(<QuickSailliesBandeForm isOpen onClose={() => undefined} />);

    const v1 = screen.getByTestId('bande-verrat-V01');
    const v2 = screen.getByTestId('bande-verrat-V02');
    const v3 = screen.getByTestId('bande-verrat-V03');

    fireEvent.click(v1);
    fireEvent.click(v2);

    expect((v3 as HTMLButtonElement).disabled).toBe(true);
  });

  it('[4] preview cycle : Écho J28 / MB J115 / Sevrage J143', () => {
    render(<QuickSailliesBandeForm isOpen onClose={() => undefined} />);
    const preview = screen.getByTestId('cycle-preview');

    // 2026-05-10 + 28j = 2026-06-07
    expect(within(preview).getByText('07/06/2026')).toBeTruthy();
    // 2026-05-10 + 115j = 2026-09-02
    expect(within(preview).getByText('02/09/2026')).toBeTruthy();
    // 2026-05-10 + 143j = 2026-09-30
    expect(within(preview).getByText('30/09/2026')).toBeTruthy();
  });

  it('[5] submit N×1 : N insertSaillie avec date_mb_prevue à J+115', async () => {
    render(<QuickSailliesBandeForm isOpen onClose={() => undefined} />);

    fireEvent.click(screen.getByLabelText('Sélectionner truie T01'));
    fireEvent.click(screen.getByLabelText('Sélectionner truie T02'));
    fireEvent.click(screen.getByTestId('bande-verrat-V01'));

    fireEvent.click(
      screen.getByRole('button', { name: /Enregistrer 2 saillies/i }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(insertSaillie).toHaveBeenCalledTimes(2);
    const calls = (insertSaillie as ReturnType<typeof vi.fn>).mock.calls;
    const codes = calls.map(([args]) => args.sow_code_id).sort();
    expect(codes).toEqual(['T01', 'T02']);
    for (const [args] of calls) {
      expect(args.boar_code_id).toBe('V01');
      expect(args.statut).toBe('SAILLIE');
      // date_mb_prevue calculée = date_saillie + 115j
      expect(args.date_mb_prevue).toBe('2026-09-02');
    }
  });

  it('[6] round-robin 2 verrats : truies alternent V01 → V02 → V01', async () => {
    render(<QuickSailliesBandeForm isOpen onClose={() => undefined} />);

    fireEvent.click(screen.getByLabelText('Sélectionner truie T01'));
    fireEvent.click(screen.getByLabelText('Sélectionner truie T02'));
    fireEvent.click(screen.getByLabelText('Sélectionner truie T03'));
    fireEvent.click(screen.getByTestId('bande-verrat-V01'));
    fireEvent.click(screen.getByTestId('bande-verrat-V02'));

    fireEvent.click(
      screen.getByRole('button', { name: /Enregistrer 3 saillies/i }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(insertSaillie).toHaveBeenCalledTimes(3);
    const calls = (insertSaillie as ReturnType<typeof vi.fn>).mock.calls;
    // Ordre d'insertion = ordre de sélection [T01, T02, T03]
    const verratsByOrder = calls.map(([args]) => args.boar_code_id);
    expect(verratsByOrder).toEqual(['V01', 'V02', 'V01']);
  });
});
