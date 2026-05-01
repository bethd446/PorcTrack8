/**
 * Tests unitaires — QuickHealthForm (logique pure)
 * ═════════════════════════════════════════════════
 * Vitest tourne en mode `node`, donc on teste les helpers exportés :
 *   - buildHealthLogPayload : conversion form → Insert payload
 *   - suggestForType        : auto-suggestion dose + produit véto
 *
 * Les contrats UI critiques sont vérifiés via grep de la source (cf. dernier
 * describe) — même approche que QuickMortalityForm.
 */

import { describe, expect, it } from 'vitest';
import { buildHealthLogPayload, suggestForType } from './QuickHealthForm';

describe('buildHealthLogPayload', () => {
  it('produit un payload complet avec dose + produit (FER_J3)', () => {
    const now = new Date('2026-05-01T10:00:00.000Z');
    const payload = buildHealthLogPayload({
      subjectType: 'BANDE',
      subjectId: 'B-042',
      type: 'FER_J3',
      treatmentName: 'Fer dextran',
      dose: '1 ml',
      produitId: 'p-uuid-fer',
      notes: '  porcelets vifs  ',
      operator: 'Tester',
      now,
    });

    expect(payload).toEqual({
      code_id: `HL-${now.getTime()}`,
      animal_type: 'BANDE',
      animal_code: 'B-042',
      animal_reference: 'B-042',
      log_type: 'FER_J3',
      treatment_name: 'Fer dextran',
      notes: 'porcelets vifs',
      operator: 'Tester',
      dose_or_quantity: '1 ml',
      produit_id: 'p-uuid-fer',
    });
  });

  it('omet dose_or_quantity et produit_id si vides', () => {
    const payload = buildHealthLogPayload({
      subjectType: 'BANDE',
      subjectId: 'B-001',
      type: 'AUTRE',
      treatmentName: 'Observation',
      dose: '',
      produitId: '',
      notes: '',
      operator: 'A',
    });
    expect(payload).not.toHaveProperty('dose_or_quantity');
    expect(payload).not.toHaveProperty('produit_id');
    expect(payload.notes).toBeNull();
  });

  it('trim treatment_name et notes', () => {
    const payload = buildHealthLogPayload({
      subjectType: 'TRUIE',
      subjectId: 'T-12',
      type: 'BOITERIE',
      treatmentName: '  Boiterie patte arrière  ',
      notes: '  loge 3  ',
      operator: 'A',
    });
    expect(payload.treatment_name).toBe('Boiterie patte arrière');
    expect(payload.notes).toBe('loge 3');
  });
});

describe('suggestForType', () => {
  const stocks = [
    { id: 'p1', produit: 'Fer injectable Dextran', type: 'soin', usage: 'porcelet' },
    { id: 'p2', produit: 'Ivermectine 1 %', type: 'antiparasitaire', usage: 'vermifuge' },
    { id: 'p3', produit: 'Vaccin Peste Porcine', type: 'vaccin', usage: 'préventif' },
    { id: 'p4', produit: 'Antibiotique Amoxicilline', type: 'soin' },
  ];

  it('FER_J3 → match "fer" + dose 1 ml', () => {
    const r = suggestForType('FER_J3', stocks);
    expect(r.dose).toBe('1 ml');
    expect(r.produit?.id).toBe('p1');
  });

  it('VERMIFUGE → match "ivermectine" + dose 0.3 ml/kg', () => {
    const r = suggestForType('VERMIFUGE', stocks);
    expect(r.dose).toBe('0.3 ml/kg');
    expect(r.produit?.id).toBe('p2');
  });

  it('VACCIN_PESTE → match "peste" + dose 2 ml', () => {
    const r = suggestForType('VACCIN_PESTE', stocks);
    expect(r.dose).toBe('2 ml');
    expect(r.produit?.id).toBe('p3');
  });

  it('BOITERIE → pas de produit suggéré (problème santé sans tpl produit)', () => {
    const r = suggestForType('BOITERIE', stocks);
    expect(r.dose).toBe('');
    expect(r.produit).toBeNull();
  });

  it('aucun stock matchant → produit null mais dose preservée', () => {
    const r = suggestForType('VACCIN_PESTE', [
      { id: 'p1', produit: 'Aspirine' },
    ]);
    expect(r.dose).toBe('2 ml');
    expect(r.produit).toBeNull();
  });
});

// ─── Tests structurels (source-grep) ─────────────────────────────────────────
describe('QuickHealthForm · contrats UI (source-grep)', () => {
  const SRC = (() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path');
    return fs.readFileSync(
      path.resolve(__dirname, 'QuickHealthForm.tsx'),
      'utf-8',
    );
  })();

  it('utilise IonSelect avec interface="popover" (pattern Android Capacitor)', () => {
    expect(SRC).toMatch(/<IonSelect\b/);
    expect(SRC).toMatch(/interface="popover"/);
    expect(SRC).not.toMatch(/<select\s/);
  });

  it('expose un picker de produit véto à côté du champ dose', () => {
    expect(SRC).toMatch(/Produit véto/);
    expect(SRC).toMatch(/Dose \/ quantité/);
  });

  it('insertHealthLog est appelé avec log_type strict (enum)', () => {
    expect(SRC).toMatch(/log_type:\s*formData\.type/);
  });

  it('réinitialise dose / treatmentName / produitId au changement de type', () => {
    // Preserve l'auto-suggestion fraîche.
    expect(SRC).toMatch(/dose:\s*''/);
    expect(SRC).toMatch(/treatmentName:\s*''/);
    expect(SRC).toMatch(/produitId:\s*''/);
  });
});
