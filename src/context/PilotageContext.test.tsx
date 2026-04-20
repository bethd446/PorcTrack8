// @vitest-environment jsdom
/**
 * Vérifie que le `PilotageProvider` expose le slice pilotage
 * (alertes, saillies, finances) et calcule correctement
 * `criticalAlertCount` (CRITIQUE + HAUTE avec requiresAction).
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../services/farmDataLoader', async () => {
  const actual = await vi.importActual<typeof import('../services/farmDataLoader')>(
    '../services/farmDataLoader'
  );
  return { ...actual, refreshAll: vi.fn(async () => {}) };
});

import { PilotageProvider, usePilotage } from './PilotageContext';
import { __resetForTests, getSnapshot } from '../services/farmDataLoader';
import type { FarmAlert } from '../services/alertEngine';

function Probe() {
  const { alerts, alertesServeur, saillies, finances, criticalAlertCount } = usePilotage();
  return (
    <div>
      <span data-testid="alerts">{alerts.length}</span>
      <span data-testid="alertes-serveur">{alertesServeur.length}</span>
      <span data-testid="saillies">{saillies.length}</span>
      <span data-testid="finances">{finances.length}</span>
      <span data-testid="critical">{criticalAlertCount}</span>
    </div>
  );
}

describe('PilotageProvider', () => {
  beforeEach(() => {
    __resetForTests();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fournit les données de pilotage et compte les alertes critiques', () => {
    const alerts: FarmAlert[] = [
      {
        id: 'a1', rule: 'R1', priority: 'CRITIQUE', title: 'Mise-bas T01',
        message: '-', date: '2026-01-01', requiresAction: true, actions: [],
      } as unknown as FarmAlert,
      {
        id: 'a2', rule: 'R2', priority: 'HAUTE', title: 'Sevrage',
        message: '-', date: '2026-01-02', requiresAction: true, actions: [],
      } as unknown as FarmAlert,
      {
        // HAUTE mais requiresAction=false → ne compte pas
        id: 'a3', rule: 'R3', priority: 'HAUTE', title: 'Info',
        message: '-', date: '2026-01-03', requiresAction: false, actions: [],
      } as unknown as FarmAlert,
      {
        // INFO → ne compte pas
        id: 'a4', rule: 'R6', priority: 'INFO', title: 'Regroupement',
        message: '-', date: '2026-01-04', requiresAction: true, actions: [],
      } as unknown as FarmAlert,
    ];

    const snap = getSnapshot('pilotage');
    snap.alerts = alerts;
    snap.alertesServeur = [];
    snap.saillies = [];
    snap.finances = [];

    render(
      <PilotageProvider>
        <Probe />
      </PilotageProvider>
    );

    expect(screen.getByTestId('alerts').textContent).toBe('4');
    expect(screen.getByTestId('alertes-serveur').textContent).toBe('0');
    expect(screen.getByTestId('saillies').textContent).toBe('0');
    expect(screen.getByTestId('finances').textContent).toBe('0');
    // CRITIQUE + HAUTE-avec-requiresAction = 2
    expect(screen.getByTestId('critical').textContent).toBe('2');
  });
});
