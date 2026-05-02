// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installOnlineFlushListener, isOnline } from './offlineQueue';

describe('installOnlineFlushListener', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appelle flushFn quand l\'event "online" est dispatché', () => {
    const flushFn = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = installOnlineFlushListener(flushFn);

    window.dispatchEvent(new Event('online'));

    expect(flushFn).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("n'appelle plus flushFn après unsubscribe", () => {
    const flushFn = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = installOnlineFlushListener(flushFn);
    unsubscribe();

    window.dispatchEvent(new Event('online'));

    expect(flushFn).not.toHaveBeenCalled();
  });

  it("ne propage pas une erreur de flushFn (catch interne)", async () => {
    const error = new Error('boom');
    const flushFn = vi.fn().mockRejectedValue(error);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unsubscribe = installOnlineFlushListener(flushFn);

    expect(() => window.dispatchEvent(new Event('online'))).not.toThrow();

    // laisse le tick async se résoudre
    await new Promise((r) => setTimeout(r, 0));

    expect(flushFn).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    unsubscribe();
  });
});

describe('isOnline', () => {
  it('retourne true par défaut quand navigator.onLine est true', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    expect(isOnline()).toBe(true);
  });

  it('retourne false quand navigator.onLine est false', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    expect(isOnline()).toBe(false);
  });
});
