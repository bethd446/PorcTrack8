// @vitest-environment jsdom
/**
 * Tests d'intégration — FinancesView (V8 fix label trésorerie cumul)
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie que le KPI "Trésorerie cumul" expose bien sa portée temporelle
 * dans le label : "Trésorerie cumul (depuis début)".
 *
 * Contexte : le calcul `tresorerieCumul` cumule TOUTES les transactions
 * historiques peu importe la période sélectionnée (mois / précédent / année).
 * Le label doit refléter cette portée pour éviter la confusion avec le KPI
 * Marge nette (qui lui est filtré par période).
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { FinanceEntry } from '../../types/farm';

const mockFinances: FinanceEntry[] = [
  {
    date: '15/04/2026',
    type: 'REVENU',
    categorie: 'VENTE_PORCS',
    montant: 5000,
    libelle: 'Vente lot 1',
  },
  {
    date: '20/04/2026',
    type: 'DEPENSE',
    categorie: 'ALIMENT',
    montant: 1200,
    libelle: 'Aliment 1T',
  },
];

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    finances: mockFinances,
    currency: 'EUR',
    refreshData: vi.fn(),
  }),
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresher: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRefresherContent: () => <div />,
}));

vi.mock('../../components/AgritechLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/design/TopBarSync', () => ({
  default: () => <div data-testid="topbar-sync" />,
}));

// Forms (BottomSheet → évite portails JSDOM)
vi.mock('../../components/forms/QuickAddTransactionForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="add-form-open" /> : null,
}));

vi.mock('../../components/forms/QuickEditTransactionForm', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="edit-form-open" /> : null,
}));

import FinancesView from './FinancesView';

describe('FinancesView V8 — label trésorerie cumul', () => {
  beforeEach(() => {
    cleanup();
  });

  it('affiche le label "Trésorerie cumul (depuis début)" pour clarifier la portée', () => {
    render(
      <MemoryRouter initialEntries={['/pilotage/finances']}>
        <FinancesView />
      </MemoryRouter>,
    );
    // Le label expose explicitement que le calcul ne dépend pas de la période
    // sélectionnée (toggle mois/préc/année).
    expect(screen.getByText(/Trésorerie cumul \(depuis début\)/i)).toBeTruthy();
  });
});
