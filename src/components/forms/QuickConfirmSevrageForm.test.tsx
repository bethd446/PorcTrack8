// @vitest-environment jsdom
/**
 * Tests unitaires — QuickConfirmSevrageForm (jsdom env)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Render : pending valide → form visible avec titre attendu
 *  [2] Render : pending=null → null (pas de crash)
 *  [3] Date sevrage : default = today ISO, modifiable
 *  [4] Nb sevrés : default issu de payload.patch.SEVRES, bornable à >=0
 *  [5] Bug C3 : nbSevres NE doit PAS reset après re-render parent (même pending)
 *  [6] Submit : appelle confirmAction(pending.id, note formatée)
 *  [7] onSuccess prop appelée + onClose après save (timeout 800)
 *  [8] Erreur Supabase remontée à l'UI (role="alert")
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

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
import QuickConfirmSevrageForm from './QuickConfirmSevrageForm';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makePending(
  overrides: Partial<PendingConfirmation> = {},
): PendingConfirmation {
  return {
    id: 'alert-42-CONFIRM_SEVRAGE',
    alertId: 'alert-42',
    alertTitle: 'Sevrage prévu',
    alertMessage: 'Bande 26-T7-01 prête à sevrer · 11 porcelet(s) sous mère',
    action: {
      type: 'CONFIRM_SEVRAGE',
      label: 'Confirmer',
      payload: {
        idValue: '26-T7-01',
        patch: { SEVRES: 11 },
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

describe('QuickConfirmSevrageForm', () => {
  it('[1] rend le titre avec le bandeId quand pending est valide', () => {
    render(
      <QuickConfirmSevrageForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );
    expect(
      screen.getByText(/Confirmer le sevrage de 26-T7-01/i),
    ).toBeTruthy();
  });

  it('[2] retourne null sans crash quand pending=null', () => {
    const { container } = render(
      <QuickConfirmSevrageForm
        isOpen
        onClose={() => undefined}
        pending={null}
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('[3] date sevrage : default = today ISO et reste modifiable', () => {
    render(
      <QuickConfirmSevrageForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );
    const dateInput = screen.getByLabelText(/Date de sevrage réelle/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2026-04-19');

    fireEvent.change(dateInput, { target: { value: '2026-04-15' } });
    expect(dateInput.value).toBe('2026-04-15');
  });

  it('[4] nb sevrés : default issu de payload.patch.SEVRES, borné >=0', () => {
    render(
      <QuickConfirmSevrageForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );
    const nbInput = screen.getByLabelText(/Nombre de porcelets sevrés/i) as HTMLInputElement;
    expect(nbInput.value).toBe('11');

    fireEvent.change(nbInput, { target: { value: '5' } });
    expect(nbInput.value).toBe('5');

    // Tentative valeur négative → bornée à 0
    fireEvent.change(nbInput, { target: { value: '-3' } });
    expect(Number(nbInput.value)).toBeGreaterThanOrEqual(0);
  });

  it('[5] BUG C3 : nbSevres saisi NE doit PAS être reset au re-render du parent', () => {
    const pending = makePending();
    const onClose = vi.fn();
    const { rerender } = render(
      <QuickConfirmSevrageForm isOpen onClose={onClose} pending={pending} />,
    );

    const nbInput = screen.getByLabelText(/Nombre de porcelets sevrés/i) as HTMLInputElement;
    fireEvent.change(nbInput, { target: { value: '5' } });
    expect(nbInput.value).toBe('5');

    // Re-render avec MÊME pending (nouvelle référence d'objet, même id) → valeur conservée.
    rerender(
      <QuickConfirmSevrageForm
        isOpen
        onClose={onClose}
        pending={{ ...pending }}
      />,
    );

    const nbInputAfter = screen.getByLabelText(/Nombre de porcelets sevrés/i) as HTMLInputElement;
    expect(nbInputAfter.value).toBe('5');
  });

  it('[6] submit : confirmAction appelée avec (pending.id, note formatée)', async () => {
    render(
      <QuickConfirmSevrageForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le sevrage/i }));

    // confirmAction est appelée synchronement dans handleConfirm avant l'await.
    expect(confirmAction).toHaveBeenCalledTimes(1);
    const [id, note] = (confirmAction as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(id).toBe('alert-42-CONFIRM_SEVRAGE');
    expect(note).toMatch(/Sevrage confirmé le 2026-04-19/);
    expect(note).toMatch(/11 porcelet/);
  });

  it('[7] onSuccess + onClose appelés après save (timeout 800)', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickConfirmSevrageForm
        isOpen
        onClose={onClose}
        pending={makePending()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le sevrage/i }));

    // Laisser les promesses se résoudre (microtasks) puis avancer le timer.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('[8] erreur Supabase remontée via role="alert"', async () => {
    (confirmAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'PostgresError 23502',
    });

    render(
      <QuickConfirmSevrageForm
        isOpen
        onClose={() => undefined}
        pending={makePending()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirmer le sevrage/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/PostgresError 23502/);
  });
});
