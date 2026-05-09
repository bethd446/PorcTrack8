import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent, IonToast, IonLoading
} from '@ionic/react';
import { ChevronRight, Box, CheckCircle2, Shield } from 'lucide-react';
import { CONTROLE_QUESTIONS } from './questions';
import { insertNote } from '../../services/supabaseWrites';
import AgritechLayout from '../../components/AgritechLayout';
import TopBarSync from '../../components/design/TopBarSync';
import { Chip } from '../../components/agritech';
import { Button, PageHeader, Section } from '@/design-system';
import { kvGet } from '../../services/kvStore';

const ControleQuotidien: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [lastAnswer, setLastAnswer] = useState('');

  const question = CONTROLE_QUESTIONS[currentStep];

  const handleAnswer = async (answer: string): Promise<void> => {
    setLoading(true);
    setLastAnswer(answer);
    const porcher = kvGet('user_name') || 'Porcher K13';
    const deviceId = kvGet('device_id') || 'DEV-UNKNOWN';

    const noteText =
      `[${question.id || 'Q'}] Question: ${question.text}\n` +
      `Réponse: ${answer}` +
      (details ? `\nDétails: ${details}` : '') +
      `\n[device: ${deviceId}] [auteur: ${porcher}]`;

    try {
      await insertNote({
        content: noteText,
        category: 'AUDIT_QUOTIDIEN',
      });
    } catch (e) {
      setToastMsg(`Erreur d'enregistrement: ${String(e)}`);
      setShowToast(true);
    }

    setLoading(false);
    setDetails('');

    if (currentStep < CONTROLE_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsFinished(true);
    }
  };

  // ── Écran de fin ──────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout withNav={false}>
            <TopBarSync
              crumbs={[{ label: "Aujourd'hui", href: '/today' }, 'Audit terrain']}
              onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
            />
            <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
              <PageHeader
                eyebrow="Outils · Audit"
                title="Contrôle terminé"
                subtitle="Questionnaire quotidien"
              />

              <div className="flex flex-col items-center text-center">
              <div
                className="inline-flex h-20 w-20 items-center justify-center rounded-md bg-bg-1 border border-accent/40 text-accent mb-6"
                aria-hidden="true"
              >
                <CheckCircle2 size={44} />
              </div>
              <h2 className="agritech-heading text-[24px] uppercase leading-none mb-2">
                Tour validé
              </h2>
              <p className="text-[12px] text-text-2 mb-10">
                Toutes les réponses ont été enregistrées.
              </p>

              <div className="w-full space-y-3">
                {lastAnswer === 'Oui' && (
                  <Button variant="primary" fullWidth onClick={() => navigate('/ressources/aliments')}>
                    <Box size={16} aria-hidden="true" />
                    Ouvrir les stocks
                  </Button>
                )}

                <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
                  Retour au cockpit
                </Button>
              </div>
              </div>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  // ── Écran principal / question ────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={false}>
          <TopBarSync
            crumbs={['Outils', 'Audit terrain']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <PageHeader
              eyebrow="Outils · Audit"
              title="Audit terrain"
              subtitle="Questionnaire quotidien"
            />

            <Section label="PROGRESSION" />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: -4,
              }}
            >
              <Chip
                label={`Q${currentStep + 1}/${CONTROLE_QUESTIONS.length}`}
                size="xs"
                tone="accent"
              />
            </div>

            {/* Progress bar */}
            <div
              className="relative h-1.5 w-full rounded-full bg-bg-2 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={CONTROLE_QUESTIONS.length}
              aria-valuenow={currentStep + 1}
              aria-label="Progression de l'audit"
            >
              <div
                className="absolute inset-y-0 left-0 bg-accent rounded-full"
                style={{
                  width: `${((currentStep + 1) / CONTROLE_QUESTIONS.length) * 100}%`,
                  transition: 'all var(--duration-transition) var(--ease-emil)',
                }}
              />
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-text-2">
              Étape {currentStep + 1} sur {CONTROLE_QUESTIONS.length}
            </p>

            <Section label="QUESTION EN COURS" />

            {/* CTA / question card */}
            <section
              className="card-dense"
              aria-label="Question en cours"
              style={{ marginTop: -4 }}
            >
              <div className="flex items-start gap-3 mb-4">
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-accent"
                  aria-hidden="true"
                >
                  <Shield size={16} />
                </span>
                <div className="min-w-0">
                  <div className="kpi-label">Question</div>
                  <h2 className="agritech-heading mt-1 text-[20px] leading-tight text-text-0">
                    {question.text}
                  </h2>
                </div>
              </div>

              {question.type === 'mixed' && (
                <div className="mb-4">
                  <label htmlFor="ctrl-details" className="kpi-label block mb-2">
                    Détails
                  </label>
                  <textarea
                    id="ctrl-details"
                    placeholder={question.placeholder}
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    rows={4}
                    className="w-full rounded-md bg-bg-0 border border-border p-3 text-text-0 placeholder-text-2 text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
              )}

              {/* Response options */}
              <div className="space-y-2" role="group" aria-label="Réponses possibles">
                {question.options.map(opt => (
                  <Button
                    key={opt}
                    variant="secondary"
                    fullWidth
                    onClick={() => handleAnswer(opt)}
                    className="!justify-between !text-left !rounded-md !px-4 !py-3"
                  >
                    <span>{opt}</span>
                    <ChevronRight size={16} className="text-text-2" aria-hidden="true" />
                  </Button>
                ))}
              </div>
            </section>

            <p className="mt-6 text-center text-[10px] uppercase tracking-wide text-text-2">
              PorcTrack · registre audité
            </p>
          </div>
        </AgritechLayout>

        <IonLoading
          isOpen={loading}
          message="Transmission sécurisée..."
          spinner="crescent"
        />
        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={2000}
          onDidDismiss={() => setShowToast(false)}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default ControleQuotidien;
