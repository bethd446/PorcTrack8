import { describe, expect, it } from 'vitest';
import { filterAlertsByProfile, getAlertApplicableProfiles } from './alertProfileFilter';
import type { FarmAlert } from './alertEngine';

function mkAlert(id: string): FarmAlert {
  return {
    id,
    priority: 'NORMALE',
    category: 'PLANNING',
    subjectId: 's',
    subjectLabel: 'S',
    title: 't',
    message: 'm',
    requiresAction: false,
    actions: [],
    createdAt: new Date(),
  };
}

describe('alertProfileFilter', () => {
  describe('getAlertApplicableProfiles', () => {
    it.each([
      ['MB-T01-123', ['naisseur', 'cycle_complet']],
      ['SEV-B01-456', ['naisseur', 'cycle_complet']],
      ['CHA-T02-789', ['naisseur', 'cycle_complet']],
      ['ECH-T03-111', ['naisseur', 'cycle_complet']],
      ['RSA-T04-222', ['naisseur', 'cycle_complet']],
      ['RSV-B02-M3', ['naisseur', 'cycle_complet']],
      ['REG-GLOBAL-333', ['naisseur', 'cycle_complet']],
      ['REF-T05-PERF', ['naisseur', 'cycle_complet']],
      ['ORPH-T06-P1', ['naisseur', 'cycle_complet']],
    ])('%s → naisseur + cycle_complet', (id, expected) => {
      expect(getAlertApplicableProfiles(mkAlert(id))).toEqual(expected);
    });

    it.each([
      ['phase-poids-B01-ENGRAISSEMENT', ['engraisseur', 'cycle_complet']],
      ['sortie-B02', ['engraisseur', 'cycle_complet']],
    ])('%s → engraisseur + cycle_complet', (id, expected) => {
      expect(getAlertApplicableProfiles(mkAlert(id))).toEqual(expected);
    });

    it.each([
      ['MORT-B01-25', ['naisseur', 'engraisseur', 'cycle_complet']],
      ['STK-aliment-RUPTURE', ['naisseur', 'engraisseur', 'cycle_complet']],
      ['VET-vaccins-BAS', ['naisseur', 'engraisseur', 'cycle_complet']],
      ['PES-B03-LATE', ['naisseur', 'engraisseur', 'cycle_complet']],
      ['retard-B04-phase', ['naisseur', 'engraisseur', 'cycle_complet']],
    ])('%s → toutes profils (transverse)', (id, expected) => {
      expect(getAlertApplicableProfiles(mkAlert(id))).toEqual(expected);
    });

    it('préfixe inconnu → fallback toutes profils', () => {
      expect(getAlertApplicableProfiles(mkAlert('XYZ-foo-bar'))).toEqual([
        'naisseur',
        'engraisseur',
        'cycle_complet',
      ]);
    });
  });

  describe('filterAlertsByProfile', () => {
    const alerts: FarmAlert[] = [
      mkAlert('MB-T01-1'),
      mkAlert('SEV-B01-2'),
      mkAlert('STK-aliment-3'),
      mkAlert('phase-poids-B02-FINITION'),
      mkAlert('sortie-B03'),
      mkAlert('PES-B04-LATE'),
    ];

    it('engraisseur ne voit ni MB ni SEV', () => {
      const filtered = filterAlertsByProfile(alerts, 'engraisseur');
      expect(filtered.map(a => a.id)).toEqual([
        'STK-aliment-3',
        'phase-poids-B02-FINITION',
        'sortie-B03',
        'PES-B04-LATE',
      ]);
    });

    it('naisseur ne voit ni phase-poids ni sortie', () => {
      const filtered = filterAlertsByProfile(alerts, 'naisseur');
      expect(filtered.map(a => a.id)).toEqual([
        'MB-T01-1',
        'SEV-B01-2',
        'STK-aliment-3',
        'PES-B04-LATE',
      ]);
    });

    it('cycle_complet voit tout', () => {
      const filtered = filterAlertsByProfile(alerts, 'cycle_complet');
      expect(filtered).toHaveLength(6);
    });
  });
});
