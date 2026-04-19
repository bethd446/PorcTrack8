/**
 * Tests unitaires — bandesAggregator
 * ═══════════════════════════════════
 * Couvre la distinction Portées vs Loges + les comptes sous-mère / sevrés.
 */

import { describe, expect, it } from 'vitest';
import {
  filterRealPortees,
  countSousMere,
  countSevres,
  countLoges,
  countTruiesEnMaternite,
  logesMaterniteOccupation,
  logesPostSevrageOccupation,
  logesEngraissementOccupation,
  computeBandePhase,
  countBandesByPhase,
} from './bandesAggregator';
import type { BandePorcelets, BandeStatut, Truie, TruieStatut } from '../types/farm';

// ─── Fixture helper ─────────────────────────────────────────────────────────

let counter = 0;
function makeBande(statut: BandeStatut, vivants = 10): BandePorcelets {
  counter += 1;
  return {
    id: `B${counter}`,
    idPortee: `P${counter}`,
    statut,
    vivants,
    synced: true,
  };
}

let truieCounter = 0;
function makeTruie(statut: TruieStatut): Truie {
  truieCounter += 1;
  return {
    id: `T${truieCounter}`,
    displayId: `T${truieCounter}`,
    boucle: `FR${truieCounter}`,
    statut,
    ration: 0,
    synced: true,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('filterRealPortees', () => {
  it('exclut les lignes RECAP', () => {
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère'),
      makeBande('Sevrés'),
      makeBande('RECAP'),
      makeBande('Sous mère'),
    ];
    const real = filterRealPortees(bandes);
    expect(real).toHaveLength(3);
    expect(real.every(b => b.statut !== 'RECAP')).toBe(true);
  });
});

describe('countSousMere', () => {
  it('compte les portées sous mère et somme les vivants', () => {
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère', 12),
      makeBande('Sous mère', 10),
      makeBande('Sevrés', 9),
      makeBande('RECAP', 0),
    ];
    const result = countSousMere(bandes);
    expect(result.portees).toBe(2);
    expect(result.porcelets).toBe(22);
  });

  it('gère vivants undefined proprement', () => {
    const bandes: BandePorcelets[] = [
      { id: 'B', idPortee: 'P', statut: 'Sous mère', synced: true },
    ];
    const result = countSousMere(bandes);
    expect(result.portees).toBe(1);
    expect(result.porcelets).toBe(0);
  });
});

describe('countSevres', () => {
  it('compte les portées sevrées (10 portées terrain)', () => {
    const bandes: BandePorcelets[] = Array.from({ length: 10 }, () =>
      makeBande('Sevrés', 9)
    );
    bandes.push(makeBande('Sous mère', 12));
    const result = countSevres(bandes);
    expect(result.portees).toBe(10);
    expect(result.porcelets).toBe(90);
  });
});

describe('countLoges', () => {
  it("retourne 0 quand aucune portée n'est sevrée", () => {
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère'),
      makeBande('Sous mère'),
    ];
    expect(countLoges(bandes)).toBe(0);
  });

  it('cape à 4 (réalité terrain A130) quand 10 portées sont sevrées', () => {
    const bandes: BandePorcelets[] = Array.from({ length: 10 }, () =>
      makeBande('Sevrés')
    );
    expect(countLoges(bandes)).toBe(4);
  });

  it('respecte un fallbackCount custom', () => {
    const bandes: BandePorcelets[] = Array.from({ length: 6 }, () =>
      makeBande('Sevrés')
    );
    expect(countLoges(bandes, 3)).toBe(3);
    expect(countLoges(bandes, 10)).toBe(6);
  });
});

describe('countTruiesEnMaternite', () => {
  it('compte les truies en maternité (match insensible à la casse)', () => {
    const truies: Truie[] = [
      makeTruie('En maternité'),
      makeTruie('En maternité'),
      makeTruie('en maternite'),
      makeTruie('MATERNITÉ'),
      makeTruie('Pleine'),
      makeTruie('En attente saillie'),
    ];
    expect(countTruiesEnMaternite(truies)).toBe(4);
  });
});

describe('logesMaterniteOccupation', () => {
  it('retourne OK à 44% quand 4 truies occupent 9 loges', () => {
    const truies: Truie[] = [
      ...Array.from({ length: 4 }, () => makeTruie('En maternité')),
      ...Array.from({ length: 3 }, () => makeTruie('Pleine')),
    ];
    const r = logesMaterniteOccupation(truies);
    expect(r.occupees).toBe(4);
    expect(r.capacite).toBe(9);
    expect(r.tauxPct).toBe(44);
    expect(r.alerte).toBe('OK');
  });

  it('retourne HIGH à 89% quand 8 truies occupent 9 loges', () => {
    const truies: Truie[] = Array.from({ length: 8 }, () =>
      makeTruie('En maternité')
    );
    const r = logesMaterniteOccupation(truies);
    expect(r.occupees).toBe(8);
    expect(r.capacite).toBe(9);
    expect(r.tauxPct).toBe(89);
    expect(r.alerte).toBe('HIGH');
  });

  it('retourne FULL à 100% quand 9 truies saturent les 9 loges', () => {
    const truies: Truie[] = Array.from({ length: 9 }, () =>
      makeTruie('En maternité')
    );
    const r = logesMaterniteOccupation(truies);
    expect(r.occupees).toBe(9);
    expect(r.capacite).toBe(9);
    expect(r.tauxPct).toBe(100);
    expect(r.alerte).toBe('FULL');
  });
});

describe('logesPostSevrageOccupation', () => {
  it('retourne OK à 75% quand 3 portées sevrées sur 4 loges', () => {
    const bandes: BandePorcelets[] = [
      ...Array.from({ length: 3 }, () => makeBande('Sevrés')),
      makeBande('Sous mère'),
    ];
    const r = logesPostSevrageOccupation(bandes);
    expect(r.occupees).toBe(3);
    expect(r.capacite).toBe(4);
    expect(r.tauxPct).toBe(75);
    expect(r.alerte).toBe('OK');
  });

  it('exclut les bandes en engraissement (sevrées >= 60j)', () => {
    const today = new Date(2026, 3, 17); // 17 avril 2026
    const engr: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '01/01/2026', // >60j avant today → engraissement
    };
    const recent: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '10/04/2026', // 7j avant today → post-sevrage
    };
    const r = logesPostSevrageOccupation([engr, recent], today);
    expect(r.occupees).toBe(1); // uniquement la bande post-sevrage
    expect(r.capacite).toBe(4);
  });
});

describe('computeBandePhase', () => {
  const today = new Date(2026, 3, 17); // 17 avril 2026

  it('retourne SOUS_MERE pour une bande au statut Sous mère', () => {
    const b = makeBande('Sous mère');
    expect(computeBandePhase(b, today)).toBe('SOUS_MERE');
  });

  it('retourne POST_SEVRAGE pour une bande sevrée il y a 10 jours', () => {
    const b: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '07/04/2026', // 10 jours avant today
    };
    expect(computeBandePhase(b, today)).toBe('POST_SEVRAGE');
  });

  it('retourne ENGRAISSEMENT pour une bande sevrée il y a 70 jours', () => {
    const b: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '06/02/2026', // 70 jours avant today
    };
    expect(computeBandePhase(b, today)).toBe('ENGRAISSEMENT');
  });

  it('retourne ENGRAISSEMENT à partir de 60 jours (limite)', () => {
    const b: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '15/02/2026', // 61j avant today (17/04/2026)
    };
    expect(computeBandePhase(b, today)).toBe('ENGRAISSEMENT');
  });

  it('retourne INCONNU pour une ligne RECAP', () => {
    const b = makeBande('RECAP');
    expect(computeBandePhase(b, today)).toBe('INCONNU');
  });

  it('retourne POST_SEVRAGE quand statut Sevrés sans date (considéré récent)', () => {
    const b = makeBande('Sevrés');
    expect(computeBandePhase(b, today)).toBe('POST_SEVRAGE');
  });

  it('utilise dateSevragePrevue si dateSevrageReelle est absente', () => {
    const b: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevragePrevue: '06/02/2026', // 70 jours avant today
    };
    expect(computeBandePhase(b, today)).toBe('ENGRAISSEMENT');
  });

  it('supporte le format ISO YYYY-MM-DD', () => {
    const b: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '2026-02-06',
    };
    expect(computeBandePhase(b, today)).toBe('ENGRAISSEMENT');
  });
});

describe('countBandesByPhase', () => {
  it('répartit correctement 5 bandes mixtes', () => {
    const today = new Date(2026, 3, 17);
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère'),
      makeBande('Sous mère'),
      { ...makeBande('Sevrés'), dateSevrageReelle: '10/04/2026' }, // post-sevrage
      { ...makeBande('Sevrés'), dateSevrageReelle: '06/02/2026' }, // engraissement
      makeBande('RECAP'), // ignoré
    ];
    const r = countBandesByPhase(bandes, today);
    expect(r.SOUS_MERE).toBe(2);
    expect(r.POST_SEVRAGE).toBe(1);
    expect(r.ENGRAISSEMENT).toBe(1);
  });
});

describe('logesEngraissementOccupation', () => {
  it('retourne FULL à 100% quand 2 bandes saturent les 2 loges', () => {
    const today = new Date(2026, 3, 17);
    const bandes: BandePorcelets[] = [
      { ...makeBande('Sevrés'), dateSevrageReelle: '06/02/2026' }, // 70j → engraissement
      { ...makeBande('Sevrés'), dateSevrageReelle: '01/01/2026' }, // >100j → engraissement
    ];
    const r = logesEngraissementOccupation(bandes, today);
    expect(r.occupees).toBe(2);
    expect(r.capacite).toBe(2);
    expect(r.tauxPct).toBe(100);
    expect(r.alerte).toBe('FULL');
  });

  it('retourne OK à 0% quand aucune bande en engraissement', () => {
    const today = new Date(2026, 3, 17);
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère'),
      { ...makeBande('Sevrés'), dateSevrageReelle: '10/04/2026' }, // post-sevrage
    ];
    const r = logesEngraissementOccupation(bandes, today);
    expect(r.occupees).toBe(0);
    expect(r.capacite).toBe(2);
    expect(r.tauxPct).toBe(0);
    expect(r.alerte).toBe('OK');
  });
});
