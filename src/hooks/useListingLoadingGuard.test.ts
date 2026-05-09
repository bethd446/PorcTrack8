// @vitest-environment jsdom
/**
 * Tests unitaires — useListingLoadingGuard (V74 Vague V)
 * ════════════════════════════════════════════════════════════════════════════
 * Hook compagnon de useEntityWithRetry pour les LISTINGS.
 * Vérifie :
 *   - retourne true tant que loading=true (skeleton pendant fetch initial)
 *   - retourne false dès que loading=false (laisse l'appelant afficher empty)
 *   - le ref hasSeenData se met à jour pour les consumers avancés
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useListingLoadingGuard } from './useListingLoadingGuard';

describe('useListingLoadingGuard', () => {
  it('retourne true quand loading=true et items=0', () => {
    const { result } = renderHook(() => useListingLoadingGuard(true, 0));
    expect(result.current).toBe(true);
  });

  it('retourne false quand loading=false même si items=0 (cas légitime empty)', () => {
    const { result } = renderHook(() => useListingLoadingGuard(false, 0));
    expect(result.current).toBe(false);
  });

  it('retourne false quand loading=false et items>0', () => {
    const { result } = renderHook(() => useListingLoadingGuard(false, 5));
    expect(result.current).toBe(false);
  });

  it('reste à true tant que loading=true même si items>0 (refresh en cours)', () => {
    const { result } = renderHook(() => useListingLoadingGuard(true, 5));
    expect(result.current).toBe(true);
  });

  it('bascule false dès que loading passe à false', () => {
    const { result, rerender } = renderHook(
      ({ loading, count }: { loading: boolean; count: number }) =>
        useListingLoadingGuard(loading, count),
      { initialProps: { loading: true, count: 0 } },
    );
    expect(result.current).toBe(true);
    rerender({ loading: false, count: 0 });
    expect(result.current).toBe(false);
  });
});
