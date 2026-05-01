/**
 * ReproCalendarView — Agritech Dark Cockpit
 * ══════════════════════════════════════════════════════════════════════════
 * Route : /cycles/repro
 *
 * Vue "Calendrier Repro" — agrège les saillies récentes et expose des
 * KPIs de synthèse repro. Le forecast détaillé (MB, sevrages, retours
 * chaleur, saturation) est centralisé dans /pilotage/previsions afin
 * d'éviter la duplication.
 *
 *   1. KPIs synthétiques : Saillies 7j, MB prévues 30j (count),
 *      Retours chaleur (count), Gestations
 *   2. Saillies effectuées (7 derniers jours) — depuis `saillies`
 *   3. Lien vers /pilotage/previsions pour le forecast complet 14j
 *
 * Si `saillies` est vide (feuille SUIVI_REPRODUCTION_ACTUEL non câblée),
 * un message informatif est affiché.
 *
 * Design : AgritechLayout + AgritechHeader, DataRow + Chip, border-left
 * rouge/ambre/accent-dim selon urgence, stagger 50ms. Zéro `any`.
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IonPage, IonContent, IonRefresher, IonRefresherContent } from '@ionic/react';
import { Heart, Info, Edit3, ChevronRight } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import { default as KpiCardV6 } from '../../components/design/KpiCard';
import EmptyState from '../../components/design/EmptyState';
import { Chip, SectionDivider } from '../../components/agritech';
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

  // ── 2. Comptage MB prévues 30 prochains jours — dédup truies ∪ saillies ──
  const mbPrevues30jCount = useMemo<number>(() => {
    const seen = new Set<string>();
    const truiesTyped = truies as Truie[];

    for (const t of truiesTyped) {
      const d = parseDate(t.dateMBPrevue);
      if (!d) continue;
      const daysAhead = diffDays(today, d);
      if (daysAhead < 0 || daysAhead > 30) continue;
      const iso = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      seen.add(`truie|${t.id}|${iso}`);
    }

    for (const s of saillies as Saillie[]) {
      const d = parseDate(s.dateMBPrevue);
      if (!d) continue;
      const daysAhead = diffDays(today, d);
      if (daysAhead < 0 || daysAhead > 30) continue;
      if (!s.truieId) continue;
      const iso = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      seen.add(`truie|${s.truieId}|${iso}`);
    }

    return seen.size;
  }, [truies, saillies, today]);

  // ── 3. Retours chaleur attendus (J+3 à J+10 post-sevrage) — comptage ─────
  const retoursChaleurCount = useMemo<number>(() => {
    let n = 0;
    for (const b of bandes as BandePorcelets[]) {
      if (!/sevr/i.test(b.statut || '')) continue;
      const dSevrage = parseDate(b.dateSevrageReelle);
      if (!dSevrage) continue;
      const daysSinceSevrage = diffDays(dSevrage, today);
      if (daysSinceSevrage < 3 || daysSinceSevrage > 10) continue;
      n++;
    }
    return n;
  }, [bandes, today]);

  // ── Gestations en cours (KPI) ─────────────────────────────────────────────
  const nbGestations = useMemo(() => {
    return (truies as Truie[]).filter((t) => /pleine/i.test(t.statut || '')).length;
  }, [truies]);

  const saillesEmpty = saillies.length === 0;
  const nothingAtAll =
    saillies7j.length === 0 && mbPrevues30jCount === 0 && retoursChaleurCount === 0;

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
          <TopBarSync
            crumbs={['Cycles', 'Reproduction']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 space-y-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header>
              <Eyebrow dotColor="pig">Cycle · Reproduction</Eyebrow>
              <h1
                style={{
                  fontFamily: 'BigShoulders, system-ui, sans-serif',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Reproduction
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                Calendrier saillies & retours chaleur
              </div>
            </header>
            {/* ── Summary strip (4 KPI) ─────────────────────────────────── */}
            <section
              aria-label="Synthèse repro"
              className="grid grid-cols-2 gap-3"
            >
              <div className="animate-fade-in-up">
                <KpiCardV6
                  label="Saillies 7j"
                  value={saillies7j.length}
                />
              </div>
              <div className="animate-fade-in-up stagger-1">
                <KpiCardV6
                  label="MB prévues 30j"
                  value={mbPrevues30jCount}
                />
              </div>
              <div className="animate-fade-in-up stagger-2">
                <KpiCardV6
                  label="Retours chaleur"
                  value={retoursChaleurCount}
                  accentColor={retoursChaleurCount > 0 ? 'var(--color-pig-deep)' : undefined}
                />
              </div>
              <div className="animate-fade-in-up stagger-3">
                <KpiCardV6
                  label="Gestations"
                  value={nbGestations}
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
              <EmptyState
                icon={<Heart size={32} aria-hidden="true" />}
                title="Aucune échéance dans les 14 prochains jours"
                description="Profitez du calme — rien à faire cette quinzaine côté repro."
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/cycles/repro')}
                    className="pressable h-11 px-5 rounded-md bg-accent text-bg-0 text-[13px] font-medium transition-colors"
                  >
                    Voir historique
                  </button>
                }
              />
            ) : null}

            {/* ── Lien vers le forecast pilotage (canonique) ───────────── */}
            <Link
              to="/pilotage/previsions"
              className="pressable flex items-center gap-3 px-4 py-3 rounded-md bg-bg-1 border border-border hover:bg-bg-2 transition-colors no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-text-0">
                  Voir le forecast complet 14 jours
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-text-2">
                  MB · Sevrages · Retours chaleur · Saturation
                </div>
              </div>
              <ChevronRight size={18} className="text-text-2 shrink-0" aria-hidden="true" />
            </Link>

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
