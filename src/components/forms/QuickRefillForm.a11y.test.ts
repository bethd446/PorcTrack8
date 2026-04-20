/**
 * Tests a11y — QuickRefillForm
 * ═══════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` sans jsdom. On valide statiquement :
 *   - L'intégration des hooks `useEscapeKey` + `useFocusFirstInput`
 *   - La présence de `aria-label` sur tous les champs (quantité, fournisseur,
 *     prix, date) + sur les actions (annuler, valider)
 *   - `aria-describedby` pour les hints + messages d'erreur
 *   - `aria-busy={saving}` sur le bouton submit
 *
 * On vérifie aussi le contrat pur de `shouldCloseOnKey`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { shouldCloseOnKey } from './useFormA11y';

const SRC = readFileSync(
  resolve(__dirname, 'QuickRefillForm.tsx'),
  'utf-8',
);

describe('QuickRefillForm · accessibilité', () => {
  it('importe les hooks a11y partagés', () => {
    expect(SRC).toMatch(/useEscapeKey/);
    expect(SRC).toMatch(/useFocusFirstInput/);
  });

  it('monte le listener Escape sur ouverture (useEscapeKey(isOpen, resetAndClose))', () => {
    expect(SRC).toMatch(/useEscapeKey\(\s*isOpen[^,]*,\s*resetAndClose\s*\)/);
  });

  it('Escape key ferme le form (contrat shouldCloseOnKey)', () => {
    expect(shouldCloseOnKey({ key: 'Escape', defaultPrevented: false })).toBe(
      true,
    );
    expect(shouldCloseOnKey({ key: 'Tab', defaultPrevented: false })).toBe(
      false,
    );
  });

  it('expose le ref focus-first sur input Quantité', () => {
    expect(SRC).toMatch(/id="refill-qty"[^]*?ref=\{firstFieldRef\}/);
  });

  it('chaque champ a un aria-label explicite', () => {
    // quantité (template literal avec unité)
    expect(SRC).toMatch(
      /id="refill-qty"[^]*?aria-label=\{`Quantité reçue en \$\{unite\}`\}/,
    );
    // fournisseur
    expect(SRC).toMatch(
      /id="refill-supplier"[^]*?aria-label="Fournisseur \(optionnel\)"/,
    );
    // prix
    expect(SRC).toMatch(
      /id="refill-price"[^]*?aria-label="Prix unitaire en FCFA \(optionnel\)"/,
    );
    // date
    expect(SRC).toMatch(
      /id="refill-date"[^]*?aria-label="Date de réception"/,
    );
    // annuler / valider
    expect(SRC).toMatch(/aria-label="Annuler le réapprovisionnement"/);
    expect(SRC).toMatch(
      /aria-label="Valider la réception du réapprovisionnement"/,
    );
  });

  it('gère aria-describedby pour hints + erreurs', () => {
    expect(SRC).toMatch(/id="refill-qty-hint"/);
    expect(SRC).toMatch(/id="refill-qty-error"/);
    expect(SRC).toMatch(/id="refill-price-error"/);
    expect(SRC).toMatch(/id="refill-date-error"/);
    // Quantité : branche error → hint
    expect(SRC).toMatch(
      /errors\.quantite \? 'refill-qty-error' : 'refill-qty-hint'/,
    );
  });

  it('marque les champs invalides via aria-invalid', () => {
    expect(SRC).toMatch(/aria-invalid=\{!!errors\.quantite\}/);
    expect(SRC).toMatch(/aria-invalid=\{!!errors\.prix\}/);
    expect(SRC).toMatch(/aria-invalid=\{!!errors\.date\}/);
  });

  it('expose aria-required sur les champs obligatoires', () => {
    // qty + date sont obligatoires (prix / fournisseur sont optionnels)
    expect(SRC).toMatch(/id="refill-qty"[^]*?aria-required="true"/);
    expect(SRC).toMatch(/id="refill-date"[^]*?aria-required="true"/);
  });

  it('submit button expose aria-busy={saving}', () => {
    expect(SRC).toMatch(/aria-busy=\{saving\}/);
  });
});
