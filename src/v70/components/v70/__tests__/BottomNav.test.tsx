// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveActiveTab } from '../BottomNav';

describe('resolveActiveTab — longest-prefix match', () => {
  it('matche /today → today', () => {
    expect(resolveActiveTab('/today')).toBe('today');
  });

  it('matche /troupeau et sous-routes → animals', () => {
    expect(resolveActiveTab('/troupeau')).toBe('animals');
    expect(resolveActiveTab('/troupeau/truies/123')).toBe('animals');
  });

  it('matche /reproduction et /cycles → repro', () => {
    expect(resolveActiveTab('/reproduction')).toBe('repro');
    expect(resolveActiveTab('/cycles')).toBe('repro');
    expect(resolveActiveTab('/cycles/maternite')).toBe('repro');
  });

  it('matche /performance et /pilotage → perf', () => {
    expect(resolveActiveTab('/performance')).toBe('perf');
    expect(resolveActiveTab('/pilotage')).toBe('perf');
  });

  it('matche /reglages et alias → settings', () => {
    expect(resolveActiveTab('/reglages')).toBe('settings');
    expect(resolveActiveTab('/more')).toBe('settings');
    expect(resolveActiveTab('/ressources')).toBe('settings');
    expect(resolveActiveTab('/protocoles')).toBe('settings');
  });

  // Bug B7 — routes hors-shell ne doivent PAS surligner "Aujourd'hui".
  // Christophe a remonté que /alerts gardait le tab today actif (fallback
  // historique). Le fix vague 1 (A7) ciblait AgritechNavV2 mais le shell
  // monte BottomNavV70 → c'est ici qu'il fallait corriger.
  it('retourne null sur /alerts (route outil sans tab dédié)', () => {
    expect(resolveActiveTab('/alerts')).toBeNull();
  });

  it('retourne null sur /controle, /audit, /marius', () => {
    expect(resolveActiveTab('/controle')).toBeNull();
    expect(resolveActiveTab('/audit')).toBeNull();
    expect(resolveActiveTab('/marius')).toBeNull();
  });

  it('retourne null sur un pathname totalement inconnu', () => {
    expect(resolveActiveTab('/totalement-inconnu')).toBeNull();
  });

  it('préserve longest-prefix : /reglages/encyclopedie → settings', () => {
    expect(resolveActiveTab('/reglages/encyclopedie')).toBe('settings');
  });
});
