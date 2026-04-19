/**
 * Tests unitaires — mappers
 * ═════════════════════════
 * Couvre les colonnes nouvellement introduites sur `PORCELETS_BANDES` pour
 * la séparation par sexe (nbMales, nbFemelles, logeEngraissement, dateSeparation).
 */

import { describe, expect, it } from 'vitest';
import { mapBande } from './index';

describe('mapBande — séparation par sexe', () => {
  it('lit nbMales / nbFemelles / logeEngraissement / dateSeparation si colonnes présentes', () => {
    const header = [
      'ID PORTÉE', 'TRUIE', 'BOUCLE MÈRE', 'DATE MB',
      'NV', 'MORTS', 'VIVANTS', 'STATUT',
      'NB_MALES', 'NB_FEMELLES', 'LOGE_ENG', 'DATE_SEPARATION',
    ];
    const row = [
      'P42', 'T03', 'FR-12345', '10/01/2026',
      12, 2, 10, 'Sevrés',
      18, 17, 'M', '11/03/2026',
    ];

    const bande = mapBande(header, row);
    expect(bande).not.toBeNull();
    expect(bande?.nbMales).toBe(18);
    expect(bande?.nbFemelles).toBe(17);
    expect(bande?.logeEngraissement).toBe('M');
    expect(bande?.dateSeparation).toBe('11/03/2026');
  });

  it('accepte les variantes de noms de colonnes (accents, underscore, uppercase)', () => {
    const header = [
      'ID', 'STATUT', 'VIVANTS',
      'MÂLES', 'FEMELLES', 'LOGE', 'SEPARATION',
    ];
    const row = ['P43', 'Sevrés', 30, '15', '15', 'F', '20/03/2026'];

    const bande = mapBande(header, row);
    expect(bande?.nbMales).toBe(15);
    expect(bande?.nbFemelles).toBe(15);
    expect(bande?.logeEngraissement).toBe('F');
    expect(bande?.dateSeparation).toBe('20/03/2026');
  });

  it('retourne undefined pour les nouveaux champs si les colonnes sont absentes (compat)', () => {
    const header = ['ID PORTÉE', 'TRUIE', 'DATE MB', 'VIVANTS', 'STATUT'];
    const row = ['P99', 'T01', '01/01/2026', 10, 'Sous mère'];

    const bande = mapBande(header, row);
    expect(bande).not.toBeNull();
    expect(bande?.nbMales).toBeUndefined();
    expect(bande?.nbFemelles).toBeUndefined();
    expect(bande?.logeEngraissement).toBeUndefined();
    expect(bande?.dateSeparation).toBeUndefined();
  });

  it('retourne undefined pour logeEngraissement si valeur non reconnue', () => {
    const header = ['ID', 'STATUT', 'LOGE_ENG'];
    const row = ['P44', 'Sevrés', 'X'];

    const bande = mapBande(header, row);
    expect(bande?.logeEngraissement).toBeUndefined();
  });

  it("retourne undefined pour nbMales si la cellule est vide", () => {
    const header = ['ID', 'STATUT', 'NB_MALES', 'NB_FEMELLES'];
    const row = ['P45', 'Sevrés', '', ''];

    const bande = mapBande(header, row);
    expect(bande?.nbMales).toBeUndefined();
    expect(bande?.nbFemelles).toBeUndefined();
  });
});
