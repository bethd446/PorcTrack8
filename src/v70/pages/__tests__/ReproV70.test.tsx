// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Truie, Saillie, BandePorcelets } from '../../../types/farm';

// Mock contextes lourds non pertinents pour les unités testées.
vi.mock('../../../features/chatbot/MariusGreeting', () => ({
  MariusGreeting: () => null,
}));

// V71.1 — mock FarmContext (KPIs Repro lus depuis useFarm)
// Le mock est re-déclaré par test via vi.doMock pour fournir des datasets variés.
const mockUseFarm = vi.hoisted(() =>
  vi.fn(() => ({
    truies: [] as Truie[],
    verrats: [],
    bandes: [] as BandePorcelets[],
    saillies: [] as Saillie[],
    refreshData: vi.fn(),
  })),
);
vi.mock('../../../context/FarmContext', () => ({
  useFarm: () => mockUseFarm(),
}));

import { ReproV70, buildDedupKey } from '../ReproV70';

const makeTruie = (overrides: Partial<Truie> = {}): Truie => ({
  id: 'TRUIE-1',
  displayId: 'T-001',
  boucle: 'FR-001',
  statut: 'Pleine',
  ration: 2.4,
  synced: true,
  ...overrides,
});

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    });
  }
});

afterEach(() => {
  cleanup();
  mockUseFarm.mockReturnValue({
    truies: [],
    verrats: [],
    bandes: [],
    saillies: [],
    refreshData: vi.fn(),
  });
});

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
    expect(screen.getByText('Maternité')).toBeTruthy();
  });

  it('rend EduCard avec 115 jours', () => {
    render(<MemoryRouter><ReproV70 /></MemoryRouter>);
    expect(screen.getByText(/115 jours/i)).toBeTruthy();
  });

  it('rend empty-state cycle quand aucune bande (V71.3 — CycleTimeline data-driven)', () => {
    render(<MemoryRouter><ReproV70 /></MemoryRouter>);
    expect(screen.getByText(/aucune bande en cycle/i)).toBeTruthy();
  });
});

describe('ReproV70 — V78 buildDedupKey (B2 hotfix)', () => {
  it('produit des clés distinctes pour deux truies à boucle identique mais id différents', () => {
    const a: Truie = makeTruie({ id: 'A', displayId: '', boucle: 'X' });
    const b: Truie = makeTruie({ id: 'B', displayId: '', boucle: 'X' });
    expect(buildDedupKey(a, 0)).not.toBe(buildDedupKey(b, 1));
  });

  it('produit des clés distinctes même quand tous les champs sont vides (fallback idx)', () => {
    const a: Truie = makeTruie({ id: '', displayId: '', boucle: '' });
    const b: Truie = makeTruie({ id: '', displayId: '', boucle: '' });
    expect(buildDedupKey(a, 0)).not.toBe(buildDedupKey(b, 1));
  });

  it('empêche la collision cross-champ entre id="X" et boucle="X" (bug pré-V78)', () => {
    const a: Truie = makeTruie({ id: 'X', displayId: '', boucle: '' });
    const b: Truie = makeTruie({ id: '', displayId: '', boucle: 'X' });
    expect(buildDedupKey(a, 0)).not.toBe(buildDedupKey(b, 1));
  });

  it('reste stable pour la même truie au même index', () => {
    const t: Truie = makeTruie({ id: 'T-1', displayId: 'D', boucle: 'B' });
    expect(buildDedupKey(t, 7)).toBe(buildDedupKey(t, 7));
  });
});

describe('ReproV70 — V78 En cours liste tous les cycles (B2)', () => {
  it('liste 45 cycles "En cours" sans collision quand on a 30 pleines + 11 maternité + 4 saillies récentes', () => {
    // Dataset reproduisant le bug terrain : truies avec champs vides/dupliqués.
    const truies: Truie[] = [];
    for (let i = 0; i < 30; i++) {
      truies.push(
        makeTruie({
          id: i < 5 ? '' : `tg-${i}`, // 5 premières truies sans id (collision pré-V78)
          displayId: i < 3 ? '' : `T-${100 + i}`,
          boucle: i < 2 ? 'DUP-BOUCLE' : `FR-${200 + i}`,
          statut: 'Pleine',
        }),
      );
    }
    for (let i = 0; i < 11; i++) {
      truies.push(
        makeTruie({
          id: `tm-${i}`,
          displayId: `T-M${i}`,
          boucle: `FR-M${i}`,
          statut: 'En maternité',
        }),
      );
    }
    // 4 saillies récentes sur des truies vides "En attente saillie"
    for (let i = 0; i < 4; i++) {
      truies.push(
        makeTruie({
          id: `ts-${i}`,
          displayId: `T-S${i}`,
          boucle: `FR-S${i}`,
          statut: 'En attente saillie',
        }),
      );
    }
    const today = new Date();
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const recent = (daysAgo: number) => {
      const d = new Date(today.getTime() - daysAgo * 86400000);
      return fmt(d);
    };

    const saillies: Saillie[] = [];
    for (let i = 0; i < 4; i++) {
      saillies.push({
        id: `s-${i}`,
        truieId: `ts-${i}`,
        dateSaillie: recent(5 + i), // 5..8 jours -> attente écho
        verratId: 'V-001',
        statut: 'EN_ATTENTE',
      });
    }

    mockUseFarm.mockReturnValue({
      truies,
      verrats: [],
      bandes: [],
      saillies,
      refreshData: vi.fn(),
    });

    render(<MemoryRouter initialEntries={['/?tab=en-cours']}><ReproV70 /></MemoryRouter>);

    // 30 + 11 + 4 = 45
    expect(screen.getByText('Toutes (45)')).toBeTruthy();
  });

  it('rend des chip filters avec compteurs distincts par phase', () => {
    const truies: Truie[] = [
      makeTruie({ id: 't1', displayId: 'T-001', boucle: 'B1', statut: 'Pleine' }),
      makeTruie({ id: 't2', displayId: 'T-002', boucle: 'B2', statut: 'Pleine' }),
      makeTruie({ id: 't3', displayId: 'T-003', boucle: 'B3', statut: 'En maternité' }),
    ];
    mockUseFarm.mockReturnValue({
      truies,
      verrats: [],
      bandes: [],
      saillies: [],
      refreshData: vi.fn(),
    });

    render(<MemoryRouter initialEntries={['/?tab=en-cours']}><ReproV70 /></MemoryRouter>);

    expect(screen.getByText('Toutes (3)')).toBeTruthy();
    expect(screen.getByText('Gestation (2)')).toBeTruthy();
    expect(screen.getByText('Maternité (1)')).toBeTruthy();
    expect(screen.getByText('Saillie (0)')).toBeTruthy();
  });
});

describe('ReproV70 — V78 pattern cycle-card + cycle-mini', () => {
  it('rend une cycle-card par cycle avec mini rail (5 dots)', () => {
    const truies: Truie[] = [
      makeTruie({ id: 't1', displayId: 'T-001', boucle: 'FR-001', statut: 'Pleine' }),
    ];
    mockUseFarm.mockReturnValue({
      truies,
      verrats: [],
      bandes: [],
      saillies: [],
      refreshData: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/?tab=en-cours']}><ReproV70 /></MemoryRouter>,
    );
    expect(container.querySelector('.cycle-card')).toBeTruthy();
    expect(container.querySelector('.cycle-mini')).toBeTruthy();
    // 5 dots (Saillie · Écho · Fœtal · MB · Sevrage)
    const dots = container.querySelectorAll('.cycle-mini__dot');
    expect(dots.length).toBe(5);
  });

  it('filtre cycles par phase via les chips', () => {
    const truies: Truie[] = [
      makeTruie({ id: 't1', displayId: 'T-001', boucle: 'B1', statut: 'Pleine' }),
      makeTruie({ id: 't2', displayId: 'T-002', boucle: 'B2', statut: 'En maternité' }),
    ];
    mockUseFarm.mockReturnValue({
      truies,
      verrats: [],
      bandes: [],
      saillies: [],
      refreshData: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/?tab=en-cours']}><ReproV70 /></MemoryRouter>,
    );
    // Avant filtrage : 2 cards
    expect(container.querySelectorAll('.cycle-card').length).toBe(2);

    // Clic sur "Gestation (1)"
    const gestationBtn = screen.getByText('Gestation (1)');
    fireEvent.click(gestationBtn);
    expect(container.querySelectorAll('.cycle-card').length).toBe(1);
  });
});
