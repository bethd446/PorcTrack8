# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Sous-pages >> Stock (/stock/aliments) → bon titre
- Location: tests/e2e/navigation.spec.ts:148:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.textContent: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.premium-header h1, .premium-header .ft-heading').first()

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
  1   | /**
  2   |  * PorcTrack — Tests E2E Navigation
  3   |  * ════════════════════════════════════════════════════════
  4   |  * Vérifie que tous les menus s'affichent correctement,
  5   |  * que les headers sont cohérents et que le bouton retour
  6   |  * fonctionne sur chaque page.
  7   |  *
  8   |  * npx playwright test navigation
  9   |  */
  10  | 
  11  | import { test, expect, type Page } from '@playwright/test';
  12  | 
  13  | // ── Helpers ──────────────────────────────────────────────────────────────────
  14  | 
  15  | async function waitForApp(page: Page) {
  16  |   // Attendre que l'app soit chargée (pas d'ErrorBoundary, pas de spinner seul)
  17  |   await page.waitForLoadState('networkidle');
  18  | 
  19  |   // Gérer l'overlay d'audit quotidien s'il apparaît
  20  |   const laterBtn = page.locator('button:has-text("Plus tard")');
  21  |   if (await laterBtn.isVisible()) {
  22  |     await laterBtn.tap();
  23  |     await page.waitForTimeout(400);
  24  |   }
  25  | 
  26  |   // Attendre qu'un élément structurel soit là
  27  |   await page.locator('.premium-header').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  28  |   await page.waitForTimeout(800);
  29  |   const errorBoundary = page.locator('text=ERREUR DE CHARGEMENT');
  30  |   expect(await errorBoundary.isVisible()).toBe(false);
  31  | }
  32  | 
  33  | async function tapNavTab(page: Page, tabName: string) {
  34  |   await page.locator(`ion-tab-button >> text=${tabName}`).tap({ force: true });
  35  |   await page.waitForTimeout(600);
  36  | }
  37  | 
  38  | async function getHeaderTitle(page: Page): Promise<string> {
  39  |   // BigShoulders h1 dans le premium-header
  40  |   const h1 = page.locator('.premium-header h1, .premium-header .ft-heading').first();
  41  |   await h1.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
> 42  |   return (await h1.textContent())?.trim() ?? '';
      |                    ^ Error: locator.textContent: Test timeout of 30000ms exceeded.
  43  | }
  44  | 
  45  | // ── Test Suite : Navigation principale ───────────────────────────────────────
  46  | 
  47  | test.describe('Navigation Principale', () => {
  48  |   test.beforeEach(async ({ page }) => {
  49  |     await page.goto('/');
  50  |     await waitForApp(page);
  51  |   });
  52  | 
  53  |   test('Dashboard se charge sans erreur', async ({ page }) => {
  54  |     const title = await getHeaderTitle(page);
  55  |     expect(title.toUpperCase()).toBe('COCKPIT');
  56  |     // Vérifier la navigation bar en bas
  57  |     await expect(page.locator('ion-tab-bar')).toBeVisible();
  58  |   });
  59  | 
  60  |   test('Onglet Cheptel → header correct', async ({ page }) => {
  61  |     await tapNavTab(page, 'CHEPTEL');
  62  |     const title = await getHeaderTitle(page);
  63  |     expect(title.toUpperCase()).toBe('CHEPTEL');
  64  |     // Vérifier les segments Truies / Verrats
  65  |     await expect(page.locator('ion-segment')).toBeVisible();
  66  |   });
  67  | 
  68  |   test('Onglet Bandes → header correct', async ({ page }) => {
  69  |     await tapNavTab(page, 'BANDES');
  70  |     const title = await getHeaderTitle(page);
  71  |     expect(title.toUpperCase()).toContain('BANDE');
  72  |   });
  73  | 
  74  |   test('Onglet Alertes → header correct', async ({ page }) => {
  75  |     await tapNavTab(page, 'ALERTES');
  76  |     const title = await getHeaderTitle(page);
  77  |     expect(title.toUpperCase()).toContain('ALERT');
  78  |   });
  79  | 
  80  |   test('Onglet Plus → header correct', async ({ page }) => {
  81  |     await tapNavTab(page, 'PLUS');
  82  |     const title = await getHeaderTitle(page);
  83  |     expect(title.toUpperCase()).toContain('CONTR');
  84  |   });
  85  | 
  86  |   test('Tous les onglets sont accessibles (pas de crash)', async ({ page }) => {
  87  |     const tabs = ['CHEPTEL', 'BANDES', 'ALERTES', 'PLUS'];
  88  |     for (const tab of tabs) {
  89  |       await tapNavTab(page, tab);
  90  |       const errorBoundary = page.locator('text=ERREUR DE CHARGEMENT');
  91  |       expect(await errorBoundary.isVisible()).toBe(false);
  92  |       // Revenir au home
  93  |       await tapNavTab(page, 'HOME');
  94  |     }
  95  |   });
  96  | });
  97  | 
  98  | // ── Test Suite : Bouton Retour ────────────────────────────────────────────────
  99  | 
  100 | test.describe('Bouton Retour', () => {
  101 |   test.beforeEach(async ({ page }) => {
  102 |     await page.goto('/');
  103 |     await waitForApp(page);
  104 |   });
  105 | 
  106 |   test('Dashboard : PAS de bouton retour', async ({ page }) => {
  107 |     // Sur la home, le bouton retour ne doit pas être visible
  108 |     const backBtn = page.locator('.premium-header button[class*="chevron"]').first();
  109 |     expect(await backBtn.isVisible()).toBe(false);
  110 |   });
  111 | 
  112 |   test('Cheptel → retour ramène au home', async ({ page }) => {
  113 |     await tapNavTab(page, 'CHEPTEL');
  114 |     await page.waitForTimeout(600);
  115 |     // Le bouton retour doit être visible
  116 |     const backBtn = page.locator('.premium-header button').first();
  117 |     await backBtn.tap({ force: true });
  118 |     await page.waitForTimeout(800);
  119 |     const title = await getHeaderTitle(page);
  120 |     // Soit on est sur home, soit sur la page précédente
  121 |     expect(title.toUpperCase()).toBeTruthy();
  122 |   });
  123 | 
  124 |   test('Bandes → retour fonctionne', async ({ page }) => {
  125 |     await page.goto('/bandes');
  126 |     await waitForApp(page);
  127 |     const backBtn = page.locator('.premium-header button').first();
  128 |     if (await backBtn.isVisible()) {
  129 |       await backBtn.tap({ force: true });
  130 |       await page.waitForTimeout(600);
  131 |       // Pas d'erreur après le retour
  132 |       const err = page.locator('text=ERREUR DE CHARGEMENT');
  133 |       expect(await err.isVisible()).toBe(false);
  134 |     }
  135 |   });
  136 | });
  137 | 
  138 | // ── Test Suite : Sous-pages ───────────────────────────────────────────────────
  139 | 
  140 | test.describe('Sous-pages', () => {
  141 |   test('Santé (/sante) → bon titre', async ({ page }) => {
  142 |     await page.goto('/sante');
```