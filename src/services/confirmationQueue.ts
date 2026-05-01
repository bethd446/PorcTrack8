/**
 * PorcTrack — File d'Actions en Attente de Confirmation
 * ══════════════════════════════════════════════════════
 * Toute action critique (sevrage, mise-bas, saillie, réforme, regroupement)
 * passe par ce service avant d'être écrite dans Supabase.
 *
 * Flux :
 *   1. Le moteur d'alertes détecte un événement
 *   2. L'alerte propose des actions
 *   3. Le porcher confirme dans l'UI (ConfirmationModal)
 *   4. Ce service exécute l'action via les helpers typés `supabaseWrites.ts`
 *   5. Le cache est invalidé → l'UI se met à jour
 */

import { Preferences } from '@capacitor/preferences';
import {
  insertBatch,
  insertNote,
  updateSowByCode,
  updateBatchByCode,
} from './supabaseWrites';
import type { FarmAlert, AlertAction } from './alertEngine';

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING patches Sheets (UPPERCASE) → colonnes Supabase (snake_case)
// Le payload des actions vient de alertEngine.ts qui produit encore des noms
// de colonnes Sheets ; on les traduit ici pour rester compatible tant que
// alertEngine n'est pas migré (vague suivante).
// ─────────────────────────────────────────────────────────────────────────────

const SOW_COL_MAP: Record<string, string> = {
  STATUT: 'statut',
  STATUT_REPRO: 'statut_repro',
  DATE_DERNIERE_MB: 'date_mb_prevue',
  DATE_MB_PREVUE: 'date_mb_prevue',
  DATE_SAILLIE: 'date_mb_prevue',
  NOTES: 'notes',
};

const BATCH_COL_MAP: Record<string, string> = {
  STATUT: 'statut',
  DATE_SEVRAGE_REELLE: 'date_sevrage',
  DATE_SEVRAGE: 'date_sevrage',
  SEVRES: 'porcelets_sevrene_total',
  DATE_MB: 'date_mise_bas',
  NOTES: 'notes',
  LOGE: 'loge',
  ALIMENT: 'aliment_actuel',
};

function mapPatch(
  raw: Record<string, unknown>,
  colMap: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const target = colMap[k] ?? k.toLowerCase();
    out[target] = v;
  }
  return out;
}

function asStringRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

interface SecondaryUpdate {
  sheet: string;
  idValue: string;
  patch: Record<string, unknown>;
}

function asSecondaryUpdate(v: unknown): SecondaryUpdate | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const patch = asStringRecord(o.patch);
  if (typeof o.sheet !== 'string' || typeof o.idValue !== 'string' || !patch) {
    return null;
  }
  return { sheet: o.sheet, idValue: o.idValue, patch };
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
  createdAt: string;
  resolvedAt?: string;
  error?: string;
  note?: string;
}

const QUEUE_KEY = 'porctrack_confirmation_queue_v1';

// ─────────────────────────────────────────────────────────────────────────────
// STOCKAGE
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

export async function enqueueAlert(alert: FarmAlert, action: AlertAction): Promise<void> {
  const queue = await loadQueue();
  const exists = queue.some((q) => q.id === `${alert.id}-${action.type}`);
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

export async function getPendingConfirmations(): Promise<PendingConfirmation[]> {
  const queue = await loadQueue();
  return queue.filter((q) => q.status === 'PENDING');
}

export async function getConfirmationHistory(limit = 50): Promise<PendingConfirmation[]> {
  const queue = await loadQueue();
  return queue
    .filter((q) => q.status !== 'PENDING')
    .sort(
      (a, b) =>
        new Date(b.resolvedAt ?? b.createdAt).getTime() -
        new Date(a.resolvedAt ?? a.createdAt).getTime(),
    )
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXÉCUTION DES ACTIONS — dispatch via le `type` de l'AlertAction.
// La sémantique métier (sevrage J+28, retour chaleur, regroupement) est
// préservée à l'identique ; seul le backend change (Sheets → Supabase).
// ─────────────────────────────────────────────────────────────────────────────

async function runConfirmedAction(
  action: AlertAction,
  note: string | undefined,
): Promise<void> {
  const payload = action.payload ?? {};
  const noteSuffix = note ? { notes: note } : {};

  switch (action.type) {
    case 'CONFIRM_MISE_BAS': {
      const idValue = String(payload.idValue ?? '');
      const rawPatch = asStringRecord(payload.patch) ?? {};
      const patch = { ...mapPatch(rawPatch, SOW_COL_MAP), ...noteSuffix };
      await updateSowByCode(idValue, patch);
      return;
    }

    case 'CONFIRM_SEVRAGE': {
      const idValue = String(payload.idValue ?? '');
      const rawPatch = asStringRecord(payload.patch) ?? {};
      const patch = { ...mapPatch(rawPatch, BATCH_COL_MAP), ...noteSuffix };
      if (idValue) {
        await updateBatchByCode(idValue, patch);
      }
      const truieUpdate = asSecondaryUpdate(payload.truieUpdate);
      if (truieUpdate) {
        await updateSowByCode(
          truieUpdate.idValue,
          mapPatch(truieUpdate.patch, SOW_COL_MAP),
        );
      }
      return;
    }

    case 'CONFIRM_SAILLIE': {
      const idValue = String(payload.idValue ?? payload.truieId ?? '');
      const rawPatch = asStringRecord(payload.patch) ?? {};
      const patch = { ...mapPatch(rawPatch, SOW_COL_MAP), ...noteSuffix };
      if (!idValue) throw new Error('CONFIRM_SAILLIE : code truie manquant');
      await updateSowByCode(idValue, patch);
      return;
    }

    case 'CONFIRM_REFORME': {
      const idValue = String(payload.idValue ?? '');
      const rawPatch = asStringRecord(payload.patch) ?? { STATUT: 'Réforme' };
      const patch = { ...mapPatch(rawPatch, SOW_COL_MAP), ...noteSuffix };
      await updateSowByCode(idValue, patch);
      return;
    }

    case 'CONFIRM_REGROUPEMENT_BANDE': {
      const bandeIds = Array.isArray(payload.bandeIds)
        ? (payload.bandeIds as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      const totalVivants =
        typeof payload.totalVivants === 'number' ? payload.totalVivants : 0;
      const codeId = `BANDE-${new Date().toISOString().slice(0, 10)}-SEV`;
      await insertBatch({
        code_id: codeId,
        date_sevrage: new Date().toISOString().slice(0, 10),
        porcelets_sevrene_total: totalVivants,
        porcelets_nes_vivants: totalVivants,
        statut: 'En cours',
        notes: note ?? `Regroupement automatique : ${bandeIds.join(', ')}`,
      });
      return;
    }

    case 'CONFIRM_SOIN': {
      const content = String(payload.note ?? note ?? 'Soin confirmé');
      await insertNote({
        content,
        category: 'SANTE',
      });
      return;
    }

    case 'DISMISS':
      return;
  }
}

export async function confirmAction(
  itemId: string,
  note?: string,
): Promise<{ success: boolean; error?: string }> {
  const queue = await loadQueue();
  const idx = queue.findIndex((q) => q.id === itemId);
  if (idx === -1) return { success: false, error: 'Action introuvable' };

  const item = queue[idx];
  if (item.status !== 'PENDING') return { success: false, error: 'Action déjà traitée' };

  try {
    await runConfirmedAction(item.action, note);
    queue[idx] = {
      ...item,
      status: 'CONFIRMED',
      resolvedAt: new Date().toISOString(),
      note,
    };
    await saveQueue(queue);
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    queue[idx] = {
      ...item,
      status: 'FAILED',
      resolvedAt: new Date().toISOString(),
      error,
    };
    await saveQueue(queue);
    return { success: false, error };
  }
}

export async function dismissAction(itemId: string, note?: string): Promise<void> {
  const queue = await loadQueue();
  const idx = queue.findIndex((q) => q.id === itemId);
  if (idx === -1) return;
  queue[idx] = {
    ...queue[idx],
    status: 'DISMISSED',
    resolvedAt: new Date().toISOString(),
    note,
  };
  await saveQueue(queue);
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingConfirmations();
  return pending.length;
}

export async function cleanHistory(keepDays = 30): Promise<void> {
  const queue = await loadQueue();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cleaned = queue.filter(
    (q) =>
      q.status === 'PENDING' ||
      new Date(q.resolvedAt ?? q.createdAt) > cutoff,
  );
  await saveQueue(cleaned);
}
