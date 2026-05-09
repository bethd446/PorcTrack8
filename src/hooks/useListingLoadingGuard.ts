/**
 * useListingLoadingGuard — V74 Vague V
 * ════════════════════════════════════════════════════════════════════════════
 * Hook compagnon de `useEntityWithRetry` (Vague U) pour les LISTINGS.
 *
 * Élimine la classe de bug "faux empty state pendant le chargement initial" :
 * un listing voit `items=[]` avant que FarmContext ait fini son `refreshAll()`
 * et affiche "Aucune truie" pendant 1-2 s, puis 50 truies surgissent. Mauvaise
 * UX terrain (Christophe pense que la donnée est perdue).
 *
 * Pattern recommandé :
 *   const { loading } = useMeta();
 *   const isInitialLoading = useListingLoadingGuard(loading, items.length);
 *   if (isInitialLoading) return <SkeletonRows count={3} />;
 *   if (items.length === 0) return <EmptyState ... />;
 *
 * Stratégie minimaliste : retourne `true` UNIQUEMENT pendant le `loading` du
 * FarmContext. Quand `loading=false` ET `itemCount=0`, on laisse l'appelant
 * afficher son empty state (cas légitime "Aucun X enregistré"). Le hook
 * mémorise quand-même si on a vu de la data une fois non vide pour permettre
 * aux consommateurs avancés (lecture du flag via `hasSeenData`) si besoin.
 */
import { useEffect, useRef } from 'react';

export function useListingLoadingGuard(
  loading: boolean,
  itemCount: number,
): boolean {
  const hasSeenDataRef = useRef(false);
  useEffect(() => {
    if (itemCount > 0) {
      hasSeenDataRef.current = true;
    }
  }, [itemCount]);
  return loading;
}
