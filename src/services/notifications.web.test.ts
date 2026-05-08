/**
 * Tests unitaires — notifications.ts (Web PWA path)
 * ═══════════════════════════════════════════════════
 * On teste uniquement les helpers Web (V72) : isWebSupported,
 * getWebPermission, requestWebPermission, getNotifCategories,
 * setNotifCategories, isPromptDismissed, dismissPrompt,
 * showLocal, notifyCriticalAlerts.
 *
 * Le path natif (LocalNotifications) reste couvert par les tests
 * d'intégration sur device.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FarmAlert } from './alertEngine';

// ── Mock Capacitor : on force le mode web (non-native) ──────────────────────
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

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn(async () => ({ display: 'denied' })),
    schedule: vi.fn(async () => ({ notifications: [] })),
    getPending: vi.fn(async () => ({ notifications: [] })),
    cancel: vi.fn(async () => undefined),
  },
}));

// ── Shim localStorage ───────────────────────────────────────────────────────
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

// ── Mock Notification API ──────────────────────────────────────────────────
let permissionState: NotificationPermission = 'default';
const requestPermissionMock = vi.fn(async (): Promise<NotificationPermission> => 'granted');
const showNotificationMock = vi.fn(async () => undefined);

function installWebNotifGlobals(): void {
  const NotifCtor = function () {} as unknown as typeof Notification;
  Object.defineProperty(NotifCtor, 'permission', { get: () => permissionState, configurable: true });
  Object.defineProperty(NotifCtor, 'requestPermission', {
    value: requestPermissionMock,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'Notification', {
    value: NotifCtor,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: {
      Notification: NotifCtor,
      ServiceWorkerRegistration: { prototype: { showNotification: showNotificationMock } },
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'ServiceWorkerRegistration', {
    value: { prototype: { showNotification: showNotificationMock } },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      serviceWorker: {
        getRegistration: vi.fn(async () => ({ showNotification: showNotificationMock })),
      },
    },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
  permissionState = 'default';
  requestPermissionMock.mockClear();
  showNotificationMock.mockClear();
  installWebNotifGlobals();
});

afterEach(() => {
  vi.clearAllMocks();
});

const makeAlert = (over: Partial<FarmAlert>): FarmAlert => ({
  id: over.id ?? 'MB-T001',
  priority: over.priority ?? 'CRITIQUE',
  category: over.category ?? 'REPRO',
  subjectId: over.subjectId ?? 'T001',
  subjectLabel: over.subjectLabel ?? 'T-001',
  title: over.title ?? 'Mise-bas imminente',
  message: over.message ?? 'T-001 prévue dans 2 jours.',
  requiresAction: over.requiresAction ?? true,
  actions: over.actions ?? [],
  createdAt: over.createdAt ?? new Date(),
  dueDate: over.dueDate,
  daysOffset: over.daysOffset,
  meta: over.meta,
});

describe('notifications.web — support detection', () => {
  it('isWebSupported() vrai si Notification + serviceWorker présents', async () => {
    const mod = await import('./notifications');
    expect(mod.isWebSupported()).toBe(true);
  });

  it('getWebPermission() reflète Notification.permission', async () => {
    permissionState = 'granted';
    const mod = await import('./notifications');
    expect(mod.getWebPermission()).toBe('granted');
  });
});

describe('notifications.web — categories', () => {
  it('getNotifCategories() renvoie tout `true` par défaut', async () => {
    const mod = await import('./notifications');
    const cats = mod.getNotifCategories();
    expect(cats).toEqual({ mise_bas: true, stocks: true, cycles_repro: true });
  });

  it('setNotifCategories() persiste et getNotifCategories() relit', async () => {
    const mod = await import('./notifications');
    await mod.setNotifCategories({ mise_bas: true, stocks: false, cycles_repro: true });
    expect(mod.getNotifCategories()).toEqual({
      mise_bas: true,
      stocks: false,
      cycles_repro: true,
    });
  });

  it('JSON corrompu → retombe sur les défauts', async () => {
    localStorage.setItem('pt:notif_categories', '{not-json');
    const mod = await import('./notifications');
    expect(mod.getNotifCategories()).toEqual({
      mise_bas: true,
      stocks: true,
      cycles_repro: true,
    });
  });
});

describe('notifications.web — dismiss banner', () => {
  it('isPromptDismissed() faux si jamais dismissé', async () => {
    const mod = await import('./notifications');
    expect(mod.isPromptDismissed()).toBe(false);
  });

  it('dismissPrompt() puis isPromptDismissed() vrai dans la fenêtre 7j', async () => {
    const mod = await import('./notifications');
    const now = new Date('2026-05-08T10:00:00Z');
    await mod.dismissPrompt(now);
    const inSixDays = new Date('2026-05-14T10:00:00Z');
    expect(mod.isPromptDismissed(inSixDays)).toBe(true);
  });

  it('isPromptDismissed() faux après 7j', async () => {
    const mod = await import('./notifications');
    const now = new Date('2026-05-08T10:00:00Z');
    await mod.dismissPrompt(now);
    const inEightDays = new Date('2026-05-16T10:00:00Z');
    expect(mod.isPromptDismissed(inEightDays)).toBe(false);
  });
});

describe('notifications.web — requestWebPermission', () => {
  it('si permission déjà accordée, ne re-prompt pas', async () => {
    permissionState = 'granted';
    const mod = await import('./notifications');
    const result = await mod.requestWebPermission();
    expect(result).toBe('granted');
    expect(requestPermissionMock).not.toHaveBeenCalled();
  });

  it('si default, prompt et renvoie le résultat', async () => {
    permissionState = 'default';
    requestPermissionMock.mockResolvedValueOnce('granted');
    const mod = await import('./notifications');
    const result = await mod.requestWebPermission();
    expect(result).toBe('granted');
    expect(requestPermissionMock).toHaveBeenCalledOnce();
  });
});

describe('notifications.web — notifyCriticalAlerts', () => {
  it('skip si permission ≠ granted', async () => {
    permissionState = 'default';
    const mod = await import('./notifications');
    await mod.__resetWebNotifStateForTests();
    const sent = await mod.notifyCriticalAlerts([makeAlert({ id: 'MB-T001' })]);
    expect(sent).toBe(0);
    expect(showNotificationMock).not.toHaveBeenCalled();
  });

  it('notifie une alerte CRITIQUE non encore notifiée', async () => {
    permissionState = 'granted';
    const mod = await import('./notifications');
    await mod.__resetWebNotifStateForTests();
    const sent = await mod.notifyCriticalAlerts([
      makeAlert({ id: 'MB-T001', priority: 'CRITIQUE' }),
    ]);
    expect(sent).toBe(1);
    expect(showNotificationMock).toHaveBeenCalledOnce();
  });

  it('ignore les priorités NORMALE / INFO', async () => {
    permissionState = 'granted';
    const mod = await import('./notifications');
    await mod.__resetWebNotifStateForTests();
    const sent = await mod.notifyCriticalAlerts([
      makeAlert({ id: 'MB-T002', priority: 'NORMALE' }),
      makeAlert({ id: 'MB-T003', priority: 'INFO' }),
    ]);
    expect(sent).toBe(0);
  });

  it('dédoublonne entre 2 appels successifs (kvStore)', async () => {
    permissionState = 'granted';
    const mod = await import('./notifications');
    await mod.__resetWebNotifStateForTests();
    const alert = makeAlert({ id: 'MB-T001' });
    const first = await mod.notifyCriticalAlerts([alert]);
    const second = await mod.notifyCriticalAlerts([alert]);
    expect(first).toBe(1);
    expect(second).toBe(0);
    expect(showNotificationMock).toHaveBeenCalledOnce();
  });

  it('ignore une alerte STK si catégorie stocks=false', async () => {
    permissionState = 'granted';
    const mod = await import('./notifications');
    await mod.__resetWebNotifStateForTests();
    await mod.setNotifCategories({ mise_bas: true, stocks: false, cycles_repro: true });
    const sent = await mod.notifyCriticalAlerts([
      makeAlert({ id: 'STK-MAIS', priority: 'CRITIQUE' }),
    ]);
    expect(sent).toBe(0);
  });

  it('purge les ids notifiés qui ne sont plus dans la liste', async () => {
    permissionState = 'granted';
    const mod = await import('./notifications');
    await mod.__resetWebNotifStateForTests();
    await mod.notifyCriticalAlerts([makeAlert({ id: 'MB-T001' })]);
    // L'alerte MB-T001 disparaît, MB-T002 apparaît
    const sent = await mod.notifyCriticalAlerts([makeAlert({ id: 'MB-T002' })]);
    expect(sent).toBe(1);
    // Si MB-T001 réapparaît plus tard → re-notifié (purge OK)
    const sent2 = await mod.notifyCriticalAlerts([makeAlert({ id: 'MB-T001' })]);
    expect(sent2).toBe(1);
  });
});
