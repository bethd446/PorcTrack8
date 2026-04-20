/**
 * Helpers Truies — identification des truies archivées (réformées).
 *
 * Contexte :
 * -----------
 * La numérotation des truies de la ferme K13 n'est PAS séquentielle. Certaines
 * anciennes truies ont été réformées et leurs IDs ne sont plus utilisés, mais
 * elles restent référencées dans l'historique (feuille `SUIVI_REPRODUCTION_ACTUEL`
 * et dérivées). Ce n'est pas un bug : c'est de l'historique repro normal.
 *
 * Liste canonique actuelle (2026-04) — 17 truies actives :
 *   T01, T02, T03, T04, T05, T06, T07, T09, T10, T11, T12, T13, T14, T15, T16, T18, T19
 *
 * IDs réformés (absents de `SUIVI_TRUIES_REPRODUCTION`) :
 *   T08, T17
 *
 * Source de vérité : `scripts/data-broker/ground-truth-2026-04-20.md`.
 *
 * Usage :
 * -------
 *   import { isArchivedTruie } from '@/lib/truieHelpers';
 *
 *   if (!isArchivedTruie(truieId)) {
 *     // warn uniquement pour les truies actives
 *   }
 *
 * Pour archiver une nouvelle truie réformée dans le futur, ajouter son ID à
 * `ARCHIVED_TRUIE_IDS` ci-dessous (et mettre à jour la ground truth).
 */

/** IDs de truies réformées, absents de `SUIVI_TRUIES_REPRODUCTION` mais encore
 *  référencés dans l'historique repro. À maintenir à la main lors des réformes. */
export const ARCHIVED_TRUIE_IDS: readonly string[] = ['T08', 'T17'];

/** Liste canonique des 17 truies actives (avril 2026). Informative — la
 *  source live reste le snapshot data-broker. */
export const ACTIVE_TRUIE_IDS: readonly string[] = [
  'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07',
  'T09', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16',
  'T18', 'T19',
];

/**
 * Normalise un ID truie brut en format canonique `T##` (UPPERCASE + zéro-pad).
 *   'T7'  → 'T07'
 *   't08' → 'T08'
 *   ''    → ''
 */
export function normalizeTruieId(id: string): string {
  if (!id) return '';
  const s = String(id).trim().toUpperCase();
  const m = s.match(/^T(\d+)$/);
  if (!m) return s;
  return `T${m[1].padStart(2, '0')}`;
}

/**
 * Retourne `true` si l'ID correspond à une truie réformée/archivée.
 * Retourne `false` pour les IDs vides, actifs, ou inconnus (on ne filtre que
 * les archivées explicitement listées).
 */
export function isArchivedTruie(id: string): boolean {
  if (!id) return false;
  const normalized = normalizeTruieId(id);
  return ARCHIVED_TRUIE_IDS.includes(normalized);
}
