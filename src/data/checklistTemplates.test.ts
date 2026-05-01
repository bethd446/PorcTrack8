import { describe, it, expect } from 'vitest';
import {
  CHECKLIST_TEMPLATES,
  CHECKLIST_TEMPLATES_META,
  getCombinedTemplate,
} from './checklistTemplates';

describe('checklistTemplates', () => {
  it('GENERAL template contient 3 items dont eau et aliment marqués critical', () => {
    const t = CHECKLIST_TEMPLATES.GENERAL;
    expect(t).toHaveLength(3);
    const eau = t.find(i => i.id === 'eau');
    const aliment = t.find(i => i.id === 'aliment');
    expect(eau?.critical).toBe(true);
    expect(aliment?.critical).toBe(true);
  });

  it('MISE_BAS template contient 5 items spécifiques mise-bas', () => {
    const t = CHECKLIST_TEMPLATES.MISE_BAS;
    expect(t).toHaveLength(5);
    expect(t.map(i => i.id)).toEqual([
      'mise_bas_imminente',
      'porcelets_naissance_secs',
      'fer_j3',
      'colostrum_pris',
      'mortalite_porcelets',
    ]);
  });

  it('SEVRAGE template contient 5 items dont pesee_avant_sevrage et truie_libere_loge', () => {
    const t = CHECKLIST_TEMPLATES.SEVRAGE;
    expect(t).toHaveLength(5);
    expect(t.find(i => i.id === 'pesee_avant_sevrage')).toBeDefined();
    expect(t.find(i => i.id === 'truie_libere_loge')).toBeDefined();
  });

  it('SORTIE_VENTE template contient 5 items dont pesee_finale et paiement_recu', () => {
    const t = CHECKLIST_TEMPLATES.SORTIE_VENTE;
    expect(t).toHaveLength(5);
    expect(t.find(i => i.id === 'pesee_finale')).toBeDefined();
    expect(t.find(i => i.id === 'paiement_recu')).toBeDefined();
  });

  it('META expose les 4 templates dans l’ordre attendu', () => {
    expect(CHECKLIST_TEMPLATES_META.map(m => m.key)).toEqual([
      'GENERAL',
      'MISE_BAS',
      'SEVRAGE',
      'SORTIE_VENTE',
    ]);
  });

  it('getCombinedTemplate concatène les 4 templates dans l’ordre métier', () => {
    const combined = getCombinedTemplate();
    const expectedLength =
      CHECKLIST_TEMPLATES.GENERAL.length +
      CHECKLIST_TEMPLATES.MISE_BAS.length +
      CHECKLIST_TEMPLATES.SEVRAGE.length +
      CHECKLIST_TEMPLATES.SORTIE_VENTE.length;
    expect(combined).toHaveLength(expectedLength);
    expect(combined[0].id).toBe('eau');
    expect(combined[combined.length - 1].id).toBe('paiement_recu');
  });
});
