// @vitest-environment jsdom
/**
 * Tests unitaires — OnboardingWizard (RT5)
 * ════════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. navigation étape 1 → 2 via le bouton "Commencer"
 *   2. validation : Suivant désactivé si nom_ferme vide à l'étape 2
 *   3. skip étapes 5 et 6 si typeProd === "Engraisseur seul"
 *   4. étape 10 → handleFinish() appelle supabase.from('troupeaux').update()
 *      avec onboarding_completed_at
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-test-uuid' },
    profile: null,
    profileLoaded: true,
    loading: false,
    role: 'OWNER',
    userName: 'Test',
    setRole: vi.fn(),
    isOwner: true,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    session: null,
  }),
}));

const updateMock = vi.fn(async () => ({ error: null }));
const eqMock = vi.fn(() => updateMock());
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => {
        // Capture le payload via updateMock pour assertion ultérieure.
        updateMock.mockImplementationOnce(async () => {
          (updateMock as unknown as { lastPayload?: unknown }).lastPayload = payload;
          return { error: null };
        });
        return { eq: eqMock };
      },
    }),
  },
}));

const kvSetMock = vi.fn(async (_k: string, _v: string) => undefined);
vi.mock('../../services/kvStore', () => ({
  kvGet: () => null,
  kvSet: (k: string, v: string) => kvSetMock(k, v),
}));

import OnboardingWizard from './OnboardingWizard';

const renderWizard = () =>
  render(
    <MemoryRouter>
      <OnboardingWizard />
    </MemoryRouter>,
  );

beforeEach(() => {
  navigateMock.mockReset();
  updateMock.mockClear();
  eqMock.mockClear();
  kvSetMock.mockClear();
});
afterEach(() => cleanup());

describe('OnboardingWizard', () => {
  it('passe de l\'étape 1 (Bienvenue) à l\'étape 2 via le bouton Commencer', () => {
    renderWizard();
    expect(screen.getByText(/Bienvenue sur PorcTrack/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    expect(screen.getByRole('heading', { name: /Nom de la ferme/i })).toBeTruthy();
    expect(screen.getByText('Étape 2 / 10')).toBeTruthy();
  });

  it('désactive le bouton Suivant tant que le nom de ferme est vide (validation KO)', () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    const suivant = screen.getByRole('button', { name: /Suivant/i }) as HTMLButtonElement;
    expect(suivant.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Nom de la ferme/i), {
      target: { value: 'Ferme Test' },
    });
    expect((screen.getByRole('button', { name: /Suivant/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('saute les étapes 5 (races) et 6 (truies) si Engraisseur seul est sélectionné', () => {
    renderWizard();
    // 1 → 2
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    // 2 : nom ferme
    fireEvent.change(screen.getByLabelText(/Nom de la ferme/i), {
      target: { value: 'Ferme E' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 3 : secteur + pays (déjà France par défaut)
    fireEvent.change(screen.getByLabelText(/Secteur/i), { target: { value: 'Bretagne' } });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 4 : typeProd → Engraisseur seul
    fireEvent.click(screen.getByRole('radio', { name: /Engraisseur seul/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // → doit sauter à l'étape 7 (Verrats), pas 5 (Races) ni 6 (Truies)
    expect(screen.getByText('Étape 7 / 10')).toBeTruthy();
    expect(screen.getByText(/Cheptel initial — Verrats/i)).toBeTruthy();
  });

  it('à l\'étape 10, Terminer appelle supabase.update avec onboarding_completed_at', async () => {
    renderWizard();
    // 1 → 2
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    fireEvent.change(screen.getByLabelText(/Nom de la ferme/i), {
      target: { value: 'Ferme Démo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 3
    fireEvent.change(screen.getByLabelText(/Secteur/i), { target: { value: 'Loire' } });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 4 : Naisseur (n'active pas le skip)
    fireEvent.click(screen.getByRole('radio', { name: /^Naisseur$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 5 : races — choisir 1
    fireEvent.click(screen.getByRole('button', { name: /Large White/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 6, 7, 8 : valeurs par défaut OK
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 9 : notes vides OK
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 10 : récap
    expect(screen.getByText(/Récapitulatif/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Terminer/i }));
    });
    expect(updateMock).toHaveBeenCalled();
    const payload = (updateMock as unknown as { lastPayload?: Record<string, unknown> }).lastPayload;
    expect(payload).toBeTruthy();
    expect(payload?.onboarding_completed_at).toBeTruthy();
    expect(payload?.nom_ferme).toBe('Ferme Démo');
    expect(payload?.races).toEqual(['Large White']);
    expect(eqMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/today', { replace: true });
  });
});
