/**
 * Tests a11y — QuickMortalityForm
 * ═══════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` sans jsdom : on ne peut pas monter le composant
 * (IonModal a besoin du DOM Ionic). On vérifie donc deux choses :
 *
 *   1. La source du composant importe bien `useEscapeKey` + `useFocusFirstInput`
 *      et expose `aria-label` / `aria-busy` / `aria-describedby` sur les
 *      éléments interactifs attendus. C'est une garantie statique utile
 *      (un refactor qui retirerait un aria-label ferait sauter le test).
 *
 *   2. La fonction pure `shouldCloseOnKey` utilisée par `useEscapeKey` ferme
 *      bien sur `Escape` — confirmation contractuelle côté form.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { shouldCloseOnKey } from './useFormA11y';

const SRC = readFileSync(
  resolve(__dirname, 'QuickMortalityForm.tsx'),
  'utf-8',
);

describe('QuickMortalityForm · accessibilité', () => {
  it('importe les hooks a11y partagés (useEscapeKey + useFocusFirstInput)', () => {
    expect(SRC).toMatch(/useEscapeKey/);
    expect(SRC).toMatch(/useFocusFirstInput/);
  });

  it('monte le listener Escape sur ouverture (useEscapeKey(isOpen, handleClose))', () => {
    // Le hook doit être appelé avec un booléen dépendant de isOpen
    expect(SRC).toMatch(/useEscapeKey\(\s*isOpen[^,]*,\s*handleClose\s*\)/);
  });

  it('Escape key ferme le form (contrat shouldCloseOnKey)', () => {
    expect(shouldCloseOnKey({ key: 'Escape', defaultPrevented: false })).toBe(
      true,
    );
  });

  it('expose le ref focus-first sur le select bande', () => {
    expect(SRC).toMatch(/id="mortality-bande"[^]*?ref=\{firstFieldRef\}/);
  });

  it('chaque champ a un aria-label explicite', () => {
    // select bande
    expect(SRC).toMatch(
      /id="mortality-bande"[^]*?aria-label="Sélectionner la bande/,
    );
    // input count
    expect(SRC).toMatch(
      /id="mortality-count"[^]*?aria-label="Nombre de porcelets morts/,
    );
    // textarea observation
    expect(SRC).toMatch(
      /id="mortality-obs"[^]*?aria-label="Observation sur la mortalité/,
    );
    // boutons − / +
    expect(SRC).toMatch(/aria-label="Diminuer le nombre de morts"/);
    expect(SRC).toMatch(/aria-label="Augmenter le nombre de morts"/);
    // submit
    expect(SRC).toMatch(/aria-label="Enregistrer la mortalité"/);
  });

  it('expose aria-describedby sur input count + textarea', () => {
    expect(SRC).toMatch(/aria-describedby="mortality-count-hint"/);
    expect(SRC).toMatch(/aria-describedby="mortality-obs-hint"/);
    expect(SRC).toMatch(/id="mortality-count-hint"/);
    expect(SRC).toMatch(/id="mortality-obs-hint"/);
  });

  it('pointe vers mortality-error quand la validation échoue (aria-describedby conditionnel)', () => {
    expect(SRC).toMatch(/mortality-error/);
  });

  it('submit button expose aria-busy={saving}', () => {
    // Le bouton submit doit refléter son état loading pour les lecteurs d'écran
    expect(SRC).toMatch(/aria-busy=\{saving\}/);
  });
});
