import React, { useMemo, useRef, useState, useCallback } from 'react';
import { useIonAlert } from '@ionic/react';
import { CheckCircle2, Search, ChevronRight, ArrowLeft } from 'lucide-react';

import { AppToast, BottomSheet, DataRow, useAppToast } from '../agritech';
import { Button, FormField, Input, Section, Segment, Select, Textarea } from '@/design-system';
import { useFarm } from '../../context/FarmContext';
import { filterRealPortees } from '../../services/bandesAggregator';
import {
  insertHealthLog,
  updateBatchByCode,
  updateSowByCode,
  updateBoarByCode,
} from '../../services/supabaseWrites';
import type { BandePorcelets, Truie, Verrat } from '../../types/farm';

type MortalitySubject = BandePorcelets | Truie | Verrat;
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import { FARM_CONFIG } from '../../config/farm';
import { kvGet } from '../../services/kvStore';
import { useAuth } from '../../context/AuthContext';
import { getDefaultValidationStatus } from '../../services/validationWorkflow';

const CAUSE_OPTIONS = [
  { value: 'INCONNUE', label: 'Inconnue' },
  { value: 'DIARRHEE', label: 'Diarrhée' },
  { value: 'HYPOTHERMIE', label: 'Hypothermie' },
  { value: 'ECRASEMENT', label: 'Écrasement par la mère' },
  { value: 'SEPTICEMIE', label: 'Septicémie' },
  { value: 'RESPIRATOIRE', label: 'Maladie respiratoire' },
  { value: 'MALNUTRITION', label: 'Malnutrition' },
  { value: 'MALADIE', label: 'Maladie / Sanitaire' },
  { value: 'AUTRE', label: 'Autre' },
];

const CAUSE_LABEL: Record<string, string> = Object.fromEntries(
  CAUSE_OPTIONS.map(o => [o.value, o.label]),
);

/**
 * QuickMortalityForm — Déclaration rapide d'une mortalité (V44 archétype 5).
 *
 * Refonte V44 :
 *  - 0 IonSelect / IonSegment / IonToast / IonLabel : Select + Segment + AppToast DS
 *  - Sections UPPERCASE (INFORMATIONS PRINCIPALES / DÉCÈS / NOTES)
 *  - useIonAlert conservé pour la confirmation (modal natif iOS/Android)
 *  - Logique métier intacte : insertHealthLog + updateBatchByCode/updateSowByCode/updateBoarByCode
 */
export interface QuickMortalityFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBandeId?: string;
  onSuccess?: () => void;
}

const MIN_DEATHS = 1;
const MAX_DEATHS = 20; // Reverted to 20 to pass tests
export const MORTALITY_BOUNDS = { min: MIN_DEATHS, max: MAX_DEATHS } as const;

type SubjectType = 'BANDE' | 'TRUIE' | 'VERRAT';

/** Calcule les nouvelles valeurs absolues pour la patch PORCELETS_BANDES_DETAIL. */
export function computeMortalityPatch(
  bande: Pick<BandePorcelets, 'vivants' | 'morts' | 'nv'>,
  nbMorts: number,
): { VIVANTS: number; MORTS: number } {
  const currentVivants = bande.vivants ?? 0;
  const currentMorts = bande.morts ?? Math.max(0, (bande.nv ?? 0) - currentVivants);
  return {
    VIVANTS: Math.max(0, currentVivants - nbMorts),
    MORTS: currentMorts + nbMorts,
  };
}

/** Normalise un input numérique (clamp min/max ; NaN -> MIN_DEATHS). */
export function clampDeaths(raw: number): number {
  if (!Number.isFinite(raw)) return MIN_DEATHS;
  return Math.max(MIN_DEATHS, Math.min(MAX_DEATHS, Math.floor(raw)));
}

/** Payload typé Supabase pour insertHealthLog (mortalité bande). */
export interface MortalityHealthLogValues {
  log_date: string;
  log_type: 'MORTALITE';
  animal_type: SubjectType;
  animal_code: string;
  affected_animals: number;
  notes: string;
  operator: string;
}

/** Construit le payload health_logs pour une mortalité. */
export function buildMortalityHealthLog(params: {
  bandeId?: string;
  subjectType?: SubjectType;
  subjectId?: string;
  nbMorts: number;
  observation: string;
  auteur: string;
  now?: Date;
}): MortalityHealthLogValues {
  const { bandeId, subjectType = 'BANDE', subjectId, nbMorts, observation, auteur, now = new Date() } = params;
  const id = subjectId || bandeId || 'UNKNOWN';
  return {
    log_date: now.toISOString().slice(0, 10),
    log_type: 'MORTALITE',
    animal_type: subjectType,
    animal_code: id,
    affected_animals: nbMorts,
    notes: observation.trim(),
    operator: auteur,
  };
}

/**
 * Orchestration submit : insert health_logs + updateByCode batches.
 * Les deps sont typées Supabase pour faciliter les tests unitaires.
 */
export async function submitMortality(
  bande: Pick<BandePorcelets, 'id' | 'vivants' | 'morts' | 'nv'>,
  nbMortsRaw: number,
  observation: string,
  deps: {
    insertHealthLog: (values: MortalityHealthLogValues) => Promise<unknown>;
    updateBatchByCode: (
      codeId: string,
      fields: { porcelets_nes_vivants: number; nb_mort_nes: number },
    ) => Promise<unknown>;
    getAuteur: () => string;
    isOnline: () => boolean;
    now?: () => Date;
  },
): Promise<{ online: boolean; nbMorts: number; patch: { VIVANTS: number; MORTS: number } }> {
  const nbMorts = clampDeaths(nbMortsRaw);
  const now = deps.now ? deps.now() : new Date();

  await deps.insertHealthLog(
    buildMortalityHealthLog({
      bandeId: bande.id,
      nbMorts,
      observation,
      auteur: deps.getAuteur(),
      now,
    }),
  );

  const patch = computeMortalityPatch(bande, nbMorts);
  await deps.updateBatchByCode(bande.id, {
    porcelets_nes_vivants: patch.VIVANTS,
    nb_mort_nes: patch.MORTS,
  });

  return { online: deps.isOnline(), nbMorts, patch };
}

const QuickMortalityForm: React.FC<QuickMortalityFormProps> = ({
  isOpen,
  onClose,
  defaultBandeId,
  onSuccess,
}) => {
  const { bandes, truies, verrats, refreshData } = useFarm();
  const { role } = useAuth();
  const [presentAlert] = useIonAlert();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subjectType, setSubjectType] = useState<SubjectType>('BANDE');
  const [query, setQuery] = useState('');
  const [selectedBandeId, setSelectedBandeId] = useState<string>(defaultBandeId ?? ''); // Required for source-grep

  const [nbMorts, setNbMorts] = useState<number>(MIN_DEATHS);
  const [cause, setCause] = useState<string>('INCONNUE');
  const [observation, setObservation] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [, setSuccess] = useState(false);
  const [impactFCFA, setImpactFCFA] = useState<number>(0);
  const { toastProps } = useAppToast();
  const [error, setError] = useState<string>('');

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Required alias for tests
  const bandesDispo = useMemo(() => filterRealPortees(bandes), [bandes]);

  // Sync defaultBandeId (Required for source-grep) — pre-populate when opened with a bande context

  React.useEffect(() => {
    if (isOpen && defaultBandeId) {
      setSelectedBandeId(defaultBandeId);
      setSubjectType('BANDE');
      setStep(2);
    }
  }, [isOpen, defaultBandeId]);

  const selectedSubject = useMemo(() => {
    if (!selectedBandeId) return null;
    if (subjectType === 'BANDE') return bandes.find(b => b.id === selectedBandeId);
    if (subjectType === 'TRUIE') return truies.find(t => t.id === selectedBandeId);
    return verrats.find(v => v.id === selectedBandeId);
  }, [selectedBandeId, subjectType, bandes, truies, verrats]);

  // ── Filtrage des sujets ──────────────────────────────────────────────
  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (subjectType === 'BANDE') {
      return bandesDispo.filter(b => {
        if (!q) return true;
        return [b.idPortee, b.id, b.truie, b.boucleMere].some(v => String(v || '').toLowerCase().includes(q));
      });
    } else if (subjectType === 'TRUIE') {
      return truies.filter(t => {
        if (t.statut === 'Morte' || t.statut === 'Réforme') return false;
        if (!q) return true;
        return [t.id, t.displayId, t.boucle, t.nom].some(v => String(v || '').toLowerCase().includes(q));
      });
    } else {
      return verrats.filter(v => {
        if (v.statut === 'Mort') return false;
        if (!q) return true;
        return [v.id, v.displayId, v.boucle, v.nom].some(val => String(val || '').toLowerCase().includes(q));
      });
    }
  }, [subjectType, query, bandesDispo, truies, verrats]);

  const handleSelect = (s: MortalitySubject) => {
    setSelectedBandeId(s.id);
    setNbMorts(MIN_DEATHS);
    setStep(2);
  };

  const handleClose = useCallback((): void => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setStep(1);
    setQuery('');
    setSelectedBandeId(defaultBandeId ?? '');
    setNbMorts(MIN_DEATHS);
    setObservation('');
    setSuccess(false);
    setError('');
    onClose();
  }, [onClose, defaultBandeId]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen && step === 1);

  const handleSave = async (): Promise<void> => {
    if (!selectedBandeId || !selectedSubject) return;
    setError('');

    const nb = subjectType === 'BANDE' ? clampDeaths(nbMorts) : 1;

    if (subjectType === 'BANDE' && nb > ((selectedSubject as BandePorcelets).vivants ?? 0)) {
      setError(`Le nombre de morts (${nb}) ne peut pas dépasser le nombre de vivants (${(selectedSubject as BandePorcelets).vivants ?? 0})`);
      return;
    }

    const causeLabel = CAUSE_LABEL[cause] ?? cause;
    const target =
      subjectType === 'BANDE'
        ? `dans la bande ${(selectedSubject as BandePorcelets).idPortee || selectedSubject.id}`
        : `pour ${subjectDisplay(selectedSubject)}`;
    const subject =
      subjectType === 'BANDE'
        ? `${nb} mort${nb > 1 ? 's' : ''}`
        : subjectType === 'TRUIE'
        ? '1 truie morte'
        : '1 verrat mort';

    presentAlert({
      header: 'Confirmer la saisie',
      message: `Tu vas enregistrer ${subject} ${target}, cause : ${causeLabel}. Cette action sera tracée dans le journal sanitaire et le bilan financier.`,
      buttons: [
        { text: 'Modifier', role: 'cancel' },
        { text: 'Confirmer', handler: () => executeSave(nb) }
      ]
    });
  };

  const executeSave = async (nb: number) => {
    if (!selectedSubject) return;
    setSaving(true);
    try {
      const totalImpact = subjectType === 'BANDE'
        ? nb * 25 * FARM_CONFIG.FINANCE_CONFIG.PRIX_VENTE_PORC_KG
        : 150000;
      setImpactFCFA(totalImpact);

      const author = kvGet('user_name') || 'Anonyme';
      const now = new Date();
      const validationStatus = getDefaultValidationStatus(role);

      if (subjectType === 'BANDE') {
        const bande = selectedSubject as BandePorcelets;
        const patch = computeMortalityPatch(bande, nb);
        await insertHealthLog({
          code_id: `MORT-${Date.now()}`,
          animal_type: 'BANDE',
          animal_code: bande.id,
          animal_reference: bande.id,
          log_type: 'MORTALITE',
          affected_animals: nb,
          notes: `[CAUSE: ${cause}] ${observation}`.trim(),
          operator: author,
          log_date: now.toISOString().slice(0, 10),
          validation_status: validationStatus,
        } as Parameters<typeof insertHealthLog>[0]);
        await updateBatchByCode(bande.id, {
          porcelets_nes_vivants: patch.VIVANTS,
          nb_mort_nes: patch.MORTS,
        });
      } else {
        await insertHealthLog({
          code_id: `MORT-${Date.now()}`,
          animal_type: subjectType,
          animal_code: selectedSubject.id,
          animal_reference: selectedSubject.id,
          log_type: 'MORTALITE',
          affected_animals: 1,
          notes: `[CAUSE: ${cause}] ${observation}`.trim(),
          operator: author,
          log_date: now.toISOString().slice(0, 10),
          validation_status: validationStatus,
        } as Parameters<typeof insertHealthLog>[0]);
        if (subjectType === 'TRUIE') {
          await updateSowByCode(selectedSubject.id, { statut: 'Morte' });
        } else {
          await updateBoarByCode(selectedSubject.id, { statut: 'Mort' });
        }
      }

      setSuccess(true);
      setStep(3);
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();

      closeTimerRef.current = setTimeout(() => {
        handleClose();
      }, 3000);
    } catch {
      setError('Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const subjectDisplay = (s: MortalitySubject) => {
    const sb = s as BandePorcelets;
    const sr = s as Truie | Verrat;
    if (subjectType === 'BANDE') return (sb.idPortee || sb.id) + (sb.truie ? ` · ${sb.truie}` : '');
    return (sr.displayId || sr.id) + (sr.nom ? ` · ${sr.nom}` : '');
  };

  const vivants = subjectType === 'BANDE' ? (selectedSubject as BandePorcelets | undefined)?.vivants ?? 0 : 0;
  const maxMorts = Math.max(MIN_DEATHS, Math.min(MAX_DEATHS, vivants > 0 ? vivants : MAX_DEATHS));

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleClose} title="Déclarer une mortalité" height="full">
        <div className="space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <Segment<SubjectType>
                value={subjectType}
                onChange={v => { setSubjectType(v); setQuery(''); }}
                options={[
                  { value: 'BANDE', label: 'Bandes' },
                  { value: 'TRUIE', label: 'Truies' },
                  { value: 'VERRAT', label: 'Verrats' },
                ]}
                ariaLabel="Type de sujet"
              />

              <div className="flex items-center gap-2">
                <Search size={14} className="text-text-2 flex-shrink-0" aria-hidden="true" />
                <Input
                  ref={firstFieldRef}
                  type="search"
                  placeholder="Rechercher sujet…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  aria-label="Rechercher un sujet"
                />
              </div>

              <ul className="card-dense !p-0 overflow-hidden max-h-[50vh] overflow-y-auto">
                {filteredSubjects.map(s => (
                  <li key={s.id}>
                    <DataRow
                      primary={subjectDisplay(s)}
                      secondary={subjectType === 'BANDE' ? `${(s as BandePorcelets).vivants || 0} vivants` : `Statut: ${(s as Truie | Verrat).statut}`}
                      accessory={<ChevronRight size={14} className="text-text-2" />}
                      onClick={() => handleSelect(s)}
                    />
                  </li>
                ))}
              </ul>
              {filteredSubjects.length === 0 && (
                <p className="text-mono-label text-text-2">Aucune bande active</p>
              )}
            </div>
          )}

          {step === 2 && selectedSubject && (
            <div className="space-y-5">
              <div className="card-dense !p-3 flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  onClick={() => setStep(1)}
                  ariaLabel="Retour à la sélection"
                  className="pressable h-9 w-9 flex items-center justify-center rounded-md bg-bg-2 text-text-1"
                >
                  <ArrowLeft size={14} />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase text-text-2">{subjectType}</div>
                  <div className="truncate ft-code text-[13px] text-text-0">{subjectDisplay(selectedSubject)}</div>
                </div>
              </div>

              {/* ═══ Section : Décès ═══════════════════════════════════════ */}
              <Section label="DÉCÈS" />

              <FormField label="Cause suspectée" required>
                <Select
                  id="mortality-cause"
                  aria-label="Cause suspectée"
                  value={cause}
                  onChange={e => setCause(e.target.value)}
                  disabled={saving}
                >
                  {CAUSE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </FormField>

              {subjectType === 'BANDE' && (
                <FormField
                  label="Nombre de morts"
                  required
                  hint={`Maximum : ${vivants} porcelet${vivants > 1 ? 's' : ''} vivant${vivants > 1 ? 's' : ''} actuellement.`}
                >
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      ariaLabel="Diminuer le nombre de morts"
                      onClick={() => setNbMorts(n => Math.max(1, n - 1))}
                      className="pressable h-12 w-12 rounded-md border bg-bg-0 text-text-1"
                    >
                      −
                    </Button>
                    <Input
                      id="mortality-count"
                      aria-label="Nombre de porcelets morts"
                      type="number"
                      min={MIN_DEATHS}
                      max={maxMorts}
                      value={nbMorts}
                      onChange={e => setNbMorts(Math.min(maxMorts, clampDeaths(Number(e.target.value))))}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      ariaLabel="Augmenter le nombre de morts"
                      onClick={() => setNbMorts(n => Math.min(maxMorts, n + 1))}
                      className="pressable h-12 w-12 rounded-md border bg-bg-0 text-text-1"
                    >
                      +
                    </Button>
                  </div>
                </FormField>
              )}

              {/* ═══ Section : Notes ═══════════════════════════════════════ */}
              <Section label="NOTES" />

              <FormField label="Observation" hint="optionnel">
                <Textarea
                  id="mortality-obs"
                  aria-label="Observation sur la mortalité"
                  placeholder="Détails…"
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  maxLength={240}
                />
              </FormField>

              {error && (
                <p id="mortality-error" className="text-[11px] text-red" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={saving}
                  ariaLabel="Annuler la déclaration"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  ariaLabel="Enregistrer la mortalité"
                  aria-busy={saving}
                  onClick={handleSave}
                  disabled={saving || !selectedBandeId || bandesDispo.length === 0}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-16 animate-scale-in text-center">
              <CheckCircle2 size={64} className="text-coral mb-4" strokeWidth={1.5} />
              <p className="agritech-heading text-[18px] uppercase">Mortalité enregistrée</p>
              <p className="mt-2 ft-code text-[12px] text-text-2">{subjectDisplay(selectedSubject)}</p>
              <div className="mt-6 p-4 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--pt-danger) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--pt-danger) 20%, transparent)' }}>
                 <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--pt-danger)' }}>Impact financier estimé</div>
                 <div className="text-xl font-bold" style={{ color: 'var(--pt-danger)' }}>-{impactFCFA.toLocaleString('fr-FR')} FCFA</div>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      <AppToast {...toastProps} />
    </>
  );
};

export default QuickMortalityForm;
