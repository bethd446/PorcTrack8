/**
 * farmValidators — Helpers de validation Fail-Fast pour formulaires terrain.
 * ════════════════════════════════════════════════════════════════════════
 * Validateurs purs (zéro effet de bord) qui retournent un `ValidationResult`
 * canonique. Le pattern : un check = une raison + un code stable, pour que
 * les UI puissent localiser les messages plus tard sans toucher à la logique.
 *
 * Bornes par défaut adaptées à l'élevage porcin (poids porcelet → adulte,
 * effectif d'une bande, dates passées vs. futures pour les actes vétérinaires).
 *
 * Usage côté form :
 *   const r = validatePoidsKg(poids);
 *   if (!r.ok) setErrors({ poidsKg: r.errors[0].message });
 */

export interface ValidationError {
  /** Code stable (machine-friendly). Ex: 'poids.out_of_range'. */
  code: string;
  /** Message FR utilisateur. */
  message: string;
  /** Champ concerné (data-attribute, name d'input, etc.). */
  field: string;
}

/**
 * Résultat de validation.
 *
 * NB : `errors` est toujours présent dans la shape (vide si `ok: true`).
 * Le tsconfig n'active pas `strict`, donc on évite les unions discriminées
 * qui nécessitent `strictNullChecks` pour narrowing automatique côté appelant.
 */
export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

const fail = (
  code: string,
  message: string,
  field: string,
): ValidationResult => ({
  ok: false,
  errors: [{ code, message, field }],
});

const ok = (): ValidationResult => ({ ok: true, errors: [] });

/* ─── Poids (kg) ───────────────────────────────────────────────────────── */

export interface ValidatePoidsOpts {
  /** Borne min (kg). Défaut 0.1 (porcelet < 1 jour). */
  min?: number;
  /** Borne max (kg). Défaut 500 (truie/verrat adulte plafond). */
  max?: number;
  /** Nom du champ dans le form. Défaut 'poids'. */
  field?: string;
}

export function validatePoidsKg(
  value: number,
  opts: ValidatePoidsOpts = {},
): ValidationResult {
  const min = opts.min ?? 0.1;
  const max = opts.max ?? 500;
  const field = opts.field ?? 'poids';
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail('poids.invalid', 'Poids invalide', field);
  }
  if (value <= 0) {
    return fail('poids.non_positive', 'Poids doit être > 0', field);
  }
  if (value < min) {
    return fail('poids.too_low', `Poids doit être ≥ ${min} kg`, field);
  }
  if (value > max) {
    return fail('poids.too_high', `Poids doit être ≤ ${max} kg`, field);
  }
  return ok();
}

/* ─── Dates ────────────────────────────────────────────────────────────── */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoLocal(iso: string): Date | null {
  if (typeof iso !== 'string' || !ISO_DATE_RE.test(iso)) return null;
  // Local midnight pour comparaison cohérente avec `today`.
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  // Validation supplémentaire : roundtrip yyyy-mm-dd (rejette 2024-02-31).
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) return null;
  return dt;
}

function todayLocalMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Rejette si la date est strictement postérieure à aujourd'hui.
 * Pour : mise-bas réelle, sevrage réel, pesée, mortalité observée…
 */
export function validateDatePresentOrPast(
  iso: string,
  field: string = 'date',
): ValidationResult {
  const trimmed = (iso ?? '').trim();
  if (trimmed === '') {
    return fail('date.required', 'Date requise', field);
  }
  const dt = parseIsoLocal(trimmed);
  if (!dt) {
    return fail('date.invalid', 'Date invalide (yyyy-MM-dd)', field);
  }
  if (dt.getTime() > todayLocalMidnight().getTime()) {
    return fail('date.future', 'Date future non autorisée', field);
  }
  return ok();
}

/**
 * Rejette si la date est strictement antérieure à aujourd'hui.
 * Pour : saillie prévue, mise-bas prévue, RDV vétérinaire…
 */
export function validateDateFutureOrToday(
  iso: string,
  field: string = 'date',
): ValidationResult {
  const trimmed = (iso ?? '').trim();
  if (trimmed === '') {
    return fail('date.required', 'Date requise', field);
  }
  const dt = parseIsoLocal(trimmed);
  if (!dt) {
    return fail('date.invalid', 'Date invalide (yyyy-MM-dd)', field);
  }
  if (dt.getTime() < todayLocalMidnight().getTime()) {
    return fail('date.past', 'Date passée non autorisée', field);
  }
  return ok();
}

/* ─── Effectif (entier) ────────────────────────────────────────────────── */

export interface ValidateEffectifOpts {
  /** Borne min. Défaut 0. */
  min?: number;
  /** Borne max. Défaut 5000 (audit/grandes fermes — couvre 50+ truies × portées simultanées). */
  max?: number;
  /** Nom du champ. Défaut 'effectif'. */
  field?: string;
}

export function validateEffectif(
  value: number,
  opts: ValidateEffectifOpts = {},
): ValidationResult {
  const min = opts.min ?? 0;
  const max = opts.max ?? 5000;
  const field = opts.field ?? 'effectif';
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail('effectif.invalid', 'Effectif invalide', field);
  }
  if (!Number.isInteger(value)) {
    return fail('effectif.not_integer', 'Effectif doit être un entier', field);
  }
  if (value < min) {
    return fail('effectif.too_low', `Effectif ≥ ${min}`, field);
  }
  if (value > max) {
    return fail('effectif.too_high', `Effectif ≤ ${max}`, field);
  }
  return ok();
}

/* ─── Boucle / Code identifiant ───────────────────────────────────────── */

export function validateBoucle(
  value: string,
  field: string = 'boucle',
): ValidationResult {
  if (typeof value !== 'string') {
    return fail('boucle.invalid', 'Boucle invalide', field);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return fail('boucle.empty', 'Boucle requise', field);
  }
  if (trimmed.length > 40) {
    return fail('boucle.too_long', 'Boucle trop longue (max 40)', field);
  }
  return ok();
}
