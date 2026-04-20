/**
 * Statut Truie — module canonique (single source of truth).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Les statuts truies en feuille Google Sheet varient librement :
 *   "Pleine", "PLEINE", "pleine", "En attente saillie", "Maternité",
 *   "Maternite", "À surveiller", "Surveillance", "Réforme", "Reforme",
 *   "Allaitante", "Chaleur", "Flushing", …
 *
 * Ce module normalise toutes ces variantes vers un set fermé de canoniques
 * (`TruieStatutCanonique`) et expose des prédicats métier (`isActive`,
 * `isReproCycle`). Tout code qui branche sur un statut truie DOIT passer par
 * `normaliseStatut()` au lieu d'écrire une regex locale.
 *
 * Ne PAS brancher sur l'affichage : ce module ne gère pas le libellé/ton
 * visuel (chip), seulement la sémantique métier. Les composants gardent
 * leur propre mapping statutCanonique → { label, tone } pour rester libres
 * sur l'UX.
 */

export type TruieStatutCanonique =
  | 'PLEINE'        // Gestation confirmée (synonymes : gestante, pleine)
  | 'MATERNITE'     // Allaitante / en maternité / lactation
  | 'VIDE'          // En attente de saillie, post-sevrage, vide
  | 'CHALEUR'       // Retour en chaleur détecté
  | 'SURVEILLANCE'  // Problème sanitaire à suivre (à surveiller)
  | 'REFORME'       // À sortir / réformée / morte
  | 'FLUSHING'      // Alimentation pré-saillie
  | 'INCONNU';      // Non reconnu / vide / absent

/**
 * Normalise un statut truie brut (texte libre de la Sheet) en canonique.
 *
 * Ordre de matching (important : FLUSHING avant SURVEILLANCE, car "flushing"
 * pourrait match /surveill|flushing/ si on l'avait laissé en fallback) :
 *   1. PLEINE       — "Pleine", "Gestation", "Gestante"
 *   2. MATERNITE    — "Maternité", "Allaitante", "Lactation"
 *   3. CHALEUR      — "Chaleur", "Retour chaleur"
 *   4. FLUSHING     — "Flushing", "Flush"
 *   5. SURVEILLANCE — "Surveillance", "À surveiller"
 *   6. REFORME      — "Réforme", "Reforme", "Morte", "Sortie"
 *   7. VIDE         — "Vide", "En attente saillie", "Attente"
 *   8. INCONNU      — fallback
 */
export function normaliseStatut(raw: string | undefined | null): TruieStatutCanonique {
  if (!raw) return 'INCONNU';
  const s = String(raw).toLowerCase().trim();
  if (!s) return 'INCONNU';

  // PLEINE : "pleine", "gestation", "gestante"
  if (/pleine|gest/i.test(s)) return 'PLEINE';

  // MATERNITE : "maternité", "maternite", "allait*", "lactat*"
  if (/maternit|allait|lactat/i.test(s)) return 'MATERNITE';

  // CHALEUR : "chaleur", "retour chaleur", "retour"
  if (/chaleur|retour/i.test(s)) return 'CHALEUR';

  // FLUSHING : "flushing", "flush" (avant SURVEILLANCE pour priorité)
  if (/flushing|flush/i.test(s)) return 'FLUSHING';

  // SURVEILLANCE : "surveillance", "à surveiller"
  if (/surveill/i.test(s)) return 'SURVEILLANCE';

  // REFORME : "réforme", "reforme", "morte", "sortie"
  if (/réform|reforme|morte|sortie/i.test(s)) return 'REFORME';

  // VIDE : "vide", "en attente", "attente saillie"
  if (/vide|attente/i.test(s)) return 'VIDE';

  return 'INCONNU';
}

/**
 * Vrai si la truie est considérée "active" dans le troupeau (tout sauf
 * réformée ou inconnue). Utile pour les KPI de comptage animal actif.
 */
export function isActive(s: TruieStatutCanonique): boolean {
  return s !== 'REFORME' && s !== 'INCONNU';
}

/**
 * Vrai si la truie est dans une phase du cycle reproductif (PLEINE,
 * MATERNITE, VIDE, CHALEUR). SURVEILLANCE / FLUSHING / REFORME / INCONNU
 * sont hors cycle.
 */
export function isReproCycle(s: TruieStatutCanonique): boolean {
  return s === 'PLEINE' || s === 'MATERNITE' || s === 'VIDE' || s === 'CHALEUR';
}
