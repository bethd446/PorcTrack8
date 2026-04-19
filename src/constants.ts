import { Animal, StockItem, Bande } from './types';

// Données mock de démarrage — remplacées dès que FarmContext charge depuis Sheets
export const INITIAL_ANIMALS: Animal[] = [
  {
    id: 'V1', displayId: 'V1', boucle: 'B-V1', nom: 'Verrat 1', race: 'Large White',
    statut: 'Actif', type: 'VERRAT', ration: 2.5,
  },
  {
    id: 'V2', displayId: 'V2', boucle: 'B-V2', nom: 'Verrat 2', race: 'Piétrain',
    statut: 'Actif', type: 'VERRAT', ration: 2.5,
  },
  { id: 'T1', displayId: 'T1', boucle: 'B-T1', nom: 'Truie 1', race: 'Large White', statut: 'Pleine', type: 'TRUIE', ration: 3, dateMBPrevue: '2026-07-04' },
  { id: 'T2', displayId: 'T2', boucle: 'B-T2', nom: 'Truie 2', race: 'Large White', statut: 'En maternité', type: 'TRUIE', ration: 5, dateMBPrevue: '2026-03-19' },
  { id: 'T3', displayId: 'T3', boucle: 'B-T3', nom: 'Truie 3', race: 'Large White', statut: 'En attente saillie', type: 'TRUIE', ration: 2.5 },
  { id: 'T4', displayId: 'T4', boucle: 'B-T4', nom: 'Truie 4', race: 'Large White', statut: 'Pleine', type: 'TRUIE', ration: 3, dateMBPrevue: '2026-04-09' },
  { id: 'T5', displayId: 'T5', boucle: 'B-T5', nom: 'Truie 5', race: 'Large White', statut: 'En attente saillie', type: 'TRUIE', ration: 2.5 },
  { id: 'T6', displayId: 'T6', boucle: 'B-T6', nom: 'Truie 6', race: 'Large White', statut: 'À surveiller', type: 'TRUIE', ration: 2.5 },
  { id: 'T7', displayId: 'T7', boucle: 'B-T7', nom: 'Truie 7', race: 'Large White', statut: 'Pleine', type: 'TRUIE', ration: 3, dateMBPrevue: '2026-04-17' },
  { id: 'T8', displayId: 'T8', boucle: 'B-T8', nom: 'Truie 8', race: 'Large White', statut: 'En maternité', type: 'TRUIE', ration: 5 },
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `T${i + 9}`,
    displayId: `T${i + 9}`,
    boucle: `B-T${i + 9}`,
    nom: `Truie ${i + 9}`,
    race: 'Large White' as const,
    statut: 'En attente saillie',
    type: 'TRUIE' as const,
    ration: 2.5,
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
