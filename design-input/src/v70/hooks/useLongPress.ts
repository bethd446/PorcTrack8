/**
 * V70 — useLongPress (Sprint 8 patterns transverses)
 *
 * Hook utilitaire qui détecte un long-press sur un élément. Retourne des
 * props à spreader sur l'élément cible : onPointerDown / onPointerUp /
 * onPointerLeave / onPointerCancel.
 *
 * Usage :
 *   const longPress = useLongPress(() => setSheetOpen(true), 500);
 *   <div {...longPress}>...</div>
 */
import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface LongPressHandlers {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerLeave: (e: ReactPointerEvent) => void;
  onPointerCancel: (e: ReactPointerEvent) => void;
}

export function useLongPress(
  callback: () => void,
  ms: number = 500,
): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    triggeredRef.current = false;
    clear();
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      callback();
    }, ms);
  }, [callback, ms, clear]);

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerLeave = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  return { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel };
}
