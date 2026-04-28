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
import type { BandePorcelets, StockAliment, Truie, Saillie } from '../types/farm';

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

function makeSaillie(overrides: Partial<Saillie> = {}): Saillie {
  return {
    truieId: 'T001',
    dateSaillie: '01/01/2026',
    verratId: 'V001',
    statut: 'Active',
    ...overrides,
  };
}

function emptyInput(overrides: Partial<AlertEngineInput> = {}): AlertEngineInput {
  return {
    truies: [],
    bandes: [],
    sante: [],
    stockAliments: [],
    saillies: [],
    notes: [],
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

  // ─── Couverture normaliseStatut (migration Agent H) ────────────────────────
  // Ces tests vérifient que la migration vers `normaliseStatut` préserve le
  // comportement pour les variantes de libellé vues en Sheet.

  it('déclenche pour une variante canonique VIDE ("Vide") — alias de "En attente saillie"', () => {
    const { truie, bande } = truieSevreeIlYa(5, 'Vide');
    const alerts = runAlertEngine(emptyInput({ truies: [truie], bandes: [bande] }));
    const cha = alerts.find(a => a.id.startsWith('CHA-'));
    expect(cha).toBeDefined();
    expect(cha?.priority).toBe('NORMALE');
    expect(cha?.daysOffset).toBe(5);
  });

  it('ne déclenche pas pour les statuts canoniques hors VIDE (PLEINE, MATERNITE, REFORME)', () => {
    // Chaque statut doit être ignoré par R3 : on ne veut pas suggérer une
    // saillie sur une truie pleine, allaitante ou réformée.
    for (const statut of ['Pleine', 'Gestation', 'Maternité', 'Allaitante', 'Lactation', 'Réforme']) {
      const { truie, bande } = truieSevreeIlYa(5, statut);
      const alerts = runAlertEngine(emptyInput({ truies: [truie], bandes: [bande] }));
      expect(
        alerts.find(a => a.id.startsWith('CHA-')),
        `statut "${statut}" ne doit pas déclencher R3`,
      ).toBeUndefined();
    }
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

  // ─── Garde-fous contre les faux positifs "Mortalité 100%" ──────────────────

  it('ne déclenche pas sur une ligne RECAP (agrégat du Sheet)', () => {
    const bande = makeBande({ statut: 'RECAP', nv: 10, morts: 10 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });

  it('ne déclenche pas sur une bande déjà Sevrés (porcelets sortis de maternité)', () => {
    const bande = makeBande({ statut: 'Sevrés', nv: 10, morts: 10, vivants: 0 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });

  it('ne déclenche pas sur une bande Sevrée (variante orthographique)', () => {
    const bande = makeBande({ statut: 'Sevrée', nv: 10, morts: 10 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });

  it('ne déclenche pas sur une bande Archivée (historique)', () => {
    const bande = makeBande({ statut: 'Archivée', nv: 12, morts: 12 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });

  it('ne déclenche pas sur une bande "En croissance" avec date sevrage réelle', () => {
    const bande = makeBande({
      statut: 'En croissance',
      nv: 10,
      morts: 10,
      dateSevrageReelle: '01/01/2026'
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });

  it('ne déclenche pas sur une bande "En finition" avec date sevrage réelle', () => {
    const bande = makeBande({
      statut: 'En finition',
      nv: 12,
      morts: 12,
      dateSevrageReelle: '01/01/2026'
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });

  it('ne déclenche pas si morts = 0 (aucune mortalité enregistrée)', () => {
    const bande = makeBande({ nv: 10, morts: 0 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    expect(alerts.find(a => a.id.startsWith('MORT-'))).toBeUndefined();
  });

  it('clamp morts > nv pour ne jamais afficher > 100% (donnée incohérente)', () => {
    const bande = makeBande({ nv: 10, morts: 99 });
    const alerts = runAlertEngine(emptyInput({ bandes: [bande] }));
    const mort = alerts.find(a => a.id.startsWith('MORT-'));
    expect(mort).toBeDefined();
    // Clamp : 10/10 = 100%, pas 990%
    expect(mort?.message).toContain('10 mort(s) sur 10');
    expect(mort?.message).toContain('100%');
    expect(mort?.priority).toBe('CRITIQUE');
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

// ─── R7 — Fenêtre Échographie ────────────────────────────────────────────────

describe('R7 — Fenêtre Échographie', () => {
  it('déclenche INFO à J+25 post saillie (début fenêtre)', () => {
    const truie = makeTruie({ id: 'T1', statut: 'Pleine' });
    const saillie = makeSaillie({ truieId: 'T1', dateSaillie: toFrDate(dayOffset(NOW, -25)) });
    const alerts = runAlertEngine(emptyInput({ truies: [truie], saillies: [saillie] }));
    const ech = alerts.find(a => a.id.startsWith('ECH-'));
    expect(ech).toBeDefined();
    expect(ech?.priority).toBe('INFO');
    expect(ech?.daysOffset).toBe(25);
  });

  it('déclenche INFO à J+35 post saillie (fin fenêtre)', () => {
    const truie = makeTruie({ id: 'T1', statut: 'Pleine' });
    const saillie = makeSaillie({ truieId: 'T1', dateSaillie: toFrDate(dayOffset(NOW, -35)) });
    const alerts = runAlertEngine(emptyInput({ truies: [truie], saillies: [saillie] }));
    const ech = alerts.find(a => a.id.startsWith('ECH-'));
    expect(ech).toBeDefined();
    expect(ech?.priority).toBe('INFO');
    expect(ech?.daysOffset).toBe(35);
  });

  it('ne déclenche pas à J+24 (veille)', () => {
    const truie = makeTruie({ id: 'T1', statut: 'Pleine' });
    const saillie = makeSaillie({ truieId: 'T1', dateSaillie: toFrDate(dayOffset(NOW, -24)) });
    const alerts = runAlertEngine(emptyInput({ truies: [truie], saillies: [saillie] }));
    expect(alerts.find(a => a.id.startsWith('ECH-'))).toBeUndefined();
  });

  it('ne déclenche pas à J+36 (lendemain)', () => {
    const truie = makeTruie({ id: 'T1', statut: 'Pleine' });
    const saillie = makeSaillie({ truieId: 'T1', dateSaillie: toFrDate(dayOffset(NOW, -36)) });
    const alerts = runAlertEngine(emptyInput({ truies: [truie], saillies: [saillie] }));
    expect(alerts.find(a => a.id.startsWith('ECH-'))).toBeUndefined();
  });

  it('ne déclenche pas si la truie n\'est pas PLEINE', () => {
    const truie = makeTruie({ id: 'T1', statut: 'En maternité' });
    const saillie = makeSaillie({ truieId: 'T1', dateSaillie: toFrDate(dayOffset(NOW, -30)) });
    const alerts = runAlertEngine(emptyInput({ truies: [truie], saillies: [saillie] }));
    expect(alerts.find(a => a.id.startsWith('ECH-'))).toBeUndefined();
  });

  it('ne déclenche pas si aucune saillie active n\'est trouvée', () => {
    const truie = makeTruie({ id: 'T1', statut: 'Pleine' });
    const saillie = makeSaillie({ truieId: 'T1', dateSaillie: toFrDate(dayOffset(NOW, -30)), statut: 'Echec' });
    const alerts = runAlertEngine(emptyInput({ truies: [truie], saillies: [saillie] }));
    expect(alerts.find(a => a.id.startsWith('ECH-'))).toBeUndefined();
  });
});

// ─── R8 — Re-Saillie Proactive ───────────────────────────────────────────────

describe('R8 — Re-Saillie Proactive', () => {
  it('déclenche NORMALE à J+0 post retour chaleur', () => {
    const truie = makeTruie({
      statut: 'En attente saillie',
      notes: 'Retour chaleur 15/06/2026',
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const rsa = alerts.find(a => a.id.startsWith('RSA-'));
    expect(rsa).toBeDefined();
    expect(rsa?.priority).toBe('NORMALE');
    expect(rsa?.daysOffset).toBe(0);
  });

  it('déclenche HAUTE à J+3 post retour chaleur', () => {
    const truie = makeTruie({
      statut: 'En attente saillie',
      notes: 'Observation · Retour chaleur 12/06/2026',
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const rsa = alerts.find(a => a.id.startsWith('RSA-'));
    expect(rsa?.priority).toBe('HAUTE');
    expect(rsa?.daysOffset).toBe(3);
  });

  it('déclenche CRITIQUE à J+11 post retour chaleur', () => {
    const truie = makeTruie({
      statut: 'Vide',
      notes: 'Retour chaleur 04/06/2026',
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const rsa = alerts.find(a => a.id.startsWith('RSA-'));
    expect(rsa?.priority).toBe('CRITIQUE');
    expect(rsa?.daysOffset).toBe(11);
  });

  it('ne déclenche pas au-delà de J+20 (cycle suivant)', () => {
    const truie = makeTruie({
      statut: 'En attente saillie',
      notes: 'Retour chaleur 20/05/2026',
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    expect(alerts.find(a => a.id.startsWith('RSA-'))).toBeUndefined();
  });

  it('ne déclenche pas si le statut n\'est pas VIDE (ex: Pleine)', () => {
    const truie = makeTruie({
      statut: 'Pleine',
      notes: 'Retour chaleur 15/06/2026',
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    expect(alerts.find(a => a.id.startsWith('RSA-'))).toBeUndefined();
  });

  it('ne déclenche pas si le tag de date est mal formé', () => {
    const truie = makeTruie({
      statut: 'Vide',
      notes: 'Retour chaleur juin 2026',
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    expect(alerts.find(a => a.id.startsWith('RSA-'))).toBeUndefined();
  });

  it('propose l\'action "Re-Saillir" avec le bon payload', () => {
    const truie = makeTruie({
      id: 'T07',
      statut: 'En attente saillie',
      notes: 'Retour chaleur 15/06/2026',
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const rsa = alerts.find(a => a.id.startsWith('RSA-'));
    const action = rsa?.actions.find(a => a.type === 'CONFIRM_SAILLIE');
    expect(action).toBeDefined();
    expect(action?.label).toBe('Re-Saillir');
    expect(action?.payload).toEqual({ truieId: 'T07' });
  });

  it('priorise le tag le plus récent si plusieurs tags sont présents', () => {
    // Cas où le porcher a noté deux retours chaleur successifs (échec saillie intermédiaire)
    const truie = makeTruie({
      statut: 'En attente saillie',
      notes: 'Retour chaleur 20/05/2026 · Retour chaleur 15/06/2026',
    });
    const alerts = runAlertEngine(emptyInput({ truies: [truie] }));
    const rsa = alerts.find(a => a.id.startsWith('RSA-'));
    expect(rsa).toBeDefined();
    expect(rsa?.daysOffset).toBe(0); // Basé sur le tag du 15/06 (today)
  });
});

// ─── R9 — Retard de phase ───────────────────────────────────────────────────

describe('R9 — Retard de phase', () => {
  it('génère une alerte si retard > 3j sans mise à jour statut', () => {
    const today = NOW;
    const b = makeBande({
      id: 'B01', idPortee: 'P01',
      statut: 'Sous mère',
      dateMB: toFrDate(dayOffset(today, -36)), // J36 — devrait être POST_SEVRAGE depuis J28
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [b] }));
    const retard = alerts.find(a => a.id.startsWith('retard-'));
    expect(retard).toBeDefined();
    expect(retard?.priority).toBe('NORMALE');
    expect(retard?.daysOffset).toBe(36 - 28); // 8 jours de retard
  });

  it('ne génère pas d\'alerte si retard <= 3j (tolérance)', () => {
    const today = NOW;
    const b = makeBande({
      id: 'B01',
      statut: 'Sous mère',
      dateMB: toFrDate(dayOffset(today, -30)), // J30 — 2j de retard théorique (<3j)
    });
    const alerts = runAlertEngine(emptyInput({ bandes: [b] }));
    expect(alerts.find(a => a.id.startsWith('retard-'))).toBeUndefined();
  });
});

// ─── R10 — Surdensité ────────────────────────────────────────────────────────

describe('R10 — Surdensité', () => {
  it('génère une alerte si > ENGRAISSEMENT_LOGES_CAPACITY bandes', () => {
    // 7 bandes en CROISSANCE/ENGRAISSEMENT/FINITION pour 6 loges
    const bandes = Array.from({ length: 7 }, (_, i) => makeBande({
      id: `B${i}`,
      statut: 'Sevrés',
      dateMB: toFrDate(dayOffset(NOW, -80)), // Age = 80j -> CROISSANCE biologique
      dateSevrageReelle: toFrDate(dayOffset(NOW, -20)), // J20 post-sevrage -> POST_SEVRAGE declaré ?
      // Attends, si age MB = 80, et sevrage J28, alors post-sevrage diff = 52j.
      // 52 > 35 -> CROISSANCE declaré.
    }));
    // Note: makeBande uses dateMB. If I set dateMB to -80, age is 80.
    // computeBandePhase uses sevrage date. If not present, fallback on POST_SEVRAGE.
    // If I want them to be in CROISSANCE+ for R10:
    bandes.forEach(b => {
      b.statut = 'En croissance'; // Force phase CROISSANCE
    });

    const alerts = runAlertEngine(emptyInput({ bandes }));
    const surdensite = alerts.find(a => a.id === 'surdensite-engraissement');
    expect(surdensite).toBeDefined();
    expect(surdensite?.priority).toBe('HAUTE');
  });

  it('ne génère pas d\'alerte si <= capacité', () => {
    const bandes = Array.from({ length: 6 }, (_, i) => makeBande({
      id: `B${i}`,
      statut: 'En croissance',
    }));
    const alerts = runAlertEngine(emptyInput({ bandes }));
    expect(alerts.find(a => a.id === 'surdensite-engraissement')).toBeUndefined();
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
