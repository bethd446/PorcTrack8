/**
 * Tests a11y — QuickEditTruieForm
 * ═══════════════════════════════════════════════════════════════════════════
 * Mêmes contraintes que les autres suites a11y : Vitest tourne en `node`,
 * pas de jsdom. On vérifie donc statiquement la présence des attributs
 * `aria-*` et l'intégration du hook `useFocusFirstInput`, plus le contrat
 * pur de la fonction `shouldCloseOnKey`.
 *
 * FORM_CONTRACT : le form a été migré vers le shell `<QuickActionSheet>`.
 * `useEscapeKey` et `aria-busy` du bouton submit sont désormais câblés PAR
 * le shell — le form ne les porte plus lui-même. Les assertions
 * correspondantes ciblent donc QuickActionSheet (`submitAriaLabel`).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { shouldCloseOnKey } from './useFormA11y';

const SRC = readFileSync(
  resolve(__dirname, 'QuickEditTruieForm.tsx'),
  'utf-8',
);

const SHELL = readFileSync(
  resolve(__dirname, 'QuickActionSheet.tsx'),
  'utf-8',
);

describe('QuickEditTruieForm · accessibilité', () => {
  it('utilise le shell QuickActionSheet + le hook focus-first', () => {
    expect(SRC).toMatch(/QuickActionSheet/);
    expect(SRC).toMatch(/useFocusFirstInput/);
  });

  it('le shell QuickActionSheet câble le listener Escape', () => {
    expect(SHELL).toMatch(/useEscapeKey\(\s*isOpen\s*&&\s*!saving\s*,\s*onClose\s*\)/);
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
    // submit : aria-label transmis au shell via submitAriaLabel
    expect(SRC).toMatch(
      /submitAriaLabel="Enregistrer les modifications de la truie"/,
    );
    // le shell rend le bouton Annuler avec son aria-label
    expect(SHELL).toMatch(/aria-label="Annuler et fermer"/);
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

  it('le shell expose aria-busy sur le bouton submit', () => {
    expect(SHELL).toMatch(/aria-busy=\{saving\}/);
  });
});
