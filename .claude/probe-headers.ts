// Quick probe to see all rows 0–3 of both sheets
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzLNf0EpNRXK17LYuIHjHVTKlvbbZ0gtZHQah73ZCZM5HIC91qKCyAe-PF5PntqF1cnwg/exec';
const GAS_TOKEN = 'PORC800_JLB9kapOKuHRg-7CX6WPlSqMSvt5sU3v';

async function read(sheet: string): Promise<unknown[][]> {
  const u = new URL(GAS_URL);
  u.searchParams.set('token', GAS_TOKEN);
  u.searchParams.set('action', 'read_sheet');
  u.searchParams.set('sheet', sheet);
  const r = await fetch(u.toString());
  const d = await r.json() as { ok?: boolean; values?: unknown[][] };
  return d.values ?? [];
}

async function main() {
  for (const sheet of ['TRUIES_REPRODUCTION', 'REPRODUCTION']) {
    const rows = await read(sheet);
    console.log(`\n=== ${sheet} (${rows.length} rows) ===`);
    for (let i = 0; i < Math.min(4, rows.length); i++) {
      console.log(`R${i}: ${JSON.stringify(rows[i])}`);
    }
    console.log('...');
    // Also show row 1 which might be the real header
    if (rows.length > 1) console.log(`R1 (possible header): ${JSON.stringify(rows[1])}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
