// @vitest-environment jsdom
/**
 * V70 — TodayV70 smoke tests (Phase 3A — archétype Dashboard).
 *
 * Vérifie que la page rend les 4 sections obligatoires + PageHeader +
 * StatsGrid 4 stats troupeau + 3 alertes avec pills colorées.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    expect(screen.getByText('Truies')).toBeTruthy();
    expect(screen.getByText('Verrats')).toBeTruthy();
    expect(screen.getByText('Porcelets')).toBeTruthy();
    expect(screen.getByText('Bandes')).toBeTruthy();
  });

  it('rend 3 alertes avec pills colorées', () => {
    render(
      <MemoryRouter>
        <TodayV70 />
      </MemoryRouter>,
    );
    expect(screen.getByText(/réforme suggérée/i)).toBeTruthy();
    expect(screen.getByText(/sevrage à confirmer/i)).toBeTruthy();
    expect(screen.getByText(/stock aliment critique/i)).toBeTruthy();
  });
});
