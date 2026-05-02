// @vitest-environment jsdom
/**
 * Tests d'intégration — ReproductionHub
 * ════════════════════════════════════════════════════════════════════════════
 *  1. Render baseline : titre + sous-titre + KPI labels
 *  2. Click "+ Saillir" sur une truie VIDE → ouvre QuickSaillieForm pré-rempli
 *  3. Click "+ Écho" sur une saillie ≥21j → ouvre QuickEchographieForm
 *  4. Empty state : aucune truie / saillie / bande → 5 messages "rien à signaler"
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Truie, Verrat, BandePorcelets, Saillie } from '../../types/farm';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeTruie(o: Partial<Truie> & { id: string }): Truie {
  return {
    id: o.id,
    displayId: o.id,
    boucle: `FR-${o.id}`,
    statut: o.statut ?? 'Vide',
    ration: 3,
    synced: true,
    ...o,
  };
}

const POPULATED_TRUIES: Truie[] = [
  makeTruie({ id: 'T01', statut: 'Vide' }),
  makeTruie({ id: 'T02', statut: 'Pleine', boucle: 'FR-T02' }),
];

const POPULATED_BANDES: BandePorcelets[] = [];

const POPULATED_SAILLIES: Saillie[] = [
  // Saillie il y a 30 jours sur T02 (Pleine → exclu de l'écho).
  // On ajoute une saillie ≥21j sur une truie VIDE pour tester l'écho.
  {
    truieId: 'T01',
    truieBoucle: 'FR-T01',
    dateSaillie: new Date(Date.now() - 25 * 86400000).toLocaleDateString('fr-FR'),
    verratId: 'V01',
    statut: 'Active',
  },
];

const POPULATED_VERRATS: Verrat[] = [
  {
    id: 'V01',
    displayId: 'V01',
    boucle: 'FR-V01',
    statut: 'Actif',
    ration: 3,
    synced: true,
  },
];

let mockCtx: {
  truies: Truie[];
  bandes: BandePorcelets[];
  saillies: Saillie[];
  verrats: Verrat[];
};

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: mockCtx.truies,
    verrats: mockCtx.verrats,
    bandes: mockCtx.bandes,
    saillies: mockCtx.saillies,
    transitions: [],
    finances: [],
    notes: [],
    alerts: [],
    alertesServeur: [],
    sante: [],
    stockAliment: [],
    stockVeto: [],
    alimentFormules: [],
    truiesHeader: [],
    verratsHeader: [],
    bandesHeader: [],
    santeHeader: [],
    stockAlimentHeader: [],
    stockVetoHeader: [],
    loading: false,
    dataSource: null,
    syncStatus: 'synced',
    lastUpdate: 0,
    criticalAlertCount: 0,
    refreshData: vi.fn(),
    pullData: vi.fn(),
    processQueue: vi.fn(),
    recomputeAlerts: vi.fn(),
    getTruieById: vi.fn(),
    getVerratById: vi.fn(),
    getBandeById: vi.fn(),
    getAnimalById: vi.fn(),
    getHealthForAnimal: vi.fn(() => []),
    getHealthForSubject: vi.fn(() => []),
    getNotesForAnimal: vi.fn(() => []),
    getNotesForSubject: vi.fn(() => []),
  }),
  useMeta: () => ({
    loading: false,
    dataSource: 'NETWORK',
    refreshData: vi.fn(),
  }),
  FarmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresher: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresherContent: () => <div />,
  IonModal: ({ isOpen, children }: { isOpen?: boolean; children: React.ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
  IonToast: () => null,
}));

vi.mock('../../components/forms/QuickSaillieForm', () => ({
  default: ({ isOpen, defaultTruieDisplayId }: { isOpen: boolean; defaultTruieDisplayId?: string }) =>
    isOpen ? (
      <div data-testid="quick-saillie-form" data-default-truie={defaultTruieDisplayId ?? ''} />
    ) : null,
}));

vi.mock('../../components/forms/QuickEchographieForm', () => ({
  default: ({ isOpen, defaultTruieDisplayId }: { isOpen: boolean; defaultTruieDisplayId?: string }) =>
    isOpen ? (
      <div data-testid="quick-echo-form" data-default-truie={defaultTruieDisplayId ?? ''} />
    ) : null,
}));

vi.mock('../../components/forms/QuickMiseBasForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="quick-mise-bas-form" /> : null,
}));

vi.mock('../../components/forms/QuickSevrageForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="quick-sevrage-form" /> : null,
}));

import ReproductionHub from './ReproductionHub';

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/reproduction']}>
      <ReproductionHub />
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe('ReproductionHub', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCtx = {
      truies: POPULATED_TRUIES,
      verrats: POPULATED_VERRATS,
      bandes: POPULATED_BANDES,
      saillies: POPULATED_SAILLIES,
    };
  });

  it('[1] render baseline : titre, sous-titre et KPIs', () => {
    renderHub();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Reproduction/i);
    expect(screen.getByText(/Le cycle truie de ta ferme/i)).toBeTruthy();
    // 4 KPIs (ISSE / IEM / Taux MB / Renouv.)
    expect(screen.getByText(/^ISSE$/i)).toBeTruthy();
    expect(screen.getByText(/^IEM$/i)).toBeTruthy();
    expect(screen.getByText(/Taux MB/i)).toBeTruthy();
    expect(screen.getByText(/Renouv\./i)).toBeTruthy();
  });

  it('[2] click "+ Saillir" → ouvre QuickSaillieForm avec défaut T01', () => {
    renderHub();
    const btn = screen.getAllByRole('button', { name: /\+ Saillir/i })[0];
    fireEvent.click(btn);
    const form = screen.getByTestId('quick-saillie-form');
    expect(form.getAttribute('data-default-truie')).toBe('T01');
  });

  it('[3] click "+ Écho" → ouvre QuickEchographieForm pré-rempli', () => {
    renderHub();
    const btn = screen.getAllByRole('button', { name: /\+ Écho/i })[0];
    fireEvent.click(btn);
    const form = screen.getByTestId('quick-echo-form');
    expect(form).toBeTruthy();
    // La saillie était sur T01 → pré-remplissage attendu.
    expect(form.getAttribute('data-default-truie')).toBe('T01');
  });

  it('[4] empty state : 5 messages "rien à signaler" si tout vide', () => {
    mockCtx = { truies: [], verrats: [], bandes: [], saillies: [] };
    renderHub();
    // Chaque étape vide affiche un placeholder (texte "Aucun*").
    const placeholders = screen.getAllByText(/Aucun/i);
    expect(placeholders.length).toBeGreaterThanOrEqual(5);
  });

  it('[5] bouton "Lots de saillies" → navigate vers /reproduction/lots', () => {
    renderHub();
    const btn = screen.getByRole('button', { name: /Voir les lots de saillies/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/reproduction/lots');
  });
});
