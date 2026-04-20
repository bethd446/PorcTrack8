/**
 * Helpers d'accessibilité partagés par les Quick*Forms.
 * ═══════════════════════════════════════════════════════════════════════════
 * Ce module regroupe :
 *
 *   • shouldCloseOnKey   — fonction pure : renvoie `true` si la touche pressée
 *     doit fermer la sheet (Escape). Testable sans DOM.
 *
 *   • useEscapeKey       — hook React qui attache un listener `keydown` au
 *     document tant que `isOpen` est `true`. Permet de fermer la BottomSheet
 *     avec la touche Esc, même lorsque le focus est sur un input.
 *
 *   • useFocusFirstInput — hook React qui retourne une `ref` à accrocher sur
 *     le premier champ du formulaire. Focus auto à l'ouverture (après que la
 *     BottomSheet d'Ionic ait eu le temps d'animer son apparition).
 *
 * Ces helpers sont volontairement isolés dans un module .ts léger, sans
 * dépendance à Ionic, pour faciliter les tests en environnement `node`.
 */
import { useEffect, useRef, type RefObject } from 'react';

/**
 * Retourne `true` si la touche doit déclencher la fermeture du formulaire.
 * Pure (pas d'accès DOM) → testable directement.
 */
export function shouldCloseOnKey(
  e: Pick<KeyboardEvent, 'key' | 'defaultPrevented'>,
): boolean {
  if (e.defaultPrevented) return false;
  return e.key === 'Escape' || e.key === 'Esc';
}

/**
 * Écoute la touche Escape tant que `isOpen` est `true` et appelle `onClose`.
 * Listener attaché à `document` (niveau capture par défaut — bubbling) pour
 * fonctionner même quand le focus est posé sur un input/textarea.
 */
export function useEscapeKey(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent): void => {
      if (shouldCloseOnKey(e)) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);
}

/**
 * Ref à poser sur le premier input d'un form : focus automatique à l'ouverture.
 * Délai de 120ms pour laisser à la BottomSheet (IonModal) le temps de monter
 * et de positionner le contenu avant qu'on vole le focus.
 *
 * Générique pour accepter input, textarea ou select.
 */
export function useFocusFirstInput<
  T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
>(isOpen: boolean, delayMs = 120): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      try {
        el.focus({ preventScroll: true } as FocusOptions);
      } catch {
        el.focus();
      }
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [isOpen, delayMs]);
  return ref;
}
