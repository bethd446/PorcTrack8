/**
 * usePeseePending — pesées planifiées non effectuées (polling 60s + focus).
 * ════════════════════════════════════════════════════════════════════════
 * Source : `peseePlanifieesService.listPeseePending()`.
 * Refresh : intervalle 60s, écoute `visibilitychange` + `focus`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { listPeseePending, type PeseePlanifiee } from '../services/peseePlanifieesService';

const POLL_INTERVAL_MS = 60_000;

export function usePeseePending(): {
  pesees: PeseePlanifiee[];
  loading: boolean;
  refresh: () => void;
} {
  const [pesees, setPesees] = useState<PeseePlanifiee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const mountedRef = useRef(true);

  const fetchPesees = useCallback(async (): Promise<void> => {
    try {
      const data = await listPeseePending();
      if (mountedRef.current) {
        setPesees(data);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const refresh = useCallback((): void => {
    void fetchPesees();
  }, [fetchPesees]);

  useEffect(() => {
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch initial au mount (+ polling interval + focus/visibilité). fetchPesees est async et protégé par mountedRef — pas de cascade réelle.
    void fetchPesees();

    const interval = setInterval(() => {
      void fetchPesees();
    }, POLL_INTERVAL_MS);

    const onFocus = (): void => {
      void fetchPesees();
    };
    const onVis = (): void => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchPesees();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVis);
    }

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, [fetchPesees]);

  return { pesees, loading, refresh };
}
