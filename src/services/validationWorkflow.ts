/**
 * validationWorkflow.ts — Workflow validation porcher → admin (V21-7).
 *
 * Quand un porcher (role WORKER) saisit une action critique (mortalité, vente,
 * soin majeur), le record est marqué `validation_status = 'PENDING'`. Un
 * OWNER/ADMIN peut ensuite valider ou rejeter.
 */

import { supabase } from './supabaseClient';
import type { UserRole } from '../types/user.types';

export type ValidationTable = 'health_logs' | 'batches' | 'finances';
export type ValidationStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';

export interface PendingValidation {
  type: 'MORTALITE' | 'VENTE' | 'SOIN' | 'BATCH' | 'FINANCE';
  table: ValidationTable;
  id: string;
  subject: string;
  saisi_par: string;
  saisi_le: string;
  data: Record<string, unknown>;
}

/**
 * Renvoie le statut de validation par défaut selon le rôle de l'utilisateur.
 * - WORKER → PENDING (besoin validation admin)
 * - OWNER/ADMIN → VALIDATED (auto-validé)
 */
export function getDefaultValidationStatus(role: UserRole | string | null | undefined): ValidationStatus {
  if (role === 'WORKER' || role === 'PORCHER') return 'PENDING';
  return 'VALIDATED';
}

/**
 * Valide une action en attente. Update validation_status='VALIDATED' +
 * validated_by + validated_at = now().
 */
export async function validateAction(
  table: ValidationTable,
  id: string,
  approverId: string,
): Promise<void> {
  if (!table || !id || !approverId) {
    throw new Error('validateAction: table, id et approverId sont requis');
  }
  const patch = {
    validation_status: 'VALIDATED' as const,
    validated_by: approverId,
    validated_at: new Date().toISOString(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any)
    .update(patch)
    .eq('id', id);
  if (error) throw new Error(`[${table}] validateAction failed: ${error.message}`);
}

/**
 * Rejette une action. La raison est append aux notes (best-effort).
 */
export async function rejectAction(
  table: ValidationTable,
  id: string,
  approverId: string,
  reason?: string,
): Promise<void> {
  if (!table || !id || !approverId) {
    throw new Error('rejectAction: table, id et approverId sont requis');
  }
  const patch: Record<string, unknown> = {
    validation_status: 'REJECTED',
    validated_by: approverId,
    validated_at: new Date().toISOString(),
  };
  if (reason && reason.trim()) {
    patch.notes = `[REJET] ${reason.trim()}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any)
    .update(patch)
    .eq('id', id);
  if (error) throw new Error(`[${table}] rejectAction failed: ${error.message}`);
}

interface HealthLogPending {
  id: string;
  log_type: string | null;
  animal_code: string | null;
  affected_animals: number | null;
  notes: string | null;
  operator: string | null;
  created_at: string | null;
  log_date: string | null;
  treatment_name?: string | null;
}

interface BatchPending {
  id: string;
  code_id: string | null;
  notes: string | null;
  created_at: string | null;
  porcelets_nes_vivants: number | null;
}

interface FinancePending {
  id: string;
  poste: string | null;
  type: string | null;
  mensuel_fcfa: number | null;
  notes: string | null;
  created_at: string | null;
}

function classifyHealth(logType: string | null): PendingValidation['type'] {
  if (!logType) return 'SOIN';
  if (logType === 'MORTALITE' || logType === 'ECRASEMENT') return 'MORTALITE';
  return 'SOIN';
}

/**
 * Retourne toutes les actions en attente de validation pour la ferme courante.
 * Le RLS Postgres filtre déjà par farm_id côté serveur.
 */
export async function getPendingValidations(_farmId?: string): Promise<PendingValidation[]> {
  const results: PendingValidation[] = [];

  // health_logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: healthRows, error: healthErr } = await (supabase.from('health_logs') as any)
    .select('id, log_type, animal_code, affected_animals, notes, operator, created_at, log_date, treatment_name')
    .eq('validation_status', 'PENDING')
    .order('created_at', { ascending: false });
  if (healthErr) {
    console.warn('[validationWorkflow] getPendingValidations health_logs failed', healthErr.message);
  } else if (Array.isArray(healthRows)) {
    for (const r of healthRows as HealthLogPending[]) {
      const kind = classifyHealth(r.log_type);
      const subject = kind === 'MORTALITE'
        ? `${r.animal_code ?? '—'} · ${r.affected_animals ?? 1} mort${(r.affected_animals ?? 1) > 1 ? 's' : ''}${r.notes ? ` (${r.notes})` : ''}`
        : `${r.animal_code ?? '—'} · ${r.treatment_name ?? r.log_type ?? 'Soin'}`;
      results.push({
        type: kind,
        table: 'health_logs',
        id: r.id,
        subject,
        saisi_par: r.operator ?? 'Inconnu',
        saisi_le: r.created_at ?? r.log_date ?? '',
        data: r as unknown as Record<string, unknown>,
      });
    }
  }

  // batches (ventes via statut 'Vendue' marquées PENDING)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batchRows, error: batchErr } = await (supabase.from('batches') as any)
    .select('id, code_id, notes, created_at, porcelets_nes_vivants')
    .eq('validation_status', 'PENDING')
    .order('created_at', { ascending: false });
  if (batchErr) {
    console.warn('[validationWorkflow] getPendingValidations batches failed', batchErr.message);
  } else if (Array.isArray(batchRows)) {
    for (const r of batchRows as BatchPending[]) {
      results.push({
        type: 'BATCH',
        table: 'batches',
        id: r.id,
        subject: `Bande ${r.code_id ?? r.id} · ${r.notes ?? 'mise à jour'}`,
        saisi_par: 'Porcher',
        saisi_le: r.created_at ?? '',
        data: r as unknown as Record<string, unknown>,
      });
    }
  }

  // finances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: finRows, error: finErr } = await (supabase.from('finances') as any)
    .select('id, poste, type, mensuel_fcfa, notes, created_at')
    .eq('validation_status', 'PENDING')
    .order('created_at', { ascending: false });
  if (finErr) {
    console.warn('[validationWorkflow] getPendingValidations finances failed', finErr.message);
  } else if (Array.isArray(finRows)) {
    for (const r of finRows as FinancePending[]) {
      const kind: PendingValidation['type'] = (r.poste ?? '').toLowerCase().startsWith('vente') ? 'VENTE' : 'FINANCE';
      results.push({
        type: kind,
        table: 'finances',
        id: r.id,
        subject: `${r.poste ?? '—'} · ${(r.mensuel_fcfa ?? 0).toLocaleString('fr-FR')} FCFA`,
        saisi_par: 'Porcher',
        saisi_le: r.created_at ?? '',
        data: r as unknown as Record<string, unknown>,
      });
    }
  }

  results.sort((a, b) => (b.saisi_le ?? '').localeCompare(a.saisi_le ?? ''));
  return results;
}
