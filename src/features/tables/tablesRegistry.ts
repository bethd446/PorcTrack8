/**
 * PorcTrack — Registre des Tables (Supabase)
 * ════════════════════════════════════════════════
 * Mapping statique des KEYs legacy (héritées de TABLES_INDEX Sheets) vers
 * les métadonnées de table Supabase. Le schéma est connu à la compilation,
 * donc plus aucun chargement asynchrone n'est nécessaire.
 *
 * `idHeader` reste le nom de la colonne identifiante côté UI (ex. 'ID Portée'),
 * conservé pour la compat des composants legacy. La résolution réelle vers
 * un UUID Supabase passe par les helpers `resolveXByCode` de supabaseWrites.
 */

export interface TableMeta {
  key: string;
  sheetName: string;
  headerRow: number;
  idHeader: string;
  module: string;
}

export const TABLE_REGISTRY: Record<string, TableMeta> = {
  SUIVI_TRUIES_REPRODUCTION: {
    key: 'SUIVI_TRUIES_REPRODUCTION',
    sheetName: 'sows',
    headerRow: 1,
    idHeader: 'ID',
    module: 'TROUPEAU',
  },
  VERRATS: {
    key: 'VERRATS',
    sheetName: 'boars',
    headerRow: 1,
    idHeader: 'ID',
    module: 'TROUPEAU',
  },
  PORCELETS_BANDES_DETAIL: {
    key: 'PORCELETS_BANDES_DETAIL',
    sheetName: 'batches',
    headerRow: 1,
    idHeader: 'ID Portée',
    module: 'BANDES',
  },
  JOURNAL_SANTE: {
    key: 'JOURNAL_SANTE',
    sheetName: 'health_logs',
    headerRow: 1,
    idHeader: 'ID',
    module: 'SANTE',
  },
  STOCK_ALIMENTS: {
    key: 'STOCK_ALIMENTS',
    sheetName: 'produits_aliments',
    headerRow: 1,
    idHeader: 'ID',
    module: 'STOCK',
  },
  STOCK_VETO: {
    key: 'STOCK_VETO',
    sheetName: 'produits_veto',
    headerRow: 1,
    idHeader: 'ID',
    module: 'STOCK',
  },
  NOTES_TERRAIN: {
    key: 'NOTES_TERRAIN',
    sheetName: 'notes',
    headerRow: 1,
    idHeader: 'ID',
    module: 'NOTES',
  },
  FINANCES: {
    key: 'FINANCES',
    sheetName: 'finances',
    headerRow: 1,
    idHeader: 'ID',
    module: 'FINANCES',
  },
  SUIVI_REPRODUCTION_ACTUEL: {
    key: 'SUIVI_REPRODUCTION_ACTUEL',
    sheetName: 'saillies',
    headerRow: 1,
    idHeader: 'ID',
    module: 'REPRO',
  },
};

export function getMeta(key: string): TableMeta | null {
  return TABLE_REGISTRY[key] ?? null;
}

export function getMetaSync(key: string): TableMeta | null {
  return TABLE_REGISTRY[key] ?? null;
}

export async function loadTablesIndex(): Promise<Record<string, TableMeta>> {
  return TABLE_REGISTRY;
}

export async function initRegistry(): Promise<void> {
  // No-op : registre statique chargé à l'import.
}
