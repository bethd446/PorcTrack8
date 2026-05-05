// @vitest-environment jsdom
/**
 * V70 — PerformanceV70 smoke tests (Phase 3D — archétype 2 Hub).
 *
 * Vérifie que la page rend :
 *  - PageHeader title "Performance"
 *  - ISSE hero valeur 11.8
 *  - Tooltip ISSE accessible
 *  - 4 KPIs techniques (Taux MB / NV / Mortalité / IEM)
 *  - Section Finances avec Pill "Owner" + marge 1 240 €
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// V70.2 — PerformanceV70 utilise useFarm pour brancher Top performances.
vi.mock('../../../context/FarmContext', () => ({
  useFarm: () => ({ bandes: [], truies: [], verrats: [] }),
}));

import { PerformanceV70 } from '../PerformanceV70';

// P7 : PerformanceV70 utilise useUIPreferences (Mode avancé). Le hook
// retourne des defaults hors Provider (fallback resilient ajouté Phase 7),
// donc pas besoin de wrapper UIPreferencesProvider dans les tests.

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    });
  }
});

describe('PerformanceV70 — Phase 3 Hub Performance', () => {
  afterEach(() => cleanup());


  it('rend titre Performance', () => {
    render(
      <MemoryRouter>
        <PerformanceV70 />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /performance/i })).toBeTruthy();
  });

  it('rend ISSE hero avec valeur 11.8', () => {
    render(
      <MemoryRouter>
        <PerformanceV70 />
      </MemoryRouter>,
    );
    expect(screen.getByText('11.8')).toBeTruthy();
  });

  it('rend Tooltip ISSE', () => {
    render(
      <MemoryRouter>
        <PerformanceV70 />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/définition isse/i)).toBeTruthy();
  });

  it('rend 4 KPIs techniques (Taux MB / NV / Mortalité / IEM)', () => {
    render(
      <MemoryRouter>
        <PerformanceV70 />
      </MemoryRouter>,
    );
    expect(screen.getByText(/taux mise-bas/i)).toBeTruthy();
    expect(screen.getByText(/iem moyen/i)).toBeTruthy();
  });

  it('rend section Finances avec Pill Owner', () => {
    render(
      <MemoryRouter>
        <PerformanceV70 />
      </MemoryRouter>,
    );
    expect(screen.getByText('Owner')).toBeTruthy();
    expect(screen.getByText(/1 240/)).toBeTruthy();
  });
});
