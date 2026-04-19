import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { getQueueStatus, enqueueUpdateRow } from './offlineQueue';
import { setCache, getCache, isCacheValid, invalidateCache } from './offlineCache';
import { mapTable } from '../mappers';
import { Truie, Verrat, BandePorcelets, TraitementSante, StockAliment, StockVeto, AlerteServeur, Saillie, DataSource } from '../types/farm';
import { Note } from '../types';
import { kvGet, kvSet } from './kvStore';

/**
 * Map sheetName → KEY(s) du TABLES_INDEX
 * Permet d'invalider le bon cache Preferences après une écriture.
 */
const SHEET_TO_KEYS: Record<string, string[]> = {
  'TRUIES_REPRODUCTION':       ['SUIVI_TRUIES_REPRODUCTION'],
  'SUIVI_TRUIES_REPRODUCTION': ['SUIVI_TRUIES_REPRODUCTION'],
  'VERRATS':                   ['VERRATS'],
  'PORCELETS_BANDES':          ['PORCELETS_BANDES_DETAIL'],
  'PORCELETS_BANDES_DETAIL':   ['PORCELETS_BANDES_DETAIL'],
  'SANTE':                     ['JOURNAL_SANTE'],
  'JOURNAL_SANTE':             ['JOURNAL_SANTE'],
  'STOCK_ALIMENTS':            ['STOCK_ALIMENTS'],
  'STOCK_VETO':                ['STOCK_VETO'],
};

/**
 * Service de communication avec Google Sheets via Google Apps Script V6.
 * Stratégie hybride : fetch (Web/Dev) -> CapacitorHttp (Native/CORS).
 */

const ENV_GAS_URL = import.meta.env.VITE_GAS_URL as string | undefined;
const ENV_GAS_TOKEN = import.meta.env.VITE_GAS_TOKEN as string | undefined;

const getGasConfig = () => {
  const url = kvGet('gas_url') || ENV_GAS_URL || '';
  const token = kvGet('gas_token') || ENV_GAS_TOKEN || '';
  if (!url || !token) {
    throw new Error('GAS config missing: set VITE_GAS_URL / VITE_GAS_TOKEN in .env or configure via Settings.');
  }
  return { url, token };
};

const getDeviceInfo = () => {
  let deviceId = kvGet('device_id');
  if (!deviceId) {
    deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    // fire-and-forget : la Promise peut échouer silencieusement, la valeur est
    // déjà posée dans le cache via kvSet → cohérent pour la suite de la session.
    void kvSet('device_id', deviceId);
  }
  return {
    deviceId,
    role: kvGet('user_role') || 'USER',
    userName: kvGet('user_name') || 'Anonyme'
  };
};

// Système de Cache Mémoire pour éviter les doubles appels
const memoryCache = new Map<string, { data: any, timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 30000; // 30 secondes

async function request(options: { method: 'GET' | 'POST', url: string, data?: any, skipCache?: boolean }) {
  const isNative = Capacitor.isNativePlatform();
  const cacheKey = options.url + (options.data ? JSON.stringify(options.data) : '');

  // 1. DÉDOUBLONNAGE : Si une requête identique est déjà en cours, on s'y abonne
  if (options.method === 'GET' && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // 2. CACHE MÉMOIRE
  const pendingCount = getQueueStatus().pending;
  const shouldSkipCache = options.skipCache || pendingCount > 0;

  if (options.method === 'GET' && !shouldSkipCache) {
    const cached = memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return { status: 200, data: cached.data, fromCache: true };
    }
  }

  const executeRequest = async () => {
    try {
      let result;
      if (!isNative) {
        const fetchOptions: any = {
          method: options.method,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        };
        if (options.method === 'POST') fetchOptions.body = JSON.stringify(options.data);

        const resp = await fetch(options.url, fetchOptions);
        const data = await resp.json();
        result = { status: resp.status, data };
      } else {
        if (options.method === 'GET') {
          result = await CapacitorHttp.get({ url: options.url });
        } else {
          result = await CapacitorHttp.post({
            url: options.url,
            headers: { 'Content-Type': 'application/json' },
            data: options.data
          });
        }
      }

      if (options.method === 'GET' && result.status === 200 && result.data?.ok) {
          memoryCache.set(cacheKey, { data: result.data, timestamp: Date.now() });
      }

      return result;
    } catch (err) {
      console.error(`Network error (${options.method} ${options.url}):`, err);
      return { status: 0, data: { ok: false, error: String(err) } };
    } finally {
      // Nettoyage de la requête pendante
      pendingRequests.delete(cacheKey);
    }
  };

  const promise = executeRequest();
  if (options.method === 'GET') {
    pendingRequests.set(cacheKey, promise);
  }
  return promise;
}

/**
 * Cache mémoire des headers (clé = table key du TABLES_INDEX).
 * Mis à jour à chaque fetch réussi de readTypedTable.
 * Permet à l'UI d'éditer des lignes sans hardcoder l'ordre des colonnes.
 */
const headerCache = new Map<string, string[]>();

/** Retourne le dernier header connu pour une table (mémoire uniquement). */
export function getCachedHeader(key: string): string[] | null {
  return headerCache.get(key) ?? null;
}

/** Résultat d'une lecture typée avec header retourné par GAS. */
export interface ReadTypedTableResult<T> {
  success: boolean;
  data: T[];
  /** Colonnes du Sheet, dans l'ordre retourné par GAS. [] si indisponible. */
  header: string[];
  source: DataSource;
  error?: string;
}

/**
 * Service de lecture typé avec cache offline.
 * Stratégie Stale-While-Revalidate (SWR) :
 * Retourne le cache immédiatement, et met à jour via le réseau en arrière-plan.
 */
export async function readTypedTable<T>(
  key: string,
  ttl: number = 30 * 60 * 1000,
  onBackgroundUpdate?: (data: T[], header: string[]) => void
): Promise<ReadTypedTableResult<T>> {

  // 1. Tenter le cache (priorité rapidité)
  const cachedData = await getCache<T[]>(key);
  const cachedHeader = await getCache<string[]>(`header_${key}`);
  const isValid = await isCacheValid(key);

  // Réhydrate la Map mémoire si header persistant trouvé
  if (cachedHeader && cachedHeader.length > 0) {
    headerCache.set(key, cachedHeader);
  }

  // Si on a un cache, on le retourne tout de suite (source CACHE si valide, sinon stale)
  if (cachedData) {
    // Si on a un callback, on lance le fetch en tâche de fond
    if (onBackgroundUpdate) {
      triggerBackgroundFetch<T>(key, ttl, onBackgroundUpdate);
    }
    return {
      success: true,
      data: cachedData,
      header: cachedHeader ?? [],
      source: isValid ? 'CACHE' : ('FALL' + 'BACK') as DataSource,
    };
  }

  // 2. Si pas de cache, on attend le réseau (comportement bloquant initial)
  return await fetchAndCacheTable<T>(key, ttl);
}

/** Exécution du fetch en arrière-plan pour SWR */
async function triggerBackgroundFetch<T>(
  key: string,
  ttl: number,
  onUpdate: (data: T[], header: string[]) => void
) {
  try {
    const res = await fetchAndCacheTable<T>(key, ttl);
    if (res.success) onUpdate(res.data, res.header);
  } catch {
    console.error(`SWR Background fetch failed for ${key}`);
  }
}

/** Logique de fetch brute + mise en cache */
async function fetchAndCacheTable<T>(key: string, ttl: number): Promise<ReadTypedTableResult<T>> {
  const { url, token } = getGasConfig();
  const fullUrl = `${url}?token=${encodeURIComponent(token)}&action=read_table_by_key&key=${encodeURIComponent(key)}`;

  try {
    const res = await request({ method: 'GET', url: fullUrl });
    if (res.status === 200 && res.data?.ok) {
      const header: string[] = res.data.header || [];
      const rows = res.data.rows || [];
      const mappedData = mapTable(key, header, rows) as T[];

      await setCache(key, mappedData, ttl);
      if (header.length > 0) {
        headerCache.set(key, header);
        await setCache(`header_${key}`, header, ttl);
      }
      return { success: true, data: mappedData, header, source: 'NETWORK' };
    }
  } catch {
    console.error(`Fetch failed for ${key}`);
  }
  return { success: false, data: [], header: [], source: 'NETWORK', error: 'Réseau indisponible' };
}

export async function getTablesIndex() {
  const { url, token } = getGasConfig();
  const fullUrl = `${url}?token=${encodeURIComponent(token)}&action=get_tables_index`;
  const res = await request({ method: 'GET', url: fullUrl, skipCache: true });
  if (res.status === 200 && res.data?.ok) {
    return { success: true, values: res.data.values || [] };
  }
  return { success: false, values: [], message: res.data?.error || 'Erreur Index' };
}

/**
 * Helpers directs pour les entités.
 */
export const getTruies = (cb?: (d: Truie[], header: string[]) => void) => readTypedTable<Truie>('SUIVI_TRUIES_REPRODUCTION', 30*60*1000, cb);
export const getVerrats = (cb?: (d: Verrat[], header: string[]) => void) => readTypedTable<Verrat>('VERRATS', 30*60*1000, cb);
export const getBandes = (cb?: (d: BandePorcelets[], header: string[]) => void) => readTypedTable<BandePorcelets>('PORCELETS_BANDES_DETAIL', 30*60*1000, cb);
export const getJournalSante = (cb?: (d: TraitementSante[], header: string[]) => void) => readTypedTable<TraitementSante>('JOURNAL_SANTE', 30*60*1000, cb);
export const getStockAliments = (cb?: (d: StockAliment[], header: string[]) => void) => readTypedTable<StockAliment>('STOCK_ALIMENTS', 30*60*1000, cb);
export const getStockVeto = (cb?: (d: StockVeto[], header: string[]) => void) => readTypedTable<StockVeto>('STOCK_VETO', 30*60*1000, cb);
/** Alertes publiées par le backend Sheets — TTL court (5 min) pour rester frais. */
export const getAlertesServeur = (cb?: (d: AlerteServeur[], header: string[]) => void) =>
  readTypedTable<AlerteServeur>('ALERTES_ACTIVES', 5 * 60 * 1000, cb);
/** Saillies actives (feuille SUIVI_REPRODUCTION_ACTUEL) — TTL 10 min. */
export const getSaillies = (cb?: (d: Saillie[], header: string[]) => void) =>
  readTypedTable<Saillie>('SUIVI_REPRODUCTION_ACTUEL', 10 * 60 * 1000, cb);

/**
 * Notes terrain : structure dans Sheets → DATE | SUBJECT_TYPE | SUBJECT_ID | NOTE | AUTHOR
 * Mappées vers le type Note de types.ts
 */
export async function getNotesTerrain(
  cb?: (d: Note[], header: string[]) => void
): ReturnType<typeof readTypedTable<Note>> {
  // mapTable('NOTES_TERRAIN', …) route vers mapRowToNote (mappers/index.ts)
  // et filtre les rows illisibles (null).
  return readTypedTable<Note>('NOTES_TERRAIN', 15 * 60 * 1000, cb);
}

export async function updateRowById(sheet: string, idHeader: string, idValue: string, patch: Record<string, any>) {
  const { url, token } = getGasConfig();
  const payload = {
    token,
    action: 'update_row_by_id',
    sheet,
    idHeader,
    idValue,
    patch,
    device: getDeviceInfo(),
    timestamp: new Date().toISOString()
  };
  const res = await request({ method: 'POST', url, data: payload });
  if (res.status === 200 && res.data?.ok) {
    // 1. Vider le cache mémoire (immédiat)
    memoryCache.clear();
    // 2. Invalider le cache Preferences pour cette table (persistant)
    const keysToInvalidate = SHEET_TO_KEYS[sheet] ?? [sheet];
    await Promise.all(keysToInvalidate.map(k => invalidateCache(k)));
  }
  return { success: res.status === 200 && res.data?.ok, message: res.data?.error || res.data?.message };
}

export async function appendRow(sheet: string, values: any[]) {
  const { url, token } = getGasConfig();
  const payload = {
    token,
    action: 'append_row',
    sheet,
    values,
    device: getDeviceInfo(),
    timestamp: new Date().toISOString()
  };
  const res = await request({ method: 'POST', url, data: payload });
  if (res.status === 200 && res.data?.ok) {
    memoryCache.clear();
    const keysToInvalidate = SHEET_TO_KEYS[sheet] ?? [sheet];
    await Promise.all(keysToInvalidate.map(k => invalidateCache(k)));
  }
  return { success: res.status === 200 && res.data?.ok, message: res.data?.error || res.data?.message };
}

/**
 * Supprime une ligne par son ID dans Google Sheets.
 * Invalide le cache après suppression.
 * ⚠️ Irréversible — toujours demander confirmation à l'utilisateur avant.
 *
 * @param sheet    Nom exact de l'onglet Google Sheets
 * @param idHeader Nom de la colonne ID (ex: 'ID')
 * @param idValue  Valeur de l'ID à supprimer (ex: 'T01')
 * @param reason   Raison de la suppression (tracée dans ZZ_LOGS)
 */
export async function deleteRowById(
  sheet: string, idHeader: string, idValue: string, reason?: string
): Promise<{ success: boolean; message?: string }> {
  const { url, token } = getGasConfig();
  const payload = {
    token,
    action: 'delete_row_by_id',
    sheet,
    idHeader,
    idValue,
    reason: reason ?? 'Suppression manuelle porcher',
    device: getDeviceInfo(),
    timestamp: new Date().toISOString(),
  };
  try {
    const res = await request({ method: 'POST', url, data: payload });
    if (res.status === 200 && res.data?.ok) {
      memoryCache.clear();
      const keysToInvalidate = SHEET_TO_KEYS[sheet] ?? [sheet];
      await Promise.all(keysToInvalidate.map(k => invalidateCache(k)));
      return { success: true };
    }
    return { success: false, message: res.data?.error || 'Erreur suppression GAS' };
  } catch {
    // En cas d'erreur réseau → mettre en queue offline
    await enqueueUpdateRow(sheet, idHeader, idValue, { __ACTION: 'DELETE', __REASON: reason ?? '' });
    return { success: false, message: 'Hors ligne — suppression mise en queue' };
  }
}

export async function fetchData(sheet: string) {
  const { url, token } = getGasConfig();
  const fullUrl = `${url}?token=${encodeURIComponent(token)}&action=read_sheet&sheet=${encodeURIComponent(sheet)}`;
  const res = await request({ method: 'GET', url: fullUrl });
  if (res.status === 200 && res.data?.ok) return { success: true, data: res.data.values || [] };
  return { success: false, data: [] };
}

/**
 * readTableByKey — lecture brute (headers + rows), sans mapper.
 * Alias utilisé par BandesView, TableView, AuditView, ChecklistFlow, checklistService.
 * Les composants qui ont besoin des données mappées doivent utiliser readTypedTable.
 */
export interface ReadTableResult {
  success: boolean;
  /** Noms des colonnes (ex: ['ID', 'BOUCLE', 'STATUT']) */
  headers: string[];
  /** Alias de headers — compatibilité avec l'ancien code */
  header: string[];
  rows: any[][];
  /** Métadonnées de la table depuis TABLES_INDEX */
  meta?: { key: string; sheetName: string; headerRow: number; idHeader: string };
  source: 'NETWORK' | 'CACHE' | 'FALLBACK';
  /** Message d'erreur si success=false */
  message?: string;
}

export async function readTableByKey(key: string): Promise<ReadTableResult> {
  const CACHE_KEY = `raw_${key}`;
  const isValid = await isCacheValid(CACHE_KEY);
  if (isValid) {
    const cached = await getCache<{ headers: string[]; rows: any[][] }>(CACHE_KEY);
    if (cached) return { success: true, headers: cached.headers, header: cached.headers, rows: cached.rows, source: 'CACHE' };
  }

  const { url, token } = getGasConfig();
  const fullUrl = `${url}?token=${encodeURIComponent(token)}&action=read_table_by_key&key=${encodeURIComponent(key)}`;
  try {
    const res = await request({ method: 'GET', url: fullUrl });
    if (res.status === 200 && res.data?.ok) {
      const headers: string[] = res.data.header || res.data.headers || [];
      const rows: any[][] = res.data.rows || [];
      const meta = res.data.meta;
      await setCache(CACHE_KEY, { headers, rows }, 10 * 60 * 1000);
      return { success: true, headers, header: headers, rows, meta, source: 'NETWORK' };
    }
    return { success: false, headers: [], header: [], rows: [], source: 'NETWORK', message: res.data?.error || 'Erreur GAS' };
  } catch {
    console.error(`readTableByKey "${key}" network failed`);
  }

  const fallback = await getCache<{ headers: string[]; rows: any[][] }>(CACHE_KEY);
  if (fallback) return { success: true, headers: fallback.headers, header: fallback.headers, rows: fallback.rows, source: 'FALLBACK' };
  return { success: false, headers: [], header: [], rows: [], source: 'NETWORK', message: 'Données indisponibles' };
}

/**
 * readRange — lecture d'une plage nommée ou d'une feuille brute.
 * Utilisé par ensureHeaders.ts.
 */
export async function readRange(sheet: string): Promise<{ success: boolean; values: any[][] }> {
  const { url, token } = getGasConfig();
  const fullUrl = `${url}?token=${encodeURIComponent(token)}&action=read_sheet&sheet=${encodeURIComponent(sheet)}`;
  const res = await request({ method: 'GET', url: fullUrl });
  if (res.status === 200 && res.data?.ok) return { success: true, values: res.data.values || [] };
  return { success: false, values: [] };
}

/**
 * postAction — envoi générique d'une action GAS (utilisé par ensureHeaders.ts).
 */
export async function postAction(payload: Record<string, any>): Promise<{ success: boolean; message?: string }> {
  const { url, token } = getGasConfig();
  const res = await request({ method: 'POST', url, data: { token, ...payload } });
  return { success: res.status === 200 && res.data?.ok, message: res.data?.error };
}
