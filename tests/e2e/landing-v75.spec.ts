import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';
const LANDING = `${APP_URL}/landing-v2`;

/**
 * La landing-v2 est lazy-loadée par App.tsx (dynamic import). Avant toute
 * assertion, on attend le mount effectif du hero (présence de .hero-video).
 */
async function gotoLanding(page: import('@playwright/test').Page) {
  await page.goto(LANDING);
  await page.locator('video.hero-video').waitFor({ state: 'attached', timeout: 15_000 });
}

test.describe('Landing v75 — refonte', () => {
  test('Hero affiche headline et CTAs corrects', async ({ page }) => {
    await gotoLanding(page);
    // Le H1 contient "La précision<br/>en plein élevage." → texte concaténé
    // sans espace par le DOM. La regex tolère un espace optionnel.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /la précision\s*en plein élevage/i,
    );
    await expect(
      page.getByRole('link', { name: /démarrer mon élevage/i }).first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /voir une démo/i })).toBeVisible();
  });

  test('Aucune couleur hard-coded interdite dans le DOM rendu', async ({ page }) => {
    await gotoLanding(page);
    // var(--pt-bg) = #FAF7F0 = rgb(250, 247, 240)
    // Le wrapper de LandingScrollytelling porte un style inline overflowX:'clip'
    // → React le sérialise en `overflow-x: clip;`.
    const wrapperBg = await page.evaluate(() => {
      const el = document.querySelector(
        'div[style*="overflow-x"]',
      ) as HTMLElement | null;
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    expect(wrapperBg).toBe('rgb(250, 247, 240)');

    // No element with #0a0a0a (rgb(10, 10, 10)) background
    const blackBgCount = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('section, div, article'));
      return all.filter((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        return bg === 'rgb(10, 10, 10)';
      }).length;
    });
    expect(blackBgCount).toBe(0);
  });

  test('Vidéo hero charge et autoplay', async ({ page }) => {
    await gotoLanding(page);
    const videoState = await page.evaluate(async () => {
      const v = document.querySelector('video.hero-video') as HTMLVideoElement | null;
      if (!v) return { found: false };
      await new Promise<void>((resolve) => {
        if (v.readyState >= 2) resolve();
        else v.addEventListener('loadeddata', () => resolve(), { once: true });
      });
      await new Promise((r) => setTimeout(r, 2000));
      return {
        found: true,
        readyState: v.readyState,
        paused: v.paused,
        muted: v.muted,
        loop: v.loop,
      };
    });
    expect(videoState.found).toBe(true);
    expect(videoState.readyState).toBeGreaterThanOrEqual(2);
    expect(videoState.muted).toBe(true);
    expect(videoState.loop).toBe(true);
  });

  test('CTAs primaires lient vers /signup', async ({ page }) => {
    await gotoLanding(page);
    // S'assurer qu'au moins un CTA est rendu avant d'énumérer.
    await expect(
      page.getByRole('link', { name: /démarrer mon élevage/i }).first(),
    ).toBeVisible();
    const links = await page
      .getByRole('link', { name: /démarrer mon élevage/i })
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href')),
      );
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const href of links) {
      expect(href).toBe('/signup');
    }
  });

  test('Poster JPEG est référencé sur la vidéo hero', async ({ page }) => {
    await gotoLanding(page);
    const posterAttr = await page
      .locator('video.hero-video')
      .first()
      .getAttribute('poster');
    expect(posterAttr).toBe('/videos/landing/hero-maternity-dawn-poster.jpg');
  });
});
