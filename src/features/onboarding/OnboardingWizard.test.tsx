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

const createLogeMock = vi.fn(async (_data: unknown) => ({
  id: 'l-uuid',
  numero: 'X',
  type: 'MATERNITE',
  active: true,
}));
const insertSowMock = vi.fn(async (_data: unknown) => ({ id: 's-uuid' }));
const insertBoarMock = vi.fn(async (_data: unknown) => ({ id: 'b-uuid' }));
vi.mock('../../services/supabaseWrites', () => ({
  createLoge: (data: unknown) => createLogeMock(data),
  insertSow: (data: unknown) => insertSowMock(data),
  insertBoar: (data: unknown) => insertBoarMock(data),
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
  createLogeMock.mockClear();
  insertSowMock.mockClear();
  insertBoarMock.mockClear();
  insertSowMock.mockImplementation(async (_d: unknown) => ({ id: 's-uuid' }));
  insertBoarMock.mockImplementation(async (_d: unknown) => ({ id: 'b-uuid' }));
});
afterEach(() => cleanup());

describe('OnboardingWizard', () => {
  it('passe de l\'étape 1 (Bienvenue) à l\'étape 2 via le bouton Commencer', () => {
    renderWizard();
    expect(screen.getByText(/Bienvenue sur PorcTrack/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    expect(screen.getByRole('heading', { name: /Nom de la ferme/i })).toBeTruthy();
    expect(screen.getByText('Étape 2 / 11')).toBeTruthy();
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
    expect(screen.getByText('Étape 7 / 11')).toBeTruthy();
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
    // 10 : loges (skip — quantités à 0 par défaut, validation OK)
    expect(screen.getByRole('heading', { name: /Configuration des loges/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 11 : récap
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
    expect(navigateMock).toHaveBeenCalledWith(
      '/today',
      expect.objectContaining({ replace: true }),
    );
  });

  it('étape 10 (loges) : skip → handleFinish n\'appelle PAS createLoge', async () => {
    renderWizard();
    // Avance jusqu'au step 10 (loges)
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    fireEvent.change(screen.getByLabelText(/Nom de la ferme/i), {
      target: { value: 'Ferme Skip' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.change(screen.getByLabelText(/Secteur/i), { target: { value: 'Loire' } });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('radio', { name: /^Naisseur$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Large White/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 10 : loges — quantités à 0 (skip implicite via défaut)
    expect(screen.getByRole('heading', { name: /Configuration des loges/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 11 : récap
    expect(screen.getByText(/Récapitulatif/i)).toBeTruthy();
    expect(screen.getByText(/À configurer plus tard/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Terminer/i }));
    });
    expect(updateMock).toHaveBeenCalled();
    expect(createLogeMock).not.toHaveBeenCalled();
  });

  it('étape 10 (loges) : qty>0 → handleFinish appelle createLoge N fois', async () => {
    renderWizard();
    // Avance jusqu'au step 10
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    fireEvent.change(screen.getByLabelText(/Nom de la ferme/i), {
      target: { value: 'Ferme Loges' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.change(screen.getByLabelText(/Secteur/i), { target: { value: 'Loire' } });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('radio', { name: /^Naisseur$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Large White/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 10 : loges — saisit 2 maternité + 1 verrat
    fireEvent.change(screen.getByLabelText(/Quantité de loges Mise-bas/i), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(/Quantité de loges Verrats/i), {
      target: { value: '1' },
    });
    // Sub-step B doit apparaître
    expect(screen.getByTestId('onb-loges-numbering')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 11 : récap
    expect(screen.getByText(/Récapitulatif/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Terminer/i }));
    });
    expect(updateMock).toHaveBeenCalled();
    // 2 maternité + 1 verrat = 3 loges à créer
    expect(createLogeMock).toHaveBeenCalledTimes(3);
    const calls = createLogeMock.mock.calls.map((c) => c[0]) as Array<{
      numero: string;
      type: string;
      capaciteMax: number;
    }>;
    const types = calls.map((c) => c.type);
    expect(types.filter((t) => t === 'MATERNITE')).toHaveLength(2);
    expect(types.filter((t) => t === 'VERRAT')).toHaveLength(1);
    // Numéros par défaut : M-01, M-02, B-01
    expect(calls.map((c) => c.numero).sort()).toEqual(['B-01', 'M-01', 'M-02']);
  });

  it('E2 — handleFinish avec 5 truies + 2 verrats appelle insertSow 5× et insertBoar 2×', async () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    // 2 : nom ferme
    fireEvent.change(screen.getByLabelText(/Nom de la ferme/i), {
      target: { value: 'Ferme E2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 3 : secteur
    fireEvent.change(screen.getByLabelText(/Secteur/i), { target: { value: 'Loire' } });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 4 : Naisseur (donc étapes 5/6 NON skippées)
    fireEvent.click(screen.getByRole('radio', { name: /^Naisseur$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 5 : races — 1 race
    fireEvent.click(screen.getByRole('button', { name: /Large White/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 6 : truies = 5
    fireEvent.change(screen.getByLabelText(/Effectif truies initial/i), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 7 : verrats = 2
    fireEvent.change(screen.getByLabelText(/Effectif verrats initial/i), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 8, 9 : valeurs par défaut
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 10 : skip loges
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 11 : récap
    expect(screen.getByText(/Récapitulatif/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Terminer/i }));
    });
    expect(insertSowMock).toHaveBeenCalledTimes(5);
    expect(insertBoarMock).toHaveBeenCalledTimes(2);
    // Vérifie quelques code_id et le contenu d'un appel.
    const sowCalls = insertSowMock.mock.calls.map((c) => c[0]) as Array<{
      code_id: string;
      name: string;
      breed: string | null;
      statut: string;
    }>;
    expect(sowCalls.map((c) => c.code_id).sort()).toEqual([
      'T-001',
      'T-002',
      'T-003',
      'T-004',
      'T-005',
    ]);
    expect(sowCalls[0].breed).toBe('Large White');
    expect(sowCalls[0].statut).toBe('En attente saillie');
    const boarCalls = insertBoarMock.mock.calls.map((c) => c[0]) as Array<{
      code_id: string;
      statut: string;
    }>;
    expect(boarCalls.map((c) => c.code_id).sort()).toEqual(['V-001', 'V-002']);
    expect(boarCalls[0].statut).toBe('Actif');
  });

  it("E2 — Engraisseur seul : insertSow PAS appelé, insertBoar appelé selon verrats", async () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    fireEvent.change(screen.getByLabelText(/Nom de la ferme/i), {
      target: { value: 'Ferme Engr' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.change(screen.getByLabelText(/Secteur/i), { target: { value: 'Loire' } });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // 4 : Engraisseur seul → skip 5 et 6
    fireEvent.click(screen.getByRole('radio', { name: /Engraisseur seul/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    // → étape 7 (Verrats)
    fireEvent.change(screen.getByLabelText(/Effectif verrats initial/i), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Terminer/i }));
    });
    expect(insertSowMock).not.toHaveBeenCalled();
    expect(insertBoarMock).toHaveBeenCalledTimes(1);
  });

  it('E2 — insertSow échec sur 1 row : continue les autres et navigate quand même', async () => {
    insertSowMock.mockImplementationOnce(async () => {
      throw new Error('code_id duplicate');
    });
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Commencer/i }));
    fireEvent.change(screen.getByLabelText(/Nom de la ferme/i), {
      target: { value: 'Ferme Fail' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.change(screen.getByLabelText(/Secteur/i), { target: { value: 'Loire' } });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('radio', { name: /^Naisseur$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Large White/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.change(screen.getByLabelText(/Effectif truies initial/i), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Terminer/i }));
    });
    // Les 3 appels ont eu lieu (dont 1 qui a throw, capturée par try/catch).
    expect(insertSowMock).toHaveBeenCalledTimes(3);
    expect(navigateMock).toHaveBeenCalledWith(
      '/today',
      expect.objectContaining({ replace: true }),
    );
  });
});
