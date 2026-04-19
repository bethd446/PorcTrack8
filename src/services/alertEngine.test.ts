/**
 * Tests unitaires — Moteur d'alertes PorcTrack
 * ═════════════════════════════════════════════
 * Couvre les 6 règles biologiques GTTT (R1→R6).
 *
 * Principes :
 *  - Dates déterministes via `vi.setSystemTime()`.
 *  - Fixtures minimalistes typées (jamais de `any`).
 *  - Un `describe` par règle, un `it` par cas.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAlertEngine, type AlertEngineInput } from './alertEngine';
import type { BandePorcelets, StockAliment, Truie } from '../types/farm';

// ─── Utilitaires de fixture ──────────────────────────────────────────────────

/** Format une Date en DD/MM/YYYY (format attendu par `parseFrDate`). */
function toFrDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Construit une Date "aujourd'hui + offset jours" à minuit local. */
function dayOffset(today: Date, offsetDays: number): Date {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/** Date figée utilisée par tous les tests (15 juin 2026, minuit local).
 *  Fixée à 00:00 pour éviter les erreurs d'arrondi dans `daysDiff`
 *  (comparaison avec `dayOffset` qui normalise à minuit). */
const NOW = new Date(2026, 5, 15, 0, 0, 0, 0);

function makeTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: 'T001',
    displayId: 'T-001',
    boucle: 'B-001',
    statut: 'Pleine',
    ration: 3,
    synced: true,
    ...overrides,
  };
}

function makeBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'BP-001',
    idPortee: 'P-001',
    statut: 'Sous mère',
    synced: true,
    ...overrides,
  };
}

function makeStock(overrides: Partial<StockAliment> = {}): StockAliment {
  return {
    id: 'S001',
    libelle: 'Aliment Truie',
    stockActuel: 100,
    unite: 'kg',
    seuilAlerte: 50,
    statutStock: 'OK',
    ...overrides,
  };
}

function emptyInput(overrides: Partial<AlertEngineInput> = {}): AlertEngineInput {
  return {
    truies: [],
    bandes: [],
    sante: [],
    stockAliments: [],
    ...overrides,
  };
}

// ─── Setup commun ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── R1 — Mise-Bas ───────────────────────────────────────────────────────────

describe('R1 — Mise-Bas', () => {
  it('déclenche HAUTE à J-3 (début de fenêtre imminente)', () => {
    const truie = makeTruie({
      dateMBPrevue: toFrDate(dayOffset(NOW, 3)), // MB dans 3 jours
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const mb = alerts.find(a => a.id.startsWith('MB-'));
    expect(mb).toBeDefined();
    expect(mb?.priority).toBe('HAUTE');
    expect(mb?.title).toContain('Imminente');
    expect(mb?.daysOffset).toBe(-3);
  });

  it('déclenche HAUTE à J-1 (veille)', () => {
    const truie = makeTruie({
      dateMBPrevue: toFrDate(dayOffset(NOW, 1)),
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const mb = alerts.find(a => a.id.startsWith('MB-'));
    expect(mb?.priority).toBe('HAUTE');
    expect(mb?.title).toContain('Imminente');
    expect(mb?.daysOffset).toBe(-1);
  });

  it('déclenche HAUTE à J+0 (jour prévu)', () => {
    const truie = makeTruie({ dateMBPrevue: toFrDate(NOW) });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const mb = alerts.find(a => a.id.startsWith('MB-'));
    expect(mb?.priority).toBe('HAUTE');
    expect(mb?.title).toContain('Imminente');
    expect(mb?.requiresAction).toBe(false);
  });

  it('déclenche CRITIQUE à J+3 (retard > 2 jours)', () => {
    const truie = makeTruie({
      dateMBPrevue: toFrDate(dayOffset(NOW, -3)), // prévue il y a 3 jours
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const mb = alerts.find(a => a.id.startsWith('MB-'));
    expect(mb).toBeDefined();
    expect(mb?.priority).toBe('CRITIQUE');
    expect(mb?.title).toContain('Retard');
    expect(mb?.requiresAction).toBe(true);
    expect(mb?.daysOffset).toBe(3);
  });

  it('ne déclenche pas si la date est hors fenêtre (J-10)', () => {
    const truie = makeTruie({
      dateMBPrevue: toFrDate(dayOffset(NOW, 10)),
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    expect(alerts.find(a => a.id.startsWith('MB-'))).toBeUndefined();
  });

  it('ne déclenche pas si dateMBPrevue est absente', () => {
    const truie = makeTruie({ dateMBPrevue: undefined });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    expect(alerts.find(a => a.id.startsWith('MB-'))).toBeUndefined();
  });
});

// ─── R2 — Sevrage ────────────────────────────────────────────────────────────

describe('R2 — Sevrage', () => {
  it('déclenche NORMALE à J+28 exact (sevrage du jour)', () => {
    const bande = makeBande({
      dateMB: toFrDate(dayOffset(NOW, -28)),
      vivants: 10,
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    const sev = alerts.find(a => a.id.startsWith('SEV-'));
    expect(sev).toBeDefined();
    expect(sev?.priority).toBe('NORMALE');
    expect(sev?.daysOffset).toBe(0);
    expect(sev?.requiresAction).toBe(true);
  });

  it('ne déclenche pas à J+27 (veille du sevrage)', () => {
    const bande = makeBande({
      dateMB: toFrDate(dayOffset(NOW, -27)),
      vivants: 10,
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('SEV-'))).toBeUndefined();
  });

  it('passe à HAUTE si retard > 7 jours (J+36)', () => {
    const bande = makeBande({
      dateMB: toFrDate(dayOffset(NOW, -36)),
      vivants: 8,
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    const sev = alerts.find(a => a.id.startsWith('SEV-'));
    expect(sev?.priority).toBe('HAUTE');
    expect(sev?.daysOffset).toBe(8);
  });

  it('ne déclenche pas si bande déjà Sevrés', () => {
    const bande = makeBande({
      dateMB: toFrDate(dayOffset(NOW, -25)),
      vivants: 10,
      statut: 'Sevrés',
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('SEV-'))).toBeUndefined();
  });
});

// ─── R3 — Retour en chaleur post-sevrage ─────────────────────────────────────

describe('R3 — Retour Chaleur Post-Sevrage', () => {
  /** Construit une paire truie + bande liée, avec sevrage réel à N jours dans le passé. */
  function truieSevreeIlYa(joursDepuisSevrage: number, statut: string = 'En attente saillie') {
    const truie = makeTruie({ statut });
    const bande = makeBande({
      id: `BP-${truie.id}`,
      truie: truie.id,
      dateMB: toFrDate(dayOffset(NOW, -(28 + joursDepuisSevrage))),
      dateSevrageReelle: toFrDate(dayOffset(NOW, -joursDepuisSevrage)),
      statut: 'Sevrés',
      vivants: 10,
    });
    return { truie, bande };
  }

  it('déclenche NORMALE à J+5 post-sevrage (statut En attente saillie)', () => {
    const { truie, bande } = truieSevreeIlYa(5);
    const alerts = runAlertEngine(emptyInput({ truies: [truie], bandes: [bande] }));
    const cha = alerts.find(a => a.id.startsWith('CHA-'));
    expect(cha).toBeDefined();
    expect(cha?.priority).toBe('NORMALE');
    expect(cha?.daysOffset).toBe(5);
    expect(cha?.requiresAction).toBe(true);
  });

  it('déclenche NORMALE à J+7 post-sevrage (fin de fenêtre normale)', () => {
    const { truie, bande } = truieSevreeIlYa(7);
    const alerts = runAlertEngine(emptyInput({ truies: [truie], bandes: [bande] }));
    const cha = alerts.find(a => a.id.startsWith('CHA-'));
    expect(cha).toBeDefined();
    expect(cha?.priority).toBe('NORMALE');
    expect(cha?.daysOffset).toBe(7);
  });

  it('passe à HAUTE au-delà de J+10 post-sevrage', () => {
    const { truie, bande } = truieSevreeIlYa(11);
    const alerts = runAlertEngine(emptyInput({ truies: [truie], bandes: [bande] }));
    const cha = alerts.find(a => a.id.startsWith('CHA-'));
    expect(cha?.priority).toBe('HAUTE');
    expect(cha?.daysOffset).toBe(11);
  });

  it('ne déclenche pas si la truie n\'est pas En attente saillie', () => {
    const { truie, bande } = truieSevreeIlYa(5, 'Pleine');
    const alerts = runAlertEngine(emptyInput({ truies: [truie], bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('CHA-'))).toBeUndefined();
  });

  it('ne déclenche pas si sevrage > 14 jours (problème autre)', () => {
    const { truie, bande } = truieSevreeIlYa(19);
    const alerts = runAlertEngine(emptyInput({ truies: [truie], bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('CHA-'))).toBeUndefined();
  });
});

// ─── R4 — Mortalité anormale ─────────────────────────────────────────────────

describe('R4 — Mortalité Anormale', () => {
  it('déclenche HAUTE à 20% de mortalité', () => {
    const bande = makeBande({ nv: 10, morts: 2 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    const mort = alerts.find(a => a.id.startsWith('MORT-'));
    expect(mort).toBeDefined();
    expect(mort?.priority).toBe('HAUTE');
    expect(mort?.category).toBe('SANTE');
  });

  it('déclenche CRITIQUE à > 30% de mortalité', () => {
    const bande = makeBande({ nv: 10, morts: 4 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    const mort = alerts.find(a => a.id.startsWith('MORT-'));
    expect(mort?.priority).toBe('CRITIQUE');
  });

  it('ne déclenche pas à 10% de mortalité (sous le seuil)', () => {
    const bande = makeBande({ nv: 10, morts: 1 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });

  it('ne déclenche pas si nv = 0', () => {
    const bande = makeBande({ nv: 0, morts: 0 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });
});

// ─── R5 — Stock critique ─────────────────────────────────────────────────────

describe('R5 — Stock Critique', () => {
  it('déclenche CRITIQUE quand le stock est en RUPTURE', () => {
    const stock = makeStock({ statutStock: 'RUPTURE', stockActuel: 0 });
    const alerts = runAlertEngine(emptyInput({ stockAliments: [stock] }));
    const stk = alerts.find(a => a.id.startsWith('STK-'));
    expect(stk).toBeDefined();
    expect(stk?.priority).toBe('CRITIQUE');
    expect(stk?.title).toContain('Épuisé');
  });

  it('déclenche HAUTE quand le stock est BAS', () => {
    const stock = makeStock({ statutStock: 'BAS', stockActuel: 20 });
    const alerts = runAlertEngine(emptyInput({ stockAliments: [stock] }));
    const stk = alerts.find(a => a.id.startsWith('STK-'));
    expect(stk).toBeDefined();
    expect(stk?.priority).toBe('HAUTE');
    expect(stk?.title).toContain('Bas');
  });

  it('ne déclenche pas quand le stock est OK', () => {
    const stock = makeStock({ statutStock: 'OK', stockActuel: 200 });
    const alerts = runAlertEngine(emptyInput({ stockAliments: [stock] }));
    expect(alerts.find(a => a.id.startsWith('STK-'))).toBeUndefined();
  });
});

// ─── R6 — Regroupement de bandes ─────────────────────────────────────────────

describe('R6 — Regroupement Bandes', () => {
  it('suggère le regroupement quand 2 bandes sont sevrables à ±3j', () => {
    const b1 = makeBande({
      id: 'BP-A',
      dateMB: toFrDate(dayOffset(NOW, -28)), // sevrage aujourd'hui
      vivants: 8,
    });
    const b2 = makeBande({
      id: 'BP-B',
      dateMB: toFrDate(dayOffset(NOW, -26)), // sevrage dans 2 jours
      vivants: 7,
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [b1, b2] }));
    const reg = alerts.find(a => a.id.startsWith('REG-'));
    expect(reg).toBeDefined();
    expect(reg?.priority).toBe('INFO');
    expect(reg?.category).toBe('BANDES');
    expect(reg?.subjectLabel).toContain('2 bandes');
    expect(reg?.message).toContain('15'); // total vivants 8+7
  });

  it('ne suggère pas avec une seule bande sevrable', () => {
    const b1 = makeBande({
      id: 'BP-A',
      dateMB: toFrDate(dayOffset(NOW, -28)),
      vivants: 8,
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [b1] }));
    expect(alerts.find(a => a.id.startsWith('REG-'))).toBeUndefined();
  });

  it('ne suggère pas si les bandes sont hors de la fenêtre ±3j', () => {
    // Les deux bandes sont encore trop jeunes (<18j)
    const b1 = makeBande({
      id: 'BP-A',
      dateMB: toFrDate(dayOffset(NOW, -10)),
      vivants: 8,
    });
    const b2 = makeBande({
      id: 'BP-B',
      dateMB: toFrDate(dayOffset(NOW, -12)),
      vivants: 7,
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [b1, b2] }));
    expect(alerts.find(a => a.id.startsWith('REG-'))).toBeUndefined();
  });
});

// ─── Robustesse temporelle (DST, minuit, fuseaux) ────────────────────────────

describe('Robustesse calcul de dates (DST / fuseaux)', () => {
  it('DST printemps 2026 : 27 mars → 30 mars = 3 jours (pas 2 ni 4)', () => {
    // Passage heure d'été Europe/Paris : dimanche 29 mars 2026 à 02:00 → 03:00
    // La nuit du 28 au 29 ne dure que 23h. Avec Math.round((to-from)/86400000),
    // l'écart 27→30 = 3*24h - 1h = 71h → 71/24 = 2.958 → Math.round = 3 (ici ça passe)
    // mais l'écart 28→30 = 47h → arrondi à 2 (ok). Le bug apparaît surtout
    // quand les fixtures utilisent des heures non-midi. On vérifie ici que
    // même avec NOW positionné juste avant le DST, le calcul reste exact.
    vi.setSystemTime(new Date('2026-03-27T00:00:00+01:00')); // 27 mars 00h Paris
    const truie = makeTruie({ dateMBPrevue: '30/03/2026' }); // 30 mars Paris
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const mb = alerts.find(a => a.id.startsWith('MB-'));
    expect(mb).toBeDefined();
    // J-3 exactement : daysOffset = -3 (MB prévue dans 3 jours)
    expect(mb?.daysOffset).toBe(-3);
    expect(mb?.priority).toBe('HAUTE');
  });

  it('minuit pile : MB prévue aujourd\'hui 23h59, NOW = aujourd\'hui 00h01 → daysDiff = 0', () => {
    // Simule un cas où l'heure intra-journée pourrait faire déborder sur J±1
    // avec un calcul naïf en ms. Ici NOW = 00h01 Paris, MB = 23h59 même jour.
    vi.setSystemTime(new Date('2026-06-15T00:01:00+02:00')); // 15 juin 00h01 Paris
    const truie = makeTruie({ dateMBPrevue: '15/06/2026' }); // même jour civil
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const mb = alerts.find(a => a.id.startsWith('MB-'));
    expect(mb).toBeDefined();
    // Même jour civil en Europe/Paris → offset = 0
    expect(mb?.daysOffset).toBe(0);
    expect(mb?.title).toContain('Imminente');
  });

  it('fuseau utilisateur Tokyo (+9h) : résultat identique à Paris', () => {
    // Simule un utilisateur à Tokyo qui ouvre l'app à 08h00 locales (= 00h00 Paris).
    // La date saisie "30/03/2026" doit toujours être interprétée en Europe/Paris,
    // donc la différence avec aujourd'hui (29/03/2026 Paris) doit rester = 1 jour.
    // Sans normalisation, `new Date(2026, 2, 30)` évalué avec TZ=Asia/Tokyo
    // produirait un instant différent et daysDiff pourrait partir en vrille.
    vi.setSystemTime(new Date('2026-03-29T08:00:00+09:00')); // Tokyo 08h = Paris 00h, le 29 mars
    const truie = makeTruie({ dateMBPrevue: '30/03/2026' });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const mb = alerts.find(a => a.id.startsWith('MB-'));
    expect(mb).toBeDefined();
    // 29 → 30 = 1 jour d'écart en Europe/Paris
    expect(mb?.daysOffset).toBe(-1);
    expect(mb?.priority).toBe('HAUTE');
    expect(mb?.title).toContain('Imminente');
  });
});

// ─── Tri global des alertes ──────────────────────────────────────────────────

describe('runAlertEngine — tri global', () => {
  it('trie les alertes par priorité CRITIQUE > HAUTE > NORMALE > INFO', () => {
    const input = emptyInput({
      truies: [
        makeTruie({ id: 'T1', displayId: 'T1', dateMBPrevue: toFrDate(dayOffset(NOW, -3)) }), // MB retard CRITIQUE
      ],
      bandes: [
        makeBande({ id: 'B1', dateMB: toFrDate(dayOffset(NOW, -28)), vivants: 5 }), // SEV NORMALE
        makeBande({ id: 'B2', dateMB: toFrDate(dayOffset(NOW, -27)), vivants: 5 }), // REG INFO
      ],
      stockAliments: [
        makeStock({ id: 'S1', statutStock: 'BAS', stockActuel: 10 }), // STK HAUTE
      ],
    });
    const alerts = runAlertEngine(input);
    const priorities = alerts.map(a => a.priority);
    // CRITIQUE d'abord, puis HAUTE, puis NORMALE, puis INFO
    expect(priorities[0]).toBe('CRITIQUE');
    expect(priorities).toContain('HAUTE');
    expect(priorities).toContain('NORMALE');
    expect(priorities).toContain('INFO');
    // Vérifie l'ordre général
    const order = { CRITIQUE: 0, HAUTE: 1, NORMALE: 2, INFO: 3 } as const;
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
    }
  });
});
