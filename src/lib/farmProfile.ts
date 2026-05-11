/**
 * V80 — Profil ferme (Naisseur / Engraisseur / Cycle complet)
 *
 * Conduit l'adaptation de l'UI (bottom-nav, KPIs Performance, FAB actions)
 * selon le métier réel de l'éleveur. Stocké dans `farms.metadata.profil`
 * (jsonb existant — pas d'ALTER TABLE).
 *
 * Fallback `cycle_complet` = comportement historique = aucune régression
 * pour les comptes qui n'ont jamais touché le step onboarding profil.
 */
import { supabase } from '../services/supabaseClient';

export type FarmProfile = 'naisseur' | 'engraisseur' | 'cycle_complet';

export interface FarmProfileOption {
  value: FarmProfile;
  label: string;
  description: string;
  /** Emoji court pour les cards onboarding (mobile terrain). */
  emoji: string;
}

export const FARM_PROFILES: FarmProfileOption[] = [
  {
    value: 'naisseur',
    label: 'Naisseur',
    emoji: '🤰',
    description: 'Truies, saillies, mises-bas, vente porcelets sevrés',
  },
  {
    value: 'engraisseur',
    label: 'Engraisseur',
    emoji: '🐷',
    description: 'Achat porcelets, pesées, finition, vente carcasses',
  },
  {
    value: 'cycle_complet',
    label: 'Cycle complet',
    emoji: '🔄',
    description: 'Naisseur + engraisseur (de la saillie à la vente)',
  },
];

/** Profil par défaut = comportement historique (aucune régression). */
export const DEFAULT_FARM_PROFILE: FarmProfile = 'cycle_complet';

/**
 * Lit le profil depuis le champ `metadata` de la farm. Tolère :
 *  - metadata null / not-object → cycle_complet
 *  - profil absent / mauvaise valeur → cycle_complet
 *
 * NB : `OnboardingV2Wizard` (V71-P3) stocke un objet `metadata.onboarding_v2`
 * avec un champ `type` qui valait `'NAISSEUR'` ou `'NAISSEUR_ENGRAISSEUR'`.
 * On dérive `profil` de `type` en fallback pour rétro-compat (pas de
 * migration de données nécessaire pour les comptes pilotes existants).
 */
export function readFarmProfile(metadata: unknown): FarmProfile {
  if (!metadata || typeof metadata !== 'object') return DEFAULT_FARM_PROFILE;
  const meta = metadata as Record<string, unknown>;

  // 1. Nouveau champ V80 — racine
  const direct = meta.profil;
  if (
    direct === 'naisseur' ||
    direct === 'engraisseur' ||
    direct === 'cycle_complet'
  ) {
    return direct;
  }

  // 2. Rétro-compat OnboardingV2Wizard (champ `type` dans onboarding_v2)
  const ob = meta.onboarding_v2;
  if (ob && typeof ob === 'object') {
    const t = (ob as Record<string, unknown>).type;
    if (t === 'NAISSEUR') return 'naisseur';
    if (t === 'NAISSEUR_ENGRAISSEUR') return 'cycle_complet';
  }

  return DEFAULT_FARM_PROFILE;
}

/**
 * Persiste le profil dans `farms.metadata.profil` via merge jsonb côté
 * applicatif (SELECT puis UPDATE — RLS-friendly, pas besoin de RPC).
 * Met aussi à jour `metadata.profilSetAt` pour audit.
 */
export async function setFarmProfile(
  farmId: string,
  profil: FarmProfile,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error: readErr } = await sb
    .from('farms')
    .select('metadata')
    .eq('id', farmId)
    .maybeSingle();
  if (readErr) throw readErr;
  const current = (data?.metadata && typeof data.metadata === 'object')
    ? (data.metadata as Record<string, unknown>)
    : {};
  const next = {
    ...current,
    profil,
    profilSetAt: new Date().toISOString(),
  };
  const { error: writeErr } = await sb
    .from('farms')
    .update({ metadata: next })
    .eq('id', farmId);
  if (writeErr) throw writeErr;
}

// ─── Sélections conditionnelles (consommé par nav, KPIs, FAB) ───────────────

/** Le profil voit-il le pilier reproduction (saillies / MB / écho / sevrage) ? */
export function hasReproduction(profil: FarmProfile): boolean {
  return profil === 'naisseur' || profil === 'cycle_complet';
}

/** Le profil voit-il le pilier engraissement (lots, GMQ, IC, vente carcasse) ? */
export function hasEngraissement(profil: FarmProfile): boolean {
  return profil === 'engraisseur' || profil === 'cycle_complet';
}
