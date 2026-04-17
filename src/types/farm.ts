export type DataSource = 'NETWORK' | 'CACHE' | 'FALLBACK';
export type SyncStatus = 'synced' | 'pending' | 'offline';

export interface TableIndexEntry {
  key: string;
  sheetName: string;
  headerRow: number;
  idHeader: string;
  module: string;
}

export interface Truie {
  id: string;
  displayId: string;
  boucle: string;
  nom?: string;
  race?: string;
  statut: string;
  ration: number;
  emplacement?: string;
  stade?: string;
  nbPortees?: number;
  poids?: number;
  dateDerniereMB?: string;
  dateMBPrevue?: string;
  nvMoyen?: number;
  synced: boolean;
  raw?: any[];
}

export interface Verrat {
  id: string;
  displayId: string;
  boucle: string;
  nom?: string;
  race?: string;
  statut: string;
  ration: number;
  poids?: number;
  dateNaissance?: string;
  synced: boolean;
  raw?: any[];
}

export interface BandePorcelets {
  id: string;
  idPortee: string;
  truie?: string;
  boucleMere?: string;
  dateMB?: string;
  nv?: number;
  morts?: number;
  vivants?: number;
  statut: string;
  dateSevragePrevue?: string;
  dateSevrageReelle?: string;
  synced: boolean;
  raw?: any[];
}

export interface TraitementSante {
  id: string;
  date: string;
  cibleType: 'TRUIE' | 'VERRAT' | 'BANDE' | 'GENERAL';
  cibleId: string;
  typeSoin: string;
  traitement: string;
  observation: string;
  auteur?: string;
  synced: boolean;
}

export interface StockAliment {
  id: string;
  nom: string;
  type: string;
  quantite: number;
  unite: string;
  alerte: number;
  statut: 'OK' | 'BAS' | 'RUPTURE';
}

export interface StockVeto {
  id: string;
  nom: string;
  quantite: number;
  unite: string;
  dlc?: string;
  alerte: number;
}

export interface FarmState {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  sante: TraitementSante[];
  stockAliment: StockAliment[];
  stockVeto: StockVeto[];
  lastUpdate: number;
  syncStatus: SyncStatus;
}
