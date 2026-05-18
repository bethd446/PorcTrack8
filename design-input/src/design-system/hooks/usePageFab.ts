import { useLocation } from 'react-router-dom';

/**
 * V40-C-R : Configuration FAB contextuel par route.
 * Retourne `null` => pas de FAB (DISABLED ou page non listée).
 * Retourne `true` => FAB générique "Saisir évènement" (rond +).
 * Retourne `{ action, label }` => FAB extended contextuel
 *   (ex: /reproduction => + MISE-BAS, /pilotage/classement => null pour lecture seule).
 *
 * App.tsx > SaisirFABMount lit la valeur :
 *   - null/false => ne rend rien
 *   - true => rend SaisirFAB générique
 *   - { action, label } => TODO V40+ : rendre un Fab DS V2 extended avec label
 *     et action (en attendant, désactive le SaisirFAB générique pour éviter le
 *     "double FAB" reporté en V40 R3).
 */
export type PageFabConfig =
  | null
  | true
  | { action: string; label: string };

const FAB_GENERIC_PATHS: ReadonlyArray<RegExp> = [
  /^\/today$/,
  /^\/troupeau\/truies\//,
  /^\/troupeau\/verrats\//,
  /^\/troupeau\/bandes\//,
  /^\/troupeau\/loges\//,
  /^\/elevage($|\/)/,
  /^\/reproduction($|\/)/,
  /^\/repro($|\/)/,
  /^\/cycles($|\/)/,
  /^\/outils\/sante($|\/)/,
  /^\/outils\/stocks($|\/)/,
];

const FAB_DISABLED_PATHS: ReadonlyArray<RegExp> = [
  /^\/troupeau\/?$/,
  /^\/admin/,
  /^\/onboarding/,
  /^\/checklist\//,
  /^\/more$/,
  /^\/plus$/,
  /^\/audit$/,
  /^\/outils$/,
  /^\/outils\/audit$/,
  /^\/perf$/,
  /^\/aide$/,
  /^\/design-system$/,
  /^\/troupeau\/classement$/,
  /^\/pilotage\/classement$/,
];

const FAB_CONTEXTUAL: ReadonlyArray<{ pattern: RegExp; config: { action: string; label: string } }> = [
  { pattern: /^\/reproduction\/?$/, config: { action: 'add_saillie', label: 'SAILLIE' } },
];

export function getPageFabConfig(pathname: string): PageFabConfig {
  if (FAB_DISABLED_PATHS.some(rx => rx.test(pathname))) return null;
  for (const { pattern, config } of FAB_CONTEXTUAL) {
    if (pattern.test(pathname)) return config;
  }
  return FAB_GENERIC_PATHS.some(rx => rx.test(pathname)) ? true : null;
}

export function isPageFabEnabled(pathname: string): boolean {
  return getPageFabConfig(pathname) !== null;
}

export function usePageFab(): boolean {
  const { pathname } = useLocation();
  const cfg = getPageFabConfig(pathname);
  // V40 R3 : pour les routes contextuelles (reproduction MISE-BAS,
  // classement null), on retourne false côté boolean pour désactiver
  // le SaisirFAB générique. Le FAB contextuel sera rendu par la page elle-même
  // (à venir, voir migration progressive).
  return cfg === true;
}

export function usePageFabConfig(): PageFabConfig {
  const { pathname } = useLocation();
  return getPageFabConfig(pathname);
}
