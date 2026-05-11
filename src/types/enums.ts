// src/types/enums.ts
export const SOW_STATUT = ['En attente saillie','Pleine','En maternité','À surveiller','Réforme','Morte'] as const;
export type SowStatut = typeof SOW_STATUT[number];

export const BATCH_PHASE = ['MATERNITE','POST_SEVRAGE','CROISSANCE','ENGRAISSEMENT','FINITION','SEVREE','RECAP'] as const;
export type BatchPhase = typeof BATCH_PHASE[number];

export const SAILLIE_STATUT = ['SAILLIE','CONFIRMEE','VIDE','RETOUR','ECHEC'] as const;
export type SaillieStatut = typeof SAILLIE_STATUT[number];

export const BOAR_STATUT = ['Actif','Réforme','Mort'] as const;
export type BoarStatut = typeof BOAR_STATUT[number];

// Helpers migration soft
export function normalizeSowStatut(legacy: string | null | undefined): SowStatut | null {
  if (!legacy) return null;
  const map: Record<string, SowStatut> = {
    'Gestante': 'Pleine',
    'Allaitante': 'En maternité',
    'Maternité': 'En maternité',
    'Vide': 'En attente saillie',
  };
  if (legacy in map) return map[legacy];
  if (SOW_STATUT.includes(legacy as SowStatut)) return legacy as SowStatut;
  return null;
}

export function normalizeBatchPhase(legacy: string | null | undefined): BatchPhase | null {
  if (!legacy) return null;
  const map: Record<string, BatchPhase> = {
    'maternite': 'MATERNITE', 'Maternité': 'MATERNITE', 'Sous mère': 'MATERNITE', 'SOUS_MERE': 'MATERNITE',
    'post-sevrage': 'POST_SEVRAGE', 'Post-sevrage': 'POST_SEVRAGE',
    'croissance': 'CROISSANCE', 'Croissance': 'CROISSANCE',
    'engraissement': 'ENGRAISSEMENT', 'Engraissement': 'ENGRAISSEMENT',
    'finition': 'FINITION', 'Finition': 'FINITION',
    'sevree': 'SEVREE', 'Sevrée': 'SEVREE',
  };
  if (legacy in map) return map[legacy];
  if (BATCH_PHASE.includes(legacy as BatchPhase)) return legacy as BatchPhase;
  return null;
}
