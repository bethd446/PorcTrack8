// @vitest-environment jsdom
/**
 * Tests unitaires — useEntityWithRetry (V74 Vague U)
 * ════════════════════════════════════════════════════════════════════════════
 * Hook défense-en-profondeur pour vues "Detail". Vérifie :
 *   - état loading initial quand FarmContext.loading = true
 *   - état ready quand entity trouvée immédiatement
 *   - retry refreshData() une seule fois si entity absente, puis transition
 *     loading → ready
 *   - état not-found après retry sans succès
 *   - anti-spam : refreshData jamais appelé en boucle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const refreshDataMock = vi.fn(() => Promise.resolve());
const useFarmMock = vi.fn();

vi.mock('../context/FarmContext', () => ({
  useFarm: () => useFarmMock(),
}));

import { useEntityWithRetry } from './useEntityWithRetry';

beforeEach(() => {
  refreshDataMock.mockClear();
  useFarmMock.mockReset();
});

describe('useEntityWithRetry', () => {
  it('retourne loading quand FarmContext.loading=true', () => {
    useFarmMock.mockReturnValue({ loading: true, refreshData: refreshDataMock });
    const { result } = renderHook(() => useEntityWithRetry(undefined));
    expect(result.current.state).toBe('loading');
    expect(result.current.entity).toBeNull();
    expect(refreshDataMock).not.toHaveBeenCalled();
  });

  it('retourne ready quand entity est trouvée immédiatement', () => {
    useFarmMock.mockReturnValue({ loading: false, refreshData: refreshDataMock });
    const fakeEntity = { id: 'e1', name: 'foo' };
    const { result } = renderHook(() => useEntityWithRetry(fakeEntity));
    expect(result.current.state).toBe('ready');
    expect(result.current.entity).toBe(fakeEntity);
    expect(refreshDataMock).not.toHaveBeenCalled();
  });

  it('déclenche refreshData une fois si entity absente puis bascule en not-found', async () => {
    useFarmMock.mockReturnValue({ loading: false, refreshData: refreshDataMock });
    const { result, rerender } = renderHook(
      ({ entity }: { entity: unknown }) => useEntityWithRetry(entity),
      { initialProps: { entity: undefined as unknown } },
    );

    // Premier render : effet commit → setRetried(true) → re-render synchrone
    await act(async () => {
      await Promise.resolve();
    });

    expect(refreshDataMock).toHaveBeenCalledTimes(1);
    expect(refreshDataMock).toHaveBeenCalledWith(true);

    // Toujours pas d'entity après retry → not-found
    rerender({ entity: undefined });
    expect(result.current.state).toBe('not-found');
    expect(result.current.entity).toBeNull();
  });

  it('bascule vers ready si entity arrive après retry (latence FarmContext)', async () => {
    useFarmMock.mockReturnValue({ loading: false, refreshData: refreshDataMock });
    const { result, rerender } = renderHook(
      ({ entity }: { entity: unknown }) => useEntityWithRetry(entity),
      { initialProps: { entity: undefined as unknown } },
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(refreshDataMock).toHaveBeenCalledTimes(1);

    const arrived = { id: 'e2' };
    rerender({ entity: arrived });
    expect(result.current.state).toBe('ready');
    expect(result.current.entity).toBe(arrived);
  });

  it('ne re-déclenche PAS refreshData en boucle (anti-spam)', async () => {
    useFarmMock.mockReturnValue({ loading: false, refreshData: refreshDataMock });
    const { rerender } = renderHook(
      ({ entity }: { entity: unknown }) => useEntityWithRetry(entity),
      { initialProps: { entity: undefined as unknown } },
    );
    await act(async () => {
      await Promise.resolve();
    });
    // Plusieurs re-renders avec entity toujours absente
    rerender({ entity: undefined });
    rerender({ entity: undefined });
    rerender({ entity: undefined });
    await act(async () => {
      await Promise.resolve();
    });
    expect(refreshDataMock).toHaveBeenCalledTimes(1);
  });

  it('attend la fin du loading FarmContext avant de tenter le retry', async () => {
    // Loading=true au mount → state loading, pas de retry
    useFarmMock.mockReturnValue({ loading: true, refreshData: refreshDataMock });
    const { result, rerender } = renderHook(
      ({ entity }: { entity: unknown }) => useEntityWithRetry(entity),
      { initialProps: { entity: undefined as unknown } },
    );
    expect(result.current.state).toBe('loading');
    expect(refreshDataMock).not.toHaveBeenCalled();

    // Loading=false ensuite, entity toujours absente → trigger retry
    useFarmMock.mockReturnValue({ loading: false, refreshData: refreshDataMock });
    rerender({ entity: undefined });
    await act(async () => {
      await Promise.resolve();
    });
    expect(refreshDataMock).toHaveBeenCalledTimes(1);
  });
});
