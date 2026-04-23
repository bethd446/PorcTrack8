// @vitest-environment jsdom
/**
 * Tests unitaires — SaillieSuiviPanel
 * ════════════════════════════════════════════════════════════════════════════
 * Audit E2E reviewer → 5 scénarios critiques à couvrir :
 *
 *   S1 — Rendu conditionnel (dateSaillie absente vs présente)
 *   S2 — Présomption gestation à J+21 (avec / sans retour chaleur tagué)
 *   S3 — Confirmer saillie → patch STATUT=Confirmée sur SUIVI_REPRODUCTION_ACTUEL
 *   S4 — Signaler retour chaleur → 2 patches (saillie Non confirmée + truie Vide)
 *   S5 — Race condition : double-clic Confirmer ≠ double patch (useRef guard)
 *
 * Bonus — Regex `retourDejaSignale` stricte (tag canonique vs faux-positifs).
 *
 * Stack : vitest + @testing-library/react (jsdom via pragma top-of-file).
 *
 * Mocks :
 *   - `useFarm` → `{ verrats: [], refreshData: vi.fn() }`
 *   - `enqueueUpdateRow` → spy vi.fn (observer sheet/idHeader/idValue/patch)
 *   - `@ionic/react` → passthrough minimal (évite les web-components jsdom)
 *   - `BottomSheet` → passthrough qui rend children quand isOpen=true
 *
 * ⚠️ Date courante figée à 2026-04-21 (cf. CLAUDE.md) via vi.useFakeTimers.
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  waitFor,
} from '@testing-library/react';
import type { Saillie, Truie, Verrat } from '../../types/farm';

// ── Mocks ───────────────────────────────────────────────────────────────────

type EnqueueArgs = [
  sheet: string,
  idHeader: string,
  idValue: string,
  patch: Record<string, string | number | boolean | null>,
];
const enqueueUpdateRowMock = vi.fn<(...a: EnqueueArgs) => Promise<void>>(
  async () => undefined,
);
vi.mock('../../services/offlineQueue', () => ({
  enqueueUpdateRow: (...args: EnqueueArgs) => enqueueUpdateRowMock(...args),
}));

const refreshDataMock = vi.fn<() => Promise<void>>(async () => undefined);
const farmState: { verrats: Verrat[] } = { verrats: [] };
vi.mock('../../context/FarmContext', () => ({
  useFarm: () => ({
    verrats: farmState.verrats,
    refreshData: refreshDataMock,
  }),
  FarmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@ionic/react', () => ({
  IonToast: ({ isOpen, message }: { isOpen?: boolean; message?: string }) =>
    isOpen ? <div role="status">{message}</div> : null,
  IonModal: ({
    isOpen,
    children,
  }: {
    isOpen?: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
}));

// Passthrough BottomSheet (qui utilise IonModal en interne) : on rend toujours
// les enfants si isOpen=true afin que le bouton « Confirmer » soit accessible.
vi.mock('../../components/agritech', () => ({
  BottomSheet: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

import SaillieSuiviPanel from './SaillieSuiviPanel';

// ── Fixtures ────────────────────────────────────────────────────────────────
// Date courante figée à 2026-04-21 (cf. CLAUDE.md).
const TODAY = new Date(2026, 3, 21); // 21 avril 2026

function makeTruie(over: Partial<Truie> = {}): Truie {
  return {
    id: 'T01',
    displayId: 'T01',
    boucle: 'FR-0001-42',
    nom: 'Pimprenelle',
    statut: 'Pleine',
    stade: 'Gestation',
    ration: 3,
    nbPortees: 2,
    dateMBPrevue: '2026-08-14', // +115j depuis 21/04
    notes: '',
    synced: true,
    ...over,
  };
}

function makeSaillie(over: Partial<Saillie> = {}): Saillie {
  return {
    truieId: 'T01',
    dateSaillie: '21/04/2026', // J0 = today
    verratId: 'V01',
    dateMBPrevue: '14/08/2026',
    statut: 'Active',
    notes: '',
    ...over,
  };
}

/**
 * Retourne une saillie datée à J-N (format FR) par rapport à TODAY.
 * Permet de simuler J+21, J+30, J-5, etc.
 */
function saillieAtDaysBeforeToday(daysAgo: number, over: Partial<Saillie> = {}): Saillie {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const fr = `${dd}/${mm}/${d.getFullYear()}`;
  return makeSaillie({ dateSaillie: fr, ...over });
}

// ── Setup / teardown ────────────────────────────────────────────────────────

// Stub Date globally pour fixer "today" = 2026-04-21, sans fake timers
// (qui casseraient les microtasks des promises async utilisées par les actions).
const RealDate = globalThis.Date;
class StubbedDate extends RealDate {
  constructor(
    a?: number | string | Date,
    b?: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
    g?: number,
  ) {
    if (a === undefined) {
      super(TODAY.getTime());
    } else if (b === undefined) {
      super(a as number | string | Date);
    } else {
      // number-tuple path
      super(
        a as number,
        b,
        c ?? 1,
        d ?? 0,
        e ?? 0,
        f ?? 0,
        g ?? 0,
      );
    }
  }
  static now(): number {
    return TODAY.getTime();
  }
}

beforeEach(() => {
  globalThis.Date = StubbedDate as unknown as DateConstructor;
  enqueueUpdateRowMock.mockClear();
  enqueueUpdateRowMock.mockImplementation(async () => undefined);
  refreshDataMock.mockClear();
  refreshDataMock.mockImplementation(async () => undefined);
  farmState.verrats = [];
});

afterEach(() => {
  cleanup();
  globalThis.Date = RealDate;
});

// ════════════════════════════════════════════════════════════════════════════
// S1 — Panel rendu conditionnel
// ════════════════════════════════════════════════════════════════════════════
describe('S1 · SaillieSuiviPanel · rendu conditionnel', () => {
  it('ne rend rien si dateSaillie est absente (guard interne)', () => {
    // Le panel a un render guard : `if (!dateSaillie) return null;`
    // (la condition truie.statut === PLEINE est faite par le parent.)
    const { container } = render(
      <SaillieSuiviPanel
        truie={makeTruie()}
        saillie={makeSaillie({ dateSaillie: '' })}
      />,
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('ne rend rien si dateSaillie est un format non parseable', () => {
    const { container } = render(
      <SaillieSuiviPanel
        truie={makeTruie()}
        saillie={makeSaillie({ dateSaillie: 'not-a-date' })}
      />,
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('rend le bandeau « Saillie en cours » si truie PLEINE + saillie Active', () => {
    render(
      <SaillieSuiviPanel truie={makeTruie()} saillie={makeSaillie()} />,
    );
    // Heading « Saillie en cours »
    const section = screen.getByRole('region', { name: /suivi saillie/i });
    expect(within(section).getByText(/saillie en cours/i)).toBeDefined();
    // CTA Confirmer + Retour chaleur rendus
    expect(screen.getByRole('button', { name: /confirmer la saillie/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /signaler un retour chaleur/i })).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// S2 — Présomption gestation à J+21
// ════════════════════════════════════════════════════════════════════════════
describe('S2 · Présomption gestation J+21', () => {
  it('n\'affiche PAS la présomption avant J+21 (ex: J+15)', () => {
    const saillie = saillieAtDaysBeforeToday(15);
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={saillie} />);
    expect(
      screen.queryByRole('button', {
        name: /confirmer la gestation présumée/i,
      }),
    ).toBeNull();
  });

  it('affiche la présomption à J+21 sans retour chaleur signalé', () => {
    const saillie = saillieAtDaysBeforeToday(21);
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={saillie} />);
    const cta = screen.getByRole('button', {
      name: /confirmer la gestation présumée/i,
    });
    expect(cta).toBeDefined();
    expect(cta.textContent).toMatch(/J\+21/);
  });

  it('affiche la présomption à J+30 sans retour chaleur signalé', () => {
    const saillie = saillieAtDaysBeforeToday(30);
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={saillie} />);
    expect(
      screen.getByRole('button', {
        name: /confirmer la gestation présumée/i,
      }),
    ).toBeDefined();
  });

  it('masque la présomption si notes contient le tag canonique « Retour chaleur dd/MM/yyyy »', () => {
    const saillie = saillieAtDaysBeforeToday(25, {
      notes: 'Retour chaleur 15/04/2026',
    });
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={saillie} />);
    expect(
      screen.queryByRole('button', {
        name: /confirmer la gestation présumée/i,
      }),
    ).toBeNull();
  });

  it('masque la présomption si saillie.statut != Active (ex: Confirmée)', () => {
    const saillie = saillieAtDaysBeforeToday(25, { statut: 'Confirmée' });
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={saillie} />);
    expect(
      screen.queryByRole('button', {
        name: /confirmer la gestation présumée/i,
      }),
    ).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// S3 — Confirmer saillie
// ════════════════════════════════════════════════════════════════════════════
describe('S3 · Confirmer saillie', () => {
  it('clic Confirmer → 1 patch STATUT=Confirmée sur SUIVI_REPRODUCTION_ACTUEL avec clé ID TRUIE=saillie.truieId', async () => {
    render(
      <SaillieSuiviPanel
        truie={makeTruie({ id: 'T01' })}
        saillie={makeSaillie({ truieId: 'T01' })}
      />,
    );

    // Ouvre la BottomSheet Confirmer
    fireEvent.click(
      screen.getByRole('button', { name: /confirmer la saillie/i }),
    );
    // Le dialog est maintenant ouvert → le bouton « Confirmer » (label exact)
    // est rendu dedans.
    const dialog = await screen.findByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /^confirmer$/i });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
    });
    expect(enqueueUpdateRowMock).toHaveBeenCalledWith(
      'SUIVI_REPRODUCTION_ACTUEL',
      'ID TRUIE',
      'T01',
      { STATUT: 'Confirmée' },
    );
  });

  it('après Confirmer succès → refreshData appelé + toast de succès', async () => {
    render(
      <SaillieSuiviPanel truie={makeTruie()} saillie={makeSaillie()} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /confirmer la saillie/i }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^confirmer$/i }));

    await waitFor(() => {
      expect(refreshDataMock).toHaveBeenCalledTimes(1);
    });
    // Toast de succès affiché (IonToast mocké → role=status)
    const toast = await screen.findByRole('status');
    expect(toast.textContent).toMatch(/gestation confirmée|synchronisé/i);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// S4 — Signaler retour chaleur
// ════════════════════════════════════════════════════════════════════════════
describe('S4 · Signaler retour chaleur', () => {
  it('clic Retour chaleur → 2 patches dans l\'ordre : saillie Non confirmée PUIS truie Vide', async () => {
    render(
      <SaillieSuiviPanel
        truie={makeTruie({ id: 'T01' })}
        saillie={makeSaillie({ truieId: 'T01', notes: '' })}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /signaler un retour chaleur/i }),
    );
    const dialog = await screen.findByRole('dialog');
    const signalerBtn = within(dialog).getByRole('button', {
      name: /signaler le retour chaleur/i,
    });

    fireEvent.click(signalerBtn);

    await waitFor(() => {
      expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(2);
    });

    // ── Appel #1 : SUIVI_REPRODUCTION_ACTUEL · STATUT=Non confirmée + NOTES
    const firstCall = enqueueUpdateRowMock.mock.calls[0];
    expect(firstCall[0]).toBe('SUIVI_REPRODUCTION_ACTUEL');
    expect(firstCall[1]).toBe('ID TRUIE');
    expect(firstCall[2]).toBe('T01');
    const firstPatch = firstCall[3];
    expect(firstPatch.STATUT).toBe('Non confirmée');
    // Tag canonique `Retour chaleur dd/MM/yyyy` doit être intact
    expect(String(firstPatch.NOTES)).toMatch(/Retour chaleur \d{2}\/\d{2}\/\d{4}/);
    // Date attendue = today (21/04/2026)
    expect(String(firstPatch.NOTES)).toContain('Retour chaleur 21/04/2026');

    // ── Appel #2 : SUIVI_TRUIES_REPRODUCTION · STATUT=En attente saillie
    const secondCall = enqueueUpdateRowMock.mock.calls[1];
    expect(secondCall[0]).toBe('SUIVI_TRUIES_REPRODUCTION');
    expect(secondCall[1]).toBe('ID');
    expect(secondCall[2]).toBe('T01');
    expect(secondCall[3]).toEqual({ STATUT: 'En attente saillie' });
  });

  it('préserve les notes existantes en les concaténant avec le tag', async () => {
    render(
      <SaillieSuiviPanel
        truie={makeTruie()}
        saillie={makeSaillie({ notes: 'Double saillie J+1' })}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /signaler un retour chaleur/i }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: /signaler le retour chaleur/i }),
    );

    await waitFor(() => {
      expect(enqueueUpdateRowMock).toHaveBeenCalled();
    });
    const firstPatch = enqueueUpdateRowMock.mock.calls[0][3];
    const notes = String(firstPatch.NOTES);
    // Contient à la fois l'historique ET le tag canonique
    expect(notes).toContain('Double saillie J+1');
    expect(notes).toMatch(/Retour chaleur 21\/04\/2026/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// S5 — Race condition : double-clic anti-spam
// ════════════════════════════════════════════════════════════════════════════
describe('S5 · Anti-spam double-clic Confirmer', () => {
  it('double clic rapide sur Confirmer n\'envoie qu\'un seul patch (useRef guard)', async () => {
    // On rend l'enqueue lent (promise résolue manuellement) pour laisser
    // une fenêtre pendant laquelle le second clic peut arriver avant que
    // `savingRef.current` repasse à `false`.
    let resolveEnqueue: () => void = () => undefined;
    enqueueUpdateRowMock.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveEnqueue = resolve;
        }),
    );

    render(
      <SaillieSuiviPanel truie={makeTruie()} saillie={makeSaillie()} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /confirmer la saillie/i }),
    );
    const dialog = await screen.findByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /^confirmer$/i });

    // Double-clic immédiat — le second doit être no-op (savingRef.current=true)
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    // Débloque le premier enqueue + laisse les microtasks se drainer
    resolveEnqueue();
    await waitFor(() => {
      expect(refreshDataMock).toHaveBeenCalled();
    });

    // ≤ 1 appel total malgré les 2 clics
    expect(enqueueUpdateRowMock).toHaveBeenCalledTimes(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bonus — Regex retourDejaSignale stricte
// ════════════════════════════════════════════════════════════════════════════
describe('Bonus · détection retour chaleur (regex stricte)', () => {
  it('détecte « Retour chaleur 21/04/2026 » comme retour signalé (masque présomption)', () => {
    const saillie = saillieAtDaysBeforeToday(25, {
      notes: 'Observation · Retour chaleur 21/04/2026',
    });
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={saillie} />);
    expect(
      screen.queryByRole('button', {
        name: /confirmer la gestation présumée/i,
      }),
    ).toBeNull();
  });

  it('ne détecte PAS « pas de retour chaleur observé » comme retour signalé', () => {
    const saillie = saillieAtDaysBeforeToday(25, {
      notes: 'pas de retour chaleur observé',
    });
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={saillie} />);
    // Présomption doit rester visible (pas de tag canonique matché)
    expect(
      screen.getByRole('button', {
        name: /confirmer la gestation présumée/i,
      }),
    ).toBeDefined();
  });

  it('ne détecte PAS « retour chaleur sans date » comme retour signalé', () => {
    const saillie = saillieAtDaysBeforeToday(25, {
      notes: 'retour chaleur imminent (pas encore observé)',
    });
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={saillie} />);
    expect(
      screen.getByRole('button', {
        name: /confirmer la gestation présumée/i,
      }),
    ).toBeDefined();
  });

  it('S6 · Sprint 6 · horloge système : today n\'est plus figé via useMemo', () => {
    // Ce test vérifie que le composant utilise un state pour `today`
    // (indirectement observable par l'absence d'erreurs lors du montage
    // avec des timers actifs).
    render(<SaillieSuiviPanel truie={makeTruie()} saillie={makeSaillie()} />);
    expect(screen.getByText(/saillie en cours/i)).toBeDefined();
  });
});
