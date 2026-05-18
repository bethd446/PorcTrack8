/**
 * src/services/edgeSecurityHelpers.ts
 *
 * MIROIR EXACT de supabase/functions/_shared/security.ts (Deno).
 * Sert UNIQUEMENT aux tests Vitest des helpers (pure functions).
 *
 * Si tu modifies l'un, modifie l'autre. La logique reste pure : pas d'I/O,
 * pas de dépendance Deno, pas de dépendance Supabase client.
 *
 * Doublon assumé : on ne peut pas importer un fichier de supabase/functions/
 * depuis src/ sans tirer les types Deno dans le build Vite/Vitest.
 */

export const ALLOWED_ORIGINS = new Set<string>([
  'https://porctrack.tech',
  'https://www.porctrack.tech',
  'https://app.porctrack.tech',
  'http://localhost:5173',
  'http://localhost:4173',
]);

export const ALLOWED_URL_HOSTS = new Set<string>([
  'porctrack.tech',
  'www.porctrack.tech',
  'app.porctrack.tech',
]);

export function resolveAllowedOrigin(origin: string | null): string {
  if (origin && ALLOWED_ORIGINS.has(origin)) return origin;
  return 'https://porctrack.tech';
}

export function isOriginAllowed(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

export function buildCorsHeaders(
  origin: string | null,
): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

export function sanitizePushUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  if (raw.startsWith('/')) {
    if (raw.includes('//') || raw.includes('\\')) return undefined;
    return raw;
  }
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return undefined;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
  if (!ALLOWED_URL_HOSTS.has(u.hostname)) return undefined;
  return u.toString();
}

export const RATE_LIMITS: Record<string, number> = {
  'marius-chat': 30,
  'send-push': 10,
};

export const RATE_LIMIT_WINDOW_MS = 60_000;

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function evaluateRateLimit(
  now: number,
  windowStart: number,
  countInWindow: number,
  limit: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): RateLimitDecision {
  const elapsed = now - windowStart;
  if (elapsed >= windowMs) {
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (countInWindow < limit) {
    return {
      allowed: true,
      remaining: limit - countInWindow - 1,
      retryAfterMs: 0,
    };
  }
  return { allowed: false, remaining: 0, retryAfterMs: windowMs - elapsed };
}

export interface SendPushPayload {
  user_ids?: string[];
  farm_id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  category?: 'mise_bas' | 'stocks' | 'cycles_repro' | 'general';
  data?: Record<string, unknown>;
}

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const VALID_CATEGORIES = new Set([
  'mise_bas',
  'stocks',
  'cycles_repro',
  'general',
]);

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export function validateSendPushPayload(
  input: unknown,
): ValidationResult<SendPushPayload> {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Payload must be an object' };
  }
  const p = input as Record<string, unknown>;

  if (typeof p.title !== 'string' || p.title.trim().length === 0) {
    return { ok: false, error: 'title is required (string)' };
  }
  if (p.title.length > 200) {
    return { ok: false, error: 'title too long (>200 chars)' };
  }
  if (typeof p.body !== 'string' || p.body.trim().length === 0) {
    return { ok: false, error: 'body is required (string)' };
  }
  if (p.body.length > 1000) {
    return { ok: false, error: 'body too long (>1000 chars)' };
  }
  if (typeof p.farm_id !== 'string' || !UUID_RE.test(p.farm_id)) {
    return { ok: false, error: 'farm_id is required (uuid)' };
  }

  let user_ids: string[] | undefined;
  if (p.user_ids !== undefined) {
    if (!Array.isArray(p.user_ids)) {
      return { ok: false, error: 'user_ids must be an array' };
    }
    if (p.user_ids.length > 200) {
      return { ok: false, error: 'user_ids too many (>200)' };
    }
    for (const u of p.user_ids) {
      if (typeof u !== 'string' || !UUID_RE.test(u)) {
        return { ok: false, error: 'user_ids must contain only uuids' };
      }
    }
    user_ids = p.user_ids as string[];
  }

  let category: SendPushPayload['category'] | undefined;
  if (p.category !== undefined) {
    if (typeof p.category !== 'string' || !VALID_CATEGORIES.has(p.category)) {
      return { ok: false, error: 'category invalid' };
    }
    category = p.category as SendPushPayload['category'];
  }

  let icon: string | undefined;
  if (p.icon !== undefined) {
    if (typeof p.icon !== 'string' || p.icon.length > 500) {
      return { ok: false, error: 'icon invalid' };
    }
    icon = sanitizePushUrl(p.icon);
  }
  let badge: string | undefined;
  if (p.badge !== undefined) {
    if (typeof p.badge !== 'string' || p.badge.length > 500) {
      return { ok: false, error: 'badge invalid' };
    }
    badge = sanitizePushUrl(p.badge);
  }
  let url: string | undefined;
  if (p.url !== undefined) {
    if (typeof p.url !== 'string' || p.url.length > 500) {
      return { ok: false, error: 'url invalid' };
    }
    const sanitized = sanitizePushUrl(p.url);
    if (!sanitized) {
      return { ok: false, error: 'url rejected (host/scheme not allowed)' };
    }
    url = sanitized;
  }

  let data: Record<string, unknown> | undefined;
  if (p.data !== undefined) {
    if (typeof p.data !== 'object' || Array.isArray(p.data) || p.data === null) {
      return { ok: false, error: 'data must be an object' };
    }
    data = p.data as Record<string, unknown>;
  }

  return {
    ok: true,
    value: {
      title: p.title.trim(),
      body: p.body.trim(),
      farm_id: p.farm_id,
      user_ids,
      category,
      icon,
      badge,
      url,
      data,
    },
  };
}

export function extractUserIdFromJwt(
  authHeader: string | null,
): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const claims = JSON.parse(json) as { sub?: string };
    if (claims.sub && UUID_RE.test(claims.sub)) return claims.sub;
    return null;
  } catch {
    return null;
  }
}
