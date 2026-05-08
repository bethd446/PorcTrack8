// @vitest-environment jsdom
/**
 * V72 — SynchronisationV70 smoke tests.
 *
 * Vérifie : rendu titre, vide vs avec items, retry user (call to retryAll),
 * affichage erreurs définitives.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => {
  return {
    flushQueueMock: vi.fn(async () => ({ success: true, processed: 0, remaining: 0, abandoned: 0, skipped: 0 })),
    retryAllMock: vi.fn(async () => 0),
    retryItemMock: vi.fn(async () => true),
    clearQueueMock: vi.fn(async () => undefined),
    clearArchiveMock: vi.fn(async () => undefined),
    state: { items: [] as unknown[], archive: [] as unknown[], online: true },
  };
});

vi.mock('../../../services/offlineQueue', () => ({
  flushQueue: mocks.flushQueueMock,
  getQueueItems: () => mocks.state.items,
  getArchivedItems: () => mocks.state.archive,
  retryItem: mocks.retryItemMock,
  retryAll: mocks.retryAllMock,
  clearQueue: mocks.clearQueueMock,
  clearArchive: mocks.clearArchiveMock,
  isOnline: () => mocks.state.online,
}));

import { SynchronisationV70 } from '../SynchronisationV70';

afterEach(() => {
  cleanup();
  mocks.state.items = [];
  mocks.state.archive = [];
  mocks.state.online = true;
  mocks.flushQueueMock.mockClear();
  mocks.retryAllMock.mockClear();
  mocks.retryItemMock.mockClear();
  mocks.clearQueueMock.mockClear();
  mocks.clearArchiveMock.mockClear();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <SynchronisationV70 />
    </MemoryRouter>,
  );

describe('SynchronisationV70 — V72', () => {
  it('rend le titre File d\'attente', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /file d'attente/i })).toBeTruthy();
  });

  it('rend l\'état vide quand aucune action en attente', () => {
    renderPage();
    expect(screen.getAllByText(/tout est synchronisé/i).length).toBeGreaterThan(0);
    // Pas de bouton "Tout retry" en état vide
    expect(screen.queryByRole('button', { name: /tout retry/i })).toBeNull();
  });

  it('affiche les items en attente avec leur label métier', () => {
    mocks.state.items = [
      {
        id: 'INS-1',
        mutation: { kind: 'insert', table: 'sows', values: { id: 'u1', code_id: 'T-1' } },
        timestamp: new Date().toISOString(),
        tries: 0,
      },
      {
        id: 'UPD-1',
        mutation: { kind: 'update', table: 'batches', id: 'b1', fields: { status: 'closed' } },
        timestamp: new Date().toISOString(),
        tries: 1,
        lastError: 'network timeout',
        nextAttemptAt: Date.now() + 5_000,
      },
    ];
    renderPage();
    expect(screen.getByText(/création truie/i)).toBeTruthy();
    expect(screen.getByText(/modification bande/i)).toBeTruthy();
    expect(screen.getByText(/network timeout/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /tout retry/i })).toBeTruthy();
  });

  it('clic sur "Tout retry" appelle retryAll + flushQueue', async () => {
    mocks.state.items = [
      {
        id: 'INS-1',
        mutation: { kind: 'insert', table: 'sows', values: { id: 'u1' } },
        timestamp: new Date().toISOString(),
        tries: 1,
      },
    ];
    renderPage();
    const btn = screen.getByRole('button', { name: /tout retry/i });
    fireEvent.click(btn);
    // Laisse les promises se résoudre.
    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.retryAllMock).toHaveBeenCalled();
    expect(mocks.flushQueueMock).toHaveBeenCalled();
  });

  it('affiche la section archive quand des actions sont abandonnées', () => {
    mocks.state.archive = [
      {
        id: 'INS-X',
        mutation: { kind: 'insert', table: 'health_logs', values: {} },
        timestamp: new Date().toISOString(),
        tries: 5,
        lastError: 'server 500',
        archivedAt: new Date().toISOString(),
      },
    ];
    renderPage();
    expect(screen.getByText(/erreurs définitives/i)).toBeTruthy();
    expect(screen.getByText(/création santé/i)).toBeTruthy();
    expect(screen.getByText(/server 500/i)).toBeTruthy();
  });

  it('bandeau hors-ligne quand offline', () => {
    mocks.state.online = false;
    renderPage();
    expect(screen.getByText(/hors ligne/i)).toBeTruthy();
  });
});
