#!/usr/bin/env node
/**
 * PorcTrack 8 — Data Broker : snapshot Google Sheets (lecture seule).
 *
 * Construit un snapshot JSON structuré + un résumé markdown lisible, servant
 * de source de vérité partagée aux autres agents (UI, design, ingénierie).
 *
 *   node scripts/data-broker/build-snapshot.mjs [--date=YYYY-MM-DD]
 *
 * Le script n'écrit JAMAIS dans les sheets. Lecture via GAS API uniquement.
 * Si le GAS est indisponible ou token manquant, il produit un placeholder
 * marqué `stale` avec la liste d'étapes pour configurer l'accès.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const OUT_DIR = resolve(ROOT, 'scripts', 'data-broker');

// ─── Arg parsing ────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/);
    return m ? [m[1], m[2] || true] : [a, true];
  }),
);
const TODAY_ISO = new Date().toISOString();
const SNAPSHOT_DATE = args.date || new Date().toISOString().slice(0, 10);
const FARM = args.farm || 'K13';

// ─── ENV ────────────────────────────────────────────────────────────────────
function loadEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const env = loadEnv(resolve(ROOT, '.env.local'));
const GAS_URL = env.VITE_GAS_URL;
const GAS_TOKEN = env.VITE_GAS_TOKEN;

// ─── GAS client ─────────────────────────────────────────────────────────────
async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({ token: GAS_TOKEN, action, ...params });
  const r = await fetch(`${GAS_URL}?${qs}`);
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${action}`);
  return r.json();
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const UPPER = (s) => String(s || '').toUpperCase().trim();
const norm = (s) => String(s == null ? '' : s).trim();

function wrapRows(header, rows) {
  const H = header.map((h, i) => ({ i, up: UPPER(h) }));
  const idx = (name) => {
    const u = UPPER(name);
    const exact = H.find((h) => h.up === u);
    if (exact) return exact.i;
    const partial = H.find((h) => h.up.includes(u));
    return partial ? partial.i : -1;
  };
  return {
    header,
    rows,
    objs: rows.map((r) => ({
      get: (name) => {
        const i = idx(name);
        return i === -1 ? undefined : r[i];
      },
      find: (aliases) => {
        for (const a of aliases) {
          const i = idx(a);
          if (i !== -1) return r[i];
        }
        return undefined;
      },
    })),
  };
}

async function readSheet(name, hintedHeaderRow = 1) {
  try {
    const r = await gasGet('read_sheet', { sheet: name });
    if (!r?.ok) return null;
    const values = r.values || [];
    if (!values.length) return wrapRows([], []);
    let headerIdx = (hintedHeaderRow || 1) - 1;
    for (let tries = 0; tries < 5; tries++) {
      if (headerIdx >= values.length) break;
      const row = values[headerIdx] || [];
      const nonEmpty = row.filter((c) => c !== '' && c !== null && c !== undefined).length;
      if (nonEmpty >= 3) break;
      headerIdx++;
    }
    const header = values[headerIdx] || [];
    const rest = values.slice(headerIdx + 1);
    return wrapRows(header, rest);
  } catch {
    return null;
  }
}

async function readKey(key) {
  try {
    const r = await gasGet('read_table_by_key', { key });
    if (!r?.ok) return null;
    const header = r.header || [];
    const rows = r.rows || r.values || [];
    const nonEmpty = header.filter((c) => c !== '' && c !== null && c !== undefined).length;
    if (nonEmpty >= 3) return wrapRows(header, rows);
    return null;
  } catch {
    return null;
  }
}

function toDdMmYyyy(v) {
  if (!v) return '';
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${String(v.getDate()).padStart(2, '0')}/${String(v.getMonth() + 1).padStart(2, '0')}/${v.getFullYear()}`;
  }
  const s = String(v).trim();
  if (!s) return '';
  // ISO?
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  // already dd/MM/yyyy?
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    const yy = y.length === 2 ? '20' + y : y;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${yy}`;
  }
  // generic Date parse fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  return s;
}

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
};

// ─── Snapshot builder ───────────────────────────────────────────────────────
async function build() {
  const snapshot = {
    timestamp: TODAY_ISO,
    farm: FARM,
    source: {
      gasUrl: GAS_URL ? GAS_URL.replace(/\/macros\/s\/[^/]+\//, '/macros/s/***/') : null,
      hasToken: Boolean(GAS_TOKEN),
      stale: false,
    },
    counts: {},
    truies: [],
    verrats: [],
    portees: [],
    stocks_aliment: [],
    stocks_veto: [],
    finances: [],
    alertes: [],
    validation: { ok: true, warnings: [], errors: [] },
  };

  if (!GAS_URL || !GAS_TOKEN) {
    snapshot.source.stale = true;
    snapshot.validation.ok = false;
    snapshot.validation.errors.push(
      'GAS_URL ou GAS_TOKEN manquant dans .env.local — snapshot non rempli.',
    );
    snapshot.source.setup_steps = [
      'Créer /Users/desk/PorcTrack8/.env.local',
      'Ajouter : VITE_GAS_URL="https://script.google.com/macros/s/<DEPLOY_ID>/exec"',
      'Ajouter : VITE_GAS_TOKEN="<token>"',
      'Relancer : node scripts/data-broker/build-snapshot.mjs',
    ];
    return snapshot;
  }

  // 1. TRUIES
  const truiesTable = await readKey('SUIVI_TRUIES_REPRODUCTION');
  if (truiesTable) {
    for (const o of truiesTable.objs) {
      const id = norm(o.find(['ID', 'ID_TRUIE']));
      if (!id) continue;
      snapshot.truies.push({
        id,
        boucle: norm(o.find(['BOUCLE'])),
        nom: norm(o.find(['NOM'])),
        race: norm(o.find(['RACE'])),
        statut: norm(o.find(['STATUT', 'ETAT'])),
        stade: norm(o.find(['STADE'])),
        emplacement: norm(o.find(['LOGE', 'EMPLACEMENT', 'ZONE'])),
        ration: toNum(o.find(['RATION KG/J', 'RATION'])),
        poids: toNum(o.find(['POIDS'])),
        nbPortees: toNum(o.find(['NB PORTEES', 'NB_PORTEES'])) ?? 0,
        dateDerniereMB: toDdMmYyyy(o.find(['DATE DERNIERE MB', 'DERNIERE_MB'])),
        dateMBPrevue: toDdMmYyyy(o.find(['DATE MB PREVUE', 'PROCHAINE_MB'])),
        derniereNV: toNum(o.find(['DERNIERE PORTEE NV', 'NV_MOYEN'])) ?? 0,
      });
    }
  } else {
    snapshot.validation.errors.push('Lecture SUIVI_TRUIES_REPRODUCTION KO');
  }

  // 2. VERRATS
  const verratsTable = await readKey('VERRATS');
  if (verratsTable) {
    for (const o of verratsTable.objs) {
      const id = norm(o.find(['ID', 'ID_VERRAT']));
      if (!id) continue;
      snapshot.verrats.push({
        id,
        boucle: norm(o.find(['BOUCLE'])),
        nom: norm(o.find(['NOM'])),
        race: norm(o.find(['RACE'])),
        statut: norm(o.find(['STATUT', 'ETAT'])) || 'Actif',
        origine: norm(o.find(['ORIGINE', 'PROVENANCE'])),
        dateNaissance: toDdMmYyyy(o.find(['DATE NAISSANCE', 'NAISSANCE'])),
        ration: toNum(o.find(['RATION KG/J', 'RATION'])),
      });
    }
  } else {
    snapshot.validation.errors.push('Lecture VERRATS KO');
  }

  // 3. PORTEES / PORCELETS
  const porteesTable = await readKey('PORCELETS_BANDES_DETAIL');
  if (porteesTable) {
    for (const o of porteesTable.objs) {
      const idPortee = norm(o.find(['ID PORTÉE', 'ID PORTEE', 'ID_PORTEE', 'ID']));
      const statut = norm(o.find(['STATUT']));
      const isRecap = /RECAP/i.test(statut) || /RECAP/i.test(idPortee);
      if (isRecap) continue;
      if (!idPortee) continue;
      snapshot.portees.push({
        idPortee,
        truie: norm(o.find(['TRUIE'])),
        boucleMere: norm(o.find(['BOUCLE MÈRE', 'BOUCLE MERE', 'BOUCLE_MERE'])),
        dateMB: toDdMmYyyy(o.find(['DATE MB', 'DATE_MB'])),
        nv: toNum(o.find(['NV'])) ?? 0,
        morts: toNum(o.find(['MORTS'])) ?? 0,
        vivants: toNum(o.find(['VIVANTS'])) ?? 0,
        nbMales: toNum(o.find(['MALES', 'NB_MALES', 'MÂLES'])) ?? null,
        nbFemelles: toNum(o.find(['FEMELLES', 'NB_FEMELLES'])) ?? null,
        statut,
        dateSevragePrevue: toDdMmYyyy(o.find(['DATE SEVRAGE PRÉVUE', 'DATE SEVRAGE PREVUE', 'SEVRAGE_PREVUE'])),
        dateSevrageReelle: toDdMmYyyy(o.find(['DATE SEVRAGE RÉELLE', 'DATE SEVRAGE REELLE', 'SEVRAGE_REELLE'])),
        dateSeparation: toDdMmYyyy(o.find(['DATE SEPARATION', 'DATE_SEPARATION'])),
        logeEngraissement: norm(o.find(['LOGE ENGRAISSEMENT', 'LOGE_ENG', 'LOGE'])),
      });
    }
  } else {
    snapshot.validation.errors.push('Lecture PORCELETS_BANDES_DETAIL KO');
  }

  // 4. STOCK_ALIMENTS
  const stockAl = await readKey('STOCK_ALIMENTS');
  if (stockAl) {
    for (const o of stockAl.objs) {
      const libelle = norm(o.find(['LIBELLE', 'NOM', 'ALIMENT']));
      if (!libelle) continue;
      const stock = toNum(o.find(['STOCK_ACTUEL', 'QUANTITE', 'QTE'])) ?? 0;
      const seuil = toNum(o.find(['SEUIL_ALERTE', 'ALERTE', 'SEUIL'])) ?? 0;
      let statutStock = 'OK';
      if (stock === 0) statutStock = 'RUPTURE';
      else if (seuil > 0 && stock <= seuil) statutStock = 'BAS';
      snapshot.stocks_aliment.push({
        libelle,
        type: norm(o.find(['TYPE', 'CATEGORIE'])),
        stockActuel: stock,
        unite: norm(o.find(['UNITE'])) || 'kg',
        seuilAlerte: seuil,
        statutStock,
      });
    }
  }

  // 5. STOCK_VETO
  const stockVeto = await readKey('STOCK_VETO');
  if (stockVeto) {
    for (const o of stockVeto.objs) {
      const produit = norm(o.find(['LIBELLE', 'NOM', 'PRODUIT']));
      if (!produit) continue;
      const stock = toNum(o.find(['STOCK_ACTUEL', 'QUANTITE'])) ?? 0;
      const seuil = toNum(o.find(['STOCK_MIN', 'SEUIL', 'ALERTE'])) ?? 0;
      let statutStock = 'OK';
      if (stock === 0) statutStock = 'RUPTURE';
      else if (seuil > 0 && stock <= seuil) statutStock = 'BAS';
      snapshot.stocks_veto.push({
        produit,
        type: norm(o.find(['TYPE', 'CATEGORIE'])),
        usage: norm(o.find(['USAGE', 'INDICATION'])),
        stockActuel: stock,
        unite: norm(o.find(['UNITE'])) || '',
        statutStock,
        dlc: toDdMmYyyy(o.find(['DLC', 'PEREMPTION'])),
      });
    }
  }

  // 6. FINANCES (20 dernières)
  const fin = await readSheet('FINANCES', 3);
  if (fin) {
    const all = fin.objs.map((o) => ({
      date: toDdMmYyyy(o.find(['DATE'])),
      categorie: norm(o.find(['TYPE', 'CATEGORIE', 'CATEGORY'])),
      libelle: norm(o.find(['POSTE', 'LIBELLE'])),
      montant: toNum(o.find(['MENSUEL (FCFA)', 'MONTANT', 'AMOUNT'])) ?? 0,
      type: norm(o.find(['NATURE', 'TYPE_OP', 'SENS'])),
      bandeId: norm(o.find(['BANDE', 'BANDE_ID', 'PORTEE'])),
    }));
    snapshot.finances = all.slice(-20);
  }

  // 7. ALERTES_ACTIVES (optionnel)
  const alertes = await readSheet('ALERTES_ACTIVES', 3);
  if (alertes) {
    for (const o of alertes.objs) {
      const titre = norm(o.find(['TITRE', 'MESSAGE', 'LIBELLE', 'ALERTE']));
      if (!titre) continue;
      snapshot.alertes.push({
        titre,
        priorite: norm(o.find(['PRIORITÉ', 'PRIORITE', 'PRIORITY'])),
        type: norm(o.find(['TYPE', 'CATEGORIE'])),
        cible: norm(o.find(['CIBLE', 'ID', 'ANIMAL'])),
        date: toDdMmYyyy(o.find(['DATE', 'DATE_CREATION', 'CREE_LE'])),
      });
    }
  }

  // Counts
  const porceletsVivants = snapshot.portees.reduce((s, p) => s + (p.vivants || 0), 0);
  snapshot.counts = {
    truies: snapshot.truies.length,
    verrats: snapshot.verrats.length,
    portees: snapshot.portees.length,
    porcelets_vivants: porceletsVivants,
    stocks_aliment: snapshot.stocks_aliment.length,
    stocks_veto: snapshot.stocks_veto.length,
    finances: snapshot.finances.length,
    alertes: snapshot.alertes.length,
  };

  // Validation
  const EXPECTED_TRUIES = 17;
  const EXPECTED_VERRATS = 2;
  const EXPECTED_PORTEES = 14;
  const EXPECTED_PORCELETS = 102;
  const PORCELETS_TOLERANCE = 30; // déclaré ~100, sheets historiquement ~149

  if (snapshot.counts.truies !== EXPECTED_TRUIES) {
    snapshot.validation.warnings.push(
      `Truies: ${snapshot.counts.truies} trouvées (attendu ${EXPECTED_TRUIES})`,
    );
  }
  if (snapshot.counts.verrats !== EXPECTED_VERRATS) {
    snapshot.validation.warnings.push(
      `Verrats: ${snapshot.counts.verrats} trouvés (attendu ${EXPECTED_VERRATS})`,
    );
  }
  if (snapshot.counts.portees !== EXPECTED_PORTEES) {
    snapshot.validation.warnings.push(
      `Portées actives: ${snapshot.counts.portees} trouvées (attendu ${EXPECTED_PORTEES})`,
    );
  }
  if (Math.abs(porceletsVivants - EXPECTED_PORCELETS) > PORCELETS_TOLERANCE) {
    snapshot.validation.warnings.push(
      `Porcelets vivants: ${porceletsVivants} (attendu ~${EXPECTED_PORCELETS})`,
    );
  }

  // Format boucle
  const bouclesInvalid = snapshot.truies.filter(
    (t) => t.boucle && !/^B\.?\d+|^\d+$/i.test(t.boucle),
  );
  if (bouclesInvalid.length) {
    snapshot.validation.warnings.push(
      `Boucles truies non standard: ${bouclesInvalid.map((t) => `${t.id}="${t.boucle}"`).join(', ')}`,
    );
  }

  // Undefined/null critiques
  const truiesSansStatut = snapshot.truies.filter((t) => !t.statut).map((t) => t.id);
  if (truiesSansStatut.length) {
    snapshot.validation.errors.push(`Truies sans statut: ${truiesSansStatut.join(', ')}`);
  }
  const porteesSansDate = snapshot.portees.filter((p) => !p.dateMB).map((p) => p.idPortee);
  if (porteesSansDate.length) {
    snapshot.validation.warnings.push(`Portées sans dateMB: ${porteesSansDate.join(', ')}`);
  }

  snapshot.validation.ok = snapshot.validation.errors.length === 0;

  // Expected vs actual divergences summary
  snapshot.divergences = {
    truies: { expected: EXPECTED_TRUIES, actual: snapshot.counts.truies },
    verrats: { expected: EXPECTED_VERRATS, actual: snapshot.counts.verrats },
    portees: { expected: EXPECTED_PORTEES, actual: snapshot.counts.portees },
    porcelets_vivants: { expected_approx: EXPECTED_PORCELETS, actual: porceletsVivants },
  };

  return snapshot;
}

// ─── Summary markdown ───────────────────────────────────────────────────────
function renderSummary(s) {
  const L = [];
  const d = SNAPSHOT_DATE;
  L.push(`# Snapshot Data — ${d}`);
  L.push('');
  L.push(`- Ferme : **${s.farm}**`);
  L.push(`- Timestamp : \`${s.timestamp}\``);
  L.push(`- Source : ${s.source.stale ? '**STALE (GAS indisponible)**' : `GAS live (\`${s.source.gasUrl}\`)`}`);
  L.push(`- Validation : ${s.validation.ok ? '**OK**' : '**ERREURS**'} — ${s.validation.warnings.length} warnings, ${s.validation.errors.length} erreurs`);
  L.push('');
  L.push('## Counts');
  L.push('');
  L.push('| Entité | Attendu | Trouvé | Ecart |');
  L.push('|---|---|---|---|');
  const row = (label, expected, actual) => {
    const ecart = actual - expected;
    const mark = ecart === 0 ? '✅' : '⚠';
    L.push(`| ${label} | ${expected} | ${actual} | ${ecart >= 0 ? '+' : ''}${ecart} ${mark} |`);
  };
  row('Truies', 17, s.counts.truies);
  row('Verrats', 2, s.counts.verrats);
  row('Portées actives', 14, s.counts.portees);
  row('Porcelets vivants', 102, s.counts.porcelets_vivants);
  L.push('');

  // Truies
  L.push('## Truies (17 attendues)');
  L.push('');
  L.push('| ID | Boucle | Nom | Statut | Stade | Date MB prévue | Ration kg/j |');
  L.push('|---|---|---|---|---|---|---|');
  const truiesSorted = [...s.truies].sort((a, b) => a.id.localeCompare(b.id));
  for (const t of truiesSorted) {
    L.push(`| ${t.id} | ${t.boucle || '—'} | ${t.nom || '_sans nom_'} | ${t.statut || '—'} | ${t.stade || '—'} | ${t.dateMBPrevue || '—'} | ${t.ration ?? '—'} |`);
  }
  L.push('');

  // Verrats
  L.push('## Verrats (2 attendus)');
  L.push('');
  L.push('| ID | Boucle | Nom | Statut | Origine |');
  L.push('|---|---|---|---|---|');
  for (const v of s.verrats) {
    L.push(`| ${v.id} | ${v.boucle || '—'} | ${v.nom || '—'} | ${v.statut || '—'} | ${v.origine || '—'} |`);
  }
  L.push('');

  // Portées
  L.push('## Portées actives (14 attendues)');
  L.push('');
  L.push('| ID Portée | Truie | Boucle mère | Date MB | NV | Vivants | Statut | Sevrage prévu |');
  L.push('|---|---|---|---|---|---|---|---|');
  const porteesSorted = [...s.portees].sort((a, b) => (a.dateMB || '').localeCompare(b.dateMB || ''));
  for (const p of porteesSorted) {
    L.push(`| ${p.idPortee} | ${p.truie || '—'} | ${p.boucleMere || '—'} | ${p.dateMB || '—'} | ${p.nv} | ${p.vivants} | ${p.statut || '—'} | ${p.dateSevragePrevue || '—'} |`);
  }
  L.push('');

  // Stocks en rupture
  const rupturesAl = s.stocks_aliment.filter((x) => x.statutStock === 'RUPTURE');
  const basAl = s.stocks_aliment.filter((x) => x.statutStock === 'BAS');
  const rupturesVeto = s.stocks_veto.filter((x) => x.statutStock === 'RUPTURE');
  L.push('## Stocks');
  L.push('');
  L.push(`- Aliments totaux : ${s.stocks_aliment.length} (rupture : ${rupturesAl.length}, bas : ${basAl.length})`);
  L.push(`- Véto totaux : ${s.stocks_veto.length} (rupture : ${rupturesVeto.length})`);
  if (rupturesAl.length) {
    L.push('');
    L.push('**Aliments en rupture :**');
    for (const a of rupturesAl) L.push(`- ${a.libelle} (seuil : ${a.seuilAlerte} ${a.unite})`);
  }
  if (rupturesVeto.length && rupturesVeto.length <= 15) {
    L.push('');
    L.push('**Véto en rupture (échantillon) :**');
    for (const v of rupturesVeto.slice(0, 15)) L.push(`- ${v.produit}`);
  } else if (rupturesVeto.length > 15) {
    L.push('');
    L.push(`**Véto en rupture :** ${rupturesVeto.length} produits (voir JSON)`);
  }
  L.push('');

  // Divergences
  L.push('## Divergences');
  L.push('');
  if (s.validation.errors.length === 0 && s.validation.warnings.length === 0) {
    L.push('_Aucune divergence._');
  } else {
    if (s.validation.errors.length) {
      L.push('**Erreurs :**');
      for (const e of s.validation.errors) L.push(`- ❌ ${e}`);
      L.push('');
    }
    if (s.validation.warnings.length) {
      L.push('**Warnings :**');
      for (const w of s.validation.warnings) L.push(`- ⚠ ${w}`);
    }
  }
  L.push('');

  return L.join('\n');
}

// ─── Run ────────────────────────────────────────────────────────────────────
(async () => {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log(`→ Building snapshot for ${SNAPSHOT_DATE} (farm ${FARM})`);
  const snapshot = await build();

  const outJson = resolve(OUT_DIR, `snapshot-${SNAPSHOT_DATE}.json`);
  const outMd = resolve(OUT_DIR, `summary-${SNAPSHOT_DATE}.md`);
  writeFileSync(outJson, JSON.stringify(snapshot, null, 2), 'utf8');
  writeFileSync(outMd, renderSummary(snapshot), 'utf8');

  // also write a stable "latest" pair
  writeFileSync(resolve(OUT_DIR, 'snapshot-latest.json'), JSON.stringify(snapshot, null, 2), 'utf8');
  writeFileSync(resolve(OUT_DIR, 'summary-latest.md'), renderSummary(snapshot), 'utf8');

  console.log(`\n✓ Snapshot : ${outJson}`);
  console.log(`✓ Summary  : ${outMd}`);
  console.log(
    `  counts : truies=${snapshot.counts.truies} verrats=${snapshot.counts.verrats} ` +
      `portées=${snapshot.counts.portees} porcelets=${snapshot.counts.porcelets_vivants}`,
  );
  console.log(
    `  validation : ok=${snapshot.validation.ok} warnings=${snapshot.validation.warnings.length} errors=${snapshot.validation.errors.length}`,
  );
  if (snapshot.source.stale) {
    console.log('\n⚠ Snapshot marqué STALE (pas de GAS). Étapes de setup dans le JSON.');
    process.exitCode = 2;
  }
})();
