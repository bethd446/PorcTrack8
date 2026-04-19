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
  | 'En attente saillie' | 'En maternité' | 'Pleine' | 'À surveiller'
  | 'Actif' | 'Réforme' | 'Mort' | string;

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
  derniereNV?:     number;
  dateMBPrevue?:   string;
  notes?:          string;
  // Verrat-specific
  origine?:        string;
  alimentation?:   string;
  // Données brutes pour TableRowEdit (ligne Sheets : cellules = string|number|boolean)
  raw?: (string | number | boolean)[];
}

// ── Notes terrain ─────────────────────────────────────────────────────────────
// Schéma canonique NOTES_TERRAIN (5 colonnes) :
//   DATE | TYPE_ANIMAL | ID_ANIMAL | NOTE | AUTEUR
//
// TYPE_ANIMAL = 'TRUIE' | 'VERRAT' | 'BANDE' | 'CONTROLE' | 'CHECKLIST' | 'GENERAL'
// - TRUIE/VERRAT/BANDE : note attachée à un animal ou une bande
// - CONTROLE           : réponse audit quotidien (ID_ANIMAL = clef question)
// - CHECKLIST          : état d'une checklist (ID_ANIMAL = nom checklist)
// - GENERAL            : fourre-tout / legacy (inclut ancien CHECKLIST_DONE)
export type NoteAnimalType =
  | 'TRUIE'
  | 'VERRAT'
  | 'BANDE'
  | 'CONTROLE'
  | 'CHECKLIST'
  | 'GENERAL';

export interface Note {
  id:          string;
  animalId:    string;
  animalType:  NoteAnimalType;
  date:        string;
  texte:       string;
  auteur?:     string;
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
