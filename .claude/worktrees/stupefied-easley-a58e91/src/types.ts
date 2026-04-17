export type AnimalStatus = 'Gestante' | 'Allaitante' | 'Flushing' | 'Observation' | 'Saillie' | 'Vide' | 'Mise bas à confirmer';

export interface Animal {
  id: string; // e.g. T1, V1
  boucle: string;
  nom: string;
  race: string;
  poids: number;
  dateNaissance: string;
  photo?: string;
  statut: AnimalStatus;
  dateSaillie?: string;
  verrat?: string;
  dateMBPrevue?: string;
  nbPorcelets?: number;
  notes?: string;
  historique?: { date: string; event: string }[];
}

export interface Event {
  id: string;
  animalId: string;
  type: 'MB' | 'saillie' | 'mort' | 'maladie' | 'traitement' | 'autre';
  date: string;
  description: string;
  synced: boolean;
}

export interface StockItem {
  id: string;
  nom: string;
  quantite: number;
  unite: string;
  alerte: 'RUPTURE' | 'BAS' | 'OK';
  prixUnitaire?: number;
  type?: 'ALIMENT' | 'MEDICAMENT' | 'MATERIEL';
}

export interface Formula {
  id: string;
  nom: string;
  phase: string;
  composition: {
    ingredient: string;
    pourcentage: number;
  }[];
  coutKg: number;
}

export interface BiosecurityMeasure {
  id: string;
  categorie: 'Infrastructure' | 'Protocole' | 'Sanitaire';
  nom: string;
  description: string;
  frequence: string;
  statut: 'OK' | 'A_VERIFIER' | 'ALERTE';
}

export interface Portee {
  id: string;
  loge: string;
  mereId: string;
  bandeId?: string;
  dateMB: string;
  vivants: number;
  statut: 'sous_mere' | 'sevre' | 'engraissement';
}

export interface Bande {
  id: string;
  nom: string;
  dateDebut: string;
  statut: 'en_cours' | 'termine';
  type: 'gestation' | 'maternite' | 'post_sevrage' | 'engraissement';
  nbSujets: number;
  poidsMoyen?: number;
}

export interface SyncQueueItem {
  id: string;
  table: string;
  data: any;
  timestamp: string;
}

export interface HealthRecord {
  id: string;
  animalId: string;
  produit: string;
  dose: string;
  date: string;
  veto: string;
}

export interface Ration {
  id: string;
  animalIdOrGroup: string;
  alimentId: string;
  quantite: number;
  date: string;
}
