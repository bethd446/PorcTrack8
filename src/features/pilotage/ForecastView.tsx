/**
 * ForecastView — /pilotage/previsions
 * ══════════════════════════════════════════════════════════════════════════
 * Vue dédiée aux prévisions à 14 jours (conduite en bandes porcine).
 *
 * Structure :
 *   1. AgritechHeader "PRÉVISIONS 14 JOURS"
 *   2. Summary strip 4 KpiCard : MB · Sevrages · Retours chaleur · Finitions
 *   3. Top critique (si présent) — bannière dédiée
 *   4. Pression loges maternité — grid 4 semaines ISO (X/9 + barre + chip)
 *   5. Calendrier 14 j — liste DataRow triée ASC (sujet · description · date)
 *   6. Empty state si 0 événement
 *
 * Lecture seule, aucune mutation. Chaque row est cliquable et navigue vers
 * la fiche animal ou la bande correspondante (`navByType`).
 */

import React, { useMemo } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  Baby,
  PackageCheck,
  Heart,
  Scale,
  AlertOctagon,
  Calendar,
  TrendingUp,
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { KpiCard, Chip, SectionDivider } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  buildForecast,
  type ForecastEvent,
  type ForecastEventType,
  type ForecastPriority,
  type WeeklyPressure,
} from '../../services/forecastAnalyzer';

// ─── Helpers UI ─────────────────────────────────────────────────────────────

/** Route de navigation pour un événement selon son sujetNav / type. */
function navByType(type: ForecastEventType, id: string, nav?: 'truie' | 'verrat' | 'bande'): string {
  const kind = nav ?? (type === 'MB' || type === 'RETOUR_CHALEUR' ? 'truie' : 'bande');
  const encoded = encodeURIComponent(id);
  if (kind === 'truie') return `/troupeau/truies/${encoded}`;
  if (kind === 'verrat') return `/troupeau/verrats/${encoded}`;
  return `/troupeau/bandes/${encoded}`;
}

/** Icône lucide par type d'événement. */
function eventIcon(type: ForecastEventType): React.ReactNode {
  const size = 16;
  switch (type) {
    case 'MB': return <Baby size={size} aria-hidden="true" />;
    case 'SEVRAGE': return <PackageCheck size={size} aria-hidden="true" />;
    case 'RETOUR_CHALEUR': return <Heart size={size} aria-hidden="true" />;
    case 'FINITION': return <Scale size={size} aria-hidden="true" />;
    case 'SATURATION': return <AlertOctagon size={size} aria-hidden="true" />;
  }
}

/** Chip tone par priorité. */
function priorityTone(p: ForecastPriority): ChipTone {
  switch (p) {
    case 'CRITIQUE': return 'red';
    case 'HAUTE': return 'amber';
    case 'NORMALE': return 'blue';
    case 'INFO': return 'default';
  }
}

/** Format ISO → "22 avr." (court, jour + mois abrégé). */
function formatDateShort(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/** Chip tone pour saturation d'une semaine. */
function saturationTone(sat: WeeklyPressure['saturation']): ChipTone {
  if (sat === 'FULL') return 'red';
  if (sat === 'HIGH') return 'amber';
  return 'default';
}

/** Label humain pour une saturation. */
function saturationLabel(sat: WeeklyPressure['saturation']): string {
  if (sat === 'FULL') return 'SATURÉ';
  if (sat === 'HIGH') return 'TENDU';
  return 'OK';
}

/** "2026-W17" → "W17". */
function shortWeek(iso: string): string {
  const i = iso.indexOf('-W');
  return i >= 0 ? iso.slice(i + 1) : iso;
}

// ─── Composant ──────────────────────────────────────────────────────────────

const ForecastView: React.FC = () => {
  const { truies, bandes, saillies, refreshData } = useFarm();
  const navigate = useNavigate();

  const report = useMemo(
    () => buildForecast({ truies, bandes, saillies }),
    [truies, bandes, saillies],
  );

  const hasEvents = report.horizon14jEvents.length > 0;

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
            title="PRÉVISIONS 14 JOURS"
            subtitle="Anticipation conduite en bandes"
            backTo="/pilotage"
          />

          <div className="px-4 pt-4 pb-32 space-y-5">
            {/* ── Summary strip ─────────────────────────────────────────── */}
            <section
              aria-label="Synthèse prévisions 14 jours"
              className="grid grid-cols-4 gap-2"
            >
              <div className="animate-fade-in-up">
                <KpiCard
                  label="MB"
                  value={report.countByType.MB}
                  icon={<Baby size={14} aria-hidden="true" />}
                  tone={report.countByType.MB > 0 ? 'warning' : 'default'}
                />
              </div>
              <div className="animate-fade-in-up stagger-1">
                <KpiCard
                  label="Sevrages"
                  value={report.countByType.SEVRAGE}
                  icon={<PackageCheck size={14} aria-hidden="true" />}
                />
              </div>
              <div className="animate-fade-in-up stagger-2">
                <KpiCard
                  label="Chaleurs"
                  value={report.countByType.RETOUR_CHALEUR}
                  icon={<Heart size={14} aria-hidden="true" />}
                />
              </div>
              <div className="animate-fade-in-up stagger-3">
                <KpiCard
                  label="Finitions"
                  value={report.countByType.FINITION}
                  icon={<Scale size={14} aria-hidden="true" />}
                />
              </div>
            </section>

            {/* ── Top critique ─────────────────────────────────────────── */}
            {report.topCritical ? (
              <section aria-label="Événement le plus urgent">
                <button
                  type="button"
                  onClick={() => {
                    const ev = report.topCritical;
                    if (!ev || ev.type === 'SATURATION') return;
                    navigate(navByType(ev.type, ev.sujetId, ev.sujetNav));
                  }}
                  className="card-dense pressable w-full text-left flex items-start gap-3 border-l-2 border-red/80"
                  style={{ borderLeftColor: '#EF4444' }}
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red/10 text-red">
                    {eventIcon(report.topCritical.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Chip label={report.topCritical.priority} tone={priorityTone(report.topCritical.priority)} size="xs" />
                      <span className="font-mono text-[11px] text-text-2 uppercase tracking-wide">
                        Dans {report.topCritical.joursDans}j · {formatDateShort(report.topCritical.date)}
                      </span>
                    </div>
                    <div className="mt-1 text-[14px] font-medium text-text-0 truncate">
                      {report.topCritical.sujet}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-text-2">
                      {report.topCritical.description}
                    </div>
                    {report.topCritical.actionRequise ? (
                      <div className="mt-1 text-[12px] text-amber">
                        → {report.topCritical.actionRequise}
                      </div>
                    ) : null}
                  </div>
                </button>
              </section>
            ) : null}

            {/* ── Pression loges maternité ─────────────────────────────── */}
            <section aria-label="Pression loges maternité 4 semaines">
              <SectionDivider
                label="Pression loges maternité (4 sem)"
                action={<TrendingUp size={14} className="text-text-2" aria-hidden="true" />}
              />
              <div className="grid grid-cols-4 gap-2">
                {report.pressureByWeek.map((w, i) => {
                  const staggerIdx = Math.min(i, 5);
                  const staggerClass = staggerIdx === 0 ? '' : `stagger-${staggerIdx}`;
                  const pct = Math.min(100, Math.round((w.nbMBPrevues / w.capaciteMaternite) * 100));
                  const fillColor = w.saturation === 'FULL'
                    ? '#EF4444'
                    : w.saturation === 'HIGH'
                      ? '#F59E0B'
                      : '#60A5FA';
                  return (
                    <div
                      key={w.semaineIso}
                      className={`card-dense animate-fade-in-up ${staggerClass} flex flex-col gap-1.5`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="kpi-label">{shortWeek(w.semaineIso)}</span>
                        <Chip label={saturationLabel(w.saturation)} tone={saturationTone(w.saturation)} size="xs" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-[16px] tabular-nums text-text-0">{w.nbMBPrevues}</span>
                        <span className="font-mono text-[11px] text-text-2">/{w.capaciteMaternite}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-bg-2 overflow-hidden">
                        <span
                          className="block h-full"
                          style={{ width: `${pct}%`, backgroundColor: fillColor }}
                          aria-hidden="true"
                        />
                      </div>
                      {w.nbSevragesPrevus > 0 ? (
                        <span className="font-mono text-[10px] text-text-2">
                          {w.nbSevragesPrevus} sevr.
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Calendrier 14 jours ───────────────────────────────────── */}
            <section aria-label="Calendrier des 14 prochains jours">
              <SectionDivider
                label="Calendrier 14 jours"
                action={
                  <Chip
                    label={String(report.horizon14jEvents.length)}
                    tone="accent"
                    size="xs"
                  />
                }
              />

              {hasEvents ? (
                <ul
                  role="list"
                  aria-label="Liste des événements prévus"
                  className="card-dense !p-0 overflow-hidden"
                >
                  {report.horizon14jEvents.map((e, idx) => {
                    const staggerIdx = Math.min(idx, 5);
                    const staggerClass = staggerIdx === 0 ? '' : `stagger-${staggerIdx}`;
                    const isInteractive = e.type !== 'SATURATION';
                    const dayLabel = e.joursDans === 0
                      ? "Aujourd'hui"
                      : e.joursDans === 1
                        ? 'Demain'
                        : `Dans ${e.joursDans}j`;

                    return (
                      <li
                        key={`${e.type}-${e.sujetId}-${idx}`}
                        role="listitem"
                        className={`animate-fade-in-up ${staggerClass} border-b border-border last:border-b-0`}
                      >
                        <ForecastRow
                          event={e}
                          dayLabel={dayLabel}
                          onClick={isInteractive
                            ? () => navigate(navByType(e.type, e.sujetId, e.sujetNav))
                            : undefined}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div
                  className="card-dense text-center py-10 animate-fade-in-up"
                  role="status"
                >
                  <Calendar
                    size={48}
                    className="text-text-2 mx-auto mb-3 opacity-60"
                    aria-hidden="true"
                  />
                  <h3 className="agritech-heading text-[14px] uppercase mb-1">
                    Aucune échéance
                  </h3>
                  <p className="font-mono text-[11px] text-text-2 tracking-wide">
                    Aucun événement dans les 14 prochains jours
                  </p>
                </div>
              )}
            </section>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composant : ligne événement ───────────────────────────────────────

interface ForecastRowProps {
  event: ForecastEvent;
  dayLabel: string;
  onClick?: () => void;
}

const ForecastRow: React.FC<ForecastRowProps> = ({ event, dayLabel, onClick }) => {
  const tone = priorityTone(event.priority);
  const content = (
    <>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-2 text-text-1">
        {eventIcon(event.type)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-text-0">
          {event.sujet}
        </div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-text-2">
          {event.description}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <Chip label={event.priority} tone={tone} size="xs" />
        <span className="font-mono text-[11px] text-text-2 tabular-nums">
          {dayLabel}
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="pressable flex w-full items-center gap-3 px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      {content}
    </div>
  );
};

export default ForecastView;
