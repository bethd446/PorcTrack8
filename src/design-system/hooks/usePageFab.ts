import { useLocation } from 'react-router-dom';

const FAB_ENABLED_PATHS: ReadonlyArray<RegExp> = [
  /^\/troupeau($|\/)/,
  /^\/elevage($|\/)/,
  /^\/reproduction($|\/)/,
  /^\/repro($|\/)/,
  /^\/cycles($|\/)/,
  /^\/ressources\/pharmacie/,
  /^\/ressources\/aliments/,
  /^\/outils\/sante($|\/)/,
  /^\/outils\/stocks($|\/)/,
];

const FAB_DISABLED_PATHS: ReadonlyArray<RegExp> = [
  /^\/admin/,
  /^\/onboarding/,
  /^\/checklist\//,
  /^\/today$/,
  /^\/more$/,
  /^\/plus$/,
  /^\/audit$/,
  /^\/outils$/,
  /^\/outils\/audit$/,
  /^\/perf$/,
  /^\/aide$/,
  /^\/design-system$/,
];

export function isPageFabEnabled(pathname: string): boolean {
  if (FAB_DISABLED_PATHS.some(rx => rx.test(pathname))) return false;
  return FAB_ENABLED_PATHS.some(rx => rx.test(pathname));
}

export function usePageFab(): boolean {
  const { pathname } = useLocation();
  return isPageFabEnabled(pathname);
}
