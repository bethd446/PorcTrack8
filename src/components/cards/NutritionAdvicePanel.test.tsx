// @vitest-environment jsdom
/**
 * Tests unitaires — NutritionAdvicePanel
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *   1. Score 100 → tone success
 *   2. Score 50 → tone warning
 *   3. Score 30 → tone danger
 *   4. Phase DEMARRAGE → libellé "Démarrage" + plage "7-25 kg"
 *   5. Poids null → message "Pesée manquante" + pas de mini-cards cibles
 *   6. Conseil dynamique warning → icône AlertTriangle visible
 *
 * Mocke nutritionAdvisor pour piloter les sorties (score, phase, advice).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { BandePerfSnapshot } from '../../services/nutritionAdvisor';

const advisorMocks = vi.hoisted(() => ({
  getNutritionPhase: vi.fn(),
  getDynamicAdvice: vi.fn(),
  computeNutritionScore: vi.fn(),
}));

vi.mock('../../services/nutritionAdvisor', () => advisorMocks);

import { NutritionAdvicePanel } from './NutritionAdvicePanel';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<BandePerfSnapshot> = {}): BandePerfSnapshot {
  return {
    bandeId: 'B-TEST',
    poidsMoyenKg: 15,
    poidsInitialKg: 8,
    ageJours: 30,
    gmqGramsJour: 350,
    icReel: 1.6,
    mortalitePct: 1,
    alimentCourant: 'DEMARRAGE',
    alimentProteinesPct: 19,
    ...overrides,
  };
}

beforeEach(() => {
  // Defaults sains : phase DEMARRAGE, score 75, pas d'advice dynamique.
  advisorMocks.getNutritionPhase.mockReturnValue('DEMARRAGE');
  advisorMocks.getDynamicAdvice.mockReturnValue([]);
  advisorMocks.computeNutritionScore.mockReturnValue({
    total: 75,
    proteines: 20,
    gmq: 18,
    ic: 18,
    sante: 19,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── 1. Score 100 → success ─────────────────────────────────────────────────

describe('NutritionAdvicePanel — score tones', () => {
  it('score 100 affiche tone success', () => {
    advisorMocks.computeNutritionScore.mockReturnValue({
      total: 100,
      proteines: 25,
      gmq: 25,
      ic: 25,
      sante: 25,
    });
    render(<NutritionAdvicePanel snapshot={makeSnapshot()} />);
    const score = screen.getByTestId('nutrition-score');
    expect(score.getAttribute('data-tone')).toBe('success');
    expect(score.textContent).toContain('100');
  });

  it('score 50 affiche tone warning', () => {
    advisorMocks.computeNutritionScore.mockReturnValue({
      total: 65,
      proteines: 15,
      gmq: 15,
      ic: 18,
      sante: 17,
    });
    render(<NutritionAdvicePanel snapshot={makeSnapshot()} />);
    const score = screen.getByTestId('nutrition-score');
    expect(score.getAttribute('data-tone')).toBe('warning');
  });

  it('score 30 affiche tone danger', () => {
    advisorMocks.computeNutritionScore.mockReturnValue({
      total: 30,
      proteines: 5,
      gmq: 8,
      ic: 8,
      sante: 9,
    });
    render(<NutritionAdvicePanel snapshot={makeSnapshot()} />);
    const score = screen.getByTestId('nutrition-score');
    expect(score.getAttribute('data-tone')).toBe('danger');
    expect(score.textContent).toContain('30');
  });
});

// ─── 4. Phase DEMARRAGE → libellé + plage ───────────────────────────────────

describe('NutritionAdvicePanel — phase nutritionnelle', () => {
  it('phase DEMARRAGE affiche libellé "Démarrage" et plage "7-25 kg"', () => {
    advisorMocks.getNutritionPhase.mockReturnValue('DEMARRAGE');
    render(<NutritionAdvicePanel snapshot={makeSnapshot()} />);
    const badge = screen.getByTestId('nutrition-phase-badge');
    expect(badge.textContent).toContain('Démarrage');
    expect(badge.textContent).toContain('7-25 kg');
  });

  it('affiche la phase biologique si différente', () => {
    advisorMocks.getNutritionPhase.mockReturnValue('DEMARRAGE');
    render(
      <NutritionAdvicePanel
        snapshot={makeSnapshot()}
        phaseBiologique="POST_SEVRAGE"
      />,
    );
    expect(screen.getByText(/Phase biologique\s*:\s*POST_SEVRAGE/i)).toBeDefined();
  });

  it("n'affiche pas la phase biologique si identique à la phase nutritionnelle", () => {
    advisorMocks.getNutritionPhase.mockReturnValue('DEMARRAGE');
    render(
      <NutritionAdvicePanel
        snapshot={makeSnapshot()}
        phaseBiologique="DEMARRAGE"
      />,
    );
    expect(screen.queryByText(/Phase biologique/i)).toBeNull();
  });
});

// ─── 5. Poids null → état "Pesée manquante" ─────────────────────────────────

describe('NutritionAdvicePanel — poids manquant', () => {
  it('phase null affiche message "Pesée manquante" et pas de cibles', () => {
    advisorMocks.getNutritionPhase.mockReturnValue(null);
    render(
      <NutritionAdvicePanel snapshot={makeSnapshot({ poidsMoyenKg: null })} />,
    );
    const panel = screen.getByTestId('nutrition-advice-panel');
    expect(panel.getAttribute('data-state')).toBe('missing-weight');
    expect(screen.getByText(/Pesée manquante/i)).toBeDefined();
    expect(screen.queryByTestId('nutrition-targets-grid')).toBeNull();
    expect(screen.queryByTestId('nutrition-score')).toBeNull();
    expect(screen.queryByTestId('nutrition-advice-list')).toBeNull();
  });

  it("affiche le CTA 'Voir comment peser' désactivé", () => {
    advisorMocks.getNutritionPhase.mockReturnValue(null);
    render(
      <NutritionAdvicePanel snapshot={makeSnapshot({ poidsMoyenKg: null })} />,
    );
    const cta = screen.getByRole('button', { name: /Voir comment peser/i });
    expect(cta.hasAttribute('disabled')).toBe(true);
  });
});

// ─── 6. Conseils dynamiques warning → icône AlertTriangle ───────────────────

describe('NutritionAdvicePanel — conseils dynamiques', () => {
  it('conseil dynamique warning rend une icône AlertTriangle (lucide)', () => {
    advisorMocks.getNutritionPhase.mockReturnValue('DEMARRAGE');
    advisorMocks.getDynamicAdvice.mockReturnValue([
      {
        type: 'warning',
        source: 'GMQ',
        message: 'GMQ insuffisant — vérifier ration.',
      },
    ]);
    render(<NutritionAdvicePanel snapshot={makeSnapshot()} />);
    const list = screen.getByTestId('nutrition-advice-list');
    expect(list.textContent).toContain('GMQ insuffisant');
    // Lucide AlertTriangle a l'attribut class="lucide lucide-triangle-alert"
    // (selon version) — on cherche un svg avec une classe alert/triangle.
    const svgs = list.querySelectorAll('svg');
    const hasTriangle = Array.from(svgs).some((s) => {
      const cls = s.getAttribute('class') || '';
      return /triangle/i.test(cls) || /alert/i.test(cls);
    });
    expect(hasTriangle).toBe(true);
  });

  it('rend les 3 conseils statiques de base de la phase', () => {
    advisorMocks.getNutritionPhase.mockReturnValue('DEMARRAGE');
    render(<NutritionAdvicePanel snapshot={makeSnapshot()} />);
    const list = screen.getByTestId('nutrition-advice-list');
    // Les conseils de base DEMARRAGE de nutritionGuidelines.ts.
    expect(list.textContent).toContain('Augmenter les protéines si croissance lente');
    expect(list.textContent).toContain("Vérifier qualité de l'aliment");
    expect(list.textContent).toContain('Attention au stress post-sevrage');
  });
});

// ─── Bonus : mini-cards cibles présentes ────────────────────────────────────

describe('NutritionAdvicePanel — cibles nutriments', () => {
  it('affiche les 4 mini-cards (Protéines, Lysine, Calcium, Phosphore)', () => {
    advisorMocks.getNutritionPhase.mockReturnValue('DEMARRAGE');
    render(<NutritionAdvicePanel snapshot={makeSnapshot()} />);
    const grid = screen.getByTestId('nutrition-targets-grid');
    const text = grid.textContent || '';
    expect(text).toContain('Protéines');
    expect(text).toContain('Lysine');
    expect(text).toContain('Calcium');
    expect(text).toContain('Phosphore');
    // Plage protéines DEMARRAGE = 18-20%.
    expect(text).toContain('18-20%');
  });
});

// ─── Bonus : breakdown expandable ───────────────────────────────────────────

describe('NutritionAdvicePanel — breakdown sous-scores', () => {
  it('breakdown fermé par défaut, ouvre au clic', async () => {
    const user = userEvent.setup();
    advisorMocks.getNutritionPhase.mockReturnValue('DEMARRAGE');
    render(<NutritionAdvicePanel snapshot={makeSnapshot()} />);

    expect(screen.queryByTestId('nutrition-breakdown')).toBeNull();
    const toggle = screen.getByTestId('nutrition-breakdown-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    await user.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const breakdown = screen.getByTestId('nutrition-breakdown');
    expect(within(breakdown).getByText(/Protéines/i)).toBeDefined();
    expect(within(breakdown).getByText(/GMQ/i)).toBeDefined();
    expect(within(breakdown).getByText(/IC/i)).toBeDefined();
    expect(within(breakdown).getByText(/Santé/i)).toBeDefined();
  });
});
