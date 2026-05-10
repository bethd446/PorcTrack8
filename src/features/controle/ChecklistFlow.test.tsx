// @vitest-environment jsdom
/**
 * ChecklistFlow.test — V21-6 C4
 *
 * Couvre :
 *   1. Sélecteur de template visible quand `name` ne correspond à aucune route
 *      legacy (DAILY/VENDREDI).
 *   2. Tap sur une tuile → questions correspondantes injectées et affichées.
 *   3. Mode "Tout combiné" → toutes les questions concaténées.
 *   4. Validation OUI/NON sauvegarde via insertNote et avance au step suivant.
 *   5. Route legacy DAILY → bypass selector, affiche directement les questions
 *      CONTROLE_QUESTIONS.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ── Mocks (avant import du composant) ───────────────────────────────────────
vi.mock('../../services/kvStore', () => ({
  kvGet: () => 'TestPorcher',
  kvSet: vi.fn(),
}));

vi.mock('../../services/checklistService', () => ({
  getChecklistItems: vi.fn(() => []),
  loadChecklistDefinitions: vi.fn(async () => ({ questions: [], checklists: [], success: true })),
}));

vi.mock('../../services/supabaseService', () => ({
  getBandes: vi.fn(async () => ({ success: true, data: [] })),
  getStockAliments: vi.fn(async () => ({ success: true, data: [] })),
  getTruies: vi.fn(async () => ({ success: true, data: [] })),
}));

const insertNoteMock = vi.fn(async (_args: unknown) => ({ id: 'n1' }));
vi.mock('../../services/supabaseWrites', () => ({
  insertNote: (args: unknown) => insertNoteMock(args),
  insertHealthLog: vi.fn(async () => ({ id: 'h1' })),
  updateSowByCode: vi.fn(async () => ({ success: true })),
  updateBatchByCode: vi.fn(async () => ({ success: true })),
  updateProduitAliment: vi.fn(async () => ({ success: true })),
  resolveProduitAlimentByCode: vi.fn(async () => null),
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonToast: () => null,
  IonSpinner: () => <span data-testid="ion-spinner" />,
  IonSelect: ({ children }: { children: React.ReactNode }) => <select>{children}</select>,
  IonSelectOption: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  IonDatetime: () => <input type="date" />,
}));

vi.mock('../../v70/components/ds/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  ),
}));
vi.mock('../../components/agritech', () => ({
  Chip: ({ label }: { label: string }) => <span>{label}</span>,
}));

import ChecklistFlow from './ChecklistFlow';

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/checklist/:name" element={<ChecklistFlow />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  insertNoteMock.mockClear();
});

beforeEach(() => {
  insertNoteMock.mockClear();
});

describe('ChecklistFlow — sélecteur de template (V21-6 C4)', () => {
  it('affiche les 4 tuiles + le bouton "Tout combiné" quand pas de checklist legacy', async () => {
    renderAt('/checklist/AUDIT');

    await waitFor(() => {
      expect(screen.getByText(/Quelle tournée fais-tu/i)).toBeTruthy();
    });

    expect(screen.getByTestId('tpl-GENERAL')).toBeTruthy();
    expect(screen.getByTestId('tpl-MISE_BAS')).toBeTruthy();
    expect(screen.getByTestId('tpl-SEVRAGE')).toBeTruthy();
    expect(screen.getByTestId('tpl-SORTIE_VENTE')).toBeTruthy();
    expect(screen.getByTestId('tpl-COMBINED')).toBeTruthy();
  });

  it('cliquer sur "Tournée mise-bas" affiche la première question MISE_BAS', async () => {
    renderAt('/checklist/AUDIT');
    await waitFor(() => screen.getByTestId('tpl-MISE_BAS'));

    fireEvent.click(screen.getByTestId('tpl-MISE_BAS'));

    await waitFor(() => {
      expect(screen.getByText(/Truies en attente J\+115/i)).toBeTruthy();
    });
  });

  it('cliquer sur "Tout combiné" charge toutes les questions des 4 templates', async () => {
    renderAt('/checklist/AUDIT');
    await waitFor(() => screen.getByTestId('tpl-COMBINED'));

    fireEvent.click(screen.getByTestId('tpl-COMBINED'));

    // Première question = GENERAL/eau
    await waitFor(() => {
      expect(screen.getByText(/Eau disponible/i)).toBeTruthy();
    });
    // Étape 1/13 (3 GENERAL + 5 MISE_BAS + 5 SEVRAGE + 5 SORTIE_VENTE = 18)
    expect(screen.getByText(/Étape 1 \/ 18/i)).toBeTruthy();
  });

  it('valider une question OUI déclenche insertNote', async () => {
    renderAt('/checklist/AUDIT');
    await waitFor(() => screen.getByTestId('tpl-GENERAL'));
    fireEvent.click(screen.getByTestId('tpl-GENERAL'));

    await waitFor(() => screen.getByText(/Eau disponible/i));
    // Sélectionner OUI
    fireEvent.click(screen.getByRole('radio', { name: 'OUI' }));
    // Cliquer Suivant
    fireEvent.click(screen.getByText(/Suivant/i).closest('button')!);

    await waitFor(() => {
      expect(insertNoteMock).toHaveBeenCalled();
    });
    // Vérifie que la 2e question apparaît
    await waitFor(() => {
      expect(screen.getByText(/Aliments disponibles/i)).toBeTruthy();
    });
  });

  it('route DAILY (legacy) bypasse le sélecteur et affiche les questions classiques', async () => {
    renderAt('/checklist/DAILY');

    // Le sélecteur ne doit PAS apparaître
    await waitFor(() => {
      expect(screen.queryByText(/Quelle tournée fais-tu/i)).toBeNull();
    });

    // Une question CONTROLE doit être visible (Q1 = "Truies pleines proches…")
    expect(
      screen.getByText(/Truies pleines proches du terme/i),
    ).toBeTruthy();
  });
});
