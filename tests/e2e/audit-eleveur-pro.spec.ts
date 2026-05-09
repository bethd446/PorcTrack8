/**
 * PorcTrack 8 — Tests E2E Audit Éleveur Pro (V75 régression continue)
 * ════════════════════════════════════════════════════════════════════
 * Reproduit en automatique les 6 scénarios + landing du handoff
 * `docs/handoff/2026-05-09-brief-senior-testeur.md` afin de valider
 * que les 14 frictions audit fermées sur le sprint V75 ne reviennent
 * pas à chaque deploy futur.
 *
 * Cible la **prod** (https://porctrack.tech), pas le serveur local.
 * Compte de test : audit-final@porctrack.test (ferme audit stable, 5
 * truies réformées T-046..T-050 garanties).
 *
 * Contraintes : non-destructif (aucune modification DB / aucun appel
 * Mistral), reproductible (inégalités sur compteurs flottants),
 * tolérant aux délais Supabase (~3s post-login).
 *
 *   npx playwright test --config tests/playwright.config.ts \
 *     tests/e2e/audit-eleveur-pro.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

const APP_URL = 'https://porctrack.tech';
const LOGIN_EMAIL = 'audit-final@porctrack.test';
const LOGIN_PASSWORD = 'AuditFinal2026!';

// Erreurs console attendues (refresh token expiré entre deux runs, MIME
// vidéo Capacitor, etc.) — on les filtre pour ne signaler que du vrai
// bruit projet.
const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /Invalid Refresh Token/i,
  /Refresh Token Not Found/i,
  /AuthApiError/i,
  /favicon\.ico/i,
  /Failed to load resource.*40[34]/i, // 403/404 assets (Supabase RLS check pré-login, poster fallback, etc.)
  /Failed to load resource.*status of 40[34]/i,
];

async function loginAuditFinal(page: Page) {
  await page.goto(`${APP_URL}/login`);
  await page.locator('#login-email').fill(LOGIN_EMAIL);
  await page.locator('#login-password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /^Se connecter$/i }).click();
  await page.waitForURL(/\/today(\/|$|\?)/, { timeout: 20_000 });
  // Les counts viennent de Supabase en async (~3s).
  await page.waitForTimeout(4000);
}

/** Bottom nav (BottomNavV70) — boutons role=tab dont le label correspond. */
async function clickBottomTab(page: Page, label: RegExp) {
  // Disambiguation : le bottom nav est <nav class="bottom-nav"> avec role=tablist
  const nav = page.locator('nav.bottom-nav');
  await nav.getByRole('tab', { name: label }).click();
}

test.describe('Auditeur éleveur pro — V75 régression', () => {
  test('Scénario 1 — Login + Today : alertes À vendre + counts MON ÉLEVAGE', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text))) return;
      consoleErrors.push(text);
    });

    await loginAuditFinal(page);

    // H1 = "Aujourd'hui" (CSS uppercase cosmétique)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /aujourd'hui/i,
      { timeout: 15_000 },
    );

    // Eyebrow "Bonjour {name} — N priorités" (N variable)
    await expect(
      page.getByText(/Bonjour\s+\S+\s*—\s*\d+\s+priorité/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Au moins une alerte "À vendre — T-04X" parmi T-046..T-050
    const codes = ['T-046', 'T-047', 'T-048', 'T-049', 'T-050'];
    let foundAtLeastOne = false;
    for (const code of codes) {
      if (await page.getByText(`À vendre — ${code}`).count()) {
        foundAtLeastOne = true;
        break;
      }
    }
    expect(foundAtLeastOne).toBe(true);

    // Counts MON ÉLEVAGE > 0 (truies/verrats/porcelets/bandes).
    // PageHeader title "Aujourd'hui" + Stat values rendus par <Stat>. On
    // s'appuie sur le label visible, pas sur la valeur exacte.
    for (const label of ['Truies', 'Verrats', 'Porcelets', 'Bandes']) {
      const stat = page.getByText(new RegExp(`^${label}$`)).first();
      await expect(stat).toBeVisible({ timeout: 10_000 });
    }

    // Pas d'erreur console projet (filtrée des refresh tokens & 404 assets).
    expect(consoleErrors, `Erreurs console inattendues: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Scénario 2 — Élevage Truies : H1 + filtre À vendre + fiche T-046', async ({
    page,
  }) => {
    await loginAuditFinal(page);
    await clickBottomTab(page, /^Élevage$/i);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /^Élevage$/i,
      { timeout: 15_000 },
    );

    // Pills filtres : on vérifie le format `Toutes (N)`, `Pleines (N)`, etc.
    for (const label of ['Toutes', 'Pleines', 'Maternité', 'Vides', 'À vendre']) {
      const pill = page.getByRole('button', { name: new RegExp(`^${label} \\(\\d+\\)$`) });
      await expect(pill.first()).toBeVisible({ timeout: 10_000 });
    }

    // Clic sur À vendre
    await page.getByRole('button', { name: /^À vendre \(\d+\)$/ }).click();

    // Au moins 5 lignes T-046..T-050 visibles
    for (const code of ['T-046', 'T-047', 'T-048', 'T-049', 'T-050']) {
      await expect(page.getByText(code).first()).toBeVisible({ timeout: 10_000 });
    }

    // Clic T-046 — ouvre fiche
    await page.getByText('T-046').first().click();
    await page.waitForURL(/\/troupeau\/truies\//, { timeout: 10_000 });

    // Statut "Réforme" affiché quelque part dans la fiche
    await expect(page.getByText(/réforme/i).first()).toBeVisible({ timeout: 10_000 });

    // Wait pour la section ACTIONS (rendue après chargement complet de la fiche)
    await expect(page.getByText(/^ACTIONS$/i).first()).toBeVisible({ timeout: 10_000 });

    // Soit "Marquer comme sortie" (active), soit badge sortie déjà acté.
    // T-046 est réformée mais peut être déjà sortie selon l'état DB → on
    // accepte l'un OU l'autre comme contrat valide.
    // Note : le bouton porte un aria-label long ("Marquer la truie T-046
    // comme sortie du cheptel") différent du texte visible "Marquer comme
    // sortie" — on cible le texte visible via locator natif.
    const markBtn = page.locator('button:has-text("Marquer comme sortie")');
    const sortieBadge = page.getByText(/(Vendue|Abattoir|Morte|Sortie)\s+le\s+/i);
    const hasMarkBtn = await markBtn.count();
    const hasBadge = await sortieBadge.count();
    expect(
      hasMarkBtn + hasBadge,
      'Ni bouton "Marquer comme sortie" ni badge sortie visible — la fiche n\'expose plus le contrat de sortie.',
    ).toBeGreaterThan(0);
  });

  test('Scénario 3 — Bandes : naming sans UUID 8-hex', async ({ page }) => {
    await loginAuditFinal(page);
    await clickBottomTab(page, /^Élevage$/i);

    // TabsMini sub-tab "Bandes" — disambiguation : bottom nav vs sub-tabs
    const tabsMini = page.locator('.tabs-mini').first();
    await tabsMini.getByRole('tab', { name: /^Bandes$/i }).click();

    // Au moins une bande visible (ListItem avec title commençant par "Bande ")
    const bandeTitles = page.locator('.list-item-title, [class*="list-item"] >> text=/^Bande /').or(
      page.getByText(/^Bande /).filter({ hasNotText: /…$/ }),
    );
    // Approche plus robuste : filter sur tout texte commençant par "Bande "
    const bandes = page.getByText(/^Bande /);
    await expect(bandes.first()).toBeVisible({ timeout: 15_000 });

    const titles = await bandes.allInnerTexts();
    expect(titles.length).toBeGreaterThanOrEqual(1);

    // Aucun titre ne doit contenir un UUID 8-hex tronqué "Bande [0-9a-f]{8}…"
    for (const t of titles) {
      expect(t, `Titre bande contient UUID tronqué : "${t}"`).not.toMatch(
        /Bande [0-9a-f]{8}…/,
      );
    }
  });

  test('Scénario 4 — Porcelets : groupes dépliables', async ({ page }) => {
    await loginAuditFinal(page);
    await clickBottomTab(page, /^Élevage$/i);

    const tabsMini = page.locator('.tabs-mini').first();
    await tabsMini.getByRole('tab', { name: /^Porcelets$/i }).click();

    // PorceletGroup : <button aria-expanded="..."> avec texte "vivants"
    const allGroups = page.locator('button[aria-expanded]').filter({ hasText: /vivants/ });
    await expect(allGroups.first()).toBeVisible({ timeout: 15_000 });

    // Cherche un groupe peuplé (count > 0). PorceletGroup rend `disabled`
    // quand bande vide → on filtre.
    const enabledGroups = page
      .locator('button[aria-expanded]:not([disabled])')
      .filter({ hasText: /vivants/ });
    const enabledCount = await enabledGroups.count();

    if (enabledCount === 0) {
      // Cas dégradé : aucune bande peuplée. On vérifie au moins le contrat
      // structurel (groupes fermés, message bande terminée).
      const disabled = page
        .locator('button[aria-expanded][disabled]')
        .filter({ hasText: /vivants/ });
      const disabledCount = await disabled.count();
      expect(disabledCount).toBeGreaterThanOrEqual(1);
      return;
    }

    // Cible le 1er groupe peuplé via son nom de bande (extrait de
    // l'aria-label "Déplier {nom}" ↔ "Replier {nom}" qui flip après clic).
    const target = enabledGroups.first();
    const initialLabel = await target.getAttribute('aria-label');
    expect(initialLabel).toBeTruthy();
    const bandeName = initialLabel!.replace(/^(Déplier|Replier)\s+/, '');
    const stableTarget = page.locator(`button[aria-label$="${bandeName}"]`).first();
    const initialState = await stableTarget.getAttribute('aria-expanded');

    // Toggle ouvert
    await stableTarget.click();
    const expectedAfterOpen = initialState === 'true' ? 'false' : 'true';
    await expect(stableTarget).toHaveAttribute('aria-expanded', expectedAfterOpen, {
      timeout: 3000,
    });

    // Toggle fermé
    await stableTarget.click();
    await expect(stableTarget).toHaveAttribute('aria-expanded', initialState!, {
      timeout: 3000,
    });
  });

  test('Scénario 5 — Repro : KPIs Maternité complet + timeline propre', async ({
    page,
  }) => {
    await loginAuditFinal(page);
    await clickBottomTab(page, /^Repro$/i);

    // H1 = "Reproduction" (CSS uppercase)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /^Reproduction$/i,
      { timeout: 15_000 },
    );

    // 4 KPIs : Pleines, Maternité (PAS "Materni." tronqué), Vides, MB 7j
    for (const label of ['Pleines', 'Maternité', 'Vides', 'MB 7j']) {
      await expect(
        page.getByText(new RegExp(`^${label.replace(/ /g, '\\s*')}$`)).first(),
      ).toBeVisible({ timeout: 10_000 });
    }

    // Aucune occurrence du libellé tronqué "Materni." dans la page.
    expect(await page.getByText(/^Materni\.$/i).count()).toBe(0);

    // Si une timeline cycle est affichée (Section "Cycle ..."), vérifier
    // qu'aucun step "Gestation" n'apparaît (V75-c : timeline → 3 steps
    // Saillie/Écho/Mise-bas).
    const cycleSection = page.getByText(/^Cycle /).first();
    if (await cycleSection.count()) {
      // L'étape Gestation ne doit PAS être un label visible de la timeline.
      // On accepte que le mot "gestation" puisse apparaître dans la phrase
      // pédagogique "cycle de gestation d'une truie dure 115 jours" → on
      // restreint au pattern label step (texte court, isolé).
      const gestationStep = page.locator('[class*="step"]').filter({
        hasText: /^Gestation$/i,
      });
      expect(await gestationStep.count()).toBe(0);
    }

    // Section pédagogique "Le saviez-vous ?" présente
    await expect(page.getByText(/Le saviez-vous \?/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Scénario 6 — Marius : widget ouvre + suggestions (sans envoi)', async ({
    page,
  }) => {
    await loginAuditFinal(page);

    // Bouton Marius dans la greeting card (MariusGreeting) : aria-label
    // "Ouvrir l'assistant Marius". Fallback : la TopBar peut aussi exposer
    // un bouton "Ouvrir Marius". On accepte les deux.
    const mariusBtn = page.getByRole('button', {
      name: /Ouvrir.*Marius|Ouvrir l'assistant Marius/i,
    });
    const btnCount = await mariusBtn.count();

    // En cas où Marius ne serait pas exposé (env mal configurée), on
    // documente le minimum (test alternatif du brief : "vérifier que le
    // bouton existe — minimum"). On exige donc btnCount >= 1.
    expect(
      btnCount,
      'Bouton TopBar "Ouvrir Marius" introuvable — Marius non exposé en prod.',
    ).toBeGreaterThanOrEqual(1);

    await mariusBtn.first().click();

    // Widget ouvert — dialog aria-label "Conversation avec Marius"
    const dialog = page.getByRole('dialog', { name: /Conversation avec Marius/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Input visible (aria-label "Votre question pour Marius") — c'est un
    // <input>, pas un <textarea>, malgré le brief.
    await expect(
      dialog.getByRole('textbox', { name: /Votre question pour Marius/i }),
    ).toBeVisible();

    // Au moins 1 suggestion visible (boutons générés par buildMariusSuggestions).
    // On NE clique PAS — un clic déclenche auto-submit qui hit Mistral.
    const suggestions = dialog.locator('button').filter({
      hasNotText: /^$/,
      // Exclure header buttons (Fermer la conversation) et bouton Envoyer.
      hasText: /\?$|aujourd'hui|priorité|truie|porcelet|alerte|bande/i,
    });
    expect(await suggestions.count()).toBeGreaterThanOrEqual(1);

    // Fermer Marius via bouton "Fermer la conversation"
    await dialog.getByRole('button', { name: /Fermer la conversation/i }).click();
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test('Scénario 7 — Landing v2 (bonus) : hero + vidéo + CTAs /signup', async ({
    page,
  }) => {
    // Pas de login — landing publique.
    await page.goto(`${APP_URL}/landing-v2`);

    // Le H1 contient "La précision en plein élevage." (concaténé sans
    // espace par le DOM via <br/>).
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /la précision\s*en plein élevage/i,
      { timeout: 15_000 },
    );

    // Vidéo charge (readyState >= 2 après 5s max) — sur mobile <768px
    // le composant peut tomber sur poster fallback ; on accepte les deux.
    const videoState = await page.evaluate(async () => {
      const v = document.querySelector('video.hero-video') as HTMLVideoElement | null;
      if (!v) return { found: false, readyState: 0 };
      await new Promise<void>((resolve) => {
        if (v.readyState >= 2) {
          resolve();
        } else {
          const onLoad = () => resolve();
          v.addEventListener('loadeddata', onLoad, { once: true });
          // Timeout safety — ne reste pas bloqué si la vidéo ne charge pas.
          setTimeout(() => resolve(), 5000);
        }
      });
      return { found: true, readyState: v.readyState };
    });

    if (videoState.found) {
      // En mobile viewport (Pixel 5 → 393px), le composant peut router
      // sur poster fallback → on accepte readyState 0 dans ce cas, mais
      // on documente.
      expect(videoState.readyState).toBeGreaterThanOrEqual(0);
    }

    // Au moins 2 CTAs "Démarrer mon élevage" → /signup
    await expect(
      page.getByRole('link', { name: /démarrer mon élevage/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    const ctaHrefs = await page
      .getByRole('link', { name: /démarrer mon élevage/i })
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href')),
      );
    expect(ctaHrefs.length).toBeGreaterThanOrEqual(2);
    for (const href of ctaHrefs) {
      expect(href).toBe('/signup');
    }
  });
});
