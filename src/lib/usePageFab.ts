/**
 * usePageFab — V31-FIX-PACK-01
 * ════════════════════════════════════════════════════════════════════════════
 * Hook qui détermine si le FAB "Saisir" doit être présent sur la route active.
 *
 * Politique :
 *   - VISIBLE   : pages où la saisie d'évènement est l'action principale
 *                 (élevage, reproduction, stocks).
 *   - INVISIBLE : hubs synthèse (today, more), parcours guidés (audit,
 *                 onboarding, checklist), admin.
 *
 * Le FAB rond contextuel n'apparaît donc plus partout — il a une intention
 * forte (=ce que je viens faire ici, c'est ajouter une donnée).
 */

import { useLocation } from 'react-router-dom';

const FAB_ENABLED_PATHS: ReadonlyArray<RegExp> = [
  /^\/troupeau($|\/)/,        // Hub élevage + sous-pages
  /^\/reproduction($|\/)/,    // Reproduction
  /^\/cycles($|\/)/,          // Cycles (sevrage, maternité…)
  /^\/ressources\/pharmacie/, // Stock véto
  /^\/ressources\/aliments/,  // Stock aliments
];

const FAB_DISABLED_PATHS: ReadonlyArray<RegExp> = [
  /^\/admin/,
  /^\/onboarding/,
  /^\/checklist\//,
  /^\/today$/,
  /^\/more$/,
  /^\/audit$/,
  /^\/aide$/,
  /^\/design-system$/,
];

/**
 * Renvoie `true` si le FAB "Saisir" doit être rendu sur le path donné.
 * Les disabled prennent toujours le pas sur les enabled (whitelist + blacklist).
 */
export function isPageFabEnabled(pathname: string): boolean {
  if (FAB_DISABLED_PATHS.some(rx => rx.test(pathname))) return false;
  return FAB_ENABLED_PATHS.some(rx => rx.test(pathname));
}

export function usePageFab(): boolean {
  const { pathname } = useLocation();
  return isPageFabEnabled(pathname);
}
