import React, { useEffect, useMemo, useState } from 'react';
import { IonSpinner, IonToast, IonSelect, IonSelectOption } from '@ionic/react';
import { Stethoscope, Send, Bandage, Scissors, AlertTriangle, FileText } from 'lucide-react';
import { insertHealthLog } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { kvGet } from '../../services/kvStore';
import { useAuth } from '../../context/AuthContext';
import { getDefaultValidationStatus } from '../../services/validationWorkflow';
import {
  HEALTH_LOG_CATEGORIES,
  HEALTH_LOG_TEMPLATES,
  type HealthLogType,
  type HealthLogCategory,
} from '../../services/healthProtocolPlanner';

/**
 * QuickHealthForm — Saisie rapide d'une intervention santé (Agritech Dark)
 *
 * Refonte V21-2 :
 *  - log_type passe en enum strict (14 valeurs, miroir Postgres)
 *  - regroupé par catégorie (SOIN / INTERVENTION / PROBLEME / AUTRE)
 *  - auto-suggestion dose + produit véto (depuis stockVeto contextuel)
 */
export interface QuickHealthFormProps {
  subjectType: 'BANDE' | 'TRUIE' | 'PORTEE' | 'VERRAT';
  subjectId: string;
  /** Type pré-sélectionné (utile pour intégration "Protocole recommandé"). */
  defaultLogType?: HealthLogType;
  onSuccess?: () => void;
}

interface FormDataState {
  type: HealthLogType;
  treatmentName: string;
  dose: string;
  produitId: string;
  notes: string;
}

const CATEGORY_META: Record<HealthLogCategory, {
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  tone: string;
}> = {
  SOIN:         { label: 'Soin / traitement', Icon: Bandage,        tone: 'text-accent' },
  INTERVENTION: { label: 'Intervention',      Icon: Scissors,       tone: 'text-text-1' },
  PROBLEME:     { label: 'Problème santé',    Icon: AlertTriangle,  tone: 'text-red' },
  AUTRE:        { label: 'Autre',             Icon: FileText,       tone: 'text-text-2' },
};

const TYPES_BY_CATEGORY: Record<HealthLogCategory, HealthLogType[]> = {
  SOIN: ['FER_J3', 'VERMIFUGE', 'VACCIN_PESTE', 'VACCIN_MYCOPLASME', 'VACCIN_AUTRE'],
  INTERVENTION: ['CASTRATION', 'COUPE_QUEUE'],
  PROBLEME: ['BOITERIE', 'TOUX', 'DIARRHEE', 'FIEVRE', 'ECRASEMENT', 'PARASITOSE'],
  AUTRE: ['AUTRE'],
};

/**
 * Cherche un produit véto qui matche au moins un mot-clé du template.
 */
function findMatchingProduit(
  type: HealthLogType,
  produits: Array<{ id: string; produit: string; type?: string; usage?: string }>,
): { id: string; produit: string } | null {
  const tpl = HEALTH_LOG_TEMPLATES[type];
  if (!tpl?.produitKeywords?.length) return null;
  const kws = tpl.produitKeywords.map(k => k.toLowerCase());
  for (const p of produits) {
    const hay = [p.produit, p.type, p.usage].filter(Boolean).join(' ').toLowerCase();
    if (kws.some(kw => hay.includes(kw))) {
      return { id: p.id, produit: p.produit };
    }
  }
  return null;
}

const QuickHealthForm: React.FC<QuickHealthFormProps> = ({
  subjectType,
  subjectId,
  defaultLogType,
  onSuccess,
}) => {
  const { refreshData, stockVeto } = useFarm();
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormDataState>(() => ({
    type: defaultLogType ?? 'AUTRE',
    treatmentName: '',
    dose: defaultLogType ? (HEALTH_LOG_TEMPLATES[defaultLogType].defaultDose ?? '') : '',
    produitId: '',
    notes: '',
  }));

  // Auto-suggest produit véto + dose au changement de type.
  useEffect(() => {
    const tpl = HEALTH_LOG_TEMPLATES[formData.type];
    const matched = findMatchingProduit(formData.type, stockVeto);
    setFormData(prev => ({
      ...prev,
      // ne pas écraser une dose saisie manuellement si elle est non vide
      dose: prev.dose || (tpl.defaultDose ?? ''),
      produitId: matched?.id ?? prev.produitId,
      treatmentName: prev.treatmentName || (matched?.produit ?? tpl.label),
    }));
    // Volontaire : on resync lorsque le type change OU lorsque les produits arrivent.
  }, [formData.type, stockVeto]);

  const groupedTypes = useMemo(() => {
    return (Object.keys(TYPES_BY_CATEGORY) as HealthLogCategory[]).map(cat => ({
      cat,
      types: TYPES_BY_CATEGORY[cat],
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!formData.treatmentName.trim()) nextErrors.treatmentName = 'Description requise';
    if (!formData.type) nextErrors.type = 'Type requis';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await insertHealthLog({
        code_id: `HL-${Date.now()}`,
        animal_type: subjectType,
        animal_code: subjectId,
        animal_reference: subjectId,
        log_type: formData.type,
        treatment_name: formData.treatmentName.trim(),
        notes: formData.notes.trim() || null,
        operator: kvGet('user_name') || 'Anonyme',
        validation_status: getDefaultValidationStatus(role),
        // V21-2 : champs additifs (peuvent être ignorés tant que la migration n'est pas appliquée)
        ...(formData.dose ? { dose_or_quantity: formData.dose } : {}),
        ...(formData.produitId ? { produit_id: formData.produitId } : {}),
      } as Parameters<typeof insertHealthLog>[0]);

      const tplLabel = HEALTH_LOG_TEMPLATES[formData.type].label;
      setFormData({
        type: 'AUTRE',
        treatmentName: '',
        dose: '',
        produitId: '',
        notes: '',
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast({
        show: true,
        message: online ? `${tplLabel} enregistré` : `${tplLabel} mis en file · sync auto`,
      });
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
    } catch {
      setToast({ show: true, message: 'Erreur enregistrement local' });
    } finally {
      setLoading(false);
    }
  };

  const currentCat = HEALTH_LOG_CATEGORIES[formData.type];
  const CatIcon = CATEGORY_META[currentCat].Icon;

  return (
    <div className="card-dense !p-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-red">
          <Stethoscope size={18} aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-wide text-text-1">
            Saisie rapide santé
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 mt-0.5">
            14 types · auto-suggestions
          </p>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── 1. Type d'intervention ────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label
            htmlFor="health-type"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Type d'intervention
          </label>
          <div
            className={[
              'rounded-md border overflow-hidden',
              'bg-bg-0 transition-colors duration-[160ms]',
              errors.type ? 'border-red' : 'border-border focus-within:border-accent',
            ].join(' ')}
          >
            <IonSelect
              id="health-type"
              aria-label="Type d'intervention santé"
              className="agritech-select"
              style={
                {
                  '--background': 'var(--color-bg-0)',
                  '--color': 'var(--color-text-0)',
                  '--placeholder-color': 'var(--color-text-2)',
                  '--placeholder-opacity': 1,
                  '--padding-start': '12px',
                  '--padding-end': '12px',
                  '--padding-top': '8px',
                  '--padding-bottom': '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  minHeight: '36px',
                } as React.CSSProperties
              }
              value={formData.type}
              onIonChange={e =>
                setFormData(prev => ({
                  ...prev,
                  type: e.detail.value as HealthLogType,
                  // Reset doses/treatment/produit pour permettre l'auto-suggestion fraîche
                  dose: '',
                  treatmentName: '',
                  produitId: '',
                }))
              }
              interface="popover"
            >
              {groupedTypes.map(({ cat, types }) => (
                <React.Fragment key={cat}>
                  <IonSelectOption disabled value={`__cat_${cat}`}>
                    {`— ${CATEGORY_META[cat].label} —`}
                  </IonSelectOption>
                  {types.map(t => (
                    <IonSelectOption key={t} value={t}>
                      {HEALTH_LOG_TEMPLATES[t].label}
                    </IonSelectOption>
                  ))}
                </React.Fragment>
              ))}
            </IonSelect>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <CatIcon size={11} aria-hidden className={CATEGORY_META[currentCat].tone} />
            <span className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              {CATEGORY_META[currentCat].label}
            </span>
          </div>
          {errors.type && (
            <p role="alert" className="font-mono text-[11px] text-red mt-1">
              {errors.type}
            </p>
          )}
        </div>

        {/* ── 2. Description / molécule ─────────────────────────────────── */}
        <div className="space-y-1.5">
          <label
            htmlFor="health-treatment"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Description / molécule
          </label>
          <input
            id="health-treatment"
            aria-label="Description du soin ou molécule administrée"
            aria-invalid={!!errors.treatmentName}
            aria-describedby={errors.treatmentName ? 'health-treatment-error' : undefined}
            className={[
              'w-full h-9 rounded-md px-3',
              'bg-bg-0 border text-text-0 placeholder:text-text-2',
              'font-mono text-[12px]',
              'outline-none transition-colors duration-[160ms]',
              'focus:border-accent focus:ring-1 focus:ring-accent',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-1px]',
              errors.treatmentName ? 'border-red' : 'border-border hover:border-text-2',
            ].join(' ')}
            placeholder="Ex: Fer dextran, Ivermectine…"
            value={formData.treatmentName}
            onChange={e => setFormData({ ...formData, treatmentName: e.target.value })}
            disabled={loading}
          />
          {errors.treatmentName && (
            <p
              id="health-treatment-error"
              role="alert"
              className="font-mono text-[11px] text-red mt-1"
            >
              {errors.treatmentName}
            </p>
          )}
        </div>

        {/* ── 3. Dose & produit (auto-suggérés) ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="health-dose"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Dose / quantité
            </label>
            <input
              id="health-dose"
              aria-label="Dose ou quantité administrée"
              className={[
                'w-full h-9 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[12px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: 1 ml, 0.3 ml/kg"
              value={formData.dose}
              onChange={e => setFormData({ ...formData, dose: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="health-produit"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Produit véto
            </label>
            <div
              className={[
                'rounded-md border overflow-hidden',
                'bg-bg-0 transition-colors duration-[160ms]',
                'border-border focus-within:border-accent',
              ].join(' ')}
            >
              <IonSelect
                id="health-produit"
                aria-label="Produit vétérinaire utilisé"
                className="agritech-select"
                style={
                  {
                    '--background': 'var(--color-bg-0)',
                    '--color': 'var(--color-text-0)',
                    '--placeholder-color': 'var(--color-text-2)',
                    '--placeholder-opacity': 1,
                    '--padding-start': '12px',
                    '--padding-end': '12px',
                    '--padding-top': '8px',
                    '--padding-bottom': '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    minHeight: '36px',
                  } as React.CSSProperties
                }
                value={formData.produitId}
                onIonChange={e =>
                  setFormData({ ...formData, produitId: e.detail.value as string })
                }
                interface="popover"
                placeholder="—"
              >
                <IonSelectOption value="">— Aucun —</IonSelectOption>
                {stockVeto.map(p => (
                  <IonSelectOption key={p.id} value={p.id}>
                    {p.produit}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>
          </div>
        </div>

        {/* ── 4. Observation libre ──────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label
            htmlFor="health-obs"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Observation
          </label>
          <textarea
            id="health-obs"
            aria-label="Observation du traitement"
            className={[
              'w-full rounded-md px-3 py-3',
              'bg-bg-0 border text-text-0 placeholder:text-text-2',
              'font-mono text-[12px]',
              'outline-none transition-colors duration-[160ms]',
              'focus:border-accent focus:ring-1 focus:ring-accent',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-1px]',
              'min-h-[80px] resize-y',
              'border-border hover:border-text-2',
            ].join(' ')}
            placeholder="Symptômes observés, gravité 1-3, contexte…"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !formData.treatmentName.trim()}
          aria-label="Valider l'intervention"
          className={[
            'pressable w-full h-[48px] rounded-md',
            'inline-flex items-center justify-center gap-2',
            'bg-red text-text-0 font-mono text-[12px] font-bold uppercase tracking-wide',
            'transition-colors duration-[160ms]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2',
            (loading || !formData.treatmentName.trim())
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:brightness-110',
          ].join(' ')}
        >
          {loading ? (
            <IonSpinner name="bubbles" className="w-5 h-5" aria-hidden="true" />
          ) : (
            <>
              <span>Valider intervention</span>
              <Send size={14} className="flex-shrink-0" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={3000}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </div>
  );
};

// Exports utilitaires pour les tests (logique pure).

export interface BuildHealthLogPayloadInput {
  subjectType: 'BANDE' | 'TRUIE' | 'PORTEE' | 'VERRAT';
  subjectId: string;
  type: HealthLogType;
  treatmentName: string;
  dose?: string;
  produitId?: string;
  notes?: string;
  operator: string;
  now?: Date;
}

/**
 * Construit le payload Insert pour `health_logs` à partir des données form.
 * Logique pure pour facilité de test (pas de DOM, pas de Supabase).
 */
export function buildHealthLogPayload(input: BuildHealthLogPayloadInput): {
  code_id: string;
  animal_type: string;
  animal_code: string;
  animal_reference: string;
  log_type: HealthLogType;
  treatment_name: string;
  notes: string | null;
  operator: string;
  dose_or_quantity?: string;
  produit_id?: string;
} {
  const ts = (input.now ?? new Date()).getTime();
  const payload: ReturnType<typeof buildHealthLogPayload> = {
    code_id: `HL-${ts}`,
    animal_type: input.subjectType,
    animal_code: input.subjectId,
    animal_reference: input.subjectId,
    log_type: input.type,
    treatment_name: input.treatmentName.trim(),
    notes: input.notes?.trim() ? input.notes.trim() : null,
    operator: input.operator,
  };
  if (input.dose && input.dose.trim()) payload.dose_or_quantity = input.dose.trim();
  if (input.produitId) payload.produit_id = input.produitId;
  return payload;
}

/**
 * Suggère dose + produit (id, libellé) à partir du type et du stock véto.
 * Exporté pour les tests.
 */
export function suggestForType(
  type: HealthLogType,
  produits: Array<{ id: string; produit: string; type?: string; usage?: string }>,
): { dose: string; produit: { id: string; produit: string } | null } {
  const tpl = HEALTH_LOG_TEMPLATES[type];
  return {
    dose: tpl.defaultDose ?? '',
    produit: findMatchingProduit(type, produits),
  };
}

export default QuickHealthForm;
