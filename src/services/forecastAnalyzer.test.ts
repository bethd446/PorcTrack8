/**
 * Tests unitaires — forecastAnalyzer
 * ══════════════════════════════════════
 * Couvre :
 *   • MB dans 2j → event CRITIQUE
 *   • Sevrage dans 5j → event HAUTE (<=3 serait HAUTE aussi, on cible 3j)
 *   • Retour chaleur pour bande sevrée il y a 4j → event HAUTE
 *   • Tri ASC par joursDans
 *   • Pressure by week : saturation FULL / OK
 *   • isoWeek helper : mardi W17 2026
 *   • Edge : aucune data → report vide
 */

import { describe, expect, it } from 'vitest';
import { buildForecast, isoWeek } from './forecastAnalyzer';
import type { Truie, BandePorcelets, Saillie } from '../types/farm';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTruie(over: Partial<Truie> = {}): Truie {
  return {
    id: 'T01',
    displayId: 'T01',
    boucle: 'B001',
    statut: 'Pleine',
    ration: 3,
    synced: true,
    ...over,
  };
}

function makeBande(over: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: `P${Math.random().toString(36).slice(2, 8)}`,
    idPortee: 'P-X',
    truie: 'T01',
    dateMB: '01/01/2025',
    nv: 12,
    morts: 1,
    vivants: 11,
    statut: 'Sous mère',
    synced: true,
    ...over,
  };
}

function makeSaillie(over: Partial<Saillie> = {}): Saillie {
  return {
    truieId: 'T01',
    dateSaillie: '01/09/2024',
    verratId: 'V01',
    dateMBPrevue: '24/12/2024',
    ...over,
  };
}

/**
 * Formate (y,m,d) en dd/MM/yyyy — format attendu en entrée.
 * `m` 1-indexed (janvier = 1).
 */
function fr(y: number, m: number, d: number): string {
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/** Construit une Date locale à minuit à partir de (y, m1-indexed, d). */
function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// ─── buildForecast ───────────────────────────────────────────────────────────

describe('buildForecast', () => {
  it('retourne un rapport vide (sans crash) quand aucune data', () => {
    const today = localDate(2026, 4, 17);
    const report = buildForecast({ truies: [], bandes: [], saillies: [] }, today);

    expect(report.horizon14jEvents).toEqual([]);
    expect(report.pressureByWeek).toHaveLength(4);
    expect(report.pressureByWeek.every(w => w.nbMBPrevues === 0)).toBe(true);
    expect(report.countByType.MB).toBe(0);
    expect(report.countByType.SEVRAGE).toBe(0);
  });

  it('MB dans 2j → event CRITIQUE', () => {
    const today = localDate(2026, 4, 17);
    const truies = [makeTruie({ dateMBPrevue: fr(2026, 4, 19) })];
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);

    const mbEvents = report.horizon14jEvents.filter(e => e.type === 'MB');
    expect(mbEvents).toHaveLength(1);
    expect(mbEvents[0].priority).toBe('CRITIQUE');
    expect(mbEvents[0].joursDans).toBe(2);
    expect(mbEvents[0].sujetId).toBe('T01');
  });

  it('MB dans 5j → event HAUTE', () => {
    const today = localDate(2026, 4, 17);
    const truies = [makeTruie({ dateMBPrevue: fr(2026, 4, 22) })];
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);

    const mb = report.horizon14jEvents.find(e => e.type === 'MB');
    expect(mb).toBeDefined();
    expect(mb?.priority).toBe('HAUTE');
    expect(mb?.joursDans).toBe(5);
  });

  it('MB dans 10j → event NORMALE (hors fenêtre HAUTE)', () => {
    const today = localDate(2026, 4, 17);
    const truies = [makeTruie({ dateMBPrevue: fr(2026, 4, 27) })];
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);

    const mb = report.horizon14jEvents.find(e => e.type === 'MB');
    expect(mb?.priority).toBe('NORMALE');
  });

  it('MB hors horizon 14j → ignoré', () => {
    const today = localDate(2026, 4, 17);
    const truies = [makeTruie({ dateMBPrevue: fr(2026, 5, 10) })];
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);
    expect(report.horizon14jEvents.filter(e => e.type === 'MB')).toHaveLength(0);
  });

  it('utilise saillie.dateMBPrevue si truie.dateMBPrevue absent', () => {
    const today = localDate(2026, 4, 17);
    const truies = [makeTruie({ dateMBPrevue: undefined })];
    const saillies = [
      makeSaillie({ truieId: 'T01', dateMBPrevue: fr(2026, 4, 20) }),
    ];
    const report = buildForecast({ truies, bandes: [], saillies }, today);
    const mb = report.horizon14jEvents.find(e => e.type === 'MB');
    expect(mb).toBeDefined();
    expect(mb?.joursDans).toBe(3);
  });

  it('Sevrage prévu dans 5j → event SEVRAGE', () => {
    const today = localDate(2026, 4, 17);
    const bandes = [
      makeBande({
        statut: 'Sous mère',
        dateSevragePrevue: fr(2026, 4, 22),
      }),
    ];
    const report = buildForecast({ truies: [], bandes, saillies: [] }, today);
    const sev = report.horizon14jEvents.find(e => e.type === 'SEVRAGE');
    expect(sev).toBeDefined();
    expect(sev?.joursDans).toBe(5);
    // > 3j donc NORMALE
    expect(sev?.priority).toBe('NORMALE');
  });

  it('Sevrage dans 2j → HAUTE', () => {
    const today = localDate(2026, 4, 17);
    const bandes = [
      makeBande({ statut: 'Sous mère', dateSevragePrevue: fr(2026, 4, 19) }),
    ];
    const report = buildForecast({ truies: [], bandes, saillies: [] }, today);
    const sev = report.horizon14jEvents.find(e => e.type === 'SEVRAGE');
    expect(sev?.priority).toBe('HAUTE');
  });

  it('Sevrage ignoré si bande déjà Sevrés', () => {
    const today = localDate(2026, 4, 17);
    const bandes = [
      makeBande({ statut: 'Sevrés', dateSevragePrevue: fr(2026, 4, 22) }),
    ];
    const report = buildForecast({ truies: [], bandes, saillies: [] }, today);
    expect(report.horizon14jEvents.filter(e => e.type === 'SEVRAGE')).toHaveLength(0);
  });

  it('Retour chaleur pour bande sevrée il y a 4j → event HAUTE', () => {
    // Sevrage réel = 13/04/2026 (today - 4j). Pic attendu J+6 = 19/04/2026 (today+2j).
    const today = localDate(2026, 4, 17);
    const truies = [makeTruie({ id: 'T07', displayId: 'T07', nom: 'Fleur' })];
    const bandes = [
      makeBande({
        truie: 'T07',
        dateSevrageReelle: fr(2026, 4, 13),
        statut: 'Sevrés',
      }),
    ];
    const report = buildForecast({ truies, bandes, saillies: [] }, today);
    const chal = report.horizon14jEvents.find(e => e.type === 'RETOUR_CHALEUR');
    expect(chal).toBeDefined();
    expect(chal?.sujetId).toBe('T07');
    // Pic à J+2 → HAUTE
    expect(chal?.priority).toBe('HAUTE');
  });

  it('Events triés ASC par joursDans', () => {
    const today = localDate(2026, 4, 17);
    const truies = [
      makeTruie({ id: 'T01', displayId: 'T01', dateMBPrevue: fr(2026, 4, 27) }), // J+10
      makeTruie({ id: 'T02', displayId: 'T02', dateMBPrevue: fr(2026, 4, 19) }), // J+2
      makeTruie({ id: 'T03', displayId: 'T03', dateMBPrevue: fr(2026, 4, 22) }), // J+5
    ];
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);
    const days = report.horizon14jEvents.map(e => e.joursDans);
    const sorted = [...days].sort((a, b) => a - b);
    expect(days).toEqual(sorted);
  });

  it('pressureByWeek : 10 MB en semaine X → saturation FULL', () => {
    const today = localDate(2026, 4, 20); // lundi 20 avril 2026 = semaine ISO 17
    // Crée 10 truies avec MB prévues toutes dans la semaine 17
    const truies: Truie[] = Array.from({ length: 10 }, (_, i) =>
      makeTruie({
        id: `T${String(i + 1).padStart(2, '0')}`,
        displayId: `T${String(i + 1).padStart(2, '0')}`,
        dateMBPrevue: fr(2026, 4, 22), // mercredi W17
      }),
    );
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);
    const w = report.pressureByWeek[0];
    expect(w.nbMBPrevues).toBe(10);
    expect(w.saturation).toBe('FULL');

    // Un event SATURATION doit exister
    const sat = report.horizon14jEvents.find(e => e.type === 'SATURATION');
    expect(sat).toBeDefined();
    expect(sat?.priority).toBe('CRITIQUE');
  });

  it('pressureByWeek : 5 MB dans une semaine → saturation OK', () => {
    const today = localDate(2026, 4, 20);
    const truies: Truie[] = Array.from({ length: 5 }, (_, i) =>
      makeTruie({
        id: `T${i}`,
        displayId: `T${i}`,
        dateMBPrevue: fr(2026, 4, 22),
      }),
    );
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);
    const w = report.pressureByWeek[0];
    expect(w.nbMBPrevues).toBe(5);
    expect(w.saturation).toBe('OK');
  });

  it('pressureByWeek : 7 MB → saturation HIGH', () => {
    const today = localDate(2026, 4, 20);
    const truies: Truie[] = Array.from({ length: 7 }, (_, i) =>
      makeTruie({
        id: `T${i}`,
        displayId: `T${i}`,
        dateMBPrevue: fr(2026, 4, 22),
      }),
    );
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);
    expect(report.pressureByWeek[0].saturation).toBe('HIGH');
  });

  it('topCritical : MB CRITIQUE (2j) > HAUTE/NORMALE', () => {
    const today = localDate(2026, 4, 17);
    const truies = [
      makeTruie({ id: 'T01', displayId: 'T01', dateMBPrevue: fr(2026, 4, 24) }), // J+7 HAUTE
      makeTruie({ id: 'T02', displayId: 'T02', dateMBPrevue: fr(2026, 4, 19) }), // J+2 CRITIQUE
    ];
    const report = buildForecast({ truies, bandes: [], saillies: [] }, today);
    expect(report.topCritical).toBeDefined();
    expect(report.topCritical?.priority).toBe('CRITIQUE');
    expect(report.topCritical?.sujetId).toBe('T02');
  });

  it('sujetNav : MB → truie, SEVRAGE → bande', () => {
    const today = localDate(2026, 4, 17);
    const truies = [makeTruie({ dateMBPrevue: fr(2026, 4, 20) })];
    const bandes = [
      makeBande({ statut: 'Sous mère', dateSevragePrevue: fr(2026, 4, 21) }),
    ];
    const report = buildForecast({ truies, bandes, saillies: [] }, today);
    const mb = report.horizon14jEvents.find(e => e.type === 'MB');
    const sev = report.horizon14jEvents.find(e => e.type === 'SEVRAGE');
    expect(mb?.sujetNav).toBe('truie');
    expect(sev?.sujetNav).toBe('bande');
  });

  it('pressureByWeek : finSemaine = dimanche (debut+6j), capaciteMaternite = 9', () => {
    const today = localDate(2026, 4, 20); // lundi W17
    const report = buildForecast({ truies: [], bandes: [], saillies: [] }, today);
    const w = report.pressureByWeek[0];
    expect(w.debutSemaine).toBe('2026-04-20');
    expect(w.finSemaine).toBe('2026-04-26');
    expect(w.capaciteMaternite).toBe(9);
  });

  it('countByType compte correctement', () => {
    const today = localDate(2026, 4, 17);
    const truies = [
      makeTruie({ id: 'T01', displayId: 'T01', dateMBPrevue: fr(2026, 4, 20) }),
      makeTruie({ id: 'T02', displayId: 'T02', dateMBPrevue: fr(2026, 4, 25) }),
    ];
    const bandes = [
      makeBande({ statut: 'Sous mère', dateSevragePrevue: fr(2026, 4, 22) }),
    ];
    const report = buildForecast({ truies, bandes, saillies: [] }, today);
    expect(report.countByType.MB).toBe(2);
    expect(report.countByType.SEVRAGE).toBe(1);
  });
});

// ─── isoWeek helper ─────────────────────────────────────────────────────────

describe('isoWeek', () => {
  it('mercredi 15 avril 2026 → "2026-W16"', () => {
    // 2026-04-15 est un mercredi, semaine ISO 16 (lundi 13 avril)
    expect(isoWeek(localDate(2026, 4, 15))).toBe('2026-W16');
  });

  it('mardi 21 avril 2026 → "2026-W17"', () => {
    // 2026-04-21 est un mardi, semaine ISO 17 (lundi 20 avril)
    expect(isoWeek(localDate(2026, 4, 21))).toBe('2026-W17');
  });

  it('lundi 20 avril 2026 → "2026-W17"', () => {
    expect(isoWeek(localDate(2026, 4, 20))).toBe('2026-W17');
  });

  it('dimanche 26 avril 2026 → "2026-W17" (fin de semaine)', () => {
    expect(isoWeek(localDate(2026, 4, 26))).toBe('2026-W17');
  });

  it('lundi 27 avril 2026 → "2026-W18" (début semaine suivante)', () => {
    expect(isoWeek(localDate(2026, 4, 27))).toBe('2026-W18');
  });

  it('1er janvier 2027 → "2026-W53" (année ISO différente année civile)', () => {
    // 1er jan 2027 = vendredi → semaine ISO 53 de 2026
    expect(isoWeek(localDate(2027, 1, 1))).toBe('2026-W53');
  });
});
