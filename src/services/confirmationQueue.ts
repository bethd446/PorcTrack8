/**
 * PorcTrack — File d'Actions en Attente de Confirmation
 * ══════════════════════════════════════════════════════
 * Toute action critique (sevrage, mise-bas, saillie, réforme…) passe
 * par ce service avant d'être envoyée à Google Sheets.
 */

import { Preferences } from '@capacitor/preferences';
import { updateRowById, appendRow } from './googleSheets';
import type { FarmAlert, AlertAction } from './alertEngine';
import type { SheetCell } from './offlineQueue';

function isStringField(obj: Record<string, unknown>, key: string): obj is Record<string, unknown> & Record<typeof key, string> {
  return typeof obj[key] === 'string';
}

function asSheetCellArray(v: unknown): SheetCell[] | null {
  if (!Array.isArray(v)) return null;
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

export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'FAILED';

export interface PendingConfirmation {
  id: string;
  alertId: string;
  alertTitle: string;
  alertMessage: string;
  action: AlertAction;
  status: ConfirmationStatus;
  createdAt: string;
  resolvedAt?: string;
  error?: string;
  note?: string;
}

const QUEUE_KEY = 'porctrack_confirmation_queue_v1';

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

export async function enqueueAlert(alert: FarmAlert, action: AlertAction): Promise<void> {
  const queue = await loadQueue();
  const exists = queue.some(q => q.id === `${alert.id}-${action.type}`);
  if (exists) return;

  const item: PendingConfirmation = {
    id: `${alert.id}-${action.type}`,
    alertId: alert.id,
    alertTitle: alert.title ?? 'Alerte',
    alertMessage: alert.message ?? '',
    action,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  queue.push(item);
  await saveQueue(queue);
}

export async function getPendingConfirmations(): Promise<PendingConfirmation[]> {
  const queue = await loadQueue();
  return queue.filter(q => q.status === 'PENDING');
}

export async function confirmAction(itemId: string, note?: string): Promise<{ success: boolean; error?: string }> {
  const queue = await loadQueue();
  const idx = queue.findIndex(q => q.id === itemId);
  if (idx === -1) return { success: false, error: 'Action introuvable' };

  const item = queue[idx];
  if (item.status !== 'PENDING') return { success: false, error: 'Action déjà traitée' };

  try {
    const payload = item.action.payload;
    if (!payload) {
      queue[idx] = { ...item, status: 'CONFIRMED', resolvedAt: new Date().toISOString(), note };
      await saveQueue(queue);
      return { success: true };
    }

    let result: { success: boolean; message?: string };
    const values = asSheetCellArray(payload.values);
    if (payload.action === 'append_row' || values !== null) {
      if (!isStringField(payload, 'sheet') || !values) {
        throw new Error('Payload append_row invalide');
      }
      result = await appendRow(payload.sheet, values);
    } else {
      const patch = asPatchRecord(payload.patch);
      if (!isStringField(payload, 'sheet') || !isStringField(payload, 'idHeader') || !isStringField(payload, 'idValue') || !patch) {
        throw new Error('Payload update_row_by_id invalide');
      }
      result = await updateRowById(payload.sheet, payload.idHeader, payload.idValue, {
        ...patch,
        ...(note ? { NOTES: note } : {}),
      });
    }

    if (!result.success) throw new Error(result.message ?? 'Erreur Sheets');

    const truieUpdate = asTruieUpdate(payload.truieUpdate);
    if (truieUpdate) {
      await updateRowById(truieUpdate.sheet, truieUpdate.idHeader, truieUpdate.idValue, truieUpdate.patch);
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

export async function dismissAction(itemId: string, note?: string): Promise<void> {
  const queue = await loadQueue();
  const idx = queue.findIndex(q => q.id === itemId);
  if (idx === -1) return;
  queue[idx] = { ...queue[idx], status: 'DISMISSED', resolvedAt: new Date().toISOString(), note };
  await saveQueue(queue);
}
