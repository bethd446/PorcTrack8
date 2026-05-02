// @vitest-environment jsdom
/**
 * Tests unitaires — ResetPassword (RT6)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Pas de session → affiche "Lien expiré"
 *   2. Session OK + passwords matchent → updateUser appelé
 *   3. Passwords mismatch → erreur affichée + updateUser non appelé
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGetSession = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import ResetPassword from './ResetPassword';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  mockGetSession.mockReset();
  mockUpdateUser.mockReset();
});

describe('ResetPassword — vérification session', () => {
  it('pas de session → affiche "Lien expiré"', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/lien expiré/i)).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /retour à la connexion/i })).toBeDefined();
    expect(screen.queryByLabelText(/^Nouveau mot de passe$/i)).toBeNull();
  });
});

describe('ResetPassword — soumission du formulaire', () => {
  it('session OK + passwords matchent → updateUser appelé avec le nouveau mot de passe', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });
    mockUpdateUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });

    renderPage();

    const pwd = await waitFor(() => screen.getByLabelText(/^Nouveau mot de passe$/i) as HTMLInputElement);
    const confirm = screen.getByLabelText(/^Confirmation$/i) as HTMLInputElement;

    fireEvent.change(pwd, { target: { value: 'monNouveauMdp123' } });
    fireEvent.change(confirm, { target: { value: 'monNouveauMdp123' } });

    fireEvent.submit(pwd.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'monNouveauMdp123' });
  });

  it('passwords mismatch → erreur affichée + updateUser non appelé', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });

    renderPage();

    const pwd = await waitFor(() => screen.getByLabelText(/^Nouveau mot de passe$/i) as HTMLInputElement);
    const confirm = screen.getByLabelText(/^Confirmation$/i) as HTMLInputElement;

    fireEvent.change(pwd, { target: { value: 'monNouveauMdp123' } });
    fireEvent.change(confirm, { target: { value: 'AUTRE-mdp-456' } });

    fireEvent.submit(pwd.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(screen.getByText(/ne correspondent pas/i)).toBeDefined();
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
