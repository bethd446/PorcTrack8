import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent, IonToast, IonLoading
} from '@ionic/react';
import { ChevronRight, Box, CheckCircle2, Shield } from 'lucide-react';
import { CONTROLE_QUESTIONS } from './questions';
import { appendRow } from '../../services/googleSheets';
import { enqueueAppendRow } from '../../services/offlineQueue';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { Chip } from '../../components/agritech';

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
    const now = new Date();
    const porcher = localStorage.getItem('user_name') || 'Porcher K13';
    const deviceId = localStorage.getItem('device_id') || 'DEV-UNKNOWN';

    // Schéma canonique NOTES_TERRAIN (5 colonnes) :
    //   DATE | TYPE_ANIMAL | ID_ANIMAL | NOTE | AUTEUR
    // TYPE_ANIMAL = 'CONTROLE' pour les audits quotidiens.
    // ID_ANIMAL   = clef de la question (Q1, Q2, …).
    // NOTE        = texte structuré Question / Réponse / Détails.
    const noteText =
      `Question: ${question.text}\n` +
      `Réponse: ${answer}` +
      (details ? `\nDétails: ${details}` : '') +
      `\n[device: ${deviceId}]`;

    const values = [
      now.toISOString().slice(0, 10), // DATE YYYY-MM-DD
      'CONTROLE',                     // TYPE_ANIMAL
      question.id || 'Q',             // ID_ANIMAL = clef question
      noteText,                       // NOTE
      porcher,                        // AUTEUR
    ];

    try {
      const res = await appendRow('NOTES_TERRAIN', values);
      if (!res.success) {
        enqueueAppendRow('NOTES_TERRAIN', values);
        setToastMsg("Enregistré (file d'attente)");
        setShowToast(true);
      }
    } catch {
      enqueueAppendRow('NOTES_TERRAIN', values);
      setToastMsg('Enregistré (hors ligne)');
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
            <AgritechHeader
              title="Contrôle terminé"
              subtitle="Données synchronisées"
            />
            <div className="px-4 pt-8 pb-8 flex flex-col items-center text-center">
              <div
                className="inline-flex h-20 w-20 items-center justify-center rounded-md bg-bg-1 border border-accent/40 text-accent mb-6"
                aria-hidden="true"
              >
                <CheckCircle2 size={44} />
              </div>
              <h2 className="agritech-heading text-[24px] uppercase leading-none mb-2">
                Tour validé
              </h2>
              <p className="font-mono text-[12px] text-text-2 mb-10">
                Toutes les réponses ont été transmises au registre.
              </p>

              <div className="w-full space-y-3">
                {lastAnswer === 'Oui' && (
                  <button
                    type="button"
                    onClick={() => navigate('/stock')}
                    className="pressable w-full h-12 rounded-md bg-accent text-bg-0 text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-150 hover:bg-[color:var(--color-accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <Box size={16} aria-hidden="true" />
                    Ouvrir les stocks
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="pressable w-full h-11 rounded-md border border-border bg-bg-1 text-text-0 text-[12px] font-semibold active:scale-[0.97] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Retour au cockpit
                </button>
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
          <AgritechHeader
            title="Audit terrain"
            subtitle={`Contrôle quotidien · ${currentStep + 1}/${CONTROLE_QUESTIONS.length}`}
            backTo="/"
            action={
              <Chip
                label={`Q${currentStep + 1}/${CONTROLE_QUESTIONS.length}`}
                size="xs"
                tone="accent"
              />
            }
          />

          <div className="px-4 pt-5 pb-10">
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
                className="absolute inset-y-0 left-0 bg-accent rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${((currentStep + 1) / CONTROLE_QUESTIONS.length) * 100}%`,
                }}
              />
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-text-2">
              Étape {currentStep + 1} sur {CONTROLE_QUESTIONS.length}
            </p>

            {/* CTA / question card */}
            <section
              className="card-dense mt-5 border-l-2 border-l-accent"
              aria-label="Question en cours"
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
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleAnswer(opt)}
                    className="pressable w-full flex items-center justify-between gap-3 px-4 py-3 rounded-md bg-bg-0 border border-border text-text-0 text-[14px] font-semibold text-left transition-colors duration-150 hover:border-accent/60 hover:bg-bg-2 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <span>{opt}</span>
                    <ChevronRight size={16} className="text-text-2" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-wide text-text-2">
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
