/**
 * _formHelpers — helpers partagés par tous les Quick*Form (FORM_CONTRACT Phase 1).
 * ════════════════════════════════════════════════════════════════════════════
 * Module canonique pour les utilitaires date des formulaires terrain. Remplace
 * les 3 variantes historiques (`todayIso` / `todayISO` / `todayIsoLocal`).
 *
 * Convention : tout Quick*Form importe d'ici, jamais ne redéfinit ces fonctions
 * en local.
 */

/**
 * Date du jour au format ISO `YYYY-MM-DD`, en heure LOCALE (pas UTC).
 *
 * C'est la seule fonction "today" autorisée dans les forms. Elle remplace :
 *  - `todayISO()` (Saillie) — utilisait `toISOString().slice(0,10)` → bug UTC
 *    (un soir tardif en TZ négative renvoyait la veille).
 *  - `todayIsoLocal()` (MiseBas) — déjà correct, repris ici à l'identique.
 *  - `todayIso()` (autres forms) — variantes diverses.
 */
export function todayIso(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Heure courante au format `HH:MM` (24h), heure locale. */
export function nowHoursMinutes(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

/**
 * Date ISO `YYYY-MM-DD` décalée de `days` jours dans le passé (utilisé pour
 * borner les `min` des inputs date — ex. rétro-saisie 60 jours max).
 */
export function isoDaysAgo(days: number, d: Date = new Date()): string {
  const ref = new Date(d);
  ref.setDate(ref.getDate() - days);
  return todayIso(ref);
}

/**
 * Formate une date ISO `YYYY-MM-DD` en `DD/MM/YYYY` (affichage FR).
 * Renvoie `'—'` si l'entrée est vide/falsy.
 */
export function formatFr(iso: string): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
