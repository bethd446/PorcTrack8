import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && import.meta.env.PROD) {
  if (typeof document !== 'undefined') {
    document.body.innerHTML =
      '<div style="padding: 40px; font-family: sans-serif;">' +
      '<h1>Configuration manquante</h1>' +
      '<p>Variables d\'environnement Supabase absentes en build prod. Contactez le support.</p>' +
      '</div>';
  }
  throw new Error('SUPABASE_NOT_CONFIGURED');
}

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquante — auth désactivée. Créez .env.local pour activer.',
  );
}

// Fallback client avec valeurs vides : permet à l'app de démarrer sans crash.
// Toutes les opérations auth/DB échoueront proprement (erreur 401 ou réseau)
// au lieu de jeter au premier import.
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);
