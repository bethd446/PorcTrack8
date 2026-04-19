#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv(path) {
  const raw = readFileSync(path, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv(resolve(ROOT, '.env.local'));
const GAS_URL = env.VITE_GAS_URL;
const GAS_TOKEN = env.VITE_GAS_TOKEN;
if (!GAS_URL || !GAS_TOKEN) {
  console.error('Missing VITE_GAS_URL or VITE_GAS_TOKEN in .env.local');
  process.exit(1);
}

async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({ token: GAS_TOKEN, action, ...params });
  const url = `${GAS_URL}?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${action}`);
  return res.json();
}

const EXPECTED = {
  SUIVI_TRUIES_REPRODUCTION: {
    entity: 'Truie',
    variants: {
      id: ['ID', 'ID_TRUIE'],
      boucle: ['BOUCLE'],
      nom: ['NOM'],
      race: ['RACE'],
      statut: ['STATUT', 'ETAT'],
      ration: ['RATION'],
      poids: ['POIDS'],
      emplacement: ['LOGE', 'EMPLACEMENT', 'ZONE'],
      stade: ['STADE'],
      nbPortees: ['NB_PORTEES', 'PORTÉES'],
      dateDerniereMB: ['DATE_DERNIERE_MB', 'DERNIERE_MB'],
      dateMBPrevue: ['DATE_MB_PREVUE', 'PROCHAINE_MB'],
      nvMoyen: ['NV_MOYEN', 'MOY_NV'],
    },
    statutCol: 'statut',
  },
  VERRATS: {
    entity: 'Verrat',
    variants: {
      id: ['ID', 'ID_VERRAT'],
      boucle: ['BOUCLE'],
      nom: ['NOM'],
      race: ['RACE'],
      statut: ['STATUT', 'ETAT'],
      ration: ['RATION'],
      poids: ['POIDS'],
      dateNaissance: ['DATE_NAISSANCE', 'NAISSANCE'],
    },
    statutCol: 'statut',
  },
  PORCELETS_BANDES_DETAIL: {
    entity: 'BandePorcelets',
    variants: {
      id: ['ID Portée', 'ID_PORTEE', 'ID'],
      truie: ['TRUIE'],
      boucleMere: ['BOUCLE MÈRE', 'BOUCLE_MERE'],
      dateMB: ['DATE MB', 'DATE_MB'],
      nv: ['NV'],
      morts: ['MORTS'],
      vivants: ['VIVANTS'],
      statut: ['STATUT'],
      dateSevragePrevue: ['DATE SEVRAGE PRÉVUE', 'SEVRAGE_PREVUE'],
      dateSevrageReelle: ['DATE SEVRAGE RÉELLE', 'SEVRAGE_REELLE'],
    },
    statutCol: 'statut',
  },
  JOURNAL_SANTE: {
    entity: 'TraitementSante',
    variants: {
      date: ['DATE'],
      cibleType: ['CIBLE_TYPE', 'SUJET_TYPE', 'TYPE'],
      cibleId: ['CIBLE_ID', 'SUJET_ID', 'ID', 'BOUCLE'],
      typeSoin: ['TYPE_SOIN', 'TYPE'],
      traitement: ['TRAITEMENT', 'SOIN', 'PRODUIT'],
      observation: ['OBSERVATION', 'NOTE', 'NOTES'],
      auteur: ['AUTEUR', 'USER'],
    },
  },
  STOCK_ALIMENTS: {
    entity: 'StockAliment',
    variants: {
      id: ['ID'],
      nom: ['NOM', 'ALIMENT'],
      type: ['TYPE'],
      quantite: ['QUANTITE'],
      unite: ['UNITE'],
      alerte: ['ALERTE'],
    },
  },
  STOCK_VETO: {
    entity: 'StockVeto',
    variants: {
      id: ['ID'],
      nom: ['NOM', 'PRODUIT'],
      quantite: ['QUANTITE'],
      unite: ['UNITE'],
      dlc: ['DLC', 'PEREMPTION'],
      alerte: ['ALERTE'],
    },
  },
};

const UPPER = (s) => String(s).toUpperCase();
const findCol = (header, variants) => {
  const up = header.map(UPPER);
  for (const v of variants) {
    const vu = UPPER(v);
    const i = up.indexOf(vu);
    if (i !== -1) return { index: i, exact: header[i] };
    const pi = up.findIndex((h) => h.includes(vu));
    if (pi !== -1) return { index: pi, exact: header[pi], partial: true };
  }
  return null;
};

function auditSheet(key, data, expected) {
  const header = data.header || [];
  const rows = data.rows || data.values || [];
  const result = {
    key,
    entity: expected.entity,
    rowCount: rows.length,
    header,
    matched: [],
    missing: [],
    extra: [],
    statutValues: new Set(),
    sampleIds: [],
  };

  const usedIndexes = new Set();
  for (const [field, variants] of Object.entries(expected.variants)) {
    const match = findCol(header, variants);
    if (match) {
      result.matched.push({ field, col: match.exact, partial: !!match.partial });
      usedIndexes.add(match.index);
    } else {
      result.missing.push({ field, variants });
    }
  }

  header.forEach((col, i) => {
    if (!usedIndexes.has(i)) result.extra.push(col);
  });

  const statutMatch = expected.statutCol && findCol(header, expected.variants[expected.statutCol]);
  if (statutMatch) {
    for (const row of rows) {
      const v = row[statutMatch.index];
      if (v !== undefined && v !== null && v !== '') result.statutValues.add(String(v));
    }
  }

  const idMatch = findCol(header, expected.variants.id || ['ID']);
  const boucleMatch = findCol(header, ['BOUCLE', 'BOUCLE MÈRE', 'BOUCLE_MERE']);
  for (const row of rows.slice(0, 5)) {
    const id = idMatch ? row[idMatch.index] : '?';
    const boucle = boucleMatch ? row[boucleMatch.index] : '—';
    result.sampleIds.push(`${id} (boucle: ${boucle})`);
  }

  return result;
}

function renderReport(index, audits, extraSheets) {
  const lines = [];
  lines.push('# Audit Google Sheets — PorcTrack 8');
  lines.push('');
  lines.push(`Date : ${new Date().toLocaleString('fr-FR')}`);
  lines.push(`Déploiement GAS : ${GAS_URL.replace(/\/macros\/s\/[^/]+\//, '/macros/s/***/')}`);
  lines.push('');
  lines.push('## 1. Tables indexées (TABLES_INDEX)');
  lines.push('');
  lines.push('| KEY | Sheet | Module | idHeader | Audité |');
  lines.push('|---|---|---|---|---|');
  for (const e of index) {
    const audited = audits.find((a) => a.key === e.key) ? '✓' : '—';
    lines.push(`| \`${e.key}\` | \`${e.sheetName}\` | ${e.module || '—'} | ${e.idHeader || '—'} | ${audited} |`);
  }
  lines.push('');

  if (extraSheets.length) {
    lines.push('## 1.b. Feuilles non référencées dans le TABLES_INDEX');
    lines.push('');
    for (const s of extraSheets) lines.push(`- \`${s}\``);
    lines.push('');
  }

  lines.push('## 2. Audit par entité');
  lines.push('');
  for (const a of audits) {
    lines.push(`### ${a.key} → \`${a.entity}\` (${a.rowCount} lignes)`);
    lines.push('');
    lines.push('**En-têtes réels Sheets :**');
    lines.push('');
    lines.push(a.header.map((h) => `\`${h}\``).join(' · '));
    lines.push('');
    lines.push('**Matchés (champ code → colonne Sheets) :**');
    lines.push('');
    for (const m of a.matched) {
      lines.push(`- \`${m.field}\` → \`${m.col}\`${m.partial ? ' ⚠️ _match partiel_' : ''}`);
    }
    lines.push('');
    if (a.missing.length) {
      lines.push('**❌ Champs code sans colonne Sheets correspondante :**');
      lines.push('');
      for (const m of a.missing) {
        lines.push(`- \`${m.field}\` (cherché : ${m.variants.join(', ')})`);
      }
      lines.push('');
    }
    if (a.extra.length) {
      lines.push('**➕ Colonnes Sheets non utilisées par le code :**');
      lines.push('');
      for (const c of a.extra) lines.push(`- \`${c}\``);
      lines.push('');
    }
    if (a.statutValues.size) {
      lines.push('**Valeurs uniques Statut rencontrées :**');
      lines.push('');
      lines.push([...a.statutValues].map((v) => `\`${v}\``).join(' · '));
      lines.push('');
    }
    if (a.sampleIds.length) {
      lines.push('**Échantillon IDs (5 premiers) :**');
      lines.push('');
      for (const s of a.sampleIds) lines.push(`- ${s}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  lines.push('## 3. Récapitulatif à agir');
  lines.push('');
  const issues = [];
  for (const a of audits) {
    if (a.missing.length) issues.push(`**${a.key}** : ${a.missing.length} champ(s) code sans colonne Sheets → ${a.missing.map((m) => m.field).join(', ')}`);
    if (a.extra.length > 0) issues.push(`**${a.key}** : ${a.extra.length} colonne(s) Sheets non exploitée(s) → ${a.extra.map((c) => `\`${c}\``).join(', ')}`);
  }
  if (issues.length === 0) lines.push('Aucune incohérence détectée. Schéma code ↔ Sheets parfaitement aligné.');
  else for (const i of issues) lines.push(`- ${i}`);
  lines.push('');
  return lines.join('\n');
}

async function listAllSheets() {
  try {
    const res = await gasGet('list_sheets');
    if (res?.ok && Array.isArray(res.sheets)) return res.sheets;
  } catch {
    // endpoint peut ne pas exister
  }
  return null;
}

(async () => {
  console.log('→ Fetching TABLES_INDEX...');
  const idx = await gasGet('get_tables_index');
  if (!idx?.ok) {
    console.error('get_tables_index failed:', idx);
    process.exit(2);
  }
  const raw = idx.values || [];
  const [hdr, ...dataRows] = raw;
  const col = (name) => hdr.findIndex((h) => String(h).toUpperCase() === name.toUpperCase());
  const cKey = col('KEY'), cSheet = col('SHEET_NAME'), cIdH = col('ID_HEADER'), cMod = col('MODULE');
  const index = dataRows.map((r) => ({ key: r[cKey], sheetName: r[cSheet], idHeader: r[cIdH], module: r[cMod] }));
  console.log(`  ${index.length} tables indexées`);

  const audits = [];
  for (const entry of index) {
    const expected = EXPECTED[entry.key];
    if (!expected) {
      console.log(`  ⏭  ${entry.key} (pas de mapper code)`);
      continue;
    }
    console.log(`→ Audit ${entry.key}...`);
    try {
      const res = await gasGet('read_table_by_key', { key: entry.key });
      if (!res?.ok) {
        console.warn(`  ⚠  ${entry.key} : ${res?.error || 'lecture KO'}`);
        continue;
      }
      audits.push(auditSheet(entry.key, res, expected));
    } catch (e) {
      console.warn(`  ⚠  ${entry.key} : ${e.message}`);
    }
  }

  const allSheets = await listAllSheets();
  const extraSheets = allSheets ? allSheets.filter((s) => !index.find((e) => e.sheetName === s)) : [];

  const md = renderReport(index, audits, extraSheets);
  const outPath = resolve(ROOT, 'SHEETS_AUDIT.md');
  writeFileSync(outPath, md, 'utf8');
  console.log(`\n✓ Rapport généré : ${outPath}`);
  console.log(`  ${audits.length} entités auditées, ${audits.reduce((n, a) => n + a.missing.length, 0)} champs manquants au total`);
})();
