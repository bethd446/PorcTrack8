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
  countEngraissementBySex,
  bandesAEligibleSeparation,
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

  it('exclut les bandes en engraissement (sevrées >= 70j)', () => {
    const today = new Date(2026, 3, 17); // 17 avril 2026
    const engr: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '01/01/2026', // >70j avant today → engraissement
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
      // DST : bascule heure d'été fin mars ⇒ on recule au 05/02 pour couvrir
      // ≥70 jours de façon robuste (floor sur diffMs tronque l'offset 1h).
      dateSevrageReelle: '05/02/2026', // 70 jours avant today
    };
    expect(computeBandePhase(b, today)).toBe('ENGRAISSEMENT');
  });

  it('retourne ENGRAISSEMENT à partir de 70 jours (limite)', () => {
    const b: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '05/02/2026', // 70j avant today (17/04/2026) post-DST
    };
    expect(computeBandePhase(b, today)).toBe('ENGRAISSEMENT');
  });

  it('reste POST_SEVRAGE à 69 jours (juste avant seuil 70)', () => {
    const b: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '07/02/2026', // 69j avant today (17/04/2026)
    };
    expect(computeBandePhase(b, today)).toBe('POST_SEVRAGE');
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
      dateSevragePrevue: '05/02/2026', // 70 jours avant today (post-DST)
    };
    expect(computeBandePhase(b, today)).toBe('ENGRAISSEMENT');
  });

  it('supporte le format ISO YYYY-MM-DD', () => {
    const b: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '2026-02-05',
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
      { ...makeBande('Sevrés'), dateSevrageReelle: '05/02/2026' }, // engraissement (70j post-DST)
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
      { ...makeBande('Sevrés'), dateSevrageReelle: '05/02/2026' }, // 70j → engraissement (post-DST)
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

describe('countEngraissementBySex', () => {
  const today = new Date(2026, 3, 17); // 17 avril 2026

  it('ventile correctement 1 bande M + 1 bande F + 1 non séparée', () => {
    const bandes: BandePorcelets[] = [
      {
        ...makeBande('Sevrés', 40),
        dateSevrageReelle: '01/01/2026', // engraissement
        logeEngraissement: 'M',
        nbMales: 20,
        nbFemelles: 20,
        dateSeparation: '11/03/2026',
      },
      {
        ...makeBande('Sevrés', 40),
        dateSevrageReelle: '01/01/2026',
        logeEngraissement: 'F',
        nbMales: 20,
        nbFemelles: 20,
      },
      {
        ...makeBande('Sevrés', 35),
        dateSevrageReelle: '05/02/2026', // engraissement (70j post-DST), pas encore séparé
      },
      makeBande('Sous mère', 10), // ignorée
    ];

    const r = countEngraissementBySex(bandes, today);
    expect(r.males.portees).toBe(1);
    expect(r.males.porcelets).toBe(20);
    expect(r.femelles.portees).toBe(1);
    expect(r.femelles.porcelets).toBe(20);
    expect(r.nonSepares.portees).toBe(1);
    expect(r.nonSepares.porcelets).toBe(35);
  });

  it('retourne des zéros sans bande engraissement', () => {
    const bandes: BandePorcelets[] = [
      makeBande('Sous mère', 12),
      { ...makeBande('Sevrés', 10), dateSevrageReelle: '10/04/2026' }, // post-sevrage
    ];
    const r = countEngraissementBySex(bandes, today);
    expect(r.males).toEqual({ portees: 0, porcelets: 0 });
    expect(r.femelles).toEqual({ portees: 0, porcelets: 0 });
    expect(r.nonSepares).toEqual({ portees: 0, porcelets: 0 });
  });

  it("utilise vivants si nbMales/nbFemelles absents sur une bande séparée", () => {
    const bandes: BandePorcelets[] = [
      {
        ...makeBande('Sevrés', 18),
        dateSevrageReelle: '01/01/2026',
        logeEngraissement: 'M',
      },
    ];
    const r = countEngraissementBySex(bandes, today);
    expect(r.males.portees).toBe(1);
    expect(r.males.porcelets).toBe(18);
  });
});

describe('bandesAEligibleSeparation', () => {
  const today = new Date(2026, 3, 17);

  it('garde les bandes engraissement non séparées', () => {
    const eligible: BandePorcelets = {
      ...makeBande('Sevrés', 30),
      dateSevrageReelle: '01/01/2026', // 106j → engraissement
    };
    const sousMere = makeBande('Sous mère');
    const postSevrage: BandePorcelets = {
      ...makeBande('Sevrés'),
      dateSevrageReelle: '10/04/2026', // 7j → post-sevrage
    };

    const r = bandesAEligibleSeparation([eligible, sousMere, postSevrage], today);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(eligible.id);
  });

  it('exclut les bandes déjà séparées (logeEngraissement défini)', () => {
    const separeeM: BandePorcelets = {
      ...makeBande('Sevrés', 20),
      dateSevrageReelle: '01/01/2026',
      logeEngraissement: 'M',
    };
    const separeeF: BandePorcelets = {
      ...makeBande('Sevrés', 20),
      dateSevrageReelle: '01/01/2026',
      logeEngraissement: 'F',
    };
    const r = bandesAEligibleSeparation([separeeM, separeeF], today);
    expect(r).toHaveLength(0);
  });

  it('exclut les bandes avec nbMales ou nbFemelles renseignés', () => {
    const avecNbMales: BandePorcelets = {
      ...makeBande('Sevrés', 30),
      dateSevrageReelle: '01/01/2026',
      nbMales: 15,
    };
    const r = bandesAEligibleSeparation([avecNbMales], today);
    expect(r).toHaveLength(0);
  });
});
