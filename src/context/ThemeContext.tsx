/**
 * PorcTrack — ThemeContext (Jour/Nuit + Auto)
 * ══════════════════════════════════════════════════════════════════════════
 * Gère le mode thème utilisateur ('auto' | 'day' | 'night') et son thème
 * effectif ('day' | 'night'). Persiste le mode via kvStore (Capacitor
 * Preferences sur native, localStorage sur web).
 *
 * En mode 'auto', programme un setTimeout pour re-évaluer le thème pile au
 * prochain basculement horaire (6h ou 19h locaux).
 *
 * Les composants consomment soit via useTheme(), soit indirectement via les
 * classes Tailwind (.bg-bg-0, .text-text-0) qui résolvent sur var(--bg-0).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { kvGet, kvSet } from '../services/kvStore';
import { logger } from '../services/logger';
import {
  applyTheme,
  msUntilNextSwitch,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from '../services/themeAuto';

interface ThemeContextValue {
  /** Mode utilisateur persisté ('auto' | 'day' | 'night'). */
  mode: ThemeMode;
  /** Thème réellement appliqué (résolu à partir du mode + heure). */
  resolved: ResolvedTheme;
  /** Change le mode et persiste dans kvStore. */
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MODE_KEY = 'theme_mode';
const SCOPE = 'ThemeContext';

function readInitialMode(): ThemeMode {
  try {
    const raw = kvGet(MODE_KEY);
    if (raw === 'auto' || raw === 'day' || raw === 'night') return raw;
  } catch (e) {
    logger.warn(SCOPE, 'readInitialMode failed', e);
  }
  return 'auto';
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialMode = readInitialMode();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(resolveTheme(initialMode));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Applique le thème sur <html> à chaque changement de `resolved`.
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setMode = useCallback((m: ThemeMode): void => {
    setModeState(m);
    void kvSet(MODE_KEY, m).catch((e) => logger.warn(SCOPE, 'kvSet theme_mode failed', e));
    setResolved(resolveTheme(m));
  }, []);

  // En mode 'auto', reprogramme un timer pour re-évaluer au prochain switch.
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (mode !== 'auto') return;

    const ms = msUntilNextSwitch();
    timerRef.current = setTimeout(() => {
      setResolved(resolveTheme('auto'));
    }, ms + 1000); // +1s safety pour franchir la frontière horaire

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mode, resolved]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
