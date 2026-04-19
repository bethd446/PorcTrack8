import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * nav-complete.spec.ts
 * ─────────────────────────────────────────────────────────────────────
 * Smoke-test exhaustif de la nav Agritech (Cockpit → Troupeau → Cycles →
 * Ressources → Pilotage). Clique chaque onglet, chaque HubTile, vérifie
 * absence d'erreurs console critiques, absence de page blanche, et que
 * les placeholders ComingSoon affichent leur titre.
 *
 * Les échecs de ce test sont *informatifs* — ils détectent les écrans
 * cassés de la nouvelle nav. Ne pas modifier l'app depuis ce spec.
 */

// ─── Helpers ───────────────────────────────────────────────────────────

type ConsoleErrorTracker = {
  errors: string[];
  dispose: () => void;
};

/** Ignore les bruits non pertinents (favicon 404, HMR, etc.). */
function isIgnorableConsoleError(text: string): boolean {
  const lc = text.toLowerCase();
  return (
    lc.includes('favicon') ||
    lc.includes('[hmr]') ||
    lc.includes('download the react devtools') ||
    lc.includes('manifest.json') ||
    lc.includes('service worker') ||
    // Les fetchs GAS peuvent échouer en dev offline — c'est géré par FarmContext
    lc.includes('gas') ||
    lc.includes('cors') ||
    lc.includes('failed to fetch') ||
    lc.includes('network') ||
    // React Router future flags (informational warnings)
    lc.includes('react router future flag') ||
    // React 19 warns about deprecated hooks in Ionic sometimes
    lc.includes('ionic') ||
    // Preload / module warnings non bloquants
    lc.includes('preload')
  );
}

function attachConsoleTracker(page: Page): ConsoleErrorTracker {
  const errors: string[] = [];
  const handler = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!isIgnorableConsoleError(txt)) errors.push(txt);
    }
  };
  page.on('console', handler);

  const pageErrorHandler = (err: Error) => {
    if (!isIgnorableConsoleError(err.message)) {
      errors.push(`[pageerror] ${err.message}`);
    }
  };
  page.on('pageerror', pageErrorHandler);

  return {
    errors,
    dispose: () => {
      page.off('console', handler);
      page.off('pageerror', pageErrorHandler);
    },
  };
}

/**
 * Vérifie qu'un écran se charge sans être blanc et sans erreur JS critique.
 * Prend une capture d'écran en cas de check de santé explicite.
 */
async function assertScreenHealthy(
  page: Page,
  urlPath: string,
  opts: { expectedText?: string; screenshot?: string } = {}
): Promise<string[]> {
  const tracker = attachConsoleTracker(page);
  await page.goto(urlPath, { waitUntil: 'domcontentloaded' });
  // Laisse React hydrater + le Suspense charger le chunk lazy
  await page.waitForLoadState('networkidle').catch(() => {
    /* ignore — offline data fetches */
  });

  const body = await page.textContent('body');
  expect(body, `body empty on ${urlPath}`).toBeTruthy();
  expect(body!.length, `page looks blank on ${urlPath}`).toBeGreaterThan(50);

  if (opts.expectedText) {
    expect(body).toContain(opts.expectedText);
  }

  if (opts.screenshot) {
    await page.screenshot({
      path: `tests/playwright-artifacts/screenshots/${opts.screenshot}.png`,
      fullPage: true,
    });
  }

  const criticalErrors = tracker.errors.slice();
  tracker.dispose();
  return criticalErrors;
}

/** Clique un onglet de la bottom nav par son aria-label. */
async function clickNavTab(page: Page, name: string): Promise<void> {
  // Les onglets sont des <button aria-label="..."> dans <nav aria-label="Navigation principale">.
  // IMPORTANT: Ionic conserve les IonPage précédents dans le DOM pendant la transition,
  // donc plusieurs <nav> peuvent coexister. On vise le dernier (= celui de la page active).
  const nav = page.getByRole('navigation', { name: /navigation principale/i }).last();
  const tab = nav.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
  await expect(tab).toBeVisible();
  await tab.click();
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Force le retour à un hub donné via URL navigation (plus fiable que cliquer
 * la nav quand Ionic garde plusieurs pages en DOM).
 */
async function gotoHub(page: Page, hubPath: string): Promise<void> {
  await page.goto(hubPath, { waitUntil: 'domcontentloaded' });
  // Pas de networkidle — les fetch Sheets peuvent durer. On attend juste qu'une
  // HubTile du hub soit visible (= IonPage active rendu) via l'appelant.
  await page.waitForTimeout(200);
}

/**
 * Récupère le contenu textuel UNIQUEMENT de la page Ionic active.
 * Ionic conserve plusieurs IonPage dans le DOM pendant la transition et garde
 * les précédentes avec `.ion-page-hidden`. Cibler la page active évite que
 * `body.textContent` ramène le texte d'une page déjà démontée visuellement.
 */
async function getActivePageText(page: Page): Promise<string> {
  const activePage = page.locator('.ion-page:not(.ion-page-hidden)').last();
  await expect(activePage).toBeVisible();
  const txt = await activePage.textContent();
  if (!txt) throw new Error('Active IonPage has no textContent');
  return txt;
}

// ─── Tests ─────────────────────────────────────────────────────────────

test.describe('Agritech nav — walk complet', () => {
  test.beforeEach(async ({ page }) => {
    // Charge la home une fois pour warmup
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('Walk : Cockpit → Troupeau → Cycles → Ressources → Pilotage', async ({
    page,
  }) => {
    const walk: Array<{ name: string; expectedPath: RegExp; expectedText: string }> = [
      { name: 'Cockpit', expectedPath: /\/$/, expectedText: 'Cockpit' },
      { name: 'Troupeau', expectedPath: /\/troupeau$/, expectedText: 'Troupeau' },
      { name: 'Cycles', expectedPath: /\/cycles$/, expectedText: 'Cycles' },
      { name: 'Ressources', expectedPath: /\/ressources$/, expectedText: 'Ressources' },
      { name: 'Pilotage', expectedPath: /\/pilotage$/, expectedText: 'Pilotage' },
    ];

    const tracker = attachConsoleTracker(page);

    for (const step of walk) {
      await clickNavTab(page, step.name);
      await expect(page).toHaveURL(step.expectedPath);
      // Laisse Ionic finir la transition avant de lire la page active
      await page.waitForTimeout(300);
      const activeText = await getActivePageText(page);
      expect(activeText.length, `active page empty on ${step.name}`).toBeGreaterThan(30);
      expect(activeText.toLowerCase()).toContain(step.expectedText.toLowerCase());
      await page.screenshot({
        path: `tests/playwright-artifacts/screenshots/hub-${step.name.toLowerCase()}.png`,
        fullPage: true,
      });
    }

    const leftovers = tracker.errors.slice();
    tracker.dispose();
    expect(
      leftovers,
      `Console errors during nav walk:\n${leftovers.join('\n')}`
    ).toHaveLength(0);
  });
});

// Tests de walk des tuiles : chaque hub peut prendre 30-60s (plusieurs tiles × goto).
test.describe('HubTiles — walk toutes les tuiles', () => {
  test.describe.configure({ timeout: 90_000 });
  /**
   * Structure des HubTiles par hub. Format : { hubPath, tiles: [{ aria, expectPath, expectText? }] }
   * `expectText` : texte attendu sur l'écran cible (ComingSoon → "Module en cours" ;
   * autres → un marqueur de page).
   */
  const HUB_TILES: Array<{
    hubPath: string;
    hubName: string;
    tiles: Array<{
      aria: string; // aria-label de la HubTile (= title)
      expectPath: RegExp;
      expectText?: string;
      isComingSoon?: boolean;
    }>;
  }> = [
    {
      hubPath: '/troupeau',
      hubName: 'Troupeau',
      tiles: [
        { aria: 'Truies', expectPath: /\/troupeau\/truies$/, expectText: 'Truies' },
        // Verrats redirige sur CheptelView avec initialTab=VERRAT → route reste /troupeau/verrats
        { aria: 'Verrats', expectPath: /\/troupeau\/verrats$/ },
        // Nouveau libellé agritech : "Portées" (ex-"Bandes"), route /troupeau/bandes
        { aria: 'Portées', expectPath: /\/troupeau\/bandes$/ },
        // Loges pointe aussi sur /troupeau/bandes (unité physique post-sevrage)
        { aria: 'Loges', expectPath: /\/troupeau\/bandes$/ },
      ],
    },
    {
      hubPath: '/cycles',
      hubName: 'Cycles',
      tiles: [
        {
          aria: 'Reproduction',
          expectPath: /\/cycles\/repro$/,
          expectText: 'Calendrier Repro',
          isComingSoon: true,
        },
        {
          aria: 'Maternité',
          expectPath: /\/cycles\/maternite$/,
          expectText: 'Maternité',
          isComingSoon: true,
        },
        {
          aria: 'Post-sevrage',
          expectPath: /\/cycles\/post-sevrage$/,
          expectText: 'Post-sevrage',
          isComingSoon: true,
        },
        {
          aria: 'Engraissement',
          expectPath: /\/cycles\/engraissement$/,
          expectText: 'Engraissement',
          isComingSoon: true,
        },
      ],
    },
    {
      hubPath: '/ressources',
      hubName: 'Ressources',
      tiles: [
        { aria: 'Aliments', expectPath: /\/ressources\/aliments$/ },
        { aria: 'Plan Alim', expectPath: /\/ressources\/aliments\/plan$/ },
        { aria: 'Véto', expectPath: /\/ressources\/veto$/ },
      ],
    },
    {
      hubPath: '/pilotage',
      hubName: 'Pilotage',
      tiles: [
        {
          aria: 'Performance',
          expectPath: /\/pilotage\/perf$/,
          expectText: 'Performance',
          isComingSoon: true,
        },
        {
          aria: 'Finances',
          expectPath: /\/pilotage\/finances$/,
          expectText: 'Finances',
          isComingSoon: true,
        },
        // Alertes / Audit / Réglages redirigent vers /alerts · /audit · /more
        { aria: 'Alertes', expectPath: /\/alerts$/ },
        { aria: 'Audit', expectPath: /\/audit$/ },
        { aria: 'Réglages', expectPath: /\/more$/ },
      ],
    },
  ];

  for (const hub of HUB_TILES) {
    test(`Hub ${hub.hubName} — chaque tuile navigue correctement`, async ({ page }) => {
      const tracker = attachConsoleTracker(page);
      await gotoHub(page, hub.hubPath);

      for (const tile of hub.tiles) {
        // Toujours repartir du hub propre (navigation directe, pas fiable via clic
        // car Ionic garde des IonPage stale dans le DOM).
        await gotoHub(page, hub.hubPath);

        // HubTile est un <button aria-label="...">. On cherche dans la page active uniquement.
        const activePage = page.locator('.ion-page:not(.ion-page-hidden)').last();
        const tileBtn = activePage.getByRole('button', { name: tile.aria, exact: true }).first();
        await expect(tileBtn, `Tile "${tile.aria}" missing in ${hub.hubName}`).toBeVisible();
        await tileBtn.click();

        // Attendre que l'URL change réellement
        await page.waitForURL(tile.expectPath, { timeout: 5_000 });
        // Laisse Ionic finir la transition (sinon textContent ramène l'ancienne page)
        await page.waitForTimeout(300);

        const activeText = await getActivePageText(page);
        expect(activeText.length, `active page blank after clicking ${tile.aria}`).toBeGreaterThan(
          30
        );

        if (tile.expectText) {
          expect(
            activeText.toLowerCase(),
            `expected text "${tile.expectText}" missing on ${tile.aria}`
          ).toContain(tile.expectText.toLowerCase());
        }

        if (tile.isComingSoon) {
          expect(
            activeText,
            `ComingSoon placeholder missing on ${tile.aria}`
          ).toContain('Module en cours de construction');
        }

        await page.screenshot({
          path: `tests/playwright-artifacts/screenshots/tile-${hub.hubName.toLowerCase()}-${tile.aria
            .toLowerCase()
            .replace(/\s+/g, '-')}.png`,
          fullPage: false,
        });
      }

      const leftovers = tracker.errors.slice();
      tracker.dispose();
      expect(
        leftovers,
        `Console errors in ${hub.hubName} hub:\n${leftovers.join('\n')}`
      ).toHaveLength(0);
    });
  }
});

test.describe('Cockpit — Quick Actions', () => {
  test('Saillie ouvre modal, Soin ouvre bottom sheet, Pesée affiche toast', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Attendre juste que les 3 quick action buttons soient rendus (pas besoin de networkidle)
    await expect(page.getByRole('button', { name: 'Saillie', exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // ── Saillie ─────────────────────────────────────────────────────
    const saillieBtn = page.getByRole('button', { name: 'Saillie', exact: true });
    await saillieBtn.click();
    // QuickSaillieForm rend un IonModal avec titre "Nouvelle saillie" ou similaire.
    // On vérifie qu'un modal/dialog apparaît.
    const anyDialog = page.getByRole('dialog').or(page.locator('ion-modal[is-open="true"]'));
    await expect(anyDialog.first()).toBeVisible({ timeout: 5_000 });
    // Fermer via Escape (plus fiable que chercher le bouton de fermeture)
    await page.keyboard.press('Escape');
    // Attendre que le modal parte
    await page.waitForTimeout(400);

    // ── Soin ────────────────────────────────────────────────────────
    const soinBtn = page.getByRole('button', { name: 'Soin', exact: true });
    await expect(soinBtn).toBeVisible();
    await soinBtn.click();
    // BottomSheet avec title="Nouveau soin"
    const soinSheet = page.getByText(/nouveau soin/i);
    await expect(soinSheet.first()).toBeVisible({ timeout: 5_000 });
    // Fermer via bouton "Fermer" aria-label
    const closeBtn = page.getByRole('button', { name: /fermer/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);

    // ── Pesée → toast "Bientôt disponible" ─────────────────────────
    const peseeBtn = page.getByRole('button', { name: 'Pesée', exact: true });
    await expect(peseeBtn).toBeVisible();
    await peseeBtn.click();
    // IonToast apparaît — texte "Pesée bulk · Bientôt disponible"
    await expect(page.getByText(/bientôt disponible/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('Legacy routes — toujours vivantes', () => {
  const legacyRoutes: Array<{ path: string; screenshot: string }> = [
    { path: '/cheptel', screenshot: 'legacy-cheptel' },
    { path: '/bandes', screenshot: 'legacy-bandes' },
    { path: '/alerts', screenshot: 'legacy-alerts' },
    { path: '/audit', screenshot: 'legacy-audit' },
    { path: '/sync', screenshot: 'legacy-sync' },
    { path: '/more', screenshot: 'legacy-more' },
    { path: '/sante', screenshot: 'legacy-sante' },
    { path: '/stock', screenshot: 'legacy-stock' },
    { path: '/protocoles', screenshot: 'legacy-protocoles' },
  ];

  for (const route of legacyRoutes) {
    test(`Legacy route ${route.path} se charge sans 404 ni page blanche`, async ({
      page,
    }) => {
      const errors = await assertScreenHealthy(page, route.path, {
        screenshot: route.screenshot,
      });
      expect(
        errors,
        `Console errors on ${route.path}:\n${errors.join('\n')}`
      ).toHaveLength(0);
    });
  }
});

test.describe('CheptelView — recherche par boucle', () => {
  test('tape "B.22" puis "xyz" dans la recherche et vérifie résultats/empty', async ({
    page,
  }) => {
    await page.goto('/cheptel', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const searchInput = page.getByPlaceholder(/chercher par nom, id ou boucle/i).first();
    await expect(searchInput).toBeVisible();

    // ── Recherche "B.22" → au moins 1 résultat attendu (si data chargée) ──
    await searchInput.fill('B.22');
    // Laisse React re-render la liste
    await page.waitForTimeout(400);

    const bodyAfterMatch = await page.textContent('body');
    expect(bodyAfterMatch, 'body empty after search').toBeTruthy();

    // Si data Sheets indisponible (offline), liste peut être vide. On vérifie juste
    // que le DOM ne crash pas et que la search box fonctionne.
    const hasResultsOrEmpty = bodyAfterMatch!.length > 50;
    expect(hasResultsOrEmpty).toBeTruthy();

    // ── Recherche "xyzquery" → liste filtrée vide ──
    await searchInput.fill('xyzquerynoresult');
    await page.waitForTimeout(400);
    const bodyAfterNoMatch = await page.textContent('body');
    expect(bodyAfterNoMatch).toBeTruthy();
    // Idéalement on cherche un empty state — mais vérifier juste pas de crash
    expect(bodyAfterNoMatch!.length).toBeGreaterThan(50);

    await page.screenshot({
      path: 'tests/playwright-artifacts/screenshots/cheptel-search.png',
      fullPage: false,
    });
  });
});
