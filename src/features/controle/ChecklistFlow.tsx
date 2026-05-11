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
import {
  CHECKLIST_TEMPLATES,
  CHECKLIST_TEMPLATES_META,
  getCombinedTemplate,
  type ChecklistTemplateItem,
  type ChecklistTemplateKey,
} from '../../data/checklistTemplates';
import { getBandes, getStockAliments, getTruies } from '../../services/supabaseService';
import {
  insertNote,
  insertHealthLog,
  updateSowByCode,
  updateBatchByCode,
  updateProduitAliment,
  resolveProduitAlimentByCode,
} from '../../services/supabaseWrites';
import { Chip } from '../../components/agritech';
import { Button } from '@/design-system';
import { PageHeader } from '../../v70/components/ds/PageHeader';
import { kvGet } from '../../services/kvStore';

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

/**
 * Convertit un template métier (tableau d'items Q/R simples) en `ChecklistItem`
 * compatible avec le pipeline d'enregistrement existant. Les questions sont
 * de type 'bool' (OUI/NON) avec cible NOTES_TERRAIN et tag CHECKLIST.
 */
function templateToChecklistItems(
  templateKey: ChecklistTemplateKey | 'COMBINED',
  items: ChecklistTemplateItem[],
): ChecklistItem[] {
  return items.map((q, i) => ({
    checklist: templateKey,
    nr: i + 1,
    idQuestion: q.id,
    texteAffiche: q.label,
    typeRep: 'bool',
    options: 'OUI,NON',
    cibleTable: 'NOTES_TERRAIN',
    champ: q.id,
    TEXTE_AFFICHE: q.label,
    TYPE_REP: 'bool',
    OPTIONS: 'OUI,NON',
    CIBLE_TABLE: 'NOTES_TERRAIN',
    CHAMP: q.id,
  })) as ChecklistItem[];
}

type TemplateChoice = ChecklistTemplateKey | 'COMBINED' | null;

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
  /**
   * V21-6 C4 — sélecteur de template métier au démarrage.
   * `null` = écran de choix actif. Une fois choisi → on injecte les questions
   * et le flow standard reprend le contrôle.
   */
  const [templateChoice, setTemplateChoice] = useState<TemplateChoice>(null);

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
      // V21-6 C4 — auto-select template si le `name` route matche une clé.
      const upperName = (name || '').toUpperCase();
      const isTemplateKey = (
        upperName === 'GENERAL' ||
        upperName === 'MISE_BAS' ||
        upperName === 'SEVRAGE' ||
        upperName === 'SORTIE_VENTE' ||
        upperName === 'COMBINED'
      );

      if (isTemplateKey) {
        const key = upperName as TemplateChoice;
        setTemplateChoice(key);
        const tplItems = key === 'COMBINED'
          ? getCombinedTemplate()
          : CHECKLIST_TEMPLATES[key as ChecklistTemplateKey];
        setQuestions(templateToChecklistItems(key as ChecklistTemplateKey | 'COMBINED', tplItems));
      } else {
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
      }

      const [bandeRes, stockRes, truieRes] = await Promise.all([
        getBandes(),
        getStockAliments(),
        getTruies(),
      ]);

      setContextData({
        bandes: bandeRes.success
          ? bandeRes.data.map(b => ({ id: b.idPortee, label: b.idPortee }))
          : [],
        stocks: stockRes.success
          ? stockRes.data.map(s => ({ id: s.id, label: s.libelle }))
          : [],
        truies: truieRes.success
          ? truieRes.data.map(t => ({ id: t.displayId, label: t.displayId }))
          : [],
      });
    } finally {
      setInitialLoading(false);
    }
  }, [name]);

  /** Sélection d'un template métier depuis l'écran de choix. */
  const handleSelectTemplate = useCallback(
    (choice: ChecklistTemplateKey | 'COMBINED'): void => {
      const tplItems = choice === 'COMBINED'
        ? getCombinedTemplate()
        : CHECKLIST_TEMPLATES[choice];
      setQuestions(templateToChecklistItems(choice, tplItems));
      setTemplateChoice(choice);
      setCurrentStep(0);
      setAnswer('');
      setDetails('');
      setSelectedContextId('');
    },
    [],
  );

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
      const porcher = kvGet('user_name') || 'Porcher K13';
      const checklistName = (name || 'DAILY').toUpperCase();
      const champ = String(currentQuestion.CHAMP || '');

      if (table === 'PORCELETS_BANDES' || table === 'PORCELETS_BANDES_DETAIL') {
        setSessionBandeId(contextId);
      }

      if (table === 'NOTES_TERRAIN' || !table || table === 'UNDEFINED') {
        const noteText =
          `[${checklistName}] Question: ${currentQuestion.TEXTE_AFFICHE}\n` +
          `Réponse: ${answer}` +
          (details ? `\nDétails: ${details}` : '') +
          (contextId ? `\n[sujet: ${contextId}]` : '') +
          `\n[auteur: ${porcher}]`;
        await insertNote({
          content: noteText,
          category: 'CHECKLIST',
        });
      } else if (table === 'SANTE' || table === 'JOURNAL_SANTE') {
        const animalType = needsContext
          ? (table.includes('TRUIE') || currentTable.includes('TRUIE') ? 'TRUIE' :
             (currentTable === 'PORCELETS_BANDES' || currentTable === 'PORCELETS_BANDES_DETAIL') ? 'BANDE' :
             'GENERAL')
          : 'GENERAL';
        await insertHealthLog({
          code_id: `CK-${Date.now()}`,
          log_type: 'CONTROLE',
          animal_type: animalType,
          animal_code: contextId || null,
          treatment: currentQuestion.TEXTE_AFFICHE ?? '',
          notes: `Réponse: ${answer}. Obs: ${details}`,
          operator: porcher,
        });
      } else if (table === 'SUIVI_TRUIES_REPRODUCTION') {
        const patch: Record<string, unknown> = {};
        if (champ.toUpperCase().includes('STATUT')) patch.statut = answer;
        else if (champ.toUpperCase().includes('RATION')) patch.ration_kg_j = parseFloat(answer) || 0;
        else if (champ.toUpperCase().includes('NOTE')) patch.notes = answer;
        else patch.notes = `[${champ}] ${answer}`;
        await updateSowByCode(contextId, patch);
      } else if (table === 'PORCELETS_BANDES' || table === 'PORCELETS_BANDES_DETAIL') {
        const patch: Record<string, unknown> = {};
        if (champ.toUpperCase().includes('STATUT')) patch.statut = answer;
        else if (champ.toUpperCase().includes('PHASE')) patch.phase = answer;
        else if (champ.toUpperCase().includes('NOTE')) patch.notes = answer;
        else patch.notes = `[${champ}] ${answer}`;
        await updateBatchByCode(contextId, patch);
      } else if (table === 'STOCK_ALIMENTS') {
        const id = await resolveProduitAlimentByCode(contextId);
        if (id) {
          const patch: Record<string, unknown> = {};
          if (champ.toUpperCase().includes('STOCK')) patch.stock_actuel = parseFloat(answer) || 0;
          else if (champ.toUpperCase().includes('SEUIL')) patch.seuil_alerte = parseFloat(answer) || 0;
          else patch.notes = `[${champ}] ${answer}`;
          await updateProduitAliment(id, patch);
        }
      } else {
        await insertNote({
          content: `[${table}/${champ}/${contextId}] ${answer}` +
            (details ? ` — ${details}` : ''),
          category: 'CHECKLIST',
        });
      }

      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
        setAnswer('');
        setDetails('');
        if (!['PORCELETS_BANDES', 'PORCELETS_BANDES_DETAIL'].includes(table)) {
          setSelectedContextId('');
        }
      } else {
        await insertNote({
          content: `CHECKLIST_DONE: Checklist ${checklistName} terminée par ${porcher}`,
          category: 'CHECKLIST',
        });
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
          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
          >
            <PageHeader
              eyebrow="Audit"
              title="Chargement"
              subtitle="Préparation du parcours"
            />
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <IonSpinner name="crescent" style={{ color: 'var(--color-accent)' }} />
              <p className="mt-4 text-[11px] uppercase tracking-wide text-text-2">
                Initialisation…
              </p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // ── Sélecteur de template (V21-6 C4) ─────────────────────────────────
  // Écran initial uniquement quand la route ne désigne pas une checklist
  // ciblée (ex: DAILY, VENDREDI). Permet à l'éleveur de choisir quelle
  // tournée il fait avant de démarrer les questions.
  const upperName = (name || '').toUpperCase();
  const isLegacyChecklist = upperName === 'DAILY' || upperName === 'VENDREDI';
  if (templateChoice === null && !isLegacyChecklist) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
          >
            <PageHeader
              eyebrow="Audit"
              title="Tournée du jour"
              subtitle="Choisis le type d'audit"
              onBack={() => navigate('/')}
            />
            <div className="pt-2 pb-10">
              <h2 className="agritech-heading text-[18px] uppercase leading-tight mb-4">
                Quelle tournée fais-tu aujourd'hui ?
              </h2>
              <div className="space-y-2.5" role="list">
                {CHECKLIST_TEMPLATES_META.map(meta => {
                  const Icon = meta.icon;
                  return (
                  <Button
                    key={meta.key}
                    variant="secondary"
                    fullWidth
                    role="listitem"
                    onClick={() => handleSelectTemplate(meta.key)}
                    ariaLabel={`Démarrer la tournée ${meta.label}`}
                    data-testid={`tpl-${meta.key}`}
                    className="!justify-start !text-left !px-4 !py-4 !rounded-md"
                  >
                    <Icon size={22} aria-hidden />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold uppercase tracking-wide text-text-0">
                        {meta.label}
                      </span>
                      <span className="block text-[11px] text-text-2 mt-0.5">
                        {meta.description}
                      </span>
                    </span>
                  </Button>
                  );
                })}

                <Button
                  variant="secondary"
                  fullWidth
                  role="listitem"
                  onClick={() => handleSelectTemplate('COMBINED')}
                  ariaLabel="Démarrer toutes les tournées combinées"
                  data-testid="tpl-COMBINED"
                  className="!mt-3 !border-2 !border-dashed !border-accent/60"
                >
                  <span className="text-[12px] font-bold uppercase tracking-wide text-accent">
                    Tout combiné · les 4 enchaînés
                  </span>
                </Button>
              </div>
            </div>
          </div>
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
          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
          >
            <PageHeader
              eyebrow="Audit"
              title={isFriday ? 'Bilan hebdo' : 'Mission terminée'}
              subtitle="Données synchronisées"
            />
            <div className="pt-2 pb-8 flex flex-col items-center text-center">
              <div
                className="inline-flex h-20 w-20 items-center justify-center rounded-md bg-bg-1 border border-accent/40 text-accent mb-6"
                aria-hidden="true"
              >
                <CheckCircle2 size={44} />
              </div>
              <h2 className="agritech-heading text-[24px] uppercase leading-none mb-2">
                {isFriday ? 'Bilan validé' : 'Tour validé'}
              </h2>
              <p className="text-[12px] text-text-2 mb-8">
                Registre mis à jour · {questions.length} questions répondues
              </p>

              {isFriday && (
                <div
                  className="card-dense w-full mb-8 space-y-3"
                  aria-label="Résumé hebdomadaire"
                >
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="kpi-label">Module</span>
                    <span className="text-[12px] font-semibold text-text-0 uppercase">
                      S38 2026
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="kpi-label">Questions</span>
                    <span className="text-[12px] font-semibold text-text-0 tabular-nums">
                      {questions.length} / {questions.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="kpi-label">Statut</span>
                    <span className="text-[12px] font-semibold text-accent uppercase">
                      100% validé
                    </span>
                  </div>
                </div>
              )}

              <div className="w-full space-y-3">
                <Button variant="primary" fullWidth onClick={() => navigate('/')}>
                  Retour au cockpit
                </Button>
                <Button variant="secondary" fullWidth onClick={() => navigate('/alerts')}>
                  Voir les alertes d'audit
                </Button>
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // ── Écran d'erreur (pas de questions) ────────────────────────────────
  if (!currentQuestion) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
          >
            <PageHeader
              eyebrow="Audit"
              title="Erreur"
              subtitle="Questions introuvables"
              onBack={() => navigate('/')}
            />
            <div className="pt-4 flex flex-col items-center text-center">
              <div
                className="inline-flex h-16 w-16 items-center justify-center rounded-md bg-bg-1 border border-red/40 text-red mb-5"
                aria-hidden="true"
              >
                <AlertCircle size={30} />
              </div>
              <h2 className="agritech-heading text-[20px] uppercase leading-none mb-2">
                Erreur de chargement
              </h2>
              <p className="text-[11px] text-text-2 mb-8 max-w-xs">
                Impossible de trouver les questions pour cette checklist.
              </p>
              <Button variant="primary" onClick={() => navigate('/')}>
                Retour
              </Button>
            </div>
          </div>
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
        <div
          className="phone-content"
          style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <PageHeader
                eyebrow="Audit"
                title={(name || 'Contrôle').toString()}
                subtitle={`Étape ${currentStep + 1} / ${questions.length}`}
                onBack={() => navigate('/')}
              />
            </div>
            <div style={{ flexShrink: 0, paddingTop: 28 }}>
              <Chip
                label={`${currentStep + 1}/${questions.length}`}
                tone="accent"
                size="xs"
              />
            </div>
          </div>

          <div className="pt-2 pb-10">
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
                className="absolute inset-y-0 left-0 bg-accent rounded-full"
                style={{ width: `${progressPct}%`, transition: 'all var(--duration-transition) var(--ease-emil)' }}
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
                    className="w-full px-3 h-12 text-[13px]"
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
              className="card-dense mt-5"
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
                        <Button
                          key={opt}
                          variant="secondary"
                          fullWidth
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setAnswer(opt)}
                          className={
                            '!justify-between !text-left !px-4 !py-3 !rounded-md ' +
                            (selected ? '!bg-bg-2 !border-accent !text-text-0' : '')
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
                        </Button>
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
                      placeholder="Saisir ton observation…"
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
              <Button
                variant="secondary"
                onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                disabled={currentStep === 0}
                ariaLabel="Étape précédente"
                className="!w-12 !px-0 !rounded-md"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </Button>
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading}
                className="!flex-1 !rounded-md"
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
              </Button>
            </div>
          </div>
        </div>

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
