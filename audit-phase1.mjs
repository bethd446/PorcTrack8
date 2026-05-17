// Audit Phase 1 — PorcTrack 8 — 2026-05-17 (v2 — fix login + waits)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/tmp/audit-2026-05-17';
const URL = 'https://porctrack.tech';
const EMAIL = 'contact@liegeoischristophe.com';
const PASSWORD = 'AuditPorc2026!';

const report = {
  startedAt: new Date().toISOString(),
  steps: [],
  consoleErrors: [],
  consoleWarns: [],
  failedRequests: [],
  pageErrors: [],
  authResponses: [],
};

const log = (step, status, detail = '') => {
  const entry = { step, status, detail: String(detail).slice(0, 500), ts: new Date().toISOString() };
  report.steps.push(entry);
  console.log(`[${status}] ${step}${detail ? ' — ' + String(detail).slice(0, 200) : ''}`);
};

const shot = async (page, name) => {
  const filepath = path.join(OUT, `${String(report.steps.length).padStart(3, '0')}_${name}.png`);
  try { await page.screenshot({ path: filepath, fullPage: false }); return filepath; } catch { return null; }
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1',
    locale: 'fr-FR',
  });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error') report.consoleErrors.push({ url: page.url(), text: text.slice(0, 800) });
    else if (t === 'warning') report.consoleWarns.push({ url: page.url(), text: text.slice(0, 400) });
  });
  page.on('pageerror', err => report.pageErrors.push({ url: page.url(), message: err.message, stack: err.stack?.split('\n').slice(0, 4).join('\n') }));
  page.on('requestfailed', req => {
    report.failedRequests.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText,
      where: page.url(),
    });
  });
  page.on('response', async resp => {
    const s = resp.status();
    const u = resp.url();
    if (u.includes('/auth/v1/token')) {
      let body = '';
      try { body = (await resp.text()).slice(0, 400); } catch {}
      report.authResponses.push({ url: u, status: s, body });
    }
    if (s >= 400 && s < 600 && (u.includes('supabase') || u.includes('porctrack') || u.includes('api.'))) {
      let body = '';
      try { body = (await resp.text()).slice(0, 400); } catch {}
      report.failedRequests.push({ url: u, status: s, method: resp.request().method(), body, where: page.url() });
    }
  });

  // ===== A. LOGIN =====
  log('A1 Navigate /login', 'INFO');
  await page.goto(`${URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await shot(page, 'A1_login_page');

  log('A1b Dump login form HTML', 'INFO');
  const formHtml = await page.evaluate(() => ({
    hasForm: !!document.querySelector('form'),
    inputs: Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type, name: i.name, id: i.id, placeholder: i.placeholder,
      autocomplete: i.autocomplete, disabled: i.disabled, visible: i.offsetParent !== null,
    })),
    buttons: Array.from(document.querySelectorAll('button')).map(b => ({
      text: (b.textContent || '').trim().slice(0, 50),
      type: b.type, disabled: b.disabled,
    })),
  }));
  report.formInspect = formHtml;
  log('A1b Form scan', 'OK', `inputs=${formHtml.inputs.length} btns=${formHtml.buttons.length}`);

  log('A2 Fill email/password', 'INFO');
  try {
    const emailInput = page.locator('input[type="email"], input[autocomplete*="email"], input[name*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.click();
    await emailInput.fill(EMAIL);
    await page.waitForTimeout(300);

    const pwInput = page.locator('input[type="password"]').first();
    await pwInput.waitFor({ state: 'visible', timeout: 5000 });
    await pwInput.click();
    await pwInput.fill(PASSWORD);
    await page.waitForTimeout(300);
    await shot(page, 'A2_login_filled');

    const vals = await page.evaluate(() => ({
      email: document.querySelector('input[type="email"]')?.value,
      pw: document.querySelector('input[type="password"]')?.value ? '***SET***' : '',
    }));
    log('A2 Values verified', vals.email && vals.pw ? 'OK' : 'FAIL', JSON.stringify(vals));

    log('A2b Click submit + wait auth response', 'INFO');
    const respPromise = page.waitForResponse(r => r.url().includes('/auth/v1/token'), { timeout: 25000 });
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    const authResp = await respPromise.catch(() => null);
    if (authResp) {
      const status = authResp.status();
      const body = await authResp.text().catch(() => '');
      log('A2b Auth resp', `HTTP ${status}`, body.slice(0, 200));
    } else {
      log('A2b Auth resp', 'FAIL', 'no auth response within 25s');
    }
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, 'A3_after_login');
    const urlAfter = page.url();
    log('A3 Post-login URL', urlAfter.includes('/login') ? 'FAIL' : 'OK', urlAfter);
  } catch (e) {
    log('A2 Login failure', 'FAIL', e.message);
    await shot(page, 'A2_login_error');
  }

  const loggedIn = !page.url().includes('/login');
  if (loggedIn) {
    await ctx.storageState({ path: path.join(OUT, 'auth-state.json') });
    log('A4 Auth state saved', 'OK');
  }

  // ===== ACCUEIL / TODAY =====
  log('A5 Navigate /today', 'INFO');
  await page.goto(`${URL}/today`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await shot(page, 'A5_today');
  const todayUrl = page.url();
  const todayInfo = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1, h2')?.textContent?.trim().slice(0, 100),
    textLen: document.body.textContent?.length || 0,
    alertCount: document.querySelectorAll('[class*="alert" i], [data-testid*="alert"]').length,
  }));
  log('A5 Today loaded', !todayUrl.includes('/login') ? 'OK' : 'FAIL', JSON.stringify(todayInfo));

  // ===== B. CHEPTEL =====
  for (const r of [
    ['/troupeau', 'B1_troupeau_main'],
    ['/troupeau/truies', 'B2_truies'],
    ['/troupeau/verrats', 'B3_verrats'],
    ['/troupeau/bandes', 'B4_bandes'],
    ['/troupeau/loges', 'B5_loges'],
    ['/troupeau/porcelets', 'B6_porcelets'],
  ]) {
    try {
      await page.goto(`${URL}${r[0]}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2500);
      await shot(page, r[1]);
      const info = await page.evaluate(() => ({
        h1: document.querySelector('h1, h2')?.textContent?.trim().slice(0, 80),
        items: document.querySelectorAll('[class*="row"], [class*="card"], [class*="list-item" i], ion-item').length,
        emptyState: !!document.querySelector('[class*="empty" i], [data-testid*="empty"]'),
        bodyLen: document.body.textContent?.length || 0,
      }));
      log(`B ${r[0]}`, page.url().includes('/login') ? 'FAIL' : 'OK', JSON.stringify(info));
    } catch (e) {
      log(`B ${r[0]}`, 'FAIL', e.message.slice(0, 200));
    }
  }

  // ===== C. CREATE LOGE =====
  log('C1 /troupeau/loges + scan add btn', 'INFO');
  await page.goto(`${URL}/troupeau/loges`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await shot(page, 'C1_loges_listing');

  const logesScan = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, ion-fab-button, ion-button, a[role="button"]'));
    return buttons.slice(0, 50).map(b => ({
      text: (b.textContent || '').trim().slice(0, 50),
      aria: b.getAttribute('aria-label') || '',
      tag: b.tagName,
      class: (b.className || '').toString().slice(0, 100),
      visible: b.offsetParent !== null,
    })).filter(b => b.text || b.aria);
  });
  report.logesPageButtons = logesScan;
  log('C1 Buttons scan', 'OK', `count=${logesScan.length}`);

  let clickedLoge = null;
  for (const sel of [
    'button:has-text("Ajouter une loge")',
    'button:has-text("Nouvelle loge")',
    'button:has-text("Créer une loge")',
    'ion-fab-button',
    'button[aria-label*="ajouter une loge" i]',
    'button[aria-label*="nouvelle loge" i]',
    'a:has-text("Ajouter une loge")',
    'button:has-text("Ajouter")',
    'button[aria-label*="ajouter" i]',
    'button:has-text("+")',
  ]) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click({ timeout: 3000 });
        clickedLoge = sel;
        await page.waitForTimeout(2000);
        await shot(page, `C2_loge_form_open`);
        break;
      }
    } catch {}
  }
  log('C2 Click create loge', clickedLoge ? 'OK' : 'FAIL', clickedLoge || 'no add btn');

  if (clickedLoge) {
    const formScan = await page.evaluate(() => ({
      modalOpen: !!document.querySelector('ion-modal[is-open="true"], [class*="modal" i][class*="open" i]'),
      inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        type: i.type, name: i.name, placeholder: i.placeholder, visible: i.offsetParent !== null,
      })).filter(i => i.visible),
      buttons: Array.from(document.querySelectorAll('button')).map(b => ({
        text: (b.textContent || '').trim().slice(0, 40),
      })).filter(b => b.text && b.text.length < 40),
    }));
    report.logeFormScan = formScan;
    log('C2b Form scan', 'OK', `inputs=${formScan.inputs.length}`);

    try {
      const nomInp = page.locator('input[name*="nom" i], input[name*="code" i], input[placeholder*="nom" i]').first();
      if (await nomInp.isVisible({ timeout: 2000 })) {
        await nomInp.fill(`AUDIT-M1-${Date.now()}`);
        await page.waitForTimeout(500);
      }
      await shot(page, 'C3_loge_form_filled');
      const submit = page.locator('button:has-text("Créer"), button:has-text("Enregistrer"), button:has-text("Valider"), button[type="submit"]').first();
      if (await submit.isVisible({ timeout: 2000 })) {
        const respP = page.waitForResponse(r => r.url().includes('supabase') && (r.request().method() === 'POST' || r.request().method() === 'PATCH'), { timeout: 10000 }).catch(() => null);
        await submit.click();
        const r = await respP;
        await page.waitForTimeout(2500);
        await shot(page, 'C3_loge_after_submit');
        log('C3 Loge submit', r ? `HTTP ${r.status()}` : 'NO_NETWORK', r ? (await r.text().catch(() => '')).slice(0, 200) : '');
      }
    } catch (e) {
      log('C3 Loge fill/submit', 'FAIL', e.message.slice(0, 200));
    }
  }

  // ===== C4 BANDES =====
  log('C4 /troupeau/bandes scan add', 'INFO');
  await page.goto(`${URL}/troupeau/bandes`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await shot(page, 'C4_bandes_listing');
  const bandesScan = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, ion-fab-button, ion-button, a[role="button"]'));
    return buttons.slice(0, 50).map(b => ({
      text: (b.textContent || '').trim().slice(0, 50),
      aria: b.getAttribute('aria-label') || '',
      visible: b.offsetParent !== null,
    })).filter(b => b.text || b.aria);
  });
  report.bandesPageButtons = bandesScan;

  let clickedBande = null;
  for (const sel of ['button:has-text("Ajouter une bande")', 'button:has-text("Nouvelle bande")', 'button:has-text("Créer une bande")', 'ion-fab-button', 'button:has-text("Ajouter")']) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click({ timeout: 3000 });
        clickedBande = sel;
        await page.waitForTimeout(2000);
        await shot(page, 'C5_bande_form_open');
        break;
      }
    } catch {}
  }
  log('C5 Click create bande', clickedBande ? 'OK' : 'FAIL', clickedBande);

  if (clickedBande) {
    const formScan = await page.evaluate(() => ({
      inputs: Array.from(document.querySelectorAll('input, select, textarea')).filter(i => i.offsetParent !== null).map(i => ({
        type: i.type, name: i.name, placeholder: i.placeholder,
      })),
      selects: Array.from(document.querySelectorAll('select, ion-select')).length,
      checkboxes: Array.from(document.querySelectorAll('input[type="checkbox"], ion-checkbox')).length,
      logeOptions: Array.from(document.querySelectorAll('[class*="loge" i]')).slice(0, 10).map(e => (e.textContent || '').trim().slice(0, 50)).filter(Boolean),
    }));
    report.bandeFormScan = formScan;
    log('C5b Bande form scan', 'OK', `inputs=${formScan.inputs.length} selects=${formScan.selects}`);
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch {}
  }

  // ===== D. PILOTAGE / RESSOURCES / MARIUS =====
  for (const r of [
    ['/pilotage', 'D1_pilotage_main'],
    ['/pilotage/performance', 'D2_pilotage_perf'],
    ['/pilotage/finances', 'D3_pilotage_finances'],
    ['/ressources', 'D4_ressources_main'],
    ['/ressources/aliments', 'D5_ressources_aliments'],
    ['/ressources/formules', 'D6_ressources_formules'],
    ['/ressources/pharmacie', 'D7_ressources_pharmacie'],
  ]) {
    try {
      await page.goto(`${URL}${r[0]}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2500);
      await shot(page, r[1]);
      const info = await page.evaluate(() => ({
        h1: document.querySelector('h1, h2')?.textContent?.trim().slice(0, 80),
        hasNaN: /NaN/.test(document.body.textContent || ''),
        dashes: (document.body.textContent || '').match(/—\s/g)?.length || 0,
        kpis: document.querySelectorAll('[class*="kpi" i], [class*="stat" i]').length,
        bodyLen: document.body.textContent?.length || 0,
      }));
      log(`D ${r[0]}`, page.url().includes('/login') ? 'FAIL' : (info.hasNaN ? 'WARN' : 'OK'), JSON.stringify(info));
    } catch (e) {
      log(`D ${r[0]}`, 'FAIL', e.message.slice(0, 150));
    }
  }

  log('D8 Test Marius bubble', 'INFO');
  await page.goto(`${URL}/today`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const mariusScan = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, [role="button"]'));
    return all.map(b => ({
      text: (b.textContent || '').trim().slice(0, 60),
      aria: b.getAttribute('aria-label') || '',
      class: (b.className || '').toString().slice(0, 80),
    })).filter(b => /marius|chatbot|assistant|ia\b/i.test(b.text + b.aria + b.class));
  });
  report.mariusButtons = mariusScan;
  log('D8 Marius buttons found', mariusScan.length ? 'OK' : 'WARN', `count=${mariusScan.length}`);

  // ===== E. CAPTURE NAV BOTTOM =====
  await shot(page, 'E0_today_with_bottomnav');
  try {
    const navItems = await page.evaluate(() => {
      const candidates = [
        ...document.querySelectorAll('[role="tab"]'),
        ...document.querySelectorAll('ion-tab-button'),
        ...document.querySelectorAll('[class*="BottomNav" i] button, [class*="BottomNav" i] a'),
        ...document.querySelectorAll('nav button, nav a'),
        ...document.querySelectorAll('[class*="bottom-nav" i] *'),
      ];
      const seen = new Set();
      return candidates.flatMap(el => {
        const text = (el.textContent || '').trim().slice(0, 50);
        const aria = el.getAttribute('aria-label') || '';
        const href = el.getAttribute('href') || '';
        const key = text + '|' + aria;
        if (!text || seen.has(key)) return [];
        seen.add(key);
        return [{ tag: el.tagName, text, aria, href }];
      });
    });
    report.navItems = navItems;
    log('E1 Nav items', 'OK', `count=${navItems.length}`);
  } catch (e) { log('E1 Nav scan', 'FAIL', e.message.slice(0, 100)); }

  await page.goto(`${URL}/more`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, 'E2_more');

  for (const probe of [
    'https://api.porctrack.tech/health',
    'https://api.porctrack.tech',
    'https://porctrack.tech/api/health',
  ]) {
    try {
      const r = await page.request.get(probe, { timeout: 5000 });
      log(`F probe ${probe}`, `HTTP ${r.status()}`, (await r.text().catch(() => '')).slice(0, 150));
    } catch (e) {
      log(`F probe ${probe}`, 'FAIL', e.message.slice(0, 150));
    }
  }

  report.endedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const ok = report.steps.filter(s => s.status === 'OK').length;
  const fail = report.steps.filter(s => s.status === 'FAIL').length;
  const warn = report.steps.filter(s => s.status === 'WARN').length;
  console.log(`\n=== SUMMARY ===\nSteps:${report.steps.length} OK:${ok} FAIL:${fail} WARN:${warn}`);
  console.log(`ConsoleErrors:${report.consoleErrors.length} PageErrors:${report.pageErrors.length} FailedReqs:${report.failedRequests.length}`);
  console.log(`Report: ${OUT}/report.json`);
  await browser.close();
})().catch(err => {
  console.error('FATAL:', err);
  report.fatal = { message: err.message, stack: err.stack };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  process.exit(1);
});
