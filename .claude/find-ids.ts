import { readTableByKey } from '../src/services/googleSheets';

async function findIds() {
  const envUrl = process.env.VITE_GAS_URL;
  const envToken = process.env.VITE_GAS_TOKEN;

  if (!envUrl || !envToken) {
    console.error('Missing env vars');
    process.exit(1);
  }

  console.log('--- REPRO ---');
  const repro = await readTableByKey('SUIVI_TRUIES_REPRODUCTION');
  if (repro.success) {
    const idIdx = repro.headers.indexOf('ID');
    const boucleIdx = repro.headers.indexOf('Boucle');
    const nomIdx = repro.headers.indexOf('Nom');
    repro.rows.forEach(r => {
      if (r[idIdx] === 'T11' || String(r[boucleIdx]) === '12' || String(r[boucleIdx]) === '38') {
        console.log(`TRUIE Found: ID=${r[idIdx]}, Boucle=${r[boucleIdx]}, Nom=${r[nomIdx]}`);
      }
    });
  }

  console.log('--- BANDES ---');
  const bandes = await readTableByKey('PORCELETS_BANDES_DETAIL');
  if (bandes.success) {
    console.log('Headers:', bandes.headers);
    const idIdx = bandes.headers.indexOf('ID');
    bandes.rows.forEach(r => {
      if (String(r[idIdx]).includes('26-T18-01')) {
        console.log(`BANDE Found: ID=${r[idIdx]}`);
      }
    });
  }
}

findIds().catch(console.error);
