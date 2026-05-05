// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// V71.1 — mock FarmContext (KPIs Repro lus depuis useFarm)
vi.mock('../../../context/FarmContext', () => ({
  useFarm: () => ({ truies: [], verrats: [], bandes: [], saillies: [], refreshData: vi.fn() }),
}));

import { ReproV70 } from '../ReproV70';

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    });
  }
});

afterEach(() => cleanup());

describe('ReproV70 — Phase 3 Hub Repro', () => {
  it('rend titre Reproduction', () => {
    render(<MemoryRouter><ReproV70 /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: /reproduction/i })).toBeTruthy();
  });

  it('rend 4 sub-tabs (Agenda/En cours/À venir/Historique)', () => {
    render(<MemoryRouter><ReproV70 /></MemoryRouter>);
    ['Agenda', 'En cours', 'À venir', 'Historique'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('rend KPIs Repro (4 stats)', () => {
    render(<MemoryRouter><ReproV70 /></MemoryRouter>);
    expect(screen.getByText('Pleines')).toBeTruthy();
    expect(screen.getByText('Materni.')).toBeTruthy();
  });

  it('rend EduCard avec 115 jours', () => {
    render(<MemoryRouter><ReproV70 /></MemoryRouter>);
    expect(screen.getByText(/115 jours/i)).toBeTruthy();
  });

  it('rend CycleTimeline avec 4 étapes', () => {
    render(<MemoryRouter><ReproV70 /></MemoryRouter>);
    expect(screen.getByText('Saillie')).toBeTruthy();
    expect(screen.getByText('Écho')).toBeTruthy();
    expect(screen.getByText('Gestation')).toBeTruthy();
    expect(screen.getByText('Mise-bas')).toBeTruthy();
  });
});
