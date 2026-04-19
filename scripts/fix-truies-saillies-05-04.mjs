#!/usr/bin/env node
/**
 * Autonomous fix : update TRUIES statut for saillies du 05/04/2026.
 * Source de vérité : SUIVI_REPRODUCTION_ACTUEL (confirmée par user).
 * Mapping confirmé par boucle.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const envRaw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
const env = {};
for (const line of envRaw.split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const URL_GAS = env.VITE_GAS_URL;
const TOKEN = env.VITE_GAS_TOKEN;

async function post(body) {
  const r = await fetch(URL_GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, ...body }),
  });
  return r.json();
}

// Mapping confirmé : REPRO boucle → TRUIES ID
// (5 truies — T10 skippée car statut En maternité contradictoire)
const SAILLIES_05_04 = [
  { truieId: 'T07', nom: 'Choupette', boucle: 'B.21' },
  { truieId: 'T09', nom: 'Zapata',    boucle: 'B.31' },
  { truieId: 'T11', nom: 'Ficelle',   boucle: 'B.12' },
  { truieId: 'T15', nom: 'Anillette', boucle: 'B.39' },
  { truieId: 'T16', nom: 'Pirouette', boucle: 'B.26' },
];

// Gestation 115j : 05/04/2026 + 115 = 28/07/2026
const DATE_MB_PREVUE = '28/07/2026';

console.log(`→ Mise à jour de ${SAILLIES_05_04.length} truies suite aux saillies du 05/04/2026\n`);

let ok = 0, ko = 0;
for (const s of SAILLIES_05_04) {
  console.log(`  ${s.truieId} ${s.nom} (${s.boucle})`);
  const patch = {
    Statut: 'Pleine',
    'Date MB prevue': DATE_MB_PREVUE,
    Notes: 'Saillie 05/04/2026 · mise à jour auto script',
  };
  const res = await post({
    action: 'update_row_by_id',
    sheet: 'TRUIES_REPRODUCTION',
    idHeader: 'ID',
    idValue: s.truieId,
    patch,
  });
  if (res?.ok) {
    ok++;
    console.log(`    ✓ Statut → Pleine · MB prévue → ${DATE_MB_PREVUE}`);
  } else {
    ko++;
    console.warn(`    ✗ ${res?.error || JSON.stringify(res).slice(0, 150)}`);
  }
}

console.log(`\n✓ ${ok}/${SAILLIES_05_04.length} mises à jour · ${ko} erreurs`);
console.log('\nAu prochain pull app (Plus → Forcer Pull), les 5 truies apparaîtront en "Pleine" avec MB prévue au 28/07/2026.');
console.log('\n⚠ Non traitées (action manuelle requise) :');
console.log('  · T10 (boucle B.37) : statut actuel "En maternité" contradictoire avec saillie 05/04. Clarifier.');
console.log('  · T17 (boucle 86) : absente de TRUIES mais référencée en REPRODUCTION. À créer si animal réel.');
console.log('  · Renommage portées : 26-T8-01→26-T9-01, 26-T14-01→26-T15-01, 26-T15-01→26-T16-01 (ordre important).');
