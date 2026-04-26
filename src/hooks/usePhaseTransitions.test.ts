// @vitest-environment jsdom
// src/hooks/usePhaseTransitions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BandePorcelets } from '../types/farm';

// Mock FarmContext
vi.mock('../context/FarmContext', () => ({
  useFarm: () => ({
    bandes: mockBandes,
    truies: [],
  }),
}));

// Mock phaseEngine
vi.mock('../services/phaseEngine', () => ({
  detectPendingTransitions: vi.fn(() => []),
  enqueueTransition: vi.fn(() => Promise.resolve()),
}));

import { usePhaseTransitions } from './usePhaseTransitions';
import { detectPendingTransitions } from '../services/phaseEngine';

const mockBandes: BandePorcelets[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('usePhaseTransitions', () => {
  it('retourne current=null quand aucune transition', () => {
    const { result } = renderHook(() => usePhaseTransitions());
    expect(result.current.current).toBeNull();
  });

  it('retourne la première transition comme current', () => {
    const mockTransition = {
      bandeId: 'B01', label: 'P01',
      fromPhase: 'POST_SEVRAGE' as const,
      toPhase: 'CROISSANCE' as const,
      ageJours: 40, poidsEstimeKg: 18,
      bande: { id: 'B01', idPortee: 'P01', statut: 'Sevrés', vivants: 10, synced: true },
    };
    (detectPendingTransitions as ReturnType<typeof vi.fn>).mockReturnValue([mockTransition]);
    const { result } = renderHook(() => usePhaseTransitions());
    expect(result.current.current?.bandeId).toBe('B01');
  });

  it('dismiss retire la transition de la liste courante', () => {
    const mockTransition = {
      bandeId: 'B01', label: 'P01',
      fromPhase: 'POST_SEVRAGE' as const,
      toPhase: 'CROISSANCE' as const,
      ageJours: 40, poidsEstimeKg: 18,
      bande: { id: 'B01', idPortee: 'P01', statut: 'Sevrés', vivants: 10, synced: true },
    };
    (detectPendingTransitions as ReturnType<typeof vi.fn>).mockReturnValue([mockTransition]);
    const { result } = renderHook(() => usePhaseTransitions());

    act(() => { result.current.dismiss('B01'); });
    expect(result.current.current).toBeNull();
  });
});
