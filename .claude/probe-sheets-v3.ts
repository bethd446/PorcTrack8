/**
 * probe-sheets-v3.ts — Essai read_sheet avec les noms de tabs réels.
 */

const url = process.env.VITE_GAS_URL!;
const token = process.env.VITE_GAS_TOKEN!;

async function gasRead(action: string, params: Record<string, string>): Promise<unknown> {
  const u = new URL(url);
  u.searchParams.set('token', token);
  u.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const resp = await fetch(u.toString(), { method: 'GET' });
  return await resp.json();
}

async function dump(action: string, params: Record<string, string>, label: string): Promise<void> {
  const data = (await gasRead(action, params)) as {
    ok?: boolean;
    values?: unknown[][];
    error?: string;
  };
  if (!data.ok) {
    console.log(`\n─── ${label} ─── ❌ ${data.error ?? 'FAIL'}`);
    return;
  }
  const values = data.values ?? [];
  console.log(`\n─── ${label} (${values.length} rows total) ───`);
  for (const [i, row] of values.slice(0, 10).entries()) {
    console.log(`R${i}:`, JSON.stringify(row));
  }
  if (values.length > 10) console.log(`... +${values.length - 10} rows`);
}

async function main(): Promise<void> {
  // Try read_sheet avec les vrais tab names de l'index
  await dump('read_sheet', { sheet: 'REPRODUCTION' }, 'REPRODUCTION (tab)');
  await dump('read_sheet', { sheet: 'PORCELETS_BANDES' }, 'PORCELETS_BANDES (tab)');
  await dump('read_sheet', { sheet: 'STOCK_ALIMENTS' }, 'STOCK_ALIMENTS (tab)');
  await dump('read_sheet', { sheet: 'TRUIES_REPRODUCTION' }, 'TRUIES_REPRODUCTION (tab)');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
