/**
 * QuickEditVerrat — Validateur pur.
 * ════════════════════════════════════════════════════════════════════════
 * Isolé dans un module .ts (sans React/Ionic) pour pouvoir être testé en
 * environnement node (`vitest` sans jsdom).
 *
 * Règles :
 *  - nom           : string trim, max 30 chars — vide autorisé (retire le nom).
 *  - boucle        : string trim OBLIGATOIRE, max 30 chars.
 *  - origine       : string trim, max 40 chars — vide autorisé.
 *  - alimentation  : string trim, max 40 chars — vide autorisé.
 *  - ration        : nombre fini, 0..10 (bornes incluses), virgule acceptée,
 *                    arrondi au 0.1 près.
 *  - statut        : non vide (défaut "Actif" côté UI).
 *  - notes         : string trim, max 200 chars — vide autorisé.
 *
 * Patch retourné utilise les noms de colonnes GAS canoniques (voir `mapVerrat`
 * dans `src/mappers/index.ts`) :
 *   NOM · BOUCLE · ORIGINE · ALIMENTATION · RATION KG/J · STATUT · NOTES
 *
 * Patch PARTIEL : n'inclut que les champs réellement modifiés (diff vs valeurs
 * initiales). Si aucun champ n'a changé, `patch` est un objet vide (ok = true).
 */

export type VerratEditPatch = Partial<{
  NOM: string;
  BOUCLE: string;
  ORIGINE: string;
  ALIMENTATION: string;
  'RATION KG/J': number;
  STATUT: string;
  NOTES: string;
}> &
  Record<string, string | number | boolean | null>;

export interface VerratEditValidation {
  ok: boolean;
  patch?: VerratEditPatch;
  errors: {
    nom?: string;
    boucle?: string;
    origine?: string;
    alimentation?: string;
    ration?: string;
    statut?: string;
    notes?: string;
  };
}

export interface VerratEditInitial {
  nom: string;
  boucle: string;
  origine: string;
  alimentation: string;
  ration: number;
  statut: string;
  notes: string;
}

export interface VerratEditForm {
  nom: string;
  boucle: string;
  origine: string;
  alimentation: string;
  ration: string;
  statut: string;
  notes: string;
}

/** Arrondi au 0.1 près (évite les flottants parasites). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Valide les champs du form + compare aux valeurs initiales pour produire un
 * patch diff-only (n'inclut que ce qui a changé).
 */
export function validateVerratEdit(
  form: VerratEditForm,
  initial: VerratEditInitial,
): VerratEditValidation {
  const errors: VerratEditValidation['errors'] = {};

  // ── Nom ──────────────────────────────────────────────────────────────
  const nom = (form.nom ?? '').trim();
  if (nom.length > 30) errors.nom = 'Nom trop long (max 30 caractères)';

  // ── Boucle (obligatoire) ─────────────────────────────────────────────
  const boucle = (form.boucle ?? '').trim();
  if (boucle.length === 0) errors.boucle = 'Boucle obligatoire';
  else if (boucle.length > 30) errors.boucle = 'Boucle trop longue (max 30)';

  // ── Origine ──────────────────────────────────────────────────────────
  const origine = (form.origine ?? '').trim();
  if (origine.length > 40) errors.origine = 'Origine trop longue (max 40)';

  // ── Alimentation ─────────────────────────────────────────────────────
  const alimentation = (form.alimentation ?? '').trim();
  if (alimentation.length > 40)
    errors.alimentation = 'Alimentation trop longue (max 40)';

  // ── Ration ───────────────────────────────────────────────────────────
  const normalized = String(form.ration ?? '').replace(',', '.').trim();
  const ration = Number(normalized);
  if (normalized === '' || !Number.isFinite(ration)) {
    errors.ration = 'Ration numérique requise';
  } else if (ration < 0) {
    errors.ration = 'Ration ≥ 0 kg/j';
  } else if (ration > 10) {
    errors.ration = 'Ration ≤ 10 kg/j';
  }

  // ── Statut ───────────────────────────────────────────────────────────
  const statut = (form.statut ?? '').trim();
  if (statut.length === 0) errors.statut = 'Statut requis';

  // ── Notes ────────────────────────────────────────────────────────────
  const notes = (form.notes ?? '').trim();
  if (notes.length > 200) errors.notes = 'Notes trop longues (max 200)';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // ── Diff (patch partiel : uniquement les champs modifiés) ────────────
  const patch: VerratEditPatch = {};
  const initialNom = (initial.nom ?? '').trim();
  const initialBoucle = (initial.boucle ?? '').trim();
  const initialOrigine = (initial.origine ?? '').trim();
  const initialAlim = (initial.alimentation ?? '').trim();
  const initialRation = round1(Number(initial.ration) || 0);
  const initialStatut = (initial.statut ?? '').trim();
  const initialNotes = (initial.notes ?? '').trim();

  const rationNormalized = round1(ration);

  if (nom !== initialNom) patch.NOM = nom;
  if (boucle !== initialBoucle) patch.BOUCLE = boucle;
  if (origine !== initialOrigine) patch.ORIGINE = origine;
  if (alimentation !== initialAlim) patch.ALIMENTATION = alimentation;
  if (rationNormalized !== initialRation) patch['RATION KG/J'] = rationNormalized;
  if (statut !== initialStatut) patch.STATUT = statut;
  if (notes !== initialNotes) patch.NOTES = notes;

  return { ok: true, errors: {}, patch };
}

// ── Listes suggérées ──────────────────────────────────────────────────────
export const ORIGINE_SUGGESTIONS = [
  'Thomasset',
  'Azaguie',
  'Import',
  'Autre',
] as const;

export const ALIMENTATION_SUGGESTIONS = [
  'Mâle reproducteur',
  'Entretien',
  'Flushing',
] as const;

export const STATUT_OPTIONS = [
  'Actif',
  'Réforme',
  'Mort',
  'Quarantaine',
] as const;
