/**
 * Tests unitaires — quickSplitBandeLogic (V36-E P3).
 * ════════════════════════════════════════════════════════════════════════
 *   [1] validateSplitStep1 : sélection au moins 1 porcelet
 *   [2] validateSplitStep2 : loge + capacité
 *   [3] computePoidsMoyen : moyenne porcelets pesés
 *   [4] autoDetectSplitPhase : 5 ranges biologiques + fallback POST_SEVRAGE
 *   [5] generateSplitCodeId : format B-YYYYMMDD-{logeNumero}
 *   [6] buildSplitBatchDraft : payload complet (validation_status, statut, …)
 */

import { describe, it, expect } from 'vitest';

import {
  autoDetectSplitPhase,
  buildSplitBatchDraft,
  computePoidsMoyen,
  generateSplitCodeId,
  validateSplitStep1,
  validateSplitStep2,
} from './quickSplitBandeLogic';
import type { Loge, PorceletIndividuel } from '../../types/farm';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeLoge(
  id: string,
  numero: string,
  capaciteMax?: number,
  type: Loge['type'] = 'POST_SEVRAGE',
): Loge {
  return { id, numero, type, active: true, capaciteMax };
}

function makePorcelet(
  id: string,
  boucle: string,
  poidsCourantKg?: number,
  sexe: PorceletIndividuel['sexe'] = 'M',
): PorceletIndividuel {
  return {
    id,
    batchId: 'src-1',
    boucle,
    sexe,
    poidsCourantKg,
    statut: 'VIVANT',
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('quickSplitBandeLogic', () => {
  // ── [1] validateSplitStep1 ───────────────────────────────────────────────

  describe('validateSplitStep1', () => {
    it('rejette une sélection vide', () => {
      const r = validateSplitStep1([], 10);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/au moins/i);
    });

    it('accepte une sélection partielle', () => {
      expect(validateSplitStep1(['p1', 'p2'], 10).ok).toBe(true);
    });

    it('accepte une sélection totale (la source deviendra RECAP)', () => {
      expect(validateSplitStep1(['p1', 'p2', 'p3'], 3).ok).toBe(true);
    });

    it('rejette une sélection > total porcelets', () => {
      const r = validateSplitStep1(['p1', 'p2', 'p3', 'p4'], 3);
      expect(r.ok).toBe(false);
    });
  });

  // ── [2] validateSplitStep2 ───────────────────────────────────────────────

  describe('validateSplitStep2', () => {
    it('rejette si aucune loge sélectionnée', () => {
      const r = validateSplitStep2(null, 0, 5);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/loge/i);
    });

    it('accepte une loge sans capacite_max', () => {
      const loge = makeLoge('L1', 'PS-01');
      expect(validateSplitStep2(loge, 0, 50).ok).toBe(true);
    });

    it('accepte si occupation + ajout ≤ capacite_max', () => {
      const loge = makeLoge('L1', 'PS-01', 30);
      expect(validateSplitStep2(loge, 10, 20).ok).toBe(true);
    });

    it('rejette si occupation + ajout > capacite_max', () => {
      const loge = makeLoge('L1', 'PS-01', 30);
      const r = validateSplitStep2(loge, 20, 15);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/capacit/i);
      expect(r.error).toMatch(/35/);
      expect(r.error).toMatch(/30/);
    });

    it('accepte exactement = capacite_max', () => {
      const loge = makeLoge('L1', 'PS-01', 30);
      expect(validateSplitStep2(loge, 10, 20).ok).toBe(true);
    });
  });

  // ── [3] computePoidsMoyen ────────────────────────────────────────────────

  describe('computePoidsMoyen', () => {
    it('retourne null si aucun porcelet pesé', () => {
      const ps = [
        makePorcelet('p1', 'B1'),
        makePorcelet('p2', 'B2'),
      ];
      expect(computePoidsMoyen(ps)).toBeNull();
    });

    it('retourne null si liste vide', () => {
      expect(computePoidsMoyen([])).toBeNull();
    });

    it('moyenne uniquement les porcelets avec poids', () => {
      const ps = [
        makePorcelet('p1', 'B1', 10),
        makePorcelet('p2', 'B2', 20),
        makePorcelet('p3', 'B3'), // pas de poids → ignoré
      ];
      expect(computePoidsMoyen(ps)).toBe(15);
    });

    it('calcule la moyenne classique', () => {
      const ps = [
        makePorcelet('p1', 'B1', 5),
        makePorcelet('p2', 'B2', 7),
        makePorcelet('p3', 'B3', 9),
      ];
      expect(computePoidsMoyen(ps)).toBe(7);
    });
  });

  // ── [4] autoDetectSplitPhase ─────────────────────────────────────────────

  describe('autoDetectSplitPhase', () => {
    it('fallback POST_SEVRAGE si aucun poids', () => {
      const ps = [makePorcelet('p1', 'B1')];
      expect(autoDetectSplitPhase(ps).phase).toBe('POST_SEVRAGE');
      expect(autoDetectSplitPhase(ps).statut).toBe('Sevrés');
    });

    it('SOUS_MERE pour poids moyen < 7 kg', () => {
      const ps = [makePorcelet('p1', 'B1', 5)];
      expect(autoDetectSplitPhase(ps).phase).toBe('SOUS_MERE');
    });

    it('POST_SEVRAGE pour 7..25 kg', () => {
      const ps = [
        makePorcelet('p1', 'B1', 10),
        makePorcelet('p2', 'B2', 20),
      ];
      expect(autoDetectSplitPhase(ps).phase).toBe('POST_SEVRAGE');
    });

    it('CROISSANCE pour 25..60 kg', () => {
      const ps = [makePorcelet('p1', 'B1', 40)];
      expect(autoDetectSplitPhase(ps).phase).toBe('CROISSANCE');
    });

    it('ENGRAISSEMENT pour 60..90 kg', () => {
      const ps = [makePorcelet('p1', 'B1', 75)];
      expect(autoDetectSplitPhase(ps).phase).toBe('ENGRAISSEMENT');
    });

    it('FINITION pour >=90 kg', () => {
      const ps = [makePorcelet('p1', 'B1', 100)];
      expect(autoDetectSplitPhase(ps).phase).toBe('FINITION');
    });
  });

  // ── [5] generateSplitCodeId ──────────────────────────────────────────────

  describe('generateSplitCodeId', () => {
    it('format B-YYYYMMDD-{logeNumero} ISO date', () => {
      expect(generateSplitCodeId('2026-05-02', 'PS-01')).toBe('B-20260502-PS-01');
    });

    it('uppercase et nettoie le numéro de loge', () => {
      expect(generateSplitCodeId('2026-05-02', 'm 12')).toBe('B-20260502-M-12');
    });
  });

  // ── [6] buildSplitBatchDraft ─────────────────────────────────────────────

  describe('buildSplitBatchDraft', () => {
    it('produit un payload complet avec validation_status=VALIDATED + sow_id=null', () => {
      const loge = makeLoge('L-PS1', '01', 30);
      const ps = [
        makePorcelet('p1', 'B1', 10),
        makePorcelet('p2', 'B2', 14),
      ];
      const draft = buildSplitBatchDraft({
        todayIso: '2026-05-02',
        loge,
        selectedPorcelets: ps,
        sourceCodeId: 'ADDM',
      });
      expect(draft).toMatchObject({
        code_id: 'B-20260502-01',
        loge_id: 'L-PS1',
        porcelets_nes_vivants: 2,
        porcelets_nes_total: 2,
        statut: 'Sevrés',
        phase: 'POST_SEVRAGE',
        validation_status: 'VALIDATED',
        sow_id: null,
        date_mise_bas: '2026-05-02',
      });
      expect(draft.poids_initial_kg).toBe(12);
      expect(draft.poids_moyen_kg).toBe(12);
      expect(draft.notes).toContain('ADDM');
      expect(draft.notes).toContain('2 porcelets');
    });

    it('phase = POST_SEVRAGE par défaut quand aucun porcelet pesé', () => {
      const loge = makeLoge('L-X', 'X-9');
      const ps = [makePorcelet('p1', 'B1')];
      const draft = buildSplitBatchDraft({
        todayIso: '2026-05-02',
        loge,
        selectedPorcelets: ps,
        sourceCodeId: 'SRC',
      });
      expect(draft.phase).toBe('POST_SEVRAGE');
      expect(draft.statut).toBe('Sevrés');
      expect(draft.poids_initial_kg).toBe(0);
      expect(draft.poids_moyen_kg).toBe(0);
    });
  });
});
