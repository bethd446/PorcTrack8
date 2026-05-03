import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Tag,
  Users,
  Target,
  StickyNote,
  Home,
  Factory,
  Loader2,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { kvGet, kvSet } from '../../services/kvStore';
import { createLoge, insertSow, insertBoar, insertBatch } from '../../services/supabaseWrites';
import type { LogeType } from '../../types/farm';

/* ═══════════════════════════════════════════════════════════════════════════
   OnboardingWizard — 12 étapes pour configurer une nouvelle ferme
   ───────────────────────────────────────────────────────────────────────────
   Étapes :
     1. Bienvenue
     2. Nom de la ferme        → nom_ferme
     3. Localisation           → secteur + pays
     4. Type de production     → typeProd (radio, 3 choix)
     5. Races (skip si Engraisseur seul)  → races jsonb[]
     6. Cheptel truies (skip si Engraisseur seul) → effectif_truies_initial
     7. Cheptel verrats        → effectif_verrats_initial
     8. Objectif porcelets/an  → objectif_porcelets_an
     9. Notes de démarrage     → notes_demarrage
    10. Loges (V24)            → quantités par type + numérotation libre
    11. Bandes existantes (V27)→ liste de bandes en cours (optionnel)
    12. Récap + persistance Supabase + INSERT loges + INSERT batches PENDING

   Persistance progressive : `kvSet('onboarding_draft', JSON)` à chaque étape.
   À la fin, UPDATE troupeaux WHERE user_id=auth.uid() + onboarding_completed_at,
   puis INSERT N rows dans `loges` via `createLoge` pour chaque type avec qty>0,
   puis INSERT N rows dans `batches` via `insertBatch` pour chaque bande déclarée.
   ═══════════════════════════════════════════════════════════════════════════ */

const TOTAL_STEPS = 12;
const DRAFT_KEY = 'onboarding_draft';

// V24 — 6 catégories couvrant les types de loges saisis à l'onboarding.
type LogeCategorie =
  | 'GESTANTE'        // Truies vides / reproductrices
  | 'MATERNITE'       // Mise-bas
  | 'POST_SEVRAGE'    // Démarrage
  | 'CROISSANCE'
  | 'ENGRAISSEMENT'
  | 'VERRAT';

interface LogeCatConfig {
  cat: LogeCategorie;
  label: string;
  prefix: string;
  /** `LogeType` cible de la table `loges`. */
  type: LogeType;
  capaciteMax: number;
}

const LOGE_CATEGORIES: ReadonlyArray<LogeCatConfig> = [
  { cat: 'GESTANTE',       label: 'Truies vides / reproductrices', prefix: 'V-',  type: 'GESTANTE',     capaciteMax: 8 },
  { cat: 'MATERNITE',      label: 'Mise-bas (maternité)',          prefix: 'M-',  type: 'MATERNITE',    capaciteMax: 1 },
  { cat: 'POST_SEVRAGE',   label: 'Démarrage (post-sevrage)',      prefix: 'PS-', type: 'POST_SEVRAGE', capaciteMax: 30 },
  { cat: 'CROISSANCE',     label: 'Croissance',                    prefix: 'C-',  type: 'CROISSANCE',   capaciteMax: 24 },
  { cat: 'ENGRAISSEMENT',  label: 'Engraissement / Finition',      prefix: 'E-',  type: 'ENGRAISSEMENT', capaciteMax: 18 },
  { cat: 'VERRAT',         label: 'Verrats',                       prefix: 'B-',  type: 'VERRAT',       capaciteMax: 1 },
];

function defaultNumero(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(2, '0')}`;
}

type LogesQuantites = Record<LogeCategorie, number>;
type LogesNumeros = Record<LogeCategorie, string[]>;

const INITIAL_LOGES_QTY: LogesQuantites = {
  GESTANTE: 0,
  MATERNITE: 0,
  POST_SEVRAGE: 0,
  CROISSANCE: 0,
  ENGRAISSEMENT: 0,
  VERRAT: 0,
};
const INITIAL_LOGES_NUMS: LogesNumeros = {
  GESTANTE: [],
  MATERNITE: [],
  POST_SEVRAGE: [],
  CROISSANCE: [],
  ENGRAISSEMENT: [],
  VERRAT: [],
};

// V27 — Phases déclarables pour une bande existante à l'onboarding.
// Mapping vers la colonne `batches.phase` (BandePhase) + `batches.statut`.
type WizardBandePhase =
  | 'SOUS_MERE'
  | 'POST_SEVRAGE'
  | 'CROISSANCE'
  | 'ENGRAISSEMENT'
  | 'FINITION'
  | 'VENDU';

interface WizardBandePhaseConfig {
  key: WizardBandePhase;
  label: string;
  /** Statut métier persisté dans `batches.statut`. */
  statut: string;
  /** Valeur persistée dans `batches.phase` (NULL pour VENDU). */
  dbPhase: 'SOUS_MERE' | 'POST_SEVRAGE' | 'CROISSANCE' | 'ENGRAISSEMENT' | 'FINITION' | null;
}

const WIZARD_BANDE_PHASES: ReadonlyArray<WizardBandePhaseConfig> = [
  { key: 'SOUS_MERE',     label: 'Sous mère',     statut: 'Sous mère',     dbPhase: 'SOUS_MERE' },
  { key: 'POST_SEVRAGE',  label: 'Post-sevrage',  statut: 'Sevrés',        dbPhase: 'POST_SEVRAGE' },
  { key: 'CROISSANCE',    label: 'Croissance',    statut: 'Croissance',    dbPhase: 'CROISSANCE' },
  { key: 'ENGRAISSEMENT', label: 'Engraissement', statut: 'Engraissement', dbPhase: 'ENGRAISSEMENT' },
  { key: 'FINITION',      label: 'Finition',      statut: 'Finition',      dbPhase: 'FINITION' },
  { key: 'VENDU',         label: 'Vendu',         statut: 'Vendu',         dbPhase: null },
];

/** V27 — Une bande déclarée à l'onboarding (saisie libre). */
interface WizardBande {
  /** ID local UI (uuid simple, jamais persisté). */
  uid: string;
  phase: WizardBandePhase;
  effectif: number;
  poidsKg: number;
  /** Index `cat_idx` dans la liste plate des loges déclarées à l'étape 10. */
  logeRef: string;
}

function makeUid(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultBande(): WizardBande {
  return {
    uid: makeUid(),
    phase: 'POST_SEVRAGE',
    effectif: 0,
    poidsKg: 0,
    logeRef: '',
  };
}

type TypeProd = 'NAISSEUR' | 'NAISSEUR_ENGRAISSEUR' | 'ENGRAISSEUR_SEUL';

const RACES_DISPONIBLES = [
  'Large White',
  'Landrace',
  'Duroc',
  'Piétrain',
  'Métisse',
  'Local',
  'Autre',
] as const;
type Race = (typeof RACES_DISPONIBLES)[number];

interface WizardState {
  step: number;
  nom_ferme: string;
  secteur: string;
  pays: string;
  typeProd: TypeProd | null;
  races: Race[];
  effectif_truies_initial: number;
  effectif_verrats_initial: number;
  objectif_porcelets_an: number;
  notes_demarrage: string;
  /** V6-C : quantités par catégorie de loges (étape 10). 0 = skip. */
  logesQty: LogesQuantites;
  /** V6-C : numéros édités par l'utilisateur. Initialisé à partir des suggestions. */
  logesNums: LogesNumeros;
  /** V27 : bandes existantes pré-déclarées (étape 11). Vide = skip. */
  bandes: WizardBande[];
}

const INITIAL: WizardState = {
  step: 1,
  nom_ferme: '',
  secteur: '',
  pays: 'France',
  typeProd: null,
  races: [],
  effectif_truies_initial: 0,
  effectif_verrats_initial: 0,
  objectif_porcelets_an: 0,
  notes_demarrage: '',
  logesQty: { ...INITIAL_LOGES_QTY },
  logesNums: { ...INITIAL_LOGES_NUMS },
  bandes: [],
};

function loadDraft(): WizardState {
  try {
    const raw = kvGet(DRAFT_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return {
      ...INITIAL,
      ...parsed,
      logesQty: { ...INITIAL_LOGES_QTY, ...(parsed.logesQty ?? {}) },
      logesNums: { ...INITIAL_LOGES_NUMS, ...(parsed.logesNums ?? {}) },
      bandes: Array.isArray(parsed.bandes) ? parsed.bandes : [],
    };
  } catch {
    return INITIAL;
  }
}

/** Étapes que l'on saute si l'utilisateur a sélectionné « Engraisseur seul ». */
function isStepSkipped(step: number, typeProd: TypeProd | null): boolean {
  if (typeProd !== 'ENGRAISSEUR_SEUL') return false;
  return step === 5 || step === 6;
}

function nextStep(current: number, typeProd: TypeProd | null): number {
  let n = current + 1;
  while (n < TOTAL_STEPS && isStepSkipped(n, typeProd)) n++;
  return Math.min(n, TOTAL_STEPS);
}

function prevStep(current: number, typeProd: TypeProd | null): number {
  let n = current - 1;
  while (n > 1 && isStepSkipped(n, typeProd)) n--;
  return Math.max(n, 1);
}

function validateStep(state: WizardState): boolean {
  switch (state.step) {
    case 2:
      return state.nom_ferme.trim().length > 0 && state.nom_ferme.length <= 80;
    case 3:
      return state.secteur.trim().length > 0 && state.pays.trim().length > 0;
    case 4:
      return state.typeProd !== null;
    case 5:
      return state.races.length >= 1 && state.races.length <= 5;
    case 6:
      return state.effectif_truies_initial >= 0 && state.effectif_truies_initial <= 5000;
    case 7:
      return state.effectif_verrats_initial >= 0 && state.effectif_verrats_initial <= 500;
    case 8:
      return state.objectif_porcelets_an >= 0 && state.objectif_porcelets_an <= 500000;
    case 9:
      return state.notes_demarrage.length <= 500;
    case 10: {
      // Étape loges : tous les numéros édités doivent être non vides et ≤ 12 chars.
      for (const c of LOGE_CATEGORIES) {
        const qty = state.logesQty[c.cat];
        if (qty < 0 || qty > 200) return false;
        const nums = state.logesNums[c.cat] ?? [];
        for (let i = 0; i < qty; i++) {
          const v = (nums[i] ?? '').trim();
          if (v.length === 0 || v.length > 12) return false;
        }
      }
      return true;
    }
    case 11: {
      // Étape bandes : skip OK (liste vide) ; sinon chaque bande doit être valide.
      for (const b of state.bandes) {
        if (!Number.isFinite(b.effectif) || b.effectif < 1 || b.effectif > 5000) return false;
        if (!Number.isFinite(b.poidsKg) || b.poidsKg <= 0 || b.poidsKg > 500) return false;
        if (!b.logeRef || b.logeRef.trim().length === 0) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

/** V27 — Aplatit les loges déclarées étape 10 en options selectables (index, label, type). */
function flattenLogesForSelect(state: WizardState): Array<{ value: string; label: string; type: LogeType }> {
  const out: Array<{ value: string; label: string; type: LogeType }> = [];
  for (const c of LOGE_CATEGORIES) {
    const qty = state.logesQty[c.cat] ?? 0;
    const nums = state.logesNums[c.cat] ?? [];
    for (let i = 0; i < qty; i++) {
      const numero = (nums[i] ?? defaultNumero(c.prefix, i + 1)).trim();
      if (!numero) continue;
      out.push({
        value: `${c.cat}::${i}`,
        label: `${numero} (${c.label})`,
        type: c.type,
      });
    }
  }
  return out;
}

/** V27 — Génère le code_id `B-{YYYYMMDD}-W{n}` pour une bande wizard (n = ordre 1-based). */
function wizardBandeCodeId(orderIdx: number, now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `B-${y}${m}${d}-W${orderIdx}`;
}

const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<WizardState>(() => loadDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void kvSet(DRAFT_KEY, JSON.stringify(state));
  }, [state]);

  const canContinue = useMemo(() => validateStep(state), [state]);

  const goNext = (): void => {
    if (!canContinue) return;
    setState((s) => ({ ...s, step: nextStep(s.step, s.typeProd) }));
  };
  const goPrev = (): void =>
    setState((s) => ({ ...s, step: prevStep(s.step, s.typeProd) }));

  const handleSkipForLater = (): void => {
    void kvSet(DRAFT_KEY, JSON.stringify(state));
    navigate('/today', { replace: true });
  };

  const handleFinish = async (): Promise<void> => {
    if (!user) {
      setError('Session introuvable. Reconnectez-vous.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nom_ferme: state.nom_ferme.trim() || null,
        nom: state.nom_ferme.trim() || 'Ma ferme',
        secteur: state.secteur.trim() || null,
        pays: state.pays.trim() || null,
        races: state.races,
        effectif_truies_initial:
          state.typeProd === 'ENGRAISSEUR_SEUL' ? 0 : state.effectif_truies_initial,
        effectif_verrats_initial: state.effectif_verrats_initial,
        objectif_porcelets_an: state.objectif_porcelets_an,
        notes_demarrage: state.notes_demarrage.trim() || null,
        onboarding_completed_at: new Date().toISOString(),
      };
      const { error: upErr } = await supabase
        .from('troupeaux')
        .update(payload)
        .eq('user_id', user.id);
      if (upErr) throw upErr;

      // E2 — Auto-création truies/verrats vides selon les effectifs saisis.
      // Best-effort : si une insertion échoue (ex: code_id en doublon), on
      // continue les autres et on log l'erreur. L'utilisateur pourra corriger
      // via /troupeau/cheptel.
      let truiesCreated = 0;
      let verratsCreated = 0;
      let truiesFailed = 0;
      let verratsFailed = 0;
      const truiesCount =
        state.typeProd === 'ENGRAISSEUR_SEUL' ? 0 : state.effectif_truies_initial;
      for (let i = 1; i <= truiesCount; i++) {
        try {
          await insertSow({
            code_id: `T-${String(i).padStart(3, '0')}`,
            name: `Truie ${i}`,
            breed: state.races[0] ?? null,
            statut: 'En attente saillie',
            notes: "Créée à l'onboarding — à compléter (boucle, photo, etc.)",
          });
          truiesCreated++;
        } catch (sowErr) {
          truiesFailed++;
          console.warn('[onboarding] insertSow failed:', sowErr);
        }
      }
      const verratsCount = state.effectif_verrats_initial;
      for (let i = 1; i <= verratsCount; i++) {
        try {
          await insertBoar({
            code_id: `V-${String(i).padStart(3, '0')}`,
            name: `Verrat ${i}`,
            statut: 'Actif',
            notes: "Créé à l'onboarding — à compléter",
          });
          verratsCreated++;
        } catch (boarErr) {
          verratsFailed++;
          console.warn('[onboarding] insertBoar failed:', boarErr);
        }
      }

      // V6-C : INSERT N loges par catégorie avec numéro édité par l'utilisateur.
      // Best-effort : si une loge échoue, on continue (pas de rollback strict —
      // l'utilisateur peut corriger via /troupeau/loges).
      // V27 : on indexe les ID des loges créées par référence `${cat}::${i}`
      // pour pouvoir lier les bandes pré-déclarées à leur loge réelle.
      let logesCreated = 0;
      let logesFailed = 0;
      const logeIdByRef = new Map<string, string>();
      for (const c of LOGE_CATEGORIES) {
        const qty = state.logesQty[c.cat] ?? 0;
        if (qty <= 0) continue;
        const nums = state.logesNums[c.cat] ?? [];
        for (let i = 0; i < qty; i++) {
          const numero = (nums[i] ?? defaultNumero(c.prefix, i + 1)).trim();
          if (!numero) continue;
          try {
            const created = await createLoge({
              numero,
              type: c.type,
              capaciteMax: c.capaciteMax,
              notes: "Créée à l'onboarding",
            });
            logesCreated++;
            const ref = `${c.cat}::${i}`;
            const newId = (created as { id?: string } | null | undefined)?.id;
            if (newId) logeIdByRef.set(ref, newId);
          } catch (logeErr) {
            logesFailed++;
            console.warn('[onboarding] createLoge failed:', logeErr);
          }
        }
      }

      // V27 : INSERT bandes pré-déclarées en `validation_status='PENDING'`.
      // L'éleveur les complétera plus tard via PendingBandesBanner.
      // Best-effort : log + agrégation des erreurs, navigation toujours OK.
      let bandesCreated = 0;
      let bandesFailed = 0;
      for (let idx = 0; idx < state.bandes.length; idx++) {
        const b = state.bandes[idx];
        const phaseCfg = WIZARD_BANDE_PHASES.find((p) => p.key === b.phase);
        if (!phaseCfg) {
          bandesFailed++;
          console.warn('[onboarding] insertBatch skip — phase inconnue:', b.phase);
          continue;
        }
        const logeId = logeIdByRef.get(b.logeRef) ?? null;
        const codeId = wizardBandeCodeId(idx + 1);
        const payload: Record<string, unknown> = {
          code_id: codeId,
          phase: phaseCfg.dbPhase,
          statut: 'En cours',
          poids_initial_kg: b.poidsKg,
          poids_moyen_kg: b.poidsKg,
          porcelets_nes_total: b.effectif,
          porcelets_nes_vivants: b.effectif,
          validation_status: 'PENDING',
          loge_id: logeId,
          notes: `Pré-déclarée à l'onboarding (phase saisie : ${phaseCfg.label})`,
        };
        try {
          await insertBatch(payload as Parameters<typeof insertBatch>[0]);
          bandesCreated++;
        } catch (batchErr) {
          bandesFailed++;
          console.warn('[onboarding] insertBatch failed:', batchErr);
        }
      }

      // Toast final : succès complet OU warning si certaines créations ont
      // échoué. Stocké dans kvStore pour lecture par /today (consumer décide
      // de l'affichage). Format : `{kind:'success'|'warning', message:string}`.
      const totalFailed = truiesFailed + verratsFailed + logesFailed + bandesFailed;
      const baseSummary = `${truiesCreated} truies + ${verratsCreated} verrats + ${logesCreated} loges créées`;
      const bandesSuffix =
        bandesCreated > 0
          ? ` · ${bandesCreated} bande${bandesCreated > 1 ? 's' : ''} pré-déclarée${bandesCreated > 1 ? 's' : ''} (à compléter via le banner sur la home)`
          : '';
      const toastMessage =
        totalFailed > 0
          ? `Compte configuré · ${baseSummary}${bandesSuffix}. Quelques éléments n'ont pas pu être créés (vérifie via Cheptel / Bandes).`
          : `Compte configuré · ${baseSummary}${bandesSuffix}`;
      await kvSet(
        'onboarding_toast',
        JSON.stringify({
          kind: totalFailed > 0 ? 'warning' : 'success',
          message: toastMessage,
        }),
      );

      await kvSet('onboarding_done', '1');
      await kvSet(DRAFT_KEY, '');
      navigate('/today', { replace: true, state: { onboardingToast: toastMessage } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const progressFraction = state.step / TOTAL_STEPS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configuration initiale de la ferme"
      className="min-h-[100dvh] w-full flex flex-col bg-bg-0 text-text-0"
    >
      {/* Top bar : progress + plus tard */}
      <div className="px-5 pt-5 pb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="ft-code text-[11px] uppercase tracking-wide text-text-2">
            Étape {state.step} / {TOTAL_STEPS}
          </span>
          {state.step > 1 && state.step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={handleSkipForLater}
              className="ft-code text-[11px] uppercase tracking-wide text-text-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
            >
              Plus tard
            </button>
          )}
        </div>
        <div
          className="bg-bg-2 h-1 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={state.step}
        >
          <div
            className="h-full bg-accent origin-left transition-transform duration-300"
            style={{ transform: `scaleX(${progressFraction})` }}
          />
        </div>
      </div>

      {/* Contenu centré */}
      <div className="flex-1 px-5 pb-6 flex items-center justify-center">
        <div className="w-full max-w-[560px]">
          <StepRenderer
            state={state}
            setState={setState}
            onStart={goNext}
            error={error}
          />
        </div>
      </div>

      {/* Footer actions */}
      {state.step > 1 && (
        <div className="px-5 pb-5 max-w-[560px] mx-auto w-full">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={saving}
              className="h-12 rounded-md bg-bg-1 border border-border text-text-1 text-[13px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Précédent
            </button>
            {state.step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className="h-12 rounded-md bg-accent text-bg-0 text-[13px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                Suivant
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={saving}
                className="h-12 rounded-md bg-accent text-bg-0 text-[13px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    Terminer
                    <Check size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Renderer d'étape ─────────────────────────────────────────────────── */

interface StepRendererProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  onStart: () => void;
  error: string | null;
}

const StepRenderer: React.FC<StepRendererProps> = ({ state, setState, onStart, error }) => {
  switch (state.step) {
    case 1:
      return <StepWelcome onStart={onStart} />;
    case 2:
      return (
        <StepCard
          icon={<Home size={20} aria-hidden="true" />}
          title="Nom de la ferme"
          subtitle="Comment souhaites-tu appeler ta ferme dans l'application ?"
        >
          <input
            type="text"
            value={state.nom_ferme}
            maxLength={80}
            onChange={(e) => setState((s) => ({ ...s, nom_ferme: e.target.value }))}
            placeholder="Ex : Ferme des Trois Chênes"
            aria-label="Nom de la ferme"
            className="w-full h-12 px-4 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 text-[15px] outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          <p className="text-[12px] text-text-2 mt-2">{state.nom_ferme.length} / 80</p>
          {state.nom_ferme.length === 0 && (
            <p className="text-[12px] text-red-500 mt-2">Le nom de la ferme est obligatoire.</p>
          )}
        </StepCard>
      );
    case 3:
      return (
        <StepCard
          icon={<MapPin size={20} aria-hidden="true" />}
          title="Localisation"
          subtitle="Pour adapter les recommandations climatiques."
        >
          <label className="block ft-code text-[11px] uppercase tracking-wide text-text-2 mb-1">
            Secteur
          </label>
          <input
            type="text"
            value={state.secteur}
            onChange={(e) => setState((s) => ({ ...s, secteur: e.target.value }))}
            placeholder="Ex : Bretagne Nord"
            aria-label="Secteur"
            className="w-full h-12 px-4 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 text-[15px] outline-none focus:ring-2 focus:ring-accent focus:border-accent mb-4"
          />
          <label className="block ft-code text-[11px] uppercase tracking-wide text-text-2 mb-1">
            Pays
          </label>
          <select
            value={state.pays}
            onChange={(e) => setState((s) => ({ ...s, pays: e.target.value }))}
            aria-label="Pays"
            className="w-full h-12 px-4 rounded-md bg-bg-1 border border-border text-text-0 text-[15px] outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="France">France</option>
            <option value="Belgique">Belgique</option>
            <option value="Suisse">Suisse</option>
            <option value="Canada">Canada</option>
            <option value="Côte d'Ivoire">Côte d'Ivoire</option>
            <option value="Sénégal">Sénégal</option>
            <option value="Maroc">Maroc</option>
            <option value="Autre">Autre</option>
          </select>
        </StepCard>
      );
    case 4:
      return (
        <StepCard
          icon={<Factory size={20} aria-hidden="true" />}
          title="Type de production"
          subtitle="Cela conditionne les modules visibles dans l'app."
        >
          <div role="radiogroup" aria-label="Type de production" className="flex flex-col gap-2">
            {(
              [
                { key: 'NAISSEUR', label: 'Naisseur' },
                { key: 'NAISSEUR_ENGRAISSEUR', label: 'Naisseur-Engraisseur' },
                { key: 'ENGRAISSEUR_SEUL', label: 'Engraisseur seul' },
              ] as const
            ).map(({ key, label }) => {
              const active = state.typeProd === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setState((s) => ({ ...s, typeProd: key }))}
                  className={
                    'h-12 px-4 rounded-md text-[13px] font-semibold uppercase tracking-wide text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ' +
                    (active
                      ? 'bg-accent text-bg-0'
                      : 'bg-bg-1 border border-border text-text-1 hover:bg-bg-2')
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </StepCard>
      );
    case 5:
      return (
        <StepCard
          icon={<Tag size={20} aria-hidden="true" />}
          title="Races élevées"
          subtitle="Sélectionne entre 1 et 5 races."
        >
          <div className="flex flex-wrap gap-2">
            {RACES_DISPONIBLES.map((r) => {
              const active = state.races.includes(r);
              const disabled = !active && state.races.length >= 5;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      races: active ? s.races.filter((x) => x !== r) : [...s.races, r],
                    }))
                  }
                  className={
                    'h-10 px-4 rounded-full text-[12px] font-semibold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ' +
                    (active
                      ? 'bg-accent text-bg-0'
                      : 'bg-bg-1 border border-border text-text-1 hover:bg-bg-2 disabled:opacity-40')
                  }
                >
                  {r}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-text-2 mt-3">{state.races.length} / 5 sélectionnées</p>
          {state.races.length === 0 && (
            <p className="text-[12px] text-red-500 mt-1">Sélectionne au moins une race.</p>
          )}
        </StepCard>
      );
    case 6:
      return (
        <StepCard
          icon={<Users size={20} aria-hidden="true" />}
          title="Cheptel initial — Truies"
          subtitle="Combien de truies as-tu déjà sur la ferme ?"
        >
          <NumberInput
            value={state.effectif_truies_initial}
            min={0}
            max={5000}
            onChange={(v) => setState((s) => ({ ...s, effectif_truies_initial: v }))}
            ariaLabel="Effectif truies initial"
          />
          <p className="text-[12px] text-text-2 mt-2">
            Tu pourras ajouter chaque truie individuellement ensuite.
          </p>
        </StepCard>
      );
    case 7:
      return (
        <StepCard
          icon={<Users size={20} aria-hidden="true" />}
          title="Cheptel initial — Verrats"
          subtitle="Combien de verrats actifs ?"
        >
          <NumberInput
            value={state.effectif_verrats_initial}
            min={0}
            max={500}
            onChange={(v) => setState((s) => ({ ...s, effectif_verrats_initial: v }))}
            ariaLabel="Effectif verrats initial"
          />
        </StepCard>
      );
    case 8:
      return (
        <StepCard
          icon={<Target size={20} aria-hidden="true" />}
          title="Objectif annuel porcelets"
          subtitle="Production cible sur 12 mois."
        >
          <NumberInput
            value={state.objectif_porcelets_an}
            min={0}
            max={500000}
            onChange={(v) => setState((s) => ({ ...s, objectif_porcelets_an: v }))}
            ariaLabel="Objectif annuel porcelets"
          />
          <p className="text-[12px] text-text-2 mt-2">
            Optionnel — sert à calibrer le tableau de bord.
          </p>
        </StepCard>
      );
    case 9:
      return (
        <StepCard
          icon={<StickyNote size={20} aria-hidden="true" />}
          title="Notes de démarrage"
          subtitle="Particularités de ta ferme, contraintes locales, etc."
        >
          <textarea
            value={state.notes_demarrage}
            maxLength={500}
            onChange={(e) => setState((s) => ({ ...s, notes_demarrage: e.target.value }))}
            placeholder="Ex : élevage plein-air, contraintes biosécurité…"
            aria-label="Notes de démarrage"
            rows={6}
            className="w-full px-4 py-3 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
          />
          <p className="text-[12px] text-text-2 mt-2">{state.notes_demarrage.length} / 500</p>
        </StepCard>
      );
    case 10:
      return <StepLoges state={state} setState={setState} />;
    case 11:
      return <StepBandes state={state} setState={setState} />;
    case 12:
      return <StepRecap state={state} error={error} />;
    default:
      return null;
  }
};

/* ─── Étape 1 : accueil ────────────────────────────────────────────────── */

const StepWelcome: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="flex flex-col items-center text-center py-10">
    <img
      src="/images/porc-mark.svg"
      alt=""
      aria-hidden="true"
      className="w-24 h-24 mb-6"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = '/images/icon.svg';
      }}
    />
    <h1
      className="ft-heading uppercase tracking-wide text-[28px] mb-3"
      style={{ letterSpacing: '0.02em' }}
    >
      Bienvenue sur PorcTrack
    </h1>
    <p className="text-[14px] text-text-1 max-w-sm leading-relaxed mb-8">
      Quelques questions rapides pour configurer ton interface. Tu peux interrompre à tout moment et
      reprendre plus tard.
    </p>
    <button
      type="button"
      onClick={onStart}
      className="h-12 px-8 rounded-md bg-accent text-bg-0 text-[13px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      Commencer
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  </div>
);

/* ─── Étape 10 : loges (V24) ───────────────────────────────────────────── */

interface StepLogesProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

const StepLoges: React.FC<StepLogesProps> = ({ state, setState }) => {
  const totalLoges = LOGE_CATEGORIES.reduce(
    (acc, c) => acc + (state.logesQty[c.cat] ?? 0),
    0,
  );

  const setQty = (cat: LogeCategorie, qty: number): void => {
    setState((s) => {
      const next = Math.max(0, Math.min(200, qty));
      const prevNums = s.logesNums[cat] ?? [];
      const cfg = LOGE_CATEGORIES.find((c) => c.cat === cat);
      const prefix = cfg?.prefix ?? '';
      // Resize array : préserve les numéros déjà édités, complète avec défauts.
      const nextNums = Array.from({ length: next }, (_, i) =>
        prevNums[i] ?? defaultNumero(prefix, i + 1),
      );
      return {
        ...s,
        logesQty: { ...s.logesQty, [cat]: next },
        logesNums: { ...s.logesNums, [cat]: nextNums },
      };
    });
  };

  const setNumero = (cat: LogeCategorie, idx: number, value: string): void => {
    setState((s) => {
      const arr = [...(s.logesNums[cat] ?? [])];
      arr[idx] = value;
      return { ...s, logesNums: { ...s.logesNums, [cat]: arr } };
    });
  };

  const handleSkip = (): void => {
    setState((s) => ({
      ...s,
      logesQty: { ...INITIAL_LOGES_QTY },
      logesNums: { ...INITIAL_LOGES_NUMS },
    }));
  };

  return (
    <div className="bg-bg-1 border border-border rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent shrink-0"
          aria-hidden="true"
        >
          <Home size={20} />
        </span>
        <div className="flex-1">
          <h2
            className="ft-heading uppercase tracking-wide text-[20px] leading-tight"
            style={{ letterSpacing: '0.02em' }}
          >
            Configuration des loges
          </h2>
          <p className="text-[13px] text-text-2 mt-1 leading-relaxed">
            Combien de loges as-tu pour chaque type ? Tu pourras renommer chaque
            loge librement. Skip si tu préfères configurer plus tard via
            <code className="font-mono"> /troupeau/loges</code>.
          </p>
        </div>
      </div>

      {/* Sub-step A : quantités */}
      <div className="flex flex-col gap-3">
        {LOGE_CATEGORIES.map((c) => (
          <div
            key={c.cat}
            className="flex items-center justify-between gap-3 bg-bg-0 border border-border rounded-md px-3 py-2.5"
          >
            <label
              htmlFor={`onb-loge-qty-${c.cat}`}
              className="flex-1 text-[13px] text-text-1"
            >
              {c.label}
              <span className="ml-2 ft-code text-[10px] uppercase tracking-wide text-text-2">
                {c.prefix} · cap. {c.capaciteMax}
              </span>
            </label>
            <input
              id={`onb-loge-qty-${c.cat}`}
              aria-label={`Quantité de loges ${c.label}`}
              type="number"
              min={0}
              max={200}
              value={Number.isFinite(state.logesQty[c.cat]) ? state.logesQty[c.cat] : 0}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setQty(c.cat, Number.isNaN(n) ? 0 : n);
              }}
              className="w-20 h-10 px-3 rounded-md bg-bg-1 border border-border text-text-0 text-[14px] ft-values text-center outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="ft-code text-[11px] uppercase tracking-wide text-text-2">
          Total : {totalLoges} loge{totalLoges > 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={handleSkip}
          className="ft-code text-[11px] uppercase tracking-wide text-text-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
        >
          Skip cette étape
        </button>
      </div>

      {/* Sub-step B : numérotation (affiché uniquement si totalLoges > 0) */}
      {totalLoges > 0 && (
        <div className="mt-6 flex flex-col gap-5" data-testid="onb-loges-numbering">
          <p className="ft-code text-[11px] uppercase tracking-wide text-text-2">
            Renommer les loges (12 caractères max)
          </p>
          {LOGE_CATEGORIES.map((c) => {
            const qty = state.logesQty[c.cat] ?? 0;
            if (qty <= 0) return null;
            const nums = state.logesNums[c.cat] ?? [];
            return (
              <div key={c.cat} className="flex flex-col gap-2">
                <span className="ft-code text-[11px] uppercase tracking-wide text-text-1">
                  {c.label} · {qty} loge{qty > 1 ? 's' : ''}
                </span>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: qty }).map((_, i) => (
                    <input
                      key={`${c.cat}-${i}`}
                      type="text"
                      maxLength={12}
                      aria-label={`Numéro loge ${c.label} ${i + 1}`}
                      value={nums[i] ?? defaultNumero(c.prefix, i + 1)}
                      onChange={(e) => setNumero(c.cat, i, e.target.value)}
                      className="w-24 h-9 px-2 rounded-md bg-bg-0 border border-border text-text-0 text-[13px] font-mono text-center outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Étape 11 : bandes existantes (V27) ───────────────────────────────── */

interface StepBandesProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

const StepBandes: React.FC<StepBandesProps> = ({ state, setState }) => {
  const logeOptions = useMemo(() => flattenLogesForSelect(state), [state]);
  const noLoges = logeOptions.length === 0;

  const addBande = (): void => {
    setState((s) => {
      const fresh = defaultBande();
      // Pré-remplit la 1re loge dispo si possible.
      if (logeOptions.length > 0) fresh.logeRef = logeOptions[0].value;
      return { ...s, bandes: [...s.bandes, fresh] };
    });
  };

  const removeBande = (uid: string): void => {
    setState((s) => ({ ...s, bandes: s.bandes.filter((b) => b.uid !== uid) }));
  };

  const patchBande = (uid: string, patch: Partial<WizardBande>): void => {
    setState((s) => ({
      ...s,
      bandes: s.bandes.map((b) => (b.uid === uid ? { ...b, ...patch } : b)),
    }));
  };

  return (
    <div className="bg-bg-1 border border-border rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent shrink-0"
          aria-hidden="true"
        >
          <Layers size={20} />
        </span>
        <div className="flex-1">
          <h2
            className="ft-heading uppercase tracking-wide text-[20px] leading-tight"
            style={{ letterSpacing: '0.02em' }}
          >
            Bandes existantes
          </h2>
          <p className="text-[13px] text-text-2 mt-1 leading-relaxed">
            Décrivez vos bandes en cours (optionnel). Chaque bande sera créée en
            statut <span className="ft-code">PENDING</span> et apparaîtra sur la
            home pour être complétée plus tard.
          </p>
        </div>
      </div>

      {noLoges && (
        <p className="text-[12px] text-text-2 bg-bg-0 border border-border rounded-md px-3 py-2 mb-4">
          Aucune loge déclarée à l'étape précédente — impossible de pré-déclarer
          des bandes maintenant. Tu pourras les ajouter via la home après création
          des loges.
        </p>
      )}

      <div className="flex flex-col gap-3" data-testid="onb-bandes-list">
        {state.bandes.map((b, idx) => {
          const effectifInvalid = !Number.isFinite(b.effectif) || b.effectif < 1;
          const poidsInvalid = !Number.isFinite(b.poidsKg) || b.poidsKg <= 0;
          const logeInvalid = !b.logeRef;
          return (
            <div
              key={b.uid}
              className="bg-bg-0 border border-border rounded-md p-3 flex flex-col gap-2"
              data-testid={`onb-bande-row-${idx}`}
            >
              <div className="flex items-center justify-between">
                <span className="ft-code text-[11px] uppercase tracking-wide text-text-2">
                  Bande {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeBande(b.uid)}
                  aria-label={`Supprimer la bande ${idx + 1}`}
                  className="text-text-2 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded p-1"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>

              <label className="block ft-code text-[10px] uppercase tracking-wide text-text-2">
                Phase
              </label>
              <select
                aria-label={`Phase bande ${idx + 1}`}
                value={b.phase}
                onChange={(e) => patchBande(b.uid, { phase: e.target.value as WizardBandePhase })}
                className="w-full h-10 px-3 rounded-md bg-bg-1 border border-border text-text-0 text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
                {WIZARD_BANDE_PHASES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block ft-code text-[10px] uppercase tracking-wide text-text-2">
                    Effectif
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    aria-label={`Effectif bande ${idx + 1}`}
                    value={Number.isFinite(b.effectif) ? b.effectif : 0}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      patchBande(b.uid, { effectif: Number.isNaN(n) ? 0 : n });
                    }}
                    className={
                      'w-full h-10 px-3 rounded-md bg-bg-1 border text-text-0 text-[14px] ft-values outline-none focus:ring-2 focus:ring-accent focus:border-accent ' +
                      (effectifInvalid ? 'border-red-500' : 'border-border')
                    }
                  />
                </div>
                <div>
                  <label className="block ft-code text-[10px] uppercase tracking-wide text-text-2">
                    Poids moyen (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step="0.1"
                    aria-label={`Poids moyen bande ${idx + 1}`}
                    value={Number.isFinite(b.poidsKg) ? b.poidsKg : 0}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value.replace(',', '.'));
                      patchBande(b.uid, { poidsKg: Number.isNaN(n) ? 0 : n });
                    }}
                    className={
                      'w-full h-10 px-3 rounded-md bg-bg-1 border text-text-0 text-[14px] ft-values outline-none focus:ring-2 focus:ring-accent focus:border-accent ' +
                      (poidsInvalid ? 'border-red-500' : 'border-border')
                    }
                  />
                </div>
              </div>

              <label className="block ft-code text-[10px] uppercase tracking-wide text-text-2">
                Loge
              </label>
              <select
                aria-label={`Loge bande ${idx + 1}`}
                value={b.logeRef}
                onChange={(e) => patchBande(b.uid, { logeRef: e.target.value })}
                disabled={noLoges}
                className={
                  'w-full h-10 px-3 rounded-md bg-bg-1 border text-text-0 text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50 ' +
                  (logeInvalid ? 'border-red-500' : 'border-border')
                }
              >
                <option value="">— Sélectionner —</option>
                {logeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addBande}
        disabled={noLoges}
        className="mt-4 h-10 px-4 rounded-md bg-bg-0 border border-border text-text-1 text-[12px] font-semibold uppercase tracking-wide flex items-center gap-2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Plus size={14} aria-hidden="true" />
        Ajouter une bande
      </button>

      <p className="text-[11px] text-text-2 mt-3">
        {state.bandes.length === 0
          ? 'Aucune bande déclarée — clique sur Suivant pour passer cette étape.'
          : `${state.bandes.length} bande${state.bandes.length > 1 ? 's' : ''} pré-déclarée${state.bandes.length > 1 ? 's' : ''}`}
      </p>
    </div>
  );
};

/* ─── Étape 12 : récap ─────────────────────────────────────────────────── */

const StepRecap: React.FC<{ state: WizardState; error: string | null }> = ({ state, error }) => {
  const typeLabel: Record<TypeProd, string> = {
    NAISSEUR: 'Naisseur',
    NAISSEUR_ENGRAISSEUR: 'Naisseur-Engraisseur',
    ENGRAISSEUR_SEUL: 'Engraisseur seul',
  };
  const items: Array<{ label: string; value: string }> = [
    { label: 'Nom de la ferme', value: state.nom_ferme || '—' },
    { label: 'Secteur', value: state.secteur || '—' },
    { label: 'Pays', value: state.pays || '—' },
    {
      label: 'Type de production',
      value: state.typeProd ? typeLabel[state.typeProd] : '—',
    },
  ];
  if (state.typeProd !== 'ENGRAISSEUR_SEUL') {
    items.push({ label: 'Races', value: state.races.join(', ') || '—' });
    items.push({
      label: 'Truies',
      value: String(state.effectif_truies_initial),
    });
  }
  items.push({ label: 'Verrats', value: String(state.effectif_verrats_initial) });
  items.push({
    label: 'Objectif porcelets / an',
    value: state.objectif_porcelets_an > 0 ? String(state.objectif_porcelets_an) : '—',
  });
  if (state.notes_demarrage) {
    items.push({ label: 'Notes', value: state.notes_demarrage });
  }
  // V6-C : récap loges
  const totalLoges = LOGE_CATEGORIES.reduce(
    (acc, c) => acc + (state.logesQty[c.cat] ?? 0),
    0,
  );
  if (totalLoges > 0) {
    const detail = LOGE_CATEGORIES
      .filter((c) => (state.logesQty[c.cat] ?? 0) > 0)
      .map((c) => `${state.logesQty[c.cat]} ${c.label}`)
      .join(' · ');
    items.push({ label: 'Loges', value: `${totalLoges} (${detail})` });
  } else {
    items.push({ label: 'Loges', value: 'À configurer plus tard' });
  }
  // V27 : récap bandes pré-déclarées.
  if (state.bandes.length > 0) {
    items.push({
      label: 'Bandes pré-déclarées',
      value: `${state.bandes.length} bande${state.bandes.length > 1 ? 's' : ''} (à compléter via le banner)`,
    });
  } else {
    items.push({ label: 'Bandes pré-déclarées', value: 'Aucune' });
  }

  return (
    <div className="bg-bg-1 border border-border rounded-2xl p-6">
      <h2 className="ft-heading uppercase tracking-wide text-[22px] mb-4">Récapitulatif</h2>
      <p className="text-[13px] text-text-2 mb-5">
        Vérifie tes réponses avant d'enregistrer.
      </p>
      <dl className="flex flex-col gap-3">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col">
            <dt className="ft-code text-[11px] uppercase tracking-wide text-text-2">
              {it.label}
            </dt>
            <dd className="text-[14px] text-text-0 break-words">{it.value}</dd>
          </div>
        ))}
      </dl>
      {error && (
        <p
          role="alert"
          className="mt-5 text-[13px] text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2"
        >
          {error}
        </p>
      )}
    </div>
  );
};

/* ─── Atoms ───────────────────────────────────────────────────────────── */

interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({ icon, title, subtitle, children }) => (
  <div className="bg-bg-1 border border-border rounded-2xl p-6">
    <div className="flex items-start gap-3 mb-5">
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent shrink-0"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="flex-1">
        <h2
          className="ft-heading uppercase tracking-wide text-[20px] leading-tight"
          style={{ letterSpacing: '0.02em' }}
        >
          {title}
        </h2>
        <p className="text-[13px] text-text-2 mt-1 leading-relaxed">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

interface NumberInputProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, min, max, onChange, ariaLabel }) => (
  <input
    type="number"
    value={Number.isFinite(value) ? value : 0}
    min={min}
    max={max}
    onChange={(e) => {
      const n = parseInt(e.target.value, 10);
      if (Number.isNaN(n)) {
        onChange(0);
        return;
      }
      onChange(Math.max(min, Math.min(max, n)));
    }}
    aria-label={ariaLabel}
    className="w-full h-12 px-4 rounded-md bg-bg-1 border border-border text-text-0 text-[18px] ft-values outline-none focus:ring-2 focus:ring-accent focus:border-accent"
  />
);

export default OnboardingWizard;
