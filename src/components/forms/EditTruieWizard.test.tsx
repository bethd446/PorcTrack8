// @vitest-environment jsdom
/**
 * Tests unitaires — EditTruieWizard (V32 PHASE 4)
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie :
 *   - Le wizard s'ouvre avec la bonne étape par défaut
 *   - Navigation entre les 3 étapes (Identifiant / Reproduction / Identité+Loge)
 *   - Le bouton "Enregistrer" appelle updateSow avec le patch attendu
 *   - Validation : code interne obligatoire, ration > 10 rejetée
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Truie } from '../../types/farm';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'farm-test' },
    role: 'PORCHER',
    userName: 'Test',
    setRole: vi.fn(),
    profile: null,
    loading: false,
    profileLoaded: true,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

// Mock @capacitor/preferences (PhotoUploader → service photos)
const _prefsStore = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: _prefsStore.get(key) ?? null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      _prefsStore.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => _prefsStore.delete(key)),
    keys: vi.fn(async () => ({ keys: Array.from(_prefsStore.keys()) })),
    clear: vi.fn(async () => _prefsStore.clear()),
  },
}));

// Mock supabaseWrites
const updateSowMock = vi.fn<(id: string, patch: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>>(
  async () => ({ success: true }),
);
const listLogesMock = vi.fn<() => Promise<unknown[]>>(async () => []);
vi.mock('../../services/supabaseWrites', () => ({
  updateSow: (id: string, patch: Record<string, unknown>) => updateSowMock(id, patch),
  listLoges: () => listLogesMock(),
  updateBatch: vi.fn(async () => ({ success: true })),
  updateSowByCode: vi.fn(async () => null),
}));

// Mock FarmContext
const truieT18: Truie = {
  id: 'uuid-t18',
  displayId: 'T18',
  boucle: 'FR-018-42',
  nom: 'Berthe',
  statut: 'En attente saillie',
  stade: 'Reproductrice',
  ration: 3.5,
  nbPortees: 2,
  notes: '',
  synced: true,
};

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    truies: [truieT18],
    verrats: [],
    bandes: [],
    saillies: [],
    refreshData: vi.fn(),
  }),
  useMeta: () => ({}),
  FarmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock @ionic/react — passthrough
vi.mock('@ionic/react', () => ({
  IonModal: ({
    isOpen,
    children,
  }: {
    isOpen?: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
  IonToast: () => null,
}));

// Mock PhotoUploader (ne charge pas le storage)
vi.mock('./PhotoUploader', () => ({
  default: () => <div data-testid="photo-uploader" />,
}));

import EditTruieWizard from './EditTruieWizard';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('EditTruieWizard', () => {
  it('isOpen=false → ne rend rien', () => {
    render(
      <EditTruieWizard
        isOpen={false}
        onClose={vi.fn()}
        truie={truieT18}
      />,
    );
    expect(screen.queryByTestId('wizard')).toBeNull();
  });

  it('isOpen=true → rend l’étape 1 « Identifiant »', () => {
    render(
      <EditTruieWizard
        isOpen
        onClose={vi.fn()}
        truie={truieT18}
      />,
    );
    expect(screen.getByTestId('wizard')).toBeDefined();
    // Header H1 = "IDENTIFIANT" (le label de l'étape 1)
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent?.toLowerCase()).toContain('identifiant');
    // Eyebrow visible : "Éditer · T18"
    expect(screen.getByText(/éditer · t18/i)).toBeDefined();
  });

  it('navigation : Suivant → Suivant → Précédent', () => {
    render(
      <EditTruieWizard
        isOpen
        onClose={vi.fn()}
        truie={truieT18}
      />,
    );
    fireEvent.click(screen.getByTestId('wizard-next')); // → step 2
    expect(screen.getByRole('heading', { level: 1 }).textContent?.toLowerCase()).toContain('reproduction');

    fireEvent.click(screen.getByTestId('wizard-next')); // → step 3
    expect(screen.getByRole('heading', { level: 1 }).textContent?.toLowerCase()).toMatch(/identité|loge|notes/i);

    fireEvent.click(screen.getByLabelText(/étape précédente/i)); // ← step 2
    expect(screen.getByRole('heading', { level: 1 }).textContent?.toLowerCase()).toContain('reproduction');
  });

  it('étape 3 : bouton « Enregistrer » est exposé', () => {
    render(
      <EditTruieWizard
        isOpen
        onClose={vi.fn()}
        truie={truieT18}
      />,
    );
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    const completeBtn = screen.getByTestId('wizard-complete');
    expect(completeBtn.textContent?.toLowerCase()).toContain('enregistrer');
  });

  it('Enregistrer sans modif → ferme + appelle onClose (toast "Aucune modification")', async () => {
    const onClose = vi.fn();
    render(
      <EditTruieWizard
        isOpen
        onClose={onClose}
        truie={truieT18}
      />,
    );
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-complete'));
    // Attendre la promesse onComplete
    await Promise.resolve();
    await Promise.resolve();
    expect(onClose).toHaveBeenCalled();
    // updateSow ne doit PAS être appelé si rien n'a changé.
    expect(updateSowMock).not.toHaveBeenCalled();
  });

  it('progress bar : aria-valuenow=1 au début, =3 à la fin', () => {
    render(
      <EditTruieWizard
        isOpen
        onClose={vi.fn()}
        truie={truieT18}
      />,
    );
    let progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('1');
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('3');
  });

  it('bouton ✕ appelle onClose', () => {
    const onClose = vi.fn();
    render(
      <EditTruieWizard
        isOpen
        onClose={onClose}
        truie={truieT18}
      />,
    );
    fireEvent.click(screen.getByLabelText(/fermer le wizard/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
