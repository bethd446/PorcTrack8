// @vitest-environment jsdom
/**
 * Tests unitaires — Login (RT6 — flow reset password)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Click "Mot de passe oublié ?" → bascule en mode reset (champ password caché, label changé)
 *   2. Submit en mode reset → appelle supabase.auth.resetPasswordForEmail
 *   3. Success state affiché après envoi du lien
 *   4. Bouton retour rebascule en mode login
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockSignIn = vi.fn();
const mockReset = vi.fn();

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockReset(...args),
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('../../lib/authRedirect', () => ({
  getAuthRedirectURL: (path: string) => `https://app.test${path}`,
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Login from './Login';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  mockSignIn.mockReset();
  mockReset.mockReset();
});

describe('Login — flow reset password', () => {
  it('bascule en mode reset au click "Mot de passe oublié ?"', async () => {
    const user = userEvent.setup();
    renderLogin();

    expect(screen.getByLabelText(/^Mot de passe$/i)).toBeDefined();

    const forgotBtn = screen.getByRole('button', { name: /mot de passe oublié/i });
    await user.click(forgotBtn);

    expect(screen.queryByLabelText(/^Mot de passe$/i)).toBeNull();
    expect(screen.getByLabelText(/email du compte/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /recevoir le lien/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /retour à la connexion/i })).toBeDefined();
  });

  it('submit en mode reset appelle resetPasswordForEmail avec redirectTo', async () => {
    const user = userEvent.setup();
    mockReset.mockResolvedValueOnce({ error: null });
    renderLogin();

    await user.click(screen.getByRole('button', { name: /mot de passe oublié/i }));

    const emailInput = screen.getByLabelText(/email du compte/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'user@ferme.fr' } });

    fireEvent.submit(emailInput.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
    expect(mockReset).toHaveBeenCalledWith('user@ferme.fr', {
      redirectTo: 'https://app.test/reset-password',
    });
  });

  it('affiche success state après envoi réussi', async () => {
    const user = userEvent.setup();
    mockReset.mockResolvedValueOnce({ error: null });
    renderLogin();

    await user.click(screen.getByRole('button', { name: /mot de passe oublié/i }));

    const emailInput = screen.getByLabelText(/email du compte/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'user@ferme.fr' } });
    fireEvent.submit(emailInput.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(screen.getByText(/email envoyé/i)).toBeDefined();
    });
    expect(screen.getByText(/y compris les spams/i)).toBeDefined();
  });

  it('bouton retour rebascule en mode login', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /mot de passe oublié/i }));
    expect(screen.queryByLabelText(/^Mot de passe$/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /retour à la connexion/i }));

    expect(screen.getByLabelText(/^Mot de passe$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^se connecter$/i })).toBeDefined();
  });
});
