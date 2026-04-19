import { Preferences } from '@capacitor/preferences';
import { logger } from './logger';

/**
 * Enhanced cache service with TTL and metadata support.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

export const setCache = async <T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> => {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl
  };
  await Preferences.set({
    key: `cache_${key}`,
    value: JSON.stringify(entry)
  });
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const { value } = await Preferences.get({ key: `cache_${key}` });
  if (!value) return null;

  try {
    const entry: CacheEntry<T> = JSON.parse(value);
    // In a real offline app, we might return stale data if offline,
    // but for now we follow the "staleWhileRevalidate" logic in the service.
    return entry.data;
  } catch {
    return null;
  }
};

export const isCacheValid = async (key: string): Promise<boolean> => {
  const { value } = await Preferences.get({ key: `cache_${key}` });
  if (!value) return false;
  try {
    const entry: CacheEntry<any> = JSON.parse(value);
    return (Date.now() - entry.timestamp < entry.ttl);
  } catch {
    return false;
  }
};

export const invalidateCache = async (key: string): Promise<void> => {
  await Preferences.remove({ key: `cache_${key}` });
};

export const clearAllCache = async (): Promise<void> => {
  const { keys } = await Preferences.keys();
  const cacheKeys = keys.filter(k => k.startsWith('cache_'));
  for (const k of cacheKeys) {
    await Preferences.remove({ key: k });
  }
};

export const getCacheMetadata = async () => {
  const { keys } = await Preferences.keys();
  const cacheKeys = keys.filter(k => k.startsWith('cache_'));
  const meta = [];
  for (const k of cacheKeys) {
    const { value } = await Preferences.get({ key: k });
    if (value) {
      const entry = JSON.parse(value);
      meta.push({
        key: k.replace('cache_', ''),
        lastUpdate: entry.timestamp,
        isValid: (Date.now() - entry.timestamp < entry.ttl)
      });
    }
  }
  return meta;
};

/**
 * Logique Stale-While-Revalidate (SWR).
 * Retourne immédiatement le cache (même expiré) et exécute le fetcher en tâche de fond.
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  onUpdate: (data: T) => void,
  ttl: number = DEFAULT_TTL
): Promise<T | null> {
  // 1. Retour immédiat du cache
  const cached = await getCache<T>(key);

  // 2. Déclenchement silencieux du refresh
  // On ne fait le refresh que si pas de cache ou si on veut toujours refresh en background
  fetcher().then(async (freshData) => {
    if (freshData) {
      await setCache(key, freshData, ttl);
      onUpdate(freshData);
    }
  }).catch(err => logger.error('offlineCache', `SWR Refresh failed for ${key}`, err));

  return cached;
}
