/**
 * Tests unitaires — QuickAddFournisseurForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 *
 * Couvre :
 *  [1] normalizeWhatsAppNumber : digits-only + préfixe + cas trop court.
 *  [2] validateAddFournisseur : nom obligatoire, email format, type optionnel.
 *  [3] buildFournisseurOrderURL : message FR pré-rempli + encodeURIComponent.
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeWhatsAppNumber,
  validateAddFournisseur,
  buildFournisseurOrderURL,
  FOURNISSEUR_TYPES,
} from './quickAddFournisseurLogic';

describe('[1] normalizeWhatsAppNumber', () => {
  it('garde le préfixe + et les digits', () => {
    expect(normalizeWhatsAppNumber('+225 07 00 00 00')).toBe('+22507000000');
  });

  it('ajoute + si absent et longueur ≥ 8', () => {
    expect(normalizeWhatsAppNumber('07 00 00 00')).toBe('+07000000');
  });

  it('null si longueur insuffisante', () => {
    expect(normalizeWhatsAppNumber('1234')).toBe(null);
    expect(normalizeWhatsAppNumber('')).toBe(null);
  });
});

describe('[2] validateAddFournisseur', () => {
  it('rejette nom vide', () => {
    const r = validateAddFournisseur({
      nom: '   ',
      type: 'ALIMENT',
      whatsappNumber: '',
      email: '',
      notes: '',
      isDefault: false,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.nom).toBeTruthy();
  });

  it('accepte payload minimal valide (nom seul)', () => {
    const r = validateAddFournisseur({
      nom: 'ProvAlim',
      type: '',
      whatsappNumber: '',
      email: '',
      notes: '',
      isDefault: false,
    });
    expect(r.ok).toBe(true);
    expect(r.payload).toEqual({
      nom: 'ProvAlim',
      type: null,
      whatsapp_number: null,
      email: null,
      notes: null,
      is_default: false,
    });
  });

  it('rejette email format invalide mais accepte vide', () => {
    const bad = validateAddFournisseur({
      nom: 'X',
      type: 'ALIMENT',
      whatsappNumber: '',
      email: 'pas-un-email',
      notes: '',
      isDefault: false,
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.email).toBeTruthy();
  });

  it('expose les types FOURNISSEUR_TYPES', () => {
    expect(FOURNISSEUR_TYPES).toEqual(['ALIMENT', 'PHARMACIE', 'GENETIQUE', 'AUTRE']);
  });
});

describe('[3] buildFournisseurOrderURL', () => {
  it('null si numéro WhatsApp absent ou trop court', () => {
    expect(
      buildFournisseurOrderURL({
        fournisseurNom: 'ProvAlim',
        whatsappNumber: null,
        produit: 'Maïs',
        qteKg: 100,
      }),
    ).toBe(null);
    expect(
      buildFournisseurOrderURL({
        fournisseurNom: 'ProvAlim',
        whatsappNumber: '+1',
        produit: 'Maïs',
        qteKg: 100,
      }),
    ).toBe(null);
  });

  it('construit l\'URL wa.me avec message pré-rempli', () => {
    const url = buildFournisseurOrderURL({
      fournisseurNom: 'ProvAlim',
      whatsappNumber: '+2250700000000',
      produit: 'Maïs',
      qteKg: 50,
      farmName: 'Ferme A130',
    });
    expect(url).toBeTruthy();
    expect(url).toContain('https://wa.me/2250700000000');
    const decoded = decodeURIComponent((url as string).split('?text=')[1]);
    expect(decoded).toContain('Bonjour ProvAlim');
    expect(decoded).toContain('Maïs 50 kg');
    expect(decoded).toContain('Ferme A130');
  });
});
