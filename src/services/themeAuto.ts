/**
 * PorcTrack — Theme Auto (Jour/Nuit)
 * ══════════════════════════════════════════════════════════════════════════
 * Helpers purs pour résoudre le thème effectif et l'appliquer sur <html>.
 * Aucun état interne — la logique de persistance/scheduling vit dans
 * ThemeContext.tsx.
 */

export type ThemeMode = 'auto' | 'day' | 'night';
export type ResolvedTheme = 'day' | 'night';

/**
 * Variante de palette (orthogonale au mode jour/nuit).
 * - 'emerald'    : palette par défaut historique (vert émeraude).
 * - 'terracotta' : variante chaude (clay/mediterranean), activée via la
 *                  classe `.theme-terracotta` sur <html>.
 */
export type ThemeVariant = 'emerald' | 'terracotta';

/** Heure (incluse) à partir de laquelle le mode auto bascule en JOUR. */
const DAY_START_HOUR = 6;
/** Heure (exclue) à partir de laquelle le mode auto bascule en NUIT. */
const DAY_END_HOUR = 19;

/**
 * Résout le thème effectif à partir du mode utilisateur et de l'heure courante.
 * - 'day' / 'night' : forcés.
 * - 'auto' : basé sur l'heure locale (6h–19h = jour, sinon nuit).
 */
export function resolveTheme(mode: ThemeMode, now: Date = new Date()): ResolvedTheme {
  if (mode === 'day') return 'day';
  if (mode === 'night') return 'night';
  const hour = now.getHours();
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'day' : 'night';
}

/**
 * Applique le thème sur <html> en manipulant les classes `.theme-day`
 * et `.theme-night` (cette dernière est cosmétique — par défaut sans classe
 * correspond déjà au mode nuit via :root).
 */
export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.toggle('theme-day', theme === 'day');
  html.classList.toggle('theme-night', theme === 'night');
}

/**
 * Applique la variante de palette sur <html> via la classe
 * `.theme-terracotta`. L'émeraude est le défaut : aucune classe posée =
 * émeraude (theme-tokens.css). Opération live, sans reload.
 */
export function applyThemeVariant(variant: ThemeVariant): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.toggle('theme-terracotta', variant === 'terracotta');
}

/**
 * Retourne le nombre de millisecondes jusqu'au prochain basculement
 * jour ↔ nuit en mode auto. Utilisé pour programmer un `setTimeout` qui
 * re-évalue le thème pile au changement d'heure.
 *
 * - Si on est en jour     → renvoie ms jusqu'à DAY_END_HOUR (aujourd'hui)
 * - Si on est en nuit     → renvoie ms jusqu'à DAY_START_HOUR (demain si soir)
 */
export function msUntilNextSwitch(now: Date = new Date()): number {
  const target = new Date(now);
  const hour = now.getHours();
  if (hour >= DAY_START_HOUR && hour < DAY_END_HOUR) {
    // Jour : prochaine transition à DAY_END_HOUR aujourd'hui
    target.setHours(DAY_END_HOUR, 0, 0, 0);
  } else {
    // Nuit : prochaine transition à DAY_START_HOUR (demain si on est le soir)
    if (hour >= DAY_END_HOUR) target.setDate(target.getDate() + 1);
    target.setHours(DAY_START_HOUR, 0, 0, 0);
  }
  return target.getTime() - now.getTime();
}
