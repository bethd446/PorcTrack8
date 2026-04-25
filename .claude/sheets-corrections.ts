/**
 * sheets-corrections.ts — Correctif 3 anomalies Google Sheets (Audit 2026-04-25)
 * ════════════════════════════════════════════════════════════════════════════════
 * Correction 1 : T11 statut contradictoire (TRUIES_REPRODUCTION)
 * Correction 2 : Doublons R22–R26 dans REPRODUCTION
 * Correction 3 : Dates MB périmées dans REPRODUCTION (T17, T9, T16, T12)
 *
 * Structure réelle des sheets (confirmée par probe) :
 *   row[0] = titre  |  row[1] = métadonnée  |  row[2] = headers réels
 *   TRUIES_REPRODUCTION headers (R2): ID | Nom | Boucle | Statut | Date MB prevue | ... | Notes
 *   REPRODUCTION headers (R2): ID Truie | Boucle | Nom | Date saillie | Verrat | Date MB prevue | Statut | Notes
 *
 * Usage :
 *   npx tsx .claude/sheets-corrections.ts --dry-run   # Aperçu sans effet
 *   npx tsx .claude/sheets-corrections.ts             # Application réelle
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzLNf0EpNRXK17LYuIHjHVTKlvbbZ0gtZHQah73ZCZM5HIC91qKCyAe-PF5PntqF1cnwg/exec';
const GAS_TOKEN = 'PORC800_JLB9kapOKuHRg-7CX6WPlSqMSvt5sU3v';
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Types ───────────────────────────────────────────────────────────────────

type GasReadResponse  = { ok?: boolean; values?: unknown[][]; error?: string };
type GasMutateResponse = { ok?: boolean; success?: boolean; error?: string; message?: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readSheet(sheet: string): Promise<unknown[][]> {
  const u = new URL(GAS_URL);
  u.searchParams.set('token', GAS_TOKEN);
  u.searchParams.set('action', 'read_sheet');
  u.searchParams.set('sheet', sheet);
  const resp = await fetch(u.toString(), { method: 'GET' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} reading ${sheet}`);
  const data = (await resp.json()) as GasReadResponse;
  if (!data.ok) throw new Error(`GAS read error on ${sheet}: ${data.error ?? 'unknown'}`);
  return data.values ?? [];
}

async function gasPost(payload: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const resp = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: GAS_TOKEN, device: { platform: 'node-corrections', version: '2026-04-25' }, timestamp: new Date().toISOString(), ...payload }),
  });
  if (!resp.ok) return { ok: false, message: `HTTP ${resp.status}` };
  const data = (await resp.json()) as GasMutateResponse;
  const ok = Boolean(data.ok ?? data.success);
  return { ok, message: data.error ?? data.message ?? (ok ? 'ok' : 'failed') };
}

function applyOrDry(label: string, action: string, detail: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n  [${DRY_RUN ? 'DRY-RUN' : 'APPLY  '}] ${label}`);
  console.log(`             action : ${action}`);
  console.log(`             detail : ${detail}`);
  if (DRY_RUN) return Promise.resolve();
  return fn();
}

// ─── Correction 1 : T11 statut contradictoire ────────────────────────────────
// TRUIES_REPRODUCTION headers (R2):
//   col[0]=ID  col[1]=Nom  col[2]=Boucle  col[3]=Statut  col[4]=Date MB prevue  col[9]=Notes

async function correction1(): Promise<void> {
  console.log('\n══ CORRECTION 1 — T11 statut contradictoire (TRUIES_REPRODUCTION) ══');

  const rows = await readSheet('TRUIES_REPRODUCTION');
  const headers = rows[2] as string[];  // row[2] = real headers
  console.log(`  Headers (R2): ${headers.join(' | ')}`);

  // Data rows start at index 3
  let found = false;
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (String(row[0]) === 'T11') {
      console.log(`  T11 trouvée R${i}: ${JSON.stringify(row)}`);
      console.log(`  Statut actuel : "${row[3]}"  MB prevue : "${row[4]}"`);
      found = true;

      // idHeader = "ID" (col 0), idValue = "T11"
      // Patch: Statut → "En attente saillie",  Date MB prevue → "Retour chaleur 21/04"
      const patch = {
        [headers[3]]: 'En attente saillie',
        [headers[4]]: 'Retour chaleur 21/04',
      };

      await applyOrDry(
        'T11 — statut + MB prevue',
        'update_row_by_id → TRUIES_REPRODUCTION',
        `patch=${JSON.stringify(patch)}`,
        async () => {
          const res = await gasPost({ action: 'update_row_by_id', sheet: 'TRUIES_REPRODUCTION', idHeader: headers[0], idValue: 'T11', patch });
          console.log(`  ${res.ok ? '✅' : '❌'}  ${res.message}`);
        },
      );
      break;
    }
  }
  if (!found) console.log('  ⚠️  T11 introuvable');
}

// ─── Correction 2 : Doublons REPRODUCTION R22–R26 ────────────────────────────
// REPRODUCTION headers (R2):
//   col[0]=ID Truie  col[1]=Boucle  col[2]=Nom  col[3]=Date saillie
//   col[4]=Verrat    col[5]=Date MB prevue  col[6]=Statut  col[7]=Notes
// Doublons confirmés : Row[22]=T7, Row[23]=T8, Row[24]=T11, Row[25]=T14, Row[26]=T15
// (même 5 truies saillies 05/04 déjà présentes en Row[7-11])

async function correction2(): Promise<void> {
  console.log('\n══ CORRECTION 2 — Doublons REPRODUCTION R22–R26 ══');

  const rows = await readSheet('REPRODUCTION');
  const headers = rows[2] as string[];  // row[2] = real headers
  console.log(`  Headers (R2): ${headers.join(' | ')}`);
  console.log(`  Total lignes : ${rows.length}`);

  // Doublons à supprimer : indices 22–26 (= T7/T8/T11/T14/T15 saillies 05/04)
  // Process highest first so row indices don't shift during sequential deletes
  const doublonIndices = [26, 25, 24, 23, 22].filter(i => i < rows.length);

  for (const idx of doublonIndices) {
    const row = rows[idx] as unknown[];
    const idValue = String(row[0]);  // col[0] = ID Truie

    console.log(`\n  Row[${idx}] = ${JSON.stringify(row)}`);

    await applyOrDry(
      `Doublon Row[${idx}] ID="${idValue}" — delete_row_by_id (fallback overwrite)`,
      'delete_row_by_id → REPRODUCTION',
      `idHeader="${headers[0]}" idValue="${idValue}"`,
      async () => {
        // Try delete first
        const delRes = await gasPost({
          action: 'delete_row_by_id',
          sheet: 'REPRODUCTION',
          idHeader: headers[0],
          idValue,
          reason: `Doublon saillie 05/04 (copie de R${idx - 15}) — correctif audit 2026-04-25`,
        });

        if (delRes.ok) {
          console.log(`  ✅  supprimé Row[${idx}] (${idValue}) · ${delRes.message}`);
        } else {
          // Fallback: overwrite with marker text
          console.log(`  ⚠️  delete échoué (${delRes.message}) → overwrite DOUBLON...`);
          const overwritePatch: Record<string, unknown> = {
            [headers[0]]: 'DOUBLON - À SUPPRIMER',
            [headers[2]]: '',
            [headers[3]]: '',
            [headers[7]]: `Doublon de saillie 05/04 — ligne originale Row[${idx - 15}]`,
          };
          const upRes = await gasPost({
            action: 'update_row_by_id',
            sheet: 'REPRODUCTION',
            idHeader: headers[0],
            idValue,
            patch: overwritePatch,
          });
          console.log(`  ${upRes.ok ? '✅' : '❌'}  overwrite Row[${idx}] · ${upRes.message}`);
        }
      },
    );
  }
}

// ─── Correction 3 : Dates MB périmées dans REPRODUCTION ──────────────────────
// col[0]=ID Truie  col[7]=Notes
// T17 Row[3], T9 Row[4], T16 Row[5], T12 Row[6]

async function correction3(): Promise<void> {
  console.log('\n══ CORRECTION 3 — Dates MB périmées dans REPRODUCTION ══');

  const rows = await readSheet('REPRODUCTION');
  const headers = rows[2] as string[];  // row[2] = real headers
  console.log(`  idHeader="${headers[0]}"  notesHeader="${headers[7]}"`);

  const corrections: Array<{ truie: string; note: string }> = [
    { truie: 'T17', note: 'MB prévue 17/04 — À VÉRIFIER TERRAIN (date dépassée)' },
    { truie: 'T9',  note: 'MB prévue 19/04 — À VÉRIFIER TERRAIN (date dépassée)' },
    { truie: 'T16', note: 'MB prévue 20/04 — À VÉRIFIER TERRAIN (date dépassée)' },
    { truie: 'T12', note: 'MB prévue 05/05 — dans 10 jours' },
  ];

  // Data rows start at index 3; scan all to find each truie
  for (const { truie, note } of corrections) {
    let found = false;
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (String(row[0]) === truie) {
        console.log(`\n  ${truie} → Row[${i}] note actuelle: "${row[7]}"`);
        console.log(`           note nouvelle: "${note}"`);
        found = true;

        await applyOrDry(
          `${truie} — mise à jour note MB`,
          'update_row_by_id → REPRODUCTION',
          `${headers[7]}="${note}"`,
          async () => {
            const res = await gasPost({
              action: 'update_row_by_id',
              sheet: 'REPRODUCTION',
              idHeader: headers[0],
              idValue: truie,
              patch: { [headers[7]]: note },
            });
            console.log(`  ${res.ok ? '✅' : '❌'}  ${res.message}`);
          },
        );
        break;
      }
    }
    if (!found) console.log(`\n  ⚠️  ${truie} introuvable dans REPRODUCTION`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  SHEETS-CORRECTIONS — Audit 2026-04-25 — Ferme A130 Nord ║');
  console.log(`║  Mode : ${DRY_RUN ? 'DRY RUN (aucune écriture)            ' : 'RÉEL   (écritures effectives)         '}   ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  await correction1();
  await correction2();
  await correction3();

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(DRY_RUN
    ? '✅  Dry-run terminé — aucune modification apportée aux Sheets'
    : '✅  Toutes corrections appliquées');
  console.log('══════════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
