// @vitest-environment jsdom
/**
 * Tests unitaires — QuickMoveSubjectForm (V6-B)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Filtrage par type compatible : seules les loges du type autorisé
 *      apparaissent (ex: BANDE → POST_SEVRAGE/CROISSANCE/…, pas MATERNITE).
 *  [2] Submit appelle moveSubject avec les bons paramètres.
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

import type { Loge } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/supabaseWrites', () => {
  const fakeLoges: Loge[] = [
    { id: 'l1', numero: 'M-01', type: 'MATERNITE', active: true },
    { id: 'l2', numero: 'PS-01', type: 'POST_SEVRAGE', active: true },
    { id: 'l3', numero: 'CR-01', type: 'CROISSANCE', active: true },
    { id: 'l4', numero: 'INF-01', type: 'INFIRMERIE', active: true },
    { id: 'l5', numero: 'V-01', type: 'VERRAT', active: true },
    { id: 'l6', numero: 'M-02', type: 'MATERNITE', active: false },
  ];
  return {
    listLoges: vi.fn().mockResolvedValue(fakeLoges),
    moveSubject: vi.fn().mockResolvedValue({
      id: 'mvt-1',
      subjectType: 'BANDE',
      subjectId: 'b-1',
      toLogeId: 'l2',
      dateMvt: '2026-05-02',
    }),
  };
});

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

import { moveSubject } from '../../services/supabaseWrites';
import QuickMoveSubjectForm from './QuickMoveSubjectForm';

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════

describe('QuickMoveSubjectForm', () => {
  it("[1] BANDE : seules les loges compatibles + actives apparaissent", async () => {
    render(
      <QuickMoveSubjectForm
        isOpen
        onClose={() => undefined}
        subjectType="BANDE"
        subjectId="b-1"
        subjectLabel="Bande B-1"
      />,
    );

    // BANDE → POST_SEVRAGE / CROISSANCE / ENGRAISSEMENT / FINITION / INFIRMERIE
    await waitFor(() => {
      expect(screen.getByTestId('loge-PS-01')).toBeTruthy();
    });
    expect(screen.getByTestId('loge-CR-01')).toBeTruthy();
    expect(screen.getByTestId('loge-INF-01')).toBeTruthy();
    // M-01 (MATERNITE), V-01 (VERRAT), M-02 (archivée) doivent être absents
    expect(screen.queryByTestId('loge-M-01')).toBeNull();
    expect(screen.queryByTestId('loge-V-01')).toBeNull();
    expect(screen.queryByTestId('loge-M-02')).toBeNull();
  });

  it("[2] Submit → moveSubject avec subjectType, subjectId, toLogeId, reason", async () => {
    render(
      <QuickMoveSubjectForm
        isOpen
        onClose={() => undefined}
        subjectType="BANDE"
        subjectId="b-1"
        subjectLabel="Bande B-1"
        currentLogeId="l-old"
        currentLogeNumero="OLD-01"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loge-PS-01')).toBeTruthy();
    });

    // Sélectionne PS-01
    fireEvent.click(screen.getByTestId('loge-PS-01'));

    // Saisit raison
    fireEvent.change(screen.getByLabelText(/Raison du déplacement/i), {
      target: { value: 'Sevrage J28' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Déplacer$/i }));

    await waitFor(() => {
      expect(moveSubject).toHaveBeenCalledTimes(1);
    });
    const [args] = (moveSubject as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args).toMatchObject({
      subjectType: 'BANDE',
      subjectId: 'b-1',
      toLogeId: 'l2',
      reason: 'Sevrage J28',
    });
  });
});
