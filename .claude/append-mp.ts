/**
 * append-mp.ts — Ajoute les 4 matières premières manquantes dans STOCK_ALIMENTS.
 *
 * État 2026-04-22 (après probe Sheets) :
 *   ✅ ALIM-MAIS déjà présent (3050 kg, inventaire 21/04)
 *   ❌ KPC, Tourteau soja, Son blé, Coquillage absents
 *
 * Les 3 autres mutations du staging initial sont déjà réalisées dans Sheets :
 *   - Retour chaleur T11 (Ficelle) : REPRODUCTION R9 statut "Non confirmée"
 *   - Sevrage bande 26-T18-01 : PORCELETS_BANDES R17 sevré 20/04
 *   - Maïs 3050 kg : STOCK_ALIMENTS R1
 *
 * Usage :
 *   export VITE_GAS_URL=... VITE_GAS_TOKEN=...
 *   npx tsx .claude/append-mp.ts --dry-run   # visu sans effet
 *   npx tsx .claude/append-mp.ts             # append réel
 */

const url = process.env.VITE_GAS_URL;
const token = process.env.VITE_GAS_TOKEN;

// Ordre colonnes STOCK_ALIMENTS : ID, LIBELLE, UNITE, STOCK_ACTUEL, SEUIL_ALERTE, NOTES
const rows = [
  {
    label: '[MP] KPC (prémix vitamines/minéraux) — surveiller',
    values: [
      'ALIM-KPC',
      'KPC 5% (prémix vitamines)',
      'kg',
      300,
      400,
      'Inventaire 2026-04-21 — stock OK, surveiller consommation (~1 sem)',
    ],
  },
  {
    label: '[MP] Tourteau de soja 200 kg — BAS',
    values: [
      'ALIM-SOJA',
      'Tourteau de soja',
      'kg',
      200,
      300,
      'Inventaire 2026-04-21 — stock BAS, commander sous 5-7 jours (base protéique)',
    ],
  },
  {
    label: '[MP] Son de blé 50 kg — BAS urgent',
    values: [
      'ALIM-SON',
      'Son de blé',
      'kg',
      50,
      80,
      'Inventaire 2026-04-21 — stock BAS, commander sous 48h (ration truies allaitantes)',
    ],
  },
  {
    label: '[MP] Coquillage 20,3 kg — CRITIQUE',
    values: [
      'ALIM-COQ',
      'Coquillage (minéral Ca)',
      'kg',
      20.3,
      30,
      'Inventaire 2026-04-21 — stock très BAS, commande urgente (Ca truies allaitantes)',
    ],
  },
] as const;

async function appendRow(sheet: string, values: unknown[]): Promise<{ ok: boolean; message: string }> {
  const payload = {
    token,
    action: 'append_row',
    sheet,
    values,
    device: { platform: 'node-staging', version: '2026-04-22' },
    timestamp: new Date().toISOString(),
  };
  const resp = await fetch(url!, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (resp.status !== 200) return { ok: false, message: `HTTP ${resp.status}` };
  const data = (await resp.json()) as { ok?: boolean; error?: string; message?: string };
  return {
    ok: Boolean(data.ok),
    message: data.error ?? data.message ?? (data.ok ? 'appended' : 'unknown'),
  };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  console.log(
    `\n=== APPEND MP — STOCK_ALIMENTS ===\n` +
      `Mode : ${dryRun ? 'DRY RUN' : 'APPEND RÉEL'} · ${rows.length} matières premières\n`,
  );

  if (!dryRun && (!url || !token)) {
    console.error('❌  VITE_GAS_URL et VITE_GAS_TOKEN requis');
    process.exit(1);
  }

  let ok = 0;
  let ko = 0;
  for (const r of rows) {
    console.log(`\n${r.label}`);
    console.log(`  → values=${JSON.stringify(r.values)}`);
    if (dryRun) {
      console.log('  [dry-run] skipped');
      continue;
    }
    try {
      const res = await appendRow('STOCK_ALIMENTS', r.values as unknown[]);
      if (res.ok) {
        console.log(`  ✅  appended · ${res.message}`);
        ok++;
      } else {
        console.error(`  ❌  failed · ${res.message}`);
        ko++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌  exception · ${msg}`);
      ko++;
    }
  }

  console.log(
    `\n=== Résultat : ${ok} OK · ${ko} erreurs · ${rows.length - ok - ko} skipped (dry) ===\n`,
  );
  process.exit(ko > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
