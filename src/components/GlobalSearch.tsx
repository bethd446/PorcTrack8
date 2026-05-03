import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Hash, Heart, Layers, Search, X } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { searchAll, type SearchResult, type SearchResultType } from '../services/searchEntities';
import { cn } from '../lib/utils';

export interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const ICON_BY_TYPE: Record<SearchResultType, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  truie: Heart,
  verrat: Hash,
  bande: Layers,
};

const LABEL_BY_TYPE: Record<SearchResultType, string> = {
  truie: 'Truie',
  verrat: 'Verrat',
  bande: 'Bande',
};

const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { truies, verrats, bandes } = useFarm();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<SearchResult[]>(
    () => searchAll(query, { truies, verrats, bandes }, 20),
    [query, truies, verrats, bandes],
  );

  // Reset query + focus input à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // requestAnimationFrame : laisse le portal se monter avant de focus
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Reset activeIndex quand la liste change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = (): void => {
    onClose();
  };

  const select = (r: SearchResult): void => {
    navigate(r.href);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) select(r);
    }
  };

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recherche globale"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[1000] flex items-start justify-center"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer la recherche"
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-[1] flex w-full flex-col overflow-hidden shadow-2xl',
          // Mobile : full-screen ; desktop : dialog centré
          'h-[100dvh] sm:h-auto sm:max-h-[80vh] sm:mt-12',
          'sm:max-w-[560px] sm:rounded-xl',
        )}
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderColor: 'var(--line)',
        }}
      >
        {/* Header / input */}
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--line, #e5e7eb)' }}
        >
          <Search size={18} aria-hidden="true" className="shrink-0 text-[color:var(--text-2,#64748b)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une boucle, un nom, une portée…"
            aria-label="Texte de recherche"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[color:var(--text-3,#94a3b8)]"
            style={{ color: 'var(--text-0, #0f172a)' }}
          />
          <button
            type="button"
            onClick={close}
            aria-label="Fermer la recherche"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-[color:var(--bg-2,#f1f5f9)]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Résultats de recherche">
          {query.trim() === '' ? (
            <div className="px-4 py-6 text-center text-[13px] text-[color:var(--text-2,#64748b)]">
              Tape un numéro de boucle, un nom de truie ou un identifiant de bande.
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-[color:var(--text-2,#64748b)]">
              Aucun résultat pour "{query}".
            </div>
          ) : (
            <ul className="py-1">
              {results.map((r, i) => {
                const Icon = ICON_BY_TYPE[r.type];
                const active = i === activeIndex;
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => select(r)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        active
                          ? 'bg-[color:var(--bg-2,#f1f5f9)]'
                          : 'hover:bg-[color:var(--bg-2,#f1f5f9)]',
                      )}
                    >
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: 'var(--accent-soft, #d1fae5)',
                          color: 'var(--accent, #065f46)',
                        }}
                        aria-hidden="true"
                      >
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate text-[14px]"
                            style={{ color: 'var(--text-0, #0f172a)' }}
                          >
                            {r.primary}
                          </span>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide"
                            style={{
                              background: 'var(--bg-2, #f1f5f9)',
                              color: 'var(--text-2, #64748b)',
                            }}
                          >
                            {LABEL_BY_TYPE[r.type]}
                          </span>
                        </div>
                        {r.secondary ? (
                          <div className="truncate text-[12px] text-[color:var(--text-2,#64748b)]">
                            {r.secondary}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div
          className="hidden items-center justify-between border-t px-4 py-2 text-[12px] text-[color:var(--text-2,#64748b)] sm:flex"
          style={{ borderColor: 'var(--line, #e5e7eb)' }}
        >
          <span>Entrée pour ouvrir · Échap pour fermer</span>
          <span className="font-mono">Cmd K</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default GlobalSearch;
