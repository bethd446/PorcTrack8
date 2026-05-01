/**
 * alertDismissals — gestion des alertes "ignorées" par l'utilisateur.
 *
 * Une alerte ignorée est retirée de la liste affichée pour 30 jours, sans
 * changer la donnée métier sous-jacente. Utile pour les suggestions (réforme,
 * regroupement) que l'éleveur écarte volontairement.
 */

import { supabase } from './supabaseClient';

export async function dismissAlert(
  farmId: string,
  userId: string,
  alertId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.from('alert_dismissals').insert({
    farm_id: farmId,
    alert_id: alertId,
    dismissed_by: userId,
    reason,
  });
  if (error) throw error;
}

export async function fetchDismissedAlertIds(farmId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('alert_dismissals')
    .select('alert_id')
    .eq('farm_id', farmId)
    .gt('expires_at', new Date().toISOString());
  if (error) {
    console.warn('[alertDismissals] fetch failed', error);
    return new Set();
  }
  return new Set((data ?? []).map(r => r.alert_id));
}

export async function undismissAlert(farmId: string, alertId: string): Promise<void> {
  await supabase
    .from('alert_dismissals')
    .delete()
    .eq('farm_id', farmId)
    .eq('alert_id', alertId);
}
