import { useEffect } from 'react';

/**
 * Bind Cmd+K / Ctrl+K au handler `onOpen`.
 * Pré-empte le keystroke (preventDefault) pour éviter le find natif Chrome.
 */
export function useGlobalSearchHotkey(onOpen: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
}
