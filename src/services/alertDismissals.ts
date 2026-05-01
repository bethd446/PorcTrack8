/**
 * alertDismissals — gestion des alertes "ignorées" par l'utilisateur.
 *
 * Une alerte ignorée est retirée de la liste affichée pour 30 jours, sans
 * changer la donnée métier sous-jacente. Utile pour les suggestions (réforme,
 * regroupement) que l'éleveur écarte volontairement.
 *
 * NB : la colonne SQL s'appelle `user_id` (renommée depuis `farm_id` en V16 —
 * cf. migration `2026_05_01_alert_dismissals_rename.sql`). Elle stocke
 * `auth.users.id` directement.
 */

import { supabase } from './supabaseClient';

export async function dismissAlert(
  userId: string,
  alertId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.from('alert_dismissals').insert({
    user_id: userId,
    alert_id: alertId,
    dismissed_by: userId,
    reason,
  });
  if (error) throw error;
}

export async function fetchDismissedAlertIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('alert_dismissals')
    .select('alert_id')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString());
  if (error) {
    console.warn('[alertDismissals] fetch failed', error);
    return new Set();
  }
  return new Set((data ?? []).map(r => r.alert_id));
}

export async function undismissAlert(userId: string, alertId: string): Promise<void> {
  await supabase
    .from('alert_dismissals')
    .delete()
    .eq('user_id', userId)
    .eq('alert_id', alertId);
}
