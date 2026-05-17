// Audit routes publiques + bottom nav (sans login) — 2026-05-17
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/tmp/audit-2026-05-17';
const URL = 'https://porctrack.tech';
const report = { steps: [], consoleErrors: [], failedRequests: [] };
const log = (s, st, d='') => { report.steps.push({s, st, d: String(d).slice(0,400)}); console.log(`[${st}] ${s}${d?' — '+String(d).slice(0,200):''}`); };
const shot = async (page, n) => {
  try { await page.screenshot({ path: path.join(OUT, `PUB_${String(report.steps.length).padStart(3,'0')}_${n}.png`), fullPage: true }); } catch {}
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push({ url: page.url(), text: m.text().slice(0,400) }); });
  page.on('response', async r => { const s = r.status(); if (s >= 400) report.failedRequests.push({ url: r.url(), status: s, where: page.url() }); });

  // Public routes — should not redirect
  const publicRoutes = ['/', '/login', '/signup', '/landing-v2', '/a-propos', '/privacy', '/mentions-legales', '/contact'];
  for (const r of publicRoutes) {
    try {
      await page.goto(`${URL}${r}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(()=>{});
      await page.waitForTimeout(2000);
      await shot(page, `route_${r.replace(/\//g,'_').slice(1) || 'home'}`);
      const info = await page.evaluate(() => ({
        url: location.pathname, title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim().slice(0,80),
        statusEl: document.querySelector('[data-status], [class*="404" i]')?.textContent?.trim().slice(0,40),
        bodyLen: document.body.textContent?.length || 0,
        hasLoginForm: !!document.querySelector('input[type="password"]'),
      }));
      log(`PUB ${r}`, 'OK', JSON.stringify(info));
    } catch (e) { log(`PUB ${r}`, 'FAIL', e.message.slice(0,150)); }
  }

  // Headers prod
  log('HEADERS scan', 'INFO');
  try {
    const r = await page.request.get(`${URL}/`, { timeout: 8000 });
    const h = r.headers();
    report.headers = {
      'content-security-policy': h['content-security-policy'] || '(absent)',
      'strict-transport-security': h['strict-transport-security'] || '(absent)',
      'x-frame-options': h['x-frame-options'] || '(absent)',
      'x-content-type-options': h['x-content-type-options'] || '(absent)',
      'referrer-policy': h['referrer-policy'] || '(absent)',
      'permissions-policy': h['permissions-policy'] || '(absent)',
      'cache-control': h['cache-control'] || '(absent)',
      'server': h['server'] || '(absent)',
    };
    log('HEADERS', 'OK', JSON.stringify(report.headers));
  } catch (e) { log('HEADERS', 'FAIL', e.message); }

  // Service worker check
  log('SW probe', 'INFO');
  try {
    const r = await page.request.get(`${URL}/service-worker.js`, { timeout: 5000 });
    log(`SW service-worker.js`, `HTTP ${r.status()}`, (r.headers()['content-type']||'').slice(0,60));
    const r2 = await page.request.get(`${URL}/sw.js`, { timeout: 5000 });
    log(`SW sw.js (legacy)`, `HTTP ${r2.status()}`);
    const r3 = await page.request.get(`${URL}/manifest.webmanifest`, { timeout: 5000 });
    log(`SW manifest`, `HTTP ${r3.status()}`);
  } catch (e) { log('SW probe', 'FAIL', e.message); }

  // /login — capture form + buttons (déjà fait mais capture UX)
  await page.goto(`${URL}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(()=>{});
  await page.waitForTimeout(2500);
  await shot(page, 'login_full');
  const loginScan = await page.evaluate(() => ({
    h1: document.querySelector('h1, h2')?.textContent?.trim().slice(0,80),
    eyebrow: document.querySelector('[class*="eyebrow" i]')?.textContent?.trim().slice(0,80),
    inputs: Array.from(document.querySelectorAll('input')).map(i => ({type:i.type, label: i.labels?.[0]?.textContent?.trim().slice(0,50) || i.placeholder || ''})),
    buttons: Array.from(document.querySelectorAll('button')).map(b => ({text: (b.textContent||'').trim().slice(0,40), type: b.type})),
    links: Array.from(document.querySelectorAll('a')).slice(0,10).map(a => ({text: (a.textContent||'').trim().slice(0,40), href: a.getAttribute('href')})),
  }));
  report.loginScan = loginScan;

  // Landing page DNA check
  await page.goto(`${URL}/landing-v2`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(()=>{});
  await page.waitForTimeout(3500);
  await shot(page, 'landing_full');
  const landingScan = await page.evaluate(() => ({
    h1: document.querySelector('h1, h2')?.textContent?.trim().slice(0,120),
    ctaCount: document.querySelectorAll('a[href*="signup"], a[href*="login"], button:not([disabled])').length,
    sectionCount: document.querySelectorAll('section').length,
    videoEl: !!document.querySelector('video'),
    typoErrors: (document.body.textContent || '').match(/FROISSEE\b|MISE\sA\sJOUR|MARCHEE/g)?.length || 0,
  }));
  report.landingScan = landingScan;
  log('LANDING scan', 'OK', JSON.stringify(landingScan));

  report.endedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'report-public.json'), JSON.stringify(report, null, 2));
  console.log(`\nOK:${report.steps.filter(s=>s.st==='OK').length} FAIL:${report.steps.filter(s=>s.st==='FAIL').length} ConsoleErr:${report.consoleErrors.length} FailedReq:${report.failedRequests.length}`);
  await browser.close();
})();
