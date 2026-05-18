/**
 * PhaseTransitionModal — popup de confirmation de changement de phase.
 *
 * Affiché quand le moteur phaseEngine détecte qu'une bande devrait
 * passer à la phase biologique suivante.
 */
import React, { useState } from 'react';
import { IonModal } from '@ionic/react';
import { ArrowRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import PhaseBadge, { type Phase } from '../design/PhaseBadge';
import type { PendingTransition, PhaseAvecSortie } from '../../services/phaseEngine';
import { Button } from '@/design-system';

// ─── Labels FR pour chaque phase ─────────────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  SOUS_MERE:     'Maternité',
  POST_SEVRAGE:  'Post-sevrage',
  CROISSANCE:    'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION:      'Finition',
  SORTIE:        'Sortie abattoir',
};

const PHASE_TO_DESIGN: Record<string, Phase> = {
  SOUS_MERE:     'mater',
  POST_SEVRAGE:  'sevr',
  CROISSANCE:    'crois',
  ENGRAISSEMENT: 'engr',
  FINITION:      'finit',
  SORTIE:        'sortie',
};

function isCritical(toPhase: PhaseAvecSortie): boolean {
  return toPhase === 'SORTIE';
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PhaseTransitionModalProps {
  transition: PendingTransition | null;
  isOpen: boolean;
  /** Appelé avec la transition + poids optionnel (SORTIE uniquement). */
  onConfirm: (transition: PendingTransition, poidsKg?: number) => void;
  onDismiss: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

const PhaseTransitionModal: React.FC<PhaseTransitionModalProps> = ({
  transition,
  isOpen,
  onConfirm,
  onDismiss,
}) => {
  const [poids, setPoids] = useState('');

  if (!transition) return null;

  const needsPoids = transition.toPhase === 'SORTIE';
  const critical = isCritical(transition.toPhase);

  const handleConfirm = (): void => {
    const poidsKg = needsPoids && poids ? parseFloat(poids) : undefined;
    onConfirm(transition, poidsKg);
    setPoids('');
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <div className="flex flex-col gap-5 p-6 pt-8 bg-bg-0 min-h-[320px]">
        {/* Header */}
        <div className="flex items-center gap-3">
          {critical
            ? <AlertTriangle size={22} className="text-red shrink-0" />
            : <Clock size={22} className="text-amber shrink-0" />
          }
          <div>
            <p className="ft-heading text-[11px] uppercase tracking-wider text-text-2">
              Transition requise
            </p>
            <p className="font-bold text-[18px] text-text-0">
              {transition.label}
              {transition.ageJours !== null
                ? <span className="text-[13px] font-normal text-text-2 ml-2">J+{transition.ageJours}</span>
                : null}
            </p>
          </div>
        </div>

        {/* Flèche phases */}
        <div className="flex items-center justify-center gap-4 py-4 card-dense">
          <PhaseBadge
            phase={PHASE_TO_DESIGN[transition.fromPhase] ?? 'crois'}
            label={PHASE_LABEL[transition.fromPhase] ?? transition.fromPhase}
          />
          <ArrowRight size={16} className="text-text-2" />
          <PhaseBadge
            phase={PHASE_TO_DESIGN[transition.toPhase] ?? 'crois'}
            label={PHASE_LABEL[transition.toPhase] ?? transition.toPhase}
          />
        </div>

        {/* Justification de la transition (poids franchi vs âge biologique) */}
        {(transition.reason === 'POIDS_ATTEINT' || transition.reason === 'POIDS_ET_AGE')
          && transition.poidsReelKg !== undefined
          && transition.poidsSeuilKg !== undefined && (
          <p className="text-[12px] text-text-1 leading-snug">
            Poids {transition.poidsReelKg} kg ≥ seuil {transition.poidsSeuilKg} kg pour{' '}
            {PHASE_LABEL[transition.toPhase] ?? transition.toPhase}.
          </p>
        )}

        {/* Champ poids (SORTIE uniquement) */}
        {needsPoids && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="poids-confirmation"
              className="text-[12px] text-text-1 uppercase tracking-wide"
            >
              Poids actuel (kg)
            </label>
            <input
              id="poids-confirmation"
              type="number"
              inputMode="decimal"
              placeholder="ex : 112"
              value={poids}
              onChange={(e) => setPoids(e.target.value)}
              className="w-full h-12 rounded-lg bg-bg-2 border border-border px-4 font-mono text-[16px] text-text-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-auto">
          <Button
            type="button"
            variant="secondary"
            aria-label="Plus tard"
            onClick={onDismiss}
            className="pressable flex-1 h-12 border border-border text-[13px] text-text-2 hover:text-text-0 transition-colors"
            style={{ borderRadius: '0.75rem', height: '3rem' }}
          >
            Plus tard
          </Button>
          <Button
            type="button"
            variant={critical ? 'danger' : 'primary'}
            aria-label="Confirmer"
            onClick={handleConfirm}
            className={`pressable flex-[2] h-12 font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-colors ${
              critical ? 'bg-red' : 'bg-accent'
            }`}
            style={{ borderRadius: '0.75rem', height: '3rem' }}
          >
            <CheckCircle size={16} />
            {critical ? 'Confirmer sortie' : 'Confirmer'}
          </Button>
        </div>
      </div>
    </IonModal>
  );
};

export default PhaseTransitionModal;
