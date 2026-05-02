import { supabase } from './supabaseClient';

export interface FarmInfo {
  id: string;
  nom: string;
  nomFerme: string | null;
  secteur: string | null;
  pays: string | null;
}

export interface ProfileUpdate {
  full_name?: string;
}

export interface FarmUpdate {
  nom?: string;
  secteur?: string | null;
}

export async function fetchFarm(userId: string): Promise<FarmInfo | null> {
  const { data, error } = await supabase
    .from('troupeaux')
    .select('id, nom, nom_ferme, secteur, pays')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    nom: data.nom,
    nomFerme: data.nom_ferme,
    secteur: data.secteur,
    pays: data.pays,
  };
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId);
  if (error) throw error;
}

export async function updateFarm(farmId: string, patch: FarmUpdate): Promise<void> {
  const { error } = await supabase
    .from('troupeaux')
    .update(patch)
    .eq('id', farmId);
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

