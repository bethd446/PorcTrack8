/**
 * PorcTrack — Theme Auto (LIGHT-FIRST · refonte 2026-04-30)
 * ══════════════════════════════════════════════════════════════════════════
 * L'app Terrain Vivant v6 n'expose plus de surface dark. Toutes les API ci-
 * dessous sont conservées pour la compatibilité (ThemeContext, Réglages >
 * Apparence) mais elles forcent systématiquement le mode jour.
 */

export type ThemeMode = 'auto' | 'day' | 'night';
export type ResolvedTheme = 'day' | 'night';

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

export function msUntilNextSwitch(_now: Date = new Date()): number {
  return 24 * 60 * 60 * 1000;
}
