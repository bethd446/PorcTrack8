// @vitest-environment jsdom
/**
 * Tests unitaires — PhotoGallery cancelled flag (V74 Vague V)
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie que le composant ne déclenche pas de setState après unmount, ce qui
 * prévient les warnings React "setState on unmounted component" et les fuites
 * mémoire quand l'utilisateur navigue rapidement entre fiches truie / verrat.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// Stub photoUpload pour contrôler la résolution async
let resolveListPhotos: ((photos: unknown[]) => void) | null = null;
vi.mock('../../../../services/photoUpload', () => ({
  listEntityPhotos: vi.fn(() => {
    return new Promise((resolve) => {
      resolveListPhotos = (photos) => resolve(photos);
    });
  }),
  deleteEntityPhoto: vi.fn(),
}));

import PhotoGallery from '../PhotoGallery';

describe('PhotoGallery — cancelled flag', () => {
  beforeEach(() => {
    resolveListPhotos = null;
    cleanup();
  });

  it('n\'appelle pas setState après unmount (pas de warning React)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(
      <PhotoGallery entityType="truie" entityId="T01" />,
    );

    // Unmount AVANT que le fetch ne résolve
    unmount();

    // Maintenant on résout la Promise du fetch — si le cleanup fonctionne,
    // le setPhotos / setLoading ne doit pas être déclenché.
    if (resolveListPhotos) {
      resolveListPhotos([{ path: 'p1', url: '/p1.jpg' }]);
    }

    // Attendre flush des microtasks
    await new Promise((r) => setTimeout(r, 10));

    // Vérifie qu'aucun warning "setState on unmounted" n'a été émis
    const stateWarnings = consoleErrorSpy.mock.calls.filter((args) => {
      const msg = String(args[0] ?? '');
      return /setState.*unmounted|memory leak|update.*unmounted/i.test(msg);
    });
    expect(stateWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});
