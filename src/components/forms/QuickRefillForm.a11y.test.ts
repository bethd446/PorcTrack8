/**
 * Tests a11y — QuickRefillForm
 * ═══════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` sans jsdom. On valide statiquement la conformité
 * FORM_CONTRACT (migration Phase 2) :
 *   - Le form passe par le shell partagé `QuickActionSheet` (qui câble
 *     lui-même `useEscapeKey` + le bouton submit `aria-busy={saving}`).
 *   - Le focus auto est posé sur le premier champ via `useFocusFirstInput`.
 *   - Présence de `aria-label` sur tous les champs (quantité, fournisseur,
 *     prix, date).
 *   - Erreurs de champ rendues via `<FieldError>` (remplace les
 *     `aria-describedby` inline), `aria-invalid` conservé.
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
  it('passe par le shell partagé QuickActionSheet', () => {
    expect(SRC).toMatch(/import QuickActionSheet from '\.\/QuickActionSheet'/);
    expect(SRC).toMatch(/<QuickActionSheet/);
  });

  it('utilise le hook focus-first partagé', () => {
    expect(SRC).toMatch(/useFocusFirstInput/);
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
    // annuler / valider sont rendus par le shell QuickActionSheet ;
    // le form passe les libellés via submitLabel / submitAriaLabel
    expect(SRC).toMatch(
      /submitAriaLabel="Valider la réception du réapprovisionnement"/,
    );
  });

  it('rend les erreurs de champ via FieldError', () => {
    expect(SRC).toMatch(/import \{ FieldError \}/);
    expect(SRC).toMatch(/<FieldError message=\{errors\.quantite\}/);
    expect(SRC).toMatch(/<FieldError message=\{errors\.prix\}/);
    expect(SRC).toMatch(/<FieldError message=\{errors\.date\}/);
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

  it('délègue saving + aria-busy au shell QuickActionSheet', () => {
    // Le bouton submit (et son aria-busy={saving}) est rendu par le shell.
    expect(SRC).toMatch(/saving=\{saving\}/);
  });
});
