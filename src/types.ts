/**
 * PorcTrack — Types partagés (vue unifiée)
 * ════════════════════════════════════════════
 * Source de vérité principale : src/types/farm.ts
 * Ce fichier contient uniquement les types UI (Animal, Note, etc.)
 * qui ne correspondent pas directement à une table Sheets.
 *
 * Pas de duplication : Truie, Verrat, BandePorcelets, etc. sont dans types/farm.ts
 */

// ── Re-exports depuis farm.ts pour éviter les imports multiples ───────────────
export type {
  Truie, Verrat, BandePorcelets, TraitementSante,
  StockAliment, StockVeto, FarmState, SyncStatus,
  DataSource, TableIndexEntry
} from './types/farm';

// ── Type unifié Animal (TRUIE | VERRAT) ──────────────────────────────────────
// Utilisé par AnimalDetailView, CheptelView, FarmContext.getAnimalById()
// Fusion de Truie + Verrat en un type générique pour l'UI

export type AnimalStatus =
  | 'Gestante' | 'Allaitante' | 'Flushing' | 'Observation'
  | 'Saillie'  | 'Vide'       | 'Réforme'  | 'Actif'
  | 'Mise bas à confirmer'    | string;

export interface Animal {
  id:          string;
  displayId:   string;
  boucle:      string;
  nom:         string;
  race:        string;
  statut:      string;
  type:        'TRUIE' | 'VERRAT';
  ration:      number;
  emplacement?: string;
  // Truie-specific
  stade?:          string;
  nbPortees?:      number;
  dateDerniereMB?: string;
  dateMBPrevue?:   string;
  nvMoyen?:        number;
  // Verrat-specific
  dateNaissance?: string;
  // Données brutes pour TableRowEdit
  raw?: any[];
}

// ── Notes terrain ─────────────────────────────────────────────────────────────
// Lues depuis NOTES_TERRAIN (DATE | SUBJECT_TYPE | SUBJECT_ID | NOTE | AUTHOR)
export interface Note {
  id:          string;
  animalId:    string;
  animalType:  'TRUIE' | 'VERRAT';
  date:        string;
  texte:       string;
  synced:      boolean;
}

// ── Autres types UI (non liés à Sheets) ──────────────────────────────────────

export interface HealthRecord {
  id:          string;
  animalId:    string;
  animalType:  'TRUIE' | 'VERRAT';
  date:        string;
  type:        string;
  traitement:  string;
  observation: string;
  synced:      boolean;
}

export interface StockItem {
  id:          string;
  nom:         string;
  quantite:    number;
  unite:       string;
  alerte:      'RUPTURE' | 'BAS' | 'OK';
  prixUnitaire?: number;
  type?:       'ALIMENT' | 'MEDICAMENT' | 'MATERIEL';
}

export interface Bande {
  id:          string;
  nom:         string;
  dateDebut:   string;
  statut:      'en_cours' | 'termine';
  type:        'gestation' | 'maternite' | 'post_sevrage' | 'engraissement';
  nbSujets:    number;
  poidsMoyen?: number;
}

export interface Ration {
  id:                string;
  animalIdOrGroup:   string;
  alimentId:         string;
  quantite:          number;
  date:              string;
}
