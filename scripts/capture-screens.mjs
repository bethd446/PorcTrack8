#!/usr/bin/env node
/**
 * capture-screens.mjs — Capture screenshots V70 pour design pack.
 *
 * Usage:
 *   1. Lancer le dev server: `npm run dev` (port 5173 par défaut).
 *   2. Exécuter: `node scripts/capture-screens.mjs`.
 *
 * Sortie: /tmp/design-prep/assets-pack/screenshots/<page>-<viewport>.png
 *
 * Variables d'env optionnelles:
 *   BASE_URL          — URL dev server (def: http://localhost:5173)
 *   OUT_DIR           — Dossier sortie (def: /tmp/design-prep/assets-pack/screenshots)
 *   AUTH_BYPASS_FLAG  — Si défini, écrit une clé localStorage pour bypass auth (best effort).
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUT_DIR = process.env.OUT_DIR || '/tmp/design-prep/assets-pack/screenshots';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812, isMobile: true, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
];

// Liste des écrans à capturer. `path` = route relative.
// `slug` = nom de fichier court (kebab-case).
const SCREENS = [
  { slug: '01-landing', path: '/', waitFor: 'networkidle' },
  { slug: '02-login', path: '/login', waitFor: 'networkidle' },
  { slug: '03-onboarding', path: '/reglages/onboarding', waitFor: 'networkidle' },
  { slug: '04-today', path: '/today', waitFor: 'networkidle' },
  { slug: '05-troupeau', path: '/troupeau', waitFor: 'networkidle' },
  // /troupeau/truies/:id — pas de fiche stable sans creds, on tente l'ID "1"
  { slug: '06-truie-detail', path: '/troupeau/truies/1', waitFor: 'networkidle' },
  { slug: '07-reproduction', path: '/reproduction', waitFor: 'networkidle' },
  { slug: '08-ressources', path: '/ressources', waitFor: 'networkidle' },
  { slug: '09-pilotage-finances', path: '/pilotage/finances/details', waitFor: 'networkidle' },
  { slug: '10-reglages', path: '/reglages', waitFor: 'networkidle' },
];

async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function captureOne(browser, viewport, screen) {
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    userAgent: viewport.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1'
      : undefined,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const page = await ctx.newPage();
  const url = `${BASE_URL}${screen.path}`;
  const outFile = path.join(OUT_DIR, `${screen.slug}-${viewport.name}.png`);

  try {
    const resp = await page.goto(url, {
      waitUntil: screen.waitFor || 'networkidle',
      timeout: 30000,
    });
    // Petit délai pour laisser animations finir
    await page.waitForTimeout(1500);
    await page.screenshot({ path: outFile, fullPage: false });
    const status = resp?.status() ?? '?';
    console.log(`OK  ${screen.slug} ${viewport.name.padEnd(7)} [${status}] -> ${outFile}`);
    return { ok: true, screen: screen.slug, viewport: viewport.name, status };
  } catch (err) {
    console.error(`FAIL ${screen.slug} ${viewport.name.padEnd(7)} -> ${err.message}`);
    // Tentative best-effort: screenshot quand même de l'état courant
    try {
      await page.screenshot({ path: outFile, fullPage: false });
      console.error(`     ... fallback screenshot saved`);
      return { ok: false, screen: screen.slug, viewport: viewport.name, error: err.message, fallback: true };
    } catch {
      return { ok: false, screen: screen.slug, viewport: viewport.name, error: err.message };
    }
  } finally {
    await ctx.close();
  }
}

async function main() {
  await ensureDir(OUT_DIR);
  console.log(`[capture-screens] base=${BASE_URL} out=${OUT_DIR}`);

  // Vérif connectivité
  try {
    const r = await fetch(BASE_URL);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    console.log(`[capture-screens] dev server up (HTTP ${r.status})`);
  } catch (e) {
    console.error(`[capture-screens] dev server unreachable: ${e.message}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of VIEWPORTS) {
      for (const screen of SCREENS) {
        const r = await captureOne(browser, viewport, screen);
        results.push(r);
      }
    }
  } finally {
    await browser.close();
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n[capture-screens] ${ok} ok / ${fail} fail (total ${results.length})`);
  if (fail > 0) {
    console.log('Failures:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.screen} ${r.viewport}: ${r.error}${r.fallback ? ' (fallback saved)' : ''}`);
    }
  }
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
