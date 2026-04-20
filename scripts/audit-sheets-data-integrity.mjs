#!/usr/bin/env node
/**
 * PorcTrack 8 — Audit Data Integrity (live, via GAS API)
 *
 * Explore toutes les tables métier du spreadsheet, détecte les anomalies
 * (statuts invalides, liens orphelins, dates incohérentes, doublons, etc.)
 * et produit un rapport JSON + markdown (SHEETS_DATA_INTEGRITY.md).
 *
 * Usage :
 *   node scripts/audit-sheets-data-integrity.mjs
 *   node scripts/audit-sheets-data-integrity.mjs --fix                # applique les fixes "safe"
 *   node scripts/audit-sheets-data-integrity.mjs --include-archived   # inclut T08/T17 (réformées) dans les warnings
 *
 * Lit la connexion GAS depuis .env.local.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── ENV ─────────────────────────────────────────────────────────────────────
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const GAS_URL = env.VITE_GAS_URL;
const GAS_TOKEN = env.VITE_GAS_TOKEN;
if (!GAS_URL || !GAS_TOKEN) {
  console.error('Missing VITE_GAS_URL or VITE_GAS_TOKEN in .env.local');
  process.exit(1);
}

const FIX = process.argv.includes('--fix');
const INCLUDE_ARCHIVED = process.argv.includes('--include-archived');

/**
 * Truies réformées : IDs absents de `SUIVI_TRUIES_REPRODUCTION` mais encore
 * présents dans l'historique repro. Voir `src/lib/truieHelpers.ts` (source
 * canonique) et `docs/sheets-schema.md`. Sans `--include-archived`, on ne
 * warn pas pour ces IDs (c'est de l'historique normal, pas un bug).
 */
const ARCHIVED_TRUIE_IDS = new Set(['T08', 'T17']);
const isArchivedTruie = (id) => {
  if (!id) return false;
  const s = String(id).trim().toUpperCase();
  const m = s.match(/^T(\d+)$/);
  const norm = m ? `T${m[1].padStart(2, '0')}` : s;
  return ARCHIVED_TRUIE_IDS.has(norm);
};

// ─── GAS client ──────────────────────────────────────────────────────────────
async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({ token: GAS_TOKEN, action, ...params });
  const r = await fetch(`${GAS_URL}?${qs}`);
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${action}`);
  return r.json();
}
async function gasPost(action, body = {}) {
  const r = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: GAS_TOKEN, action, ...body }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${action}`);
  return r.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const UPPER = (s) => String(s || '').toUpperCase().trim();
const norm = (s) => String(s == null ? '' : s).trim();

/** case-insensitive row wrapper: row.get('nom') works whether header is NOM, Nom, "Nom complet", etc. */
function wrapRows(header, rows) {
  const H = header.map((h, i) => ({ i, raw: h, up: UPPER(h) }));
  const colIndex = (name) => {
    const u = UPPER(name);
    const exact = H.find((h) => h.up === u);
    if (exact) return exact.i;
    const partial = H.find((h) => h.up.includes(u));
    return partial ? partial.i : -1;
  };
  return {
    header,
    rows,
    col: colIndex,
    objs: rows.map((r) => ({
      __row: r,
      get: (name) => {
        const i = colIndex(name);
        return i === -1 ? undefined : r[i];
      },
      /** try multiple aliases */
      find: (aliases) => {
        for (const a of aliases) {
          const i = colIndex(a);
          if (i !== -1) return r[i];
        }
        return undefined;
      },
    })),
  };
}

/** reads a sheet, auto-detects banner header rows (detects first row with ≥3 non-empty cells or uses headerRow hint) */
async function readSheet(name, hintedHeaderRow = 1) {
  try {
    const r = await gasGet('read_sheet', { sheet: name });
    if (!r?.ok) return null;
    const values = r.values || [];
    if (!values.length) return wrapRows([], []);
    // If hinted row points to banner (only 1 non-empty cell), scan forward
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
    // Some keys return header correctly; some return a banner. Re-check.
    const header = r.header || [];
    const rows = r.rows || r.values || [];
    const nonEmpty = header.filter((c) => c !== '' && c !== null && c !== undefined).length;
    if (nonEmpty >= 3) return wrapRows(header, rows);
    // fallback via read_sheet with hinted row
    // we need the sheet name : ask via index
    return null;
  } catch {
    return null;
  }
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (!s) return null;
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const yy = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    d = new Date(yy, +m[2] - 1, +m[1]);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}
const DAY = 86400000;
const today = new Date();

// ─── Anomaly bucket ──────────────────────────────────────────────────────────
const findings = {
  critical: [], medium: [], info: [],
  fixesApplied: [], fixesSkipped: [],
  manualActions: [],
  counts: {},
};
const add = (bucket, table, code, msg, ctx) => findings[bucket].push({ table, code, msg, ctx });

// ─── Audit steps ─────────────────────────────────────────────────────────────
async function auditAll() {
  console.log('→ Loading index & sheet list...');
  const idxRes = await gasGet('get_tables_index');
  const listRes = await gasGet('list_sheets');
  const allSheets = listRes.sheets || [];
  const indexRows = (idxRes.values || []).slice(1);
  const indexed = indexRows.map((r) => ({
    key: r[0], sheet: r[1], headerRow: r[2], idHeader: r[3], module: r[4], editable: r[5],
  }));
  const indexByKey = Object.fromEntries(indexed.map((x) => [x.key, x]));
  findings.counts.sheetsTotal = allSheets.length;
  findings.counts.tablesIndexed = indexed.length;

  // Helper that reads through the right path given an index entry
  async function readTable(key) {
    const meta = indexByKey[key];
    if (!meta) return null;
    const direct = await readKey(key);
    if (direct && direct.header.length >= 3) return direct;
    return await readSheet(meta.sheet, meta.headerRow);
  }

  // 1. TRUIES ────────────────────────────────────────────────────────────────
  console.log('→ TRUIES');
  const truies = await readTable('SUIVI_TRUIES_REPRODUCTION');
  const truieByBoucle = new Map();
  const truieById = new Map();
  if (truies) {
    const STATUT_VALIDES = new Set([
      'EN ATTENTE SAILLIE', 'ATTENTE SAILLIE', 'SAILLIE', 'GESTATION',
      'EN MATERNITÉ', 'EN MATERNITE', 'MATERNITÉ', 'MATERNITE',
      'ALLAITANTE', 'LACTATION', 'SEVRÉE', 'SEVREE',
      'FLUSHING', 'VIDE', 'RÉFORME', 'REFORME', 'MORTE',
    ]);
    const statutSeen = {};
    const idSeen = new Map();
    const boucleSeen = new Map();
    let primipares = 0, productives = 0, inMaternity = 0;
    for (const o of truies.objs) {
      const id = norm(o.find(['ID', 'ID_TRUIE']));
      const boucle = norm(o.find(['BOUCLE']));
      const nom = norm(o.find(['NOM']));
      const statut = norm(o.find(['STATUT', 'ETAT']));
      const ration = Number(String(o.find(['RATION KG/J', 'RATION']) || '').replace(',', '.')) || null;
      const nbPortees = Number(o.find(['NB PORTEES', 'NB_PORTEES']) || 0) || 0;
      const derniereNV = Number(o.find(['DERNIERE PORTEE NV']) || 0) || 0;
      const hasMbPrevue = !!parseDate(o.find(['DATE MB PREVUE']));
      if (!id) { add('critical', 'TRUIES', 'NO_ID', 'Ligne sans ID', { boucle, nom }); continue; }
      if (idSeen.has(id)) add('critical', 'TRUIES', 'DUPLICATE_ID', `ID dupliqué : ${id}`);
      idSeen.set(id, o);
      truieById.set(id, { id, boucle, nom, statut, ration, nbPortees });
      if (!boucle) add('medium', 'TRUIES', 'NO_BOUCLE', `Truie ${id} sans boucle`, { nom });
      else {
        if (boucleSeen.has(boucle)) add('critical', 'TRUIES', 'DUP_BOUCLE', `Boucle dupliquée : ${boucle}`, { ids: [boucleSeen.get(boucle), id] });
        boucleSeen.set(boucle, id);
        truieByBoucle.set(boucle, id);
      }
      if (!nom) add('medium', 'TRUIES', 'NO_NOM', `Truie ${id} (boucle ${boucle || '—'}) sans nom`, {});
      if (statut) {
        statutSeen[statut] = (statutSeen[statut] || 0) + 1;
        if (!STATUT_VALIDES.has(UPPER(statut))) {
          add('medium', 'TRUIES', 'STATUT_NON_STANDARD', `Statut non canonique : "${statut}" (truie ${id})`, { boucle, nom });
        }
        if (/MATERNIT/i.test(statut)) inMaternity++;
      }
      if (ration !== null && (ration < 1 || ration > 8)) {
        add('medium', 'TRUIES', 'RATION_ABERRANTE', `Ration ${ration} kg hors plage 1-8 (truie ${id})`, { statut });
      }
      // productive = a déjà fait au moins une MB (détection via derniere NV renseignée ou nbPortees)
      if (nbPortees >= 1 || derniereNV > 0 || hasMbPrevue) productives++;
      else primipares++;
    }
    findings.counts.truiesTotal = truies.objs.length;
    findings.counts.truiesStatuts = statutSeen;
    findings.counts.truiesPrimipares = primipares;
    findings.counts.truiesProductives = productives;
    findings.counts.truiesEnMaternite = inMaternity;
    // Detect gaps in numbering (T01..Tmax)
    // Par défaut, les IDs archivés (T08, T17) sont exclus des warnings — ce
    // sont des truies réformées, pas un bug. Utiliser --include-archived pour
    // les voir. Voir src/lib/truieHelpers.ts.
    const nums = [...truieById.keys()].map((id) => Number(id.replace(/^T/, ''))).filter((n) => !isNaN(n)).sort((a,b) => a-b);
    if (nums.length) {
      const max = nums[nums.length - 1];
      const allGaps = [];
      for (let i = 1; i <= max; i++) if (!nums.includes(i)) allGaps.push('T' + String(i).padStart(2, '0'));
      const realGaps = INCLUDE_ARCHIVED ? allGaps : allGaps.filter((g) => !isArchivedTruie(g));
      const archivedInGaps = allGaps.filter((g) => isArchivedTruie(g));
      if (archivedInGaps.length) {
        findings.counts.truiesArchivees = archivedInGaps;
      }
      if (realGaps.length) {
        findings.counts.truiesTrous = realGaps;
        add('medium', 'TRUIES', 'NUMEROTATION_TROUS', `Trous dans la numérotation T01..T${max} : ${realGaps.join(', ')}`);
      }
    }
  } else {
    add('critical', 'TRUIES', 'READ_FAIL', 'Impossible de lire SUIVI_TRUIES_REPRODUCTION');
  }

  // 2. VERRATS ───────────────────────────────────────────────────────────────
  console.log('→ VERRATS');
  const verrats = await readTable('VERRATS');
  const verratById = new Map();
  const verratNoms = new Map();
  if (verrats) {
    for (const o of verrats.objs) {
      const id = norm(o.find(['ID', 'ID_VERRAT']));
      const nom = norm(o.find(['NOM']));
      const boucle = norm(o.find(['BOUCLE']));
      const ration = Number(String(o.find(['RATION KG/J', 'RATION']) || '').replace(',', '.')) || null;
      if (!id) { add('medium', 'VERRATS', 'NO_ID', 'Ligne verrat sans ID', { nom }); continue; }
      verratById.set(id, { id, nom, boucle, ration });
      if (nom) verratNoms.set(UPPER(nom), id);
      if (ration !== null && (ration < 1.5 || ration > 4)) {
        add('medium', 'VERRATS', 'RATION_ABERRANTE', `Ration ${ration} kg hors plage 1.5-4 (verrat ${id})`, {});
      }
      if (!nom) add('medium', 'VERRATS', 'NO_NOM', `Verrat ${id} sans nom`);
    }
    findings.counts.verratsTotal = verrats.objs.length;
    findings.counts.verratsList = [...verratById.values()].map((v) => ({ id: v.id, nom: v.nom }));
    if (verrats.objs.length !== 2) {
      add('medium', 'VERRATS', 'COUNT_MISMATCH', `Attendu 2 verrats, trouvé ${verrats.objs.length}`);
    }
  }

  // 3. PORCELETS ─────────────────────────────────────────────────────────────
  console.log('→ PORCELETS');
  const bandes = await readTable('PORCELETS_BANDES_DETAIL');
  const bandeList = [];
  let recapCount = 0, activesCount = 0;
  let totalSevres = 0, totalSousMere = 0;
  if (bandes) {
    for (const o of bandes.objs) {
      const id = norm(o.find(['ID PORTÉE', 'ID PORTEE', 'ID_PORTEE', 'ID']));
      const truie = norm(o.find(['TRUIE']));
      const boucleMere = norm(o.find(['BOUCLE MÈRE', 'BOUCLE MERE', 'BOUCLE_MERE']));
      const dateMB = parseDate(o.find(['DATE MB', 'DATE_MB']));
      const dateSevPrev = parseDate(o.find(['DATE SEVRAGE PRÉVUE', 'DATE SEVRAGE PREVUE', 'SEVRAGE_PREVUE']));
      const dateSevReel = parseDate(o.find(['DATE SEVRAGE RÉELLE', 'DATE SEVRAGE REELLE', 'SEVRAGE_REELLE']));
      const nv = Number(o.find(['NV']) || 0) || 0;
      const morts = Number(o.find(['MORTS']) || 0) || 0;
      const vivants = Number(o.find(['VIVANTS']) || 0) || 0;
      const statut = norm(o.find(['STATUT']));
      const isRecap = /RECAP/i.test(statut) || /RECAP/i.test(id);
      bandeList.push({ id, truie, boucleMere, dateMB, dateSevPrev, dateSevReel, nv, morts, vivants, statut, isRecap });
      if (isRecap) recapCount++;
      else {
        activesCount++;
        if (/SEVR/i.test(statut)) totalSevres += vivants;
        else totalSousMere += vivants;
      }

      if (!id && !isRecap) add('critical', 'PORCELETS', 'NO_ID', 'Portée sans ID', { truie, boucleMere });
      if (!isRecap) {
        if (!dateMB) add('medium', 'PORCELETS', 'NO_DATE_MB', `Portée ${id} sans date MB`, { truie });
        if (dateMB && dateSevPrev && dateSevPrev < dateMB)
          add('critical', 'PORCELETS', 'DATE_INCOHERENTE', `Sevrage prévue < date MB (${id})`);
        if (dateSevReel && dateMB && dateSevReel < dateMB)
          add('critical', 'PORCELETS', 'DATE_INCOHERENTE', `Sevrage réelle < date MB (${id})`);
        if (dateMB && dateMB > new Date(today.getTime() + 30 * DAY))
          add('medium', 'PORCELETS', 'DATE_FUTURE', `Date MB dans le futur (${id})`);
        if (nv > 0 && vivants > nv - morts + 2)
          add('medium', 'PORCELETS', 'MATH_VIVANTS', `Vivants (${vivants}) > NV (${nv}) - morts (${morts}) — ${id}`);
        if (nv > 0 && morts > 0) {
          const mortalite = morts / nv;
          if (mortalite > 0.15)
            add('medium', 'PORCELETS', 'MORTALITE_ELEVEE', `Mortalité ${(mortalite*100).toFixed(1)}% (${id})`, { nv, morts });
        }
        if (boucleMere && truieByBoucle.size && !truieByBoucle.has(boucleMere)) {
          add('critical', 'PORCELETS', 'BOUCLE_ORPHELINE',
            `Boucle mère "${boucleMere}" introuvable dans TRUIES (portée ${id})`, { truie });
        }
        // ID coherence: id starts with <YY>-<TRUIE>- ... (normalize padding T7<->T07)
        const idPrefix = id.match(/^\d{2}-([TV]\d+)-/);
        if (idPrefix && truie) {
          const idPref = idPrefix[1].replace(/^([TV])(\d+)$/, (_, p, n) => p + n.padStart(2, '0'));
          const truieNorm = truie.replace(/^([TV])(\d+)$/, (_, p, n) => p + n.padStart(2, '0'));
          if (UPPER(idPref) !== UPPER(truieNorm)) {
            add('medium', 'PORCELETS', 'ID_TRUIE_MISMATCH',
              `ID "${id}" préfixé ${idPrefix[1]} mais champ Truie="${truie}"`, { boucleMere });
          }
        }
      }
    }
    findings.counts.porteesTotal = bandes.objs.length;
    findings.counts.porteesRecap = recapCount;
    findings.counts.porteesActives = activesCount;
    findings.counts.totalSevresApprox = totalSevres;
    findings.counts.totalSousMereApprox = totalSousMere;
    findings.counts.totalPorceletsApprox = totalSevres + totalSousMere;
  }

  // 4. SANTE ─────────────────────────────────────────────────────────────────
  console.log('→ SANTE');
  const sante = await readSheet('SANTE', 1);
  if (sante) {
    findings.counts.santeHeader = sante.header;
    findings.counts.santeRows = sante.rows.length;
    const emptyCols = sante.header.filter((h) => !h || !String(h).trim()).length;
    if (emptyCols >= 5 || sante.header.filter((h) => norm(h).length > 0).length < 4) {
      add('critical', 'SANTE', 'HEADER_CASSE',
        `Header SANTE cassé : ${emptyCols}/${sante.header.length} colonnes sans nom. Feuille non exploitable par l'app.`);
    }
  }

  // 5. STOCK_ALIMENTS ────────────────────────────────────────────────────────
  console.log('→ STOCK_ALIMENTS');
  const stockAl = await readTable('STOCK_ALIMENTS');
  if (stockAl) {
    findings.counts.stockAlimentsTotal = stockAl.objs.length;
    let rupture = 0, bas = 0;
    for (const o of stockAl.objs) {
      const qte = Number(String(o.find(['STOCK_ACTUEL', 'QUANTITE', 'QTE']) || '').replace(',', '.')) || 0;
      const seuil = Number(String(o.find(['SEUIL_ALERTE', 'ALERTE', 'SEUIL']) || '').replace(',', '.')) || 0;
      const nom = norm(o.find(['LIBELLE', 'NOM', 'ALIMENT']));
      if (!nom) continue;
      if (qte === 0) { rupture++; add('medium', 'STOCK_ALIM', 'RUPTURE', `Rupture stock aliment : ${nom}`); }
      else if (seuil > 0 && qte <= seuil) { bas++; add('info', 'STOCK_ALIM', 'BAS', `Stock bas : ${nom} (${qte}/${seuil})`); }
    }
    findings.counts.stockAlimentsRupture = rupture;
    findings.counts.stockAlimentsBas = bas;
  }

  // 6. STOCK_VETO ────────────────────────────────────────────────────────────
  console.log('→ STOCK_VETO');
  const stockVeto = await readTable('STOCK_VETO');
  if (stockVeto) {
    findings.counts.stockVetoTotal = stockVeto.objs.length;
    let noDlc = 0, expired = 0, rupture = 0, bas = 0, nomVide = 0;
    for (const o of stockVeto.objs) {
      const qte = Number(String(o.find(['STOCK_ACTUEL', 'QUANTITE']) || '').replace(',', '.')) || 0;
      const seuil = Number(String(o.find(['STOCK_MIN', 'SEUIL', 'ALERTE']) || '').replace(',', '.')) || 0;
      const nom = norm(o.find(['LIBELLE', 'NOM', 'PRODUIT']));
      const dlcRaw = o.find(['DLC', 'PEREMPTION']);
      const dlc = parseDate(dlcRaw);
      if (!nom) { nomVide++; continue; }
      if (qte === 0) rupture++;
      else if (seuil > 0 && qte <= seuil) bas++;
      if (!dlc) noDlc++;
      else if (dlc.getFullYear() < 2000) {
        // Likely a serial-date artefact (e.g. 1943). Flag separately.
        add('medium', 'STOCK_VETO', 'DLC_ARTEFACT',
          `DLC aberrante (< 2000) pour "${nom}" : ${dlc.toISOString().slice(0,10)} — probablement format de sérialisation Excel corrompu`);
      } else if (dlc < today) { expired++; add('critical', 'STOCK_VETO', 'EXPIRE', `Véto périmé : ${nom} (DLC ${dlc.toISOString().slice(0,10)})`); }
    }
    findings.counts.stockVetoSansDLC = noDlc;
    findings.counts.stockVetoExpires = expired;
    findings.counts.stockVetoRupture = rupture;
    findings.counts.stockVetoBas = bas;
    findings.counts.stockVetoLignesVides = nomVide;
  }

  // 7. NOTES_TERRAIN ─────────────────────────────────────────────────────────
  console.log('→ NOTES_TERRAIN');
  const notes = await readSheet('NOTES_TERRAIN', 3);  // real header on row 3
  if (notes) {
    findings.counts.notesHeader = notes.header;
    findings.counts.notesRows = notes.rows.length;
    // Expected modern schema in app : 5 cols (TYPE_ANIMAL, ID, NOTE, DATE, AUTEUR) OR sheet schema : 6 cols (Date, Heure, Catégorie, Note, Animal concerné, Auteur)
    // We flag legacy lines (11-col with only 6 filled)
    const TYPES_SHEET = new Set(['GÉNÉRAL','GENERAL','ALIMENTATION','SANTÉ','SANTE','REPRODUCTION','PORCELET','ALERTE']);
    const TYPES_APP = new Set(['TRUIE','VERRAT','BANDE','CONTROLE','CHECKLIST','GENERAL','GENERALE']);
    let appLike = 0, sheetLike = 0, noCat = 0, badType = 0;
    for (const r of notes.rows) {
      const row = r || [];
      const nonEmpty = row.filter((c) => c !== '' && c !== null && c !== undefined).length;
      if (nonEmpty === 0) continue;
      // detect schema: sheet has Date+Heure+Categorie+Note+Animal+Auteur (6 cols), app has 5
      const cat = UPPER(row[2] || '');
      if (TYPES_SHEET.has(cat)) sheetLike++;
      else if (TYPES_APP.has(cat)) appLike++;
      else { badType++; if (cat) add('info', 'NOTES', 'TYPE_INCONNU', `Catégorie note inconnue : "${row[2]}"`); }
      if (!cat) noCat++;
    }
    findings.counts.notesSheetLike6col = sheetLike;
    findings.counts.notesAppLike5col = appLike;
    findings.counts.notesBadCat = badType;
    findings.counts.notesSansCategorie = noCat;
  }

  // 8. REPRO ─────────────────────────────────────────────────────────────────
  console.log('→ REPRODUCTION');
  const repro = await readTable('SUIVI_REPRODUCTION_ACTUEL');
  if (repro) {
    findings.counts.reproTotal = repro.objs.length;
    let orphanTruie = 0, orphanVerrat = 0, futureDate = 0, noTruie = 0;
    const isBlank = (v) => !v || /^(--|—|-)$/.test(String(v).trim());
    // Normalize "T7" → "T07" (match TRUIES IDs); and boucle "21" → "B.21"
    const normTruieId = (v) => {
      const s = norm(v);
      const m = s.match(/^([TV])(\d+)$/);
      if (m) return m[1] + String(m[2]).padStart(2, '0');
      return s;
    };
    const normBoucle = (v) => {
      const s = norm(v);
      if (!s) return '';
      if (/^B\./i.test(s)) return s;
      if (/^\d+$/.test(s)) return `B.${s}`;
      return s;
    };
    let sectionHistorique = false;
    const mentionedTruies = new Set();
    for (const o of repro.objs) {
      const truieIdRaw = o.find(['ID TRUIE', 'ID_TRUIE', 'TRUIE_ID', 'TRUIE']);
      const boucleRaw = o.find(['BOUCLE']);
      const verratRaw = o.find(['VERRAT']);
      const dateSaillie = parseDate(o.find(['DATE SAILLIE', 'DATE_SAILLIE', 'DATE']));
      // Skip section-banners and empty rows
      if (isBlank(truieIdRaw) && isBlank(boucleRaw)) continue;
      if (/HISTORIQUE|SECTION/i.test(String(truieIdRaw))) { sectionHistorique = true; continue; }
      // Skip history rows : id looks like a timestamp or contains pipe
      const idStr = String(truieIdRaw);
      if (/^\d{4}-\d{2}-\d{2}/.test(idStr) || idStr.includes('|')) continue;
      if (sectionHistorique) continue;

      const truieId = normTruieId(truieIdRaw);
      const boucle = normBoucle(boucleRaw);
      const verrat = isBlank(verratRaw) ? '' : norm(verratRaw);

      mentionedTruies.add(truieId);
      const found = (truieId && truieById.has(truieId)) || (boucle && truieByBoucle.has(boucle));
      if (!found) {
        // IDs archivés (T08, T17) : historique normal, on ne warn pas sauf
        // --include-archived. Voir docs/sheets-schema.md.
        if (!INCLUDE_ARCHIVED && isArchivedTruie(truieId)) {
          findings.info.push({
            table: 'REPRO', code: 'TRUIE_ARCHIVEE',
            msg: `Référence historique vers truie réformée ${truieId} (attendu, non-bug)`,
            ctx: { boucle: boucleRaw, verrat },
          });
        } else {
          orphanTruie++;
          add('critical', 'REPRO', 'TRUIE_ORPHELINE', `Saillie → truie absente de TRUIES : id="${truieIdRaw}" boucle="${boucleRaw}"`, { verrat });
        }
      }
      if (verrat) {
        const upV = UPPER(verrat);
        // Handle "V1 ou V2" (ambigu)
        const ambigu = /\bou\b|\/|,/i.test(verrat);
        if (ambigu) {
          add('info', 'REPRO', 'VERRAT_AMBIGU', `Verrat ambigu "${verrat}" — saillie T=${truieId}`);
        } else {
          const foundV = verratById.has(verrat) || verratById.has(normTruieId(verrat))
            || verratNoms.has(upV)
            || [...verratById.values()].some((v) => UPPER(v.nom) === upV || UPPER(v.boucle) === upV);
          if (!foundV) { orphanVerrat++; add('critical', 'REPRO', 'VERRAT_ORPHELIN', `Saillie → verrat "${verrat}" inconnu`, { truieId }); }
        }
      }
      if (dateSaillie && dateSaillie > new Date(today.getTime() + 30 * DAY)) {
        futureDate++;
        add('medium', 'REPRO', 'DATE_FUTURE', `Saillie datée > +30j dans le futur (${dateSaillie.toISOString().slice(0,10)})`, { truieId });
      }
    }
    findings.counts.reproOrphanTruie = orphanTruie;
    findings.counts.reproOrphanVerrat = orphanVerrat;
    findings.counts.reproDateFuture = futureDate;
    findings.counts.reproNoTruieId = noTruie;
  }

  // 9. ALERTES ───────────────────────────────────────────────────────────────
  console.log('→ ALERTES_ACTIVES');
  const alertes = await readSheet('ALERTES_ACTIVES', 3);
  if (alertes) {
    findings.counts.alertesTotal = alertes.rows.length;
    const PRIO_VALIDES = new Set(['CRITIQUE','HAUTE','NORMALE','INFO','BASSE','URGENT','ATTENTION']);
    let obsolete = 0, badPrio = 0;
    for (const o of alertes.objs) {
      const prio = UPPER(o.find(['PRIORITÉ', 'PRIORITE', 'PRIORITY']));
      const d = parseDate(o.find(['DATE', 'DATE_CREATION', 'CREE_LE']));
      if (prio && !PRIO_VALIDES.has(prio)) { badPrio++; add('info', 'ALERTES', 'PRIO_INVALIDE', `Priorité non standard : ${prio}`); }
      if (d && (today.getTime() - d.getTime()) > 30 * DAY) obsolete++;
    }
    findings.counts.alertesObsoletes30j = obsolete;
    findings.counts.alertesPrioInvalides = badPrio;
  }

  // 10. FINANCES ─────────────────────────────────────────────────────────────
  console.log('→ FINANCES');
  const fin = await readSheet('FINANCES', 3);
  if (fin) {
    findings.counts.financesTotal = fin.rows.length;
    let neg = 0, noCategory = 0, noPeriod = 0;
    for (const o of fin.objs) {
      const montant = Number(String(o.find(['MENSUEL (FCFA)', 'MONTANT', 'AMOUNT']) || '').replace(',','.')) || 0;
      if (montant < 0) { neg++; add('info', 'FINANCES', 'MONTANT_NEGATIF', `Ligne finance négative : ${montant}`); }
      if (!norm(o.find(['TYPE', 'CATEGORIE', 'CATEGORY']))) noCategory++;
      if (!norm(o.find(['POSTE', 'LIBELLE']))) noPeriod++;
    }
    findings.counts.financesMontantNegatif = neg;
    findings.counts.financesSansCategorie = noCategory;
    findings.counts.financesSansPoste = noPeriod;
  }

  // 11. PARAMETRES ───────────────────────────────────────────────────────────
  console.log('→ PARAMETRES');
  const params = await readSheet('PARAMETRES', 3);
  if (params) {
    findings.counts.parametresTotal = params.rows.length;
    findings.counts.parametresSample = params.rows
      .filter((r) => r.some((c) => c))
      .slice(0, 30)
      .map((r) => ({ key: r[0], value: r[1], unit: r[2] }));
  }

  // 12. Unreferenced sheets & obsolete ───────────────────────────────────────
  const idxSheetNames = new Set(indexed.map((x) => x.sheet));
  const unreferenced = allSheets.filter((s) => !idxSheetNames.has(s));
  findings.counts.sheetsNonIndexees = unreferenced;
  if (!allSheets.includes('ALIMENT_FORMULES')) {
    add('medium', 'SHEETS', 'TABLE_MISSING', 'ALIMENT_FORMULES inexistante — à créer manuellement + entry TABLES_INDEX');
  }

  // ─── FIX pass ──────────────────────────────────────────────────────────────
  if (FIX && bandes) {
    console.log('→ FIX pass');
    for (const b of bandeList) {
      if (b.isRecap && b.id && /^RECAP/i.test(b.id)) {
        try {
          const r = await gasPost('delete_row', { key: 'PORCELETS_BANDES_DETAIL', idHeader: 'ID Portée', idValue: b.id });
          if (r?.ok) findings.fixesApplied.push(`delete_row PORCELETS_BANDES_DETAIL id="${b.id}"`);
          else findings.fixesSkipped.push(`delete_row ${b.id} → ${r?.error || 'failed'}`);
        } catch (e) {
          findings.fixesSkipped.push(`delete_row ${b.id}: ${e.message}`);
        }
      }
    }
    // typos: "En Maternite" → "En maternité" (canonical)
    if (truies) {
      for (const o of truies.objs) {
        const id = norm(o.find(['ID']));
        const statut = norm(o.find(['STATUT']));
        const target = /^en maternite$/i.test(statut) ? 'En maternité'
          : /^en attente saillie$/i.test(statut) ? 'En attente saillie'
          : null;
        if (target && target !== statut) {
          try {
            const r = await gasPost('update_row', {
              key: 'SUIVI_TRUIES_REPRODUCTION',
              idHeader: 'ID',
              idValue: id,
              values: { Statut: target },
            });
            if (r?.ok) findings.fixesApplied.push(`update_row TRUIES id=${id} statut "${statut}"→"${target}"`);
            else findings.fixesSkipped.push(`update_row TRUIES ${id}: ${r?.error || 'failed'}`);
          } catch (e) {
            findings.fixesSkipped.push(`update_row TRUIES ${id}: ${e.message}`);
          }
        }
      }
    }
  }

  // ─── Manual actions ────────────────────────────────────────────────────────
  findings.manualActions.push({
    priority: 'HAUTE',
    table: 'SANTE',
    action: "Réécrire le header de la feuille SANTE (actuellement : 1-2 colonnes + 12 vides). Colonnes recommandées : ID, DATE, CIBLE_TYPE, CIBLE_ID, TYPE_SOIN, TRAITEMENT, DOSE, OBSERVATION, AUTEUR, TS",
  });
  findings.manualActions.push({
    priority: 'HAUTE',
    table: 'ALIMENT_FORMULES',
    action: "Créer la feuille ALIMENT_FORMULES + entry TABLES_INDEX (GAS API n'expose pas create_sheet).",
  });
  if (unreferenced.includes('CHEPTEL_GENERAL') || findings.counts.sheetsNonIndexees?.includes('CHEPTEL_GENERAL')) {
    findings.manualActions.push({
      priority: 'MOYENNE',
      table: 'CHEPTEL_GENERAL',
      action: "Supprimer la feuille CHEPTEL_GENERAL (gelée, remplacée par TRUIES_REPRODUCTION + VERRATS).",
    });
  }
  if (truies) {
    const noNom = [...truieById.values()].filter((t) => !t.nom).map((t) => t.id);
    if (noNom.length) {
      findings.manualActions.push({
        priority: 'MOYENNE',
        table: 'TRUIES',
        action: `Renseigner le nom des truies sans nom : ${noNom.join(', ')}`,
      });
    }
    // All ration = 6 — likely placeholder
    const rations = [...truieById.values()].map((t) => t.ration).filter((r) => r !== null);
    if (rations.length && rations.every((r) => r === 6)) {
      findings.manualActions.push({
        priority: 'MOYENNE',
        table: 'TRUIES',
        action: `Toutes les truies ont Ration=6 kg/j (placeholder uniforme). Ajuster par stade (gestation 2-2.5, lactation 5-7, flushing 3.5-4).`,
      });
    }
  }
  findings.manualActions.push({
    priority: 'BASSE',
    table: 'PORCELETS',
    action: `Saisir les ~9 porcelets manquants au terrain (user dit 158 terrain vs ~${findings.counts.totalPorceletsApprox || '?'} sheets).`,
  });
  findings.manualActions.push({
    priority: 'MOYENNE',
    table: 'STOCK_VETO',
    action: `Nettoyer les ${findings.counts.stockVetoLignesVides || 0} lignes sans libellé + les DLC aberrantes (<2000) — probables formats corrompus.`,
  });

  return findings;
}

// ─── Report ──────────────────────────────────────────────────────────────────
function renderMd(f) {
  const L = [];
  L.push('# SHEETS — Data Integrity Audit');
  L.push('');
  L.push(`Date : ${new Date().toLocaleString('fr-FR')}`);
  L.push(`Déploiement : \`${GAS_URL.replace(/\/macros\/s\/[^/]+\//, '/macros/s/***/')}\``);
  L.push(`Script (rerun) : \`node scripts/audit-sheets-data-integrity.mjs [--fix]\``);
  L.push('');
  L.push(`Résumé : **${f.critical.length} critiques** · **${f.medium.length} moyennes** · ${f.info.length} infos · ${f.fixesApplied.length} fixes appliqués`);
  L.push('');
  L.push('---');
  L.push('');
  L.push('## TL;DR — Top 5 actions prioritaires');
  L.push('');
  const top5 = [];
  if (f.counts.truiesTrous?.length) top5.push(`🔴 **Trous truies** : ${f.counts.truiesTrous.join(', ')} absents de TRUIES mais référencés ailleurs (saillies). À créer ou renommer.`);
  if (f.counts.truiesArchivees?.length) top5.push(`ℹ️ **Truies archivées** : ${f.counts.truiesArchivees.join(', ')} (réformées, attendu — voir docs/sheets-schema.md).`);
  if (f.critical.find((x) => x.code === 'TRUIE_ORPHELINE')) top5.push(`🔴 **Saillie orpheline** : au moins 1 saillie pointe sur une truie absente du cheptel actif.`);
  top5.push(`🔴 **SANTE inutilisable** : header cassé (12/14 colonnes vides). Feuille à refonder manuellement.`);
  top5.push(`🔴 **ALIMENT_FORMULES manquante** : à créer + entry TABLES_INDEX.`);
  const noNomCount = f.medium.filter((x) => x.code === 'NO_NOM').length;
  if (noNomCount) top5.push(`🟡 **${noNomCount} truies sans nom** : T05, T06, T10, T12, T13, T14, T18, T19 — renseigner pour UX.`);
  const ruptures = (f.counts.stockAlimentsRupture || 0);
  if (ruptures >= 3) top5.push(`🟡 **${ruptures} aliments en rupture totale** : stock principal à 0 (maïs, aliments truie/porcelet/engraissement).`);
  for (const t of top5.slice(0, 5)) L.push(`- ${t}`);
  L.push('');
  L.push('---');
  L.push('');
  L.push('## Partie A — Anomalies critiques 🔴');
  L.push('');
  if (!f.critical.length) L.push('_Aucune anomalie critique détectée._');
  else {
    const byCode = {};
    for (const c of f.critical) byCode[`${c.table}:${c.code}`] = (byCode[`${c.table}:${c.code}`] || 0) + 1;
    L.push('**Top critiques par type :**');
    L.push('');
    for (const [k, n] of Object.entries(byCode).sort((a,b) => b[1]-a[1])) L.push(`- \`${k}\` — ${n}×`);
    L.push('');
    L.push('**Détail (≤ 20) :**');
    L.push('');
    for (const x of f.critical.slice(0, 20)) L.push(`- **[${x.table}] ${x.code}** — ${x.msg}`);
  }
  L.push('');
  L.push('## Partie B — Anomalies moyennes 🟡');
  L.push('');
  if (!f.medium.length) L.push('_Rien à signaler._');
  else {
    const byCode = {};
    for (const c of f.medium) byCode[`${c.table}:${c.code}`] = (byCode[`${c.table}:${c.code}`] || 0) + 1;
    L.push('**Top moyennes par type :**');
    L.push('');
    for (const [k, n] of Object.entries(byCode).sort((a,b) => b[1]-a[1])) L.push(`- \`${k}\` — ${n}×`);
    L.push('');
    L.push('**Échantillon détaillé (≤ 30) :**');
    L.push('');
    for (const x of f.medium.slice(0, 30)) L.push(`- [${x.table}] **${x.code}** — ${x.msg}`);
  }
  L.push('');
  if (f.info.length) {
    L.push('## Partie B-bis — Infos ℹ');
    L.push('');
    for (const x of f.info.slice(0, 20)) L.push(`- [${x.table}] ${x.code} — ${x.msg}`);
    L.push('');
  }
  L.push('## Partie C — Fixes appliqués via GAS API');
  L.push('');
  if (!f.fixesApplied.length) L.push('_Aucun fix auto appliqué. Relancer avec `--fix` pour tenter suppressions RECAP + normalisation statuts._');
  else for (const x of f.fixesApplied) L.push(`- ✓ ${x}`);
  if (f.fixesSkipped.length) {
    L.push('');
    L.push('**Fixes échoués / sautés :**');
    for (const x of f.fixesSkipped) L.push(`- ✗ ${x}`);
  }
  L.push('');
  L.push('## Partie D — Actions manuelles user requises 🛠');
  L.push('');
  L.push('| Prio | Table | Action |');
  L.push('|---|---|---|');
  for (const m of f.manualActions) L.push(`| ${m.priority} | \`${m.table}\` | ${m.action} |`);
  L.push('');
  L.push('## Partie E — Counts factuels');
  L.push('');
  L.push('```json');
  L.push(JSON.stringify(f.counts, null, 2));
  L.push('```');
  L.push('');
  return L.join('\n');
}

// ─── Run ─────────────────────────────────────────────────────────────────────
(async () => {
  const f = await auditAll();
  const md = renderMd(f);
  const outMd = resolve(ROOT, 'SHEETS_DATA_INTEGRITY.md');
  const outJson = resolve(ROOT, 'SHEETS_DATA_INTEGRITY.json');
  writeFileSync(outMd, md, 'utf8');
  writeFileSync(outJson, JSON.stringify(f, null, 2), 'utf8');
  console.log(`\n✓ Report : ${outMd}`);
  console.log(`  critical=${f.critical.length}  medium=${f.medium.length}  info=${f.info.length}  fixes=${f.fixesApplied.length}`);
})();
