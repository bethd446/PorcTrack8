#!/usr/bin/env node
/**
 * Bootstrap feuille ALIMENT_FORMULES dans Google Sheets.
 *
 * Prérequis : la feuille `ALIMENT_FORMULES` doit exister dans le classeur
 * (créer manuellement, juste l'onglet vide) et être référencée dans TABLES_INDEX.
 * Si pas encore fait, ce script détecte l'absence et affiche les instructions.
 *
 * Usage :
 *   node scripts/seed-aliment-formules-sheets.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Lecture .env.local ─────────────────────────────────────────────────
const envRaw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
const env = {};
for (const line of envRaw.split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const { VITE_GAS_URL: URL, VITE_GAS_TOKEN: TOKEN } = env;
if (!URL || !TOKEN) {
  console.error('Missing VITE_GAS_URL / VITE_GAS_TOKEN');
  process.exit(1);
}

// ── Données à insérer (matche types/farm.ts FormuleRowSheets) ──────────
const HEADER = [
  'CODE_PHASE', 'NOM_PHASE', 'POIDS_RANGE',
  'TYPE_COMPOSANT', 'NOM', 'VALEUR', 'UNITE', 'ORDRE', 'NOTES',
];

// Code | Nom | Range | [Ingrédients] | [Additifs]
const FORMULES = [
  {
    code: 'DEMARRAGE_1', nom: 'Porcelets — Démarrage 1', range: '7 → 15 kg',
    ingredients: [
      ['Romelko', 50], ['KPC 5', 3], ['Maïs', 34],
      ['Son de blé', 3], ['Tourteau de soja', 10],
    ],
    additifs: [
      ['Lysine', 1, 'kg/T'], ['Méthionine', 0.5, 'kg/T'], ['Enzymes', 300, 'g/T'],
    ],
  },
  {
    code: 'CROISSANCE', nom: 'Porcs — Croissance', range: '25 → 50 kg',
    ingredients: [
      ['KPC 5', 5], ['Maïs', 68], ['Son de blé', 10], ['Tourteau de soja', 17],
      // Note : corrigé 18→17 (technicien PDF avait 18 mais total 101%)
    ],
    additifs: [
      ['Lysine', 1, 'kg/T'], ['Enzymes', 250, 'g/T'],
    ],
  },
  {
    code: 'FINITION', nom: 'Porcs — Finition', range: '50 → 100 kg',
    ingredients: [
      ['KPC 5', 5], ['Maïs', 70], ['Son de blé', 15], ['Tourteau de soja', 10],
    ],
    additifs: [
      ['Lysine', 0.5, 'kg/T'], ['Enzymes', 200, 'g/T'],
    ],
  },
  {
    code: 'TRUIE_GESTATION', nom: 'Truie — Gestation', range: 'Gestation 115j',
    ingredients: [
      ['KPC 5', 5], ['Maïs', 58], ['Son de blé', 30], ['Tourteau de soja', 7],
    ],
    additifs: [
      ['Enzymes', 200, 'g/T'],
    ],
  },
  {
    code: 'TRUIE_LACTATION', nom: 'Truie — Lactation', range: 'Allaitement 21j',
    ingredients: [
      ['KPC 5', 6], ['Maïs', 58], ['Son de blé', 18], ['Tourteau de soja', 18],
    ],
    additifs: [
      ['Lysine', 1, 'kg/T'], ['Enzymes', 300, 'g/T'],
    ],
  },
];

// ── Construit les rows à insérer ──────────────────────────────────────
const rows = [];
for (const f of FORMULES) {
  let ordre = 1;
  for (const [nom, pct] of f.ingredients) {
    rows.push([f.code, f.nom, f.range, 'INGREDIENT', nom, pct, '%', ordre++, '']);
  }
  ordre = 100;
  for (const [nom, dose, unite] of f.additifs) {
    rows.push([f.code, f.nom, f.range, 'ADDITIF', nom, dose, unite, ordre++, '']);
  }
}

console.log(`→ ${rows.length} lignes à insérer dans ALIMENT_FORMULES`);

// ── Vérif préalable : la feuille existe et est référencée ? ────────────
async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({ token: TOKEN, action, ...params });
  const r = await fetch(`${URL}?${qs}`);
  return r.json();
}

async function gasPost(body) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, ...body }),
  });
  return r.json();
}

console.log('→ Vérification de l\'existence de la feuille…');
const idx = await gasGet('get_tables_index');
const refs = (idx?.values || []).slice(1); // skip header
const registered = refs.some(r => String(r[0]).trim() === 'ALIMENT_FORMULES');

if (!registered) {
  console.log('\n⚠ La feuille ALIMENT_FORMULES n\'est pas référencée dans TABLES_INDEX.\n');
  console.log('ACTIONS MANUELLES À FAIRE (5 min) :');
  console.log('  1. Ouvre ton classeur Google Sheets');
  console.log('  2. Crée un nouvel onglet nommé : ALIMENT_FORMULES');
  console.log('  3. Dans la ligne 1 (header), colle : ' + HEADER.join(' | '));
  console.log('  4. Ouvre l\'onglet TABLES_INDEX');
  console.log('  5. Ajoute une ligne avec :');
  console.log('     KEY=ALIMENT_FORMULES · SHEET_NAME=ALIMENT_FORMULES · HEADER_ROW=1 · ID_HEADER=CODE_PHASE · MODULE=Nutrition · EDITABLE=TRUE');
  console.log('  6. Relance ce script.\n');
  process.exit(0);
}

console.log('✓ Feuille référencée');

// ── Vérif contenu existant pour éviter doublons ────────────────────────
const existing = await gasGet('read_table_by_key', { key: 'ALIMENT_FORMULES' });
const existingRows = existing?.rows || [];
console.log(`→ Lignes déjà présentes : ${existingRows.length}`);

if (existingRows.length > 0) {
  console.log('\n⚠ La feuille contient déjà des données. Voulez-vous écraser ? Pour forcer : supprime les lignes dans Sheets puis relance.');
  process.exit(0);
}

// ── Insertion ligne par ligne via append_row ───────────────────────────
console.log('→ Insertion des formules…');
let inserted = 0, errors = 0;
for (const row of rows) {
  try {
    const res = await gasPost({
      action: 'append_row',
      sheet: 'ALIMENT_FORMULES',
      row,
    });
    if (res?.ok) inserted++;
    else { errors++; console.warn('  ✗', res?.error || JSON.stringify(res).slice(0, 100)); }
  } catch (e) {
    errors++;
    console.warn('  ✗', e.message);
  }
}

console.log(`\n✓ ${inserted}/${rows.length} lignes insérées`);
if (errors > 0) console.log(`✗ ${errors} erreurs`);
console.log('\nL\'app PorcTrack va maintenant lire ces formules au prochain chargement.');
console.log('Pour forcer un refresh immédiat : Plus → Forcer Pull');
