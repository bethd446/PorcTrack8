/**
 * Tests unitaires — financesAnalyzer + mapFinance.
 * ════════════════════════════════════════════════
 * Couvre :
 *   • mapFinance : ligne DEPENSE nominale, REVENU via type='Vente', ligne vide
 *   • summarizeByPeriode : filtrage période + agrégation par catégorie
 *   • parseMontant / formatMontant : round-trip "12 000 FCFA"
 *   • getPeriodes : tri décroissant
 *   • categorieToTone : mapping
 */

import { describe, it, expect } from 'vitest';
import {
  summarizeByPeriode,
  summarizeAll,
  getPeriodes,
  parseMontant,
  formatMontant,
  categorieToTone,
  dateToPeriode,
  detectCurrency,
} from './financesAnalyzer';
import { mapFinance } from '../mappers';
import type { FinanceEntry } from '../types/farm';

// ── Fixtures ────────────────────────────────────────────────────────────────

const HEADER = ['DATE', 'CATEGORIE', 'LIBELLE', 'MONTANT', 'TYPE', 'NOTES'];

function entry(over: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    date: '15/04/2026',
    categorie: 'ALIMENT',
    libelle: 'Sac 40kg',
    montant: 12000,
    type: 'DEPENSE',
    ...over,
  };
}

// ── mapFinance ──────────────────────────────────────────────────────────────

describe('mapFinance', () => {
  it('mappe une ligne DEPENSE nominale', () => {
    const row = ['15/04/2026', 'ALIMENT', 'Sac 40kg', '12000', 'Dépense', ''];
    const m = mapFinance(HEADER, row);
    expect(m).not.toBeNull();
    expect(m?.type).toBe('DEPENSE');
    expect(m?.montant).toBe(12000);
    expect(m?.categorie).toBe('ALIMENT');
    expect(m?.libelle).toBe('Sac 40kg');
    expect(m?.date).toBe('15/04/2026');
  });

  it('détecte REVENU via type="Vente"', () => {
    const row = ['20/04/2026', 'VENTE_PORCELET', 'Portée T01', '250000', 'Vente', ''];
    const m = mapFinance(HEADER, row);
    expect(m).not.toBeNull();
    expect(m?.type).toBe('REVENU');
    expect(m?.montant).toBe(250000);
  });

  it('retourne null pour une ligne vide', () => {
    const row = ['', '', '', '', '', ''];
    expect(mapFinance(HEADER, row)).toBeNull();
  });

  it('reste tolérant : type absent → DEPENSE par défaut', () => {
    const headerNoType = ['DATE', 'CATEGORIE', 'LIBELLE', 'MONTANT'];
    const row = ['01/04/2026', 'SANTE', 'Vaccin', '5000'];
    const m = mapFinance(headerNoType, row);
    expect(m?.type).toBe('DEPENSE');
    expect(m?.montant).toBe(5000);
  });

  it('tolère les variantes de colonnes accentuées (PÉRIODE, CATÉGORIE, LIBELLÉ)', () => {
    const header = ['PÉRIODE', 'CATÉGORIE', 'LIBELLÉ', 'MONTANT FCFA', 'NATURE'];
    const row = ['15/04/2026', 'ENERGIE', 'Facture CIE', '8500', 'Dépense'];
    const m = mapFinance(header, row);
    expect(m?.categorie).toBe('ENERGIE');
    expect(m?.libelle).toBe('Facture CIE');
    expect(m?.montant).toBe(8500);
    expect(m?.type).toBe('DEPENSE');
  });

  it('parse un montant avec séparateur de milliers "12 000"', () => {
    const row = ['15/04/2026', 'ALIMENT', 'Sac', '12 000', 'Dépense', ''];
    const m = mapFinance(HEADER, row);
    expect(m?.montant).toBe(12000);
  });

  it('parse un montant négatif en valeur absolue (type porte le signe)', () => {
    const row = ['15/04/2026', 'ALIMENT', 'Sac', '-12000', 'Dépense', ''];
    const m = mapFinance(HEADER, row);
    expect(m?.montant).toBe(12000);
    expect(m?.type).toBe('DEPENSE');
  });
});

// ── summarizeByPeriode ──────────────────────────────────────────────────────

describe('summarizeByPeriode', () => {
  it('filtre par période YYYY-MM et agrège par catégorie', () => {
    const entries: FinanceEntry[] = [
      entry({ date: '01/04/2026', categorie: 'ALIMENT', montant: 10000, type: 'DEPENSE' }),
      entry({ date: '15/04/2026', categorie: 'ALIMENT', montant: 5000, type: 'DEPENSE' }),
      entry({ date: '20/04/2026', categorie: 'VENTE', montant: 30000, type: 'REVENU' }),
      entry({ date: '10/03/2026', categorie: 'ALIMENT', montant: 9999, type: 'DEPENSE' }), // hors période
    ];

    const s = summarizeByPeriode(entries, '2026-04');
    expect(s.totalDepenses).toBe(15000);
    expect(s.totalRevenus).toBe(30000);
    expect(s.margeNette).toBe(15000);
    expect(s.parCategorie.ALIMENT.depenses).toBe(15000);
    expect(s.parCategorie.VENTE.revenus).toBe(30000);
    expect(s.parCategorie.ALIMENT.revenus).toBe(0);
  });

  it('summarizeAll agrège tout sans filtrer', () => {
    const entries: FinanceEntry[] = [
      entry({ date: '01/04/2026', montant: 1000, type: 'DEPENSE' }),
      entry({ date: '01/03/2026', montant: 2000, type: 'DEPENSE' }),
      entry({ date: '01/02/2026', montant: 5000, type: 'REVENU' }),
    ];
    const s = summarizeAll(entries);
    expect(s.totalDepenses).toBe(3000);
    expect(s.totalRevenus).toBe(5000);
    expect(s.margeNette).toBe(2000);
    expect(s.periode).toBe('all');
  });

  it('marge négative si dépenses > revenus', () => {
    const entries: FinanceEntry[] = [
      entry({ date: '15/04/2026', montant: 50000, type: 'DEPENSE' }),
      entry({ date: '16/04/2026', montant: 10000, type: 'REVENU' }),
    ];
    const s = summarizeByPeriode(entries, '2026-04');
    expect(s.margeNette).toBe(-40000);
  });
});

// ── parseMontant / formatMontant ────────────────────────────────────────────

describe('parseMontant', () => {
  it('parse "12 000 FCFA" → 12000', () => {
    expect(parseMontant('12 000 FCFA')).toBe(12000);
  });
  it('parse un nombre natif', () => {
    expect(parseMontant(12500)).toBe(12500);
  });
  it('parse format FR avec virgule décimale', () => {
    expect(parseMontant('1 250,50')).toBeCloseTo(1250.5);
  });
  it('tolère null/undefined/chaîne vide', () => {
    expect(parseMontant(null)).toBe(0);
    expect(parseMontant(undefined)).toBe(0);
    expect(parseMontant('')).toBe(0);
    expect(parseMontant('abc')).toBe(0);
  });
  it('conserve le signe négatif', () => {
    expect(parseMontant('-3 500')).toBe(-3500);
  });
});

describe('formatMontant', () => {
  it('formate 12000 en FCFA avec séparateur insécable', () => {
    // Le séparateur est un NBSP (\u00A0), pas un espace simple.
    expect(formatMontant(12000)).toBe('12\u00A0000 FCFA');
  });
  it('formate en EUR avec 2 décimales', () => {
    expect(formatMontant(1250.5, 'EUR')).toBe('1\u00A0250,50 €');
  });
  it('formate un montant négatif', () => {
    expect(formatMontant(-4500)).toBe('-4\u00A0500 FCFA');
  });
  it('round-trip parse → format (12000)', () => {
    const parsed = parseMontant('12 000 FCFA');
    const formatted = formatMontant(parsed);
    expect(formatted).toContain('12');
    expect(formatted).toContain('000');
    expect(formatted).toContain('FCFA');
  });
});

// ── getPeriodes ─────────────────────────────────────────────────────────────

describe('getPeriodes', () => {
  it('retourne les périodes distinctes triées décroissant', () => {
    const entries: FinanceEntry[] = [
      entry({ date: '05/02/2026' }),
      entry({ date: '15/04/2026' }),
      entry({ date: '20/04/2026' }), // même période que ci-dessus
      entry({ date: '10/03/2026' }),
    ];
    expect(getPeriodes(entries)).toEqual(['2026-04', '2026-03', '2026-02']);
  });

  it('ignore les dates invalides', () => {
    const entries: FinanceEntry[] = [
      entry({ date: '15/04/2026' }),
      entry({ date: '' }),
      entry({ date: 'bogus' }),
    ];
    expect(getPeriodes(entries)).toEqual(['2026-04']);
  });
});

// ── categorieToTone ─────────────────────────────────────────────────────────

describe('categorieToTone', () => {
  it('REVENU/VENTE → accent', () => {
    expect(categorieToTone('VENTE_PORCELET')).toBe('accent');
    expect(categorieToTone('REVENU')).toBe('accent');
    expect(categorieToTone('Recette diverse')).toBe('accent');
  });
  it('ALIMENT/NUTRITION → amber', () => {
    expect(categorieToTone('ALIMENT')).toBe('amber');
    expect(categorieToTone('nutrition')).toBe('amber');
    expect(categorieToTone('PROVENDE')).toBe('amber');
  });
  it('SANTE/VETO → red', () => {
    expect(categorieToTone('SANTE')).toBe('red');
    expect(categorieToTone('Vétérinaire')).toBe('red');
    expect(categorieToTone('SOIN')).toBe('red');
  });
  it('ENERGIE/EAU → blue', () => {
    expect(categorieToTone('ENERGIE')).toBe('blue');
    expect(categorieToTone('EAU')).toBe('blue');
    expect(categorieToTone('Carburant')).toBe('blue');
  });
  it('inconnu → default', () => {
    expect(categorieToTone('AUTRE')).toBe('default');
    expect(categorieToTone('')).toBe('default');
  });
});

// ── Utilitaires annexes ─────────────────────────────────────────────────────

describe('dateToPeriode', () => {
  it('convertit dd/MM/yyyy → YYYY-MM', () => {
    expect(dateToPeriode('15/04/2026')).toBe('2026-04');
    expect(dateToPeriode('01/12/2025')).toBe('2025-12');
  });
  it('retourne "" si date invalide', () => {
    expect(dateToPeriode('')).toBe('');
    expect(dateToPeriode('bogus')).toBe('');
  });
});

describe('detectCurrency', () => {
  it('détecte EUR si le libellé contient €', () => {
    expect(detectCurrency({ libelle: 'Achat vaccin 45 €' })).toBe('EUR');
  });
  it('détecte EUR si les notes contiennent EUR', () => {
    expect(detectCurrency({ libelle: 'x', notes: 'paid in EUR' })).toBe('EUR');
  });
  it('FCFA par défaut', () => {
    expect(detectCurrency({ libelle: 'Sac 40kg' })).toBe('FCFA');
    expect(detectCurrency({ libelle: '', notes: '' })).toBe('FCFA');
  });
});
