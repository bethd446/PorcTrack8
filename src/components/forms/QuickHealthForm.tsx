import React, { useEffect, useMemo, useState } from 'react';
import { Stethoscope, Send, Bandage, Scissors, AlertTriangle, FileText } from 'lucide-react';
import { insertHealthLog } from '../../services/supabaseWrites';
import { AppToast, useAppToast } from '../agritech';
import { Button, FormField, Input, Section, Select, Textarea } from '@/design-system';
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
 * QuickHealthForm — Saisie rapide d'une intervention santé (V44 archétype 5).
 *
 * Refonte V44 :
 *  - Remplace 12 IonSelect/IonInput legacy par Select/Input/Textarea du DS V2
 *  - Sections UPPERCASE (INFORMATIONS PRINCIPALES / TRAITEMENT / NOTES)
 *  - useAppToast (file d'attente standardisée) à la place d'IonToast
 *  - Logique métier 100 % préservée : insertHealthLog + auto-suggestions dose/produit véto
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
  const { show: showToast, toastProps } = useAppToast();
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
      showToast(
        online ? `${tplLabel} enregistré` : `${tplLabel} mis en file · sync auto`,
        'success',
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
    } catch {
      showToast('Erreur enregistrement local', 'error');
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
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-1">
            Saisie rapide santé
          </h3>
          <p className="text-mono-micro text-text-2 mt-0.5">
            14 types · auto-suggestions
          </p>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* ═══ Section : Informations principales ═════════════════════════ */}
        <Section label="INFORMATIONS PRINCIPALES" />

        <FormField label="Type d'intervention" required error={errors.type}>
          <Select
            id="health-type"
            aria-label="Type d'intervention santé"
            aria-required="true"
            aria-invalid={!!errors.type}
            value={formData.type}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                type: e.target.value as HealthLogType,
                // Reset doses/treatment/produit pour permettre l'auto-suggestion fraîche
                dose: '',
                treatmentName: '',
                produitId: '',
              }))
            }
            disabled={loading}
          >
            {groupedTypes.map(({ cat, types }) => (
              <optgroup key={cat} label={`— ${CATEGORY_META[cat].label} —`}>
                {types.map(t => (
                  <option key={t} value={t}>
                    {HEALTH_LOG_TEMPLATES[t].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </FormField>

        <div className="flex items-center gap-1.5 -mt-2">
          <CatIcon size={11} aria-hidden className={CATEGORY_META[currentCat].tone} />
          <span className="text-mono-micro text-text-2">
            {CATEGORY_META[currentCat].label}
          </span>
        </div>

        {/* ═══ Section : Traitement ═══════════════════════════════════════ */}
        <Section label="TRAITEMENT" />

        <FormField
          label="Description / molécule"
          required
          error={errors.treatmentName}
        >
          <Input
            id="health-treatment"
            aria-label="Description du soin ou molécule administrée"
            aria-invalid={!!errors.treatmentName}
            invalid={!!errors.treatmentName}
            placeholder="Ex: Fer dextran, Ivermectine…"
            value={formData.treatmentName}
            onChange={e => setFormData({ ...formData, treatmentName: e.target.value })}
            disabled={loading}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Dose / quantité" hint="optionnel">
            <Input
              id="health-dose"
              aria-label="Dose ou quantité administrée"
              placeholder="Ex: 1 ml, 0.3 ml/kg"
              value={formData.dose}
              onChange={e => setFormData({ ...formData, dose: e.target.value })}
              disabled={loading}
            />
          </FormField>

          <FormField label="Produit véto" hint="optionnel">
            <Select
              id="health-produit"
              aria-label="Produit vétérinaire utilisé"
              value={formData.produitId}
              onChange={e =>
                setFormData({ ...formData, produitId: e.target.value })
              }
              disabled={loading}
            >
              <option value="">— Aucun —</option>
              {stockVeto.map(p => (
                <option key={p.id} value={p.id}>
                  {p.produit}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* ═══ Section : Notes ════════════════════════════════════════════ */}
        <Section label="NOTES" />

        <FormField label="Observation" hint="optionnel">
          <Textarea
            id="health-obs"
            aria-label="Observation du traitement"
            placeholder="Symptômes observés, gravité 1-3, contexte…"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            disabled={loading}
          />
        </FormField>

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => {
              setFormData({
                type: 'AUTRE',
                treatmentName: '',
                dose: '',
                produitId: '',
                notes: '',
              });
              setErrors({});
            }}
            disabled={loading}
            ariaLabel="Annuler la saisie"
          >
            Annuler
          </Button>
          <Button
            variant="danger"
            type="submit"
            disabled={loading || !formData.treatmentName.trim()}
            aria-busy={loading}
            ariaLabel="Valider l'intervention"
          >
            {loading ? (
              <span className="animate-pulse">Enregistrement…</span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Valider intervention
                <Send size={14} className="flex-shrink-0" aria-hidden="true" />
              </span>
            )}
          </Button>
        </div>
      </form>

      <AppToast {...toastProps} />
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
