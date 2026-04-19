/**
 * Tests unitaires — kvStore (web mode / localStorage fallback)
 * ═════════════════════════════════════════════════════════════
 * On teste uniquement le chemin web (non-native) : le cache mémoire natif
 * demande le binding Capacitor qui n'est pas dispo en Node/vitest.
 * Le chemin natif est couvert manuellement sur device.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock Capacitor : on force le mode web (non-native) ──────────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: (): boolean => false,
  },
}));

// ── Mock Preferences (ne doit pas être appelé en mode web, mais on le stub) ─
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    keys: vi.fn(async () => ({ keys: [] })),
    clear: vi.fn(async () => undefined),
  },
}));

// ── Shim localStorage en environnement Node ──────────────────────────────────
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

beforeEach(() => {
  // Réinstancier pour isoler chaque test
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Import AFTER le mock (sinon Capacitor.isNativePlatform() serait réel) ───
import {
  kvGet,
  kvSet,
  kvRemove,
  kvClear,
  hydrateKvStore,
  migrateLegacyLocalStorage,
  __resetKvCacheForTests,
} from './kvStore';

beforeEach(() => {
  __resetKvCacheForTests();
});

describe('kvStore (web mode)', () => {
  it('kvGet returns null for missing key', () => {
    expect(kvGet('missing')).toBeNull();
  });

  it('kvSet then kvGet round-trips the value', async () => {
    await kvSet('gas_url', 'https://example.com/api');
    expect(kvGet('gas_url')).toBe('https://example.com/api');
    // Vérifie aussi que localStorage est bien écrit (fallback web)
    expect(localStorage.getItem('gas_url')).toBe('https://example.com/api');
  });

  it('kvRemove deletes the key and kvGet returns null after', async () => {
    await kvSet('device_id', 'DEV-ABC123');
    expect(kvGet('device_id')).toBe('DEV-ABC123');
    await kvRemove('device_id');
    expect(kvGet('device_id')).toBeNull();
  });

  it('kvClear wipes all keys', async () => {
    await kvSet('k1', 'v1');
    await kvSet('k2', 'v2');
    await kvSet('k3', 'v3');
    await kvClear();
    expect(kvGet('k1')).toBeNull();
    expect(kvGet('k2')).toBeNull();
    expect(kvGet('k3')).toBeNull();
  });

  it('kvSet overwrites existing value', async () => {
    await kvSet('user_name', 'Alice');
    await kvSet('user_name', 'Bob');
    expect(kvGet('user_name')).toBe('Bob');
  });

  it('hydrateKvStore is a no-op on web (resolves without error)', async () => {
    await expect(hydrateKvStore()).resolves.toBeUndefined();
  });

  it('migrateLegacyLocalStorage is a no-op on web (resolves without error)', async () => {
    localStorage.setItem('gas_url', 'https://legacy.example');
    await expect(migrateLegacyLocalStorage()).resolves.toBeUndefined();
    // En mode web, la valeur reste dans localStorage (pas de migration requise)
    expect(localStorage.getItem('gas_url')).toBe('https://legacy.example');
  });
});
