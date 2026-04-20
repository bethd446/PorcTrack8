# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nav-complete.spec.ts >> HubTiles — walk toutes les tuiles >> Hub Pilotage — chaque tuile navigue correctement
- Location: tests/e2e/nav-complete.spec.ts:283:5

# Error details

```
Error: Tile "Performance" missing in Pilotage

expect(locator).toBeVisible() failed

Locator: locator('.ion-page:not(.ion-page-hidden)').last().getByRole('button', { name: 'Performance', exact: true }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Tile "Performance" missing in Pilotage with timeout 5000ms
  - waiting for locator('.ion-page:not(.ion-page-hidden)').last().getByRole('button', { name: 'Performance', exact: true }).first()

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
  195 |    */
  196 |   const HUB_TILES: Array<{
  197 |     hubPath: string;
  198 |     hubName: string;
  199 |     tiles: Array<{
  200 |       aria: string; // aria-label de la HubTile (= title)
  201 |       expectPath: RegExp;
  202 |       expectText?: string;
  203 |       isComingSoon?: boolean;
  204 |     }>;
  205 |   }> = [
  206 |     {
  207 |       hubPath: '/troupeau',
  208 |       hubName: 'Troupeau',
  209 |       tiles: [
  210 |         { aria: 'Truies', expectPath: /\/troupeau\/truies$/, expectText: 'Truies' },
  211 |         // Verrats redirige sur CheptelView avec initialTab=VERRAT → route reste /troupeau/verrats
  212 |         { aria: 'Verrats', expectPath: /\/troupeau\/verrats$/ },
  213 |         // Nouveau libellé agritech : "Portées" (ex-"Bandes"), route /troupeau/bandes
  214 |         { aria: 'Portées', expectPath: /\/troupeau\/bandes$/ },
  215 |         // Loges pointe aussi sur /troupeau/bandes (unité physique post-sevrage)
  216 |         { aria: 'Loges', expectPath: /\/troupeau\/bandes$/ },
  217 |       ],
  218 |     },
  219 |     {
  220 |       hubPath: '/cycles',
  221 |       hubName: 'Cycles',
  222 |       tiles: [
  223 |         {
  224 |           aria: 'Reproduction',
  225 |           expectPath: /\/cycles\/repro$/,
  226 |           expectText: 'Calendrier Repro',
  227 |           isComingSoon: true,
  228 |         },
  229 |         {
  230 |           aria: 'Maternité',
  231 |           expectPath: /\/cycles\/maternite$/,
  232 |           expectText: 'Maternité',
  233 |           isComingSoon: true,
  234 |         },
  235 |         {
  236 |           aria: 'Post-sevrage',
  237 |           expectPath: /\/cycles\/post-sevrage$/,
  238 |           expectText: 'Post-sevrage',
  239 |           isComingSoon: true,
  240 |         },
  241 |         {
  242 |           aria: 'Engraissement',
  243 |           expectPath: /\/cycles\/engraissement$/,
  244 |           expectText: 'Engraissement',
  245 |           isComingSoon: true,
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
> 295 |         await expect(tileBtn, `Tile "${tile.aria}" missing in ${hub.hubName}`).toBeVisible();
      |                                                                                ^ Error: Tile "Performance" missing in Pilotage
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
  346 |     await expect(page.getByRole('button', { name: 'Saillie', exact: true })).toBeVisible({
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
```