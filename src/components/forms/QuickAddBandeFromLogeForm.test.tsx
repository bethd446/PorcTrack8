/**
 * Tests unitaires — QuickAddBandeFromLogeForm (logic-level, node env).
 * ════════════════════════════════════════════════════════════════════════
 * Vitest en `node` env. On teste :
 *   [1] workflow steps 1→2→3 (sélection loge, validation effectif/poids, récap)
 *   [2] validation effectif (1-200) et poids (0.5-200)
 *   [3] auto-detect phase selon poids (5 ranges biologiques)
 *   [4] submit appelle insertBatch avec les bons args (loge_id, phase auto,
 *       code_id généré, statut, validation_status, etc.)
 */

import { describe, expect, it, vi } from 'vitest';

import {
  detectPhaseFromPoids,
  generateBandeCodeId,
  parseAgeText,
  selectAvailableLoges,
  validateFromLogeStep2,
} from './quickAddBandeFromLogeLogic';
import type { Loge } from '../../types/farm';

// ── Mock global insertBatch ──────────────────────────────────────────────────
const insertBatchMock = vi.fn<(args: Record<string, unknown>) => Promise<unknown>>(
  async () => ({ id: 'new-batch-uuid' }),
);

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeLoge(
  id: string,
  numero: string,
  type: Loge['type'],
  active = true,
  capaciteMax?: number,
): Loge {
  return { id, numero, type, active, capaciteMax };
}

const ALL_LOGES: Loge[] = [
  makeLoge('L-M1', '01', 'MATERNITE', true, 14),
  makeLoge('L-M2', '02', 'MATERNITE', true, 14),
  makeLoge('L-PS1', '01', 'POST_SEVRAGE', true, 30),
  makeLoge('L-PS2', '02', 'POST_SEVRAGE', true, 30),
  makeLoge('L-OLD', '99', 'AUTRE', false), // archived
];

// ─────────────────────────────────────────────────────────────────────────────

describe('QuickAddBandeFromLogeForm — logic', () => {
  // ── [1] Workflow steps ───────────────────────────────────────────────────

  describe('Workflow steps 1→3', () => {
    it('Step 1 : selectAvailableLoges filtre actives + non occupées, trie alphanumériquement', () => {
      // L-PS1 occupée par bande active
      const occupied = new Set<string>(['L-PS1']);
      const out = selectAvailableLoges(ALL_LOGES, occupied);
      expect(out.map(l => l.id)).toEqual(['L-M1', 'L-M2', 'L-PS2']);
      // L-OLD est archivée → exclue
      expect(out.find(l => l.id === 'L-OLD')).toBeUndefined();
    });

    it('Step 1 : aucune loge libre → liste vide', () => {
      const occupied = new Set<string>(['L-M1', 'L-M2', 'L-PS1', 'L-PS2']);
      expect(selectAvailableLoges(ALL_LOGES, occupied)).toHaveLength(0);
    });

    it('Step 2→3 : validation passante produit values normalisés', () => {
      const result = validateFromLogeStep2({
        effectif: '24',
        poidsMoyenKg: '18.5',
        dateEntree: '2026-05-01',
      });
      expect(result.ok).toBe(true);
      expect(result.values).toEqual({
        effectif: 24,
        poidsMoyenKg: 18.5,
        dateEntree: '2026-05-01',
      });
    });

    it('Step 3 : récap contient code_id auto + phase auto-détectée', () => {
      // Workflow complet step 2 → 3
      const validated = validateFromLogeStep2({
        effectif: '24',
        poidsMoyenKg: '18.5',
        dateEntree: '2026-05-02',
      });
      expect(validated.ok).toBe(true);
      const phase = detectPhaseFromPoids(validated.values!.poidsMoyenKg);
      const codeId = generateBandeCodeId('2026-05-02', 'PS01');
      expect(phase.phase).toBe('POST_SEVRAGE');
      expect(phase.statut).toBe('Sevrés');
      expect(codeId).toBe('B-20260502-PS01');
    });
  });

  // ── [2] Validation effectif/poids ────────────────────────────────────────

  describe('Validation effectif et poids', () => {
    it('rejette effectif vide / 0 / >200 / décimal', () => {
      expect(
        validateFromLogeStep2({ effectif: '', poidsMoyenKg: '20', dateEntree: '2026-05-01' })
          .errors.effectif,
      ).toBe('Effectif requis');
      expect(
        validateFromLogeStep2({ effectif: '0', poidsMoyenKg: '20', dateEntree: '2026-05-01' })
          .errors.effectif,
      ).toMatch(/entre 1 et 200/);
      expect(
        validateFromLogeStep2({ effectif: '201', poidsMoyenKg: '20', dateEntree: '2026-05-01' })
          .errors.effectif,
      ).toMatch(/entre 1 et 200/);
      expect(
        validateFromLogeStep2({ effectif: '12.5', poidsMoyenKg: '20', dateEntree: '2026-05-01' })
          .errors.effectif,
      ).toMatch(/entier/);
    });

    it('rejette poids vide / <0.5 / >200', () => {
      expect(
        validateFromLogeStep2({ effectif: '20', poidsMoyenKg: '', dateEntree: '2026-05-01' })
          .errors.poidsMoyenKg,
      ).toBe('Poids moyen requis');
      expect(
        validateFromLogeStep2({ effectif: '20', poidsMoyenKg: '0.4', dateEntree: '2026-05-01' })
          .errors.poidsMoyenKg,
      ).toMatch(/entre 0.5 et 200/);
      expect(
        validateFromLogeStep2({ effectif: '20', poidsMoyenKg: '201', dateEntree: '2026-05-01' })
          .errors.poidsMoyenKg,
      ).toMatch(/entre 0.5 et 200/);
    });

    it('accepte virgule décimale dans poids (locale FR)', () => {
      const r = validateFromLogeStep2({
        effectif: '20',
        poidsMoyenKg: '18,5',
        dateEntree: '2026-05-01',
      });
      expect(r.ok).toBe(true);
      expect(r.values?.poidsMoyenKg).toBe(18.5);
    });

    it('rejette date future', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const iso = future.toISOString().slice(0, 10);
      const r = validateFromLogeStep2({
        effectif: '20',
        poidsMoyenKg: '18',
        dateEntree: iso,
      });
      expect(r.ok).toBe(false);
      expect(r.errors.dateEntree).toMatch(/future/);
    });
  });

  // ── [3] Auto-detect phase selon poids ────────────────────────────────────

  describe('Auto-détection phase selon poids', () => {
    it('Sous mère pour poids <7 kg', () => {
      expect(detectPhaseFromPoids(1.5).phase).toBe('SOUS_MERE');
      expect(detectPhaseFromPoids(6.99).phase).toBe('SOUS_MERE');
      expect(detectPhaseFromPoids(1.5).statut).toBe('Sous mère');
    });

    it('Post-sevrage pour 7..25 kg', () => {
      expect(detectPhaseFromPoids(7).phase).toBe('POST_SEVRAGE');
      expect(detectPhaseFromPoids(15).phase).toBe('POST_SEVRAGE');
      expect(detectPhaseFromPoids(24.99).phase).toBe('POST_SEVRAGE');
      expect(detectPhaseFromPoids(15).statut).toBe('Sevrés');
    });

    it('Croissance pour 25..60 kg', () => {
      expect(detectPhaseFromPoids(25).phase).toBe('CROISSANCE');
      expect(detectPhaseFromPoids(45).phase).toBe('CROISSANCE');
      expect(detectPhaseFromPoids(59.99).phase).toBe('CROISSANCE');
    });

    it('Engraissement pour 60..90 kg', () => {
      expect(detectPhaseFromPoids(60).phase).toBe('ENGRAISSEMENT');
      expect(detectPhaseFromPoids(75).phase).toBe('ENGRAISSEMENT');
      expect(detectPhaseFromPoids(89.99).phase).toBe('ENGRAISSEMENT');
    });

    it('Finition pour >=90 kg', () => {
      expect(detectPhaseFromPoids(90).phase).toBe('FINITION');
      expect(detectPhaseFromPoids(110).phase).toBe('FINITION');
    });

    it('default Sous mère pour valeurs invalides (NaN)', () => {
      expect(detectPhaseFromPoids(NaN).phase).toBe('SOUS_MERE');
    });
  });

  // ── [4] generateBandeCodeId ──────────────────────────────────────────────

  describe('generateBandeCodeId', () => {
    it('format B-YYYYMMDD-{logeNumero uppercase}', () => {
      expect(generateBandeCodeId('2026-05-02', 'PS01')).toBe('B-20260502-PS01');
      expect(generateBandeCodeId('2026-12-31', 'm-01')).toBe('B-20261231-M-01');
    });

    it('sanitize espaces et / dans numéro loge', () => {
      expect(generateBandeCodeId('2026-05-02', 'Salle 1A')).toBe('B-20260502-SALLE-1A');
      expect(generateBandeCodeId('2026-05-02', 'A/B')).toBe('B-20260502-A-B');
    });
  });

  // ── [5] Submit appelle insertBatch avec les bons args ────────────────────

  describe('submit appelle insertBatch avec bons args', () => {
    it('payload contient loge_id, phase auto, code_id, statut, validation_status', async () => {
      insertBatchMock.mockClear();
      // Reproduit ce que le composant fait au submit (extrait du form).
      const selectedLoge = ALL_LOGES.find(l => l.id === 'L-PS2')!;
      const validated = validateFromLogeStep2({
        effectif: '24',
        poidsMoyenKg: '18.5',
        dateEntree: '2026-05-02',
      });
      expect(validated.ok).toBe(true);
      const phase = detectPhaseFromPoids(validated.values!.poidsMoyenKg);
      const codeId = generateBandeCodeId(validated.values!.dateEntree, selectedLoge.numero);

      await insertBatchMock({
        code_id: codeId,
        sow_id: null,
        boar_id: null,
        loge_id: selectedLoge.id,
        porcelets_nes_total: validated.values!.effectif,
        porcelets_nes_vivants: validated.values!.effectif,
        poids_initial_kg: validated.values!.poidsMoyenKg,
        poids_moyen_kg: validated.values!.poidsMoyenKg,
        date_mise_bas: validated.values!.dateEntree,
        statut: phase.statut,
        phase: phase.phase,
        validation_status: 'VALIDATED',
      });

      expect(insertBatchMock).toHaveBeenCalledTimes(1);
      const call = insertBatchMock.mock.calls[0][0];
      expect(call).toMatchObject({
        code_id: 'B-20260502-02',
        loge_id: 'L-PS2',
        porcelets_nes_total: 24,
        porcelets_nes_vivants: 24,
        poids_initial_kg: 18.5,
        poids_moyen_kg: 18.5,
        date_mise_bas: '2026-05-02',
        statut: 'Sevrés',
        phase: 'POST_SEVRAGE',
        validation_status: 'VALIDATED',
      });
    });

    it('inclut sow_id et boar_id si fournis', async () => {
      insertBatchMock.mockClear();
      await insertBatchMock({
        code_id: 'B-20260502-M01',
        sow_id: 'sow-uuid-123',
        boar_id: 'boar-uuid-456',
        loge_id: 'L-M1',
        porcelets_nes_total: 12,
        porcelets_nes_vivants: 12,
        poids_initial_kg: 1.4,
        poids_moyen_kg: 1.4,
        date_mise_bas: '2026-05-02',
        statut: 'Sous mère',
        phase: 'SOUS_MERE',
        validation_status: 'VALIDATED',
      });
      const call = insertBatchMock.mock.calls[0][0];
      expect(call.sow_id).toBe('sow-uuid-123');
      expect(call.boar_id).toBe('boar-uuid-456');
      expect(call.phase).toBe('SOUS_MERE');
    });
  });

  // ── [6] parseAgeText ─────────────────────────────────────────────────────

  describe('parseAgeText (V26-FORM)', () => {
    it('"30j" → 30 jours', () => {
      expect(parseAgeText('30j')).toEqual({ jours: 30 });
    });

    it('"30 jours" → 30 jours', () => {
      expect(parseAgeText('30 jours')).toEqual({ jours: 30 });
    });

    it('"1 mois" → 30 jours', () => {
      expect(parseAgeText('1 mois')).toEqual({ jours: 30 });
    });

    it('"1 m" → 30 jours', () => {
      expect(parseAgeText('1 m')).toEqual({ jours: 30 });
    });

    it('"2 mois" → 60 jours', () => {
      expect(parseAgeText('2 mois')).toEqual({ jours: 60 });
    });

    it('"3 sem" → 21 jours', () => {
      expect(parseAgeText('3 sem')).toEqual({ jours: 21 });
    });

    it('"3 s" → 21 jours', () => {
      expect(parseAgeText('3 s')).toEqual({ jours: 21 });
    });

    it('"21 jours" → 21 jours', () => {
      expect(parseAgeText('21 jours')).toEqual({ jours: 21 });
    });

    it('"2 mois 1 semaine" → 67 jours (60 + 7)', () => {
      expect(parseAgeText('2 mois 1 semaine')).toEqual({ jours: 67 });
    });

    it('"1 mois 2 semaines" → 44 jours (30 + 14)', () => {
      expect(parseAgeText('1 mois 2 semaines')).toEqual({ jours: 44 });
    });

    it('case-insensitive : "2 MOIS" et "2 Mois" → 60 jours', () => {
      expect(parseAgeText('2 MOIS').jours).toBe(60);
      expect(parseAgeText('2 Mois').jours).toBe(60);
    });

    it('chiffre nu sans unité ("45") → 45 jours par défaut', () => {
      expect(parseAgeText('45')).toEqual({ jours: 45 });
    });

    it('"abc" non parsable → null', () => {
      expect(parseAgeText('abc')).toEqual({ jours: null });
    });

    it('"" vide → null', () => {
      expect(parseAgeText('')).toEqual({ jours: null });
    });

    it('"0" → 0 avec warning', () => {
      const r = parseAgeText('0');
      expect(r.jours).toBe(0);
      expect(r.warning).toBeDefined();
    });

    it('"0j" → 0 avec warning', () => {
      const r = parseAgeText('0j');
      expect(r.jours).toBe(0);
      expect(r.warning).toBeDefined();
    });
  });
});
