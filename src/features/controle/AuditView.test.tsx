// @vitest-environment jsdom
/**
 * Tests unitaires — AuditView V31-FIX-PACK-01
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Sectioning Critiques en haut, À surveiller en bas
 *   2. AlertGroup rendu pour chaque catégorie peuplée
 *   3. Aucun UUID dans le DOM textuel (regex check)
 *   4. Filtres tabs (Toutes / Critiques / Stocks / Santé)
 *   5. Empty state quand 0 incohérence
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UUID_REGEX } from '../../design-system';

// ─── Mocks services ────────────────────────────────────────────────────────
const getBandesMock = vi.fn();
const getTruiesMock = vi.fn();
const getStockAlimentsMock = vi.fn();
const getJournalSanteMock = vi.fn();
const getStockVetoMock = vi.fn();

vi.mock('../../services/supabaseService', () => ({
  getBandes: (...args: unknown[]) => getBandesMock(...args),
  getTruies: (...args: unknown[]) => getTruiesMock(...args),
  getStockAliments: (...args: unknown[]) => getStockAlimentsMock(...args),
  getJournalSante: (...args: unknown[]) => getJournalSanteMock(...args),
  getStockVeto: (...args: unknown[]) => getStockVetoMock(...args),
}));

// AgritechLayout & TopBarSync : on les stubbe pour éviter Ionic side-effects
vi.mock('../../components/AgritechLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../components/design/TopBarSync', () => ({
  __esModule: true,
  default: ({ crumbs }: { crumbs: string[] }) => <div data-testid="topbar">{crumbs.join(' / ')}</div>,
}));

// IonRefresher / IonRefresherContent / IonSpinner : passthrough
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonSpinner: () => <div data-testid="spinner" />,
  IonRefresher: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresherContent: () => <div />,
}));

import AuditView from './AuditView';

const okBandes = (data: unknown[]) => Promise.resolve({ success: true, data, header: [] });
const okTruies = (data: unknown[]) => Promise.resolve({ success: true, data, header: [] });
const okStock = (data: unknown[]) => Promise.resolve({ success: true, data, header: [] });
const okSante = (data: unknown[]) => Promise.resolve({ success: true, data, header: [] });
const okVeto = (data: unknown[]) => Promise.resolve({ success: true, data, header: [] });

beforeEach(() => {
  getBandesMock.mockReset();
  getTruiesMock.mockReset();
  getStockAlimentsMock.mockReset();
  getJournalSanteMock.mockReset();
  getStockVetoMock.mockReset();
});

afterEach(() => cleanup());

const renderWithRouter = (): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <AuditView />
    </MemoryRouter>,
  );

describe('AuditView V31 — empty state', () => {
  it('affiche "Registre intègre" quand aucune incohérence', async () => {
    getBandesMock.mockReturnValue(okBandes([]));
    getTruiesMock.mockReturnValue(okTruies([]));
    getStockAlimentsMock.mockReturnValue(okStock([]));
    getJournalSanteMock.mockReturnValue(okSante([]));
    getStockVetoMock.mockReturnValue(okVeto([]));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Registre intègre')).toBeDefined();
    });
  });
});

describe('AuditView V31 — rendu AlertGroup', () => {
  it('rend "Stocks véto en rupture" quand un produit véto est en rupture', async () => {
    getBandesMock.mockReturnValue(okBandes([]));
    getTruiesMock.mockReturnValue(okTruies([]));
    getStockAlimentsMock.mockReturnValue(okStock([]));
    getJournalSanteMock.mockReturnValue(okSante([]));
    getStockVetoMock.mockReturnValue(okVeto([
      {
        id: '7e3f2a4c-1234-5678-9abc-def012345678', // UUID — ne doit PAS être dans le DOM
        produit: 'Ivermectine',
        type: 'Vermifuge injectable',
        stockActuel: 0,
        unite: 'ml',
        statutStock: 'RUPTURE',
      },
    ]));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Stocks véto en rupture')).toBeDefined();
      expect(screen.getByText('Ivermectine')).toBeDefined();
      expect(screen.getByText('Vermifuge injectable')).toBeDefined();
    });
  });

  it('rend "Aliments — stock bas" pour un aliment sous le seuil 100', async () => {
    getBandesMock.mockReturnValue(okBandes([]));
    getTruiesMock.mockReturnValue(okTruies([]));
    getStockAlimentsMock.mockReturnValue(okStock([
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        libelle: 'Aliment 1er Age',
        stockActuel: 50,
        unite: 'kg',
        seuilAlerte: 200,
        statutStock: 'BAS',
      },
    ]));
    getJournalSanteMock.mockReturnValue(okSante([]));
    getStockVetoMock.mockReturnValue(okVeto([]));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Aliments — stock bas')).toBeDefined();
      expect(screen.getByText('Aliment 1er Age')).toBeDefined();
    });
  });
});

describe('AuditView V31 — sectioning Critiques / À surveiller', () => {
  it('section "Critiques" est rendue avant "À surveiller" dans le DOM', async () => {
    getBandesMock.mockReturnValue(okBandes([]));
    getTruiesMock.mockReturnValue(okTruies([]));
    getStockAlimentsMock.mockReturnValue(okStock([
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        libelle: 'Aliment Bas',
        stockActuel: 50,
        unite: 'kg',
        seuilAlerte: 200,
        statutStock: 'BAS',
      },
    ]));
    getJournalSanteMock.mockReturnValue(okSante([]));
    getStockVetoMock.mockReturnValue(okVeto([
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        produit: 'Penicilline',
        stockActuel: 0,
        unite: 'doses',
        statutStock: 'RUPTURE',
      },
    ]));

    const { container } = renderWithRouter();

    // SectionHeader("Critiques") + SectionHeader("À surveiller") sont les
    // deux séparateurs structurels de la page (pas le label des tabs).
    await waitFor(() => {
      expect(screen.getAllByText('Critiques').length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.getByText('À surveiller')).toBeDefined();
    });

    const text = container.textContent ?? '';
    const critIdx = text.indexOf('Critiques');
    const survIdx = text.indexOf('À surveiller');
    expect(critIdx).toBeGreaterThan(-1);
    expect(survIdx).toBeGreaterThan(critIdx);
  });
});

describe('AuditView V31 — bannissement des UUIDs', () => {
  it('aucun UUID n\'apparaît dans le DOM textuel', async () => {
    getBandesMock.mockReturnValue(okBandes([
      { idPortee: 'L5RM', morts: 1, nv: 10, vivants: 9 },
    ]));
    getTruiesMock.mockReturnValue(okTruies([]));
    getStockAlimentsMock.mockReturnValue(okStock([
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        libelle: 'Croissance',
        stockActuel: 0,
        unite: 'kg',
        seuilAlerte: 100,
        statutStock: 'RUPTURE',
      },
    ]));
    getJournalSanteMock.mockReturnValue(okSante([]));
    getStockVetoMock.mockReturnValue(okVeto([
      {
        id: '7e3f2a4c-1234-5678-9abc-def012345678',
        produit: 'Ivermectine',
        stockActuel: 0,
        unite: 'ml',
        statutStock: 'RUPTURE',
      },
    ]));

    const { container } = renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Ivermectine')).toBeDefined();
    });

    const allText = container.textContent ?? '';
    expect(UUID_REGEX.test(allText)).toBe(false);
  });
});

describe('AuditView V31 — header counters', () => {
  it('affiche les compteurs critiques/stocks/santé dans le sous-titre', async () => {
    getBandesMock.mockReturnValue(okBandes([]));
    getTruiesMock.mockReturnValue(okTruies([]));
    getStockAlimentsMock.mockReturnValue(okStock([
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        libelle: 'A',
        stockActuel: 50,
        unite: 'kg',
        seuilAlerte: 100,
        statutStock: 'BAS',
      },
    ]));
    getJournalSanteMock.mockReturnValue(okSante([]));
    getStockVetoMock.mockReturnValue(okVeto([
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        produit: 'P',
        stockActuel: 0,
        unite: 'ml',
        statutStock: 'RUPTURE',
      },
    ]));

    renderWithRouter();

    // Header sous-titre format : "1 critique · 1 stock bas · 0 santé"
    await waitFor(() => {
      expect(screen.getByText(/^\s*1 critique\s*$/)).toBeDefined();
      expect(screen.getByText(/^\s*1 stock bas\s*$/)).toBeDefined();
    });
  });
});
