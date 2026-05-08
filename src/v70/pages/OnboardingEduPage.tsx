/**
 * V70 — Onboarding éducatif (Phase 6 niveau C)
 *
 * Tutoriel 5 étapes skippables présentant les concepts clés PorcTrack :
 * 1. Bienvenue + cycle truie
 * 2. Alertes automatiques
 * 3. Ajouter une truie
 * 4. Enregistrer une saillie
 * 5. Comprendre les KPIs (ISSE, marge)
 *
 * Réintégrable depuis Réglages → "Refaire le tutoriel".
 */
import React, { useState } from 'react';
import { PageHeader } from '../components/ds/PageHeader';
import { Card } from '../components/ds/Card';
import { Button } from '../components/ds/Button';
import { PigSilhouette } from '../components/v70/icons/PigSilhouette';

interface OnboardingStep {
  title: string;
  content: string;
  illustration?: React.ReactNode;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Bienvenue dans PorcTrack',
    content:
      "Voici comment fonctionne le cycle d'une truie : saillie → écho J28 → mise-bas J115 → maternité → sevrage J143 → retour chaleur J3-7.",
    illustration: <PigSilhouette size={64} strokeWidth={1.25} />,
  },
  {
    title: '14+ alertes automatiques',
    content:
      "PorcTrack veille pour toi : mise-bas imminente, sevrage dû, retour chaleur, mortalité anormale, stocks critiques. Tu n'oublies rien.",
    illustration: '🔔',
  },
  {
    title: 'Ajouter ta première truie',
    content:
      'Va dans Élevage → onglet Truies → tape le bouton + en bas à droite. Renseigne le code (ex T-001), boucle, statut.',
    illustration: '➕',
  },
  {
    title: 'Enregistrer une saillie',
    content:
      "Sur la fiche truie → \"+ Saisir évènement\" → Saillie. Note J0, choisis le verrat. PorcTrack calcule automatiquement la date prévue de mise-bas.",
    illustration: '❤',
  },
  {
    title: 'Comprendre tes KPIs',
    content:
      "Performance → ISSE (porcelets sevrés/saillie, cible >12), Marge globale, Top bandes. Tu vois en un coup d'œil comment ton élevage se porte.",
    illustration: '📊',
  },
];

export interface OnboardingEduPageProps {
  onComplete?: () => void;
}

export const OnboardingEduPage: React.FC<OnboardingEduPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStep(step - 1);
  };

  return (
    <div
      style={{
        padding: 24,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageHeader
        eyebrow={`Étape ${step + 1} / ${STEPS.length}`}
        title="Tutoriel PorcTrack"
        subtitle="Découvre les concepts clés en 2 minutes"
      />
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card>
          <div style={{ textAlign: 'center', padding: 24 }}>
            {current.illustration && (
              <div style={{ fontSize: 64, marginBottom: 16 }}>{current.illustration}</div>
            )}
            <h2
              style={{
                fontFamily: 'var(--pt-font-display, sans-serif)',
                fontSize: 24,
                marginBottom: 12,
                textTransform: 'uppercase',
              }}
            >
              {current.title}
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--pt-ink, #0f1a14)',
              }}
            >
              {current.content}
            </p>
          </div>
        </Card>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
        }}
      >
        <Button variant="ghost" size="sm" onClick={() => onComplete?.()}>
          Passer
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isFirst && (
            <Button variant="secondary" size="sm" onClick={handlePrev}>
              ← Précédent
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={handleNext}>
            {isLast ? 'Terminer' : 'Suivant →'}
          </Button>
        </div>
      </div>
    </div>
  );
};
