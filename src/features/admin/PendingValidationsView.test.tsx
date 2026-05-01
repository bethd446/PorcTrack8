// @vitest-environment jsdom
/**
 * Tests unitaires — PendingValidationsView (V21-7)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre rendu liste, click validate, click reject, empty state.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-uuid' }, role: 'OWNER' }),
}));

const mockGetPending = vi.fn();
const mockValidate = vi.fn();
const mockReject = vi.fn();

vi.mock('../../services/validationWorkflow', () => ({
  getPendingValidations: (...args: unknown[]) => mockGetPending(...args),
  validateAction: (...args: unknown[]) => mockValidate(...args),
  rejectAction: (...args: unknown[]) => mockReject(...args),
}));

import PendingValidationsView from './PendingValidationsView';

const sample = [
  {
    type: 'MORTALITE' as const,
    table: 'health_logs' as const,
    id: 'hl-1',
    subject: 'Bande 26-T9-01 — 1 mort (Diarrhée)',
    saisi_par: 'Marc',
    saisi_le: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    data: {},
  },
  {
    type: 'VENTE' as const,
    table: 'finances' as const,
    id: 'f-1',
    subject: 'Vente 12 porcs · 3 024 000 FCFA',
    saisi_par: 'Marc',
    saisi_le: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    data: {},
  },
];

beforeEach(() => {
  mockGetPending.mockReset();
  mockValidate.mockReset();
  mockReject.mockReset();
  // window.prompt par défaut
  vi.stubGlobal('prompt', () => 'motif test');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderView() {
  return render(
    <MemoryRouter>
      <PendingValidationsView />
    </MemoryRouter>,
  );
}

describe('PendingValidationsView', () => {
  it('affiche la liste des actions en attente', async () => {
    mockGetPending.mockResolvedValue(sample);
    renderView();
    await waitFor(() => expect(mockGetPending).toHaveBeenCalled());
    expect(await screen.findByText(/Bande 26-T9-01/)).toBeTruthy();
    expect(screen.getByText(/Vente 12 porcs/)).toBeTruthy();
    const items = screen.getAllByTestId('pending-item');
    expect(items.length).toBe(2);
  });

  it('affiche empty state quand aucune action', async () => {
    mockGetPending.mockResolvedValue([]);
    renderView();
    await waitFor(() => expect(mockGetPending).toHaveBeenCalled());
    expect(await screen.findByTestId('pending-empty')).toBeTruthy();
    expect(screen.getByText(/Aucune action en attente/)).toBeTruthy();
  });

  it('appelle validateAction au click sur Valider et retire l\'item', async () => {
    mockGetPending.mockResolvedValue(sample);
    mockValidate.mockResolvedValue(undefined);
    renderView();
    await waitFor(() => expect(screen.getAllByTestId('pending-item').length).toBe(2));

    const validateButtons = screen.getAllByRole('button', { name: /^Valider /i });
    fireEvent.click(validateButtons[0]);

    await waitFor(() => expect(mockValidate).toHaveBeenCalled());
    expect(mockValidate.mock.calls[0][0]).toBe('health_logs');
    expect(mockValidate.mock.calls[0][2]).toBe('admin-uuid');

    await waitFor(() => expect(screen.getAllByTestId('pending-item').length).toBe(1));
  });

  it('appelle rejectAction au click sur Rejeter avec la raison', async () => {
    mockGetPending.mockResolvedValue(sample);
    mockReject.mockResolvedValue(undefined);
    renderView();
    await waitFor(() => expect(screen.getAllByTestId('pending-item').length).toBe(2));

    const rejectButtons = screen.getAllByRole('button', { name: /^Rejeter /i });
    fireEvent.click(rejectButtons[0]);

    await waitFor(() => expect(mockReject).toHaveBeenCalled());
    expect(mockReject.mock.calls[0][0]).toBe('health_logs');
    expect(mockReject.mock.calls[0][3]).toBe('motif test');
  });
});
