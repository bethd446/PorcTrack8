/**
 * V72 — Tests unitaires pushSubscription.ts
 * Couverture : helpers urlBase64↔Uint8Array, isPushSupported,
 * subscribeToPush (success + erreurs), unsubscribeFromPush,
 * isPushSubscribed.
 *
 * Stratégie : `vi.resetModules()` avant chaque test pour relire les
 * mocks (notamment l'env VITE_VAPID_PUBLIC_KEY qui est lue au moment
 * de l'import du module — pas vraiment, elle l'est dans la fonction
 * mais la mise en place des globals doit être faite avant l'import
 * pour `isPushSupported`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VAPID_FAKE =
  'BKgPzKqQ6t7-vN3fF0Gg2hY4xkU1JdIz_PvAm_Lc8RnQ7eBfOaSp-jrTuVwYxzAabBcCdDeEfFgGhHiIjJkKlLmMnNo';

// ── Mocks Capacitor (force web non-native) ─────────────────────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: (): boolean => false },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    keys: vi.fn(async () => ({ keys: [] })),
    clear: vi.fn(async () => undefined),
  },
}));

// ── Mock supabaseClient ────────────────────────────────────────────────────
type AuthGetUserResp = {
  data: { user: { id: string } | null };
  error: { message: string } | null;
};
const getUserMock = vi.fn(
  async (): Promise<AuthGetUserResp> => ({
    data: { user: { id: 'user-123' } },
    error: null,
  }),
);
const upsertMock = vi.fn(
  async (
    _payload: unknown,
    _opts?: unknown,
  ): Promise<{ error: null | { message: string } }> => ({ error: null }),
);
const updateEqMock = vi.fn(
  async (): Promise<{ error: null | { message: string } }> => ({ error: null }),
);

vi.mock('./supabaseClient', () => {
  const fromImpl = (_table: string) => ({
    upsert: (a: unknown, b?: unknown) => upsertMock(a, b),
    update: (_payload: unknown) => ({
      eq: (_col: string, _val: unknown) => updateEqMock(),
    }),
  });
  return {
    supabase: {
      auth: { getUser: () => getUserMock() },
      from: fromImpl,
    },
    isSupabaseConfigured: true,
  };
});

vi.mock('./kvStore', () => ({
  kvGet: vi.fn(() => 'farm-abc'),
  kvSet: vi.fn(async () => undefined),
}));

// ── Globals: navigator.serviceWorker, PushManager, Notification ──────────
type FakeSubscription = {
  endpoint: string;
  getKey: (k: string) => ArrayBuffer | null;
  unsubscribe: () => Promise<boolean>;
};

const subscribeMock = vi.fn(async (): Promise<FakeSubscription> => fakeSub());
const unsubscribeMock = vi.fn(async () => true);

function fakeSub(): FakeSubscription {
  const p256 = new Uint8Array(16).fill(7).buffer;
  const auth = new Uint8Array(16).fill(9).buffer;
  return {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    getKey: (k: string) => (k === 'p256dh' ? p256 : k === 'auth' ? auth : null),
    unsubscribe: unsubscribeMock,
  };
}

let permissionState: NotificationPermission = 'granted';
let currentSubscription: FakeSubscription | null = null;
const requestPermissionMock = vi.fn(async (): Promise<NotificationPermission> => 'granted');

function installPushGlobals(opts: { vapidKey?: string | undefined } = {}): void {
  const NotifCtor = function () {} as unknown as typeof Notification;
  Object.defineProperty(NotifCtor, 'permission', {
    get: () => permissionState,
    configurable: true,
  });
  Object.defineProperty(NotifCtor, 'requestPermission', {
    value: requestPermissionMock,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'Notification', {
    value: NotifCtor,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'PushManager', {
    value: function () {},
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: {
      Notification: NotifCtor,
      PushManager: function () {},
    },
    configurable: true,
    writable: true,
  });
  const reg = {
    pushManager: {
      subscribe: subscribeMock,
      // currentSubscription est lu à chaque appel, pas figé.
      getSubscription: vi.fn(async () => currentSubscription),
    },
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 PorcTrackTest',
      serviceWorker: {
        ready: Promise.resolve(reg),
        getRegistration: vi.fn(async () => reg),
      },
    },
    configurable: true,
    writable: true,
  });
  // VITE_VAPID_PUBLIC_KEY via vi.stubEnv (préférable à mutation directe).
  if ('vapidKey' in opts && opts.vapidKey === undefined) {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
  } else {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', opts.vapidKey ?? VAPID_FAKE);
  }
}

beforeEach(async () => {
  // Reset module cache pour relire l'env à chaque test
  vi.resetModules();
  permissionState = 'granted';
  currentSubscription = null;
  subscribeMock.mockClear();
  subscribeMock.mockResolvedValue(fakeSub());
  unsubscribeMock.mockClear();
  unsubscribeMock.mockResolvedValue(true);
  requestPermissionMock.mockClear();
  requestPermissionMock.mockResolvedValue('granted');
  upsertMock.mockClear();
  upsertMock.mockResolvedValue({ error: null });
  updateEqMock.mockClear();
  updateEqMock.mockResolvedValue({ error: null });
  getUserMock.mockClear();
  getUserMock.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });
  installPushGlobals();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('pushSubscription — helpers', () => {
  it('urlBase64ToUint8Array() round-trip via arrayBufferToBase64Url', async () => {
    const mod = await import('./pushSubscription');
    const arr = new Uint8Array([1, 2, 3, 4, 5, 250, 251, 252]);
    const b64 = mod.arrayBufferToBase64Url(arr.buffer);
    expect(b64).not.toContain('=');
    expect(b64).not.toContain('+');
    expect(b64).not.toContain('/');
    const back = mod.urlBase64ToUint8Array(b64);
    expect(Array.from(back)).toEqual(Array.from(arr));
  });

  it('isPushSupported() true sur web avec PushManager + serviceWorker', async () => {
    const mod = await import('./pushSubscription');
    expect(mod.isPushSupported()).toBe(true);
  });
});

describe('pushSubscription — subscribeToPush', () => {
  it('upsert push_subscriptions avec endpoint + clés base64url', async () => {
    const mod = await import('./pushSubscription');
    const sub = await mod.subscribeToPush();

    expect(sub.endpoint).toBe('https://fcm.googleapis.com/fcm/send/abc');
    expect(subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0] as unknown as [
      Record<string, unknown>,
      { onConflict: string },
    ];
    const [payload, optsArg] = call;
    expect(payload.user_id).toBe('user-123');
    expect(payload.farm_id).toBe('farm-abc');
    expect(payload.endpoint).toBe('https://fcm.googleapis.com/fcm/send/abc');
    expect(typeof payload.p256dh).toBe('string');
    expect(typeof payload.auth).toBe('string');
    expect(payload.enabled).toBe(true);
    expect(optsArg.onConflict).toBe('endpoint');
  });

  it('throw PushSubscriptionError si permission denied', async () => {
    permissionState = 'denied';
    const mod = await import('./pushSubscription');
    await expect(mod.subscribeToPush()).rejects.toBeInstanceOf(
      mod.PushSubscriptionError,
    );
    await expect(mod.subscribeToPush()).rejects.toMatchObject({
      code: 'denied',
    });
  });

  it('throw si user non authentifié', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const mod = await import('./pushSubscription');
    await expect(mod.subscribeToPush()).rejects.toMatchObject({
      code: 'no_user',
    });
  });

  it('throw si VAPID key absente', async () => {
    installPushGlobals({ vapidKey: undefined });
    const mod = await import('./pushSubscription');
    await expect(mod.subscribeToPush()).rejects.toMatchObject({
      code: 'no_vapid_key',
    });
  });

  it('idempotent : ré-utilise sub existante sans re-subscribe', async () => {
    currentSubscription = fakeSub();
    const mod = await import('./pushSubscription');
    await mod.subscribeToPush();
    expect(subscribeMock).not.toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});

describe('pushSubscription — unsubscribeFromPush', () => {
  it('marque enabled=false en DB puis appelle sub.unsubscribe()', async () => {
    currentSubscription = fakeSub();
    const mod = await import('./pushSubscription');
    await mod.unsubscribeFromPush();
    expect(updateEqMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('no-op si pas de souscription existante', async () => {
    currentSubscription = null;
    const mod = await import('./pushSubscription');
    await mod.unsubscribeFromPush();
    expect(updateEqMock).not.toHaveBeenCalled();
    expect(unsubscribeMock).not.toHaveBeenCalled();
  });
});

describe('pushSubscription — isPushSubscribed', () => {
  it('renvoie true si pushManager.getSubscription() retourne une sub', async () => {
    currentSubscription = fakeSub();
    const mod = await import('./pushSubscription');
    expect(await mod.isPushSubscribed()).toBe(true);
  });

  it('renvoie false sinon', async () => {
    currentSubscription = null;
    const mod = await import('./pushSubscription');
    expect(await mod.isPushSubscribed()).toBe(false);
  });
});
