const url = process.env.VITE_GAS_URL!;
const token = process.env.VITE_GAS_TOKEN!;

async function main(): Promise<void> {
  const u = new URL(url);
  u.searchParams.set('token', token);
  u.searchParams.set('action', 'get_tables_index');
  const r = await fetch(u.toString());
  const d = (await r.json()) as { values?: unknown[][] };
  const values = d.values ?? [];
  console.log('TABLES INDEX — ' + (values.length - 1) + ' tables :');
  for (const row of values.slice(1)) {
    const [key, sheetName, headerRow, idHeader, module, editable] = row as [string, string, number, string, string, boolean];
    console.log(`  ${editable ? '✏️ ' : '🔒'} ${key.padEnd(35)} → tab="${sheetName}" (idHeader=${idHeader}, module=${module})`);
  }
}
main().catch(err => { console.error('Fatal:', err); process.exit(1); });
