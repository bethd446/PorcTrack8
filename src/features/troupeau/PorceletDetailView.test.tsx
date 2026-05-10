// @vitest-environment jsdom
/**
 * Tests unitaires — PorceletDetailView (V4 Agent D — P1-5)
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie la fiche détail d'un porcelet (`/troupeau/porcelets/:id`) :
 *   1. Rend sans crash + h1/eyebrow/sub présents
 *   2. Empty state pesées : « Aucune pesée enregistrée »
 *   3. Porcelet introuvable → EntityNotFoundCard
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { BandePorcelets, PorceletIndividuel } from '../../types/farm';

// ── Fixtures ────────────────────────────────────────────────────────────────

const fakePorcelet: PorceletIndividuel = {
  id: 'p-001',
  batchId: 'b-001',
  boucle: 'CR-12',
  sexe: 'F',
  poidsCourantKg: 2.8,
  statut: 'VIVANT',
};

const fakeBande: BandePorcelets = {
  id: 'b-001',
  idPortee: '26-T16-01',
  truie: 'T-016 · Bahié',
  boucleMere: 'BCL-016',
  dateMB: '2026-05-03',
  nv: 11,
  vivants: 10,
  morts: 1,
  statut: 'EN_COURS',
  poidsInitialKg: 1.4,
  porcelets: [fakePorcelet],
  synced: true,
};

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    keys: vi.fn(async () => ({ keys: [] })),
    clear: vi.fn(async () => undefined),
  },
}));

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [],
    verrats: [],
    bandes: [fakeBande],
    alerts: [],
    criticalAlertCount: 0,
    loading: false,
    notes: [],
    alertesServeur: [],
    saillies: [],
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

// supabase client : .from('pesees').select().eq().order() → liste vide
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: [], error: null }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  },
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonSpinner: () => <span data-testid="ion-spinner" />,
  IonToast: () => null,
}));

import PorceletDetailView from './PorceletDetailView';

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/troupeau/porcelets/:id" element={<PorceletDetailView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PorceletDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('rend sans crash : eyebrow + h1 + sub présents', async () => {
    renderAt('/troupeau/porcelets/p-001');
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toContain('CR-12');
    });
    expect(document.body.textContent).toMatch(/Élevage · Porcelet/);
    // Sub line : "Bande 26-T16-01 · Femelle · ..."
    expect(document.body.textContent).toMatch(/Bande/);
    expect(document.body.textContent).toMatch(/Femelle/);
  });

  it('rend l’empty state pesées si aucune pesée enregistrée', async () => {
    renderAt('/troupeau/porcelets/p-001');
    await waitFor(() => {
      expect(
        screen.getByText(/Aucune pesée enregistrée/i),
      ).toBeDefined();
    });
  });

  it('porcelet introuvable : affiche EntityNotFoundCard', async () => {
    renderAt('/troupeau/porcelets/p-999');
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toMatch(/Porcelet introuvable/i);
    });
    expect(document.body.textContent).toMatch(
      /ce porcelet n’existe pas/i,
    );
  });
});
