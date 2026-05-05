/**
 * V70 — UIPreferencesContext
 *
 * State minimal de préférences UI persistées localStorage.
 * - advancedMode : bool, expose tableaux détaillés + export CSV.
 */
import React, { createContext, useContext, useState } from 'react';

interface UIPreferences {
  advancedMode: boolean;
  setAdvancedMode: (v: boolean) => void;
}

const UIPreferencesContext = createContext<UIPreferences | undefined>(undefined);

const STORAGE_KEY = 'v70_advanced_mode';

export const UIPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [advancedMode, setAdvancedModeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const setAdvancedMode = (v: boolean) => {
    setAdvancedModeState(v);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(v));
    }
  };

  return (
    <UIPreferencesContext.Provider value={{ advancedMode, setAdvancedMode }}>
      {children}
    </UIPreferencesContext.Provider>
  );
};

const DEFAULT_PREFERENCES: UIPreferences = {
  advancedMode: false,
  setAdvancedMode: () => {
    // no-op fallback hors Provider — usage en lecture seule (defaults).
  },
};

export function useUIPreferences(): UIPreferences {
  const ctx = useContext(UIPreferencesContext);
  return ctx ?? DEFAULT_PREFERENCES;
}
