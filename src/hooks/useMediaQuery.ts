import { useEffect, useState } from 'react';

/**
 * Réactif au resize : retourne true si la `query` matche le viewport courant.
 * Default false en SSR / jsdom (pas de window.matchMedia) — convient aux tests.
 */
export function useMediaQuery(query: string): boolean {
  const getInitial = (): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent): void => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export default useMediaQuery;
