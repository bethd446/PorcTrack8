/**
 * PorcTrack — Registre des Tables Google Sheets
 * ════════════════════════════════════════════════
 * MIGRATION : localStorage → Capacitor Preferences
 * getMeta() devient async pour être cohérent avec le stockage Preferences.
 */

import { Preferences } from '@capacitor/preferences';
import { getTablesIndex } from '../../services/googleSheets';

export interface TableMeta {
  key: string;
  sheetName: string;
  headerRow: number;
  idHeader: string;
  module: string;
}

const CACHE_KEY = 'porctrack_tables_index_v2';

// ── Persistance ───────────────────────────────────────────────────────────────

async function readCache(): Promise<Record<string, TableMeta>> {
  try {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

async function writeCache(mapping: Record<string, TableMeta>): Promise<void> {
  await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(mapping) });
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Charge TABLES_INDEX depuis Sheets, met à jour le cache, retourne le mapping.
 * En cas d'échec réseau, retourne le cache existant.
 */
export async function loadTablesIndex(): Promise<Record<string, TableMeta>> {
  try {
    const result = await getTablesIndex();
    if (result.success && result.values.length > 1) {
      // Ligne 0 = headers : KEY | SHEET_NAME | HEADER_ROW | ID_HEADER | MODULE
      const [, ...rows] = result.values;
      const mapping: Record<string, TableMeta> = {};

      rows.forEach((row: unknown[]) => {
        const key = String(row[0] || '').trim();
        if (key) {
          mapping[key] = {
            key,
            sheetName: String(row[1] || key),
            headerRow: parseInt(String(row[2])) || 1,
            idHeader: String(row[3] || 'ID'),
            module: String(row[4] || ''),
          };
        }
      });

      await writeCache(mapping);
      return mapping;
    }
  } catch (e) {
    console.error('[TablesRegistry] loadTablesIndex error:', e);
  }

  // Fallback → cache Preferences
  return readCache();
}

/**
 * Retourne les métadonnées d'une table par sa KEY.
 * Async car Capacitor Preferences est asynchrone.
 */
export async function getMeta(key: string): Promise<TableMeta | null> {
  const mapping = await readCache();
  return mapping[key] ?? null;
}

/**
 * Version synchrone pour les cas où le cache est déjà en mémoire.
 * À utiliser uniquement si loadTablesIndex() a déjà été appelé.
 */
let _memoryMapping: Record<string, TableMeta> = {};

export function getMetaSync(key: string): TableMeta | null {
  return _memoryMapping[key] ?? null;
}

export async function initRegistry(): Promise<void> {
  _memoryMapping = await loadTablesIndex();
}
