import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent, IonLoading, IonToast, IonButton,
  IonSelect, IonSelectOption, IonDatetime, IonInput, IonSpinner
} from '@ionic/react';
import {
  ChevronRight, CheckCircle2, X,
  Layers, Box, Stethoscope, Leaf,
  ChevronLeft, Send, AlertCircle
} from 'lucide-react';
import { getChecklistItems, loadChecklistDefinitions } from '../../services/checklistService';
import { CONTROLE_QUESTIONS } from './questions';
import { appendRow, updateRowById, readTableByKey } from '../../services/googleSheets';
import { enqueueAppendRow, enqueueUpdateRow } from '../../services/offlineQueue';

const ChecklistFlow: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  // Context Data
  const [contextData, setContextData] = useState<{
      bandes: any[],
      stocks: any[],
      truies: any[]
  }>({ bandes: [], stocks: [], truies: [] });

  const [selectedContextId, setSelectedContextId] = useState<string>('');
  const [sessionBandeId, setSessionBandeId] = useState<string>('');
  const [answer, setAnswer] = useState<any>('');
  const [details, setDetails] = useState('');

  const loadData = useCallback(async () => {
      setInitialLoading(true);
      try {
          // 1. Essai depuis le cache localStorage
          let items = getChecklistItems(name || 'DAILY');

          // 2. Cache vide → tenter de charger depuis Sheets
          if (items.length === 0) {
              await loadChecklistDefinitions();
              items = getChecklistItems(name || 'DAILY');
          }

          // 3. Toujours vide → fallback sur les questions locales codées en dur
          if (items.length === 0 && (name === 'DAILY' || !name)) {
              // Convertir CONTROLE_QUESTIONS (format local) → format ChecklistItem
              const fallback = CONTROLE_QUESTIONS.map((q, i) => ({
                  checklist: 'DAILY',
                  nr: i + 1,
                  idQuestion: q.id,
                  texteAffiche: q.text,
                  typeRep: q.type === 'choice' ? 'enum' : 'text',
                  options: q.options?.join(',') ?? '',
                  cibleTable: 'NOTES_TERRAIN',
                  champ: q.id,
                  TEXTE_AFFICHE: q.text,
                  TYPE_REP: q.type === 'choice' ? 'enum' : 'text',
                  OPTIONS: q.options?.join(',') ?? '',
                  CIBLE_TABLE: 'NOTES_TERRAIN',
                  CHAMP: q.id,
              }));
              items = fallback as any;
          }

          setQuestions(items);

          // Pre-fetch contexts if needed
          const [bandeRes, stockRes, truieRes] = await Promise.all([
              readTableByKey('PORCELETS_BANDES_DETAIL'),
              readTableByKey('STOCK_ALIMENTS'),
              readTableByKey('SUIVI_TRUIES_REPRODUCTION')
          ]);

          setContextData({
              bandes: bandeRes.success ? bandeRes.rows.map(r => ({ id: r[0], label: r[0] })) : [],
              stocks: stockRes.success ? stockRes.rows.map(r => ({ id: r[0], label: r[1] })) : [],
              truies: truieRes.success ? truieRes.rows.map(r => ({ id: r[0], label: r[0] })) : []
          });
      } finally {
          setInitialLoading(false);
      }
  }, [name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentQuestion = questions[currentStep];

  const contextOptions = useMemo(() => {
      if (!currentQuestion) return [];
      const table = String(currentQuestion.CIBLE_TABLE).toUpperCase();
      if (table === 'PORCELETS_BANDES' || table === 'PORCELETS_BANDES_DETAIL') return contextData.bandes;
      if (table.startsWith('STOCK')) return contextData.stocks;
      if (table.includes('TRUIE')) return contextData.truies;
      return [];
  }, [currentQuestion, contextData]);

  const needsContext = contextOptions.length > 0;

  const handleNext = async () => {
    if (!answer && currentQuestion.TYPE_REP !== 'text') {
        setToastMsg('Veuillez répondre à la question');
        setShowToast(true);
        return;
    }

    const contextId = needsContext ? (selectedContextId || sessionBandeId) : '';

    if (needsContext && !contextId) {
        setToastMsg('Veuillez sélectionner un sujet (Bande/Produit/Truie)');
        setShowToast(true);
        return;
    }

    setLoading(true);
    try {
        const table = String(currentQuestion.CIBLE_TABLE).toUpperCase();
        const now = new Date();
        const timestamp = now.toISOString();
        const porcher = localStorage.getItem('user_name') || 'Porcher A130';

        // Memory for session
        if (table === 'PORCELETS_BANDES' || table === 'PORCELETS_BANDES_DETAIL') {
            setSessionBandeId(contextId);
        }

        if (table === 'NOTES_TERRAIN' || !table || table === 'UNDEFINED') {
            const values = [
                timestamp,
                'CHECKLIST',
                contextId || name,
                answer,
                `Question: ${currentQuestion.TEXTE_AFFICHE}. Obs: ${details}`
            ];
            const res = await appendRow('NOTES_TERRAIN', values);
            if (!res.success) enqueueAppendRow('NOTES_TERRAIN', values);
        } else if (table === 'SANTE') {
             const values = [
                timestamp,
                needsContext ? 'CIBLE' : 'GENERAL',
                contextId || 'GLOBAL',
                'CONTROLE',
                currentQuestion.TEXTE_AFFICHE,
                `Réponse: ${answer}. Obs: ${details}`,
                porcher
            ];
            const res = await appendRow('JOURNAL_SANTE', values);
            if (!res.success) enqueueAppendRow('JOURNAL_SANTE', values);
        } else {
            const patch = { [currentQuestion.CHAMP]: answer };
            const res = await updateRowById(table, 'ID', contextId, patch);
            if (!res.success) enqueueUpdateRow(table, 'ID', contextId, patch);
        }

        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
            setAnswer('');
            setDetails('');
            // Reset context if NOT a context we want to remember
            if (!['PORCELETS_BANDES', 'PORCELETS_BANDES_DETAIL'].includes(table)) {
                setSelectedContextId('');
            }
        } else {
            // Log completion
            await appendRow('NOTES_TERRAIN', [
                timestamp,
                'CHECKLIST_DONE',
                name?.toUpperCase() || 'DAILY',
                'OK',
                `Checklist ${name} terminée`
            ]);
            setIsFinished(true);
        }
    } catch (e) {
        setToastMsg('Erreur lors de l\'enregistrement');
        setShowToast(true);
    } finally {
        setLoading(false);
    }
  };

  if (initialLoading) {
      return (
          <IonPage>
              <IonContent className="bg-accent-600 flex flex-col items-center justify-center">
                  <IonSpinner name="bubbles" color="light" />
                  <p className="text-white/40 text-[11px] font-bold uppercase mt-4">Initialisation du parcours...</p>
              </IonContent>
          </IonPage>
      );
  }

  if (isFinished) {
      const isFriday = name?.toUpperCase() === 'VENDREDI';
      return (
          <IonPage>
              <div className="h-full bg-accent-600 flex flex-col items-center justify-center p-10 text-center text-white">
                  <div className="w-24 h-24 bg-white/10 rounded-[24px] flex items-center justify-center mb-8 shadow-2xl shadow-black/20">
                    <CheckCircle2 size={48} className="text-accent-400" />
                  </div>
                  <h1 className="ft-heading text-3xl mb-2 uppercase tracking-tight">
                    {isFriday ? 'Bilan Hebdo Terminé' : 'Mission Terminée'}
                  </h1>
                  <p className="text-accent-100/40 text-[11px] font-bold uppercase mb-12">Données synchronisées avec succès</p>

                  {isFriday && (
                      <div className="bg-white/5 border border-white/10 p-6 rounded-[24px] w-full mb-12 space-y-4">
                          <div className="flex justify-between items-center border-b border-white/5 pb-3">
                              <span className="text-[11px] font-bold text-accent-300 uppercase">Module</span>
                              <span className="text-[11px] font-bold text-white uppercase">S38 2026</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-white/5 pb-3">
                              <span className="text-[11px] font-bold text-accent-300 uppercase">Questions</span>
                              <span className="text-[11px] font-bold text-white uppercase">{questions.length} / {questions.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-accent-300 uppercase">Statut</span>
                              <span className="text-[11px] font-bold text-accent-400 uppercase">100% Validé</span>
                          </div>
                      </div>
                  )}

                  <div className="w-full space-y-4">
                      <button onClick={() => navigate('/')} className="pressable premium-btn bg-white text-accent-900 w-full font-bold uppercase py-5 rounded-xl shadow-xl">Retour Dashboard</button>
                      <button onClick={() => navigate('/audit')} className="pressable w-full py-4 text-[11px] font-bold uppercase text-accent-300">Voir les Alertes Audit</button>
                  </div>
              </div>
          </IonPage>
      );
  }

  if (!currentQuestion) {
      return (
          <IonPage>
              <IonContent className="bg-accent-600 p-10 flex flex-col items-center justify-center">
                  <AlertCircle size={48} className="text-red-500 mb-4" />
                  <h2 className="ft-heading text-white uppercase">Erreur de chargement</h2>
                  <p className="text-white/40 text-xs text-center mt-2">Impossible de trouver les questions pour cette checklist.</p>
                  <button onClick={() => navigate('/')} className="pressable mt-8 premium-btn bg-white text-accent-900 px-8 py-3 rounded-xl font-bold uppercase text-xs">Retour</button>
              </IonContent>
          </IonPage>
      );
  }

  const options = currentQuestion.OPTIONS ? String(currentQuestion.OPTIONS).split(',').map(o => o.trim()) : [];

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="min-h-screen bg-accent-600 flex flex-col relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-400/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>

            <div className="p-8 pt-12 flex-1 flex flex-col z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/')} className="pressable w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white backdrop-blur-md" aria-label="Retour">
                        <X size={22} />
                    </button>
                    <div className="text-center">
                        <p className="text-[11px] font-bold text-accent-300 uppercase">{name || 'Contrôle'}</p>
                        <div className="flex gap-1 mt-1">
                            {questions.map((_, i) => (
                                <div key={i} className={`h-1 rounded-full transition-transform duration-[160ms] ${i === currentStep ? 'w-4 bg-white' : 'w-1 bg-white/20'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="w-10 h-10 flex items-center justify-center text-white/40 font-bold text-[11px]">
                        {currentStep + 1}/{questions.length}
                    </div>
                </div>

                {/* Context Selector (If needed) */}
                {needsContext && (
                    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
                        <label className="text-[11px] font-bold text-accent-300 uppercase px-2 block mb-3 opacity-60">
                            {sessionBandeId && ['PORCELETS_BANDES', 'PORCELETS_BANDES_DETAIL'].includes(String(currentQuestion.CIBLE_TABLE).toUpperCase())
                                ? `Bande active : ${sessionBandeId}`
                                : "Sujet de l'audit"}
                        </label>
                        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[20px] overflow-hidden flex items-center pr-4">
                            <IonSelect
                                value={selectedContextId || sessionBandeId}
                                onIonChange={e => {
                                    setSelectedContextId(e.detail.value);
                                    if (['PORCELETS_BANDES', 'PORCELETS_BANDES_DETAIL'].includes(String(currentQuestion.CIBLE_TABLE).toUpperCase())) {
                                        setSessionBandeId(e.detail.value);
                                    }
                                }}
                                placeholder="Sélectionner..."
                                className="premium-select-dark text-white font-bold uppercase text-sm h-16 px-5 flex-1"
                                interface="action-sheet"
                            >
                                {contextOptions.map(opt => (
                                    <IonSelectOption key={opt.id} value={opt.id}>{opt.label}</IonSelectOption>
                                ))}
                            </IonSelect>
                            {sessionBandeId && ['PORCELETS_BANDES', 'PORCELETS_BANDES_DETAIL'].includes(String(currentQuestion.CIBLE_TABLE).toUpperCase()) && (
                                <span className="text-[11px] font-bold text-accent-400 uppercase">Modifier</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Question Area */}
                <div className="flex-1 flex flex-col justify-center py-4">
                    <h2 className="ft-heading text-white text-3xl leading-tight tracking-tight mb-10">
                        {currentQuestion.TEXTE_AFFICHE}
                    </h2>

                    <div className="space-y-4">
                        {/* Renderer based on typeRep */}
                        {(currentQuestion.TYPE_REP === 'bool' || currentQuestion.TYPE_REP === 'enum') && (
                            <div className="grid grid-cols-1 gap-3">
                                {(currentQuestion.TYPE_REP === 'bool' ? ['OUI', 'NON'] : options).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setAnswer(opt)}
                                        className={`pressable w-full p-6 rounded-[20px] text-lg font-bold uppercase tracking-tight transition-[transform,colors] flex items-center justify-between border ${
                                            answer === opt
                                            ? 'bg-white text-accent-900 border-white shadow-xl shadow-white/10 scale-[1.02]'
                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        <span>{opt}</span>
                                        {answer === opt && <CheckCircle2 size={18} />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {currentQuestion.TYPE_REP === 'number' && (
                            <div className="bg-white/5 border border-white/10 rounded-[24px] p-8 focus-within:bg-white/10 transition-colors">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="w-full bg-transparent border-none text-white text-5xl font-bold outline-none placeholder-white/10 text-center"
                                    placeholder="0.0"
                                    value={answer}
                                    onChange={e => setAnswer(e.target.value)}
                                />
                                <p className="text-center text-[11px] font-bold text-accent-400 uppercase mt-4">Valeur numérique</p>
                            </div>
                        )}

                        {currentQuestion.TYPE_REP === 'text' && (
                             <textarea
                                className="w-full bg-white/5 border border-white/10 rounded-[24px] p-8 text-white text-lg font-medium outline-none placeholder-white/10 min-h-[200px]"
                                placeholder="Saisir votre observation..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                            />
                        )}

                        {currentQuestion.TYPE_REP === 'date' && (
                            <div className="bg-white rounded-xl overflow-hidden p-4">
                                <IonDatetime
                                    presentation="date"
                                    value={answer || new Date().toISOString()}
                                    onIonChange={e => setAnswer(e.detail.value)}
                                    className="mx-auto"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Optional Details */}
                {(currentQuestion.TYPE_REP !== 'text') && (
                    <div className="mt-8 mb-4">
                        <input
                            className="w-full bg-white/5 border-b border-white/10 py-4 text-white text-xs font-bold outline-none placeholder-white/20"
                            placeholder="Note complémentaire (optionnel)..."
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                        />
                    </div>
                )}

                {/* Footer Action */}
                <div className="pt-8 flex gap-4">
                    <button
                        onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                        className={`pressable w-16 h-16 rounded-[24px] flex items-center justify-center text-white/40 border border-white/10 active:bg-white/10 transition-colors ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                        aria-label="Étape précédente"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={loading}
                        className="pressable flex-1 h-16 bg-white text-accent-900 rounded-[24px] font-bold uppercase flex items-center justify-center gap-3 shadow-xl active:scale-[0.97] transition-transform duration-[160ms] disabled:opacity-50"
                    >
                        {loading ? <IonSpinner name="crescent" /> : (
                            <>
                                <span>{currentStep === questions.length - 1 ? 'Terminer' : 'Suivant'}</span>
                                <Send size={14} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={3000}
          onDidDismiss={() => setShowToast(false)}
          className="premium-toast"
        />
      </IonContent>
    </IonPage>
  );
};

export default ChecklistFlow;
