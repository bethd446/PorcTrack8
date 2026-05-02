// @vitest-environment jsdom
/**
 * Tests UI — PendingBandesBanner (V26-FORM)
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   [1] hidden quand count=0 (rien à valider)
 *   [2] hidden quand loading
 *   [3] visible quand count>0, label affiche le bon nombre
 *   [4] singulier vs pluriel ("1 bande" vs "3 bandes")
 *   [5] tap ouvre le form en mode édition (testid présent)
 */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

// On mock le QuickAddBandeFromLogeForm pour ne tester ici que le banner.
vi.mock('../forms/QuickAddBandeFromLogeForm', () => ({
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

vi.mock('../../services/supabaseClient', () => ({
  supabase: { from: () => ({}) },
}));

import PendingBandesBanner, { type PendingBandesState } from './PendingBandesBanner';

afterEach(() => cleanup());

function makeState(over: Partial<PendingBandesState> = {}): PendingBandesState {
  return {
    count: 0,
    firstPendingId: null,
    loading: false,
    refresh: () => undefined,
    ...over,
  };
}

describe('PendingBandesBanner', () => {
  it('[1] hidden quand count=0', () => {
    render(<PendingBandesBanner injectedState={makeState({ count: 0 })} />);
    expect(screen.queryByTestId('pending-bandes-banner')).toBeNull();
  });

  it('[2] hidden quand loading', () => {
    render(
      <PendingBandesBanner
        injectedState={makeState({ count: 5, loading: true, firstPendingId: 'b-1' })}
      />,
    );
    expect(screen.queryByTestId('pending-bandes-banner')).toBeNull();
  });

  it('[3] visible quand count>0', () => {
    render(
      <PendingBandesBanner
        injectedState={makeState({
          count: 3,
          firstPendingId: 'batch-uuid-1',
        })}
      />,
    );
    const banner = screen.getByTestId('pending-bandes-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toMatch(/3 bandes à valider/);
  });

  it('[4] singulier "1 bande" sans s', () => {
    render(
      <PendingBandesBanner
        injectedState={makeState({ count: 1, firstPendingId: 'b-1' })}
      />,
    );
    const banner = screen.getByTestId('pending-bandes-banner');
    expect(banner.textContent).toMatch(/1 bande à valider/);
    expect(banner.textContent).not.toMatch(/1 bandes/);
  });

  it('[5] tap ouvre le form en mode édition avec le bon batchId', () => {
    render(
      <PendingBandesBanner
        injectedState={makeState({ count: 2, firstPendingId: 'batch-uuid-42' })}
      />,
    );
    expect(screen.queryByTestId('mock-edit-form')).toBeNull();

    fireEvent.click(screen.getByTestId('pending-bandes-banner-cta'));

    const form = screen.getByTestId('mock-edit-form');
    expect(form).toBeTruthy();
    expect(form.getAttribute('data-batch-id')).toBe('batch-uuid-42');
  });
});
