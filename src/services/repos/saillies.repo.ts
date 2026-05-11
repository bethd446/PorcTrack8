/**
 * saillies.repo.ts — CRUD & resolvers saillies (Supabase `saillies`).
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 1).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 */
import { supabase } from '../supabaseClient';
import type { Database } from '../../types/database.types';
import {
  runInsert,
  runUpdate,
  resolveIdByCode,
  type WithoutFarm,
  type WriteResult,
} from './_shared';

export type SaillieRow = Database['public']['Tables']['saillies']['Row'];
type SaillieInsert = Database['public']['Tables']['saillies']['Insert'];

export function insertSaillie(
  values: WithoutFarm<SaillieInsert>,
): Promise<SaillieRow> {
  return runInsert<SaillieRow>('saillies', values);
}

/**
 * Patch partiel d'une saillie. Accepte les champs métier `Update` ainsi que
 * les nouvelles colonnes V21 d'échographie (`statut_echo`, `date_echo`,
 * `notes_echo`) qui ne sont pas encore régénérées dans Database types.
 */
export type SaillieUpdatePatch = Partial<SaillieRow> & {
  statut_echo?: 'CONFIRMEE' | 'VIDE' | 'DOUTEUSE' | null;
  date_echo?: string | null;
  notes_echo?: string | null;
};

export function updateSaillie(
  id: string,
  patch: SaillieUpdatePatch,
): Promise<WriteResult> {
  return runUpdate('saillies', id, patch as Record<string, unknown>);
}

// ── Saillie resolver (workflow Saillie → Mise-bas) ───────────────────────────

export interface LastSaillieResolved {
  /** UUID du verrat (FK boars.id), ou null si la saillie n'a pas de verrat lié. */
  boar_id: string | null;
  /** Code du verrat (ex: V01) pour affichage UI, si disponible. */
  boar_code_id: string | null;
  /** Date de saillie au format ISO yyyy-MM-dd. */
  date_saillie: string;
}

/**
 * Saillie « en cours » d'une truie (saillie active dont la MB n'a pas encore
 * eu lieu). Retourne l'UUID de la saillie pour pouvoir patcher (statut_echo,
 * date_echo, notes_echo) — utilisé par le QuickEchographieForm.
 */
export interface PendingSaillie {
  saillie_id: string;
  sow_id: string;
  sow_code_id: string | null;
  boar_code_id: string | null;
  date_saillie: string;
  /** Jours depuis la saillie (calculé côté serveur via dateRef). */
  days_since: number;
}

/**
 * Liste les saillies « en attente d'écho » : saillies d'au moins `minDaysAgo`
 * jours pour lesquelles le statut écho n'est pas encore renseigné.
 *
 * Utilisé pour alimenter le sélecteur du QuickEchographieForm. Ordre :
 * plus récente d'abord.
 */
export async function listPendingEchographies(
  options: { minDaysAgo?: number; dateRef?: Date } = {},
): Promise<PendingSaillie[]> {
  const minDaysAgo = options.minDaysAgo ?? 21;
  const dateRef = options.dateRef ?? new Date();
  if (!Number.isFinite(dateRef.getTime())) return [];

  const upperIso = new Date(dateRef.getTime() - minDaysAgo * 86400000)
    .toISOString()
    .slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('saillies') as any)
    .select('id, sow_id, sow_code_id, boar_code_id, date_saillie, statut_echo, sows(code_id)')
    .lte('date_saillie', upperIso)
    .is('statut_echo', null)
    .order('date_saillie', { ascending: false });

  if (error || !data) return [];

  const refTs = dateRef.getTime();
  return (data as Array<{
    id: string;
    sow_id: string | null;
    sow_code_id: string | null;
    boar_code_id: string | null;
    date_saillie: string | null;
    sows?: { code_id?: string | null } | null;
  }>)
    .filter(r => !!r.id && !!r.sow_id && !!r.date_saillie)
    .map(r => {
      const ds = new Date(r.date_saillie as string);
      const daysSince = Number.isFinite(ds.getTime())
        ? Math.max(0, Math.round((refTs - ds.getTime()) / 86400000))
        : 0;
      return {
        saillie_id: r.id,
        sow_id: r.sow_id as string,
        sow_code_id: r.sows?.code_id ?? r.sow_code_id ?? null,
        boar_code_id: r.boar_code_id ?? null,
        date_saillie: r.date_saillie as string,
        days_since: daysSince,
      };
    });
}

/**
 * Cherche la saillie la plus récente AVANT `dateMB` pour la truie donnée.
 *
 * Utilisé par QuickMiseBasForm pour auto-résoudre le verrat père au moment
 * d'enregistrer une mise-bas. Fenêtre par défaut : 130 jours (115 ± 15).
 *
 * Le paramètre `truie` accepte SOIT un UUID (sows.id) SOIT un code_id
 * (sows.code_id, ex: T07) — résolution interne.
 *
 * @returns la saillie résolue, ou `null` si aucune saillie dans la fenêtre.
 */
export async function findLastSaillieForTruie(
  truie: string,
  dateMB: Date | string,
  windowDays = 130,
): Promise<LastSaillieResolved | null> {
  if (!truie) return null;

  // Accepte UUID ou code_id (T07) — résolution si nécessaire.
  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(truie);
  const sowId = looksLikeUuid ? truie : await resolveIdByCode('sows', truie);
  if (!sowId) return null;

  const dateRef = typeof dateMB === 'string' ? new Date(dateMB) : dateMB;
  if (!Number.isFinite(dateRef.getTime())) return null;
  const upperIso = dateRef.toISOString().slice(0, 10);
  const lowerIso = new Date(dateRef.getTime() - windowDays * 86400000)
    .toISOString()
    .slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('saillies') as any)
    .select('boar_id, boar_code_id, date_saillie, boars(code_id)')
    .eq('sow_id', sowId)
    .lte('date_saillie', upperIso)
    .gte('date_saillie', lowerIso)
    .order('date_saillie', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    boar_id: string | null;
    boar_code_id: string | null;
    date_saillie: string | null;
    boars?: { code_id?: string | null } | null;
  };
  return {
    boar_id: row.boar_id ?? null,
    boar_code_id: row.boars?.code_id ?? row.boar_code_id ?? null,
    date_saillie: row.date_saillie ?? '',
  };
}
