# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nav-complete.spec.ts >> Legacy routes — toujours vivantes >> Legacy route /sante se charge sans 404 ni page blanche
- Location: tests/e2e/nav-complete.spec.ts:403:5

# Error details

```
Error: Console errors on /sante:
Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. 
Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. 
Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. 
Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. 
Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. 
Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. 

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 6
Received array:  ["Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. ", "Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. ", "Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. ", "Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. ", "Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. ", "Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. "]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - button "Retour" [ref=e8] [cursor=pointer]:
              - img [ref=e9]
            - generic [ref=e11]:
              - heading "Journal Santé" [level=1] [ref=e12]
              - paragraph [ref=e13]: Suivi sanitaire
          - generic [ref=e14]:
            - button "Voir l'audit" [ref=e15] [cursor=pointer]:
              - img [ref=e16]
              - generic [ref=e19]: "1"
            - generic [ref=e22]: Live
        - paragraph [ref=e25]: Secteur Nord · Ferme A130
        - generic [ref=e27]:
          - img [ref=e28]
          - textbox "Filtrer les données..." [ref=e31]
    - main [ref=e32]:
      - generic [ref=e36]:
        - generic [ref=e38]: 3 Entrées trouvées
        - generic [ref=e40] [cursor=pointer]:
          - generic [ref=e42]:
            - img [ref=e44]
            - generic [ref=e46]:
              - heading [level=2]
              - text: Identifiant Unique
          - generic [ref=e49]:
            - generic [ref=e50]: TS
            - generic [ref=e51]: 2026-04-07T08:00:00.000Z
          - generic [ref=e56]:
            - generic [ref=e57]: Détails
            - img [ref=e58]
        - generic [ref=e60] [cursor=pointer]:
          - generic [ref=e61]:
            - generic [ref=e62]:
              - img [ref=e64]
              - generic [ref=e66]:
                - heading [level=2]
                - text: Identifiant Unique
            - generic [ref=e67]: BOUCLE 24-26
          - generic [ref=e68]:
            - generic [ref=e69]:
              - generic [ref=e70]: TS
              - generic [ref=e71]: 2026-04-07T08:00:00.000Z
            - generic [ref=e73]: 2026-04-07T07:00:00.000Z
            - generic [ref=e75]: 1899-12-30T16:00:00.000Z
            - generic [ref=e77]: Porcher
            - generic [ref=e79]: TRAITEMENT
          - generic [ref=e84]:
            - generic [ref=e85]: Détails
            - img [ref=e86]
        - generic [ref=e88] [cursor=pointer]:
          - generic [ref=e89]:
            - generic [ref=e90]:
              - img [ref=e92]
              - generic [ref=e94]:
                - heading [level=2]
                - text: Identifiant Unique
            - generic [ref=e95]: POINT HEBDO SEM 6-12 AVRIL
          - generic [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]: TS
              - generic [ref=e99]: 2026-04-12T08:00:00.000Z
            - generic [ref=e101]: 2026-04-12T07:00:00.000Z
            - generic [ref=e103]: 1899-12-30T16:00:00.000Z
            - generic [ref=e105]: Porcher
            - generic [ref=e107]: OBSERVATION
          - generic [ref=e112]:
            - generic [ref=e113]: Détails
            - img [ref=e114]
  - navigation "Navigation principale" [ref=e116]:
    - list [ref=e117]:
      - listitem [ref=e118]:
        - button "Cockpit" [ref=e119] [cursor=pointer]:
          - img [ref=e121]
          - generic [ref=e126]: Cockpit
      - listitem [ref=e127]:
        - button "Troupeau" [ref=e128] [cursor=pointer]:
          - img [ref=e130]
          - generic [ref=e135]: Troupeau
      - listitem [ref=e136]:
        - button "Cycles" [ref=e137] [cursor=pointer]:
          - img [ref=e139]
          - generic [ref=e141]: Cycles
      - listitem [ref=e142]:
        - button "Ressources" [ref=e143] [cursor=pointer]:
          - img [ref=e145]
          - generic [ref=e149]: Ressources
      - listitem [ref=e150]:
        - button "Pilotage" [ref=e151] [cursor=pointer]:
          - img [ref=e153]
          - generic [ref=e155]: Pilotage
```

# Test source

```ts
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
> 412 |       ).toHaveLength(0);
      |         ^ Error: Console errors on /sante:
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
  447 | 
  448 |     await page.screenshot({
  449 |       path: 'tests/playwright-artifacts/screenshots/cheptel-search.png',
  450 |       fullPage: false,
  451 |     });
  452 |   });
  453 | });
  454 | 
```