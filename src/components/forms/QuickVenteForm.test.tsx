/**
 * Tests unitaires — QuickVenteForm (logique pure + intégration queue)
 * ═════════════════════════════════════════════════════════════════════
 * Vitest tourne en environnement `node` (pas jsdom) pour ce projet. On
 * teste donc les helpers purs exportés par `quickVenteLogic`, qui portent
 * toute la logique métier de la vente :
 *
 *   1. Render avec bande           → buildVentePayloads initialise les payloads
 *   2. Validation nb > vivants     → rejetée par validateVente
 *   3. Validation prix ≤ 0         → rejetée par validateVente
 *   4. Submit = 2 enqueues (bande update + finance append)
 *   5. Montant auto-calculé        → computeVenteMontant(nb, poids, prix)
 *   6. Vivants = 0 après vente     → bandePatch.STATUT = 'Vendue'
 *
 * Les deux enqueues passent par `enqueueUpdateRow` puis `enqueueAppendRow`
 * (ordre préservé : bande AVANT finance, pour ne pas créer de comptabilité
 * orpheline en cas de crash entre les deux).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildVentePayloads,
  buildBandeNotes,
  computeVenteMontant,
  toFrDate,
  toIsoDateInput,
  validateVente,
  VENTE_ACHETEUR_MAX,
  VENTE_MAX_POIDS_KG,
  VENTE_STATUT_VENDUE,
} from './quickVenteLogic';
import type { BandePorcelets } from '../../types/farm';

// ── Mock Capacitor pour isoler offlineQueue en mode web ─────────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: (): boolean => false },
}));

const prefsStore = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: prefsStore.get(key) ?? null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      prefsStore.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      prefsStore.delete(key);
    }),
    keys: vi.fn(async () => ({ keys: Array.from(prefsStore.keys()) })),
    clear: vi.fn(async () => {
      prefsStore.clear();
    }),
  },
}));

// googleSheets stubé (évite fetch)
vi.mock('../../services/googleSheets', () => ({
  updateRowById: vi.fn(async () => ({ success: true })),
  appendRow: vi.fn(async () => ({ success: true })),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeBande(over: Partial<BandePorcelets> = {}): BandePorcelets {
  return {
    id: 'B-100',
    idPortee: 'P-100',
    truie: 'T-12',
    statut: 'Sevrés',
    nv: 12,
    vivants: 12,
    morts: 0,
    synced: true,
    ...over,
  };
}

// ── 1. Render avec bande : buildVentePayloads initialise correctement ───────

describe('QuickVenteForm · buildVentePayloads (render initial)', () => {
  it('test 1 : initialise les payloads avec bande, montant et vivants restants', () => {
    const bande = makeBande({ id: 'B-100', idPortee: 'P-100', vivants: 12 });
    const payloads = buildVentePayloads({
      bande,
      nbVendus: 5,
      poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100,
      acheteur: 'Abattoir Abidjan',
      dateIso: '2026-04-19',
    });

    // Cible bande correcte
    expect(payloads.bandeSheet).toBe('PORCELETS_BANDES_DETAIL');
    expect(payloads.bandeIdHeader).toBe('ID');
    expect(payloads.bandeIdValue).toBe('B-100');

    // Patch : vivants réduits, NOTES horodatées
    expect(payloads.bandePatch.VIVANTS).toBe(7);
    expect(payloads.bandePatch.NOTES).toContain('Vente 5 porcs 19/04/2026');
    // Pas de statut si vivants > 0
    expect(payloads.bandePatch.STATUT).toBeUndefined();

    // Finance row présente et bien structurée
    expect(payloads.financeValues).not.toBeNull();
    expect(payloads.financeValues[0]).toBe('19/04/2026');
    expect(payloads.financeValues[1]).toBe('VENTE_PORCS');
    expect(payloads.financeValues[2]).toContain('Vente 5 porcs Abattoir Abidjan');
    expect(payloads.financeValues[3]).toBe(5 * 90 * 2100);
    expect(payloads.financeValues[4]).toBe('REVENU');

    // Montant et vivants restants
    expect(payloads.montant).toBe(5 * 90 * 2100);
    expect(payloads.vivantsRestants).toBe(7);
    expect(payloads.bandeVendue).toBe(false);
  });
});

// ── 2. Validation nb > vivants rejetée ──────────────────────────────────────

describe('QuickVenteForm · validateVente (nb > vivants)', () => {
  it('test 2 : rejette un nombre vendu supérieur aux vivants actuels', () => {
    const result = validateVente({
      nbVendus: 20,
      vivantsActuels: 12,
      poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100,
      acheteur: 'Abattoir Abidjan',
      dateIso: '2026-04-19',
    });

    expect(result.ok).toBe(false);
    expect(result.errors.nbVendus).toBeDefined();
    expect(result.errors.nbVendus).toContain('12');
  });

  it('accepte nbVendus = vivants (limite haute inclusive)', () => {
    const result = validateVente({
      nbVendus: 12,
      vivantsActuels: 12,
      poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100,
      acheteur: 'Abattoir Abidjan',
      dateIso: '2026-04-19',
    });
    expect(result.ok).toBe(true);
  });

  it('rejette nbVendus ≤ 0', () => {
    const bad0 = validateVente({
      nbVendus: 0, vivantsActuels: 12, poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
    });
    const badNeg = validateVente({
      nbVendus: -3, vivantsActuels: 12, poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
    });
    expect(bad0.ok).toBe(false);
    expect(badNeg.ok).toBe(false);
  });
});

// ── 3. Validation prix ≤ 0 rejetée ──────────────────────────────────────────

describe('QuickVenteForm · validateVente (prix ≤ 0)', () => {
  it('test 3 : rejette un prix unitaire ≤ 0', () => {
    const zero = validateVente({
      nbVendus: 5,
      vivantsActuels: 12,
      poidsMoyenKg: 90,
      prixUnitaireFCFA: 0,
      acheteur: 'Abattoir Abidjan',
      dateIso: '2026-04-19',
    });
    const neg = validateVente({
      nbVendus: 5,
      vivantsActuels: 12,
      poidsMoyenKg: 90,
      prixUnitaireFCFA: -100,
      acheteur: 'Abattoir Abidjan',
      dateIso: '2026-04-19',
    });

    expect(zero.ok).toBe(false);
    expect(zero.errors.prix).toBeDefined();
    expect(neg.ok).toBe(false);
    expect(neg.errors.prix).toBeDefined();
  });

  it('rejette un poids ≤ 0', () => {
    const result = validateVente({
      nbVendus: 5, vivantsActuels: 12, poidsMoyenKg: 0,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.poids).toBeDefined();
  });

  it('rejette un acheteur vide', () => {
    const result = validateVente({
      nbVendus: 5, vivantsActuels: 12, poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100, acheteur: '   ', dateIso: '2026-04-19',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.acheteur).toBeDefined();
  });

  it('rejette un poids > VENTE_MAX_POIDS_KG', () => {
    const result = validateVente({
      nbVendus: 5, vivantsActuels: 12, poidsMoyenKg: VENTE_MAX_POIDS_KG + 1,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
    });
    expect(result.ok).toBe(false);
  });

  it('rejette un acheteur > VENTE_ACHETEUR_MAX caractères', () => {
    const longName = 'a'.repeat(VENTE_ACHETEUR_MAX + 1);
    const result = validateVente({
      nbVendus: 5, vivantsActuels: 12, poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100, acheteur: longName, dateIso: '2026-04-19',
    });
    expect(result.ok).toBe(false);
  });
});

// ── 4. Submit = 2 enqueues (bande update PUIS finance append) ───────────────

describe('QuickVenteForm · submit = 2 enqueues (ordre bande → finance)', () => {
  beforeEach(() => {
    prefsStore.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('test 4 : enqueue bande update PUIS finance append (ordre préservé pour idempotence)', async () => {
    // Charge la queue offline avec le storage mocké (prefsStore vide au départ).
    const { enqueueAppendRow, enqueueUpdateRow, getQueueStatus } = await import(
      '../../services/offlineQueue'
    );

    const bande = makeBande({ id: 'B-042', vivants: 12 });
    const payloads = buildVentePayloads({
      bande,
      nbVendus: 3,
      poidsMoyenKg: 85,
      prixUnitaireFCFA: 2100,
      acheteur: 'Abattoir Abidjan',
      dateIso: '2026-04-19',
    });

    // 1. bande update
    await enqueueUpdateRow(
      payloads.bandeSheet,
      payloads.bandeIdHeader,
      payloads.bandeIdValue,
      payloads.bandePatch,
    );
    // 2. finance append
    await enqueueAppendRow('FINANCES', payloads.financeValues);

    const { items } = getQueueStatus();
    expect(items.length).toBeGreaterThanOrEqual(2);
    const last2 = items.slice(-2);

    // Ordre : update bande AVANT append finance
    expect(last2[0].action).toBe('update_row_by_id');
    expect(last2[1].action).toBe('append_row');

    const [first, second] = last2;
    if (first.action === 'update_row_by_id') {
      expect(first.payload.sheet).toBe('PORCELETS_BANDES_DETAIL');
      expect(first.payload.idHeader).toBe('ID');
      expect(first.payload.idValue).toBe('B-042');
      expect(first.payload.patch.VIVANTS).toBe(9);
      // Notes horodatées (audit trail)
      expect(String(first.payload.patch.NOTES)).toContain('Vente 3 porcs');
    } else {
      throw new Error('First queue entry should be update_row_by_id');
    }
    if (second.action === 'append_row') {
      expect(second.payload.sheet).toBe('FINANCES');
      expect(second.payload.values[1]).toBe('VENTE_PORCS');
      expect(second.payload.values[4]).toBe('REVENU');
      // Montant = 3 × 85 × 2100 = 535 500
      expect(second.payload.values[3]).toBe(3 * 85 * 2100);
    } else {
      throw new Error('Second queue entry should be append_row');
    }
  });
});

// ── 5. Montant auto-calculé correct ─────────────────────────────────────────

describe('QuickVenteForm · computeVenteMontant', () => {
  it('test 5 : montant = nb × poids × prix unitaire (arrondi entier)', () => {
    // Cas classique : 10 porcs × 90 kg × 2100 FCFA = 1 890 000
    expect(computeVenteMontant(10, 90, 2100)).toBe(1_890_000);
    // Cas avec décimal : 8 × 87.5 × 2100 = 1 470 000
    expect(computeVenteMontant(8, 87.5, 2100)).toBe(1_470_000);
    // Cas réaliste : 5 × 92.3 × 2050 = 946 075 (arrondi)
    expect(computeVenteMontant(5, 92.3, 2050)).toBe(Math.round(5 * 92.3 * 2050));
  });

  it('retourne 0 pour des inputs invalides (défensif)', () => {
    expect(computeVenteMontant(0, 90, 2100)).toBe(0);
    expect(computeVenteMontant(-5, 90, 2100)).toBe(0);
    expect(computeVenteMontant(5, 0, 2100)).toBe(0);
    expect(computeVenteMontant(5, -10, 2100)).toBe(0);
    expect(computeVenteMontant(5, 90, 0)).toBe(0);
    expect(computeVenteMontant(5, 90, -100)).toBe(0);
    expect(computeVenteMontant(Number.NaN, 90, 2100)).toBe(0);
    expect(computeVenteMontant(5, Number.POSITIVE_INFINITY, 2100)).toBe(0);
  });

  it('est cohérent avec buildVentePayloads.montant', () => {
    const bande = makeBande({ vivants: 20 });
    const payloads = buildVentePayloads({
      bande, nbVendus: 7, poidsMoyenKg: 88, prixUnitaireFCFA: 2200,
      acheteur: 'X', dateIso: '2026-04-19',
    });
    expect(payloads.montant).toBe(computeVenteMontant(7, 88, 2200));
    // Vérifie que la valeur dans financeValues correspond
    expect(payloads.financeValues[3]).toBe(payloads.montant);
  });
});

// ── 6. Vivants = 0 après vente → statut Vendue ──────────────────────────────

describe('QuickVenteForm · vivants = 0 après vente', () => {
  it('test 6 : bande avec vivants=nbVendus → STATUT="Vendue" ajouté au patch', () => {
    const bande = makeBande({ id: 'B-FIN', vivants: 10 });
    const payloads = buildVentePayloads({
      bande,
      nbVendus: 10, // vend tous les porcs
      poidsMoyenKg: 92,
      prixUnitaireFCFA: 2100,
      acheteur: 'Abattoir Abidjan',
      dateIso: '2026-04-19',
    });

    expect(payloads.bandePatch.VIVANTS).toBe(0);
    expect(payloads.bandePatch.STATUT).toBe(VENTE_STATUT_VENDUE);
    expect(payloads.vivantsRestants).toBe(0);
    expect(payloads.bandeVendue).toBe(true);
  });

  it('vente partielle (vivants > 0) : pas de STATUT dans le patch', () => {
    const bande = makeBande({ vivants: 12 });
    const payloads = buildVentePayloads({
      bande, nbVendus: 5, poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
    });
    expect(payloads.bandePatch.STATUT).toBeUndefined();
    expect(payloads.vivantsRestants).toBe(7);
    expect(payloads.bandeVendue).toBe(false);
  });

  it('vente > vivants : vivants clampé à 0 (jamais négatif)', () => {
    const bande = makeBande({ vivants: 3 });
    // NB : validateVente rejetterait ce cas en amont, mais buildVentePayloads
    // reste défensif côté données pour éviter un VIVANTS négatif en Sheets.
    const payloads = buildVentePayloads({
      bande, nbVendus: 10, poidsMoyenKg: 90,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
    });
    expect(payloads.bandePatch.VIVANTS).toBe(0);
    expect(payloads.bandePatch.STATUT).toBe(VENTE_STATUT_VENDUE);
  });
});

// ── Bonus : helpers purs ────────────────────────────────────────────────────

describe('QuickVenteForm · helpers', () => {
  it('toIsoDateInput renvoie YYYY-MM-DD pour une date fixée', () => {
    // 19 avril 2026 - construit localement pour éviter TZ drift
    const d = new Date(2026, 3, 19); // mois 0-indexé
    expect(toIsoDateInput(d)).toBe('2026-04-19');
  });

  it('toFrDate YYYY-MM-DD → DD/MM/YYYY', () => {
    expect(toFrDate('2026-04-19')).toBe('19/04/2026');
    // Input mal formé : renvoyé tel quel
    expect(toFrDate('abc')).toBe('abc');
  });

  it('buildBandeNotes concatène non destructivement', () => {
    expect(buildBandeNotes('lot chaleur', '19/04/2026', 5))
      .toBe('lot chaleur | Vente 5 porcs 19/04/2026');
    expect(buildBandeNotes('', '19/04/2026', 1))
      .toBe('Vente 1 porc 19/04/2026');
    expect(buildBandeNotes(undefined, '19/04/2026', 3))
      .toBe('Vente 3 porcs 19/04/2026');
  });
});
