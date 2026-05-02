/**
 * @deprecated Migrer vers `useOfflineQueue` (RT2) qui expose `pendingCount`,
 * `isOnline`, `isFlushing` plutôt qu'un `SyncState` agrégé.
 * Conservé pour `SyncIndicator` / `TopBarSync` legacy.
 */
import { useSyncExternalStore } from 'react';
import type { SyncState } from '../components/design/SyncIndicator';
import { getQueueLength } from '../services/offlineQueue';

function subscribe(cb: () => void): () => void {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  const interval = window.setInterval(cb, 5000);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
    window.clearInterval(interval);
  };
}

function getSnapshot(): SyncState {
  if (typeof navigator === 'undefined') return 'online';
  if (!navigator.onLine) return 'offline';
  try {
    const pending = getQueueLength?.() ?? 0;
    if (pending > 0) return 'pending';
  } catch {
    // queue indisponible — ignorer
  }
  return 'online';
}

function getServerSnapshot(): SyncState {
  return 'online';
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
