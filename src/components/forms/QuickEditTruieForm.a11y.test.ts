/**
 * Tests a11y — QuickEditTruieForm
 * ═══════════════════════════════════════════════════════════════════════════
 * Mêmes contraintes que les autres suites a11y : Vitest tourne en `node`,
 * pas de jsdom. On vérifie donc statiquement la présence des attributs
 * `aria-*` et l'intégration des hooks `useEscapeKey` + `useFocusFirstInput`,
 * plus le contrat pur de la fonction `shouldCloseOnKey`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { shouldCloseOnKey } from './useFormA11y';

const SRC = readFileSync(
  resolve(__dirname, 'QuickEditTruieForm.tsx'),
  'utf-8',
);

describe('QuickEditTruieForm · accessibilité', () => {
  it('importe les hooks a11y partagés', () => {
    expect(SRC).toMatch(/useEscapeKey/);
    expect(SRC).toMatch(/useFocusFirstInput/);
  });

  it('monte le listener Escape sur ouverture (useEscapeKey(isOpen, handleClose))', () => {
    expect(SRC).toMatch(/useEscapeKey\(\s*isOpen[^,]*,\s*handleClose\s*\)/);
  });

  it('Escape key ferme le form (contrat shouldCloseOnKey)', () => {
    expect(shouldCloseOnKey({ key: 'Escape', defaultPrevented: false })).toBe(
      true,
    );
    expect(shouldCloseOnKey({ key: 'Enter', defaultPrevented: false })).toBe(
      false,
    );
  });

  it('expose le ref focus-first sur input Nom', () => {
    expect(SRC).toMatch(/id="edit-truie-nom"[^]*?ref=\{firstFieldRef\}/);
  });

  it('chaque champ a un aria-label explicite', () => {
    // nom — template literal avec `${displayId}`, on matche le début
    expect(SRC).toMatch(/id="edit-truie-nom"[^]*?aria-label=\{`Nom de la truie/);
    // ration
    expect(SRC).toMatch(
      /id="edit-truie-ration"[^]*?aria-label="Ration alimentaire en kilogrammes par jour"/,
    );
    // annuler / submit
    expect(SRC).toMatch(/aria-label="Annuler et fermer"/);
    expect(SRC).toMatch(
      /aria-label="Enregistrer les modifications de la truie"/,
    );
  });

  it('gère aria-describedby pour hint + error sur les deux champs', () => {
    expect(SRC).toMatch(/id="edit-truie-nom-hint"/);
    expect(SRC).toMatch(/id="edit-truie-nom-error"/);
    expect(SRC).toMatch(/id="edit-truie-ration-hint"/);
    expect(SRC).toMatch(/id="edit-truie-ration-error"/);
    expect(SRC).toMatch(/errors\.nom \? 'edit-truie-nom-error' : 'edit-truie-nom-hint'/);
    expect(SRC).toMatch(
      /errors\.ration[\s\S]*?'edit-truie-ration-error'[\s\S]*?'edit-truie-ration-hint'/,
    );
  });

  it('marque les champs invalides via aria-invalid', () => {
    expect(SRC).toMatch(/aria-invalid=\{!!errors\.nom\}/);
    expect(SRC).toMatch(/aria-invalid=\{!!errors\.ration\}/);
  });

  it('submit button expose aria-busy={saving}', () => {
    expect(SRC).toMatch(/aria-busy=\{saving\}/);
  });
});
