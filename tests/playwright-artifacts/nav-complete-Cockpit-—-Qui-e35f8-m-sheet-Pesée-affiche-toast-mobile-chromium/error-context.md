# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nav-complete.spec.ts >> Cockpit — Quick Actions >> Saillie ouvre modal, Soin ouvre bottom sheet, Pesée affiche toast
- Location: tests/e2e/nav-complete.spec.ts:341:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Saillie', exact: true })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('button', { name: 'Saillie', exact: true })

```

# Page snapshot

```yaml
- dialog "Bienvenue dans PorcTrack" [ref=e4]:
  - progressbar "Progression" [ref=e5]
  - generic [ref=e12]:
    - generic [ref=e13]:
      - img "PorcTrack" [ref=e14]
      - heading "Bienvenue" [level=1] [ref=e15]
      - paragraph [ref=e16]: Suivi troupeau de la Ferme K13. Quelques questions pour configurer votre app — vous pouvez passer à tout moment.
    - button "Commencer" [ref=e18] [cursor=pointer]:
      - text: Commencer
      - img [ref=e19]
```

# Test source

```ts
  246 |         },
  247 |       ],
  248 |     },
  249 |     {
  250 |       hubPath: '/ressources',
  251 |       hubName: 'Ressources',
  252 |       tiles: [
  253 |         { aria: 'Aliments', expectPath: /\/ressources\/aliments$/ },
  254 |         { aria: 'Plan Alim', expectPath: /\/ressources\/aliments\/plan$/ },
  255 |         { aria: 'Véto', expectPath: /\/ressources\/veto$/ },
  256 |       ],
  257 |     },
  258 |     {
  259 |       hubPath: '/pilotage',
  260 |       hubName: 'Pilotage',
  261 |       tiles: [
  262 |         {
  263 |           aria: 'Performance',
  264 |           expectPath: /\/pilotage\/perf$/,
  265 |           expectText: 'Performance',
  266 |           isComingSoon: true,
  267 |         },
  268 |         {
  269 |           aria: 'Finances',
  270 |           expectPath: /\/pilotage\/finances$/,
  271 |           expectText: 'Finances',
  272 |           isComingSoon: true,
  273 |         },
  274 |         // Alertes / Audit / Réglages redirigent vers /alerts · /audit · /more
  275 |         { aria: 'Alertes', expectPath: /\/alerts$/ },
  276 |         { aria: 'Audit', expectPath: /\/audit$/ },
  277 |         { aria: 'Réglages', expectPath: /\/more$/ },
  278 |       ],
  279 |     },
  280 |   ];
  281 | 
  282 |   for (const hub of HUB_TILES) {
  283 |     test(`Hub ${hub.hubName} — chaque tuile navigue correctement`, async ({ page }) => {
  284 |       const tracker = attachConsoleTracker(page);
  285 |       await gotoHub(page, hub.hubPath);
  286 | 
  287 |       for (const tile of hub.tiles) {
  288 |         // Toujours repartir du hub propre (navigation directe, pas fiable via clic
  289 |         // car Ionic garde des IonPage stale dans le DOM).
  290 |         await gotoHub(page, hub.hubPath);
  291 | 
  292 |         // HubTile est un <button aria-label="...">. On cherche dans la page active uniquement.
  293 |         const activePage = page.locator('.ion-page:not(.ion-page-hidden)').last();
  294 |         const tileBtn = activePage.getByRole('button', { name: tile.aria, exact: true }).first();
  295 |         await expect(tileBtn, `Tile "${tile.aria}" missing in ${hub.hubName}`).toBeVisible();
  296 |         await tileBtn.click();
  297 | 
  298 |         // Attendre que l'URL change réellement
  299 |         await page.waitForURL(tile.expectPath, { timeout: 5_000 });
  300 |         // Laisse Ionic finir la transition (sinon textContent ramène l'ancienne page)
  301 |         await page.waitForTimeout(300);
  302 | 
  303 |         const activeText = await getActivePageText(page);
  304 |         expect(activeText.length, `active page blank after clicking ${tile.aria}`).toBeGreaterThan(
  305 |           30
  306 |         );
  307 | 
  308 |         if (tile.expectText) {
  309 |           expect(
  310 |             activeText.toLowerCase(),
  311 |             `expected text "${tile.expectText}" missing on ${tile.aria}`
  312 |           ).toContain(tile.expectText.toLowerCase());
  313 |         }
  314 | 
  315 |         if (tile.isComingSoon) {
  316 |           expect(
  317 |             activeText,
  318 |             `ComingSoon placeholder missing on ${tile.aria}`
  319 |           ).toContain('Module en cours de construction');
  320 |         }
  321 | 
  322 |         await page.screenshot({
  323 |           path: `tests/playwright-artifacts/screenshots/tile-${hub.hubName.toLowerCase()}-${tile.aria
  324 |             .toLowerCase()
  325 |             .replace(/\s+/g, '-')}.png`,
  326 |           fullPage: false,
  327 |         });
  328 |       }
  329 | 
  330 |       const leftovers = tracker.errors.slice();
  331 |       tracker.dispose();
  332 |       expect(
  333 |         leftovers,
  334 |         `Console errors in ${hub.hubName} hub:\n${leftovers.join('\n')}`
  335 |       ).toHaveLength(0);
  336 |     });
  337 |   }
  338 | });
  339 | 
  340 | test.describe('Cockpit — Quick Actions', () => {
  341 |   test('Saillie ouvre modal, Soin ouvre bottom sheet, Pesée affiche toast', async ({
  342 |     page,
  343 |   }) => {
  344 |     await page.goto('/', { waitUntil: 'domcontentloaded' });
  345 |     // Attendre juste que les 3 quick action buttons soient rendus (pas besoin de networkidle)
> 346 |     await expect(page.getByRole('button', { name: 'Saillie', exact: true })).toBeVisible({
      |                                                                              ^ Error: expect(locator).toBeVisible() failed
  347 |       timeout: 10_000,
  348 |     });
  349 | 
  350 |     // ── Saillie ─────────────────────────────────────────────────────
  351 |     const saillieBtn = page.getByRole('button', { name: 'Saillie', exact: true });
  352 |     await saillieBtn.click();
  353 |     // QuickSaillieForm rend un IonModal avec titre "Nouvelle saillie" ou similaire.
  354 |     // On vérifie qu'un modal/dialog apparaît.
  355 |     const anyDialog = page.getByRole('dialog').or(page.locator('ion-modal[is-open="true"]'));
  356 |     await expect(anyDialog.first()).toBeVisible({ timeout: 5_000 });
  357 |     // Fermer via Escape (plus fiable que chercher le bouton de fermeture)
  358 |     await page.keyboard.press('Escape');
  359 |     // Attendre que le modal parte
  360 |     await page.waitForTimeout(400);
  361 | 
  362 |     // ── Soin ────────────────────────────────────────────────────────
  363 |     const soinBtn = page.getByRole('button', { name: 'Soin', exact: true });
  364 |     await expect(soinBtn).toBeVisible();
  365 |     await soinBtn.click();
  366 |     // BottomSheet avec title="Nouveau soin"
  367 |     const soinSheet = page.getByText(/nouveau soin/i);
  368 |     await expect(soinSheet.first()).toBeVisible({ timeout: 5_000 });
  369 |     // Fermer via bouton "Fermer" aria-label
  370 |     const closeBtn = page.getByRole('button', { name: /fermer/i }).first();
  371 |     if (await closeBtn.isVisible().catch(() => false)) {
  372 |       await closeBtn.click();
  373 |     } else {
  374 |       await page.keyboard.press('Escape');
  375 |     }
  376 |     await page.waitForTimeout(400);
  377 | 
  378 |     // ── Pesée → toast "Bientôt disponible" ─────────────────────────
  379 |     const peseeBtn = page.getByRole('button', { name: 'Pesée', exact: true });
  380 |     await expect(peseeBtn).toBeVisible();
  381 |     await peseeBtn.click();
  382 |     // IonToast apparaît — texte "Pesée bulk · Bientôt disponible"
  383 |     await expect(page.getByText(/bientôt disponible/i).first()).toBeVisible({
  384 |       timeout: 5_000,
  385 |     });
  386 |   });
  387 | });
  388 | 
  389 | test.describe('Legacy routes — toujours vivantes', () => {
  390 |   const legacyRoutes: Array<{ path: string; screenshot: string }> = [
  391 |     { path: '/cheptel', screenshot: 'legacy-cheptel' },
  392 |     { path: '/bandes', screenshot: 'legacy-bandes' },
  393 |     { path: '/alerts', screenshot: 'legacy-alerts' },
  394 |     { path: '/audit', screenshot: 'legacy-audit' },
  395 |     { path: '/sync', screenshot: 'legacy-sync' },
  396 |     { path: '/more', screenshot: 'legacy-more' },
  397 |     { path: '/sante', screenshot: 'legacy-sante' },
  398 |     { path: '/stock', screenshot: 'legacy-stock' },
  399 |     { path: '/protocoles', screenshot: 'legacy-protocoles' },
  400 |   ];
  401 | 
  402 |   for (const route of legacyRoutes) {
  403 |     test(`Legacy route ${route.path} se charge sans 404 ni page blanche`, async ({
  404 |       page,
  405 |     }) => {
  406 |       const errors = await assertScreenHealthy(page, route.path, {
  407 |         screenshot: route.screenshot,
  408 |       });
  409 |       expect(
  410 |         errors,
  411 |         `Console errors on ${route.path}:\n${errors.join('\n')}`
  412 |       ).toHaveLength(0);
  413 |     });
  414 |   }
  415 | });
  416 | 
  417 | test.describe('CheptelView — recherche par boucle', () => {
  418 |   test('tape "B.22" puis "xyz" dans la recherche et vérifie résultats/empty', async ({
  419 |     page,
  420 |   }) => {
  421 |     await page.goto('/cheptel', { waitUntil: 'domcontentloaded' });
  422 |     await page.waitForLoadState('networkidle').catch(() => undefined);
  423 | 
  424 |     const searchInput = page.getByPlaceholder(/chercher par nom, id ou boucle/i).first();
  425 |     await expect(searchInput).toBeVisible();
  426 | 
  427 |     // ── Recherche "B.22" → au moins 1 résultat attendu (si data chargée) ──
  428 |     await searchInput.fill('B.22');
  429 |     // Laisse React re-render la liste
  430 |     await page.waitForTimeout(400);
  431 | 
  432 |     const bodyAfterMatch = await page.textContent('body');
  433 |     expect(bodyAfterMatch, 'body empty after search').toBeTruthy();
  434 | 
  435 |     // Si data Sheets indisponible (offline), liste peut être vide. On vérifie juste
  436 |     // que le DOM ne crash pas et que la search box fonctionne.
  437 |     const hasResultsOrEmpty = bodyAfterMatch!.length > 50;
  438 |     expect(hasResultsOrEmpty).toBeTruthy();
  439 | 
  440 |     // ── Recherche "xyzquery" → liste filtrée vide ──
  441 |     await searchInput.fill('xyzquerynoresult');
  442 |     await page.waitForTimeout(400);
  443 |     const bodyAfterNoMatch = await page.textContent('body');
  444 |     expect(bodyAfterNoMatch).toBeTruthy();
  445 |     // Idéalement on cherche un empty state — mais vérifier juste pas de crash
  446 |     expect(bodyAfterNoMatch!.length).toBeGreaterThan(50);
```