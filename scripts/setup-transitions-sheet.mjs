#!/usr/bin/env node
/**
 * Aide à la mise en place de la feuille HISTORIQUE_TRANSITIONS.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Lecture .env.local
const envRaw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
const env = {};
for (const line of envRaw.split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const { VITE_GAS_URL: URL, VITE_GAS_TOKEN: TOKEN } = env;

const HEADER = [
  'BANDE_ID', 'FROM_PHASE', 'TO_PHASE', 'DATE_TRANSITION',
  'UTILISATEUR', 'POIDS_KG', 'AGE_JOURS', 'NOTES'
];

async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({ token: TOKEN, action, ...params });
  const r = await fetch(`${URL}?${qs}`);
  return r.json();
}

console.log('--- Configuration HISTORIQUE_TRANSITIONS ---');

const idx = await gasGet('get_tables_index');
const refs = (idx?.values || []).slice(1);
const registered = refs.some(r => String(r[0]).trim() === 'HISTORIQUE_TRANSITIONS');

if (!registered) {
  console.log('\n⚠ La feuille HISTORIQUE_TRANSITIONS n\'est pas référencée dans TABLES_INDEX.\n');
  console.log('ACTIONS MANUELLES À FAIRE :');
  console.log('  1. Ouvre ton classeur Google Sheets');
  console.log('  2. Crée un nouvel onglet nommé : HISTORIQUE_TRANSITIONS');
  console.log('  3. Dans la ligne 1 (header), colle :');
  console.log('     ' + HEADER.join(' | '));
  console.log('  4. Ouvre l\'onglet TABLES_INDEX');
  console.log('  5. Ajoute une ligne avec :');
  console.log('     KEY=HISTORIQUE_TRANSITIONS · SHEET_NAME=HISTORIQUE_TRANSITIONS · HEADER_ROW=1 · ID_HEADER=BANDE_ID · MODULE=Production · EDITABLE=FALSE');
  console.log('\nUne fois ces étapes faites, le Phase Engine pourra enregistrer les transitions.');
} else {
  console.log('✓ HISTORIQUE_TRANSITIONS est déjà référencé.');
  const sheet = await gasGet('read_sheet', { sheet: 'HISTORIQUE_TRANSITIONS' });
  if (sheet.ok) {
    console.log('✓ La feuille existe et est accessible.');
  } else {
    console.log('⚠ La feuille est référencée mais inaccessible (SHEET_NOT_FOUND). Vérifie le nom de l\'onglet.');
  }
}
