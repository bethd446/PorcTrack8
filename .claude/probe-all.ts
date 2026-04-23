const url = process.env.VITE_GAS_URL!;
const token = process.env.VITE_GAS_TOKEN!;

async function read(sheet: string): Promise<unknown[][]> {
  const u = new URL(url);
  u.searchParams.set('token', token);
  u.searchParams.set('action', 'read_sheet');
  u.searchParams.set('sheet', sheet);
  const r = await fetch(u.toString());
  const d = (await r.json()) as { values?: unknown[][] };
  return d.values ?? [];
}

async function main(): Promise<void> {
  console.log('=== STOCK_ALIMENTS (6 rows) ===');
  for (const r of await read('STOCK_ALIMENTS')) console.log(JSON.stringify(r));
  console.log('\n=== REPRODUCTION (rows 10-28) ===');
  const repro = await read('REPRODUCTION');
  for (let i = 10; i < repro.length; i++) console.log(`R${i}:`, JSON.stringify(repro[i]));
  console.log('\n=== PORCELETS_BANDES (rows 10-17) ===');
  const bandes = await read('PORCELETS_BANDES');
  for (let i = 10; i < bandes.length; i++) console.log(`R${i}:`, JSON.stringify(bandes[i]));
}
main().catch(err => { console.error('Fatal:', err); process.exit(1); });
