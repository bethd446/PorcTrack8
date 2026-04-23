/**
 * staging-sheets-direct-push.ts — Push DIRECT vers Google Apps Script.
 * ════════════════════════════════════════════════════════════════════════
 *
 * Différence avec staging-sheets-apply.ts : n'utilise PAS `enqueueUpdateRow`
 * (qui requiert Capacitor Preferences, indisponible en Node tsx). Appelle
 * directement l'endpoint GAS via `fetch` natif de Node 18+.
 *
 * Usage :
 *   export VITE_GAS_URL="https://script.google.com/macros/s/.../exec"
 *   export VITE_GAS_TOKEN="..."
 *   # Remplir les 2 idValue ci-dessous avec les vrais IDs
 *   npx tsx .claude/staging-sheets-direct-push.ts            # PUSH RÉEL
 *   npx tsx .claude/staging-sheets-direct-push.ts --dry-run  # Sans effet
 */

// ─── IDs résolus (dry-run user a confirmé T11 + BP-2026-04-20) ──────────────
const BOUCLE_38_TRUIE_ID = 'T11';
const BANDE_SEVREE_ID = 'BP-2026-04-20';
const STOCK_IDS = {
  KPC: 'SA-KPC',
  SOJA: 'SA-SOJA',
  SON: 'SA-SON',
  COQ: 'SA-COQ',
  MAIS: 'SA-MAIS',
} as const;

type Mutation = {
  label: string;
  sheet: string;
  idHeader: string;
  idValue: string;
  patch: Record<string, unknown>;
};

const mutations: Mutation[] = [
  {
    label: '[REPRO] Retour chaleur Boucle 38',
    sheet: 'SUIVI_REPRODUCTION_ACTUEL',
    idHeader: 'ID TRUIE',
    idValue: BOUCLE_38_TRUIE_ID,
    patch: {
      STATUT: 'Non confirmée',
      NOTES: 'Retour chaleur 2026-04-21 — cycle œstral ~21j',
    },
  },
  {
    label: '[BANDE] Sevrage 36 porcelets 20/04/2026 → L5',
    sheet: 'PORCELETS_BANDES_DETAIL',
    idHeader: 'ID Portée',
    idValue: BANDE_SEVREE_ID,
    patch: {
      DATE_SEVRAGE_REELLE: '20/04/2026',
      VIVANTS: 36,
      STATUT: 'Sevrés',
      LOGE_ENGRAISSEMENT: 'L5',
      NOTES: 'Sevrage 20/04/2026 — transfert post-sevrage phase 1 (J+1)',
    },
  },
  {
    label: '[STOCK] KPC 300 kg',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: STOCK_IDS.KPC,
    patch: {
      LIBELLE: 'KPC',
      STOCK_ACTUEL: 300,
      UNITE: 'kg',
      STATUT_STOCK: 'OK',
      NOTES: 'Relevé 2026-04-21 — surveiller consommation',
    },
  },
  {
    label: '[STOCK] Tourteau de soja 200 kg',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: STOCK_IDS.SOJA,
    patch: {
      LIBELLE: 'Tourteau de soja',
      STOCK_ACTUEL: 200,
      UNITE: 'kg',
      STATUT_STOCK: 'OK',
      NOTES: 'Relevé 2026-04-21',
    },
  },
  {
    label: '[STOCK] Son de blé 50 kg — ALERTE R5',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: STOCK_IDS.SON,
    patch: {
      LIBELLE: 'Son de blé',
      STOCK_ACTUEL: 50,
      UNITE: 'kg',
      STATUT_STOCK: 'BAS',
      NOTES: 'Relevé 2026-04-21 — stock BAS, commander sous 48h',
    },
  },
  {
    label: '[STOCK] Coquillage 20.3 kg — ALERTE R5',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: STOCK_IDS.COQ,
    patch: {
      LIBELLE: 'Coquillage',
      STOCK_ACTUEL: 20.3,
      UNITE: 'kg',
      STATUT_STOCK: 'BAS',
      NOTES: 'Relevé 2026-04-21 — stock très BAS (minéral), commande urgente',
    },
  },
  {
    label: '[STOCK] Maïs 3050 kg',
    sheet: 'STOCK_ALIMENTS',
    idHeader: 'ID',
    idValue: STOCK_IDS.MAIS,
    patch: {
      LIBELLE: 'Maïs',
      STOCK_ACTUEL: 3050,
      UNITE: 'kg',
      STATUT_STOCK: 'OK',
      NOTES: 'Relevé 2026-04-21 — stock confortable',
    },
  },
];

// ─── Push direct via fetch ──────────────────────────────────────────────────

type GasResponse = {
  ok?: boolean;
  success?: boolean;
  error?: string;
  message?: string;
};

async function pushMutation(
  url: string,
  token: string,
  m: Mutation,
): Promise<{ ok: boolean; message: string }> {
  const payload = {
    token,
    action: 'update_row_by_id',
    sheet: m.sheet,
    idHeader: m.idHeader,
    idValue: m.idValue,
    patch: m.patch,
    device: { platform: 'node-staging', version: '2026-04-22' },
    timestamp: new Date().toISOString(),
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (resp.status !== 200) {
    return { ok: false, message: `HTTP ${resp.status}` };
  }
  const data = (await resp.json()) as GasResponse;
  const ok = Boolean(data.ok ?? data.success);
  const message = data.error ?? data.message ?? (ok ? 'updated' : 'unknown');
  return { ok, message };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const url = process.env.VITE_GAS_URL;
  const token = process.env.VITE_GAS_TOKEN;

  console.log(
    `\n=== DIRECT PUSH Sheets 2026-04-21 ===\n` +
      `Ferme A130 / Nord · ${mutations.length} mutations\n` +
      `Mode : ${dryRun ? 'DRY RUN (aucun effet)' : 'PUSH RÉEL via GAS'}\n`,
  );

  if (!dryRun) {
    if (!url || !token) {
      console.error(
        '\n❌  VITE_GAS_URL et VITE_GAS_TOKEN requis en env pour PUSH RÉEL.',
      );
      console.error(
        '    export VITE_GAS_URL=... && export VITE_GAS_TOKEN=... && npx tsx ...',
      );
      process.exit(1);
    }
  }

  let ok = 0;
  let ko = 0;
  const errors: string[] = [];

  for (const m of mutations) {
    const line = `${m.label}\n  → sheet=${m.sheet}  ${m.idHeader}=${m.idValue}\n  → patch=${JSON.stringify(m.patch)}`;
    console.log('\n' + line);

    if (dryRun) {
      console.log('  [dry-run] skipped');
      continue;
    }

    try {
      const res = await pushMutation(url!, token!, m);
      if (res.ok) {
        console.log(`  ✅  pushed · ${res.message}`);
        ok++;
      } else {
        console.error(`  ❌  failed · ${res.message}`);
        ko++;
        errors.push(`${m.label}: ${res.message}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌  exception · ${msg}`);
      ko++;
      errors.push(`${m.label}: ${msg}`);
    }
  }

  console.log(
    `\n=== Résultat : ${ok} OK · ${ko} erreurs · ${mutations.length - ok - ko} skipped (dry) ===\n`,
  );
  if (errors.length > 0) {
    console.error('Détails erreurs :');
    for (const e of errors) console.error('  - ' + e);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
