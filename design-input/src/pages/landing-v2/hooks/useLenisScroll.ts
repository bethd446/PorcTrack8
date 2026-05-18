import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Init Lenis smooth scroll. Skippé si l'utilisateur a `prefers-reduced-motion`.
 * Le RAF loop est arrêté au cleanup pour éviter les fuites lors du démontage
 * de la route.
 */
export function useLenisScroll() {
  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
}
