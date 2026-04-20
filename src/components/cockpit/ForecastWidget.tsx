/**
 * ForecastWidget — Widget compact Cockpit
 * ══════════════════════════════════════════════════════════════════════════
 * Aperçu des prévisions à 14 jours, destiné à être intégré dans le Cockpit.
 *
 * Structure :
 *   • Header avec lien "Voir tout →" vers /pilotage/previsions
 *   • 4 MiniStat inline : MB · Sevr · Chal · Fin
 *   • Top 3 événements (liste compacte)
 *   • Warning saturation si au moins une semaine FULL
 *
 * Retourne null si aucun événement dans l'horizon — l'orchestrateur
 * (Cockpit) n'a pas à se soucier de l'affichage conditionnel.
 */

import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Baby,
  PackageCheck,
  Heart,
  Scale,
  AlertOctagon,
  type LucideIcon,
} from 'lucide-react';

import { SectionDivider } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import { Forecast } from '../../services/bandAnalysisEngine';
import type {
  ForecastEvent,
  ForecastEventType,
  ForecastPriority,
} from '../../services/forecastAnalyzer';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Route de navigation pour un événement selon son sujetNav / type. */
function navByType(type: ForecastEventType, id: string, nav?: 'truie' | 'verrat' | 'bande'): string {
  const kind = nav ?? (type === 'MB' || type === 'RETOUR_CHALEUR' ? 'truie' : 'bande');
  const encoded = encodeURIComponent(id);
  if (kind === 'truie') return `/troupeau/truies/${encoded}`;
  if (kind === 'verrat') return `/troupeau/verrats/${encoded}`;
  return `/troupeau/bandes/${encoded}`;
}

/** Couleur de la barre gauche selon priorité. */
function priorityColor(p: ForecastPriority): string {
  switch (p) {
    case 'CRITIQUE': return '#EF4444';
    case 'HAUTE': return '#F59E0B';
    case 'NORMALE': return '#60A5FA';
    case 'INFO': return '#6B7880';
  }
}

// ─── Sous-composant MiniStat ────────────────────────────────────────────────

interface MiniStatProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

const MiniStat: React.FC<MiniStatProps> = ({ label, value, icon: Icon }) => {
  return (
    <div className="card-dense flex flex-col items-center justify-center gap-0.5 py-2">
      <Icon size={14} className="text-text-2" aria-hidden="true" />
      <span className="font-mono text-[15px] tabular-nums text-text-0">{value}</span>
      <span className="kpi-label text-[9px]">{label}</span>
    </div>
  );
};

// ─── ForecastWidget ─────────────────────────────────────────────────────────

const ForecastWidget: React.FC = () => {
  const { truies, bandes, saillies } = useFarm();
  const navigate = useNavigate();

  const report = useMemo(
    () => Forecast.build({ truies, bandes, saillies }),
    [truies, bandes, saillies],
  );

  // Retourne null si rien à montrer — invisible dans le Cockpit par défaut.
  if (report.horizon14jEvents.length === 0) return null;

  const top3: ForecastEvent[] = report.horizon14jEvents.slice(0, 3);
  const hasSaturation = report.pressureByWeek.some((w) => w.saturation === 'FULL');

  const handleEventClick = (e: ForecastEvent): void => {
    if (e.type === 'SATURATION') {
      navigate('/pilotage/previsions');
      return;
    }
    navigate(navByType(e.type, e.sujetId, e.sujetNav));
  };

  return (
    <section role="region" aria-label="Prévisions 14 jours">
      <SectionDivider
        label="Prévisions 14 jours"
        action={
          <Link
            to="/pilotage/previsions"
            className="text-accent text-[11px] font-mono uppercase tracking-wide pressable"
            aria-label="Voir toutes les prévisions"
          >
            Voir tout →
          </Link>
        }
      />

      {/* ── MiniStats grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <MiniStat label="MB" value={report.countByType.MB} icon={Baby} />
        <MiniStat label="Sevr." value={report.countByType.SEVRAGE} icon={PackageCheck} />
        <MiniStat label="Chal." value={report.countByType.RETOUR_CHALEUR} icon={Heart} />
        <MiniStat label="Fin." value={report.countByType.FINITION} icon={Scale} />
      </div>

      {/* ── Top 3 événements ────────────────────────────────────────────── */}
      <ul role="list" aria-label="Top 3 prochains événements" className="space-y-1.5">
        {top3.map((e, i) => {
          const dayLabel = e.joursDans === 0
            ? "Auj."
            : e.joursDans === 1
              ? 'Demain'
              : `Dans ${e.joursDans}j`;
          return (
            <li key={`${e.type}-${e.sujetId}-${i}`} role="listitem">
              <button
                type="button"
                onClick={() => handleEventClick(e)}
                className="card-dense pressable w-full flex items-center gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                style={{ borderLeft: `2px solid ${priorityColor(e.priority)}` }}
              >
                <span className="font-mono text-[11px] text-text-2 shrink-0 tabular-nums">
                  {dayLabel}
                </span>
                <span className="text-[12px] text-text-1 flex-1 truncate">
                  {e.sujet} · {e.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* ── Saturation warning ──────────────────────────────────────────── */}
      {hasSaturation ? (
        <button
          type="button"
          onClick={() => navigate('/pilotage/previsions')}
          className="mt-2 pressable w-full flex items-center gap-2 text-red text-[12px] text-left"
          aria-label="Voir détail saturation maternité"
        >
          <AlertOctagon size={14} aria-hidden="true" />
          <span>Saturation maternité prévue · voir détail</span>
        </button>
      ) : null}
    </section>
  );
};

export default ForecastWidget;
