/**
 * PorcTrack 8 — Types partagés
 * Utilisés par /app (Ionic/React) et /website (Vite vitrine)
 * Source unique de vérité pour les entités Supabase communes.
 */

// ── Rôles utilisateur ─────────────────────────────────────────
export type UserRole = 'ADMIN' | 'OWNER' | 'PORCHER';

// ── Profil Supabase (table: profiles) ────────────────────────
export interface UserProfile {
  id: string;
  email?: string;
  role: UserRole;
  last_sign_in_at?: string;
  created_at?: string;
}

// ── Log admin (table: admin_logs) ────────────────────────────
export interface AdminLog {
  id: string;
  action: string;
  details?: unknown;
  created_at: string;
  user_id?: string;
}

// ── Statuts animaux ───────────────────────────────────────────
export type TruieStatut =
  | 'GESTATION'
  | 'ALLAITANTE'
  | 'FLUSHING'
  | 'VIDE'
  | 'REFORME'
  | 'MORTE';

export type VerratStatut = 'ACTIF' | 'REFORME' | 'MORT';

// ── Entité Truie (simplifiée) ─────────────────────────────────
export interface Truie {
  id: string;
  numero: string; // ex: T-042
  statut: TruieStatut;
  date_saillie?: string;
  date_mise_bas_prevue?: string;
  nombre_porcelets?: number;
  batiment?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Entité Bande ──────────────────────────────────────────────
export type BandeStatut =
  | 'MATERNITE'
  | 'POST_SEVRAGE'
  | 'CROISSANCE'
  | 'ENGRAISSEMENT'
  | 'FINITION'
  | 'SORTIE';

export interface Bande {
  id: string;
  numero: string; // ex: B-12
  statut: BandeStatut;
  effectif: number;
  date_entree?: string;
  date_sortie_prevue?: string;
  batiment?: string;
  notes?: string;
}

// ── Règles GTTT ───────────────────────────────────────────────
export type AlertPriorite = 'CRITIQUE' | 'HAUTE' | 'NORMALE' | 'INFO';
export type AlertType =
  | 'MISE_BAS'
  | 'SEVRAGE'
  | 'RETOUR_CHALEUR'
  | 'MORTALITE'
  | 'STOCK_CRITIQUE'
  | 'REGROUPEMENT';

export interface BiologicalAlert {
  id: string;
  type: AlertType;
  priorite: AlertPriorite;
  message: string;
  reference_id?: string; // truie ou bande concernée
  created_at: string;
  resolved?: boolean;
}

// ── Constantes GTTT ───────────────────────────────────────────
export const GTTT_CONSTANTS = {
  GESTATION_DAYS: 115,
  LACTATION_DAYS: 28,
  RETOUR_CHALEUR_MIN: 3,
  RETOUR_CHALEUR_MAX: 7,
  MORTALITE_SEUIL: 0.15, // 15%
} as const;

// ── Config Supabase partagée ──────────────────────────────────
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
