/**
 * ReproCalendarView — Agritech Dark Cockpit
 * ══════════════════════════════════════════════════════════════════════════
 * Route : /cycles/repro
 *
 * Vue "Calendrier Repro" — agrège trois flux temporels autour du cycle
 * reproductif :
 *
 *   1. Saillies effectuées (7 derniers jours) — depuis `saillies`
 *   2. Mises-Bas prévues (30 prochains jours) — depuis
 *      `truies.dateMBPrevue` ∪ `saillies.dateMBPrevue` (dédupliqué)
 *   3. Retours en chaleur attendus (J+3 à J+10 post-sevrage) — depuis
 *      `bandes.dateSevrageReelle` (statut contenant "sevr")
 *
 * Les flux (1) et (2) coexistent. Si `saillies` est vide (feuille
 * SUIVI_REPRODUCTION_ACTUEL non encore câblée), on continue d'afficher
 * les MB prévues depuis `truies.dateMBPrevue` + un message informatif.
 *
 * Design : AgritechLayout + AgritechHeader, DataRow + Chip, border-left
 * rouge/ambre/accent-dim selon urgence, stagger 50ms. Zéro `any`.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonRefresher, IonRefresherContent } from '@ionic/react';
import { Heart, Baby, CalendarClock, Info, Edit3 } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { KpiCard, Chip, SectionDivider } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import type { Truie, BandePorcelets, Saillie } from '../../types/farm';
import QuickEditSaillieForm from '../../components/forms/QuickEditSaillieForm';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers date
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse une date au format dd/MM/yyyy (FR) ou ISO (yyyy-mm-dd).
 * Retourne `null` si invalide. Normalise à 00h00 local pour calculs de jours
 * entiers.
 */
function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;

  // dd/MM/yyyy
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map((p) => Number(p));
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
    const d = new Date(yyyy, mm - 1, dd);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  // ISO yyyy-mm-dd (ou ISO full)
  const d = new Date(trimmed);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Formate une date vers dd/MM/yyyy (FR) pour affichage mono. */
function formatDateFr(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Nombre de jours entiers entre deux dates (b - a), arrondi à l'entier. */
function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────────────────────────────────────

type AVenirKind = 'MB_PREVUE' | 'RETOUR_CHALEUR';

interface AVenirItem {
  key: string;
  kind: AVenirKind;
  /** Date cible parsée, normalisée 0h. */
  date: Date;
  /** Jours restants (≥ 0 pour MB futures, peut être 0 si aujourd'hui). */
  daysAhead: number;
  primary: string;
  /** ID de la truie associée pour navigation (si connue). */
  truieId?: string;
}

interface SaillieItem {
  key: string;
  date: Date;
  daysAgo: number;
  primary: string;
  mbPrevueStr?: string;
  truieId: string;
  /** Référence à la saillie brute pour édition rapide. */
  source: Saillie;
}

// ─────────────────────────────────────────────────────────────────────────────
// Urgency → border-left + chip tone
// ─────────────────────────────────────────────────────────────────────────────

/** Classes border-left selon l'urgence en jours restants. */
function urgencyBorder(daysAhead: number): string {
  if (daysAhead < 2) return 'border-l-red';
  if (daysAhead < 7) return 'border-l-amber';
  return 'border-l-accent-dim';
}

/** ChipTone pour la priorité / jours restants. */
function urgencyTone(daysAhead: number): ChipTone {
  if (daysAhead < 2) return 'red';
  if (daysAhead < 7) return 'amber';
  return 'default';
}

/** Label court pour le chip de délai. */
function daysAheadLabel(daysAhead: number): string {
  if (daysAhead <= 0) return "Aujourd'hui";
  if (daysAhead === 1) return 'Demain';
  return `J-${daysAhead}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

const ReproCalendarView: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes, saillies, refreshData } = useFarm();

  // ── State édition rapide d'une saillie ─────────────────────────────────
  const [editTarget, setEditTarget] = useState<Saillie | null>(null);

  // Aujourd'hui normalisé à 0h — stable durant le render courant.
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // ── 1. Saillies 7 derniers jours (desc) ───────────────────────────────────
  const saillies7j = useMemo<SaillieItem[]>(() => {
    const items: SaillieItem[] = [];
    for (const s of saillies as Saillie[]) {
      const d = parseDate(s.dateSaillie);
      if (!d) continue;
      const daysAgo = diffDays(d, today);
      if (daysAgo < 0 || daysAgo > 7) continue;

      const truieLabel = s.truieNom
        ? `${s.truieId} ${s.truieNom}`
        : s.truieId || '—';
      const verratLabel = s.verratId || '—';

      items.push({
        key: `saillie-${s.truieId}-${s.dateSaillie}-${s.verratId}`,
        date: d,
        daysAgo,
        primary: `${truieLabel} × ${verratLabel}`,
        mbPrevueStr: s.dateMBPrevue,
        truieId: s.truieId,
        source: s,
      });
    }
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [saillies, today]);

  // ── 2. MB prévues 30 prochains jours — dédup truies ∪ saillies ────────────
  const mbPrevues30j = useMemo<AVenirItem[]>(() => {
    /**
     * Dédup key : truieId + date ISO. Une truie peut apparaître dans `truies`
     * (champ `dateMBPrevue`) ET dans `saillies` (champ `dateMBPrevue`). On
     * considère que c'est le même événement si truieId + date coïncident.
     * Priorité : l'entrée `truies` (plus canonique — reflète l'état actuel).
     */
    const seen = new Map<string, AVenirItem>();

    const truiesTyped = truies as Truie[];

    // 2a. Depuis truies
    for (const t of truiesTyped) {
      const d = parseDate(t.dateMBPrevue);
      if (!d) continue;
      const daysAhead = diffDays(today, d);
      if (daysAhead < 0 || daysAhead > 30) continue;

      const iso = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const key = `truie|${t.id}|${iso}`;
      const nom = t.nom ? ` ${t.nom}` : '';
      seen.set(key, {
        key: `mb-truie-${t.id}-${iso}`,
        kind: 'MB_PREVUE',
        date: d,
        daysAhead,
        primary: `MB prévue ${t.displayId}${nom}`,
        truieId: t.id,
      });
    }

    // 2b. Depuis saillies (si pas déjà présent via truies)
    for (const s of saillies as Saillie[]) {
      const d = parseDate(s.dateMBPrevue);
      if (!d) continue;
      const daysAhead = diffDays(today, d);
      if (daysAhead < 0 || daysAhead > 30) continue;
      if (!s.truieId) continue;

      const iso = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const dedupKey = `truie|${s.truieId}|${iso}`;
      if (seen.has(dedupKey)) continue;

      // Résolution label truie via truies si possible
      const truie = truiesTyped.find((t) => t.id === s.truieId);
      const label = truie
        ? `${truie.displayId}${truie.nom ? ' ' + truie.nom : ''}`
        : s.truieNom
          ? `${s.truieId} ${s.truieNom}`
          : s.truieId;

      seen.set(dedupKey, {
        key: `mb-saillie-${s.truieId}-${iso}`,
        kind: 'MB_PREVUE',
        date: d,
        daysAhead,
        primary: `MB prévue ${label}`,
        truieId: s.truieId,
      });
    }

    return Array.from(seen.values());
  }, [truies, saillies, today]);

  // ── 3. Retours chaleur attendus (J+3 à J+10 post-sevrage) ─────────────────
  const retoursChaleur = useMemo<AVenirItem[]>(() => {
    const items: AVenirItem[] = [];
    for (const b of bandes as BandePorcelets[]) {
      if (!/sevr/i.test(b.statut || '')) continue;
      const dSevrage = parseDate(b.dateSevrageReelle);
      if (!dSevrage) continue;

      const daysSinceSevrage = diffDays(dSevrage, today);
      // Fenêtre active : sevrage entre J-3 et J-10 en arrière → retour
      // attendu à sevrage + 5j. `daysAhead` est le délai restant jusqu'à J+5.
      if (daysSinceSevrage < 3 || daysSinceSevrage > 10) continue;

      const dRetour = new Date(dSevrage.getTime() + 5 * 86_400_000);
      const daysAhead = diffDays(today, dRetour);
      // Clamp : si déjà dépassé (daysAhead < 0), conserve mais affiche 0.
      const displayDays = Math.max(0, daysAhead);

      const truieLabel = b.truie || b.boucleMere || b.idPortee;
      items.push({
        key: `chaleur-${b.id}`,
        kind: 'RETOUR_CHALEUR',
        date: dRetour,
        daysAhead: displayDays,
        primary: `Retour chaleur ${truieLabel}`,
        truieId: b.truie,
      });
    }
    return items;
  }, [bandes, today]);

  // ── À venir (merge + sort ASC par date) ───────────────────────────────────
  const aVenir = useMemo<AVenirItem[]>(() => {
    return [...mbPrevues30j, ...retoursChaleur].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }, [mbPrevues30j, retoursChaleur]);

  // ── Gestations en cours (KPI) ─────────────────────────────────────────────
  const nbGestations = useMemo(() => {
    return (truies as Truie[]).filter((t) => /pleine/i.test(t.statut || '')).length;
  }, [truies]);

  const saillesEmpty = saillies.length === 0;
  const nothingAtAll =
    aVenir.length === 0 && saillies7j.length === 0;

  // ── Navigation helpers ────────────────────────────────────────────────────
  const goTruie = (truieId?: string): void => {
    if (!truieId) return;
    navigate(`/troupeau/truies/${truieId}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => {
            void refreshData().finally(() => e.detail.complete());
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader
            title="Calendrier Repro"
            subtitle="Saillies · MB prévues · Retours chaleur"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-32 space-y-5">
            {/* ── Summary strip (4 KPI) ─────────────────────────────────── */}
            <section
              aria-label="Synthèse repro"
              className="grid grid-cols-2 gap-3"
            >
              <div className="animate-fade-in-up">
                <KpiCard
                  label="Saillies 7j"
                  value={saillies7j.length}
                  icon={<Heart size={14} aria-hidden="true" />}
                  tone={saillies7j.length > 0 ? 'success' : 'default'}
                />
              </div>
              <div className="animate-fade-in-up stagger-1">
                <KpiCard
                  label="MB prévues 30j"
                  value={mbPrevues30j.length}
                  icon={<Baby size={14} aria-hidden="true" />}
                  tone={mbPrevues30j.length > 0 ? 'success' : 'default'}
                />
              </div>
              <div className="animate-fade-in-up stagger-2">
                <KpiCard
                  label="Retours chaleur"
                  value={retoursChaleur.length}
                  icon={<Heart size={14} aria-hidden="true" />}
                  tone={retoursChaleur.length > 0 ? 'warning' : 'default'}
                />
              </div>
              <div className="animate-fade-in-up stagger-3">
                <KpiCard
                  label="Gestations"
                  value={nbGestations}
                  icon={<CalendarClock size={14} aria-hidden="true" />}
                  tone="default"
                />
              </div>
            </section>

            {/* ── Fallback info si saillies vides ──────────────────────── */}
            {saillesEmpty ? (
              <div
                role="status"
                className="card-dense border-l-2 border-l-blue flex items-start gap-3"
              >
                <Info
                  size={16}
                  className="text-blue shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-[12px] text-text-1 leading-relaxed">
                  Connectez{' '}
                  <span className="font-mono text-text-0">
                    SUIVI_REPRODUCTION_ACTUEL
                  </span>{' '}
                  pour l'historique saillies. Les MB prévues sont affichées
                  depuis le champ <span className="font-mono">dateMBPrevue</span>{' '}
                  des truies.
                </p>
              </div>
            ) : null}

            {/* ── Empty state global ───────────────────────────────────── */}
            {nothingAtAll ? (
              <div
                className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up stagger-4"
                role="status"
              >
                <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
                  <Heart size={40} aria-hidden="true" />
                </div>
                <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
                  Aucune échéance dans les 14 prochains jours
                </h3>
                <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
                  Profitez du calme — rien à faire cette quinzaine côté repro.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/cycles/repro')}
                  className="pressable mt-5 h-11 px-5 rounded-md bg-accent text-bg-0 text-[13px] font-medium transition-colors"
                >
                  Voir historique
                </button>
              </div>
            ) : null}

            {/* ── Section À venir (30 jours) ───────────────────────────── */}
            {aVenir.length > 0 ? (
              <section aria-label="Évènements à venir">
                <SectionDivider
                  label="À venir (30 jours)"
                  action={
                    <Chip
                      label={String(aVenir.length)}
                      tone="accent"
                      size="xs"
                    />
                  }
                />
                <ul
                  role="list"
                  aria-label="Liste des évènements repro à venir"
                  className="card-dense !p-0 overflow-hidden"
                >
                  {aVenir.map((item, idx) => {
                    const isChaleur = item.kind === 'RETOUR_CHALEUR';
                    const Icon = isChaleur ? Heart : Baby;
                    const iconColor = isChaleur ? 'text-accent' : 'text-gold';
                    const border = urgencyBorder(item.daysAhead);
                    const staggerIdx = Math.min(idx, 5);
                    const staggerClass =
                      staggerIdx === 0 ? '' : `stagger-${staggerIdx}`;

                    return (
                      <li
                        key={item.key}
                        role="listitem"
                        className={`animate-fade-in-up ${staggerClass}`}
                      >
                        <button
                          type="button"
                          onClick={() => goTruie(item.truieId)}
                          disabled={!item.truieId}
                          className={`pressable w-full flex items-center gap-3 px-3 py-3 text-left border-b border-border last:border-b-0 border-l-2 ${border} focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] disabled:cursor-default disabled:opacity-70`}
                        >
                          <div className="h-9 w-9 rounded-md bg-bg-2 border border-border flex items-center justify-center shrink-0">
                            <Icon
                              size={16}
                              className={iconColor}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-medium text-text-0">
                              {item.primary}
                            </div>
                            <div className="mt-0.5 truncate font-mono text-[11px] text-text-2">
                              {item.daysAhead === 0
                                ? "Aujourd'hui"
                                : `Dans ${item.daysAhead} jour${item.daysAhead > 1 ? 's' : ''}`}{' '}
                              · {formatDateFr(item.date)}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <Chip
                              label={daysAheadLabel(item.daysAhead)}
                              tone={urgencyTone(item.daysAhead)}
                              size="xs"
                            />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* ── Section Saillies récentes ────────────────────────────── */}
            {saillies7j.length > 0 ? (
              <section aria-label="Saillies récentes">
                <SectionDivider
                  label="Saillies récentes (7 derniers jours)"
                  action={
                    <Chip
                      label={String(saillies7j.length)}
                      tone="accent"
                      size="xs"
                    />
                  }
                />
                <ul
                  role="list"
                  aria-label="Liste des saillies des 7 derniers jours"
                  className="card-dense !p-0 overflow-hidden"
                >
                  {saillies7j.map((item, idx) => {
                    const staggerIdx = Math.min(idx, 5);
                    const staggerClass =
                      staggerIdx === 0 ? '' : `stagger-${staggerIdx}`;
                    const mbLabel = item.mbPrevueStr
                      ? `MB prévue ${item.mbPrevueStr}`
                      : 'MB non planifiée';
                    const ago =
                      item.daysAgo === 0
                        ? "Aujourd'hui"
                        : item.daysAgo === 1
                          ? 'Hier'
                          : `Il y a ${item.daysAgo} jours`;

                    return (
                      <li
                        key={item.key}
                        role="listitem"
                        className={`animate-fade-in-up ${staggerClass}`}
                      >
                        <div
                          className="flex items-stretch border-b border-border last:border-b-0 border-l-2 border-l-accent"
                        >
                          <button
                            type="button"
                            onClick={() => goTruie(item.truieId)}
                            aria-label={`Ouvrir la fiche truie ${item.truieId}`}
                            className="pressable flex-1 min-w-0 flex items-center gap-3 px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                          >
                            <div className="h-9 w-9 rounded-md bg-bg-2 border border-border flex items-center justify-center shrink-0">
                              <Heart
                                size={16}
                                className="text-accent"
                                aria-hidden="true"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[14px] font-medium text-text-0">
                                {item.primary}
                              </div>
                              <div className="mt-0.5 truncate font-mono text-[11px] text-text-2">
                                {ago} · {mbLabel}
                              </div>
                            </div>
                            <div className="shrink-0 font-mono text-[11px] tabular-nums text-text-2">
                              {formatDateFr(item.date)}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditTarget(item.source)}
                            aria-label={`Corriger la saillie ${item.primary} du ${formatDateFr(item.date)}`}
                            title="Corriger la saillie"
                            className="pressable shrink-0 w-11 flex items-center justify-center border-l border-border text-text-2 hover:text-accent hover:bg-bg-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                          >
                            <Edit3 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        </AgritechLayout>

        {/* ── Modal édition rapide saillie ────────────────────────────── */}
        {editTarget ? (
          <QuickEditSaillieForm
            isOpen={editTarget !== null}
            onClose={() => setEditTarget(null)}
            saillie={editTarget}
            onSuccess={() => {
              void refreshData();
            }}
          />
        ) : null}
      </IonContent>
    </IonPage>
  );
};

export default ReproCalendarView;
