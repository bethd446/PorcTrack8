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
 * Les deux mutations sont émises dans l'ordre bande AVANT finance pour ne
 * pas créer de comptabilité orpheline en cas de crash entre les deux.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildVentePayloads,
  buildBandeNotes,
  computeRendementCarcasse,
  computeVenteMontant,
  toFrDate,
  toIsoDateInput,
  validateVente,
  VENTE_ACHETEUR_MAX,
  VENTE_MAX_POIDS_KG,
  VENTE_RENDEMENT_MAX_PCT,
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

// supabaseWrites stubé (importé par offlineQueue)
vi.mock('../../services/supabaseWrites', () => ({
  insertSow: vi.fn(async () => ({})),
  insertBoar: vi.fn(async () => ({})),
  insertBatch: vi.fn(async () => ({})),
  insertNote: vi.fn(async () => ({})),
  insertHealthLog: vi.fn(async () => ({})),
  insertSaillie: vi.fn(async () => ({})),
  insertFinance: vi.fn(async () => ({})),
  insertProduitAliment: vi.fn(async () => ({})),
  insertProduitVeto: vi.fn(async () => ({})),
  updateSow: vi.fn(async () => ({ success: true })),
  updateBoar: vi.fn(async () => ({ success: true })),
  updateBatch: vi.fn(async () => ({ success: true })),
  updateNote: vi.fn(async () => ({ success: true })),
  updateProduitAliment: vi.fn(async () => ({ success: true })),
  updateProduitVeto: vi.fn(async () => ({ success: true })),
  updateSowByCode: vi.fn(async () => ({})),
  updateBoarByCode: vi.fn(async () => ({})),
  updateBatchByCode: vi.fn(async () => ({})),
  deleteSow: vi.fn(async () => undefined),
  deleteBoar: vi.fn(async () => undefined),
  deleteBatch: vi.fn(async () => undefined),
  deleteNote: vi.fn(async () => undefined),
  deleteHealthLog: vi.fn(async () => undefined),
  deleteProduitAliment: vi.fn(async () => undefined),
  deleteProduitVeto: vi.fn(async () => undefined),
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
    poidsInitialKg: 0,
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

  it('test 4 : enqueue bande update (batches) PUIS finance insert (ordre préservé)', async () => {
    const { enqueueInsert, enqueueUpdateByCode, getQueueStatus } = await import(
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

    // 1. update batches by code (bande)
    await enqueueUpdateByCode('batches', payloads.bandeIdValue, {
      porcelets_nes_vivants: payloads.bandePatch.VIVANTS,
      notes: payloads.bandePatch.NOTES,
    });
    // 2. insert finances (revenu vente)
    await enqueueInsert('finances', {
      operation_date: payloads.financeValues[0],
      category: payloads.financeValues[1],
      label: payloads.financeValues[2],
      amount: payloads.financeValues[3],
      type: payloads.financeValues[4],
      notes: payloads.financeValues[5],
    });

    const { items } = getQueueStatus();
    expect(items.length).toBeGreaterThanOrEqual(2);
    const last2 = items.slice(-2);

    // Ordre : update batches AVANT insert finances
    expect(last2[0].mutation.kind).toBe('updateByCode');
    expect(last2[1].mutation.kind).toBe('insert');

    const [first, second] = last2;
    if (first.mutation.kind === 'updateByCode') {
      expect(first.mutation.table).toBe('batches');
      expect(first.mutation.codeId).toBe('B-042');
      expect(first.mutation.fields.porcelets_nes_vivants).toBe(9);
      expect(String(first.mutation.fields.notes)).toContain('Vente 3 porcs');
    } else {
      throw new Error('First queue entry should be updateByCode');
    }
    if (second.mutation.kind === 'insert') {
      expect(second.mutation.table).toBe('finances');
      expect(second.mutation.values.category).toBe('VENTE_PORCS');
      expect(second.mutation.values.type).toBe('REVENU');
      // Montant = 3 × 85 × 2100 = 535 500
      expect(second.mutation.values.amount).toBe(3 * 85 * 2100);
    } else {
      throw new Error('Second queue entry should be insert');
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

// ── V21-4 · Canal ABATTOIR + carcasse + rendement ──────────────────────────

describe('QuickVenteForm · V21-4 carcasse (ABATTOIR)', () => {
  it('test carcasse 1 : ABATTOIR avec carcasse → patch DB carcasse + finance enrichies', () => {
    const bande = makeBande({ id: 'B-ABA', vivants: 10 });
    const payloads = buildVentePayloads({
      bande,
      nbVendus: 5,
      poidsMoyenKg: 100, // total vif = 500 kg
      prixUnitaireFCFA: 2100,
      acheteur: 'Abattoir Abidjan',
      dateIso: '2026-04-19',
      canal: 'ABATTOIR',
      abattoirNom: 'Abidjan SA',
      poidsCarcasseKg: 380, // rendement = 76%
      prixCarcasseFCFAKg: 2800,
    });

    // Patch DB (snake_case) prêt pour updateBatchByCode
    expect(payloads.carcasseDbPatch.canal_vente).toBe('ABATTOIR');
    expect(payloads.carcasseDbPatch.abattoir_nom).toBe('Abidjan SA');
    expect(payloads.carcasseDbPatch.poids_vif_kg).toBe(500);
    expect(payloads.carcasseDbPatch.poids_carcasse_kg).toBe(380);
    expect(payloads.carcasseDbPatch.prix_carcasse_fcfa_kg).toBe(2800);
    expect(payloads.carcasseDbPatch.rendement_carcasse_pct).toBe(76);

    // Patch métier (camelCase)
    expect(payloads.carcassePatch.canalVente).toBe('ABATTOIR');
    expect(payloads.carcassePatch.poidsCarcasseKg).toBe(380);

    // Notes finance enrichies
    const financeNotes = String(payloads.financeValues[5]);
    expect(financeNotes).toContain('canal:ABATTOIR');
    expect(financeNotes).toContain('abattoir:Abidjan SA');
    expect(financeNotes).toContain('carcasse:380kg');
    expect(financeNotes).toContain('rendement:76%');
    expect(financeNotes).toContain('prix_carcasse:2800FCFA/kg');

    expect(payloads.rendementPct).toBe(76);
  });

  it('test carcasse 2 : calcul rendement carcasse / vif × 100', () => {
    // Cas standard : 380 kg carcasse / 500 kg vif = 76 %
    expect(computeRendementCarcasse(380, 500)).toBe(76);
    // 76.5 %
    expect(computeRendementCarcasse(382.5, 500)).toBe(76.5);
    // 75 % pile
    expect(computeRendementCarcasse(75, 100)).toBe(75);
    // Inputs invalides → NaN
    expect(Number.isNaN(computeRendementCarcasse(0, 500))).toBe(true);
    expect(Number.isNaN(computeRendementCarcasse(380, 0))).toBe(true);
    expect(Number.isNaN(computeRendementCarcasse(-1, 500))).toBe(true);
    expect(Number.isNaN(computeRendementCarcasse(Number.NaN, 500))).toBe(true);

    // Cohérence avec buildVentePayloads
    const bande = makeBande({ vivants: 10 });
    const p = buildVentePayloads({
      bande, nbVendus: 4, poidsMoyenKg: 110, prixUnitaireFCFA: 2100,
      acheteur: 'X', dateIso: '2026-04-19',
      canal: 'ABATTOIR', abattoirNom: 'A', poidsCarcasseKg: 330,
      prixCarcasseFCFAKg: 2800,
    });
    // total vif = 440, carcasse = 330 → 75%
    expect(p.rendementPct).toBe(75);
  });

  it('test carcasse 3 : validation rendement physiologique (≤ 85%)', () => {
    // Rendement plausible : 75% → ok
    const okRes = validateVente({
      nbVendus: 5, vivantsActuels: 10, poidsMoyenKg: 100,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
      canal: 'ABATTOIR', abattoirNom: 'A', poidsCarcasseKg: 375,
      prixCarcasseFCFAKg: 2800,
    });
    expect(okRes.ok).toBe(true);

    // Rendement > VENTE_RENDEMENT_MAX_PCT → erreur
    const tooHigh = validateVente({
      nbVendus: 5, vivantsActuels: 10, poidsMoyenKg: 100,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
      canal: 'ABATTOIR', abattoirNom: 'A',
      poidsCarcasseKg: 500, // 100% rendement (impossible)
      prixCarcasseFCFAKg: 2800,
    });
    expect(tooHigh.ok).toBe(false);
    expect(tooHigh.errors.poidsCarcasse).toBeDefined();
    expect(tooHigh.errors.poidsCarcasse).toContain(`${VENTE_RENDEMENT_MAX_PCT}`);

    // Champs ABATTOIR manquants → erreurs requises
    const missingAll = validateVente({
      nbVendus: 5, vivantsActuels: 10, poidsMoyenKg: 100,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
      canal: 'ABATTOIR',
    });
    expect(missingAll.ok).toBe(false);
    expect(missingAll.errors.abattoirNom).toBeDefined();
    expect(missingAll.errors.poidsCarcasse).toBeDefined();
    expect(missingAll.errors.prixCarcasse).toBeDefined();

    // Canal non-ABATTOIR : pas d'exigence carcasse
    const direct = validateVente({
      nbVendus: 5, vivantsActuels: 10, poidsMoyenKg: 100,
      prixUnitaireFCFA: 2100, acheteur: 'X', dateIso: '2026-04-19',
      canal: 'DIRECT',
    });
    expect(direct.ok).toBe(true);
  });
});
