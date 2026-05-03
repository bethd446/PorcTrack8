// @vitest-environment jsdom
/**
 * Tests unitaires — ClassementView
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie la page Classement reproducteurs :
 *   1. Rendu de 5 rows avec rangs #1..#5
 *   2. Filter='TRUIE' → seules les truies + compteur ajusté
 *   3. Click sur une row → navigate(row.href)
 *   4. Empty state si rows=[] → message + bouton "Réinitialiser filtres"
 *   5. Tier badge ELITE → classes css success appliquées
 *
 * Mocks :
 *   - `useFarm` → données minimales (les rows réels viennent de buildClassementRows mocké)
 *   - `buildClassementRows` (service) → renvoie un fixture configurable par test
 *   - `useNavigate` (react-router-dom) → spy
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { ClassementRow, ClassementSortBy } from '../../services/reproducteursClassement';

// ── Fixtures ────────────────────────────────────────────────────────────────
const TRUIE_ELITE: ClassementRow = {
  type: 'TRUIE',
  id: 'T01',
  displayId: 'Truie 042',
  score: 92,
  tier: 'ELITE',
  nbPortees: 3,
  porceletsMoyens: 12.4,
  tauxReussite: 88,
  href: '/troupeau/truies/T01',
};

const TRUIE_BON: ClassementRow = {
  type: 'TRUIE',
  id: 'T02',
  displayId: 'Truie 015',
  score: 78,
  tier: 'BON',
  nbPortees: 4,
  porceletsMoyens: 11.2,
  tauxReussite: 82,
  href: '/troupeau/truies/T02',
};

const VERRAT_MOYEN: ClassementRow = {
  type: 'VERRAT',
  id: 'V01',
  displayId: 'Bobi',
  score: 60,
  tier: 'MOYEN',
  nbPortees: 8,
  porceletsMoyens: 10.8,
  tauxReussite: 75,
  href: '/troupeau/verrats/V01',
};

const TRUIE_FAIBLE: ClassementRow = {
  type: 'TRUIE',
  id: 'T03',
  displayId: 'Truie 099',
  score: 45,
  tier: 'FAIBLE',
  nbPortees: 2,
  porceletsMoyens: 8.5,
  tauxReussite: 60,
  href: '/troupeau/truies/T03',
};

const VERRAT_INSUF: ClassementRow = {
  type: 'VERRAT',
  id: 'V02',
  displayId: 'Aligator',
  score: 28,
  tier: 'INSUFFISANT',
  nbPortees: 3,
  porceletsMoyens: 7.2,
  tauxReussite: 45,
  href: '/troupeau/verrats/V02',
};

const ALL_ROWS: ClassementRow[] = [
  TRUIE_ELITE,
  TRUIE_BON,
  VERRAT_MOYEN,
  TRUIE_FAIBLE,
  VERRAT_INSUF,
];

// ── State mockable par test ─────────────────────────────────────────────────
let mockRows: ClassementRow[] = [];
const navigateSpy = vi.fn();

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [],
    verrats: [],
    bandes: [],
    saillies: [],
    alerts: [],
    criticalAlertCount: 0,
    loading: false,
    notes: [],
    alertesServeur: [],
    finances: [],
    alimentFormules: [],
    dataSource: null,
    refreshData: vi.fn(),
    getTruieById: vi.fn(),
    getVerratById: vi.fn(),
    getBandeById: vi.fn(),
    getAnimalById: vi.fn(),
    getHealthForAnimal: vi.fn(() => []),
    getHealthForSubject: vi.fn(() => []),
    getNotesForAnimal: vi.fn(() => []),
    getNotesForSubject: vi.fn(() => []),
    pullData: vi.fn(),
    processQueue: vi.fn(),
  }),
  FarmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Le service buildClassementRows applique le filtre/tri côté pure logic.
// On le mocke pour piloter exactement les rows rendues par la vue.
vi.mock('../../services/reproducteursClassement', () => ({
  buildClassementRows: vi.fn(
    ({ filter }: { filter: 'TOUS' | 'TRUIE' | 'VERRAT'; sortBy: ClassementSortBy }) => {
      if (filter === 'TOUS') return mockRows;
      return mockRows.filter((r) => r.type === filter);
    },
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

import ClassementView from './ClassementView';

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/troupeau/classement']}>
      <ClassementView />
    </MemoryRouter>,
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────
describe('ClassementView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateSpy.mockReset();
    mockRows = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('rend 5 rows avec rangs #1 à #5 (mobile)', () => {
    mockRows = ALL_ROWS;

    renderView();

    // Mobile list = la ul avec aria-label "Classement reproducteurs (mobile)"
    const list = screen.getByRole('list', { name: /classement reproducteurs \(mobile\)/i });
    const items = within(list).getAllByRole('listitem');
    expect(items.length).toBe(5);

    // Vérifie les rangs (#1..#5) et les noms
    expect(within(list).getByText('#1')).toBeDefined();
    expect(within(list).getByText('#2')).toBeDefined();
    expect(within(list).getByText('#3')).toBeDefined();
    expect(within(list).getByText('#4')).toBeDefined();
    expect(within(list).getByText('#5')).toBeDefined();

    // Compteur "5 reproducteurs" rendu par SectionDivider
    expect(document.body.textContent).toMatch(/5 reproducteurs/i);
  });

  it("filter='TRUIE' n'affiche que les truies + ajuste le compteur", () => {
    mockRows = ALL_ROWS;

    renderView();

    // Click sur le filtre Truies
    const truiesBtn = screen.getByRole('radio', { name: /filtrer par truies/i });
    fireEvent.click(truiesBtn);

    const list = screen.getByRole('list', { name: /classement reproducteurs \(mobile\)/i });
    const items = within(list).getAllByRole('listitem');
    // 3 truies dans le fixture
    expect(items.length).toBe(3);

    // Truies visibles
    expect(within(list).getByText('Truie 042')).toBeDefined();
    expect(within(list).getByText('Truie 015')).toBeDefined();
    expect(within(list).getByText('Truie 099')).toBeDefined();
    // Verrats absents
    expect(within(list).queryByText('Bobi')).toBeNull();
    expect(within(list).queryByText('Aligator')).toBeNull();

    // Compteur global "3 reproducteurs"
    expect(document.body.textContent).toMatch(/3 reproducteurs/i);
  });

  it('click sur une row → navigate(row.href)', () => {
    mockRows = ALL_ROWS;

    renderView();

    const list = screen.getByRole('list', { name: /classement reproducteurs \(mobile\)/i });
    const items = within(list).getAllByRole('listitem');

    // 1ère card = TRUIE_ELITE → href /troupeau/truies/T01
    const firstBtn = within(items[0]).getByRole('button');
    fireEvent.click(firstBtn);
    expect(navigateSpy).toHaveBeenCalledWith('/troupeau/truies/T01');

    // 3ème card = VERRAT_MOYEN → href /troupeau/verrats/V01
    const thirdBtn = within(items[2]).getByRole('button');
    fireEvent.click(thirdBtn);
    expect(navigateSpy).toHaveBeenCalledWith('/troupeau/verrats/V01');

    expect(navigateSpy).toHaveBeenCalledTimes(2);
  });

  it('empty state si rows=[] → message + bouton "Réinitialiser filtres"', () => {
    mockRows = [];

    renderView();

    // Message empty
    expect(document.body.textContent).toMatch(/aucun reproducteur correspondant au filtre/i);

    // Bouton de reset
    const resetBtn = screen.getByRole('button', { name: /réinitialiser filtres/i });
    expect(resetBtn).toBeDefined();

    // Click déclenche le reset (filtre + tri reviennent à defaut → ne crash pas)
    fireEvent.click(resetBtn);
    // Toujours empty state après reset (mockRows = [])
    expect(document.body.textContent).toMatch(/aucun reproducteur correspondant au filtre/i);
  });

  it('tier badge ELITE → utilise Tag variant primary du DS V2', () => {
    mockRows = [TRUIE_ELITE];

    renderView();

    // L'aria-label du tier-badge contient "Tier Élite"
    const badges = screen.getAllByLabelText(/tier élite/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);

    const badge = badges[0];
    // V40 T3: TierBadge utilise <Tag variant="primary"> du DS V2.0
    // Le span enfant porte les classes pt-tag pt-tag--primary
    const tagInner = badge.querySelector('.pt-tag');
    expect(tagInner).not.toBeNull();
    expect(tagInner!.className).toContain('pt-tag--primary');
    // Score "92" est rendu dans le badge
    expect(badge.textContent).toMatch(/92/);
  });
});
