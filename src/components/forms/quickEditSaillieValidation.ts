/**
 * QuickEditSaillie — Validateur pur.
 * ════════════════════════════════════════════════════════════════════════
 * Isolé dans un module .ts (sans React/Ionic) pour tests `vitest` node env.
 *
 * Contexte métier :
 *  - Saillie = couple truie × verrat à une date donnée, qui détermine la
 *    date prévue de mise-bas (MB) à +115 jours (gestation porcine).
 *  - La feuille Sheets cible est `SUIVI_REPRODUCTION_ACTUEL` (cf.
 *    `mapSaillie` dans `src/mappers/index.ts`).
 *
 * Règles :
 *  - truieId       : string non vide (obligatoire, readonly en UI).
 *  - verratId      : string non vide (obligatoire).
 *  - dateSaillie   : format yyyy-MM-dd (input HTML date), convertible vers
 *                    une Date valide, pas dans un futur lointain (> +365j).
 *  - dateMBPrevue  : format yyyy-MM-dd (auto-calculée +115j mais éditable),
 *                    si vide → patch avec chaîne vide (retire la valeur).
 *  - statut        : l'un des `STATUT_OPTIONS` ou vide.
 *  - notes         : string trim, max 200 chars — vide autorisé.
 *
 * Patch retourné utilise les noms de colonnes canoniques (majuscules sans
 * accents pour tolérance) :
 *   'ID TRUIE' · 'VERRAT' · 'DATE SAILLIE' · 'DATE MB PREVUE' · STATUT · NOTES
 *
 * Les dates patch sont converties au format `dd/MM/yyyy` (format Sheets).
 *
 * Patch PARTIEL : uniquement les champs modifiés (diff vs initial).
 */

/** Durée de gestation truie en jours (cf. CLAUDE.md). */
export const GESTATION_DAYS = 115;

export type SaillieEditPatch = Partial<{
  'ID TRUIE': string;
  VERRAT: string;
  'DATE SAILLIE': string;
  'DATE MB PREVUE': string;
  STATUT: string;
  NOTES: string;
}> &
  Record<string, string | number | boolean | null>;

export interface SaillieEditValidation {
  ok: boolean;
  patch?: SaillieEditPatch;
  errors: {
    truieId?: string;
    verratId?: string;
    dateSaillie?: string;
    dateMBPrevue?: string;
    statut?: string;
    notes?: string;
  };
}

/** Initial : sérialisé en ISO yyyy-MM-dd pour compat <input type="date"/>. */
export interface SaillieEditInitial {
  truieId: string;
  verratId: string;
  /** ISO yyyy-MM-dd (pour <input type="date">). */
  dateSaillie: string;
  /** ISO yyyy-MM-dd. */
  dateMBPrevue: string;
  statut: string;
  notes: string;
}

export interface SaillieEditForm {
  truieId: string;
  verratId: string;
  dateSaillie: string;
  dateMBPrevue: string;
  statut: string;
  notes: string;
}

// ── Options statut (UI display values, envoyés tels quels au backend) ──────
export const STATUT_OPTIONS = [
  'Active',
  'Confirmée',
  'Non confirmée',
  'Avortement',
  'Archivée',
] as const;

export type SaillieStatutOption = typeof STATUT_OPTIONS[number];

// ── Helpers date ──────────────────────────────────────────────────────────

/** Teste qu'une chaîne est au format ISO yyyy-MM-dd strict. */
function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Convertit ISO yyyy-MM-dd → Date local 0h, null si invalide. */
function parseIsoDate(s: string): Date | null {
  if (!isIsoDate(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/** ISO yyyy-MM-dd → dd/MM/yyyy (format Sheets FR). Si invalide, retourne ''. */
export function isoToFr(s: string): string {
  const d = parseIsoDate(s);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** dd/MM/yyyy → yyyy-MM-dd (pour <input type="date">). '' si invalide. */
export function frToIso(s: string): string {
  if (!s) return '';
  const trimmed = s.trim();
  if (!trimmed) return '';
  // Already ISO ?
  if (isIsoDate(trimmed)) return trimmed;
  // ISO full with time
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * Ajoute N jours à une date ISO. Retourne ISO yyyy-MM-dd ou '' si invalide.
 * Utilisé pour l'auto-calcul dateSaillie → dateMBPrevue (+115j).
 *
 * Implémentation via `setDate()` pour garantir un pas d'1 jour civil local
 * (robuste aux DST — évite les décalages possibles avec une addition de ms).
 */
export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  if (!d) return '';
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  target.setDate(target.getDate() + days);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ── Validateur principal ──────────────────────────────────────────────────

/**
 * Valide les champs du form + compare aux valeurs initiales pour produire un
 * patch diff-only. Les dates sont re-formatées en dd/MM/yyyy pour le patch.
 */
export function validateSaillieEdit(
  form: SaillieEditForm,
  initial: SaillieEditInitial,
): SaillieEditValidation {
  const errors: SaillieEditValidation['errors'] = {};

  // ── Truie (obligatoire) ───────────────────────────────────────────────
  const truieId = (form.truieId ?? '').trim();
  if (truieId.length === 0) errors.truieId = 'Truie obligatoire';

  // ── Verrat (obligatoire) ──────────────────────────────────────────────
  const verratId = (form.verratId ?? '').trim();
  if (verratId.length === 0) errors.verratId = 'Verrat obligatoire';

  // ── Date saillie (obligatoire, ISO valide, pas > +365j futur) ─────────
  const dateSaillieIso = (form.dateSaillie ?? '').trim();
  const dateSaillieObj = parseIsoDate(dateSaillieIso);
  if (!dateSaillieObj) {
    errors.dateSaillie = 'Date saillie invalide';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxFuture = new Date(today.getTime() + 365 * 86_400_000);
    if (dateSaillieObj.getTime() > maxFuture.getTime()) {
      errors.dateSaillie = 'Date saillie trop dans le futur';
    }
  }

  // ── Date MB prévue (optionnelle, mais si fournie doit être valide) ────
  const dateMBIso = (form.dateMBPrevue ?? '').trim();
  if (dateMBIso && !parseIsoDate(dateMBIso)) {
    errors.dateMBPrevue = 'Date MB prévue invalide';
  }

  // ── Statut (optionnel, mais si fourni doit être dans la liste) ────────
  const statut = (form.statut ?? '').trim();
  if (
    statut.length > 0 &&
    !(STATUT_OPTIONS as readonly string[]).includes(statut)
  ) {
    errors.statut = 'Statut invalide';
  }

  // ── Notes ────────────────────────────────────────────────────────────
  const notes = (form.notes ?? '').trim();
  if (notes.length > 200) errors.notes = 'Notes trop longues (max 200)';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // ── Diff patch (uniquement les champs modifiés) ──────────────────────
  const patch: SaillieEditPatch = {};

  const initialTruieId = (initial.truieId ?? '').trim();
  const initialVerratId = (initial.verratId ?? '').trim();
  const initialDateSaillie = (initial.dateSaillie ?? '').trim();
  const initialDateMB = (initial.dateMBPrevue ?? '').trim();
  const initialStatut = (initial.statut ?? '').trim();
  const initialNotes = (initial.notes ?? '').trim();

  if (truieId !== initialTruieId) patch['ID TRUIE'] = truieId;
  if (verratId !== initialVerratId) patch.VERRAT = verratId;
  if (dateSaillieIso !== initialDateSaillie) {
    patch['DATE SAILLIE'] = isoToFr(dateSaillieIso);
  }
  if (dateMBIso !== initialDateMB) {
    patch['DATE MB PREVUE'] = dateMBIso ? isoToFr(dateMBIso) : '';
  }
  if (statut !== initialStatut) patch.STATUT = statut;
  if (notes !== initialNotes) patch.NOTES = notes;

  return { ok: true, errors: {}, patch };
}
