import { useEffect, useRef, useState } from 'react';
import {
  getQueueLength,
  getErrorCount,
  isOnline as readIsOnline,
  installOnlineFlushListener,
  flushQueue,
} from '../services/offlineQueue';

export interface OfflineQueueState {
  pendingCount: number;
  isOnline: boolean;
  isFlushing: boolean;
  /** Nombre d'items en queue avec au moins un échec passé. */
  errorCount: number;
}

const POLL_INTERVAL_MS = 2000;

/**
 * Source de vérité unique pour l'UI : queue offline + connectivité +
 * indicateur de flush en cours. Polling léger toutes les 2s + listeners
 * `online`/`offline`. Auto-flush installé au mount du premier consommateur.
 */
export function useOfflineQueue(): OfflineQueueState {
  const [state, setState] = useState<OfflineQueueState>(() => ({
    pendingCount: safeGetQueueLength(),
    isOnline: readIsOnline(),
    isFlushing: false,
    errorCount: safeGetErrorCount(),
  }));

  const flushingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const refresh = (): void => {
      if (!mounted) return;
      setState((prev) => {
        const next: OfflineQueueState = {
          pendingCount: safeGetQueueLength(),
          isOnline: readIsOnline(),
          isFlushing: flushingRef.current,
          errorCount: safeGetErrorCount(),
        };
        if (
          prev.pendingCount === next.pendingCount &&
          prev.isOnline === next.isOnline &&
          prev.isFlushing === next.isFlushing &&
          prev.errorCount === next.errorCount
        ) {
          return prev;
        }
        return next;
      });
    };

    const wrappedFlush = async (): Promise<void> => {
      if (flushingRef.current) return;
      flushingRef.current = true;
      refresh();
      try {
        await flushQueue();
      } finally {
        flushingRef.current = false;
        refresh();
      }
    };

    const unsubscribeOnline = installOnlineFlushListener(wrappedFlush);

    const onOnline = (): void => refresh();
    const onOffline = (): void => refresh();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    refresh();

    return () => {
      mounted = false;
      unsubscribeOnline();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(interval);
    };
  }, []);

  return state;
}

function safeGetQueueLength(): number {
  try {
    return getQueueLength();
  } catch {
    return 0;
  }
}

function safeGetErrorCount(): number {
  try {
    return getErrorCount();
  } catch {
    return 0;
  }
}
