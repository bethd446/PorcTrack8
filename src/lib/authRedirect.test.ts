// @vitest-environment jsdom
/**
 * Tests unitaires — getAuthRedirectURL
 * ═════════════════════════════════════
 * Bascule selon `import.meta.env.PROD` :
 *  - PROD true  → https://porctrack.tech${path}
 *  - PROD false → ${window.location.origin}${path}
 * Path par défaut = /auth/callback ; path custom respecté.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthRedirectURL } from './authRedirect';

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getAuthRedirectURL — PROD', () => {
  it('returns prod domain + default path when PROD=true', () => {
    vi.stubEnv('PROD', true);
    expect(getAuthRedirectURL()).toBe('https://porctrack.tech/auth/callback');
  });

  it('returns prod domain + custom path when PROD=true', () => {
    vi.stubEnv('PROD', true);
    expect(getAuthRedirectURL('/auth/reset-password')).toBe(
      'https://porctrack.tech/auth/reset-password',
    );
  });

  it('respects path with query params in prod', () => {
    vi.stubEnv('PROD', true);
    expect(getAuthRedirectURL('/auth/callback?next=/dashboard')).toBe(
      'https://porctrack.tech/auth/callback?next=/dashboard',
    );
  });
});

describe('getAuthRedirectURL — DEV', () => {
  it('returns window.location.origin + default path when PROD=false', () => {
    vi.stubEnv('PROD', false);
    // jsdom default origin
    const origin = window.location.origin;
    expect(getAuthRedirectURL()).toBe(`${origin}/auth/callback`);
  });

  it('returns window.location.origin + custom path when PROD=false', () => {
    vi.stubEnv('PROD', false);
    const origin = window.location.origin;
    expect(getAuthRedirectURL('/login')).toBe(`${origin}/login`);
  });

  it('falls back to prod domain when window is undefined (SSR-like) even in dev', () => {
    vi.stubEnv('PROD', false);
    vi.stubGlobal('window', undefined);
    expect(getAuthRedirectURL()).toBe('https://porctrack.tech/auth/callback');
  });

  it('uses window origin even with custom port (jsdom default)', () => {
    vi.stubEnv('PROD', false);
    const origin = window.location.origin;
    // Vérifie qu'on prend bien window.location.origin (pas de hard-coded localhost:5173)
    expect(getAuthRedirectURL('/auth/callback')).toBe(`${origin}/auth/callback`);
    expect(origin).toMatch(/^https?:\/\//);
  });
});
