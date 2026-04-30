/**
 * useAutoRefresh — Hook unifié de rafraîchissement des données.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Centralise le pattern UX de remise à jour automatique appliqué sur le
 * Cockpit et les 4 hubs principaux (Troupeau, Cycles, Ressources, Pilotage).
 *
 * Comportements :
 *  1. **Auto-refresh on mount** : déclenche `refreshData()` au montage si la
 *     dernière mise à jour date de plus de `STALE_MS` (debounce 30 s).
 *  2. **Visibility change** : si l'onglet redevient visible et que les données
 *     sont périmées (> `STALE_MS`), déclenche un refresh.
 *  3. **Pull-to-refresh handler** : retourne un callback prêt à être branché
 *     sur `<IonRefresher onIonRefresh={...} />` ; appelle `refreshData()` puis
 *     `event.detail.complete()`.
 *
 * Hypothèses :
 *  - `lastUpdate` est un timestamp (ms) provenant de `useMeta()`.
 *  - `refreshData` est stable (memoisée via `useCallback` dans MetaProvider).
 */
import { useCallback, useEffect, useRef } from 'react';
import { useMeta } from '../context/FarmContext';

/** Délai de debounce — ne re-fetch pas si la dernière refresh date < 30 s. */
const STALE_MS = 30_000;

interface UseAutoRefreshResult {
  /** Handler pour `<IonRefresher onIonRefresh={...} />`. */
  handleRefresh: (event: CustomEvent<{ complete: () => void }>) => void;
}

export function useAutoRefresh(): UseAutoRefreshResult {
  const { refreshData, lastUpdate } = useMeta();
  // Snapshot ref pour éviter de re-créer les effets à chaque tick de lastUpdate.
  const lastUpdateRef = useRef<number>(lastUpdate);

  useEffect(() => {
    lastUpdateRef.current = lastUpdate;
  }, [lastUpdate]);

  // ── 1. Auto-refresh on mount (debounced 30 s) ──────────────────────────
  useEffect(() => {
    const age = Date.now() - lastUpdateRef.current;
    if (lastUpdateRef.current === 0 || age > STALE_MS) {
      void refreshData().catch(() => {
        /* silent : Le MetaProvider gère déjà les erreurs réseau (CACHE/FALLBACK). */
      });
    }
    // refreshData est stable ; on ne veut s'exécuter qu'au mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Refresh on visibility change ─────────────────────────────────────
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') return;
      const age = Date.now() - lastUpdateRef.current;
      if (age > STALE_MS) {
        void refreshData().catch(() => {
          /* silent */
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshData]);

  // ── 3. Pull-to-refresh handler ──────────────────────────────────────────
  const handleRefresh = useCallback(
    (event: CustomEvent<{ complete: () => void }>): void => {
      refreshData().finally(() => event.detail.complete());
    },
    [refreshData]
  );

  return { handleRefresh };
}
