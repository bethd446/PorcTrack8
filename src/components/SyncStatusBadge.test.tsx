// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import SyncStatusBadge from './SyncStatusBadge';

vi.mock('../services/offlineQueue', () => {
  let _len = 0;
  return {
    getQueueLength: () => _len,
    isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    installOnlineFlushListener: () => () => {},
    flushQueue: vi.fn().mockResolvedValue(undefined),
    __setLen: (n: number) => {
      _len = n;
    },
  };
});

import * as queueMock from '../services/offlineQueue';

function setOnline(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setOnline(true);
  // @ts-expect-error helper exposé par le mock
  queueMock.__setLen(0);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('SyncStatusBadge', () => {
  it("ne s'affiche pas par défaut quand online et pendingCount=0", () => {
    const { container } = render(<SyncStatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('affiche "{n} en attente" quand pendingCount > 0', () => {
    // @ts-expect-error helper
    queueMock.__setLen(3);
    render(<SyncStatusBadge />);
    expect(screen.getByText(/3 en attente/i)).toBeTruthy();
  });

  it('affiche "Hors ligne" quand offline', () => {
    setOnline(false);
    render(<SyncStatusBadge />);
    expect(screen.getByText(/hors ligne/i)).toBeTruthy();
  });

  it('réagit aux events online/offline', () => {
    const { container } = render(<SyncStatusBadge />);
    expect(container.firstChild).toBeNull();

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText(/hors ligne/i)).toBeTruthy();
  });

  it('affiche "Synchro OK" quand showWhenIdle', () => {
    render(<SyncStatusBadge showWhenIdle />);
    expect(screen.getByText(/synchro ok/i)).toBeTruthy();
  });
});
