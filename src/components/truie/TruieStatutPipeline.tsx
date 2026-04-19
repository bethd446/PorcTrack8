import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Baby, Home, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * TruieStatutPipeline — Vue "funnel" du cycle reproductif d'une truie.
 *
 * 4 étapes visuelles (gauche → droite) :
 *   Attente saillie → Pleine → Maternité → À surveiller
 *
 * Chaque étape est :
 *  - cliquable → navigate(`${basePath}?statut=${key}`)
 *  - affiche un compteur mono + label uppercase + mini-barre proportionnelle
 *  - tint de couleur propre (tone)
 *
 * Volontairement agnostique de FarmContext : reçoit les compteurs en props pour
 * rester testable et réutilisable (ex: dashboard synthétique, vue troupeau).
 */

export type TruieEtapeKey = 'attente' | 'pleine' | 'maternite' | 'surveiller';
export type TruieEtapeTone = 'default' | 'accent' | 'gold' | 'amber';

export interface TruieEtape {
  key: TruieEtapeKey;
  label: string;
  count: number;
  tone: TruieEtapeTone;
}

export interface TruieStatutPipelineProps {
  /** Chemin vers la liste des truies (filtré via `?statut=<key>`). */
  basePath: string;
  /** 4 étapes dans l'ordre funnel. */
  etapes: TruieEtape[];
  /** Total troupeau — sert à proportionner la mini-barre de chaque étape. */
  total: number;
}

/** Map tone → Tailwind classes (icône + barre + ring). */
const TONE_STYLES: Record<
  TruieEtapeTone,
  { icon: string; bar: string; border: string }
> = {
  default: { icon: 'text-text-1', bar: 'bg-text-2',  border: 'border-border' },
  accent:  { icon: 'text-accent', bar: 'bg-accent',  border: 'border-accent/40' },
  gold:    { icon: 'text-gold',   bar: 'bg-gold',    border: 'border-gold/40' },
  amber:   { icon: 'text-amber',  bar: 'bg-amber',   border: 'border-amber/40' },
};

const ICONS: Record<TruieEtapeKey, React.ComponentType<{ size?: number }>> = {
  attente:    Clock,
  pleine:     Baby,
  maternite:  Home,
  surveiller: AlertTriangle,
};

const TruieStatutPipeline: React.FC<TruieStatutPipelineProps> = ({
  basePath,
  etapes,
  total,
}) => {
  const navigate = useNavigate();
  const safeTotal = total > 0 ? total : 1;

  return (
    <div
      role="group"
      aria-label="Pipeline reproduction truies"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <h2 className="agritech-heading text-[13px] uppercase tracking-wide">
          Pipeline reproduction
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-text-2">
          Funnel cycle
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {etapes.map((etape, idx) => {
          const Icon = ICONS[etape.key];
          const styles = TONE_STYLES[etape.tone];
          const pct = Math.min(100, Math.round((etape.count / safeTotal) * 100));
          const barWidth = etape.count > 0 ? Math.max(pct, 6) : 0;

          return (
            <button
              key={etape.key}
              type="button"
              onClick={() => navigate(`${basePath}?statut=${etape.key}`)}
              aria-label={`${etape.label} · ${etape.count} truies — ouvrir la liste filtrée`}
              style={{ transitionDelay: `${idx * 50}ms` }}
              className={cn(
                'pressable card-dense text-left flex flex-col gap-2',
                'transition-colors duration-[220ms]',
                'hover:border-text-2',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                styles.border,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-md bg-bg-2 shrink-0',
                    styles.icon,
                  )}
                  aria-hidden="true"
                >
                  <Icon size={16} />
                </span>
                <span className="font-mono tabular-nums text-[28px] font-bold leading-none text-text-0">
                  {etape.count}
                </span>
              </div>

              <div className="font-mono text-[10px] uppercase tracking-wide text-text-2 leading-tight">
                {etape.label}
              </div>

              <div
                className="h-1 w-full bg-bg-2 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={etape.count}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={`${etape.label} ${etape.count} sur ${total}`}
              >
                <div
                  className={cn('h-full rounded-full transition-[width]', styles.bar)}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TruieStatutPipeline;
