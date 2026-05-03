/**
 * Tests unitaires — alertSubject
 * ════════════════════════════════
 * V36-A — couvre :
 *   • résolution UUID → code (truie/bande/verrat)
 *   • nettoyage du préfixe technique AUDIT-/TEST-/DEMO- (BUG-2)
 *   • détection des subjects orphelins (entité supprimée)
 */

import { describe, expect, it } from 'vitest';
import { resolveAlertSubject, isAlertSubjectOrphan, type TroupeauLookup } from './alertSubject';
import type { Truie, BandePorcelets, Verrat } from '../types/farm';

function makeTruie(id: string, displayId: string): Truie {
  return {
    id,
    displayId,
    boucle: `B-${id}`,
    statut: 'Vide',
    ration: 3,
    synced: true,
  };
}

function makeBande(id: string, idPortee: string): BandePorcelets {
  return {
    id,
    idPortee,
    statut: 'Sous mère',
    poidsInitialKg: 0,
    synced: true,
  } as BandePorcelets;
}

function makeVerrat(id: string, displayId: string): Verrat {
  return {
    id,
    displayId,
    boucle: `BV-${id}`,
    statut: 'Actif',
    ration: 3,
    synced: true,
  };
}

const lookup: TroupeauLookup = {
  truies: [makeTruie('aaaaaaaa-1111-2222-3333-444444444444', 'T-001')],
  bandes: [makeBande('bbbbbbbb-1111-2222-3333-444444444444', 'P-A1')],
  verrats: [makeVerrat('cccccccc-1111-2222-3333-444444444444', 'V-001')],
};

describe('resolveAlertSubject — V36-A préfixes techniques (BUG-2)', () => {
  it('retire AUDIT- devant un code de truie', () => {
    expect(resolveAlertSubject('Réforme suggérée — AUDIT-T-001', lookup)).toBe(
      'Réforme suggérée — T-001',
    );
  });

  it('retire TEST- et DEMO- pareillement', () => {
    expect(resolveAlertSubject('Mise-bas TEST-T-005', lookup)).toBe('Mise-bas T-005');
    expect(resolveAlertSubject('Saillie DEMO-V-009', lookup)).toBe('Saillie V-009');
  });

  it('idempotent : ne retire pas si déjà nettoyé', () => {
    expect(resolveAlertSubject('Réforme T-001', lookup)).toBe('Réforme T-001');
  });

  it('ne touche pas aux mots qui ne correspondent pas au pattern', () => {
    expect(resolveAlertSubject('Audit complet du troupeau', lookup)).toBe(
      'Audit complet du troupeau',
    );
  });

  it('combine résolution UUID et nettoyage préfixe', () => {
    const raw =
      'Réforme suggérée — AUDIT-T-001 (uuid: aaaaaaaa-1111-2222-3333-444444444444)';
    const out = resolveAlertSubject(raw, lookup);
    expect(out).toContain('T-001');
    expect(out).not.toContain('AUDIT-');
    expect(out).toContain('Truie T-001');
  });
});

describe('isAlertSubjectOrphan — V36-A (BUG-2)', () => {
  it('truie disparue → orpheline', () => {
    expect(isAlertSubjectOrphan('TX-INTROUVABLE', 'REPRO', lookup)).toBe(true);
  });

  it('truie existante (par UUID) → non orpheline', () => {
    expect(
      isAlertSubjectOrphan('aaaaaaaa-1111-2222-3333-444444444444', 'REPRO', lookup),
    ).toBe(false);
  });

  it('truie existante (par displayId) → non orpheline', () => {
    expect(isAlertSubjectOrphan('T-001', 'REPRO', lookup)).toBe(false);
  });

  it('bande disparue → orpheline', () => {
    expect(isAlertSubjectOrphan('B-INTROUVABLE', 'BANDES', lookup)).toBe(true);
  });

  it('GLOBAL ou stock → jamais orphelin', () => {
    expect(isAlertSubjectOrphan('GLOBAL', 'BANDES', lookup)).toBe(false);
    expect(isAlertSubjectOrphan('stock-123', 'STOCK', lookup)).toBe(false);
  });

  it('subjectId vide → non orphelin', () => {
    expect(isAlertSubjectOrphan('', 'REPRO', lookup)).toBe(false);
    expect(isAlertSubjectOrphan(null, 'REPRO', lookup)).toBe(false);
  });

  it('garde-fou : collection vide → ne classe rien orphelin (contexte non chargé)', () => {
    const empty: TroupeauLookup = { truies: [], bandes: [], verrats: [] };
    expect(isAlertSubjectOrphan('T-INTROUVABLE', 'REPRO', empty)).toBe(false);
    expect(isAlertSubjectOrphan('B-INTROUVABLE', 'BANDES', empty)).toBe(false);
  });
});
