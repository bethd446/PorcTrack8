/**
 * loges.repo.ts — Loges (référentiel structuré V24) + mouvements inter-loges.
 *
 * Extrait de `services/supabaseWrites.ts` lors du découpage P2-ARCHI (lot 4).
 * Les signatures sont strictement préservées : `supabaseWrites.ts` réexporte
 * ces fonctions pour ne casser aucun call-site externe.
 *
 * Coexistence de 2 shapes :
 *  - camelCase métier (`Loge`, `LogeMovement` cf. `types/farm`) pour l'UI ;
 *  - snake_case DB (`LogeDbRow`, `LogeMovementDbRow`) utilisé par la queue
 *    offline qui passe le payload brut.
 */
import { supabase } from '../supabaseClient';
import type { Database } from '../../types/database.types';
import type {
  Loge,
  LogeType,
  LogeMovement,
  Truie,
  Verrat,
  BandePorcelets,
} from '../../types/farm';
import {
  getFarmId,
  runInsert,
  runUpdate,
  type WithoutFarm,
  type WriteResult,
} from './_shared';

export type LogeDbRow = Database['public']['Tables']['loges']['Row'];
export type LogeMovementDbRow =
  Database['public']['Tables']['loge_movements']['Row'];
type LogeInsert = Database['public']['Tables']['loges']['Insert'];
type LogeMovementInsert =
  Database['public']['Tables']['loge_movements']['Insert'];

// ── V24 — Loges (shape métier camelCase) ────────────────────────────────────

interface LogeRow {
  id: string;
  numero: string;
  type: LogeType;
  batiment: string | null;
  capacite_max: number | null;
  notes: string | null;
  active: boolean;
}

function mapLoge(r: LogeRow): Loge {
  return {
    id: r.id,
    numero: r.numero,
    type: r.type,
    batiment: r.batiment ?? undefined,
    capaciteMax: r.capacite_max ?? undefined,
    notes: r.notes ?? undefined,
    active: r.active,
  };
}

/**
 * Liste les loges de la ferme (RLS scope farm_id auto via auth.uid()).
 * Inclut les loges archivées (active=false) — filtrer côté UI si besoin.
 */
export async function listLoges(): Promise<Loge[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('loges' as any) as any)
    .select('id, numero, type, batiment, capacite_max, notes, active')
    .order('numero', { ascending: true });
  if (error) {
    console.warn('[loges] list failed:', error.message);
    return [];
  }
  return (data as LogeRow[] ?? []).map(mapLoge);
}

/** Crée une nouvelle loge. `active` défaut à true. */
export async function createLoge(
  data: Omit<Loge, 'id' | 'active'> & { active?: boolean },
): Promise<Loge> {
  if (!data.numero || !data.numero.trim()) throw new Error('numero requis');
  const farm_id = await getFarmId();
  const payload = {
    farm_id,
    numero: data.numero.trim(),
    type: data.type,
    batiment: data.batiment ?? null,
    capacite_max: data.capaciteMax ?? null,
    notes: data.notes ?? null,
    active: data.active ?? true,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase.from('loges' as any) as any)
    .insert(payload)
    .select('id, numero, type, batiment, capacite_max, notes, active')
    .single();
  if (error) throw new Error(`[loges] insert failed: ${error.message}`);
  return mapLoge(row as LogeRow);
}

/** Patch partiel d'une loge. */
export async function updateLoge(
  id: string,
  patch: Partial<Loge>,
): Promise<void> {
  if (!id) throw new Error('ID manquant');
  const dbPatch: Record<string, unknown> = {};
  if (patch.numero !== undefined) dbPatch.numero = patch.numero;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.batiment !== undefined) dbPatch.batiment = patch.batiment ?? null;
  if (patch.capaciteMax !== undefined) dbPatch.capacite_max = patch.capaciteMax ?? null;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
  if (patch.active !== undefined) dbPatch.active = patch.active;
  if (Object.keys(dbPatch).length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('loges' as any) as any)
    .update(dbPatch)
    .eq('id', id);
  if (error) throw new Error(`[loges] update failed: ${error.message}`);
}

/** Soft-delete : passe active=false (préserve historique mouvements). */
export async function deactivateLoge(id: string): Promise<void> {
  return updateLoge(id, { active: false });
}

// ── V24 — Mouvements inter-loges ────────────────────────────────────────────

interface LogeMovementRow {
  id: string;
  subject_type: 'TRUIE' | 'VERRAT' | 'BANDE';
  subject_id: string;
  from_loge_id: string | null;
  to_loge_id: string | null;
  date_mvt: string;
  reason: string | null;
}

function mapLogeMovement(r: LogeMovementRow): LogeMovement {
  return {
    id: r.id,
    subjectType: r.subject_type,
    subjectId: r.subject_id,
    fromLogeId: r.from_loge_id ?? undefined,
    toLogeId: r.to_loge_id ?? undefined,
    dateMvt: r.date_mvt,
    reason: r.reason ?? undefined,
  };
}

/**
 * Déplace un sujet (truie / verrat / bande) vers une nouvelle loge.
 *
 * Effets :
 *  1. Lit subject.loge_id actuel = from_loge_id
 *  2. INSERT loge_movements (historique)
 *  3. PATCH subject.loge_id = toLogeId
 */
export async function moveSubject(args: {
  subjectType: 'TRUIE' | 'VERRAT' | 'BANDE';
  subjectId: string;
  toLogeId: string;
  reason?: string;
}): Promise<LogeMovement> {
  if (!args.subjectId) throw new Error('subjectId manquant');
  if (!args.toLogeId) throw new Error('toLogeId manquant');

  const tableMap = {
    TRUIE: 'sows',
    VERRAT: 'boars',
    BANDE: 'batches',
  } as const;
  const table = tableMap[args.subjectType];

  // 1. Lis loge_id actuel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cur } = await (supabase.from(table) as any)
    .select('loge_id')
    .eq('id', args.subjectId)
    .maybeSingle();
  const fromLogeId = (cur as { loge_id?: string | null } | null)?.loge_id ?? null;

  const farm_id = await getFarmId();

  // 2. INSERT mouvement
  const payload = {
    farm_id,
    subject_type: args.subjectType,
    subject_id: args.subjectId,
    from_loge_id: fromLogeId,
    to_loge_id: args.toLogeId,
    date_mvt: new Date().toISOString().slice(0, 10),
    reason: args.reason ?? null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mvt, error: mvtErr } = await (supabase.from('loge_movements' as any) as any)
    .insert(payload)
    .select('id, subject_type, subject_id, from_loge_id, to_loge_id, date_mvt, reason')
    .single();
  if (mvtErr) throw new Error(`[loge_movements] insert failed: ${mvtErr.message}`);

  // 3. PATCH loge_id sur le sujet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase.from(table) as any)
    .update({ loge_id: args.toLogeId })
    .eq('id', args.subjectId);
  if (updErr) {
    console.warn(`[${table}] update loge_id failed: ${updErr.message}`);
  }

  return mapLogeMovement(mvt as LogeMovementRow);
}

/**
 * Liste les sujets actuellement présents dans une loge donnée.
 * Retourne {truies, verrats, bandes, totalAnimaux}.
 */
export async function getLogeContents(logeId: string): Promise<{
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  totalAnimaux: number;
}> {
  if (!logeId) {
    return { truies: [], verrats: [], bandes: [], totalAnimaux: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: sowsData }, { data: boarsData }, { data: batchesData }] =
    await Promise.all([
      (supabase.from('sows') as any).select('*').eq('loge_id', logeId),
      (supabase.from('boars') as any).select('*').eq('loge_id', logeId),
      (supabase.from('batches') as any).select('*').eq('loge_id', logeId),
    ]);

  const truies: Truie[] = ((sowsData as Record<string, unknown>[]) ?? []).map(r => ({
    id: r.id as string,
    displayId: (r.code_id as string) ?? '',
    boucle: (r.boucle as string) ?? '',
    nom: (r.name as string) ?? undefined,
    statut: (r.statut as string) ?? 'En attente saillie',
    ration: (r.ration_kg_j as number) ?? 0,
    logeId: (r.loge_id as string) ?? undefined,
    synced: true,
  }));

  const verrats: Verrat[] = ((boarsData as Record<string, unknown>[]) ?? []).map(r => ({
    id: r.id as string,
    displayId: (r.code_id as string) ?? '',
    boucle: (r.boucle as string) ?? '',
    nom: (r.name as string) ?? undefined,
    statut: (r.statut as string) ?? 'Actif',
    ration: (r.ration_kg_j as number) ?? 0,
    logeId: (r.loge_id as string) ?? undefined,
    synced: true,
  }));

  const bandes: BandePorcelets[] = ((batchesData as Record<string, unknown>[]) ?? []).map(r => {
    const nv = (r.porcelets_nes_vivants as number) ?? 0;
    const morts = (r.nb_mort_nes as number) ?? 0;
    return {
      id: r.id as string,
      idPortee: (r.code_id as string) ?? '',
      statut: (r.statut as string) ?? 'Sous mère',
      poidsInitialKg: (r.poids_initial_kg as number) ?? 0,
      nv,
      morts,
      vivants: nv - morts,
      logeId: (r.loge_id as string) ?? undefined,
      synced: true,
    };
  });

  const totalAnimaux =
    truies.length +
    verrats.length +
    bandes.reduce((sum, b) => sum + (b.vivants ?? 0), 0);

  return { truies, verrats, bandes, totalAnimaux };
}

// ── V72 — Helpers d'écriture DB-shape (queue offline) ───────────────────────

export function insertLoge(
  values: WithoutFarm<LogeInsert>,
): Promise<LogeDbRow> {
  return runInsert<LogeDbRow>('loges', values);
}

/**
 * Patch DB-shape (snake_case). Distinct de `updateLoge(id, Partial<Loge>)`
 * historique qui mappe le shape camelCase métier — celui-ci est consommé
 * par le runner de la queue offline qui passe directement le payload DB.
 */
export function updateLogeRow(
  id: string,
  patch: Partial<LogeDbRow>,
): Promise<WriteResult> {
  return runUpdate('loges', id, patch);
}

export function insertLogeMovement(
  values: WithoutFarm<LogeMovementInsert>,
): Promise<LogeMovementDbRow> {
  return runInsert<LogeMovementDbRow>('loge_movements', values);
}
