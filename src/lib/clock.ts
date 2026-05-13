/**
 * clock.ts — Horloge centralisée mockable.
 *
 * V81 Sprint 3 — En prod retourne `new Date()`. En dev/QA peut être pilotée
 * par `localStorage['porctrack:mockDate']` (ISO `yyyy-MM-dd` ou
 * `yyyy-MM-ddTHH:mm:ss`) ou par la variable d'env `VITE_MOCK_DATE`.
 *
 * Bénéfice : permet à un testeur (éleveur ou QA) de simuler une date future
 * sans recompiler. Exemple terrain :
 *
 *   localStorage.setItem('porctrack:mockDate', '2026-08-15');
 *   location.reload();
 *
 * → toutes les alertes biologiques se recalculent comme si on était le
 *   15 août 2026 (mises-bas attendues, sevrages dûs, retours chaleur, etc.).
 *
 * Garde-fous :
 * - En prod (`MODE === 'production'`), le mock est ignoré SAUF si la flag
 *   `VITE_ALLOW_MOCK_DATE=1` est buildée dans le bundle (off par défaut).
 * - Si la valeur stockée est invalide ou hors plage raisonnable
 *   (avant 2020 / après 2050), on retombe sur `new Date()`.
 *
 * Compatible avec `vi.useFakeTimers + vi.setSystemTime` côté tests Vitest :
 * la fonction délègue à `new Date()` quand aucun mock n'est défini.
 */

const STORAGE_KEY = 'porctrack:mockDate';

function safeReadLocalStorage(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function isReasonableDate(d: Date): boolean {
  if (Number.isNaN(d.getTime())) return false;
  const year = d.getUTCFullYear();
  return year >= 2020 && year <= 2050;
}

function isMockAllowed(): boolean {
  if (typeof import.meta === 'undefined' || !import.meta.env) return true;
  if (import.meta.env.MODE !== 'production') return true;
  return import.meta.env.VITE_ALLOW_MOCK_DATE === '1' ||
         import.meta.env.VITE_ALLOW_MOCK_DATE === 'true';
}

/**
 * Retourne la "date actuelle" utilisée par le moteur d'alertes et tout
 * service temps-dépendant. Retourne toujours un nouveau Date — ne JAMAIS
 * muter le résultat.
 */
export function getNow(): Date {
  if (!isMockAllowed()) return new Date();
  const ls = safeReadLocalStorage();
  const env =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_MOCK_DATE as string | undefined)
      : undefined;
  const raw = ls ?? env ?? null;
  if (!raw) return new Date();
  const d = new Date(raw);
  return isReasonableDate(d) ? d : new Date();
}

/**
 * Définit (ou efface si `null`) une date simulée persistée dans
 * `localStorage`. Active seulement en dev par défaut, voir `isMockAllowed`.
 *
 * @param iso `yyyy-MM-dd` ou ISO complet. `null` ou `''` pour effacer.
 */
export function setMockDate(iso: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!iso) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    // localStorage indisponible (mode privé) — silencieux
  }
}

/**
 * Retourne la date mockée actuelle si elle est définie, sinon `null`.
 * Utile pour afficher un badge "Date simulée : ..." dans les Dev panels.
 */
export function getMockDate(): Date | null {
  if (!isMockAllowed()) return null;
  const ls = safeReadLocalStorage();
  if (!ls) return null;
  const d = new Date(ls);
  return isReasonableDate(d) ? d : null;
}

export const __MOCK_DATE_STORAGE_KEY = STORAGE_KEY;
