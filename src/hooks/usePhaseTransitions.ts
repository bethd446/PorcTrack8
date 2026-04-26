// src/hooks/usePhaseTransitions.ts
import { useState, useMemo, useCallback } from 'react';
import { useFarm } from '../context/FarmContext';
import {
  detectPendingTransitions,
  enqueueTransition,
  type PendingTransition,
} from '../services/phaseEngine';

const SESSION_KEY = 'porctrack_dismissed_transitions';

function getDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export function usePhaseTransitions() {
  const { bandes } = useFarm();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  const today = useMemo(() => new Date(), []);

  const pending = useMemo(
    () => detectPendingTransitions(bandes, today).filter(
      (t) => !dismissed.has(t.bandeId),
    ),
    [bandes, today, dismissed],
  );

  const current = pending[0] ?? null;

  const dismiss = useCallback((bandeId: string): void => {
    setDismissed((prev) => {
      const next = new Set<string>(prev).add(bandeId);
      saveDismissed(next);
      return next;
    });
  }, []);

  const confirm = useCallback(
    async (transition: PendingTransition, poidsKg?: number): Promise<void> => {
      await enqueueTransition(transition, 'PORCHER', poidsKg);
      dismiss(transition.bandeId);
    },
    [dismiss],
  );

  return { pending, current, confirm, dismiss };
}
