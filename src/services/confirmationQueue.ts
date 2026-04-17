/**
 * PorcTrack — File d'Actions en Attente de Confirmation
 * ══════════════════════════════════════════════════════
 * Toute action critique (sevrage, mise-bas, saillie, réforme…) passe
 * par ce service avant d'être envoyée à Google Sheets.
 *
 * Flux :
 *   1. Le moteur d'alertes détecte un événement
 *   2. L'alerte propose des actions
 *   3. Le porcher confirme dans l'UI (ConfirmationModal)
 *   4. Ce service exécute l'action et l'écrit dans Sheets
 *   5. Le cache est invalidé → l'UI se met à jour
 */

import { Preferences } from '@capacitor/preferences';
import { updateRowById, appendRow } from './googleSheets';
import type { FarmAlert, AlertAction } from './alertEngine';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'FAILED';

export interface PendingConfirmation {
  id: string;
  alertId: string;
  alertTitle: string;
  alertMessage: string;
  action: AlertAction;
  status: ConfirmationStatus;
  createdAt: string;      // ISO string
  resolvedAt?: string;
  error?: string;
  /** Note optionnelle laissée par le porcher */
  note?: string;
}

const QUEUE_KEY = 'porctrack_confirmation_queue_v1';

// ─────────────────────────────────────────────────────────────────────────────
// STOCKAGE (Capacitor Preferences — survit aux rechargements)
// ─────────────────────────────────────────────────────────────────────────────

async function loadQueue(): Promise<PendingConfirmation[]> {
  try {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingConfirmation[]): Promise<void> {
  await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) });
}

// ─────────────────────────────────────────────────────────────────────────────
// API PUBLIQUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ajoute une alerte à la file si elle n'y est pas déjà.
 * Appelé automatiquement par le FarmContext quand une alerte requiresAction=true apparaît.
 */
export async function enqueueAlert(alert: FarmAlert, action: AlertAction): Promise<void> {
  const queue = await loadQueue();
  const exists = queue.some(q => q.id === `${alert.id}-${action.type}`);
  if (exists) return;

  const item: PendingConfirmation = {
    id: `${alert.id}-${action.type}`,
    alertId: alert.id,
    alertTitle: alert.title,
    alertMessage: alert.message,
    action,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  queue.push(item);
  await saveQueue(queue);
}

/**
 * Retourne toutes les confirmations en attente.
 */
export async function getPendingConfirmations(): Promise<PendingConfirmation[]> {
  const queue = await loadQueue();
  return queue.filter(q => q.status === 'PENDING');
}

/**
 * Retourne l'historique des actions (confirmées + rejetées).
 */
export async function getConfirmationHistory(limit = 50): Promise<PendingConfirmation[]> {
  const queue = await loadQueue();
  return queue
    .filter(q => q.status !== 'PENDING')
    .sort((a, b) => new Date(b.resolvedAt ?? b.createdAt).getTime() - new Date(a.resolvedAt ?? a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Exécute l'action confirmée par le porcher, écrit dans Sheets.
 * @param itemId  ID de la PendingConfirmation
 * @param note    Note optionnelle du porcher
 */
export async function confirmAction(itemId: string, note?: string): Promise<{ success: boolean; error?: string }> {
  const queue = await loadQueue();
  const idx = queue.findIndex(q => q.id === itemId);
  if (idx === -1) return { success: false, error: 'Action introuvable' };

  const item = queue[idx];
  if (item.status !== 'PENDING') return { success: false, error: 'Action déjà traitée' };

  try {
    const payload = item.action.payload;
    if (!payload) {
      // Action DISMISS ou sans payload
      queue[idx] = { ...item, status: 'CONFIRMED', resolvedAt: new Date().toISOString(), note };
      await saveQueue(queue);
      return { success: true };
    }

    // Exécuter l'action principale
    let result: { success: boolean; message?: string };

    if (payload.action === 'append_row' || payload.values) {
      result = await appendRow(payload.sheet, payload.values);
    } else {
      result = await updateRowById(payload.sheet, payload.idHeader, payload.idValue, {
        ...payload.patch,
        ...(note ? { NOTES: note } : {}),
      });
    }

    if (!result.success) throw new Error(result.message ?? 'Erreur Sheets');

    // Action secondaire (ex: mise à jour de la truie mère lors du sevrage)
    if (payload.truieUpdate) {
      const tu = payload.truieUpdate;
      await updateRowById(tu.sheet, tu.idHeader, tu.idValue, tu.patch);
    }

    // Si regroupement → créer une nouvelle bande
    if (item.action.type === 'CONFIRM_REGROUPEMENT_BANDE' && payload.bandeIds) {
      const nomBande = `BANDE-${new Date().toISOString().slice(0, 10)}-SEV`;
      await appendRow('PORCELETS_BANDES_DETAIL', [
        nomBande,
        '',
        '',
        new Date().toLocaleDateString('fr-FR'),
        payload.totalVivants,
        0,
        payload.totalVivants,
        'En cours',
        '',
        '',
        '',
        note ?? `Regroupement automatique : ${payload.bandeIds.join(', ')}`,
      ]);
    }

    queue[idx] = { ...item, status: 'CONFIRMED', resolvedAt: new Date().toISOString(), note };
    await saveQueue(queue);
    return { success: true };

  } catch (err) {
    const error = String(err);
    queue[idx] = { ...item, status: 'FAILED', resolvedAt: new Date().toISOString(), error };
    await saveQueue(queue);
    return { success: false, error };
  }
}

/**
 * Rejette une action (le porcher dit "Plus tard" ou "Non").
 */
export async function dismissAction(itemId: string, note?: string): Promise<void> {
  const queue = await loadQueue();
  const idx = queue.findIndex(q => q.id === itemId);
  if (idx === -1) return;
  queue[idx] = { ...queue[idx], status: 'DISMISSED', resolvedAt: new Date().toISOString(), note };
  await saveQueue(queue);
}

/**
 * Nombre d'actions en attente (badge dans le header).
 */
export async function getPendingCount(): Promise<number> {
  const pending = await getPendingConfirmations();
  return pending.length;
}

/**
 * Vide l'historique résolu (nettoyage mensuel).
 */
export async function cleanHistory(keepDays = 30): Promise<void> {
  const queue = await loadQueue();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cleaned = queue.filter(q =>
    q.status === 'PENDING' ||
    new Date(q.resolvedAt ?? q.createdAt) > cutoff
  );
  await saveQueue(cleaned);
}
