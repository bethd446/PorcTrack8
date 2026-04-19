/**
 * PorcTrack — Key/Value Store (Capacitor Preferences + localStorage fallback)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Problème : sur Android, `localStorage` est adossé au WebView et peut être
 * purgé par l'OS sous pression mémoire → perte de `gas_url`, `gas_token`,
 * `user_name`, `device_id`, etc. → utilisateur déconnecté, app inutilisable.
 *
 * Solution : façade unifiée vers Capacitor Preferences (SharedPreferences/
 * NSUserDefaults, persistants) sur plateforme native, et localStorage sur web.
 *
 * Stratégie :
 *  - **Synchronous reads** : les call sites existants (`localStorage.getItem`)
 *    sont synchrones. Sur native, on hydrate un cache mémoire au boot
 *    (`hydrateKvStore`) et les `kvGet` servent depuis ce cache.
 *  - **Async writes** : `kvSet` / `kvRemove` écrivent dans le cache
 *    immédiatement (read-after-write cohérent) ET renvoient une Promise pour
 *    la persistance Preferences (fire-and-forget OK, await possible).
 *  - **Migration** : `migrateLegacyLocalStorage()` copie les clés legacy depuis
 *    localStorage → Preferences au premier boot (idempotent via flag).
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

const SCOPE = 'kvStore';

const isNative = (): boolean => Capacitor.isNativePlatform();

/**
 * Mirror synchrone du store Preferences (native uniquement).
 * Hydraté au boot par `hydrateKvStore()`, maintenu par `kvSet`/`kvRemove`.
 */
const cache = new Map<string, string>();

/** Test-only helper to reset module state between tests. */
export function __resetKvCacheForTests(): void {
  cache.clear();
}

/**
 * Charge toutes les clés de Preferences dans le cache mémoire.
 * À appeler une fois au démarrage de l'app (main.tsx) avant le premier rendu.
 * Sur web : no-op (localStorage est déjà synchrone).
 */
export async function hydrateKvStore(): Promise<void> {
  if (!isNative()) return;
  try {
    const { keys } = await Preferences.keys();
    await Promise.all(
      keys.map(async (k) => {
        const { value } = await Preferences.get({ key: k });
        if (value !== null) cache.set(k, value);
      }),
    );
    logger.info(SCOPE, `hydrated ${cache.size} keys`);
  } catch (e) {
    logger.error(SCOPE, 'hydrate failed', e);
  }
}

/**
 * Lecture synchrone d'une valeur.
 * Native → cache mémoire (hydraté au boot).
 * Web    → localStorage direct.
 */
export function kvGet(key: string): string | null {
  if (isNative()) return cache.get(key) ?? null;
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

/**
 * Écriture d'une valeur.
 * Native → cache mémoire (synchrone) + Preferences (async, fire-and-forget).
 * Web    → localStorage direct.
 *
 * Retourne une Promise qu'on peut await si on veut garantir la persistance,
 * mais l'ignorer est OK pour la plupart des call sites.
 */
export function kvSet(key: string, value: string): Promise<void> {
  if (!isNative()) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        logger.error(SCOPE, `localStorage.setItem ${key} failed`, e);
      }
    }
    return Promise.resolve();
  }
  cache.set(key, value);
  return Preferences.set({ key, value }).catch((e) => {
    logger.error(SCOPE, `Preferences.set ${key} failed`, e);
  });
}

/**
 * Suppression d'une clé.
 */
export function kvRemove(key: string): Promise<void> {
  if (!isNative()) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        logger.error(SCOPE, `localStorage.removeItem ${key} failed`, e);
      }
    }
    return Promise.resolve();
  }
  cache.delete(key);
  return Preferences.remove({ key }).catch((e) => {
    logger.error(SCOPE, `Preferences.remove ${key} failed`, e);
  });
}

/**
 * Efface TOUT le store (utile pour reset/déconnexion).
 * ⚠️ Irréversible.
 */
export async function kvClear(): Promise<void> {
  if (!isNative()) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
      } catch (e) {
        logger.error(SCOPE, 'localStorage.clear failed', e);
      }
    }
    return;
  }
  cache.clear();
  try {
    await Preferences.clear();
  } catch (e) {
    logger.error(SCOPE, 'Preferences.clear failed', e);
  }
}

/**
 * Migration one-shot : copie les clés legacy de localStorage → Preferences.
 * Idempotent grâce au flag `__preferences_migrated_v1`.
 * À appeler AU BOOT, APRÈS `hydrateKvStore()`.
 * Sur web : no-op (localStorage reste la source de vérité).
 */
const MIGRATION_FLAG = '__preferences_migrated_v1';

const LEGACY_KEYS_TO_MIGRATE: readonly string[] = [
  'gas_url',
  'gas_token',
  'device_id',
  'user_name',
  'user_role',
  'notif_permission_asked',
  'porcTrack_debug',
  'porctrack_questions_cache',
  'porctrack_checklists_cache',
  'porcTrack_bandeKey',
];

export async function migrateLegacyLocalStorage(): Promise<void> {
  if (!isNative()) return;
  if (cache.get(MIGRATION_FLAG) === '1') return;
  if (typeof localStorage === 'undefined') return;

  let migrated = 0;
  for (const k of LEGACY_KEYS_TO_MIGRATE) {
    try {
      const legacy = localStorage.getItem(k);
      if (legacy !== null && !cache.has(k)) {
        await kvSet(k, legacy);
        migrated++;
      }
    } catch (e) {
      logger.warn(SCOPE, `migrate ${k} failed`, e);
    }
  }
  await kvSet(MIGRATION_FLAG, '1');
  logger.info(SCOPE, `migration complete: ${migrated} keys migrated`);
}
