/**
 * Tests unitaires — Pipeline formules aliment Sheets → FormuleAliment[].
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Couvre :
 *  - `mapFormuleRow` nominal (ingrédient, additif, variantes de colonnes)
 *  - `mapFormuleRow` lignes rejetées (vide, type/unité inconnus)
 *  - `aggregateFormulesFromRows` — regroupement 5 phases complètes
 *  - Tri par ORDRE respecté
 *  - Séparation stricte INGREDIENT / ADDITIF
 *  - Ignore les codes phase inconnus
 *  - Tableau vide si aucune ligne exploitable
 */

import { describe, expect, it } from 'vitest';
import { mapFormuleRow } from '../mappers';
import {
  aggregateFormulesFromRows,
  type PhaseCode,
} from '../config/aliments';
import type { FormuleRowSheets } from '../types/farm';

const STD_HEADER = [
  'CODE_PHASE',
  'NOM_PHASE',
  'POIDS_RANGE',
  'TYPE_COMPOSANT',
  'NOM',
  'VALEUR',
  'UNITE',
  'ORDRE',
  'NOTES',
];

function row(
  codePhase: string,
  nomPhase: string,
  poidsRange: string,
  type: string,
  nom: string,
  valeur: number | string,
  unite: string,
  ordre: number | string,
  notes: string = '',
): (string | number)[] {
  return [codePhase, nomPhase, poidsRange, type, nom, valeur, unite, ordre, notes];
}

// ─── mapFormuleRow ──────────────────────────────────────────────────────────
describe('mapFormuleRow — cas nominaux', () => {
  it('lit une ligne ingrédient complète', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('DEMARRAGE_1', 'Porcelets — Démarrage 1', '7 → 15 kg', 'INGREDIENT', 'Romelko', 50, '%', 1),
    );
    expect(r).not.toBeNull();
    expect(r).toEqual({
      codePhase: 'DEMARRAGE_1',
      nomPhase: 'Porcelets — Démarrage 1',
      poidsRange: '7 → 15 kg',
      typeComposant: 'INGREDIENT',
      nom: 'Romelko',
      valeur: 50,
      unite: '%',
      ordre: 1,
      notes: undefined,
    });
  });

  it('lit une ligne additif en kg/T', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('DEMARRAGE_1', 'Porcelets — Démarrage 1', '7 → 15 kg', 'ADDITIF', 'Lysine', 1, 'kg/T', 1),
    );
    expect(r?.typeComposant).toBe('ADDITIF');
    expect(r?.unite).toBe('kg/T');
    expect(r?.valeur).toBe(1);
  });

  it('lit une ligne additif en g/T', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('DEMARRAGE_1', '', '', 'ADDITIF', 'Enzymes', 300, 'g/T', 3),
    );
    expect(r?.unite).toBe('g/T');
    expect(r?.valeur).toBe(300);
  });

  it('accepte les variantes de noms de colonnes (CODE / VAL / TYPE)', () => {
    const header = ['CODE', 'NOM_PHASE', 'POIDS', 'TYPE', 'NOM', 'VAL', 'UNITE', 'ORDRE'];
    const r = mapFormuleRow(
      header,
      ['CROISSANCE', 'Croissance', '25 → 50 kg', 'INGREDIENT', 'Maïs', 68, '%', 2],
    );
    expect(r?.codePhase).toBe('CROISSANCE');
    expect(r?.valeur).toBe(68);
    expect(r?.typeComposant).toBe('INGREDIENT');
  });

  it('normalise le CODE_PHASE en UPPERCASE', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('demarrage_1', '', '', 'INGREDIENT', 'Maïs', 34, '%', 3),
    );
    expect(r?.codePhase).toBe('DEMARRAGE_1');
  });

  it('normalise l\'UNITE avec espaces / casse variables', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('DEMARRAGE_1', '', '', 'ADDITIF', 'Lysine', 1, 'Kg/T', 1),
    );
    expect(r?.unite).toBe('kg/T');
  });

  it('ingrédient sans unité renseignée → défaut `%`', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('DEMARRAGE_1', '', '', 'INGREDIENT', 'Son de blé', 3, '', 4),
    );
    expect(r?.unite).toBe('%');
  });

  it('remplit ordre = 0 si cellule ORDRE vide', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('DEMARRAGE_1', '', '', 'INGREDIENT', 'Maïs', 34, '%', ''),
    );
    expect(r?.ordre).toBe(0);
  });
});

describe('mapFormuleRow — lignes rejetées', () => {
  it('retourne null pour une ligne entièrement vide', () => {
    const r = mapFormuleRow(STD_HEADER, ['', '', '', '', '', '', '', '', '']);
    expect(r).toBeNull();
  });

  it('retourne null si TYPE_COMPOSANT inconnu', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('DEMARRAGE_1', '', '', 'XXXX', 'Mystère', 10, '%', 1),
    );
    expect(r).toBeNull();
  });

  it('retourne null si UNITE inconnue pour un additif', () => {
    const r = mapFormuleRow(
      STD_HEADER,
      row('DEMARRAGE_1', '', '', 'ADDITIF', 'Mystère', 10, 'bidule/T', 1),
    );
    expect(r).toBeNull();
  });
});

// ─── aggregateFormulesFromRows ──────────────────────────────────────────────
describe('aggregateFormulesFromRows — regroupement 5 phases', () => {
  /** Construit un jeu complet 5 phases × (base + 1 additif) pour tests. */
  const buildFullRows = (): FormuleRowSheets[] => {
    const phases: Array<{ code: PhaseCode; nom: string; poids: string }> = [
      { code: 'DEMARRAGE_1', nom: 'Porcelets — Démarrage 1', poids: '7 → 15 kg' },
      { code: 'CROISSANCE', nom: 'Croissance', poids: '25 → 50 kg' },
      { code: 'FINITION', nom: 'Finition', poids: '50 → 100 kg' },
      { code: 'TRUIE_GESTATION', nom: 'Truie gestante', poids: 'Truies pleines' },
      { code: 'TRUIE_LACTATION', nom: 'Truie lactation', poids: 'Truies allaitantes' },
    ];
    const rows: FormuleRowSheets[] = [];
    for (const p of phases) {
      rows.push({
        codePhase: p.code, nomPhase: p.nom, poidsRange: p.poids,
        typeComposant: 'INGREDIENT', nom: 'Maïs', valeur: 60, unite: '%', ordre: 1,
      });
      rows.push({
        codePhase: p.code, nomPhase: p.nom, poidsRange: p.poids,
        typeComposant: 'INGREDIENT', nom: 'Tourteau soja', valeur: 40, unite: '%', ordre: 2,
      });
      rows.push({
        codePhase: p.code, nomPhase: p.nom, poidsRange: p.poids,
        typeComposant: 'ADDITIF', nom: 'Lysine', valeur: 1, unite: 'kg/T', ordre: 3,
      });
    }
    return rows;
  };

  it('regroupe 5 phases avec ingrédients + additifs séparés', () => {
    const result = aggregateFormulesFromRows(buildFullRows());
    expect(result).toHaveLength(5);

    const dem = result.find((f) => f.code === 'DEMARRAGE_1');
    expect(dem).toBeDefined();
    expect(dem!.ingredients).toHaveLength(2);
    expect(dem!.additifs).toHaveLength(1);
    expect(dem!.nom).toBe('Porcelets — Démarrage 1');
    expect(dem!.poidsRange).toBe('7 → 15 kg');

    expect(dem!.ingredients[0]).toEqual({ nom: 'Maïs', pourcent: 60 });
    expect(dem!.additifs[0]).toEqual({ nom: 'Lysine', dose: 1, unite: 'kg/T' });
  });

  it('respecte l\'ordre stable des phases (KNOWN_PHASE_CODES)', () => {
    const result = aggregateFormulesFromRows(buildFullRows());
    expect(result.map((f) => f.code)).toEqual([
      'DEMARRAGE_1',
      'CROISSANCE',
      'FINITION',
      'TRUIE_GESTATION',
      'TRUIE_LACTATION',
    ]);
  });

  it('trie les composants intra-phase par `ordre` asc', () => {
    // Rows injectés dans le désordre (ordre 3, 1, 2)
    const rows: FormuleRowSheets[] = [
      { codePhase: 'CROISSANCE', nomPhase: 'Croissance', poidsRange: '25 → 50 kg',
        typeComposant: 'INGREDIENT', nom: 'Soja', valeur: 17, unite: '%', ordre: 3 },
      { codePhase: 'CROISSANCE', nomPhase: 'Croissance', poidsRange: '25 → 50 kg',
        typeComposant: 'INGREDIENT', nom: 'Maïs', valeur: 68, unite: '%', ordre: 1 },
      { codePhase: 'CROISSANCE', nomPhase: 'Croissance', poidsRange: '25 → 50 kg',
        typeComposant: 'INGREDIENT', nom: 'Son', valeur: 15, unite: '%', ordre: 2 },
    ];
    const [croissance] = aggregateFormulesFromRows(rows);
    expect(croissance.ingredients.map((i) => i.nom)).toEqual(['Maïs', 'Son', 'Soja']);
  });

  it('ignore les codes phase inconnus', () => {
    const rows: FormuleRowSheets[] = [
      { codePhase: 'CROISSANCE', nomPhase: '', poidsRange: '',
        typeComposant: 'INGREDIENT', nom: 'Maïs', valeur: 100, unite: '%', ordre: 1 },
      { codePhase: 'PHASE_FANTASIA', nomPhase: '', poidsRange: '',
        typeComposant: 'INGREDIENT', nom: 'Pépites magiques', valeur: 99, unite: '%', ordre: 1 },
    ];
    const result = aggregateFormulesFromRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('CROISSANCE');
  });

  it('ignore les ingrédients non exprimés en % (incohérence)', () => {
    const rows: FormuleRowSheets[] = [
      { codePhase: 'CROISSANCE', nomPhase: 'Croissance', poidsRange: '25 → 50 kg',
        typeComposant: 'INGREDIENT', nom: 'Maïs', valeur: 68, unite: '%', ordre: 1 },
      { codePhase: 'CROISSANCE', nomPhase: '', poidsRange: '',
        typeComposant: 'INGREDIENT', nom: 'Suspect', valeur: 5, unite: 'kg/T', ordre: 2 },
    ];
    const [c] = aggregateFormulesFromRows(rows);
    expect(c.ingredients.map((i) => i.nom)).toEqual(['Maïs']);
  });

  it('skip une phase sans aucun ingrédient (uniquement additifs)', () => {
    const rows: FormuleRowSheets[] = [
      { codePhase: 'CROISSANCE', nomPhase: '', poidsRange: '',
        typeComposant: 'ADDITIF', nom: 'Lysine', valeur: 1, unite: 'kg/T', ordre: 1 },
    ];
    expect(aggregateFormulesFromRows(rows)).toEqual([]);
  });

  it('retourne [] si aucune ligne exploitable', () => {
    expect(aggregateFormulesFromRows([])).toEqual([]);
  });

  it('utilise les libellés par défaut si nomPhase/poidsRange vides', () => {
    const rows: FormuleRowSheets[] = [
      { codePhase: 'FINITION', nomPhase: '', poidsRange: '',
        typeComposant: 'INGREDIENT', nom: 'Maïs', valeur: 70, unite: '%', ordre: 1 },
    ];
    const [f] = aggregateFormulesFromRows(rows);
    expect(f.nom).toBe('Finition');
    expect(f.poidsRange).toBe('50 → 100 kg');
  });
});
