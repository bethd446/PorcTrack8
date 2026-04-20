// @vitest-environment jsdom
/**
 * Tests unitaires — VerratDetailView
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie la fiche détail d'un verrat (`/troupeau/verrats/:id`) :
 *   1. Verrat introuvable → message d'erreur « VERRAT INTROUVABLE »
 *   2. Render Bobi (V01) avec boucle + origine
 *   3. Chip « Actif » visible
 *   4. Bouton « Saillir » présent (aria-label)
 *   5. Historique soins empty state si aucun soin
 *
 * Mocks :
 *   - `useFarm` → renvoie 1 verrat fixture + getHealthForAnimal vide
 *   - `useParams` (react-router-dom) → id via MemoryRouter
 *   - `@ionic/react` → passthrough (évite les web-components)
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Verrat } from '../../types/farm';

// ── Fixtures ────────────────────────────────────────────────────────────────
const verratBobi: Verrat = {
  id: 'V01',
  displayId: 'V01',
  boucle: 'FR-V01-001',
  nom: 'Bobi',
  statut: 'Actif',
  origine: 'Thomasset',
  alimentation: 'Verrat standard',
  ration: 3.0,
  notes: '',
  synced: true,
};

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [],
    verrats: [verratBobi],
    bandes: [],
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

// Passthrough Ionic : on conserve les enfants (évite l'enregistrement
// des web-components `@ionic/react` sur jsdom).
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonToast: () => null,
  IonSpinner: () => <span data-testid="ion-spinner" />,
  IonSelect: ({ children }: { children: React.ReactNode }) => <select>{children}</select>,
  IonSelectOption: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  IonModal: ({
    isOpen,
    children,
  }: {
    isOpen?: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
}));

import VerratDetailView from './VerratDetailView';

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/troupeau/verrats/:id" element={<VerratDetailView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerratDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Vitest n'auto-cleanup pas entre tests (contrairement à Jest).
    cleanup();
  });

  it('verrat introuvable : affiche « VERRAT INTROUVABLE » + message', () => {
    renderAt('/troupeau/verrats/V99');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('VERRAT INTROUVABLE');
    expect(document.body.textContent).toMatch(
      /ce verrat n'existe pas/i,
    );
  });

  it('rend Bobi (V01) avec sa boucle et son origine', () => {
    renderAt('/troupeau/verrats/V01');
    // Le titre « VERRAT » + subtitle V01 apparaissent dans le header
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('VERRAT');
    // Section Identité contient Boucle + Origine
    const identite = screen.getByRole('region', { name: /identité/i });
    expect(within(identite).getByText('FR-V01-001')).toBeDefined();
    expect(within(identite).getByText('Thomasset')).toBeDefined();
    expect(within(identite).getByText('Boucle')).toBeDefined();
    expect(within(identite).getByText('Origine')).toBeDefined();
    // Le nom « Bobi » est présent dans le hero (title = "V01 · Bobi")
    expect(document.body.textContent).toContain('Bobi');
  });

  it('chip « Actif » visible avec le ton accent', () => {
    renderAt('/troupeau/verrats/V01');
    const chip = screen.getByText('Actif');
    expect(chip.tagName.toLowerCase()).toBe('span');
    expect(chip.className).toContain('chip--accent');
  });

  it('bouton « Saillir » présent avec aria-label', () => {
    renderAt('/troupeau/verrats/V01');
    const saillirBtn = screen.getByRole('button', { name: 'Saillir' });
    expect(saillirBtn.tagName).toBe('BUTTON');
  });

  it('historique soins : empty state si aucun soin enregistré', () => {
    renderAt('/troupeau/verrats/V01');
    const soinsSection = screen.getByRole('region', { name: /historique soins/i });
    expect(
      within(soinsSection).getByText(/aucun soin enregistré pour ce verrat/i),
    ).toBeDefined();
  });
});
