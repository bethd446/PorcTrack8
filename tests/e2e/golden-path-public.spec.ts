/**
 * Golden path PUBLIC — Sprint B1 Vague 2
 *
 * Couvre les parcours qui ne nécessitent PAS d'authentification :
 *  - landing-v2 (hero + CTAs + ancre #marius)
 *  - /signup (validation client du formulaire, sans soumission DB)
 *
 * Aucun appel Supabase n'est déclenché : on vérifie uniquement l'état
 * `disabled` du bouton submit pour éviter de polluer la base.
 *
 * npx playwright test golden-path-public
 */

import { test, expect, type Page } from '@playwright/test';

const LANDING = '/landing-v2';
const SIGNUP = '/signup';

async function gotoLanding(page: Page) {
  await page.goto(LANDING);
  // Landing v2 est lazy-loadée — on attend le mount du hero (vidéo).
  await page.locator('video.hero-video').waitFor({ state: 'attached', timeout: 15_000 });
}

async function gotoSignup(page: Page) {
  await page.goto(SIGNUP);
  await page.locator('input#signup-email').waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('Golden path public — landing + signup form', () => {
  test('Scénario 1 : /landing-v2 affiche hero + 2 CTAs primaires + section Marius', async ({
    page,
  }) => {
    await gotoLanding(page);

    // Hero headline (texte brisé par <br/> → regex tolérante)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /la précision\s*en plein élevage/i,
    );

    // Au moins 2 CTAs primaires "Démarrer mon élevage" (hero + cta final)
    const ctaPrimary = page.getByRole('link', { name: /démarrer mon élevage/i });
    await expect(ctaPrimary.first()).toBeVisible();
    const count = await ctaPrimary.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // CTA secondaire "Voir une démo"
    await expect(page.getByRole('link', { name: /voir une démo/i })).toBeVisible();

    // Section Marius est rendue dans le DOM avec l'ancre #marius
    const mariusSection = page.locator('section#marius');
    await expect(mariusSection).toHaveCount(1);

    // L'ancre est ciblable depuis le DOM (le scroll lui-même n'est pas testé,
    // dépendant du browser ; on vérifie juste la liaison href → id)
    const demoLinkHref = await page
      .getByRole('link', { name: /voir une démo/i })
      .first()
      .getAttribute('href');
    expect(demoLinkHref).toBe('#marius');
  });

  test('Scénario 2 : /signup refuse les entrées invalides (bouton disabled)', async ({
    page,
  }) => {
    await gotoSignup(page);

    const submitBtn = page.getByRole('button', { name: /créer mon compte/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Remplissage partiel : email invalide + password trop court + pas de CGU
    await page.locator('input#signup-name').fill('Yao Test');
    await page.locator('input#signup-email').fill('pas-un-email');
    await page.locator('input#signup-password').fill('court');

    // CGU non cochée + password < 8 → bouton reste disabled
    await expect(submitBtn).toBeDisabled();

    // Coche CGU mais conditions toujours invalides (password < 8) → toujours disabled.
    // Le <input> réel est opacity:0 pointer-events:none → clic sur le <label> parent.
    await page.locator('label.checkbox-row').click();
    await expect(submitBtn).toBeDisabled();
  });

  test('Scénario 3 : /signup accepte les entrées valides (bouton enabled, sans submit)', async ({
    page,
  }) => {
    await gotoSignup(page);

    const submitBtn = page.getByRole('button', { name: /créer mon compte/i });

    await page.locator('input#signup-name').fill('Yao Kouassi');
    await page.locator('input#signup-email').fill('yao.test+playwright@porctrack.test');
    await page.locator('input#signup-password').fill('motdepasse123');

    // CGU encore non cochée → bouton disabled
    await expect(submitBtn).toBeDisabled();

    // Coche CGU → conditions remplies → bouton enabled.
    // Le <input> réel est opacity:0 pointer-events:none → clic sur le <label> parent.
    await page.locator('label.checkbox-row').click();
    await expect(submitBtn).toBeEnabled();

    // PAS de submit — on ne pollue pas Supabase. Fin du scénario.
  });
});
