/**
 * FinancesView — /pilotage/finances
 * ══════════════════════════════════════════════════════════════════════════
 * Vue lecture seule des coûts / revenus / marge brute issue de la feuille
 * Sheets `FINANCES`.
 *
 * Structure :
 *   1. AgritechHeader + selector de période (chips)
 *   2. Summary strip (3 KpiCard : dépenses · revenus · marge)
 *   3. Répartition par catégorie (bar horizontale + montant)
 *   4. Mouvements récents (top 20, tri date desc)
 *
 * Currency : FCFA par défaut, EUR auto-détecté si un libellé contient `€`.
 * Aucune navigation click-through (vue passive).
 */

import React, { useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import {
  Wallet, TrendingDown, TrendingUp as TrendingUpIcon, Scale,
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { KpiCard, Chip, SectionDivider } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  summarizeByPeriode,
  summarizeAll,
  getPeriodes,
  formatMontant,
  categorieToTone,
  detectCurrency,
  dateToPeriode,
} from '../../services/financesAnalyzer';
import type { FinanceEntry } from '../../types/farm';

// ─── Helpers ────────────────────────────────────────────────────────────────

type PeriodeChoice =
  | { key: 'all'; label: string }
  | { key: 'current'; label: string }
  | { key: 'previous'; label: string }
  | { key: 'last3'; label: string };

/** Clé YYYY-MM pour le mois courant (local). */
function currentPeriodeKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Clé YYYY-MM du mois précédent (local). */
function previousPeriodeKey(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return currentPeriodeKey(d);
}

/** Ensemble des 3 derniers mois (courant inclus). */
function last3PeriodeKeys(now: Date = new Date()): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.add(currentPeriodeKey(d));
  }
  return keys;
}

/** Parse dd/MM/yyyy → timestamp pour tri. 0 si invalide. */
function parseDateFr(s: string): number {
  if (!s) return 0;
  const parts = s.split('/');
  if (parts.length !== 3) return 0;
  const [dd, mm, yyyy] = parts.map((p) => Number(p));
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return 0;
  return new Date(yyyy, mm - 1, dd).getTime();
}

// ─── Composant ──────────────────────────────────────────────────────────────

const FinancesView: React.FC = () => {
  const { finances, refreshData } = useFarm();
  const [periodeChoice, setPeriodeChoice] = useState<PeriodeChoice['key']>('current');

  const entries = finances as FinanceEntry[];

  // Devise dominante : EUR si au moins une entrée la mentionne, sinon FCFA.
  const currency = useMemo<'FCFA' | 'EUR'>(() => {
    for (const e of entries) {
      if (detectCurrency(e) === 'EUR') return 'EUR';
    }
    return 'FCFA';
  }, [entries]);

  // Entrées filtrées selon le choix de période (sert à la summary + liste).
  const filteredEntries = useMemo<FinanceEntry[]>(() => {
    if (periodeChoice === 'all') return entries;
    const now = new Date();

    if (periodeChoice === 'current') {
      const key = currentPeriodeKey(now);
      return entries.filter((e) => dateToPeriode(e.date) === key);
    }
    if (periodeChoice === 'previous') {
      const key = previousPeriodeKey(now);
      return entries.filter((e) => dateToPeriode(e.date) === key);
    }
    // last3
    const keys = last3PeriodeKeys(now);
    return entries.filter((e) => keys.has(dateToPeriode(e.date)));
  }, [entries, periodeChoice]);

  // Synthèse : si choix "all" ou "last3" → summarize(all) sur filteredEntries,
  // sinon summarizeByPeriode(key). On factorise en repassant toujours par
  // summarizeAll(filteredEntries) pour simplicité (le filtrage est déjà fait).
  const summary = useMemo(() => {
    if (periodeChoice === 'current') {
      return summarizeByPeriode(entries, currentPeriodeKey());
    }
    if (periodeChoice === 'previous') {
      return summarizeByPeriode(entries, previousPeriodeKey());
    }
    return summarizeAll(filteredEntries);
  }, [entries, filteredEntries, periodeChoice]);

  // Catégories triées par total (dépenses + revenus) décroissant.
  const categoriesSorted = useMemo(() => {
    const pairs: Array<[string, { depenses: number; revenus: number }]> =
      Object.entries(summary.parCategorie) as Array<[string, { depenses: number; revenus: number }]>;
    const rows = pairs.map(([cat, v]) => ({
      cat,
      depenses: v.depenses,
      revenus: v.revenus,
      total: v.depenses + v.revenus,
    }));
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [summary]);

  // Max absolu pour la barre horizontale (domain 0..max).
  const maxCategorieTotal = useMemo(() => {
    return categoriesSorted.reduce((m, r) => Math.max(m, r.total), 0);
  }, [categoriesSorted]);

  // Comptage d'entrées par catégorie (pour le texte "N entrées").
  const countByCategorie = useMemo<Record<string, number>>(() => {
    const acc: Record<string, number> = {};
    for (const e of filteredEntries) {
      const c = e.categorie || 'DIVERS';
      acc[c] = (acc[c] ?? 0) + 1;
    }
    return acc;
  }, [filteredEntries]);

  // Mouvements récents : 20 derniers par date desc.
  const recentMovements = useMemo<FinanceEntry[]>(() => {
    return [...filteredEntries]
      .sort((a, b) => parseDateFr(b.date) - parseDateFr(a.date))
      .slice(0, 20);
  }, [filteredEntries]);

  const nbPeriodes = useMemo(() => getPeriodes(entries).length, [entries]);

  const margeTone: 'success' | 'critical' | 'default' =
    summary.margeNette > 0 ? 'success'
    : summary.margeNette < 0 ? 'critical'
    : 'default';

  const hasData = entries.length > 0;

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
            title="FINANCES"
            subtitle="Coûts & revenus · marge brute"
            backTo="/pilotage"
          />

          <div className="px-4 pt-4 pb-32 space-y-5">
            {/* ── Selector de période ─────────────────────────────────── */}
            <section aria-label="Sélection de la période">
              <div
                role="tablist"
                aria-label="Période"
                className="flex gap-2 overflow-x-auto pb-1"
              >
                {[
                  { key: 'current' as const, label: 'Ce mois' },
                  { key: 'previous' as const, label: 'Mois dernier' },
                  { key: 'last3' as const, label: '3 derniers' },
                  { key: 'all' as const, label: 'Tous' },
                ].map((choice) => {
                  const active = periodeChoice === choice.key;
                  return (
                    <button
                      key={choice.key}
                      role="tab"
                      aria-selected={active}
                      type="button"
                      onClick={() => setPeriodeChoice(choice.key)}
                      className={`pressable shrink-0 rounded-full px-3 py-1.5 text-[12px] font-mono uppercase tracking-wide border transition-colors ${
                        active
                          ? 'bg-accent/15 border-accent text-accent'
                          : 'bg-bg-2 border-border text-text-2 hover:text-text-0'
                      }`}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>
              {nbPeriodes > 0 ? (
                <p className="mt-2 font-mono text-[11px] text-text-2">
                  {nbPeriodes} période{nbPeriodes > 1 ? 's' : ''} enregistrée{nbPeriodes > 1 ? 's' : ''} · devise {currency}
                </p>
              ) : null}
            </section>

            {/* ── Empty state global ──────────────────────────────────── */}
            {!hasData ? (
              <div
                className="card-dense text-center py-10 animate-fade-in-up"
                role="status"
              >
                <Wallet
                  size={48}
                  className="text-text-2 mx-auto mb-3 opacity-60"
                  aria-hidden="true"
                />
                <h3 className="agritech-heading text-[14px] uppercase mb-1">
                  Aucune donnée financière
                </h3>
                <p className="font-mono text-[11px] text-text-2 tracking-wide">
                  La feuille FINANCES est vide ou non accessible
                </p>
              </div>
            ) : (
              <>
                {/* ── Summary strip ─────────────────────────────────── */}
                <section
                  aria-label="Synthèse financière"
                  className="grid grid-cols-3 gap-2"
                >
                  <div className="animate-fade-in-up">
                    <KpiCard
                      label="Dépenses"
                      value={formatMontant(summary.totalDepenses, currency)}
                      icon={<TrendingDown size={14} aria-hidden="true" />}
                      tone={summary.totalDepenses > 0 ? 'warning' : 'default'}
                    />
                  </div>
                  <div className="animate-fade-in-up stagger-1">
                    <KpiCard
                      label="Revenus"
                      value={formatMontant(summary.totalRevenus, currency)}
                      icon={<TrendingUpIcon size={14} aria-hidden="true" />}
                      tone={summary.totalRevenus > 0 ? 'success' : 'default'}
                    />
                  </div>
                  <div className="animate-fade-in-up stagger-2">
                    <KpiCard
                      label="Marge nette"
                      value={formatMontant(summary.margeNette, currency)}
                      icon={<Scale size={14} aria-hidden="true" />}
                      tone={margeTone}
                    />
                  </div>
                </section>

                {/* ── Répartition par catégorie ─────────────────────── */}
                {categoriesSorted.length > 0 ? (
                  <section aria-label="Répartition par catégorie">
                    <SectionDivider
                      label="Répartition par catégorie"
                      action={
                        <Chip
                          label={String(categoriesSorted.length)}
                          tone="accent"
                          size="xs"
                        />
                      }
                    />
                    <ul
                      role="list"
                      aria-label="Liste des catégories de dépenses/revenus"
                      className="card-dense !p-0 overflow-hidden"
                    >
                      {categoriesSorted.map((row, idx) => {
                        const staggerIdx = Math.min(idx, 5);
                        const staggerClass =
                          staggerIdx === 0 ? '' : `stagger-${staggerIdx}`;
                        const tone = categorieToTone(row.cat);
                        const nbEntries = countByCategorie[row.cat] ?? 0;
                        const pct = maxCategorieTotal > 0
                          ? Math.round((row.total / maxCategorieTotal) * 100)
                          : 0;
                        // Barre : la proportion dépenses vs revenus affichée
                        // via deux couleurs (amber pour dépenses, accent pour revenus).
                        const totalForSplit = row.depenses + row.revenus;
                        const pctDepenses = totalForSplit > 0
                          ? (row.depenses / totalForSplit) * pct
                          : 0;
                        const pctRevenus = totalForSplit > 0
                          ? (row.revenus / totalForSplit) * pct
                          : 0;

                        return (
                          <li
                            key={row.cat}
                            role="listitem"
                            className={`animate-fade-in-up ${staggerClass} border-b border-border last:border-b-0 px-3 py-3`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-[14px] font-medium text-text-0">
                                    {row.cat}
                                  </span>
                                  <Chip label={String(nbEntries)} tone={tone} size="xs" />
                                </div>
                                <div className="mt-1 h-1.5 w-full rounded-full bg-bg-2 overflow-hidden flex">
                                  {pctDepenses > 0 ? (
                                    <span
                                      className="h-full bg-amber/70"
                                      style={{ width: `${pctDepenses}%` }}
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                  {pctRevenus > 0 ? (
                                    <span
                                      className="h-full bg-accent/80"
                                      style={{ width: `${pctRevenus}%` }}
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                </div>
                                <div className="mt-1 font-mono text-[11px] text-text-2 flex gap-3">
                                  {row.depenses > 0 ? (
                                    <span>
                                      <span className="text-amber">−</span>{' '}
                                      {formatMontant(row.depenses, currency)}
                                    </span>
                                  ) : null}
                                  {row.revenus > 0 ? (
                                    <span>
                                      <span className="text-accent">+</span>{' '}
                                      {formatMontant(row.revenus, currency)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="shrink-0 font-mono text-[12px] tabular-nums text-text-1 text-right">
                                {formatMontant(row.total, currency)}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}

                {/* ── Mouvements récents ─────────────────────────────── */}
                {recentMovements.length > 0 ? (
                  <section aria-label="Mouvements récents">
                    <SectionDivider
                      label={`Mouvements récents (top ${recentMovements.length})`}
                      action={
                        <Chip
                          label={String(filteredEntries.length)}
                          tone="default"
                          size="xs"
                        />
                      }
                    />
                    <ul
                      role="list"
                      aria-label="Liste des derniers mouvements"
                      className="card-dense !p-0 overflow-hidden"
                    >
                      {recentMovements.map((e, idx) => {
                        const staggerIdx = Math.min(idx, 5);
                        const staggerClass =
                          staggerIdx === 0 ? '' : `stagger-${staggerIdx}`;
                        const isRevenu = e.type === 'REVENU';
                        const signClass = isRevenu ? 'text-accent' : 'text-amber';
                        const sign = isRevenu ? '+' : '−';
                        const tone = categorieToTone(e.categorie);

                        return (
                          <li
                            key={`${e.date}-${e.libelle}-${idx}`}
                            role="listitem"
                            className={`animate-fade-in-up ${staggerClass} flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[14px] font-medium text-text-0">
                                {e.libelle || '(sans libellé)'}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-text-2 truncate">
                                <Chip label={e.categorie || 'DIVERS'} tone={tone} size="xs" />
                                <span>·</span>
                                <span>{e.date || '—'}</span>
                              </div>
                            </div>
                            <div
                              className={`shrink-0 font-mono text-[12px] tabular-nums ${signClass}`}
                            >
                              {sign} {formatMontant(e.montant, currency)}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default FinancesView;
