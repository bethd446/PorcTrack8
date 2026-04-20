# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nav-complete.spec.ts >> Agritech nav — walk complet >> Walk : Cockpit → Troupeau → Cycles → Ressources → Pilotage
- Location: tests/e2e/nav-complete.spec.ts:152:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('navigation', { name: /navigation principale/i }).last().getByRole('button', { name: /^Cockpit$/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('navigation', { name: /navigation principale/i }).last().getByRole('button', { name: /^Cockpit$/i })

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
  14  | 
  15  | // ─── Helpers ───────────────────────────────────────────────────────────
  16  | 
  17  | type ConsoleErrorTracker = {
  18  |   errors: string[];
  19  |   dispose: () => void;
  20  | };
  21  | 
  22  | /** Ignore les bruits non pertinents (favicon 404, HMR, etc.). */
  23  | function isIgnorableConsoleError(text: string): boolean {
  24  |   const lc = text.toLowerCase();
  25  |   return (
  26  |     lc.includes('favicon') ||
  27  |     lc.includes('[hmr]') ||
  28  |     lc.includes('download the react devtools') ||
  29  |     lc.includes('manifest.json') ||
  30  |     lc.includes('service worker') ||
  31  |     // Les fetchs GAS peuvent échouer en dev offline — c'est géré par FarmContext
  32  |     lc.includes('gas') ||
  33  |     lc.includes('cors') ||
  34  |     lc.includes('failed to fetch') ||
  35  |     lc.includes('network') ||
  36  |     // React Router future flags (informational warnings)
  37  |     lc.includes('react router future flag') ||
  38  |     // React 19 warns about deprecated hooks in Ionic sometimes
  39  |     lc.includes('ionic') ||
  40  |     // Preload / module warnings non bloquants
  41  |     lc.includes('preload')
  42  |   );
  43  | }
  44  | 
  45  | function attachConsoleTracker(page: Page): ConsoleErrorTracker {
  46  |   const errors: string[] = [];
  47  |   const handler = (msg: ConsoleMessage) => {
  48  |     if (msg.type() === 'error') {
  49  |       const txt = msg.text();
  50  |       if (!isIgnorableConsoleError(txt)) errors.push(txt);
  51  |     }
  52  |   };
  53  |   page.on('console', handler);
  54  | 
  55  |   const pageErrorHandler = (err: Error) => {
  56  |     if (!isIgnorableConsoleError(err.message)) {
  57  |       errors.push(`[pageerror] ${err.message}`);
  58  |     }
  59  |   };
  60  |   page.on('pageerror', pageErrorHandler);
  61  | 
  62  |   return {
  63  |     errors,
  64  |     dispose: () => {
  65  |       page.off('console', handler);
  66  |       page.off('pageerror', pageErrorHandler);
  67  |     },
  68  |   };
  69  | }
  70  | 
  71  | /**
  72  |  * Vérifie qu'un écran se charge sans être blanc et sans erreur JS critique.
  73  |  * Prend une capture d'écran en cas de check de santé explicite.
  74  |  */
  75  | async function assertScreenHealthy(
  76  |   page: Page,
  77  |   urlPath: string,
  78  |   opts: { expectedText?: string; screenshot?: string } = {}
  79  | ): Promise<string[]> {
  80  |   const tracker = attachConsoleTracker(page);
  81  |   await page.goto(urlPath, { waitUntil: 'domcontentloaded' });
  82  |   // Laisse React hydrater + le Suspense charger le chunk lazy
  83  |   await page.waitForLoadState('networkidle').catch(() => {
  84  |     /* ignore — offline data fetches */
  85  |   });
  86  | 
  87  |   const body = await page.textContent('body');
  88  |   expect(body, `body empty on ${urlPath}`).toBeTruthy();
  89  |   expect(body!.length, `page looks blank on ${urlPath}`).toBeGreaterThan(50);
  90  | 
  91  |   if (opts.expectedText) {
  92  |     expect(body).toContain(opts.expectedText);
  93  |   }
  94  | 
  95  |   if (opts.screenshot) {
  96  |     await page.screenshot({
  97  |       path: `tests/playwright-artifacts/screenshots/${opts.screenshot}.png`,
  98  |       fullPage: true,
  99  |     });
  100 |   }
  101 | 
  102 |   const criticalErrors = tracker.errors.slice();
  103 |   tracker.dispose();
  104 |   return criticalErrors;
  105 | }
  106 | 
  107 | /** Clique un onglet de la bottom nav par son aria-label. */
  108 | async function clickNavTab(page: Page, name: string): Promise<void> {
  109 |   // Les onglets sont des <button aria-label="..."> dans <nav aria-label="Navigation principale">.
  110 |   // IMPORTANT: Ionic conserve les IonPage précédents dans le DOM pendant la transition,
  111 |   // donc plusieurs <nav> peuvent coexister. On vise le dernier (= celui de la page active).
  112 |   const nav = page.getByRole('navigation', { name: /navigation principale/i }).last();
  113 |   const tab = nav.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
> 114 |   await expect(tab).toBeVisible();
      |                     ^ Error: expect(locator).toBeVisible() failed
  115 |   await tab.click();
  116 |   await page.waitForLoadState('domcontentloaded');
  117 | }
  118 | 
  119 | /**
  120 |  * Force le retour à un hub donné via URL navigation (plus fiable que cliquer
  121 |  * la nav quand Ionic garde plusieurs pages en DOM).
  122 |  */
  123 | async function gotoHub(page: Page, hubPath: string): Promise<void> {
  124 |   await page.goto(hubPath, { waitUntil: 'domcontentloaded' });
  125 |   // Pas de networkidle — les fetch Sheets peuvent durer. On attend juste qu'une
  126 |   // HubTile du hub soit visible (= IonPage active rendu) via l'appelant.
  127 |   await page.waitForTimeout(200);
  128 | }
  129 | 
  130 | /**
  131 |  * Récupère le contenu textuel UNIQUEMENT de la page Ionic active.
  132 |  * Ionic conserve plusieurs IonPage dans le DOM pendant la transition et garde
  133 |  * les précédentes avec `.ion-page-hidden`. Cibler la page active évite que
  134 |  * `body.textContent` ramène le texte d'une page déjà démontée visuellement.
  135 |  */
  136 | async function getActivePageText(page: Page): Promise<string> {
  137 |   const activePage = page.locator('.ion-page:not(.ion-page-hidden)').last();
  138 |   await expect(activePage).toBeVisible();
  139 |   const txt = await activePage.textContent();
  140 |   if (!txt) throw new Error('Active IonPage has no textContent');
  141 |   return txt;
  142 | }
  143 | 
  144 | // ─── Tests ─────────────────────────────────────────────────────────────
  145 | 
  146 | test.describe('Agritech nav — walk complet', () => {
  147 |   test.beforeEach(async ({ page }) => {
  148 |     // Charge la home une fois pour warmup
  149 |     await page.goto('/', { waitUntil: 'domcontentloaded' });
  150 |   });
  151 | 
  152 |   test('Walk : Cockpit → Troupeau → Cycles → Ressources → Pilotage', async ({
  153 |     page,
  154 |   }) => {
  155 |     const walk: Array<{ name: string; expectedPath: RegExp; expectedText: string }> = [
  156 |       { name: 'Cockpit', expectedPath: /\/$/, expectedText: 'Cockpit' },
  157 |       { name: 'Troupeau', expectedPath: /\/troupeau$/, expectedText: 'Troupeau' },
  158 |       { name: 'Cycles', expectedPath: /\/cycles$/, expectedText: 'Cycles' },
  159 |       { name: 'Ressources', expectedPath: /\/ressources$/, expectedText: 'Ressources' },
  160 |       { name: 'Pilotage', expectedPath: /\/pilotage$/, expectedText: 'Pilotage' },
  161 |     ];
  162 | 
  163 |     const tracker = attachConsoleTracker(page);
  164 | 
  165 |     for (const step of walk) {
  166 |       await clickNavTab(page, step.name);
  167 |       await expect(page).toHaveURL(step.expectedPath);
  168 |       // Laisse Ionic finir la transition avant de lire la page active
  169 |       await page.waitForTimeout(300);
  170 |       const activeText = await getActivePageText(page);
  171 |       expect(activeText.length, `active page empty on ${step.name}`).toBeGreaterThan(30);
  172 |       expect(activeText.toLowerCase()).toContain(step.expectedText.toLowerCase());
  173 |       await page.screenshot({
  174 |         path: `tests/playwright-artifacts/screenshots/hub-${step.name.toLowerCase()}.png`,
  175 |         fullPage: true,
  176 |       });
  177 |     }
  178 | 
  179 |     const leftovers = tracker.errors.slice();
  180 |     tracker.dispose();
  181 |     expect(
  182 |       leftovers,
  183 |       `Console errors during nav walk:\n${leftovers.join('\n')}`
  184 |     ).toHaveLength(0);
  185 |   });
  186 | });
  187 | 
  188 | // Tests de walk des tuiles : chaque hub peut prendre 30-60s (plusieurs tiles × goto).
  189 | test.describe('HubTiles — walk toutes les tuiles', () => {
  190 |   test.describe.configure({ timeout: 90_000 });
  191 |   /**
  192 |    * Structure des HubTiles par hub. Format : { hubPath, tiles: [{ aria, expectPath, expectText? }] }
  193 |    * `expectText` : texte attendu sur l'écran cible (ComingSoon → "Module en cours" ;
  194 |    * autres → un marqueur de page).
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
```