// @vitest-environment jsdom
/**
 * Tests unitaires — QuickRetourChaleurForm (Sprint 11)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Render : eyebrow + titre + indication fenêtre J12-J35
 *  [2] Filtre : seules les truies dont la dernière saillie tombe en
 *      [J+12 ; J+35] apparaissent
 *  [3] Submit happy path : insertHealthLog appelée avec log_type
 *      'RETOUR_CHALEUR' + animal_code + log_date
 *  [4] Action SURVEILLER : updateSow patché à 'À surveiller'
 *  [5] Action RESAILLIR : onResaillir(displayId) callback déclenché
 *  [6] Aucune saillie dans la fenêtre → empty state explicite
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

import type { Saillie, Truie } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => ({
  insertHealthLog: vi.fn().mockResolvedValue({ id: 'hl-1' }),
  updateSow: vi.fn().mockResolvedValue({ ok: true }),
  resolveSowIdByCode: vi.fn(async (c: string) => `sow-uuid-${c}`),
}));

interface MockFarm {
  truies: Truie[];
  saillies: Saillie[];
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

import {
  insertHealthLog,
  updateSow,
} from '../../services/supabaseWrites';
import QuickRetourChaleurForm from './QuickRetourChaleurForm';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: `sow-uuid-${overrides.displayId ?? 'T01'}`,
    displayId: 'T01',
    boucle: 'BCL-T01',
    statut: 'Pleine',
    ration: 6,
    synced: true,
    ...overrides,
  };
}

function makeSaillie(truieId: string, dateISO: string, verratId = 'V01'): Saillie {
  return {
    truieId,
    verratId,
    dateSaillie: dateISO,
    statut: 'SAILLIE',
  };
}

// Date courante figée pour des fenêtres déterministes (UTC midi pour éviter
// les décalages timezone : .toISOString().slice(0,10) reste constant).
const TODAY = new Date('2026-05-10T12:00:00Z');
const todayIso = '2026-05-10';
function isoMinus(days: number): string {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
  mockFarm = {
    truies: [],
    saillies: [],
    refreshData: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickRetourChaleurForm', () => {
  it('[1] render : eyebrow + titre + indication fenêtre', () => {
    render(<QuickRetourChaleurForm isOpen onClose={() => undefined} />);
    // Présence de plusieurs occurrences (eyebrow + titre BottomSheet) : OK.
    expect(screen.getAllByText(/Retour de chaleur/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Saisir un retour de chaleur/i).length).toBeGreaterThan(0);
    // Fenêtre J12-J35 indiquée.
    expect(screen.getByText(/J12-J35/)).toBeTruthy();
  });

  it('[2] filtre : seules les truies en fenêtre [J+12 ; J+35] apparaissent', () => {
    mockFarm.truies = [
      makeTruie({ id: 'sow-T01', displayId: 'T01' }),
      makeTruie({ id: 'sow-T02', displayId: 'T02' }),
      makeTruie({ id: 'sow-T03', displayId: 'T03' }),
    ];
    mockFarm.saillies = [
      // T01 saillie il y a 20j → DANS la fenêtre
      makeSaillie('T01', isoMinus(20)),
      // T02 saillie il y a 5j → HORS fenêtre (trop récent)
      makeSaillie('T02', isoMinus(5)),
      // T03 saillie il y a 50j → HORS fenêtre (trop ancien)
      makeSaillie('T03', isoMinus(50)),
    ];

    render(<QuickRetourChaleurForm isOpen onClose={() => undefined} />);
    // T01 visible
    expect(screen.queryByTestId('retour-truie-T01')).toBeTruthy();
    // T02 et T03 hors fenêtre — pas de chip
    expect(screen.queryByTestId('retour-truie-T02')).toBeNull();
    expect(screen.queryByTestId('retour-truie-T03')).toBeNull();
  });

  it('[3] submit : insertHealthLog avec log_type RETOUR_CHALEUR + animal_code', async () => {
    mockFarm.truies = [makeTruie({ id: 'sow-T01', displayId: 'T01' })];
    mockFarm.saillies = [makeSaillie('T01', isoMinus(20))];

    render(<QuickRetourChaleurForm isOpen onClose={() => undefined} />);

    // Sélectionne T01
    fireEvent.click(screen.getByTestId('retour-truie-T01'));
    // Action par défaut RESAILLIR — change pour ATTENDRE pour ne pas
    // déclencher onResaillir.
    fireEvent.click(screen.getByTestId('action-attendre'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer le retour|Confirmer le retour/i }));

    // Laisse les promises se résoudre.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(insertHealthLog).toHaveBeenCalledTimes(1);
    const [args] = (insertHealthLog as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args.log_type).toBe('RETOUR_CHALEUR');
    expect(args.animal_code).toBe('T01');
    expect(args.animal_type).toBe('TRUIE');
    expect(args.log_date).toBe(todayIso);
    expect(typeof args.notes).toBe('string');
    expect(args.notes).toContain('J+20');
  });

  it('[4] action SURVEILLER : updateSow patché à "À surveiller"', async () => {
    mockFarm.truies = [makeTruie({ id: 'sow-T01', displayId: 'T01' })];
    mockFarm.saillies = [makeSaillie('T01', isoMinus(22))];

    render(<QuickRetourChaleurForm isOpen onClose={() => undefined} />);

    fireEvent.click(screen.getByTestId('retour-truie-T01'));
    fireEvent.click(screen.getByTestId('action-surveiller'));
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer le retour|Confirmer le retour/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateSow).toHaveBeenCalledTimes(1);
    const [id, patch] = (updateSow as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(id).toBe('sow-T01');
    expect(patch.statut).toBe('À surveiller');
  });

  it('[5] action RESAILLIR : onResaillir(displayId) callback déclenché', async () => {
    mockFarm.truies = [makeTruie({ id: 'sow-T07', displayId: 'T07' })];
    mockFarm.saillies = [makeSaillie('T07', isoMinus(19))];

    const onResaillir = vi.fn();
    const onClose = vi.fn();
    render(
      <QuickRetourChaleurForm isOpen onClose={onClose} onResaillir={onResaillir} />,
    );

    fireEvent.click(screen.getByTestId('retour-truie-T07'));
    // Action par défaut = RESAILLIR (pas besoin de cliquer)
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer le retour|Confirmer le retour/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Le callback est déclenché dans le setTimeout de fin (1200ms).
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });

    expect(onResaillir).toHaveBeenCalledWith('T07');
  });

  it('[6] aucune saillie en fenêtre → empty state', () => {
    mockFarm.truies = [makeTruie({ id: 'sow-T01', displayId: 'T01' })];
    mockFarm.saillies = []; // pas de saillie du tout

    render(<QuickRetourChaleurForm isOpen onClose={() => undefined} />);

    expect(
      screen.getByText(/Aucune truie dans la fenêtre d'observation/i),
    ).toBeTruthy();
  });
});
