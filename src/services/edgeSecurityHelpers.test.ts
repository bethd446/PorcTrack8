/**
 * Tests des helpers de sécurité Edge Functions (marius-chat, send-push).
 *
 * Couvre :
 *  - CORS strict (whitelist + fallback)
 *  - sanitizePushUrl (schéma, host, paths relatifs)
 *  - validateSendPushPayload (title/body/farm_id/url/category)
 *  - evaluateRateLimit (fenêtre 60s, dépassement, reset)
 *  - extractUserIdFromJwt (token bien formé / malformé)
 */
import { describe, it, expect } from 'vitest';
import {
  ALLOWED_ORIGINS,
  ALLOWED_URL_HOSTS,
  buildCorsHeaders,
  evaluateRateLimit,
  extractUserIdFromJwt,
  isOriginAllowed,
  resolveAllowedOrigin,
  sanitizePushUrl,
  validateSendPushPayload,
  RATE_LIMITS,
  RATE_LIMIT_WINDOW_MS,
} from './edgeSecurityHelpers';

describe('CORS strict whitelist', () => {
  it('accepte porctrack.tech', () => {
    expect(isOriginAllowed('https://porctrack.tech')).toBe(true);
    expect(resolveAllowedOrigin('https://porctrack.tech')).toBe(
      'https://porctrack.tech',
    );
  });

  it('accepte les sous-domaines whitelisted', () => {
    expect(isOriginAllowed('https://www.porctrack.tech')).toBe(true);
    expect(isOriginAllowed('https://app.porctrack.tech')).toBe(true);
  });

  it('accepte localhost dev', () => {
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('http://localhost:4173')).toBe(true);
  });

  it('refuse les origins inconnus et fallback sur prod', () => {
    expect(isOriginAllowed('https://evil.com')).toBe(false);
    expect(isOriginAllowed(null)).toBe(false);
    expect(isOriginAllowed('')).toBe(false);
    expect(resolveAllowedOrigin('https://evil.com')).toBe(
      'https://porctrack.tech',
    );
    expect(resolveAllowedOrigin(null)).toBe('https://porctrack.tech');
  });

  it('refuse les wildcards déguisés', () => {
    expect(isOriginAllowed('*')).toBe(false);
    expect(isOriginAllowed('null')).toBe(false);
  });

  it('buildCorsHeaders inclut Vary: Origin', () => {
    const h = buildCorsHeaders('https://porctrack.tech');
    expect(h['Access-Control-Allow-Origin']).toBe('https://porctrack.tech');
    expect(h['Vary']).toBe('Origin');
    expect(h['Access-Control-Allow-Methods']).toContain('POST');
  });

  it('expose un set non vide', () => {
    expect(ALLOWED_ORIGINS.size).toBeGreaterThan(0);
    expect(ALLOWED_URL_HOSTS.size).toBeGreaterThan(0);
  });
});

describe('sanitizePushUrl', () => {
  it('accepte un path relatif simple', () => {
    expect(sanitizePushUrl('/alerts/123')).toBe('/alerts/123');
    expect(sanitizePushUrl('/')).toBe('/');
  });

  it('refuse les paths relatifs avec double slash (protocol-less)', () => {
    expect(sanitizePushUrl('//evil.com/x')).toBeUndefined();
    expect(sanitizePushUrl('/a//b')).toBeUndefined();
  });

  it('refuse les paths avec backslash', () => {
    expect(sanitizePushUrl('/a\\b')).toBeUndefined();
  });

  it('accepte les URLs https vers porctrack.tech', () => {
    expect(sanitizePushUrl('https://porctrack.tech/x')).toBe(
      'https://porctrack.tech/x',
    );
    expect(sanitizePushUrl('https://app.porctrack.tech/dash')).toBe(
      'https://app.porctrack.tech/dash',
    );
  });

  it('refuse les hosts hors whitelist', () => {
    expect(sanitizePushUrl('https://evil.com/x')).toBeUndefined();
    expect(sanitizePushUrl('https://porctrack.tech.evil.com/x')).toBeUndefined();
  });

  it('refuse les schémas dangereux', () => {
    expect(sanitizePushUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizePushUrl('data:text/html,<script>')).toBeUndefined();
    expect(sanitizePushUrl('file:///etc/passwd')).toBeUndefined();
    expect(sanitizePushUrl('ftp://porctrack.tech/x')).toBeUndefined();
  });

  it('refuse les inputs non-string', () => {
    expect(sanitizePushUrl(undefined)).toBeUndefined();
    expect(sanitizePushUrl(null)).toBeUndefined();
    expect(sanitizePushUrl(42)).toBeUndefined();
    expect(sanitizePushUrl({})).toBeUndefined();
    expect(sanitizePushUrl('')).toBeUndefined();
  });
});

describe('validateSendPushPayload', () => {
  const FARM_ID = '11111111-1111-1111-1111-111111111111';
  const USER_ID = '22222222-2222-2222-2222-222222222222';

  it('valide un payload minimal', () => {
    const r = validateSendPushPayload({
      title: 'Mise-bas imminente',
      body: 'Truie 042 à J114',
      farm_id: FARM_ID,
    });
    expect(r.ok).toBe(true);
    expect(r.value?.farm_id).toBe(FARM_ID);
    expect(r.value?.title).toBe('Mise-bas imminente');
  });

  it('refuse un payload sans farm_id', () => {
    const r = validateSendPushPayload({ title: 'x', body: 'y' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/farm_id/);
  });

  it('refuse un farm_id non-uuid', () => {
    const r = validateSendPushPayload({
      title: 'x',
      body: 'y',
      farm_id: 'not-a-uuid',
    });
    expect(r.ok).toBe(false);
  });

  it('refuse un title vide', () => {
    const r = validateSendPushPayload({
      title: '   ',
      body: 'y',
      farm_id: FARM_ID,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/title/);
  });

  it('refuse un title trop long', () => {
    const r = validateSendPushPayload({
      title: 'a'.repeat(300),
      body: 'y',
      farm_id: FARM_ID,
    });
    expect(r.ok).toBe(false);
  });

  it('refuse un body trop long', () => {
    const r = validateSendPushPayload({
      title: 'x',
      body: 'a'.repeat(1500),
      farm_id: FARM_ID,
    });
    expect(r.ok).toBe(false);
  });

  it('refuse user_ids non-uuid', () => {
    const r = validateSendPushPayload({
      title: 'x',
      body: 'y',
      farm_id: FARM_ID,
      user_ids: ['not-uuid'],
    });
    expect(r.ok).toBe(false);
  });

  it('accepte user_ids valides', () => {
    const r = validateSendPushPayload({
      title: 'x',
      body: 'y',
      farm_id: FARM_ID,
      user_ids: [USER_ID],
    });
    expect(r.ok).toBe(true);
    expect(r.value?.user_ids).toEqual([USER_ID]);
  });

  it('refuse user_ids trop nombreux', () => {
    const many = Array.from({ length: 250 }, () => USER_ID);
    const r = validateSendPushPayload({
      title: 'x',
      body: 'y',
      farm_id: FARM_ID,
      user_ids: many,
    });
    expect(r.ok).toBe(false);
  });

  it('refuse une URL avec host non whitelisté', () => {
    const r = validateSendPushPayload({
      title: 'x',
      body: 'y',
      farm_id: FARM_ID,
      url: 'https://evil.com/x',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/url/);
  });

  it('accepte une URL relative et la conserve', () => {
    const r = validateSendPushPayload({
      title: 'x',
      body: 'y',
      farm_id: FARM_ID,
      url: '/alerts/123',
    });
    expect(r.ok).toBe(true);
    expect(r.value?.url).toBe('/alerts/123');
  });

  it('refuse une category inconnue', () => {
    const r = validateSendPushPayload({
      title: 'x',
      body: 'y',
      farm_id: FARM_ID,
      category: 'hacks',
    });
    expect(r.ok).toBe(false);
  });

  it('accepte les catégories canoniques', () => {
    for (const cat of ['mise_bas', 'stocks', 'cycles_repro', 'general']) {
      const r = validateSendPushPayload({
        title: 'x',
        body: 'y',
        farm_id: FARM_ID,
        category: cat,
      });
      expect(r.ok).toBe(true);
      expect(r.value?.category).toBe(cat);
    }
  });

  it('refuse data en tableau', () => {
    const r = validateSendPushPayload({
      title: 'x',
      body: 'y',
      farm_id: FARM_ID,
      data: [1, 2, 3],
    });
    expect(r.ok).toBe(false);
  });
});

describe('evaluateRateLimit', () => {
  it('autorise la 1ère requête (compteur 0)', () => {
    const r = evaluateRateLimit(1000, 1000, 0, 30);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(29);
  });

  it('autorise tant que count < limit', () => {
    const r = evaluateRateLimit(2000, 1000, 15, 30);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(14);
  });

  it('refuse au pile-poil (count == limit)', () => {
    const r = evaluateRateLimit(2000, 1000, 30, 30);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it('reset après expiration de la fenêtre', () => {
    const r = evaluateRateLimit(70_000, 1000, 30, 30);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(29);
  });

  it('retryAfterMs est positif quand bloqué', () => {
    const r = evaluateRateLimit(30_000, 0, 30, 30);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBe(30_000); // 60s window - 30s elapsed
  });

  it('limites par fonction sont exposées', () => {
    expect(RATE_LIMITS['marius-chat']).toBe(30);
    expect(RATE_LIMITS['send-push']).toBe(10);
    expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });
});

describe('extractUserIdFromJwt', () => {
  const validUuid = '33333333-3333-3333-3333-333333333333';

  function makeJwt(payload: Record<string, unknown>): string {
    const b64 = (o: object) =>
      Buffer.from(JSON.stringify(o))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return `${b64({ alg: 'HS256' })}.${b64(payload)}.signature`;
  }

  it('extrait sub d\'un JWT bien formé', () => {
    const jwt = makeJwt({ sub: validUuid });
    expect(extractUserIdFromJwt(`Bearer ${jwt}`)).toBe(validUuid);
  });

  it('refuse un header sans Bearer', () => {
    expect(extractUserIdFromJwt(null)).toBeNull();
    expect(extractUserIdFromJwt('')).toBeNull();
    expect(extractUserIdFromJwt('Basic abc')).toBeNull();
  });

  it('refuse un JWT mal formé', () => {
    expect(extractUserIdFromJwt('Bearer xxx')).toBeNull();
    expect(extractUserIdFromJwt('Bearer xx.yy')).toBeNull();
  });

  it('refuse un JWT avec sub non-uuid', () => {
    const jwt = makeJwt({ sub: 'admin' });
    expect(extractUserIdFromJwt(`Bearer ${jwt}`)).toBeNull();
  });

  it('refuse un JWT sans sub', () => {
    const jwt = makeJwt({ aud: 'authenticated' });
    expect(extractUserIdFromJwt(`Bearer ${jwt}`)).toBeNull();
  });
});
