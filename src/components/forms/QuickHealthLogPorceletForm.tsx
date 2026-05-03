/**
 * QuickHealthLogPorceletForm — Signalement maladie porcelet individuel (V25)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Workflow 2 steps :
 *  - Step 1 : sélection du porcelet (boucle / sexe / statut) parmi les VIVANT
 *    et MALADE de la bande. Si `porceletId` pré-rempli en prop, on saute step 1.
 *  - Step 2 : saisie type / symptômes / diagnostic / traitement / dose / poids
 *    / notes. Submit → `insertHealthLogForPorcelet`. Toast success.
 *
 * Auto-update statut : si logType ∈ {CONSULT, TRAITEMENT}, le service patche
 * automatiquement porcelet.statut = 'MALADE'.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Stethoscope, ChevronRight, Send } from 'lucide-react';

import { BottomSheet } from '../agritech';
import {
  insertHealthLogForPorcelet,
  listPorceletsByBatch,
  type PorceletHealthLogType,
} from '../../services/supabaseWrites';
import type { PorceletIndividuel } from '../../types/farm';

interface QuickHealthLogPorceletFormProps {
  isOpen: boolean;
  onClose: () => void;
  bandeId: string;
  /** Si fourni, saute le step 1 (sélection). */
  porceletId?: string;
  /** Callback après submit OK. */
  onSuccess?: () => void;
}

const LOG_TYPES: { value: PorceletHealthLogType; label: string }[] = [
  { value: 'CONSULT', label: 'Consultation' },
  { value: 'TRAITEMENT', label: 'Traitement' },
  { value: 'VACCIN', label: 'Vaccin' },
  { value: 'ANTIBIO', label: 'Antibiotique' },
  { value: 'AUTRE', label: 'Autre' },
];

const QuickHealthLogPorceletForm: React.FC<QuickHealthLogPorceletFormProps> = ({
  isOpen,
  onClose,
  bandeId,
  porceletId: presetPorceletId,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(presetPorceletId ? 2 : 1);
  const [porcelets, setPorcelets] = useState<PorceletIndividuel[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(presetPorceletId ?? '');
  const [logType, setLogType] = useState<PorceletHealthLogType>('CONSULT');
  const [symptome, setSymptome] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [treatment, setTreatment] = useState('');
  const [doseCount, setDoseCount] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Reset complet à chaque ouverture
  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setStep(presetPorceletId ? 2 : 1);
      setSelectedId(presetPorceletId ?? '');
      setLogType('CONSULT');
      setSymptome('');
      setDiagnostic('');
      setTreatment('');
      setDoseCount('');
      setWeightKg('');
      setNotes('');
      setErrors({});
    }
  }

  // Charge la liste des porcelets de la bande
  useEffect(() => {
    if (!isOpen || !bandeId) return;
    let cancelled = false;
    setLoadingList(true);
    listPorceletsByBatch(bandeId)
      .then(rows => {
        if (cancelled) return;
        setPorcelets(rows);
      })
      .catch(e => {
        console.warn('[QuickHealthLogPorceletForm] list porcelets failed', e);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, bandeId]);

  const eligible = useMemo(
    () => porcelets.filter(p => p.statut === 'VIVANT' || p.statut === 'MALADE'),
    [porcelets],
  );

  const selectedPorcelet = useMemo(
    () => porcelets.find(p => p.id === selectedId) ?? null,
    [porcelets, selectedId],
  );

  const handleSelectPorcelet = (id: string): void => {
    setSelectedId(id);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!selectedId) nextErrors.porcelet = 'Porcelet requis';
    if (!symptome.trim()) nextErrors.symptome = 'Symptômes requis';
    const dose = doseCount.trim() ? Number(doseCount) : undefined;
    if (dose != null && (!Number.isFinite(dose) || dose < 0 || dose > 50)) {
      nextErrors.doseCount = 'Dose entre 0 et 50';
    }
    const poids = weightKg.trim() ? Number(weightKg) : undefined;
    if (poids != null && (!Number.isFinite(poids) || poids <= 0 || poids > 200)) {
      nextErrors.weightKg = 'Poids entre 0 et 200 kg';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await insertHealthLogForPorcelet({
        porceletId: selectedId,
        batchId: bandeId,
        logType,
        symptome: symptome.trim() || undefined,
        diagnostic: diagnostic.trim() || undefined,
        treatment: treatment.trim() || undefined,
        doseCount: dose,
        weightKg: poids,
        notes: notes.trim() || undefined,
      });
      const boucle = selectedPorcelet?.boucle ?? selectedId;
      setToast(`Maladie signalée pour porcelet ${boucle}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Signaler maladie porcelet"
        height="full"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-red">
            <Stethoscope size={18} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-text-1">
              {step === 1 ? 'Étape 1 — Sélection porcelet' : 'Étape 2 — Saisie maladie'}
            </p>
            <p className="text-mono-micro text-text-2 mt-0.5">
              Bande {bandeId}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div
            className="space-y-2"
            role="list"
            aria-label="Porcelets de la bande"
            data-testid="porcelet-list"
          >
            {loadingList ? (
              <p className="text-[11px] text-text-2">Chargement…</p>
            ) : eligible.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-bg-1 px-3 py-3 text-[11px] text-text-2">
                Aucun porcelet vivant ou malade dans cette bande
              </p>
            ) : (
              eligible.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPorcelet(p.id)}
                  className="pressable w-full flex items-center justify-between rounded-md border border-border bg-bg-0 px-3 py-3 text-left hover:border-accent transition-colors"
                  role="listitem"
                  aria-label={`Sélectionner porcelet ${p.boucle}`}
                  data-testid={`porcelet-item-${p.id}`}
                >
                  <div className="min-w-0">
                    <p className="ft-code text-[13px] text-text-0">
                      {p.boucle}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-text-2 mt-0.5">
                      {p.sexe} · {p.statut}
                      {p.poidsCourantKg != null
                        ? ` · ${p.poidsCourantKg} kg`
                        : ''}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-text-2 shrink-0"
                    aria-hidden="true"
                  />
                </button>
              ))
            )}
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 pb-8"
            noValidate
            aria-label="Saisie maladie porcelet"
          >
            {/* Récap porcelet sélectionné */}
            {selectedPorcelet && (
              <div className="rounded-md border border-border bg-bg-0 px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="ft-code text-[12px] text-text-0">
                    {selectedPorcelet.boucle}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-text-2 mt-0.5">
                    {selectedPorcelet.sexe} · {selectedPorcelet.statut}
                  </p>
                </div>
                {!presetPorceletId && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-accent"
                  >
                    <span className="text-[10px] uppercase tracking-wide">
                      Changer
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Type */}
            <div className="space-y-1.5">
              <label
                htmlFor="hl-porc-type"
                className="block text-mono-label text-text-2"
              >
                Type
              </label>
              <select
                id="hl-porc-type"
                aria-label="Type d'intervention santé"
                className="w-full h-10 rounded-md px-3 bg-bg-0 border border-border text-text-0 text-[12px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={logType}
                onChange={e =>
                  setLogType(e.target.value as PorceletHealthLogType)
                }
                disabled={saving}
              >
                {LOG_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Symptômes (required) */}
            <div className="space-y-1.5">
              <label
                htmlFor="hl-porc-sympt"
                className="block text-mono-label text-text-2"
              >
                Symptômes <span className="text-red normal-case">· obligatoire</span>
              </label>
              <textarea
                id="hl-porc-sympt"
                aria-label="Symptômes observés"
                aria-required="true"
                aria-invalid={!!errors.symptome}
                aria-describedby={errors.symptome ? 'hl-porc-sympt-err' : undefined}
                className={[
                  'w-full rounded-md px-3 py-2 bg-bg-0 border text-text-0',
                  'text-[12px] outline-none min-h-[60px] resize-y',
                  errors.symptome
                    ? 'border-red'
                    : 'border-border focus:border-accent focus:ring-1 focus:ring-accent',
                ].join(' ')}
                value={symptome}
                onChange={e => setSymptome(e.target.value)}
                disabled={saving}
                placeholder="Ex: toux sèche, abattement, perte d'appétit…"
              />
              {errors.symptome && (
                <p
                  id="hl-porc-sympt-err"
                  role="alert"
                  className="text-[11px] text-red mt-1"
                >
                  {errors.symptome}
                </p>
              )}
            </div>

            {/* Diagnostic */}
            <div className="space-y-1.5">
              <label
                htmlFor="hl-porc-diag"
                className="block text-mono-label text-text-2"
              >
                Diagnostic
              </label>
              <textarea
                id="hl-porc-diag"
                aria-label="Diagnostic"
                className="w-full rounded-md px-3 py-2 bg-bg-0 border border-border text-text-0 text-[12px] outline-none focus:border-accent focus:ring-1 focus:ring-accent min-h-[50px] resize-y"
                value={diagnostic}
                onChange={e => setDiagnostic(e.target.value)}
                disabled={saving}
                placeholder="Hypothèse / diagnostic vétérinaire"
              />
            </div>

            {/* Traitement */}
            <div className="space-y-1.5">
              <label
                htmlFor="hl-porc-trt"
                className="block text-mono-label text-text-2"
              >
                Traitement
              </label>
              <input
                id="hl-porc-trt"
                aria-label="Traitement administré"
                className="w-full h-10 rounded-md px-3 bg-bg-0 border border-border text-text-0 text-[12px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={treatment}
                onChange={e => setTreatment(e.target.value)}
                disabled={saving}
                placeholder="Ex: Amoxicilline 15%"
              />
            </div>

            {/* Dose & Poids */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="hl-porc-dose"
                  className="block text-mono-label text-text-2"
                >
                  Dose (nb)
                </label>
                <input
                  id="hl-porc-dose"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={50}
                  aria-label="Nombre de doses"
                  aria-invalid={!!errors.doseCount}
                  className={[
                    'w-full h-10 rounded-md px-3 bg-bg-0 border text-text-0',
                    'text-[12px] outline-none',
                    errors.doseCount
                      ? 'border-red'
                      : 'border-border focus:border-accent focus:ring-1 focus:ring-accent',
                  ].join(' ')}
                  value={doseCount}
                  onChange={e => setDoseCount(e.target.value)}
                  disabled={saving}
                />
                {errors.doseCount && (
                  <p role="alert" className="text-[11px] text-red mt-1">
                    {errors.doseCount}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="hl-porc-poids"
                  className="block text-mono-label text-text-2"
                >
                  Poids (kg)
                </label>
                <input
                  id="hl-porc-poids"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={200}
                  step="0.1"
                  aria-label="Poids actuel en kg"
                  aria-invalid={!!errors.weightKg}
                  className={[
                    'w-full h-10 rounded-md px-3 bg-bg-0 border text-text-0',
                    'text-[12px] outline-none',
                    errors.weightKg
                      ? 'border-red'
                      : 'border-border focus:border-accent focus:ring-1 focus:ring-accent',
                  ].join(' ')}
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  disabled={saving}
                />
                {errors.weightKg && (
                  <p role="alert" className="text-[11px] text-red mt-1">
                    {errors.weightKg}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="hl-porc-notes"
                className="block text-mono-label text-text-2"
              >
                Notes
              </label>
              <textarea
                id="hl-porc-notes"
                aria-label="Notes additionnelles"
                className="w-full rounded-md px-3 py-2 bg-bg-0 border border-border text-text-0 text-[12px] outline-none focus:border-accent focus:ring-1 focus:ring-accent min-h-[50px] resize-y"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
                placeholder="Contexte, gravité, suivi prévu…"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !symptome.trim()}
              aria-label="Enregistrer le signalement"
              className={[
                'pressable w-full h-12 rounded-md inline-flex items-center justify-center gap-2',
                'bg-red text-text-0 text-[12px] font-bold uppercase tracking-wide',
                saving || !symptome.trim()
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:brightness-110',
              ].join(' ')}
            >
              <Send size={14} aria-hidden="true" />
              <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
            </button>
          </form>
        )}
      </BottomSheet>

      <IonToast
        isOpen={!!toast}
        message={toast}
        duration={3000}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default QuickHealthLogPorceletForm;
