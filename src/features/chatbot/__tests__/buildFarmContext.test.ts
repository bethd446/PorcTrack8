/**
 * Tests buildFarmContext — Marius RAG MVP.
 */
import { describe, it, expect } from 'vitest';
import {
  buildFarmContextPrompt,
  prefixWithFarmContext,
  type FarmSnapshot,
} from '../buildFarmContext';
import type {
  Truie,
  Verrat,
  BandePorcelets,
  StockAliment,
  StockVeto,
} from '../../../types/farm';
import type { FarmAlert } from '../../../services/alertEngine';

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

function mkVerrat(overrides: Partial<Verrat> = {}): Verrat {
  return {
    id: 'V-001',
    displayId: 'V-001',
    boucle: 'BCL-V-001',
    statut: 'Actif',
    ration: 0,
    synced: true,
    ...overrides,
  } as Verrat;
}

function mkBande(overrides: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-26-T18-01',
    idPortee: 'B-26-T18-01',
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
    stockActuel: 0,
    unite: 'kg',
    seuilAlerte: 100,
    statutStock: 'RUPTURE',
    ...overrides,
  } as StockAliment;
}

function mkStockVeto(overrides: Partial<StockVeto> = {}): StockVeto {
  return {
    id: 'V-1',
    produit: 'Ivermectine',
    stockActuel: 5,
    unite: 'ml',
    seuilAlerte: 50,
    statutStock: 'BAS',
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
    message: 'Mise-bas prévue il y a 3 jours',
    requiresAction: true,
    actions: [],
    createdAt: new Date('2026-05-08'),
    daysOffset: 3,
    ...overrides,
  } as FarmAlert;
}

const NOW = new Date('2026-05-08T10:00:00Z');

function mkSnapshot(overrides: Partial<FarmSnapshot> = {}): FarmSnapshot {
  return {
    nomFerme: 'Ferme Christophe',
    pays: 'France',
    truies: [],
    verrats: [],
    bandes: [],
    stockAliment: [],
    stockVeto: [],
    alerts: [],
    ...overrides,
  };
}

describe('buildFarmContextPrompt', () => {
  it('retourne un bloc structuré avec marqueurs début/fin', () => {
    const out = buildFarmContextPrompt(mkSnapshot(), { now: NOW });
    expect(out).toContain('[CONTEXTE FERME');
    expect(out).toContain('[FIN CONTEXTE]');
  });

  it('inclut nom utilisateur et date du jour', () => {
    const out = buildFarmContextPrompt(mkSnapshot(), {
      now: NOW,
      userName: 'Christophe',
    });
    expect(out).toContain('Christophe');
    // 2026-05-08 = vendredi
    expect(out).toContain('vendredi 2026-05-08');
  });

  it('compte les truies actives en excluant les réformées et mortes', () => {
    const snap = mkSnapshot({
      truies: [
        mkTruie({ id: 'T-001', statut: 'En attente saillie' }),
        mkTruie({ id: 'T-002', statut: 'Pleine' }),
        mkTruie({ id: 'T-003', statut: 'Réforme' }),
        mkTruie({ id: 'T-004', statut: 'Morte' }),
      ],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW });
    expect(out).toMatch(/2 truies actives/);
  });

  it('liste les truies à surveiller avec stade et statut', () => {
    const snap = mkSnapshot({
      truies: [
        mkTruie({ displayId: 'T-001', statut: 'En attente saillie', stade: 'J118 post-saillie' }),
        mkTruie({ displayId: 'T-018', statut: 'En maternité', stade: 'J-2' }),
      ],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW });
    expect(out).toContain('T-001 (J118 post-saillie, En attente saillie)');
    expect(out).toContain('T-018 (J-2, En maternité)');
  });

  it('exclut les bandes RECAP de la liste', () => {
    const snap = mkSnapshot({
      bandes: [
        mkBande({ id: 'B-1', statut: 'Sous mère' }),
        mkBande({ id: 'B-RECAP', statut: 'RECAP' }),
      ],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW });
    expect(out).toContain('B-1');
    expect(out).not.toContain('B-RECAP');
    expect(out).toMatch(/1 bandes en cours/);
  });

  it('agrège correctement le total porcelets sous bandes actives', () => {
    const snap = mkSnapshot({
      bandes: [
        mkBande({ id: 'B-1', vivants: 12 }),
        mkBande({ id: 'B-2', vivants: 8 }),
      ],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW });
    expect(out).toMatch(/20 porcelets/);
  });

  it('liste les stocks RUPTURE et BAS, ignore OK', () => {
    const snap = mkSnapshot({
      stockAliment: [
        mkStockAliment({ libelle: 'Maïs', stockActuel: 0, statutStock: 'RUPTURE' }),
        mkStockAliment({ libelle: 'Soja', stockActuel: 500, statutStock: 'OK' }),
      ],
      stockVeto: [
        mkStockVeto({ produit: 'Ivermectine', stockActuel: 5, statutStock: 'BAS' }),
      ],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW });
    expect(out).toContain('Maïs 0kg (RUPTURE)');
    expect(out).toContain('Ivermectine 5ml (BAS)');
    expect(out).not.toContain('Soja');
  });

  it('mentionne stocks OK si aucun critique', () => {
    const snap = mkSnapshot({
      stockAliment: [
        mkStockAliment({ stockActuel: 500, statutStock: 'OK' }),
      ],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW });
    expect(out).toContain('Stocks : OK');
  });

  it('garde uniquement alertes CRITIQUE/HAUTE et trie par priorité', () => {
    const snap = mkSnapshot({
      alerts: [
        mkAlert({ id: 'a1', priority: 'NORMALE', title: 'Echo recommandée' }),
        mkAlert({ id: 'a2', priority: 'CRITIQUE', subjectLabel: 'T-018', title: 'MB en retard' }),
        mkAlert({ id: 'a3', priority: 'HAUTE', subjectLabel: 'T-001', title: 'Re-saillie' }),
        mkAlert({ id: 'a4', priority: 'INFO', title: 'Regroupement possible' }),
      ],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW });
    expect(out).toContain('Alertes prioritaires (2)');
    expect(out).toContain('CRITIQUE T-018');
    expect(out).toContain('HAUTE T-001');
    expect(out).not.toContain('Echo recommandée');
    expect(out).not.toContain('Regroupement possible');
    // Ordre : CRITIQUE avant HAUTE
    expect(out.indexOf('CRITIQUE T-018')).toBeLessThan(out.indexOf('HAUTE T-001'));
  });

  it('mentionne aucune alerte si pas de CRITIQUE/HAUTE', () => {
    const snap = mkSnapshot({
      alerts: [mkAlert({ priority: 'INFO' })],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW });
    expect(out).toContain('Alertes : aucune');
  });

  it('respecte les limites maxTruies / maxBandes / maxAlerts', () => {
    const truies = Array.from({ length: 20 }, (_, i) =>
      mkTruie({ id: `T-${i}`, displayId: `T-${i}`, statut: 'Pleine' }),
    );
    const bandes = Array.from({ length: 20 }, (_, i) =>
      mkBande({ id: `B-${i}`, idPortee: `B-${i}` }),
    );
    const alerts = Array.from({ length: 20 }, (_, i) =>
      mkAlert({ id: `a${i}`, priority: 'HAUTE', subjectLabel: `S-${i}` }),
    );
    const out = buildFarmContextPrompt(
      mkSnapshot({ truies, bandes, alerts }),
      { now: NOW, maxTruies: 3, maxBandes: 2, maxAlerts: 4 },
    );
    // 3 truies -> on doit en compter T-0/T-1/T-2 mais pas T-10
    expect((out.match(/T-\d+/g) ?? []).length).toBeLessThanOrEqual(7); // marge pour subjectLabels alertes
    // 2 bandes seulement
    expect(out).toContain('B-0');
    expect(out).toContain('B-1');
    expect(out).not.toContain('B-10');
    // 4 alertes
    expect(out).toContain('Alertes prioritaires (4)');
  });

  it('snapshot — bloc complet avec données représentatives', () => {
    const snap = mkSnapshot({
      nomFerme: 'Ferme Liégeois',
      pays: 'France',
      truies: [
        mkTruie({ displayId: 'T-001', statut: 'En attente saillie', stade: 'J118 post-saillie' }),
        mkTruie({ displayId: 'T-016', statut: 'En maternité', stade: 'MB en retard 3j' }),
        mkTruie({ displayId: 'T-018', statut: 'En maternité', stade: 'J-2' }),
      ],
      verrats: [mkVerrat({ displayId: 'V-001' }), mkVerrat({ displayId: 'V-002' })],
      bandes: [
        mkBande({ id: 'B-26-T18-01', truie: 'T-018', vivants: 12, statut: 'Sous mère', dateSevragePrevue: '18/04/2026' }),
      ],
      stockAliment: [
        mkStockAliment({ libelle: 'Maïs', stockActuel: 0, statutStock: 'RUPTURE' }),
        mkStockAliment({ libelle: 'Aliment truie gestation', stockActuel: 0, statutStock: 'RUPTURE' }),
      ],
      stockVeto: [],
      alerts: [
        mkAlert({ priority: 'CRITIQUE', subjectLabel: 'T-016', title: 'Mise-bas en retard' }),
        mkAlert({ priority: 'HAUTE', subjectLabel: 'T-001', title: 'Retour chaleur attendu' }),
      ],
    });
    const out = buildFarmContextPrompt(snap, { now: NOW, userName: 'Christophe' });
    expect(out).toMatchInlineSnapshot(`
      "[CONTEXTE FERME — ne pas afficher dans la réponse, utilise-le pour répondre]
      Date : vendredi 2026-05-08. Utilisateur : Christophe.
      Ferme : Ferme Liégeois (France). Cheptel : 3 truies actives, 2 verrats actifs, 1 bandes en cours, 12 porcelets sous bandes.
      Truies à surveiller : T-016 (MB en retard 3j, En maternité) · T-018 (J-2, En maternité) · T-001 (J118 post-saillie, En attente saillie).
      Bandes en cours : B-26-T18-01 (Sous mère, mère T-018, 12 porcelets, sevrage 18/04/2026).
      Stocks critiques : Maïs 0kg (RUPTURE) · Aliment truie gestation 0kg (RUPTURE).
      Alertes prioritaires (2) : CRITIQUE T-016 — Mise-bas en retard · HAUTE T-001 — Retour chaleur attendu.
      [FIN CONTEXTE]"
    `);
  });

  it('reste sous 4000 caractères même avec 20 truies/bandes/alertes', () => {
    const truies = Array.from({ length: 20 }, (_, i) =>
      mkTruie({ id: `T-${i}`, displayId: `T-${i}`, statut: 'Pleine' }),
    );
    const bandes = Array.from({ length: 20 }, (_, i) =>
      mkBande({ id: `B-${i}`, idPortee: `B-${i}` }),
    );
    const alerts = Array.from({ length: 20 }, (_, i) =>
      mkAlert({ id: `a${i}`, priority: 'HAUTE', subjectLabel: `S-${i}` }),
    );
    const out = buildFarmContextPrompt(mkSnapshot({ truies, bandes, alerts }), { now: NOW });
    expect(out.length).toBeLessThan(4000);
  });
});

describe('prefixWithFarmContext', () => {
  it('encadre le user message après le bloc contexte', () => {
    const out = prefixWithFarmContext('Que faire avec T-001 ?', mkSnapshot(), {
      now: NOW,
      userName: 'Christophe',
    });
    expect(out).toMatch(/^\[CONTEXTE FERME/);
    expect(out).toMatch(/Question utilisateur : Que faire avec T-001 \?$/);
  });
});
