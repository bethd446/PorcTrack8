import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import GlobalSearch from '../components/GlobalSearch';
import { useGlobalSearchHotkey } from '../hooks/useGlobalSearchHotkey';

interface GlobalSearchContextValue {
  openSearch: () => void;
  closeSearch: () => void;
  isOpen: boolean;
}

const Ctx = createContext<GlobalSearchContextValue | null>(null);

/**
 * Provider monté au shell : expose `openSearch()` à tous les écrans
 * et monte le composant `GlobalSearch` une seule fois (Portal).
 * Bind aussi le hotkey Cmd+K / Ctrl+K.
 */
export const GlobalSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setOpen] = useState(false);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  useGlobalSearchHotkey(openSearch);

  const value = useMemo<GlobalSearchContextValue>(
    () => ({ openSearch, closeSearch, isOpen }),
    [openSearch, closeSearch, isOpen],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <GlobalSearch open={isOpen} onClose={closeSearch} />
    </Ctx.Provider>
  );
};

/** Hook safe : retourne `null` hors provider (les hubs hors AppShell ne crashent pas). */
// eslint-disable-next-line react-refresh/only-export-components
export function useGlobalSearch(): GlobalSearchContextValue | null {
  return useContext(Ctx);
}
