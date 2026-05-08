/**
 * useEntityWithRetry — V74 Vague U
 * ════════════════════════════════════════════════════════════════════════════
 * Hook défense-en-profondeur pour les vues "Detail" (truie, verrat, bande,
 * loge, etc.). Élimine la classe de bug "X introuvable" affichée alors que
 * - le contexte FarmContext n'est pas encore chargé (deeplink, hard refresh)
 * - le store local est stale après un switch de ferme
 *
 * Comportement :
 *   1. Si `loading` (FarmContext) → state 'loading' (afficher spinner)
 *   2. Si entity absente et pas encore retried → déclenche refreshData(true)
 *      une seule fois, en attendant on reste en 'loading'
 *   3. Si retry effectué et toujours absente → state 'not-found' (afficher
 *      EntityNotFoundCard)
 *   4. Sinon → state 'ready' avec entity non-null
 *
 * Anti-spam : `retried` est un flag local — un seul refreshData par mount.
 */
import { useEffect, useState } from 'react';
import { useFarm } from '../context/FarmContext';

export type EntityRetryState<T> =
  | { state: 'loading'; entity: null }
  | { state: 'not-found'; entity: null }
  | { state: 'ready'; entity: T };

export function useEntityWithRetry<T>(
  entity: T | undefined | null,
): EntityRetryState<T> {
  const { loading, refreshData } = useFarm();
  const [retried, setRetried] = useState(false);

  useEffect(() => {
    if (!entity && !retried && !loading) {
      setRetried(true);
      void refreshData(true);
    }
  }, [entity, retried, loading, refreshData]);

  if (loading || (!entity && !retried)) {
    return { state: 'loading', entity: null };
  }
  if (!entity) {
    return { state: 'not-found', entity: null };
  }
  return { state: 'ready', entity };
}
