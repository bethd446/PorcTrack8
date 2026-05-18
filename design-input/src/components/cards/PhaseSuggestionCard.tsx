/**
 * PhaseSuggestionCard — carte de suggestion de transition de phase.
 *
 * Présente une PendingTransition avec un bouton "Confirmer" 1-tap
 * qui délègue l'ouverture du PhaseTransitionModal au parent.
 */
import React from 'react';
import { TrendingUp, Award, Truck, Clock, Check } from 'lucide-react';
import type { PendingTransition, PhaseAvecSortie } from '../../services/phaseEngine';
import { Button } from '@/design-system';

const PHASE_LABEL: Record<string, string> = {
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
  SORTIE: 'Sortie abattoir',
};

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const PHASE_ICON: Record<string, IconComponent> = {
  CROISSANCE: TrendingUp,
  ENGRAISSEMENT: TrendingUp,
  FINITION: Award,
  SORTIE: Truck,
};

function isCritical(toPhase: PhaseAvecSortie): boolean {
  return toPhase === 'SORTIE';
}

export interface PhaseSuggestionCardProps {
  /** Transition suggérée (issue de phaseEngine.detectPendingTransitions). */
  transition: PendingTransition;
  /** Display ID lisible de la bande (ex: "B-2026-04-01"). */
  bandeDisplayId: string;
  /** Callback lorsque l'utilisateur clique "Confirmer" — ouvre le modal côté parent. */
  onConfirm: () => void;
  /** Callback "Plus tard" (dismiss persistant côté parent). */
  onDismiss?: () => void;
}

const PhaseSuggestionCard: React.FC<PhaseSuggestionCardProps> = ({
  transition,
  bandeDisplayId,
  onConfirm,
  onDismiss,
}) => {
  const critical = isCritical(transition.toPhase);
  const Icon = PHASE_ICON[transition.toPhase] ?? Clock;
  const phaseLabel = PHASE_LABEL[transition.toPhase] ?? transition.toPhase;

  const hasPoidsInfo =
    (transition.reason === 'POIDS_ATTEINT' || transition.reason === 'POIDS_ET_AGE') &&
    transition.poidsReelKg !== undefined &&
    transition.poidsSeuilKg !== undefined;

  const description = hasPoidsInfo
    ? `${bandeDisplayId} · poids ${transition.poidsReelKg} kg ≥ ${transition.poidsSeuilKg} kg`
    : bandeDisplayId;

  return (
    <div className="bg-bg-1 rounded-xl p-3 border border-border flex flex-col gap-3">
      {/* Header : icône + titre + chip priorité */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <Icon size={16} className={critical ? 'text-red' : 'text-accent'} />
        </div>
        <p className="uppercase text-[12px] text-text-0 flex-1 truncate">
          Passage en {phaseLabel}
        </p>
        <span
          className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
            critical ? 'bg-red/15 text-red' : 'bg-accent/15 text-accent'
          }`}
        >
          {critical ? 'Sortie' : 'Phase'}
        </span>
      </div>

      {/* Description */}
      <p className="text-[12px] text-text-1 truncate">{description}</p>

      {/* Actions */}
      <div className="flex gap-2">
        {onDismiss && (
          <Button
            type="button"
            variant="secondary"
            aria-label="Plus tard"
            onClick={onDismiss}
            className="pressable flex-1 h-12 border border-border text-[13px] text-text-2 hover:text-text-0 transition-colors flex items-center justify-center gap-2"
            style={{ borderRadius: '0.75rem', height: '3rem' }}
          >
            <Clock size={14} />
            Plus tard
          </Button>
        )}
        <Button
          type="button"
          variant={critical ? 'danger' : 'primary'}
          aria-label="Confirmer"
          onClick={onConfirm}
          className={`pressable flex-[2] h-12 font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-colors ${
            critical ? 'bg-red' : 'bg-accent'
          }`}
          style={{ borderRadius: '0.75rem', height: '3rem' }}
        >
          <Check size={16} />
          Confirmer
        </Button>
      </div>
    </div>
  );
};

export default PhaseSuggestionCard;
