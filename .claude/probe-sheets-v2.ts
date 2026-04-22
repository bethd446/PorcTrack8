/**
 * probe-sheets-v2.ts — Inspection approfondie du Google Sheet Staging.
 * ════════════════════════════════════════════════════════════════════════
 * Utilise readTableByKey pour récupérer les headers et les lignes avec
 * la même logique que l'application mobile (mappers inclus).
 */

import { readTableByKey, getTablesIndex } from '../src/services/googleSheets';

async function probe() {
  console.log('=== PROBE V2 — Inspection des Tables ===\n');

  const index = await getTablesIndex();
  if (!index.success) {
    console.error('Impossible de lire TABLES_INDEX');
    return;
  }

  // On ignore le header de l'index
  const tables = index.values.slice(1);

  for (const row of tables) {
    const [key, sheetName, headerRow, idHeader] = row;
    console.log(`\nTable: ${key} (Onglet: ${sheetName})`);
    console.log(`  Header Row: ${headerRow}, ID Header: ${idHeader}`);

    try {
      const data = await readTableByKey(key as string);
      if (data.success) {
        console.log(`  ✅ Headers trouvés: ${data.headers.join(' | ')}`);
        console.log(`  ✅ Nombre de lignes: ${data.rows.length}`);
        if (data.rows.length > 0) {
          console.log(`  ✅ Exemple ID (1ère ligne): ${data.rows[0][data.headers.indexOf(idHeader as string)]}`);
        }
      } else {
        console.log(`  ❌ Erreur: ${data.message}`);
      }
    } catch (err) {
      console.log(`  ❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

const envUrl = process.env.VITE_GAS_URL;
const envToken = process.env.VITE_GAS_TOKEN;

if (!envUrl || !envToken) {
  console.error('Erreur: VITE_GAS_URL et VITE_GAS_TOKEN doivent être définis dans l\'environnement.');
  process.exit(1);
}

probe().catch(console.error);
