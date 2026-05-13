/**
 * dateParser.ts — Helpers centralisés de parsing de date métier.
 *
 * V81 Sprint 12 — Unification (cf AUDIT_V2_5AGENTS_2026-05-13.md Agent 1 #3).
 * Avant : 3 implémentations parallèles (`parseFrDate` dans alertEngine,
 * `parseDateFr` dans phaseEngine, `safeDate` dans truieHelpers). Risque
 * de divergence DST silencieuse + dette de maintenance.
 * Après : 1 source de vérité ici. Les services historiques peuvent
 * importer `parseFrDate` (timezone-aware) ou `parseDateLocal` (naïf, plus
 * rapide quand le fuseau n'a pas d'importance).
 *
 * Formats acceptés :
 *  - `DD/MM/YYYY` (format Sheets / saisie utilisateur fr-FR)
 *  - `YYYY-MM-DD` (format ISO court / DB Postgres)
 *  - serial Excel (number > 20000, ex: 45000 = 23/02/2023)
 */

import { fromZonedTime } from 'date-fns-tz';

/**
 * Fuseau métier de référence. La plateforme PorcTrack a été conçue avec
 * `Europe/Paris` comme fuseau pivot — les dates utilisateur (DD/MM/YYYY)
 * sont interprétées comme minuit dans ce fuseau, peu importe le device.
 * Cf. décision V25 (cohérence reporting cross-device).
 */
export const FARM_TIMEZONE = 'Europe/Paris';

/**
 * Parse une date utilisateur (Sheets / form) en `Date` côté UTC qui
 * correspond à minuit dans `FARM_TIMEZONE`. Évite les bugs DST où
 * `new Date('2026-03-30')` aurait pu changer de jour selon le fuseau
 * local du device.
 *
 * @returns Date | null (null si chaîne vide, '—', ou format inconnu)
 */
export function parseFrDate(dateStr?: string | null): Date | null {
  if (!dateStr || dateStr === '—' || dateStr === '') return null;

  const toFarmMidnight = (y: number, m: number, d: number): Date => {
    const iso = `${y.toString().padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`;
    return fromZonedTime(iso, FARM_TIMEZONE);
  };

  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return toFarmMidnight(+dmy[3], +dmy[2], +dmy[1]);

  const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return toFarmMidnight(+ymd[1], +ymd[2], +ymd[3]);

  const serial = Number(dateStr);
  if (!isNaN(serial) && serial > 20000) {
    const utcProxy = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return toFarmMidnight(
      utcProxy.getUTCFullYear(),
      utcProxy.getUTCMonth() + 1,
      utcProxy.getUTCDate(),
    );
  }
  return null;
}

/**
 * Variant naïve sans gestion de timezone — utile pour les composants
 * non-critiques côté affichage (ex: fil d'ariane, label rapide). Évite
 * le coût de `fromZonedTime`. NE PAS utiliser dans les calculs métier
 * (alertes, phases, KPIs) — préférer `parseFrDate`.
 */
export function parseDateLocal(s: string | undefined | null): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(+fr[3], +fr[2] - 1, +fr[1]);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return null;
}
