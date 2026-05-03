/**
 * reproductionDashboard — V22-B3
 * ══════════════════════════════════════════════════════════════════════════
 * Pure function de calcul des 5 étapes du cycle truie pour le hub
 * `/reproduction`. Source unique de vérité — testable sans DOM.
 *
 * Étapes :
 *   1. À saillir          — truies VIDE / CHALEUR (avec contexte temporel)
 *   2. Écho J28 en attente — saillies ≥ 21j sans portée enregistrée et truie
 *      non encore confirmée PLEINE/MATERNITE/REFORME
 *   3. Mise-bas imminente — truies PLEINES J-3 à J+5 de `dateMBPrevue`
 *   4. En maternité       — truies MATERNITE avec bande sous-mère J+0 à J+28
 *   5. À sevrer           — bandes sous-mère dont le sevrage est dépassé
 *      (≥ jour prévu, retard inclus)
 *
 * Contrat :
 *   - input : tableaux Truie / Saillie / BandePorcelets + référence `today`
 *   - output : 5 listes avec contexte (jours, raison, lookup truie)
 *   - aucun side-effect, aucun accès DB, aucun async
 */

import { safeDate } from '../lib/truieHelpers';
import { normaliseStatut } from '../lib/truieStatut';
import { computeBandePhase } from './bandesAggregator';
import type { Truie, Saillie, BandePorcelets } from '../types/farm';

const MS_DAY = 86_400_000;

const ECHO_MIN_J = 21;
const MB_IMMINENTE_AVANT_J = 3;
const MB_IMMINENTE_APRES_J = 5;
const MATERNITE_FIN_J = 28;
const SEVRAGE_RETARD_MAX_J = 60;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AsaillirItem {
  truie: Truie;
  daysSinceLastAction: number;
  reason: string;
}

export interface EchoEnAttenteItem {
  saillie: Saillie;
  truie: Truie;
  daysSinceSaillie: number;
}

export interface MBImminenteItem {
  truie: Truie;
  daysToMB: number;
}

export interface EnMaterniteItem {
  truie: Truie;
  bande: BandePorcelets;
  daysSinceMB: number;
}

export interface ASevrerItem {
  bande: BandePorcelets;
  truie: Truie | null;
  daysSinceMB: number;
  daysOverdue: number;
}

export interface ReproductionDashboard {
  asaillir: AsaillirItem[];
  echo: EchoEnAttenteItem[];
  mbImminente: MBImminenteItem[];
  enMaternite: EnMaterniteItem[];
  asevrer: ASevrerItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysBetween(a: Date, today: Date): number {
  return Math.floor((startOfDay(today) - startOfDay(a)) / MS_DAY);
}

function findTruieFor(saillie: Saillie, truies: Truie[]): Truie | null {
  return (
    truies.find(
      t =>
        t.id === saillie.truieId
        || t.displayId === saillie.truieId
        || (!!saillie.truieBoucle && t.boucle === saillie.truieBoucle),
    ) ?? null
  );
}

function findTruieForBande(bande: BandePorcelets, truies: Truie[]): Truie | null {
  if (!bande.truie && !bande.boucleMere) return null;
  return (
    truies.find(t => {
      if (bande.truie && (t.id === bande.truie || t.displayId === bande.truie)) {
        return true;
      }
      if (bande.boucleMere && t.boucle === bande.boucleMere) return true;
      return false;
    }) ?? null
  );
}

/**
 * Trouve la bande Sous-mère active liée à une truie donnée.
 *
 * Joint truie ↔ bande via 3 stratégies, dans l'ordre :
 *   1. UUID match : `bande.truie === truie.id` (cas legacy supabase où
 *      `sow_id` aurait pu être projeté dans `bande.truie`).
 *   2. Code match : `bande.truie === truie.displayId` (ex: T07) — c'est
 *      le mapping principal vu en prod (sows.code_id).
 *   3. Boucle match : `bande.boucleMere === truie.boucle` (fallback legacy).
 *
 * Retourne la bande Sous-mère la plus récente (dateMB max) parmi les
 * candidates, ou `null` si aucune. Limite à `maxAgeDays` pour éviter de
 * lier une vieille portée déjà sevrée à une truie en nouveau cycle.
 */
export function findBandeForTruie(
  truie: Truie,
  bandes: BandePorcelets[],
  maxAgeDays = MATERNITE_FIN_J,
  today: Date = new Date(),
): BandePorcelets | null {
  if (!truie) return null;
  let best: BandePorcelets | null = null;
  let bestTs = 0;
  for (const b of bandes) {
    const matchUuid = !!truie.id && !!b.truie && b.truie === truie.id;
    const matchCode = !!truie.displayId && !!b.truie && b.truie === truie.displayId;
    const matchBoucle = !!truie.boucle && !!b.boucleMere && b.boucleMere === truie.boucle;
    if (!matchUuid && !matchCode && !matchBoucle) continue;
    if (!/sous.m/i.test(b.statut ?? '')) continue;
    const dMB = safeDate(b.dateMB);
    if (!dMB) continue;
    const days = daysBetween(dMB, today);
    if (days < 0 || days > maxAgeDays) continue;
    if (dMB.getTime() > bestTs) {
      bestTs = dMB.getTime();
      best = b;
    }
  }
  return best;
}

function isStillPotentiallyPending(truie: Truie | null): boolean {
  if (!truie) return true;
  const c = normaliseStatut(truie.statut);
  // Si la truie est confirmée pleine ou en maternité, l'écho a effectivement
  // été tranché côté biologique (qu'il ait été saisi en BDD ou non).
  // On affiche tout de même les statuts VIDE / CHALEUR / SURVEILLANCE /
  // INCONNU / FLUSHING : ils signalent une saillie dont l'issue n'a pas
  // été tranchée formellement.
  return c === 'VIDE' || c === 'CHALEUR' || c === 'SURVEILLANCE' || c === 'FLUSHING' || c === 'INCONNU';
}

// ─── Étape 1 — À saillir ─────────────────────────────────────────────────────

/**
 * Truies en attente de saillie : statut VIDE ou CHALEUR (hors MORTE/REFORME).
 * Tri par `daysSinceLastAction` décroissant : les plus en retard d'abord.
 */
function buildAsaillir(
  truies: Truie[],
  saillies: Saillie[],
  bandes: BandePorcelets[],
  today: Date,
): AsaillirItem[] {
  const out: AsaillirItem[] = [];
  for (const truie of truies) {
    const c = normaliseStatut(truie.statut);
    if (c !== 'VIDE' && c !== 'CHALEUR') continue;

    // Référence temporelle : dernier sevrage ou dernière saillie connue,
    // sinon dateNaissance, sinon 0 (fallback).
    let lastTs = 0;
    let reason = 'En attente de saillie';

    if (c === 'CHALEUR') {
      reason = 'Chaleur détectée';
    }

    // Dernier sevrage parmi les portées de la truie
    for (const b of bandes) {
      if (
        b.truie === truie.id
        || b.truie === truie.displayId
        || (!!truie.boucle && b.boucleMere === truie.boucle)
      ) {
        const d = safeDate(b.dateSevrageReelle ?? null);
        if (d && d.getTime() > lastTs) {
          lastTs = d.getTime();
          if (c === 'VIDE') {
            reason = `Sevrée depuis ${daysBetween(d, today)}j`;
          }
        }
      }
    }

    // Dernière saillie connue (utile pour les VIDE non-sevrées)
    if (lastTs === 0) {
      for (const s of saillies) {
        if (
          s.truieId === truie.id
          || s.truieId === truie.displayId
          || (!!truie.boucle && s.truieBoucle === truie.boucle)
        ) {
          const d = safeDate(s.dateSaillie);
          if (d && d.getTime() > lastTs) {
            lastTs = d.getTime();
            if (c === 'VIDE') {
              reason = `Vide depuis ${daysBetween(d, today)}j`;
            }
          }
        }
      }
    }

    const daysSinceLastAction = lastTs > 0 ? daysBetween(new Date(lastTs), today) : 0;
    out.push({ truie, daysSinceLastAction, reason });
  }

  out.sort((a, b) => b.daysSinceLastAction - a.daysSinceLastAction);
  return out;
}

// ─── Étape 2 — Écho J28 en attente ───────────────────────────────────────────

/**
 * Saillies ≥ 21j sans MB enregistrée et dont la truie n'est pas encore
 * confirmée PLEINE/MATERNITE (heuristique tant que `statut_echo` n'est
 * pas exposé côté contexte).
 */
function buildEcho(
  truies: Truie[],
  saillies: Saillie[],
  bandes: BandePorcelets[],
  today: Date,
): EchoEnAttenteItem[] {
  const out: EchoEnAttenteItem[] = [];

  // Map truie → portée la plus récente avec MB datée.
  const lastMBByTruie = new Map<string, number>();
  for (const b of bandes) {
    const d = safeDate(b.dateMB);
    if (!d) continue;
    const keys: string[] = [];
    if (b.truie) keys.push(b.truie);
    if (b.boucleMere) keys.push(b.boucleMere);
    for (const k of keys) {
      const prev = lastMBByTruie.get(k) ?? 0;
      if (d.getTime() > prev) lastMBByTruie.set(k, d.getTime());
    }
  }

  for (const saillie of saillies) {
    const dSaillie = safeDate(saillie.dateSaillie);
    if (!dSaillie) continue;
    const days = daysBetween(dSaillie, today);
    if (days < ECHO_MIN_J) continue;

    const truie = findTruieFor(saillie, truies);
    if (truie) {
      const c = normaliseStatut(truie.statut);
      if (c === 'REFORME') continue;
      // Saillie déjà suivie d'une MB après la saillie → écho déjà clos.
      const mbKeys: string[] = [];
      if (truie.id) mbKeys.push(truie.id);
      if (truie.displayId) mbKeys.push(truie.displayId);
      if (truie.boucle) mbKeys.push(truie.boucle);
      let alreadyMB = false;
      for (const k of mbKeys) {
        const ts = lastMBByTruie.get(k);
        if (ts && ts >= dSaillie.getTime()) {
          alreadyMB = true;
          break;
        }
      }
      if (alreadyMB) continue;

      // Si la truie est explicitement PLEINE ou MATERNITE → écho effectif tranché.
      if (!isStillPotentiallyPending(truie)) continue;

      out.push({ saillie, truie, daysSinceSaillie: days });
    } else {
      // Truie inconnue : on garde le signal (échantillon explicite d'incohérence).
      out.push({
        saillie,
        truie: { id: saillie.truieId, displayId: saillie.truieId, boucle: '', statut: 'INCONNU', ration: 0, synced: true },
        daysSinceSaillie: days,
      });
    }
  }

  out.sort((a, b) => b.daysSinceSaillie - a.daysSinceSaillie);
  return out;
}

// ─── Étape 3 — Mise-bas imminente ────────────────────────────────────────────

/**
 * Truies pleines dont la `dateMBPrevue` tombe dans la fenêtre
 * J-3 → J+5 (avant : surveillance ; après : retard à saisir).
 */
function buildMBImminente(truies: Truie[], today: Date): MBImminenteItem[] {
  const out: MBImminenteItem[] = [];
  for (const truie of truies) {
    const c = normaliseStatut(truie.statut);
    if (c === 'REFORME') continue;
    const d = safeDate(truie.dateMBPrevue);
    if (!d) continue;
    const diff = Math.round((startOfDay(d) - startOfDay(today)) / MS_DAY);
    if (diff >= -MB_IMMINENTE_APRES_J && diff <= MB_IMMINENTE_AVANT_J) {
      out.push({ truie, daysToMB: diff });
    }
  }
  out.sort((a, b) => a.daysToMB - b.daysToMB);
  return out;
}

// ─── Étape 4 — En maternité ──────────────────────────────────────────────────

/**
 * Truies en maternité avec une bande sous-mère datée. Liste fournit
 * `daysSinceMB` (J+0 à J+MATERNITE_FIN_J).
 */
function buildEnMaternite(
  truies: Truie[],
  bandes: BandePorcelets[],
  today: Date,
): EnMaterniteItem[] {
  const out: EnMaterniteItem[] = [];
  for (const bande of bandes) {
    if (computeBandePhase(bande, today) !== 'SOUS_MERE') continue;
    const dMB = safeDate(bande.dateMB);
    if (!dMB) continue;
    const days = daysBetween(dMB, today);
    if (days < 0 || days > MATERNITE_FIN_J) continue;

    const truie = findTruieForBande(bande, truies);
    if (!truie) continue;
    const c = normaliseStatut(truie.statut);
    if (c === 'REFORME') continue;
    out.push({ truie, bande, daysSinceMB: days });
  }
  out.sort((a, b) => b.daysSinceMB - a.daysSinceMB);
  return out;
}

// ─── Étape 5 — À sevrer ──────────────────────────────────────────────────────

/**
 * Bandes sous-mère dont le sevrage est dépassé. Inclut le retard quand la
 * date prévue est passée (`daysOverdue > 0`). Filtre les retards aberrants
 * (> SEVRAGE_RETARD_MAX_J) pour éviter de poller des données sales.
 */
function buildASevrer(
  bandes: BandePorcelets[],
  truies: Truie[],
  today: Date,
): ASevrerItem[] {
  const out: ASevrerItem[] = [];
  for (const bande of bandes) {
    if (computeBandePhase(bande, today) !== 'SOUS_MERE') continue;
    const dMB = safeDate(bande.dateMB);
    if (!dMB) continue;
    const dPrevue = safeDate(bande.dateSevragePrevue) ?? new Date(dMB.getTime() + MATERNITE_FIN_J * MS_DAY);
    const daysSinceMB = daysBetween(dMB, today);
    const daysOverdue = daysBetween(dPrevue, today);
    // Ne garder que les bandes prêtes (date prévue atteinte ou dépassée).
    if (daysOverdue < 0) continue;
    if (daysOverdue > SEVRAGE_RETARD_MAX_J) continue;

    const truie = findTruieForBande(bande, truies);
    out.push({ bande, truie, daysSinceMB, daysOverdue });
  }
  out.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return out;
}

// ─── Façade publique ─────────────────────────────────────────────────────────

/**
 * Construit le dashboard reproduction pour `/reproduction`.
 *
 * V36-A — Exclusivité de phase (BUG-1) :
 *   Une truie en gestation/maternité confirmée ne doit JAMAIS être listée
 *   "À saillir" ou "Écho à faire" — sinon le porcher voit le même animal
 *   dans deux étapes incompatibles (cas T-001 vu en prod : "Sevrée 0j" +
 *   "MB J-2"). Règle :
 *
 *     EnMaternité (4) ∪ MBImminente (3)  →  consomment la truie
 *     Étapes 1 et 2 sont alors filtrées pour cette truie.
 *
 *   En revanche Écho (2) et À saillir (1) peuvent coexister légitimement :
 *   une truie Vide juste après saillie (J+5) est à la fois "en attente
 *   d'écho" et "candidate à re-saillir" si retour chaleur. C'est intentionnel.
 *
 *   `asevrer` n'est pas dédupliqué : il référence des bandes (pas des truies)
 *   et reste cohérent avec maternité.
 */
export function buildReproductionDashboard(
  truies: Truie[],
  saillies: Saillie[],
  bandes: BandePorcelets[],
  today: Date,
): ReproductionDashboard {
  const enMaternite = buildEnMaternite(truies, bandes, today);
  const mbImminente = buildMBImminente(truies, today);
  const echo = buildEcho(truies, saillies, bandes, today);
  const asaillir = buildAsaillir(truies, saillies, bandes, today);

  // Truies engagées dans une phase de gestation/maternité confirmée.
  // Elles ne peuvent pas être simultanément "à saillir" ou "écho à faire".
  const claimedByGestationOrMaternite = new Set<string>();
  for (const it of enMaternite) claimedByGestationOrMaternite.add(it.truie.id);
  for (const it of mbImminente) claimedByGestationOrMaternite.add(it.truie.id);

  const echoFiltered = echo.filter(it => !claimedByGestationOrMaternite.has(it.truie.id));
  const asaillirFiltered = asaillir.filter(it => !claimedByGestationOrMaternite.has(it.truie.id));

  return {
    asaillir: asaillirFiltered,
    echo: echoFiltered,
    mbImminente,
    enMaternite,
    asevrer: buildASevrer(bandes, truies, today),
  };
}
