import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent, IonTextarea, IonToast, IonLoading, IonButton
} from '@ionic/react';
import { ChevronRight, Box, CheckCircle2 } from 'lucide-react';
import { CONTROLE_QUESTIONS } from './questions';
import { appendRow } from '../../services/googleSheets';
import { enqueueAppendRow } from '../../services/offlineQueue';

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

  const handleAnswer = async (answer: string) => {
    setLoading(true);
    setLastAnswer(answer);
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR');
    const porcher = localStorage.getItem('user_name') || 'Porcher A130';
    const deviceId = localStorage.getItem('device_id') || 'DEV-UNKNOWN';
    const noteId = `NOTE-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const values = [
      noteId,
      now.toISOString(),
      dateStr,
      timeStr,
      porcher,
      'CONTROLE_QUOTIDIEN',
      question.text,
      answer,
      details,
      'APP',
      deviceId
    ];

    try {
      const res = await appendRow('NOTES_TERRAIN', values);
      if (!res.success) {
          enqueueAppendRow('NOTES_TERRAIN', values);
          setToastMsg('Enregistré (file d\'attente)');
          setShowToast(true);
      }
    } catch (e) {
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

  if (isFinished) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="premium-header-full flex flex-col items-center justify-center p-10 text-center text-white">
            <div className="w-24 h-24 bg-white/10 rounded-[24px] flex items-center justify-center mb-8 shadow-2xl shadow-black/20">
              <CheckCircle2 size={52} className="text-accent-400" />
            </div>
            <h1 className="ft-heading text-3xl mb-2 uppercase tracking-tight">Contrôle Terminé</h1>
            <p className="text-accent-100/40 text-[11px] font-bold uppercase mb-12">Données synchronisées avec succès</p>

            <div className="w-full space-y-4">
              {lastAnswer === 'Oui' && (
                  <button
                      onClick={() => navigate('/stock')}
                      className="pressable premium-btn bg-white text-accent-600 w-full font-bold uppercase py-5 rounded-xl shadow-xl flex items-center justify-center gap-3"
                  >
                      <Box size={20} />
                      Ouvrir les Stocks
                  </button>
              )}

              <button
                  onClick={() => navigate('/')}
                  className="pressable w-full py-4 text-[11px] font-bold uppercase text-accent-400"
              >
                  Retour au Dashboard
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="premium-header-full p-8 pt-20">
          {/* Decorative background elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Progress Indicator */}
          <div className="mb-12 relative z-10">
            <div className="flex gap-2 mb-4">
               {CONTROLE_QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-[160ms] ${
                       i <= currentStep ? 'bg-accent-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'bg-white/10'
                    }`}
                  />
               ))}
            </div>
            <p className="text-[11px] font-bold tracking-[4px] text-accent-400 uppercase">
              Audit Terrain • {currentStep + 1} / {CONTROLE_QUESTIONS.length}
            </p>
          </div>

          {/* Question Text */}
          <div className="flex-1 relative z-10">
            <h1 className="ft-heading text-white text-4xl leading-tight mb-12 tracking-tighter">
              {question.text}
            </h1>

            {question.type === 'mixed' && (
                <div className="mb-8">
                    <textarea
                        placeholder={question.placeholder}
                        value={details}
                        onChange={e => setDetails(e.target.value)}
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-[20px] p-6 text-white placeholder-white/20 text-lg outline-none focus:ring-2 focus:ring-accent-600 transition-shadow shadow-inner"
                    />
                </div>
            )}

            {/* Response Options */}
            <div className="space-y-4">
              {question.options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="pressable w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-[20px] p-8 text-white text-xl font-bold text-left flex justify-between items-center active:scale-[0.97] active:bg-white/20 transition-[transform,background-color] group shadow-lg"
                >
                    <span className="tracking-tight">{opt}</span>
                    <ChevronRight size={20} className="text-white/20 group-active:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-12 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/20 rounded-full border border-white/5">
               <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
               <p className="text-[11px] font-bold tracking-[3px] text-white/30 uppercase">
                 PorcTrack Engineering • Secure V5
               </p>
            </div>
          </div>
        </div>

        <IonLoading isOpen={loading} message="Transmission sécurisée..." spinner="crescent" cssClass="premium-loading" />
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
