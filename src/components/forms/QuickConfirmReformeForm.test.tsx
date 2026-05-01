// @vitest-environment jsdom
/**
 * Tests unitaires — QuickConfirmReformeForm (jsdom env)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Render : pending valide → "Confirmer la réforme de {truieCode}"
 *  [2] Combobox motif : présence des 6 presets
 *  [3] motif="AUTRE" → input précision visible (révélé conditionnellement)
 *  [4] Submit motif=AUTRE sans précision → note se termine par "non précisé"
 *  [5] Submit motif standard → note formatée correctement
 *  [6] Date de sortie : default today, modifiable
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
} from '@testing-library/react';

import type { PendingConfirmation } from '../../services/confirmationQueue';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/confirmationQueue', async () => {
  const actual = await vi.importActual<
    typeof import('../../services/confirmationQueue')
  >('../../services/confirmationQueue');
  return {
    ...actual,
    confirmAction: vi.fn().mockResolvedValue({ success: true }),
  };
});

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

import { confirmAction } from '../../services/confirmationQueue';
import QuickConfirmReformeForm from './QuickConfirmReformeForm';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makePending(
  overrides: Partial<PendingConfirmation> = {},
): PendingConfirmation {
  return {
    id: 'alert-99-CONFIRM_REFORME',
    alertId: 'alert-99',
    alertTitle: 'Réforme suggérée',
    alertMessage: 'T07 inactive depuis 90 jours · Motif : INACTIVE_LONG',
    action: {
      type: 'CONFIRM_REFORME',
      label: 'Confirmer',
      payload: {
        idValue: 'T07',
        patch: { STATUT: 'Réforme' },
      },
    },
    status: 'PENDING',
    createdAt: '2026-04-19T08:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 19, 9, 0, 0));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickConfirmReformeForm', () => {
  it('[1] rend le titre avec le code truie', () => {
    render(
      <QuickConfirmReformeForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );
    expect(screen.getByText(/Confirmer la réforme de T07/i)).toBeTruthy();
  });

  it('[2] combobox motif contient les 6 presets', () => {
    render(
      <QuickConfirmReformeForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );
    const select = screen.getByLabelText(/Motif retenu/i) as HTMLSelectElement;
    const labels = Array.from(select.options).map(o => o.textContent);
    expect(labels).toContain('Truie inactive longue durée');
    expect(labels).toContain('Productivité faible');
    expect(labels).toContain('Boiterie');
    expect(labels).toContain('Maladie');
    expect(labels).toContain('Âge');
    expect(labels).toContain('Autre');
  });

  it('[3] motif="AUTRE" → input précision révélé', () => {
    render(
      <QuickConfirmReformeForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );

    expect(screen.queryByLabelText(/Préciser le motif/i)).toBeNull();

    const select = screen.getByLabelText(/Motif retenu/i);
    fireEvent.change(select, { target: { value: 'AUTRE' } });

    expect(screen.getByLabelText(/Préciser le motif/i)).toBeTruthy();
  });

  it('[4] motif AUTRE sans précision → note se termine par "non précisé"', () => {
    render(
      <QuickConfirmReformeForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Motif retenu/i), {
      target: { value: 'AUTRE' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmer la réforme/i }),
    );

    expect(confirmAction).toHaveBeenCalledTimes(1);
    const [, note] = (confirmAction as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(note).toMatch(/non précisé/);
    expect(note).toMatch(/Motif : Autre/);
  });

  it('[5] motif standard (BOITERIE) → note formatée avec label complet', () => {
    render(
      <QuickConfirmReformeForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Motif retenu/i), {
      target: { value: 'BOITERIE' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmer la réforme/i }),
    );

    expect(confirmAction).toHaveBeenCalledTimes(1);
    const [id, note] = (confirmAction as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(id).toBe('alert-99-CONFIRM_REFORME');
    expect(note).toMatch(/Réforme confirmée le 2026-04-19/);
    expect(note).toMatch(/Motif : Boiterie/);
  });

  it('[6] date de sortie : default today, modifiable', () => {
    render(
      <QuickConfirmReformeForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );

    const dateInput = screen.getByLabelText(/Date de sortie/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2026-04-19');

    fireEvent.change(dateInput, { target: { value: '2026-04-10' } });
    expect(dateInput.value).toBe('2026-04-10');
  });
});

