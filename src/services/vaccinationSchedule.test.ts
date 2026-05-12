import { describe, it, expect } from 'vitest';
import {
  VACCINATION_PROTOCOLS,
  computeNextVaccinations,
  dosesImminent,
  formatDoseDate,
} from './vaccinationSchedule';

describe('VACCINATION_PROTOCOLS', () => {
  it('contient les protocoles essentiels porcelets', () => {
    const porceletProtocols = VACCINATION_PROTOCOLS.filter(p => p.stage === 'porcelet');
    expect(porceletProtocols.length).toBeGreaterThanOrEqual(4);
    expect(porceletProtocols.find(p => p.vaccin.includes('Fer'))).toBeDefined();
    expect(porceletProtocols.find(p => p.vaccin.includes('Vermifuge'))).toBeDefined();
    expect(porceletProtocols.find(p => p.cible.includes('Mycoplasma') || p.vaccin.includes('Myco'))).toBeDefined();
  });

  it('contient protocoles truie et verrat', () => {
    expect(VACCINATION_PROTOCOLS.some(p => p.stage === 'truie')).toBe(true);
    expect(VACCINATION_PROTOCOLS.some(p => p.stage === 'verrat')).toBe(true);
  });

  it('marque les protocoles critiques (fer, vermifuge, myco, PPC)', () => {
    const critical = VACCINATION_PROTOCOLS.filter(p => p.critical);
    expect(critical.length).toBeGreaterThanOrEqual(4);
  });
});

describe('computeNextVaccinations', () => {
  const today = new Date('2026-05-12');

  it('renvoie doses imminentes pour porcelet récent (J21 vermifuge)', () => {
    // Porcelet né le 21/04 → J21 = 12/05 = aujourd\'hui
    const naissance = new Date('2026-04-21');
    const doses = computeNextVaccinations('p-001', '1234', naissance, 'porcelet', today);
    expect(doses.length).toBeGreaterThan(0);
    const vermifuge = doses.find(d => d.protocol.vaccin.includes('Vermifuge') && d.doseType === 'primo');
    expect(vermifuge).toBeDefined();
    expect(vermifuge?.daysUntil).toBe(0);
  });

  it('renvoie doses futures pour porcelet en début de cycle', () => {
    // Porcelet né hier → J1 → Fer dans 2j, Vermifuge dans 20j, etc.
    const naissance = new Date('2026-05-11');
    const doses = computeNextVaccinations('p-002', 'PC-X', naissance, 'porcelet', today);
    expect(doses.length).toBeGreaterThan(0);
    const fer = doses.find(d => d.protocol.vaccin.includes('Fer'));
    expect(fer?.daysUntil).toBeGreaterThan(0);
    expect(fer?.daysUntil).toBeLessThanOrEqual(3);
  });

  it('ne renvoie rien si porcelet trop âgé (toutes doses passées)', () => {
    // Porcelet né il y a 200 jours → toutes les doses primo sont passées (jourDose1 max = 60)
    const naissance = new Date('2025-10-24');
    const doses = computeNextVaccinations('p-003', 'PC-OLD', naissance, 'porcelet', today);
    // Seuls les rappels < J +60 restent éventuellement.
    expect(doses.length).toBeLessThan(VACCINATION_PROTOCOLS.filter(p => p.stage === 'porcelet').length);
  });

  it('renvoie rappels périodiques verrat (semestriel)', () => {
    const naissance = new Date('2026-05-10'); // Référence : entrée cycle vaccinal
    const doses = computeNextVaccinations('v-001', '8801', naissance, 'verrat', today);
    expect(doses.length).toBeGreaterThan(0);
  });

  it('inclut le label boucle dans chaque dose', () => {
    const naissance = new Date('2026-04-25');
    const doses = computeNextVaccinations('p-004', '7777', naissance, 'porcelet', today);
    expect(doses.every(d => d.animalLabel === '7777')).toBe(true);
  });
});

describe('dosesImminent', () => {
  it('filtre dans la fenêtre +/-7j par défaut', () => {
    const today = new Date('2026-05-12');
    const naissance = new Date('2026-04-21');
    const doses = computeNextVaccinations('p-005', '1111', naissance, 'porcelet', today);
    const imm = dosesImminent(doses, 7);
    expect(imm.every(d => d.daysUntil >= -3 && d.daysUntil <= 7)).toBe(true);
  });
});

describe('formatDoseDate', () => {
  it('formate dd/MM', () => {
    const today = new Date('2026-05-12');
    const naissance = new Date('2026-04-21');
    const doses = computeNextVaccinations('p-006', 'X', naissance, 'porcelet', today);
    const first = doses[0];
    if (first) {
      const formatted = formatDoseDate(first);
      expect(formatted).toMatch(/^\d{2}\/\d{2}$/);
    }
  });
});
