// @vitest-environment jsdom
/**
 * Tests unitaires — TruieEventActionSheet
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Function pure orderActions(canonique) — table-test (aucun render)
 *   2. Render avec différents statuts → ordre des boutons d'action correct
 *   3. Click sur action → callback onSelect(kind) avec le bon kind
 *   4. Title "Saisir un évènement pour T13" (truieDisplayId injecté)
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock BottomSheet (Ionic-based) → simple <div role="dialog">
vi.mock('../agritech', () => ({
  BottomSheet: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    height?: string;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {title ? <h2>{title}</h2> : null}
        {children}
      </div>
    ) : null,
}));

import TruieEventActionSheet, {
  orderActions,
  type TruieEventAction,
} from './TruieEventActionSheet';

afterEach(() => {
  cleanup();
});

/* ── 1. orderActions — table-test ─────────────────────────────────────── */

describe('orderActions (pure)', () => {
  const cases: Array<[string, Parameters<typeof orderActions>[0], TruieEventAction[]]> = [
    [
      'VIDE → Saillie hero',
      'VIDE',
      ['SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS', 'MORTALITE'],
    ],
    [
      'CHALEUR → Saillie hero',
      'CHALEUR',
      ['SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS', 'MORTALITE'],
    ],
    [
      'PLEINE → Échographie hero',
      'PLEINE',
      ['ECHOGRAPHIE', 'MISE_BAS', 'SAILLIE', 'MORTALITE'],
    ],
    [
      'MATERNITE → Mise-bas hero',
      'MATERNITE',
      ['MISE_BAS', 'SAILLIE', 'ECHOGRAPHIE', 'MORTALITE'],
    ],
    [
      'REFORME → Mortalité hero',
      'REFORME',
      ['MORTALITE', 'SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS'],
    ],
    [
      'INCONNU → fallback (Saillie)',
      'INCONNU',
      ['SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS', 'MORTALITE'],
    ],
    [
      'SURVEILLANCE → fallback',
      'SURVEILLANCE',
      ['SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS', 'MORTALITE'],
    ],
    [
      'FLUSHING → fallback',
      'FLUSHING',
      ['SAILLIE', 'ECHOGRAPHIE', 'MISE_BAS', 'MORTALITE'],
    ],
  ];

  for (const [label, statut, expected] of cases) {
    it(label, () => {
      expect(orderActions(statut)).toEqual(expected);
    });
  }
});

/* ── 2. Render order par statut ───────────────────────────────────────── */

function getActionButtonsInOrder(): string[] {
  // On lit l'aria-label de chaque action-button (format "Title — Subtitle")
  // pour récupérer le titre. C'est robuste aux changements de classe CSS.
  const titles = ['Saillie', 'Échographie', 'Mise-bas', 'Mortalité'];
  const allButtons = Array.from(document.querySelectorAll('button'));
  return allButtons
    .map((b) => {
      const aria = b.getAttribute('aria-label') ?? '';
      const title = aria.split('—')[0]?.trim() ?? '';
      return title;
    })
    .filter((t) => titles.includes(t));
}

describe('TruieEventActionSheet — ordre rendu selon statut', () => {
  const baseProps = {
    isOpen: true,
    onClose: () => {},
    truieDisplayId: 'T13',
    onSelect: () => {},
  };

  it('statut "Vide" → ordre Saillie, Échographie, Mise-bas, Mortalité', () => {
    render(<TruieEventActionSheet {...baseProps} truieStatut="Vide" />);
    expect(getActionButtonsInOrder()).toEqual([
      'Saillie',
      'Échographie',
      'Mise-bas',
      'Mortalité',
    ]);
  });

  it('statut "Chaleur" → Saillie hero', () => {
    render(<TruieEventActionSheet {...baseProps} truieStatut="Chaleur" />);
    expect(getActionButtonsInOrder()).toEqual([
      'Saillie',
      'Échographie',
      'Mise-bas',
      'Mortalité',
    ]);
  });

  it('statut "En attente saillie" → normalisé VIDE → Saillie hero', () => {
    render(<TruieEventActionSheet {...baseProps} truieStatut="En attente saillie" />);
    expect(getActionButtonsInOrder()).toEqual([
      'Saillie',
      'Échographie',
      'Mise-bas',
      'Mortalité',
    ]);
  });

  it('statut "Pleine" → Échographie hero', () => {
    render(<TruieEventActionSheet {...baseProps} truieStatut="Pleine" />);
    expect(getActionButtonsInOrder()).toEqual([
      'Échographie',
      'Mise-bas',
      'Saillie',
      'Mortalité',
    ]);
  });

  it('statut "Maternité" → Mise-bas hero', () => {
    render(<TruieEventActionSheet {...baseProps} truieStatut="Maternité" />);
    expect(getActionButtonsInOrder()).toEqual([
      'Mise-bas',
      'Saillie',
      'Échographie',
      'Mortalité',
    ]);
  });

  it('statut "Allaitante" → normalisé MATERNITE → Mise-bas hero', () => {
    render(<TruieEventActionSheet {...baseProps} truieStatut="Allaitante" />);
    expect(getActionButtonsInOrder()).toEqual([
      'Mise-bas',
      'Saillie',
      'Échographie',
      'Mortalité',
    ]);
  });

  it('statut "Réforme" → Mortalité hero', () => {
    render(<TruieEventActionSheet {...baseProps} truieStatut="Réforme" />);
    const order = getActionButtonsInOrder();
    expect(order[0]).toBe('Mortalité');
    expect(order).toEqual(['Mortalité', 'Saillie', 'Échographie', 'Mise-bas']);
  });
});

/* ── 3. Callback onSelect ─────────────────────────────────────────────── */

describe('TruieEventActionSheet — callback onSelect(kind)', () => {
  it('click sur Saillie → onSelect("SAILLIE")', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TruieEventActionSheet
        isOpen={true}
        onClose={() => {}}
        truieDisplayId="T13"
        truieStatut="Vide"
        onSelect={onSelect}
      />,
    );
    const btn = screen.getByRole('button', { name: /Saillie — Enregistrer une saillie/i });
    await user.click(btn);
    expect(onSelect).toHaveBeenCalledWith('SAILLIE');
  });

  it('click sur Mise-bas → onSelect("MISE_BAS")', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TruieEventActionSheet
        isOpen={true}
        onClose={() => {}}
        truieDisplayId="T13"
        truieStatut="Maternité"
        onSelect={onSelect}
      />,
    );
    const btn = screen.getByRole('button', { name: /Mise-bas — Enregistrer la portée/i });
    await user.click(btn);
    expect(onSelect).toHaveBeenCalledWith('MISE_BAS');
  });

  it('click sur Mortalité → onSelect("MORTALITE")', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TruieEventActionSheet
        isOpen={true}
        onClose={() => {}}
        truieDisplayId="T13"
        truieStatut="Réforme"
        onSelect={onSelect}
      />,
    );
    const btn = screen.getByRole('button', {
      name: /Mortalité — Déclarer la mort de la truie/i,
    });
    await user.click(btn);
    expect(onSelect).toHaveBeenCalledWith('MORTALITE');
  });

  it('click sur Échographie → onSelect("ECHOGRAPHIE")', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TruieEventActionSheet
        isOpen={true}
        onClose={() => {}}
        truieDisplayId="T13"
        truieStatut="Pleine"
        onSelect={onSelect}
      />,
    );
    const btn = screen.getByRole('button', {
      name: /Échographie — Confirmer la gestation/i,
    });
    await user.click(btn);
    expect(onSelect).toHaveBeenCalledWith('ECHOGRAPHIE');
  });
});

/* ── 4. Title contient le truieDisplayId ──────────────────────────────── */

describe('TruieEventActionSheet — title', () => {
  it('title = "Saisir un évènement pour T13"', () => {
    render(
      <TruieEventActionSheet
        isOpen={true}
        onClose={() => {}}
        truieDisplayId="T13"
        truieStatut="Vide"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe(
      'Saisir un évènement pour T13',
    );
    expect(
      screen.getByRole('heading', { name: 'Saisir un évènement pour T13' }),
    ).toBeDefined();
  });

  it('title reflète un autre truieDisplayId (ex: "T07")', () => {
    render(
      <TruieEventActionSheet
        isOpen={true}
        onClose={() => {}}
        truieDisplayId="T07"
        truieStatut="Vide"
        onSelect={() => {}}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Saisir un évènement pour T07' }),
    ).toBeDefined();
  });

  it('rend null si isOpen=false', () => {
    const { container } = render(
      <TruieEventActionSheet
        isOpen={false}
        onClose={() => {}}
        truieDisplayId="T13"
        truieStatut="Vide"
        onSelect={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
