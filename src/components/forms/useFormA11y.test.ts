/**
 * Tests unitaires — shouldCloseOnKey (useFormA11y)
 * ═══════════════════════════════════════════════════════════════════════════
 * Vitest tourne en `node` sans jsdom : on teste ici la fonction pure qui
 * détermine si une touche clavier doit fermer la BottomSheet (Esc).
 *
 * Les hooks `useEscapeKey` / `useFocusFirstInput` nécessitant un DOM React,
 * ils sont vérifiés indirectement par les tests a11y de chaque form (où on
 * valide aussi leur usage).
 */

import { describe, expect, it } from 'vitest';

import { shouldCloseOnKey } from './useFormA11y';

describe('shouldCloseOnKey', () => {
  it('retourne true pour Escape', () => {
    expect(shouldCloseOnKey({ key: 'Escape', defaultPrevented: false })).toBe(
      true,
    );
  });

  it('retourne true pour la variante "Esc" (anciens navigateurs)', () => {
    expect(shouldCloseOnKey({ key: 'Esc', defaultPrevented: false })).toBe(
      true,
    );
  });

  it('retourne false pour toute autre touche', () => {
    expect(shouldCloseOnKey({ key: 'Enter', defaultPrevented: false })).toBe(
      false,
    );
    expect(shouldCloseOnKey({ key: 'Tab', defaultPrevented: false })).toBe(
      false,
    );
    expect(shouldCloseOnKey({ key: 'a', defaultPrevented: false })).toBe(false);
    expect(shouldCloseOnKey({ key: ' ', defaultPrevented: false })).toBe(false);
  });

  it('retourne false si defaultPrevented (qqn a déjà consommé l\'event)', () => {
    expect(shouldCloseOnKey({ key: 'Escape', defaultPrevented: true })).toBe(
      false,
    );
  });
});
