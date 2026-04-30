/**
 * PorcTrack — Theme Auto (LIGHT-FIRST · refonte 2026-04-30)
 * ══════════════════════════════════════════════════════════════════════════
 * L'app Terrain Vivant v6 n'expose plus de surface dark. Toutes les API ci-
 * dessous sont conservées pour la compatibilité (ThemeContext, Réglages >
 * Apparence) mais elles forcent systématiquement le mode jour.
 *
 * Conséquences :
 *   - applyTheme(_) → toujours theme-day.
 *   - applyThemeVariant(_) → no-op (palette unique v6).
 *   - resolveTheme(_) → toujours 'day'.
 *   - msUntilNextSwitch() → renvoie une valeur arbitraire ; le scheduler
 *     dans ThemeContext est inerte.
 */

export type ThemeMode = 'auto' | 'day' | 'night';
export type ResolvedTheme = 'day' | 'night';
export type ThemeVariant = 'emerald' | 'terracotta';

export function resolveTheme(_mode: ThemeMode, _now: Date = new Date()): ResolvedTheme {
  return 'day';
}

export function applyTheme(_theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.add('theme-day');
  html.classList.remove('theme-night');
  html.style.colorScheme = 'light';
}

export function applyThemeVariant(_variant: ThemeVariant): void {
  // No-op : palette unique Terrain Vivant v6, plus de variante terracotta.
}

export function msUntilNextSwitch(_now: Date = new Date()): number {
  // Plus de bascule : valeur grande pour neutraliser le setTimeout.
  return 24 * 60 * 60 * 1000;
}
