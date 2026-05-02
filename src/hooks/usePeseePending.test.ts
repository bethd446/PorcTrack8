// @vitest-environment jsdom
/**
 * Tests unitaires — usePeseePending
 * ════════════════════════════════════
 * Vérifie le polling 60s et le refresh manuel.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const listPending = vi.fn();

vi.mock('../services/peseePlanifieesService', () => ({
  listPeseePending: () => listPending(),
}));

import { usePeseePending } from './usePeseePending';

beforeEach(() => {
  listPending.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePeseePending', () => {
  it('polls listPeseePending every 60s and exposes refresh()', async () => {
    listPending.mockResolvedValue([
      {
        id: 'p1', batchId: 'b1', datePrevue: '2026-05-15',
        rappelJ1: false, rappelJ3: false, effectuee: false,
      },
    ]);
    vi.useFakeTimers();

    const { result } = renderHook(() => usePeseePending());

    // Premier fetch déclenché → flush microtasks
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listPending).toHaveBeenCalledTimes(1);
    expect(result.current.pesees).toHaveLength(1);
    expect(result.current.loading).toBe(false);

    // Avance le timer de 60s → poll automatique
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listPending).toHaveBeenCalledTimes(2);

    // Refresh manuel
    await act(async () => {
      result.current.refresh();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listPending).toHaveBeenCalledTimes(3);
  });
});
