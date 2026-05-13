import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMockDate, getNow, setMockDate, __MOCK_DATE_STORAGE_KEY } from './clock';

// Stub localStorage en environnement node — clock.ts est web-first mais
// testé en mode node pour éviter le double-coût jsdom.
const memStore = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memStore.set(k, v); },
  removeItem: (k: string) => { memStore.delete(k); },
  clear: () => { memStore.clear(); },
  key: (i: number) => Array.from(memStore.keys())[i] ?? null,
  get length() { return memStore.size; },
};

describe('clock — getNow / setMockDate / getMockDate', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageStub);
    memStore.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    memStore.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns a fresh Date when no mock is set', () => {
    const before = Date.now();
    const now = getNow();
    const after = Date.now();
    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });

  it('honors a yyyy-MM-dd mock stored via setMockDate', () => {
    setMockDate('2026-08-15');
    const now = getNow();
    expect(now.getUTCFullYear()).toBe(2026);
    expect(now.getUTCMonth()).toBe(7); // août
    expect(now.getUTCDate()).toBe(15);
  });

  it('clears the mock when setMockDate(null) is called', () => {
    setMockDate('2026-08-15');
    expect(getMockDate()?.getUTCFullYear()).toBe(2026);
    setMockDate(null);
    expect(getMockDate()).toBeNull();
  });

  it('falls back to new Date() if stored mock is invalid', () => {
    localStorage.setItem(__MOCK_DATE_STORAGE_KEY, 'not-a-date');
    const now = getNow();
    expect(Number.isNaN(now.getTime())).toBe(false);
    // Doit être proche de la vraie date courante
    expect(now.getUTCFullYear()).toBeGreaterThanOrEqual(2025);
  });

  it('rejects dates outside [2020, 2050]', () => {
    setMockDate('1999-01-01');
    const now1 = getNow();
    expect(now1.getUTCFullYear()).not.toBe(1999);

    setMockDate('2099-01-01');
    const now2 = getNow();
    expect(now2.getUTCFullYear()).not.toBe(2099);
  });

  it('getMockDate returns null when no mock is set', () => {
    expect(getMockDate()).toBeNull();
  });

  it('coexists with vi.setSystemTime (real timers path)', () => {
    vi.useFakeTimers();
    const fakeNow = new Date('2027-03-15T12:00:00Z');
    vi.setSystemTime(fakeNow);
    // No mock → getNow() délègue à new Date() qui est intercepté par vi
    const now = getNow();
    expect(now.getUTCFullYear()).toBe(2027);
    expect(now.getUTCMonth()).toBe(2); // mars
  });
});
