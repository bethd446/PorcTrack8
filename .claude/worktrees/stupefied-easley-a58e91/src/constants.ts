import { Animal, StockItem, Bande } from './types';

export const INITIAL_ANIMALS: Animal[] = [
  { 
    id: 'V1', boucle: 'B-V1', nom: 'Verrat 1', race: 'Large White', poids: 250, dateNaissance: '2024-01-10', statut: 'Vide',
    historique: [{ date: '2026-03-15', event: 'Saillie T4' }, { date: '2026-03-20', event: 'Saillie T7' }]
  },
  { 
    id: 'V2', boucle: 'B-V2', nom: 'Verrat 2', race: 'Piétrain', poids: 280, dateNaissance: '2024-02-15', statut: 'Vide',
    historique: [{ date: '2026-03-10', event: 'Saillie T1' }]
  },
  // Truies avec statuts variés
  { id: 'T1', boucle: 'B-T1', nom: 'Truie 1', race: 'Large White', poids: 210, dateNaissance: '2024-03-01', statut: 'Gestante', dateSaillie: '2026-03-10', dateMBPrevue: '2026-07-04' },
  { id: 'T2', boucle: 'B-T2', nom: 'Truie 2', race: 'Large White', poids: 195, dateNaissance: '2024-03-01', statut: 'Allaitante', dateMBPrevue: '2026-03-19', nbPorcelets: 12, dateSaillie: '2025-11-25' },
  { id: 'T3', boucle: 'B-T3', nom: 'Truie 3', race: 'Large White', poids: 205, dateNaissance: '2024-03-01', statut: 'Flushing' },
  { id: 'T4', boucle: 'B-T4', nom: 'Truie 4', race: 'Large White', poids: 220, dateNaissance: '2024-03-01', statut: 'Gestante', dateSaillie: '2025-12-15', dateMBPrevue: '2026-04-09' }, // MB Dépassée (Aujourd'hui est le 10 Avril)
  { id: 'T5', boucle: 'B-T5', nom: 'Truie 5', race: 'Large White', poids: 200, dateNaissance: '2024-03-01', statut: 'Vide' },
  { id: 'T6', boucle: 'B-T6', nom: 'Truie 6', race: 'Large White', poids: 215, dateNaissance: '2024-03-01', statut: 'Observation' },
  { id: 'T7', boucle: 'B-T7', nom: 'Truie 7', race: 'Large White', poids: 190, dateNaissance: '2024-03-01', statut: 'Gestante', dateSaillie: '2025-12-23', dateMBPrevue: '2026-04-17' },
  { id: 'T8', boucle: 'B-T8', nom: 'Truie 8', race: 'Large White', poids: 205, dateNaissance: '2024-03-01', statut: 'Allaitante', dateMBPrevue: '2026-03-10', nbPorcelets: 10, dateSaillie: '2025-11-15' },
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `T${i + 9}`,
    boucle: `B-T${i + 9}`,
    nom: `Truie ${i + 9}`,
    race: 'Large White' as const,
    poids: 200,
    dateNaissance: '2024-03-01',
    statut: 'Vide' as const,
  })),
];

export const STOCK_ITEMS: StockItem[] = [
  { id: '1', nom: 'Koudijs KPC 5%', quantite: 500, unite: 'kg', alerte: 'OK', prixUnitaire: 1352, type: 'ALIMENT' },
  { id: '2', nom: 'Koudijs Romelko RED', quantite: 250, unite: 'kg', alerte: 'OK', prixUnitaire: 698, type: 'ALIMENT' },
  { id: '3', nom: 'Vitalac ECOLAC', quantite: 100, unite: 'kg', alerte: 'OK', prixUnitaire: 1000, type: 'ALIMENT' },
  { id: '4', nom: 'Vitalac AMV 5%', quantite: 50, unite: 'kg', alerte: 'BAS', prixUnitaire: 1120, type: 'ALIMENT' },
  { id: '5', nom: 'Maïs Grain', quantite: 2000, unite: 'kg', alerte: 'OK', prixUnitaire: 200, type: 'ALIMENT' },
  { id: '6', nom: 'Tourteau de Soja', quantite: 1000, unite: 'kg', alerte: 'OK', prixUnitaire: 500, type: 'ALIMENT' },
  { id: '7', nom: 'Son de Blé', quantite: 800, unite: 'kg', alerte: 'OK', prixUnitaire: 175, type: 'ALIMENT' },
  { id: '8', nom: 'Son de Riz', quantite: 0, unite: 'kg', alerte: 'RUPTURE', prixUnitaire: 65, type: 'ALIMENT' },
];

export const INITIAL_BANDES: Bande[] = [
  { id: 'B1', nom: 'Bande Maternité A', dateDebut: '2026-03-20', statut: 'en_cours', type: 'maternite', nbSujets: 12 },
];

export const GESTATION_DAYS = 115; // 3 months, 3 weeks, 3 days
export const WEANING_DAYS_OPTIMAL = 21;
export const WEANING_DAYS_MAX = 28;
export const WEANING_WEIGHT_MIN = 6; 
export const WEANING_DAYS = 21;
export const NURSERY_DAYS = 42;
export const FATTENING_DAYS = 100;
