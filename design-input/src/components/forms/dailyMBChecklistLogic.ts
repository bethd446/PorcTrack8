/**
 * dailyMBChecklistLogic — Helpers purs pour daily check bandes "Sous mère".
 * ════════════════════════════════════════════════════════════════════════
 * 10 questions terrain, 1 ligne par bande × jour. Validation pure ici, pour
 * tests sans React ni Supabase.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Comportement = 'CALME' | 'NORMAL' | 'AGITE';
export type TruieAlimentation = 'OUI' | 'NON' | 'PARTIEL';
export type Diarrhee = 'AUCUN' | 'QUELQUES' | 'TOUS';

export interface DailyMBDraft {
  mortsJour: string;
  comportement: Comportement | '';
  truieAlimentation: TruieAlimentation | '';
  mamellesUtilisees: boolean | null;
  diarrhee: Diarrhee | '';
  respirationOk: boolean | null;
  lampeOk: boolean | null;
  eauOk: boolean | null;
  notes: string;
  photoUrl: string;
}

export interface DailyMBValidation {
  ok: boolean;
  errors: {
    mortsJour?: string;
    comportement?: string;
    truieAlimentation?: string;
    diarrhee?: string;
    notes?: string;
  };
  values?: {
    mortsJour: number;
    comportement: Comportement | null;
    truieAlimentation: TruieAlimentation | null;
    mamellesUtilisees: boolean | null;
    diarrhee: Diarrhee | null;
    respirationOk: boolean | null;
    lampeOk: boolean | null;
    eauOk: boolean | null;
    notes: string | null;
    photoUrl: string | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function emptyDraft(): DailyMBDraft {
  return {
    mortsJour: '0',
    comportement: '',
    truieAlimentation: '',
    mamellesUtilisees: null,
    diarrhee: '',
    respirationOk: null,
    lampeOk: null,
    eauOk: null,
    notes: '',
    photoUrl: '',
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

const COMPORTEMENT_VALUES: ReadonlyArray<Comportement> = ['CALME', 'NORMAL', 'AGITE'];
const TRUIE_ALIM_VALUES: ReadonlyArray<TruieAlimentation> = ['OUI', 'NON', 'PARTIEL'];
const DIARRHEE_VALUES: ReadonlyArray<Diarrhee> = ['AUCUN', 'QUELQUES', 'TOUS'];

/**
 * Valide la saisie quotidienne. Règles :
 *   - mortsJour : entier 0..50 (default 0)
 *   - comportement : enum optionnel
 *   - truie_alimentation : enum optionnel
 *   - diarrhee : enum optionnel
 *   - notes : ≤ 1000 chars
 *   - autres champs booléens optionnels
 */
export function validateDailyMB(draft: DailyMBDraft): DailyMBValidation {
  const errors: DailyMBValidation['errors'] = {};

  // mortsJour
  const mortsRaw = (draft.mortsJour ?? '').trim();
  const morts = mortsRaw === '' ? 0 : Number(mortsRaw);
  if (!Number.isFinite(morts) || !Number.isInteger(morts) || morts < 0 || morts > 50) {
    errors.mortsJour = 'Morts du jour doit être un entier entre 0 et 50';
  }

  // Enums optionnels
  if (draft.comportement && !COMPORTEMENT_VALUES.includes(draft.comportement as Comportement)) {
    errors.comportement = 'Valeur comportement invalide';
  }
  if (
    draft.truieAlimentation &&
    !TRUIE_ALIM_VALUES.includes(draft.truieAlimentation as TruieAlimentation)
  ) {
    errors.truieAlimentation = 'Valeur alimentation invalide';
  }
  if (draft.diarrhee && !DIARRHEE_VALUES.includes(draft.diarrhee as Diarrhee)) {
    errors.diarrhee = 'Valeur diarrhée invalide';
  }

  // Notes
  if (draft.notes && draft.notes.length > 1000) {
    errors.notes = 'Notes trop longues (max 1000 caractères)';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    errors: {},
    values: {
      mortsJour: morts,
      comportement: (draft.comportement || null) as Comportement | null,
      truieAlimentation: (draft.truieAlimentation || null) as TruieAlimentation | null,
      mamellesUtilisees: draft.mamellesUtilisees,
      diarrhee: (draft.diarrhee || null) as Diarrhee | null,
      respirationOk: draft.respirationOk,
      lampeOk: draft.lampeOk,
      eauOk: draft.eauOk,
      notes: draft.notes.trim() || null,
      photoUrl: draft.photoUrl.trim() || null,
    },
  };
}
