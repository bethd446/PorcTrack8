/**
 * V72 — Tests buildMariusSuggestions (suggestions dynamiques Marius).
 */
import { describe, it, expect } from 'vitest';
import {
  buildMariusSuggestions,
  type MariusSuggestionsInput,
} from '../buildMariusSuggestions';
import type {
  Truie,
  Verrat,
  BandePorcelets,
  StockAliment,
  StockVeto,
  Saillie,
} from '../../../types/farm';
import type { FarmAlert } from '../../../services/alertEngine';

const NOW = new Date('2026-05-08T10:00:00Z');

function mkTruie(overrides: Partial<Truie> = {}): Truie {
  return {
    id: 'T-001',
    displayId: 'T-001',
    boucle: 'BCL-0001',
    statut: 'En attente saillie',
    ration: 0,
    synced: true,
    ...overrides,
  } as Truie;
}

function mkBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-1',
    idPortee: 'B-1',
    truie: 'T-018',
    statut: 'Sous mère',
    vivants: 12,
    nv: 13,
    poidsInitialKg: 1.4,
    synced: true,
    ...overrides,
  } as BandePorcelets;
}

function mkStockAliment(overrides: Partial<StockAliment> = {}): StockAliment {
  return {
    id: 'AL-1',
    libelle: 'Maïs',
    stockActuel: 500,
    unite: 'kg',
    seuilAlerte: 100,
    statutStock: 'OK',
    ...overrides,
  } as StockAliment;
}

function mkStockVeto(overrides: Partial<StockVeto> = {}): StockVeto {
  return {
    id: 'V-1',
    produit: 'Ivermectine',
    stockActuel: 100,
    unite: 'ml',
    seuilAlerte: 10,
    statutStock: 'OK',
    ...overrides,
  } as StockVeto;
}

function mkAlert(overrides: Partial<FarmAlert> = {}): FarmAlert {
  return {
    id: 'a1',
    priority: 'CRITIQUE',
    category: 'REPRO',
    subjectId: 'T-018',
    subjectLabel: 'T-018',
    title: 'Mise-bas en retard',
    message: 'MB en retard',
    requiresAction: true,
    actions: [],
    createdAt: NOW,
    ...overrides,
  } as FarmAlert;
}

function mkSnapshot(overrides: Partial<MariusSuggestionsInput> = {}): MariusSuggestionsInput {
  return {
    nomFerme: 'Ferme Test',
    pays: 'France',
    truies: [],
    verrats: [] as Verrat[],
    bandes: [],
    stockAliment: [],
    stockVeto: [],
    alerts: [],
    saillies: [],
    ...overrides,
  };
}

describe('buildMariusSuggestions', () => {
  it('retourne 3 suggestions générales fallback quand la ferme est calme', () => {
    const out = buildMariusSuggestions(mkSnapshot(), { now: NOW });
    expect(out).toHaveLength(3);
    expect(out.every((s) => s.category === 'general')).toBe(true);
    expect(out[0].question).toMatch(/priorité/i);
    expect(out.map((s) => s.id)).toEqual([
      'fallback-priorites',
      'fallback-tournee',
      'fallback-isse',
    ]);
  });

  it('détecte une mise-bas imminente et génère une suggestion priorité 1', () => {
    // Truie T-018 avec dateMBPrevue = NOW + ~2 jours -> dans la fenêtre [-3 ; +3]
    const dateMB = '10/05/2026'; // 2026-05-10 vs NOW 2026-05-08 10:00Z
    const snap = mkSnapshot({
      truies: [mkTruie({ id: 'T-018', displayId: 'T-018', statut: 'Pleine', dateMBPrevue: dateMB })],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const mb = out.find((s) => s.category === 'mise-bas');
    expect(mb).toBeDefined();
    expect(mb!.priority).toBe(1);
    expect(mb!.id).toBe('mb-imminente-T-018');
    expect(mb!.question).toContain('T-018');
    expect(mb!.question).toMatch(/checklist/i);
    expect(mb!.question).toMatch(/J-\d|J\+\d|aujourd'hui/);
  });

  it('exclut les truies réformées de la détection mise-bas', () => {
    const snap = mkSnapshot({
      truies: [
        mkTruie({ id: 'T-001', statut: 'Réforme', dateMBPrevue: '10/05/2026' }),
        mkTruie({ id: 'T-002', displayId: 'T-002', statut: 'Morte', dateMBPrevue: '10/05/2026' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    expect(out.find((s) => s.category === 'mise-bas')).toBeUndefined();
  });

  it('détecte une rupture de stock aliment et génère une suggestion stocks', () => {
    const snap = mkSnapshot({
      stockAliment: [
        mkStockAliment({ libelle: 'Maïs', stockActuel: 0, statutStock: 'RUPTURE' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const stock = out.find((s) => s.category === 'stocks');
    expect(stock).toBeDefined();
    expect(stock!.priority).toBe(1);
    expect(stock!.question).toContain('Maïs');
    expect(stock!.question).toMatch(/zéro/i);
  });

  it('détecte une rupture véto si pas de rupture aliment', () => {
    const snap = mkSnapshot({
      stockVeto: [
        mkStockVeto({ produit: 'Vaccin parvovirus', stockActuel: 0, statutStock: 'RUPTURE' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const stock = out.find((s) => s.category === 'stocks');
    expect(stock).toBeDefined();
    expect(stock!.question).toContain('Vaccin parvovirus');
  });

  it('détecte un retour chaleur attendu (sevrage J+5)', () => {
    // Truie T-001 en attente saillie + bande de cette truie sevrée à J-5
    const snap = mkSnapshot({
      truies: [mkTruie({ id: 'T-001', displayId: 'T-001', statut: 'En attente saillie' })],
      bandes: [
        mkBande({
          id: 'B-T01',
          truie: 'T-001',
          statut: 'Sevrés',
          dateMB: '01/04/2026',
          dateSevrageReelle: '03/05/2026', // J-5 par rapport à 2026-05-08
        }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const ch = out.find((s) => s.category === 'cycles' && s.id === 'retour-chaleur');
    expect(ch).toBeDefined();
    expect(ch!.priority).toBe(2);
    expect(ch!.question).toMatch(/retour chaleur/i);
    expect(ch!.question).toContain('1 truie ');
  });

  it('détecte une fenêtre échographie ouverte (saillie J-28)', () => {
    // Saillie 2026-04-10 -> 2026-05-08 = J+28 → dans fenêtre J25-J35
    const snap = mkSnapshot({
      truies: [mkTruie({ id: 'T-001', displayId: 'T-001', statut: 'Pleine' })],
      saillies: [
        {
          truieId: 'T-001',
          dateSaillie: '10/04/2026',
          verratId: 'V-001',
          statut: 'PLEINE',
        } as Saillie,
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const echo = out.find((s) => s.id === 'echo-fenetre');
    expect(echo).toBeDefined();
    expect(echo!.priority).toBe(2);
    expect(echo!.category).toBe('cycles');
    expect(echo!.question).toMatch(/échographie/i);
    expect(echo!.question).toMatch(/J25-J35/);
  });

  it('détecte les alertes critiques en cours', () => {
    const snap = mkSnapshot({
      alerts: [
        mkAlert({ id: 'a1', priority: 'CRITIQUE', subjectLabel: 'T-018' }),
        mkAlert({ id: 'a2', priority: 'CRITIQUE', subjectLabel: 'T-001' }),
        mkAlert({ id: 'a3', priority: 'INFO' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const crit = out.find((s) => s.id === 'alertes-critiques');
    expect(crit).toBeDefined();
    expect(crit!.priority).toBe(1);
    expect(crit!.category).toBe('sante');
    expect(crit!.question).toContain('2 alertes critiques');
  });

  it('détecte une surdensité engraissement (>6 bandes)', () => {
    const bandes = Array.from({ length: 7 }, (_, i) =>
      mkBande({ id: `B-${i}`, idPortee: `B-${i}`, statut: 'En croissance' }),
    );
    const snap = mkSnapshot({ bandes });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const sur = out.find((s) => s.id === 'surdensite');
    expect(sur).toBeDefined();
    expect(sur!.priority).toBe(2);
    expect(sur!.question).toContain('7 bandes');
  });

  it('trie par priorité (critique avant haute) et limite à `max`', () => {
    const snap = mkSnapshot({
      truies: [
        // mise-bas imminente (priorité 1)
        mkTruie({ id: 'T-018', displayId: 'T-018', statut: 'Pleine', dateMBPrevue: '10/05/2026' }),
        // truie en attente saillie pour retour chaleur (priorité 2)
        mkTruie({ id: 'T-001', displayId: 'T-001', statut: 'En attente saillie' }),
      ],
      bandes: [
        mkBande({
          id: 'B-T01',
          truie: 'T-001',
          statut: 'Sevrés',
          dateSevrageReelle: '03/05/2026',
        }),
      ],
      stockAliment: [
        mkStockAliment({ libelle: 'Maïs', stockActuel: 0, statutStock: 'RUPTURE' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW, max: 2 });
    expect(out).toHaveLength(2);
    // Les 2 premières doivent être priorité 1 (mb + stock)
    expect(out[0].priority).toBe(1);
    expect(out[1].priority).toBe(1);
  });

  it('complète avec du fallback si moins de `max` règles déclenchées', () => {
    const snap = mkSnapshot({
      stockAliment: [
        mkStockAliment({ libelle: 'Maïs', stockActuel: 0, statutStock: 'RUPTURE' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW, max: 3 });
    expect(out).toHaveLength(3);
    // 1 stock + 2 fallback
    expect(out[0].category).toBe('stocks');
    expect(out.filter((s) => s.category === 'general')).toHaveLength(2);
  });

  it('détecte un stock BAS comme suggestion priorité 2 (pas critique)', () => {
    const snap = mkSnapshot({
      stockAliment: [
        mkStockAliment({ libelle: 'Soja', stockActuel: 50, statutStock: 'BAS' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const bas = out.find((s) => s.id.startsWith('stock-bas-'));
    expect(bas).toBeDefined();
    expect(bas!.priority).toBe(2);
    expect(bas!.question).toContain('Soja');
  });

  it('détecte un sevrage proche (bande Sous mère J21-J28)', () => {
    // dateMB = 2026-04-15 -> 23 jours par rapport à 2026-05-08
    const snap = mkSnapshot({
      bandes: [
        mkBande({
          id: 'B-1',
          statut: 'Sous mère',
          dateMB: '15/04/2026',
        }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const sev = out.find((s) => s.id === 'sevrage-proche');
    expect(sev).toBeDefined();
    expect(sev!.priority).toBe(3);
    expect(sev!.category).toBe('cycles');
  });

  it('combine plusieurs règles métier et respecte max=3', () => {
    const snap = mkSnapshot({
      truies: [
        mkTruie({ id: 'T-018', displayId: 'T-018', statut: 'Pleine', dateMBPrevue: '10/05/2026' }),
        mkTruie({ id: 'T-001', displayId: 'T-001', statut: 'En attente saillie' }),
      ],
      bandes: [
        mkBande({
          id: 'B-T01',
          truie: 'T-001',
          statut: 'Sevrés',
          dateSevrageReelle: '03/05/2026',
        }),
      ],
      stockAliment: [
        mkStockAliment({ libelle: 'Maïs', stockActuel: 0, statutStock: 'RUPTURE' }),
      ],
      alerts: [mkAlert({ id: 'a1', priority: 'CRITIQUE' })],
    });
    const out = buildMariusSuggestions(snap, { now: NOW, max: 3 });
    expect(out).toHaveLength(3);
    // Pas de fallback (assez de règles métier déclenchées)
    expect(out.every((s) => s.category !== 'general')).toBe(true);
    // Les 3 doivent être priorité 1
    expect(out.every((s) => s.priority === 1)).toBe(true);
  });

  it('aucune suggestion mise-bas si dateMBPrevue trop éloignée (>3j)', () => {
    const snap = mkSnapshot({
      truies: [
        mkTruie({ id: 'T-018', displayId: 'T-018', statut: 'Pleine', dateMBPrevue: '20/05/2026' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    expect(out.find((s) => s.category === 'mise-bas')).toBeUndefined();
  });

  it('génère un id unique par suggestion (clé React stable)', () => {
    const snap = mkSnapshot({
      truies: [
        mkTruie({ id: 'T-018', displayId: 'T-018', statut: 'Pleine', dateMBPrevue: '10/05/2026' }),
      ],
      stockAliment: [
        mkStockAliment({ libelle: 'Maïs', stockActuel: 0, statutStock: 'RUPTURE' }),
      ],
    });
    const out = buildMariusSuggestions(snap, { now: NOW });
    const ids = out.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
