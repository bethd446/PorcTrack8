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
import type { SheetCell } from './offlineQueue';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE GUARDS — narrow les payloads dynamiques des actions d'alerte.
// Les payloads sont Record<string, unknown> côté alertEngine pour éviter
// d'exploser un discriminated union complexe. On narrow ici à l'usage.
// ─────────────────────────────────────────────────────────────────────────────

function isStringField(obj: Record<string, unknown>, key: string): obj is Record<string, unknown> & Record<typeof key, string> {
  return typeof obj[key] === 'string';
}

function asSheetCellArray(v: unknown): SheetCell[] | null {
  if (!Array.isArray(v)) return null;
  // Autorise les cellules primitives Sheets ; rejette les sous-objets.
  for (const cell of v) {
    if (cell === null) continue;
    const t = typeof cell;
    if (t !== 'string' && t !== 'number' && t !== 'boolean') return null;
  }
  return v as SheetCell[];
}

function asPatchRecord(v: unknown): Record<string, SheetCell> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const entries = Object.entries(v as Record<string, unknown>);
  for (const [, val] of entries) {
    if (val === null) continue;
    const t = typeof val;
    if (t !== 'string' && t !== 'number' && t !== 'boolean') return null;
  }
  return v as Record<string, SheetCell>;
}

interface TruieUpdate {
  sheet: string;
  idHeader: string;
  idValue: string;
  patch: Record<string, SheetCell>;
}

function asTruieUpdate(v: unknown): TruieUpdate | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const patch = asPatchRecord(o.patch);
  if (typeof o.sheet !== 'string' || typeof o.idHeader !== 'string' || typeof o.idValue !== 'string' || !patch) return null;
  return { sheet: o.sheet, idHeader: o.idHeader, idValue: o.idValue, patch };
}

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

    const values = asSheetCellArray(payload.values);
    if (payload.action === 'append_row' || values !== null) {
      if (!isStringField(payload, 'sheet') || !values) {
        throw new Error('Payload append_row invalide (sheet ou values manquants/mal typés)');
      }
      result = await appendRow(payload.sheet, values);
    } else {
      const patch = asPatchRecord(payload.patch);
      if (
        !isStringField(payload, 'sheet') ||
        !isStringField(payload, 'idHeader') ||
        !isStringField(payload, 'idValue') ||
        !patch
      ) {
        throw new Error('Payload update_row_by_id invalide (champs sheet/idHeader/idValue/patch)');
      }
      result = await updateRowById(payload.sheet, payload.idHeader, payload.idValue, {
        ...patch,
        ...(note ? { NOTES: note } : {}),
      });
    }

    if (!result.success) throw new Error(result.message ?? 'Erreur Sheets');

    // Action secondaire (ex: mise à jour de la truie mère lors du sevrage)
    const truieUpdate = asTruieUpdate(payload.truieUpdate);
    if (truieUpdate) {
      await updateRowById(truieUpdate.sheet, truieUpdate.idHeader, truieUpdate.idValue, truieUpdate.patch);
    }

    // Si regroupement → créer une nouvelle bande
    if (item.action.type === 'CONFIRM_REGROUPEMENT_BANDE' && Array.isArray(payload.bandeIds)) {
      const bandeIds = (payload.bandeIds as unknown[]).filter((x): x is string => typeof x === 'string');
      const totalVivants = typeof payload.totalVivants === 'number' ? payload.totalVivants : 0;
      const nomBande = `BANDE-${new Date().toISOString().slice(0, 10)}-SEV`;
      await appendRow('PORCELETS_BANDES_DETAIL', [
        nomBande,
        '',
        '',
        new Date().toLocaleDateString('fr-FR'),
        totalVivants,
        0,
        totalVivants,
        'En cours',
        '',
        '',
        '',
        note ?? `Regroupement automatique : ${bandeIds.join(', ')}`,
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
