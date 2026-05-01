import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  PawPrint,
  Heart,
  Layers,
  LayoutGrid,
  BellRing,
  RotateCcw,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { useTroupeau } from '../../context/TroupeauContext';

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  group: 'Animaux' | 'Bandes' | 'Pages' | 'Actions';
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/**
 * CommandPalette — palette Cmd+K (desktop ≥1024px).
 * Fuzzy match maison (prefix + contient), pas de dépendance externe.
 */
const CommandPaletteImpl: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { truies, verrats, bandes } = useTroupeau();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset à chaque ouverture
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      // Autofocus avec un petit délai pour laisser le DOM monter
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const allItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Animaux — truies
    for (const t of truies) {
      items.push({
        id: `truie-${t.id}`,
        label: t.nom ? `${t.nom} (${t.displayId})` : `Truie ${t.displayId}`,
        hint: t.boucle ? `Boucle ${t.boucle}` : undefined,
        icon: PawPrint,
        group: 'Animaux',
        onSelect: () => navigate(`/troupeau/truies/${t.id}`),
      });
    }
    // Animaux — verrats
    for (const v of verrats) {
      items.push({
        id: `verrat-${v.id}`,
        label: v.nom ? `${v.nom} (${v.displayId})` : `Verrat ${v.displayId}`,
        hint: v.boucle ? `Boucle ${v.boucle}` : undefined,
        icon: Heart,
        group: 'Animaux',
        onSelect: () => navigate(`/troupeau/verrats/${v.id}`),
      });
    }
    // Bandes
    for (const b of bandes) {
      items.push({
        id: `bande-${b.id}`,
        label: `Bande ${b.idPortee || b.id}`,
        hint: b.statut,
        icon: Layers,
        group: 'Bandes',
        onSelect: () => navigate(`/troupeau/bandes/${b.id}`),
      });
    }

    // Pages
    const pages: Array<[string, string, LucideIcon]> = [
      ['Cockpit', '/cockpit', LayoutGrid],
      ['Alertes', '/alerts', BellRing],
      ['Audit du jour', '/audit', BellRing],
      ['Truies & Verrats', '/troupeau', PawPrint],
      ['Bandes', '/troupeau/bandes', Layers],
      ['Cycles · Maternité', '/cycles/maternite', RotateCcw],
      ['Cycles · Post-sevrage', '/cycles/post-sevrage', RotateCcw],
      ['Cycles · Croissance', '/cycles/croissance', RotateCcw],
      ['Cycles · Engraissement', '/cycles/engraissement', RotateCcw],
      ['Cycles · Finition', '/cycles/finition', RotateCcw],
      ['Cycles · Reproduction', '/cycles/repro', RotateCcw],
      ['Cycles · Sortie', '/cycles/sortie', RotateCcw],
      ['Pilotage · KPIs', '/pilotage/perf', BarChart3],
      ['Pilotage · Finances', '/pilotage/finances', BarChart3],
      ['Pilotage · Rapports', '/pilotage/finances/rapport', BarChart3],
      ['Pilotage · Prévisions', '/pilotage/previsions', BarChart3],
      ['Ressources · Aliments', '/ressources/aliments', Package],
      ['Ressources · Pharmacie', '/ressources/pharmacie', Package],
      ['Réglages', '/more', Settings],
      ['Aide', '/aide', HelpCircle],
    ];
    for (const [label, path, icon] of pages) {
      items.push({
        id: `page-${path}`,
        label,
        icon,
        group: 'Pages',
        onSelect: () => navigate(path),
      });
    }

    // Actions rapides — placeholders (route audit pour saisie terrain)
    const actions: string[] = ['Saillie', 'Mise-bas', 'Pesée', 'Mortalité', 'Note'];
    for (const a of actions) {
      items.push({
        id: `action-${a}`,
        label: a,
        hint: 'Action rapide',
        icon: Plus,
        group: 'Actions',
        onSelect: () => navigate('/audit'),
      });
    }

    return items;
  }, [truies, verrats, bandes, navigate]);

  // Fuzzy maison : score plus élevé pour prefix, contient (case-insensitive),
  // diacritics ignorés.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 30);
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
    const nq = norm(q);
    const scored = allItems
      .map((it) => {
        const hay = norm(`${it.label} ${it.hint ?? ''}`);
        if (!hay.includes(nq)) return { it, score: -1 };
        let score = 0;
        if (norm(it.label).startsWith(nq)) score += 100;
        if (hay.startsWith(nq)) score += 40;
        score += Math.max(0, 30 - hay.indexOf(nq));
        return { it, score };
      })
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((s) => s.it);
    return scored;
  }, [allItems, query]);

  // Reset l'index si la liste change
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIdx];
        if (item) {
          item.onSelect();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIdx, onClose]);

  // Scroll dans la liste pour garder l'item actif visible
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  // Group by group label, ordering preserved
  const groups: Array<{ name: string; items: CommandItem[] }> = [];
  for (const it of filtered) {
    let g = groups.find((x) => x.name === it.group);
    if (!g) {
      g = { name: it.group, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }

  // Index global pour les data-cmd-idx
  let runningIdx = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recherche globale"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17, 24, 39, 0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(600px, calc(100vw - 32px))',
          maxHeight: 500,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'InstrumentSans, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <Search size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher animal, bande, page, action..."
            aria-label="Recherche globale"
            style={{
              flex: 1,
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              fontSize: 15,
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              padding: '2px 6px',
              border: '1px solid var(--line)',
              borderRadius: 4,
              color: 'var(--muted)',
            }}
          >
            Esc
          </kbd>
        </div>

        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 14,
              }}
            >
              Aucun résultat
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.name}>
                <div
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    padding: '10px 16px 4px',
                  }}
                >
                  {g.name}
                </div>
                {g.items.map((it) => {
                  runningIdx += 1;
                  const myIdx = runningIdx;
                  const isActive = myIdx === activeIdx;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      data-cmd-idx={myIdx}
                      type="button"
                      onMouseEnter={() => setActiveIdx(myIdx)}
                      onClick={() => {
                        it.onSelect();
                        onClose();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 16px',
                        background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                        border: 0,
                        borderLeft: `3px solid ${
                          isActive ? 'var(--color-accent-500)' : 'transparent'
                        }`,
                        color: 'var(--ink-soft)',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 160ms var(--ease-emil)',
                      }}
                    >
                      <Icon size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.label}
                      </span>
                      {it.hint ? (
                        <span
                          style={{
                            fontFamily: 'DMMono, ui-monospace, monospace',
                            fontSize: 11,
                            color: 'var(--muted)',
                          }}
                        >
                          {it.hint}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPaletteImpl;
