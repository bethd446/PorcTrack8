import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { kvGet, kvSet } from '../services/kvStore';

/**
 * useRecentNavigation — historique des 5 derniers items "épinglables" consultés.
 *
 * Items capturés : pages détail truie / verrat / bande. Stockés dans kvStore
 * sous la clé `recent_navigation_items` (JSON), max 5, dédupliqués par path.
 * Le composant qui consomme ce hook reçoit la liste à plat + un setter
 * d'enregistrement explicite (pour les cas non-couverts par le matcher).
 */

export type RecentItemKind = 'truie' | 'verrat' | 'bande' | 'mise-bas' | 'page';

export interface RecentItem {
  path: string;
  kind: RecentItemKind;
  label: string;
  /** ms epoch — utilisé pour ordonner. */
  ts: number;
}

const STORAGE_KEY = 'recent_navigation_items';
const MAX_ITEMS = 5;

let memorySubscribers: Array<(items: RecentItem[]) => void> = [];
let memoryItems: RecentItem[] | null = null;

function readFromStore(): RecentItem[] {
  if (memoryItems) return memoryItems;
  try {
    const raw = kvGet(STORAGE_KEY);
    if (!raw) return (memoryItems = []);
    const parsed = JSON.parse(raw) as RecentItem[];
    if (!Array.isArray(parsed)) return (memoryItems = []);
    return (memoryItems = parsed.slice(0, MAX_ITEMS));
  } catch {
    return (memoryItems = []);
  }
}

function writeToStore(items: RecentItem[]): void {
  memoryItems = items;
  void kvSet(STORAGE_KEY, JSON.stringify(items));
  memorySubscribers.forEach((fn) => fn(items));
}

/**
 * Détermine si le path actuel est un item "épinglable" (détail) et
 * retourne un RecentItem partiel (label fallback = path tail) ou null.
 */
function matchPath(pathname: string): Omit<RecentItem, 'ts'> | null {
  const m1 = pathname.match(/^\/troupeau\/truies\/([^/]+)$/);
  if (m1) return { path: pathname, kind: 'truie', label: `Truie ${decodeURIComponent(m1[1])}` };

  const m2 = pathname.match(/^\/troupeau\/verrats\/([^/]+)$/);
  if (m2) return { path: pathname, kind: 'verrat', label: `Verrat ${decodeURIComponent(m2[1])}` };

  const m3 = pathname.match(/^\/troupeau\/bandes\/([^/]+)$/);
  if (m3) return { path: pathname, kind: 'bande', label: `Bande ${decodeURIComponent(m3[1])}` };

  return null;
}

export function useRecentNavigation(): {
  items: RecentItem[];
  pushItem: (item: Omit<RecentItem, 'ts'>) => void;
  clear: () => void;
} {
  const location = useLocation();
  const [items, setItems] = useState<RecentItem[]>(() => readFromStore());

  useEffect(() => {
    const sub = (next: RecentItem[]) => setItems(next);
    memorySubscribers.push(sub);
    return () => {
      memorySubscribers = memorySubscribers.filter((s) => s !== sub);
    };
  }, []);

  const pushItem = useCallback((item: Omit<RecentItem, 'ts'>) => {
    const current = readFromStore();
    const filtered = current.filter((i) => i.path !== item.path);
    const next: RecentItem[] = [{ ...item, ts: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    writeToStore(next);
  }, []);

  const clear = useCallback(() => {
    writeToStore([]);
  }, []);

  // Auto-capture : si la route actuelle matche, on enregistre.
  useEffect(() => {
    const match = matchPath(location.pathname);
    if (!match) return;
    pushItem(match);
  }, [location.pathname, pushItem]);

  return { items, pushItem, clear };
}
