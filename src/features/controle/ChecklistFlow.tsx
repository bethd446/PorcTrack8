import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent, IonToast,
  IonSelect, IonSelectOption, IonDatetime, IonSpinner
} from '@ionic/react';
import {
  CheckCircle2,
  ChevronLeft, Send, AlertCircle
} from 'lucide-react';
import {
  getChecklistItems,
  loadChecklistDefinitions,
  type ChecklistItem as BaseChecklistItem,
} from '../../services/checklistService';
import { CONTROLE_QUESTIONS } from './questions';
import { appendRow, updateRowById, readTableByKey } from '../../services/googleSheets';
import { enqueueAppendRow, enqueueUpdateRow } from '../../services/offlineQueue';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { Chip } from '../../components/agritech';

// Consumed shape: the service-provided ChecklistItem + legacy UPPERCASE aliases
// still emitted by some sheets paths.
type ChecklistItem = BaseChecklistItem & {
  CIBLE_TABLE?: string;
  TEXTE_AFFICHE?: string;
  TYPE_REP?: string;
  OPTIONS?: string;
  CHAMP?: string;
};

interface ContextOption {
  id: string;
  label: string;
}

const ChecklistFlow: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<ChecklistItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  // Context Data
  const [contextData, setContextData] = useState<{
    bandes: ContextOption[];
    stocks: ContextOption[];
    truies: ContextOption[];
  }>({ bandes: [], stocks: [], truies: [] });

  const [selectedContextId, setSelectedContextId] = useState<string>('');
  const [sessionBandeId, setSessionBandeId] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [details, setDetails] = useState('');

  const loadData = useCallback(async (): Promise<void> => {
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
        items = fallback as ChecklistItem[];
      }

      setQuestions(items);

      // Pre-fetch contexts if needed
      const [bandeRes, stockRes, truieRes] = await Promise.all([
        readTableByKey('PORCELETS_BANDES_DETAIL'),
        readTableByKey('STOCK_ALIMENTS'),
        readTableByKey('SUIVI_TRUIES_REPRODUCTION'),
      ]);

      setContextData({
        bandes: bandeRes.success ? bandeRes.rows.map(r => ({ id: r[0], label: r[0] })) : [],
        stocks: stockRes.success ? stockRes.rows.map(r => ({ id: r[0], label: r[1] })) : [],
        truies: truieRes.success ? truieRes.rows.map(r => ({ id: r[0], label: r[0] })) : [],
      });
    } finally {
      setInitialLoading(false);
    }
  }, [name]);

  useEffect(() => {
    // Legitimate I/O: async fetch of checklist questions + context tables
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const currentQuestion = questions[currentStep];

  const contextOptions = useMemo((): ContextOption[] => {
    if (!currentQuestion) return [];
    const table = String(currentQuestion.CIBLE_TABLE).toUpperCase();
    if (table === 'PORCELETS_BANDES' || table === 'PORCELETS_BANDES_DETAIL') return contextData.bandes;
    if (table.startsWith('STOCK')) return contextData.stocks;
    if (table.includes('TRUIE')) return contextData.truies;
    return [];
  }, [currentQuestion, contextData]);

  const needsContext = contextOptions.length > 0;

  const handleNext = async (): Promise<void> => {
    if (!answer && currentQuestion.TYPE_REP !== 'text') {
      setToastMsg('Veuillez répondre à la question');
      setShowToast(true);
      return;
    }

    if (currentQuestion.TYPE_REP === 'number') {
      const num = Number(answer);
      if (isNaN(num) || num < 0) {
        setToastMsg('Veuillez saisir un nombre valide (>= 0)');
        setShowToast(true);
        return;
      }
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
        // Schéma canonique NOTES_TERRAIN (5 colonnes) :
        //   DATE | TYPE_ANIMAL | ID_ANIMAL | NOTE | AUTEUR
        // ID_ANIMAL = nom checklist (ex: 'DAILY', 'VENDREDI') pour pouvoir
        //             retrouver la réponse par checklist.
        // NOTE      = texte structuré Question / Réponse / Détails + contextId éventuel.
        const noteText =
          `Question: ${currentQuestion.TEXTE_AFFICHE}\n` +
          `Réponse: ${answer}` +
          (details ? `\nDétails: ${details}` : '') +
          (contextId ? `\n[sujet: ${contextId}]` : '');
        const values = [
          now.toISOString().slice(0, 10),       // DATE YYYY-MM-DD
          'CHECKLIST',                           // TYPE_ANIMAL
          (name || 'DAILY').toUpperCase(),       // ID_ANIMAL = nom checklist
          noteText,                              // NOTE
          porcher,                               // AUTEUR
        ];
        const res = await appendRow('NOTES_TERRAIN', values);
        if (!res.success) enqueueAppendRow('NOTES_TERRAIN', values);
      } else if (table === 'SANTE') {
        const values = [
          timestamp,
          needsContext ? 'CIBLE' : 'GENERAL',
          contextId || 'GLOBAL',
          'CONTROLE',
          currentQuestion.TEXTE_AFFICHE ?? '',
          `Réponse: ${answer}. Obs: ${details}`,
          porcher,
        ];
        const res = await appendRow('JOURNAL_SANTE', values);
        if (!res.success) enqueueAppendRow('JOURNAL_SANTE', values);
      } else {
        const patch = { [String(currentQuestion.CHAMP)]: answer };
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
        // Log completion — schéma canonique 5 cols avec marker 'CHECKLIST_DONE'
        // détectable dans la NOTE (col 4) pour isChecklistDoneToday().
        const checklistName = name?.toUpperCase() || 'DAILY';
        await appendRow('NOTES_TERRAIN', [
          now.toISOString().slice(0, 10),
          'CHECKLIST',
          checklistName,
          `CHECKLIST_DONE: Checklist ${checklistName} terminée`,
          porcher,
        ]);
        setIsFinished(true);
      }
    } catch {
      setToastMsg("Erreur lors de l'enregistrement");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Initial loading ──────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout withNav={false}>
            <AgritechHeader title="Chargement" subtitle="Préparation du parcours" />
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <IonSpinner name="crescent" style={{ color: 'var(--color-accent)' }} />
              <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-text-2">
                Initialisation…
              </p>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  // ── Écran de fin ─────────────────────────────────────────────────────
  if (isFinished) {
    const isFriday = name?.toUpperCase() === 'VENDREDI';
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout withNav={false}>
            <AgritechHeader
              title={isFriday ? 'Bilan hebdo' : 'Mission terminée'}
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
                {isFriday ? 'Bilan validé' : 'Tour validé'}
              </h2>
              <p className="font-mono text-[12px] text-text-2 mb-8">
                Registre mis à jour · {questions.length} questions répondues
              </p>

              {isFriday && (
                <div
                  className="card-dense w-full mb-8 space-y-3"
                  aria-label="Résumé hebdomadaire"
                >
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="kpi-label">Module</span>
                    <span className="font-mono text-[12px] font-semibold text-text-0 uppercase">
                      S38 2026
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="kpi-label">Questions</span>
                    <span className="font-mono text-[12px] font-semibold text-text-0 tabular-nums">
                      {questions.length} / {questions.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="kpi-label">Statut</span>
                    <span className="font-mono text-[12px] font-semibold text-accent uppercase">
                      100% validé
                    </span>
                  </div>
                </div>
              )}

              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="pressable w-full h-12 rounded-md bg-accent text-bg-0 text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-150 hover:bg-[color:var(--color-accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Retour au cockpit
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/audit')}
                  className="pressable w-full h-11 rounded-md border border-border bg-bg-1 text-text-0 text-[12px] font-semibold active:scale-[0.97] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Voir les alertes d'audit
                </button>
              </div>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  // ── Écran d'erreur (pas de questions) ────────────────────────────────
  if (!currentQuestion) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout withNav={false}>
            <AgritechHeader title="Erreur" subtitle="Questions introuvables" backTo="/" />
            <div className="px-4 pt-10 flex flex-col items-center text-center">
              <div
                className="inline-flex h-16 w-16 items-center justify-center rounded-md bg-bg-1 border border-red/40 text-red mb-5"
                aria-hidden="true"
              >
                <AlertCircle size={32} />
              </div>
              <h2 className="agritech-heading text-[20px] uppercase leading-none mb-2">
                Erreur de chargement
              </h2>
              <p className="font-mono text-[11px] text-text-2 mb-8 max-w-xs">
                Impossible de trouver les questions pour cette checklist.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="pressable h-11 px-6 rounded-md bg-accent text-bg-0 text-[12px] font-semibold flex items-center justify-center active:scale-[0.97] transition-transform duration-150 hover:bg-[color:var(--color-accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                Retour
              </button>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  const options = currentQuestion.OPTIONS
    ? String(currentQuestion.OPTIONS).split(',').map(o => o.trim())
    : [];
  const typeRep = String(currentQuestion.TYPE_REP || '');
  const progressPct = ((currentStep + 1) / questions.length) * 100;
  const currentTable = String(currentQuestion.CIBLE_TABLE).toUpperCase();
  const isBandeContext = ['PORCELETS_BANDES', 'PORCELETS_BANDES_DETAIL'].includes(currentTable);

  // ── Flow principal ───────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={false}>
          <AgritechHeader
            title={(name || 'Contrôle').toString()}
            subtitle={`Étape ${currentStep + 1} / ${questions.length}`}
            backTo="/"
            action={
              <Chip
                label={`${currentStep + 1}/${questions.length}`}
                tone="accent"
                size="xs"
              />
            }
          />

          <div className="px-4 pt-4 pb-10">
            {/* Progress bar */}
            <div
              className="relative h-1.5 w-full rounded-full bg-bg-2 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={currentStep + 1}
              aria-label="Progression de la checklist"
            >
              <div
                className="absolute inset-y-0 left-0 bg-accent rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Context selector */}
            {needsContext && (
              <div className="mt-5">
                <label className="kpi-label block mb-2">
                  {sessionBandeId && isBandeContext
                    ? `Bande active · ${sessionBandeId}`
                    : "Sujet de l'audit"}
                </label>
                <div className="rounded-md bg-bg-1 border border-border overflow-hidden">
                  <IonSelect
                    value={selectedContextId || sessionBandeId}
                    onIonChange={e => {
                      setSelectedContextId(e.detail.value);
                      if (isBandeContext) {
                        setSessionBandeId(e.detail.value);
                      }
                    }}
                    placeholder="Sélectionner…"
                    interface="action-sheet"
                    style={
                      {
                        '--color': 'var(--color-text-0)',
                        '--placeholder-color': 'var(--color-text-2)',
                        '--placeholder-opacity': '1',
                        color: 'var(--color-text-0)',
                      } as React.CSSProperties
                    }
                    className="w-full px-3 h-12 font-mono text-[13px]"
                  >
                    {contextOptions.map(opt => (
                      <IonSelectOption key={opt.id} value={opt.id}>
                        {opt.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
              </div>
            )}

            {/* Question card */}
            <section
              className="card-dense mt-5 border-l-2 border-l-accent"
              aria-label="Question"
            >
              <div className="kpi-label">Question</div>
              <h2 className="agritech-heading mt-2 text-[20px] leading-tight text-text-0">
                {currentQuestion.TEXTE_AFFICHE}
              </h2>

              <div className="mt-4 space-y-2">
                {/* bool / enum */}
                {(typeRep === 'bool' || typeRep === 'enum') && (
                  <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Choix">
                    {(typeRep === 'bool' ? ['OUI', 'NON'] : options).map(opt => {
                      const selected = answer === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setAnswer(opt)}
                          className={
                            'pressable w-full flex items-center justify-between gap-3 px-4 py-3 rounded-md border text-[14px] font-semibold text-left transition-colors duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ' +
                            (selected
                              ? 'bg-bg-2 border-accent text-text-0'
                              : 'bg-bg-0 border-border text-text-1 hover:border-accent/60 hover:text-text-0')
                          }
                        >
                          <span>{opt}</span>
                          {selected ? (
                            <CheckCircle2
                              size={16}
                              className="text-accent"
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* number */}
                {typeRep === 'number' && (
                  <div>
                    <label htmlFor="ck-number" className="kpi-label block mb-2">
                      Valeur numérique
                    </label>
                    <input
                      id="ck-number"
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      className="w-full h-16 rounded-md bg-bg-0 border border-border px-4 text-center text-text-0 placeholder-text-2 font-mono text-[32px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    />
                  </div>
                )}

                {/* text */}
                {typeRep === 'text' && (
                  <div>
                    <label htmlFor="ck-text" className="kpi-label block mb-2">
                      Observation
                    </label>
                    <textarea
                      id="ck-text"
                      placeholder="Saisir votre observation…"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      rows={5}
                      className="w-full rounded-md bg-bg-0 border border-border p-3 text-text-0 placeholder-text-2 text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors min-h-[160px]"
                    />
                  </div>
                )}

                {/* date */}
                {typeRep === 'date' && (
                  <div className="rounded-md bg-bg-1 border border-border overflow-hidden">
                    <IonDatetime
                      presentation="date"
                      value={answer || new Date().toISOString()}
                      onIonChange={e => {
                        const v = e.detail.value;
                        if (typeof v === 'string') setAnswer(v);
                      }}
                      className="mx-auto"
                      style={
                        {
                          '--background': 'var(--color-bg-1)',
                          '--color': 'var(--color-text-0)',
                        } as React.CSSProperties
                      }
                    />
                  </div>
                )}
              </div>

              {/* Optional details */}
              {typeRep !== 'text' && (
                <div className="mt-4">
                  <label htmlFor="ck-details" className="kpi-label block mb-2">
                    Note complémentaire (optionnel)
                  </label>
                  <input
                    id="ck-details"
                    type="text"
                    placeholder="Détails…"
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    className="w-full h-10 rounded-md bg-bg-0 border border-border px-3 text-text-0 placeholder-text-2 text-[13px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
              )}
            </section>

            {/* Footer actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                disabled={currentStep === 0}
                aria-label="Étape précédente"
                className="pressable inline-flex h-12 w-12 items-center justify-center rounded-md border border-border bg-bg-1 text-text-1 active:scale-[0.96] transition-transform duration-150 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="pressable flex-1 h-12 rounded-md bg-accent text-bg-0 text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-40 transition-[transform,opacity] duration-150 hover:bg-[color:var(--color-accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                {loading ? (
                  <IonSpinner name="crescent" />
                ) : (
                  <>
                    <span>
                      {currentStep === questions.length - 1 ? 'Terminer' : 'Suivant'}
                    </span>
                    <Send size={14} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </AgritechLayout>

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={3000}
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default ChecklistFlow;
