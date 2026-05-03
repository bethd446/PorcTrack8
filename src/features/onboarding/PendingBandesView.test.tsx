// @vitest-environment jsdom
/**
 * Tests UI — PendingBandesView (V27-VALIDATION)
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   [1] empty state quand aucune bande PENDING
 *   [2] loading state affiche skeleton
 *   [3] sectioning MÂLES puis FEMELLES avec count correct
 *   [4] tri MÂLES en premier (visuel : l'index DOM des M < celui des F)
 *   [5] tap sur une row ouvre QuickAddBandeFromLogeForm (mock) avec le bon id
 *   [6] CTA "Valider toutes" ouvre la modal de confirmation
 *   [7] confirmer le bulk appelle supabase.update sur tous les ids
 *   [8] empty state — bouton retour appelle navigate(-1)
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => navigateMock };
});

// Mock du form pour ne tester que le PendingBandesView ici.
vi.mock('../../components/forms/QuickAddBandeFromLogeForm', () => ({
  default: ({
    isOpen,
    editPendingBatchId,
  }: {
    isOpen: boolean;
    editPendingBatchId?: string;
  }) =>
    isOpen ? (
      <div role="dialog" data-testid="mock-edit-form" data-batch-id={editPendingBatchId} />
    ) : null,
}));

const updateMock = vi.fn(async () => ({ error: null }));
const updateInMock = vi.fn(() => updateMock());
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => {
        // Capture le payload pour assertions.
        updateMock.mockImplementationOnce(async () => {
          (updateMock as unknown as { lastPayload?: unknown }).lastPayload = payload;
          return { error: null };
        });
        return { in: (col: string, ids: string[]) => {
          (updateInMock as unknown as { lastIds?: string[] }).lastIds = ids;
          (updateInMock as unknown as { lastCol?: string }).lastCol = col;
          return updateMock();
        } };
      },
    }),
  },
}));

import PendingBandesView, {
  type PendingBandeRow,
} from './PendingBandesView';

// Helper : state injecté pour bypass le hook réseau.
function injectState(rows: PendingBandeRow[], over: { loading?: boolean; error?: string | null } = {}): {
  rows: PendingBandeRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  return {
    rows,
    loading: over.loading ?? false,
    error: over.error ?? null,
    refresh: vi.fn(),
  };
}

const SAMPLE_ROWS: PendingBandeRow[] = [
  {
    id: 'b-male-1',
    code_id: 'B-2026-05-02-L3M',
    phase: 'POST_SEVRAGE',
    statut: 'EN_COURS',
    loge_id: 'l-1',
    loge_numero: 'PS-01',
    porcelets_nes_vivants: 24,
    poids_moyen_kg: 7.5,
  },
  {
    id: 'b-male-2',
    code_id: 'B-2026-05-02-L4M',
    phase: 'CROISSANCE',
    statut: 'EN_COURS',
    loge_id: 'l-2',
    loge_numero: 'C-01',
    porcelets_nes_vivants: 18,
    poids_moyen_kg: 22,
  },
  {
    id: 'b-female-1',
    code_id: 'B-2026-05-02-L3F',
    phase: 'POST_SEVRAGE',
    statut: 'EN_COURS',
    loge_id: 'l-3',
    loge_numero: 'PS-02',
    porcelets_nes_vivants: 20,
    poids_moyen_kg: 6.8,
  },
  {
    id: 'b-female-2',
    code_id: 'B-2026-05-02-QF',
    phase: 'MATERNITE',
    statut: 'EN_COURS',
    loge_id: 'l-4',
    loge_numero: 'M-01',
    porcelets_nes_vivants: 12,
    poids_moyen_kg: 1.4,
  },
];

beforeEach(() => {
  navigateMock.mockClear();
  updateMock.mockClear();
  updateInMock.mockClear();
});
afterEach(() => cleanup());

describe('PendingBandesView', () => {
  it('[1] empty state quand aucune bande PENDING', () => {
    render(<PendingBandesView injectedState={injectState([])} />);
    const empty = screen.getByTestId('pending-bandes-empty');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toMatch(/Aucune bande à valider/);
  });

  it('[2] loading affiche skeleton', () => {
    render(
      <PendingBandesView injectedState={injectState([], { loading: true })} />,
    );
    expect(screen.getByTestId('pending-bandes-skeleton')).toBeTruthy();
  });

  it('[3] sectioning MÂLES puis FEMELLES avec count', () => {
    render(<PendingBandesView injectedState={injectState(SAMPLE_ROWS)} />);

    const sectionM = screen.getByTestId('pending-section-M');
    const sectionF = screen.getByTestId('pending-section-F');
    expect(sectionM).toBeTruthy();
    expect(sectionF).toBeTruthy();
    // 2 mâles dans le sample
    expect(sectionM.textContent).toMatch(/Mâles \(2\)/);
    expect(sectionF.textContent).toMatch(/Femelles \(2\)/);
  });

  it('[4] tri MÂLES en premier — DOM order', () => {
    render(<PendingBandesView injectedState={injectState(SAMPLE_ROWS)} />);

    const view = screen.getByTestId('pending-bandes-view');
    const html = view.innerHTML;
    const idxMaleSection = html.indexOf('pending-section-M');
    const idxFemaleSection = html.indexOf('pending-section-F');
    expect(idxMaleSection).toBeGreaterThan(-1);
    expect(idxFemaleSection).toBeGreaterThan(-1);
    expect(idxMaleSection).toBeLessThan(idxFemaleSection);
  });

  it('[5] tap sur une row ouvre le form avec le bon batchId', () => {
    render(<PendingBandesView injectedState={injectState(SAMPLE_ROWS)} />);
    expect(screen.queryByTestId('mock-edit-form')).toBeNull();

    const row = screen
      .getByTestId('pending-row-b-male-1')
      .querySelector('button');
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    const form = screen.getByTestId('mock-edit-form');
    expect(form).toBeTruthy();
    expect(form.getAttribute('data-batch-id')).toBe('b-male-1');
  });

  it('[6] CTA "Valider toutes" ouvre la confirmation', () => {
    render(<PendingBandesView injectedState={injectState(SAMPLE_ROWS)} />);
    expect(screen.queryByTestId('pending-bandes-bulk-confirm')).toBeNull();

    fireEvent.click(screen.getByTestId('pending-bandes-bulk-cta'));

    const dialog = screen.getByTestId('pending-bandes-bulk-confirm');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toMatch(/Valider 4 bandes/);
  });

  it('[7] confirmer bulk appelle supabase.update sur tous les ids', async () => {
    render(<PendingBandesView injectedState={injectState(SAMPLE_ROWS)} />);
    fireEvent.click(screen.getByTestId('pending-bandes-bulk-cta'));
    fireEvent.click(screen.getByTestId('pending-bandes-bulk-confirm-btn'));

    // Attendre la résolution de la promise
    await new Promise(r => setTimeout(r, 0));

    expect(updateMock).toHaveBeenCalled();
    const payload = (updateMock as unknown as { lastPayload?: { validation_status?: string } })
      .lastPayload;
    expect(payload?.validation_status).toBe('VALIDATED');
    const ids = (updateInMock as unknown as { lastIds?: string[] }).lastIds;
    expect(ids).toEqual(SAMPLE_ROWS.map(r => r.id));
  });

  it('[8] empty state — bouton retour appelle navigate(-1)', () => {
    render(<PendingBandesView injectedState={injectState([])} />);
    fireEvent.click(screen.getByTestId('pending-bandes-empty-back'));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });
});
