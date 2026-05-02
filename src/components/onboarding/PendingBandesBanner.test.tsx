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

import PendingBandesBanner, {
  type PendingBandesState,
  isMaleBatch,
  sortBandesPendingMaleFirst,
} from './PendingBandesBanner';

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

// ═══════════════════════════════════════════════════════════════════════════
// [V26c] Tri MÂLES en premier (demande métier christophe — ordre carnet)
// ═══════════════════════════════════════════════════════════════════════════
describe('[V26c] sortBandesPendingMaleFirst', () => {
  it('détecte mâle via suffixe -M', () => {
    expect(isMaleBatch('B-2026-05-02-L3M')).toBe(true);
    expect(isMaleBatch('B-2026-05-02-L4M')).toBe(true);
    expect(isMaleBatch('B-2026-05-02-QM')).toBe(true);
  });

  it('détecte femelle via suffixe -F (pas mâle)', () => {
    expect(isMaleBatch('B-2026-05-02-L3F')).toBe(false);
    expect(isMaleBatch('B-2026-05-02-QF')).toBe(false);
    expect(isMaleBatch('B-2026-05-02-L5RF')).toBe(false);
  });

  it('null/undefined ne sont pas mâles', () => {
    expect(isMaleBatch(null)).toBe(false);
    expect(isMaleBatch(undefined)).toBe(false);
    expect(isMaleBatch('')).toBe(false);
  });

  it('trie 10 bandes mixtes : tous les M avant tous les F', () => {
    const input = [
      { id: '1', code_id: 'B-2026-05-02-L3F' },
      { id: '2', code_id: 'B-2026-05-02-L3M' },
      { id: '3', code_id: 'B-2026-05-02-L4F' },
      { id: '4', code_id: 'B-2026-05-02-L4M' },
      { id: '5', code_id: 'B-2026-05-02-QF' },
      { id: '6', code_id: 'B-2026-05-02-QM' },
    ];
    const out = sortBandesPendingMaleFirst(input);
    const codes = out.map(b => b.code_id ?? '');
    // Tous les M doivent venir avant tous les F
    let lastMIdx = -1;
    for (let i = 0; i < codes.length; i++) if (/M$/.test(codes[i])) lastMIdx = i;
    const firstFIdx = codes.findIndex(c => /F$/.test(c));
    expect(lastMIdx).toBeLessThan(firstFIdx);
    // Et l'ordre stable alphabétique au sein de chaque groupe
    expect(codes[0]).toBe('B-2026-05-02-L3M');
  });

  it('ne mute pas le tableau d\'entrée', () => {
    const input = [
      { id: '1', code_id: 'B-F' },
      { id: '2', code_id: 'B-M' },
    ];
    const inputCopy = JSON.parse(JSON.stringify(input));
    sortBandesPendingMaleFirst(input);
    expect(input).toEqual(inputCopy);
  });
});
