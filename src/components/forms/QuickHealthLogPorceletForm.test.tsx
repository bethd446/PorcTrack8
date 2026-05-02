// @vitest-environment jsdom
/**
 * Tests unitaires — QuickHealthLogPorceletForm (jsdom env)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Couvre :
 *  [1] Workflow step 1 + step 2 : sélection porcelet → saisie symptômes →
 *      submit. Vérifie que insertHealthLogForPorcelet est appelé avec les
 *      bons args.
 *  [2] Validation côté UI : symptômes requis bloque le submit.
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

import type { PorceletIndividuel } from '../../types/farm';

// ── Mocks ────────────────────────────────────────────────────────────────────

const insertHealthLogForPorceletMock = vi.fn();
const listPorceletsByBatchMock = vi.fn();

vi.mock('../../services/supabaseWrites', () => ({
  insertHealthLogForPorcelet: (
    args: Parameters<typeof insertHealthLogForPorceletMock>[0],
  ) => insertHealthLogForPorceletMock(args),
  listPorceletsByBatch: (id: string) => listPorceletsByBatchMock(id),
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

import QuickHealthLogPorceletForm from './QuickHealthLogPorceletForm';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PORCELETS: PorceletIndividuel[] = [
  {
    id: 'porc-1',
    batchId: 'B01',
    boucle: 'P-001',
    sexe: 'M',
    statut: 'VIVANT',
    poidsCourantKg: 5.5,
  },
  {
    id: 'porc-2',
    batchId: 'B01',
    boucle: 'P-002',
    sexe: 'F',
    statut: 'MALADE',
    poidsCourantKg: 4.8,
  },
  {
    id: 'porc-3',
    batchId: 'B01',
    boucle: 'P-003',
    sexe: 'M',
    statut: 'MORT',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  insertHealthLogForPorceletMock.mockResolvedValue(undefined);
  listPorceletsByBatchMock.mockResolvedValue(PORCELETS);
});

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickHealthLogPorceletForm — workflow', () => {
  it('[1] step 1 → step 2 → submit appelle insertHealthLogForPorcelet', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickHealthLogPorceletForm
        isOpen
        onClose={onClose}
        bandeId="B01"
        onSuccess={onSuccess}
      />,
    );

    // Attendre le chargement de la liste
    await waitFor(() =>
      expect(listPorceletsByBatchMock).toHaveBeenCalledWith('B01'),
    );

    // Step 1 : on doit voir P-001 et P-002 (VIVANT/MALADE), pas P-003 (MORT)
    await waitFor(() => screen.getByTestId('porcelet-item-porc-1'));
    expect(screen.getByTestId('porcelet-item-porc-1')).toBeTruthy();
    expect(screen.getByTestId('porcelet-item-porc-2')).toBeTruthy();
    expect(screen.queryByTestId('porcelet-item-porc-3')).toBeNull();

    // Sélection porc-1 → step 2
    fireEvent.click(screen.getByTestId('porcelet-item-porc-1'));

    // Step 2 : champ symptômes visible
    const sympt = screen.getByLabelText(
      /Symptômes observés/i,
    ) as HTMLTextAreaElement;
    expect(sympt).toBeTruthy();

    // Saisir symptômes + dose
    fireEvent.change(sympt, { target: { value: 'toux + abattement' } });
    const dose = screen.getByLabelText(/Nombre de doses/i) as HTMLInputElement;
    fireEvent.change(dose, { target: { value: '2' } });

    // Submit
    const submit = screen.getByLabelText(/Enregistrer le signalement/i);
    fireEvent.click(submit);

    await waitFor(() => {
      expect(insertHealthLogForPorceletMock).toHaveBeenCalledTimes(1);
    });

    expect(insertHealthLogForPorceletMock).toHaveBeenCalledWith(
      expect.objectContaining({
        porceletId: 'porc-1',
        batchId: 'B01',
        logType: 'CONSULT',
        symptome: 'toux + abattement',
        doseCount: 2,
      }),
    );

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('[2] symptômes vides bloque le submit (bouton disabled)', async () => {
    render(
      <QuickHealthLogPorceletForm
        isOpen
        onClose={() => undefined}
        bandeId="B01"
        porceletId="porc-1"
      />,
    );

    // Avec porceletId préremplì, on est directement en step 2
    await waitFor(() =>
      expect(listPorceletsByBatchMock).toHaveBeenCalledWith('B01'),
    );

    const submit = screen.getByLabelText(
      /Enregistrer le signalement/i,
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    // Cliquer ne devrait rien faire (et insertHealthLogForPorcelet pas appelé)
    fireEvent.click(submit);
    await new Promise(r => setTimeout(r, 10));
    expect(insertHealthLogForPorceletMock).not.toHaveBeenCalled();
  });
});
