// @vitest-environment jsdom
/**
 * V70 — TodayV70 smoke tests (Phase 3A — archétype Dashboard).
 *
 * V71.1 — mocks FarmContext + AuthContext (TodayV70 lit truies/verrats/bandes
 * + profile.full_name depuis V71.1 fix stubs hardcodés).
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [],
    verrats: [],
    bandes: [],
    saillies: [],
    refreshData: vi.fn(),
  }),
  useMeta: () => ({ loading: false }),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u1', email: 'christophe@porctrack.test', full_name: 'Christophe Audit', role: 'OWNER' },
    role: 'OWNER',
  }),
}));

import { TodayV70 } from '../TodayV70';

describe('TodayV70 — Phase 3 archétype Dashboard', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined' && !window.localStorage) {
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      });
    }
  });

  afterEach(() => cleanup());

  it("rend PageHeader avec date + titre Aujourd'hui", () => {
    render(
      <MemoryRouter>
        <TodayV70 />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /aujourd'hui/i })).toBeTruthy();
  });

  it('rend les 4 sections obligatoires', () => {
    render(
      <MemoryRouter>
        <TodayV70 />
      </MemoryRouter>,
    );
    expect(screen.getByText(/à traiter/i)).toBeTruthy();
    expect(screen.getByText(/mon élevage/i)).toBeTruthy();
    expect(screen.getByText(/tournée du jour/i)).toBeTruthy();
  });

  it('rend StatsGrid avec 4 stats troupeau', () => {
    render(
      <MemoryRouter>
        <TodayV70 />
      </MemoryRouter>,
    );
    // V75-q (F-3) — labels suffixés "· auj." pour cadrer temporellement.
    expect(screen.getByText(/Truies · auj\./)).toBeTruthy();
    expect(screen.getByText(/Verrats · auj\./)).toBeTruthy();
    expect(screen.getByText(/Porcelets · auj\./)).toBeTruthy();
    expect(screen.getByText(/Bandes · auj\./)).toBeTruthy();
  });

  it('rend section alertes vide quand farm vide (alertes calculées depuis FarmContext)', () => {
    // V71.2 : alertes calculées depuis useFarm (plus de mocks statiques ALERTS_INITIAL).
    // Avec farm vide (truies=[], bandes=[]) → 0 alertes → empty state.
    render(
      <MemoryRouter>
        <TodayV70 />
      </MemoryRouter>,
    );
    expect(screen.getByText(/à traiter \(0\)/i)).toBeTruthy();
    expect(screen.getByText(/toutes les alertes sont traitées/i)).toBeTruthy();
  });
});
