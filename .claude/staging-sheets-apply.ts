/**
 * staging-sheets-apply.ts — Exécution des mutations Sheets du 2026-04-21.
 * ════════════════════════════════════════════════════════════════════════
 */

import { updateRowById } from '../src/services/googleSheets';

const BOUCLE_38_TRUIE_ID = 'T11';
const BANDE_SEVREE_ID = '26-T18-01'; // Portée de T18 (B.85) avec sevrage urgent au 18/04

const STOCK_MAPPING = {
  'Maïs grain': 'ALIM-MAIS',
  'Aliment truie gestation': 'ALIM-TRUIE-GEST',
  'Aliment truie lactation': 'ALIM-TRUIE-LACT',
  'Aliment porcelet démarrage': 'ALIM-PORCELET',
  'Aliment engraissement': 'ALIM-ENGR',
};

const mutations = [
  // 1. REPRODUCTION — Retour chaleur Boucle 38 (T11)
  {
    label: '[REPRO] Retour chaleur Boucle 38 (T11)',
    sheet: 'REPRODUCTION',
    idHeader: 'ID Truie',
    idValue: BOUCLE_38_TRUIE_ID,
    patch: {
      'Statut': 'Non confirmée',
      'Notes': 'Retour chaleur 2026-04-21 — cycle œstral ~21j (Saillie du 05/04 échouée)',
    },
  },

  // 2. PORCELETS_BANDES — Sevrage porté T18
  {
    label: '[BANDE] Sevrage portée T18 (26-T18-01) → 12 porcelets sevrés',
    sheet: 'PORCELETS_BANDES',
    idHeader: 'ID Portée',
    idValue: BANDE_SEVREE_ID,
    patch: {
      'Date sevrage réelle': '2026-04-20T07:00:00.000Z',
      'Statut': 'Sevrés',
      'Notes': 'Sevrage réel le 20/04/2026 (urgent du 18/04 effectué)',
    },
  },

  // 3. STOCK_ALIMENTS — Mise à jour des stocks (inventaire 21/04)
  {
    label: '[STOCK] Maïs grain 3050 kg',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: 'ALIM-MAIS',
    patch: {
      'STOCK_ACTUEL': 3050,
      'NOTES': 'Inventaire 21/04/2026 — stock OK',
    },
  },
  {
    label: '[STOCK] Aliment gestation 500 kg',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: 'ALIM-TRUIE-GEST',
    patch: {
      'STOCK_ACTUEL': 500,
      'NOTES': 'Inventaire 21/04/2026 — stock OK',
    },
  },
  {
    label: '[STOCK] Aliment lactation 200 kg',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: 'ALIM-TRUIE-LACT',
    patch: {
      'STOCK_ACTUEL': 200,
      'NOTES': 'Inventaire 21/04/2026 — stock OK',
    },
  },
  {
    label: '[STOCK] Aliment porcelet 150 kg',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: 'ALIM-PORCELET',
    patch: {
      'STOCK_ACTUEL': 150,
      'NOTES': 'Inventaire 21/04/2026 — stock OK',
    },
  },
  {
    label: '[STOCK] Aliment engraissement 500 kg',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: 'ALIM-ENGR',
    patch: {
      'STOCK_ACTUEL': 500,
      'NOTES': 'Inventaire 21/04/2026 — stock OK',
    },
  },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(
    `\n=== STAGING Sheets 2026-04-21 ===\n` +
      `Ferme A130 / Nord · ${mutations.length} mutations\n` +
      `Mode : ${dryRun ? 'DRY RUN (aucun effet)' : 'DIRECT GAS'}\n`,
  );

  let ok = 0;
  let ko = 0;

  for (const m of mutations) {
    console.log(`\n${m.label}\n  → sheet=${m.sheet} ${m.idHeader}=${m.idValue}`);

    if (dryRun) {
      console.log('  [dry-run] skipped');
      continue;
    }

    try {
      const res = await updateRowById(m.sheet, m.idHeader, m.idValue, m.patch);
      if (res.success) {
          console.log('  ✅  updated');
          ok++;
      } else {
          console.error(`  ❌  update failed: ${res.message}`);
          ko++;
      }
    } catch (err) {
      console.error(
        `  ❌  request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      ko++;
    }
  }

  console.log(
    `\n=== Résultat : ${ok} OK · ${ko} erreurs · ${mutations.length - ok - ko} skipped (dry) ===\n`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
