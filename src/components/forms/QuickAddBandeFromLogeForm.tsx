/**
 * QuickAddBandeFromLogeForm — Workflow "Créer une bande dans une loge".
 * ════════════════════════════════════════════════════════════════════════
 * 3 steps simples pour le porcher :
 *   1. Sélection LOGE active et libre
 *   2. Effectif + poids moyen + date d'entrée (+ truie/verrat optionnels)
 *   3. Récap + génération auto (code_id, statut, phase)
 *
 * Cible : workflow quotidien Christophe — saisir une nouvelle bande de
 * porcelets en 30 secondes sans toucher à la mise-bas historique.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { ChevronLeft, ChevronRight, Save, Plus } from 'lucide-react';

import { BottomSheet } from '../agritech';
import {
  insertBatch,
  listLoges,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey } from './useFormA11y';
import type { Loge } from '../../types/farm';
import {
  detectPhaseFromPoids,
  generateBandeCodeId,
  selectAvailableLoges,
  todayIso,
  validateFromLogeStep2,
  type FromLogeValidation,
} from './quickAddBandeFromLogeLogic';
import { logeNumeroPrefixed } from '../../features/troupeau/TroupeauPorceletsView';

// ─── Props ───────────────────────────────────────────────────────────────────

interface QuickAddBandeFromLogeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Si fourni, ouvre le form directement à l'étape 2 avec la loge pré-sélectionnée. */
  preselectedLogeId?: string;
}

type Step = 1 | 2 | 3;

// ─── Composant ───────────────────────────────────────────────────────────────

const QuickAddBandeFromLogeForm: React.FC<QuickAddBandeFromLogeFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedLogeId,
}) => {
  const { truies, verrats, bandes, refreshData } = useFarm();
  const [step, setStep] = useState<Step>(1);
  const [loges, setLoges] = useState<Loge[]>([]);
  const [selectedLogeId, setSelectedLogeId] = useState<string>('');
  const [effectif, setEffectif] = useState('');
  const [poidsMoyenKg, setPoidsMoyenKg] = useState('');
  const [dateEntree, setDateEntree] = useState(todayIso());
  const [truieMereId, setTruieMereId] = useState('');
  const [verratPereId, setVerratPereId] = useState('');
  const [errors, setErrors] = useState<FromLogeValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Reset à l'ouverture / fetch loges
  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setStep(preselectedLogeId ? 2 : 1);
      setSelectedLogeId(preselectedLogeId ?? '');
      setEffectif('');
      setPoidsMoyenKg('');
      setDateEntree(todayIso());
      setTruieMereId('');
      setVerratPereId('');
      setErrors({});
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then(rows => {
        if (cancelled) return;
        setLoges(rows);
      })
      .catch(() => {
        if (!cancelled) setLoges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const occupiedLogeIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of bandes) {
      if (b.logeId && (b.statut !== 'RECAP')) set.add(b.logeId);
    }
    return set;
  }, [bandes]);

  const availableLoges = useMemo(
    () => selectAvailableLoges(loges, occupiedLogeIds),
    [loges, occupiedLogeIds],
  );

  const selectedLoge = useMemo(
    () => loges.find(l => l.id === selectedLogeId) ?? null,
    [loges, selectedLogeId],
  );

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);

  // Calculs récap
  const phaseAuto = useMemo(() => {
    const p = Number(String(poidsMoyenKg).replace(',', '.'));
    return detectPhaseFromPoids(p);
  }, [poidsMoyenKg]);

  const generatedCodeId = useMemo(() => {
    if (!selectedLoge) return '';
    return generateBandeCodeId(dateEntree, selectedLoge.numero);
  }, [dateEntree, selectedLoge]);

  // ─── Step navigation ─────────────────────────────────────────────────────

  const goStep2 = (logeId: string): void => {
    setSelectedLogeId(logeId);
    setStep(2);
  };

  const goStep3 = (): void => {
    const result = validateFromLogeStep2({ effectif, poidsMoyenKg, dateEntree });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedLoge) return;
    const result = validateFromLogeStep2({ effectif, poidsMoyenKg, dateEntree });
    if (!result.ok || !result.values) {
      setErrors(result.errors);
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      await insertBatch({
        code_id: generatedCodeId,
        sow_id: truieMereId || null,
        boar_id: verratPereId || null,
        loge_id: selectedLoge.id,
        porcelets_nes_total: result.values.effectif,
        porcelets_nes_vivants: result.values.effectif,
        poids_initial_kg: result.values.poidsMoyenKg,
        poids_moyen_kg: result.values.poidsMoyenKg,
        date_mise_bas: result.values.dateEntree,
        statut: phaseAuto.statut,
        phase: phaseAuto.phase,
        validation_status: 'VALIDATED',
      } as Parameters<typeof insertBatch>[0]);

      setToast(
        `Bande ${generatedCodeId} créée dans ${logeNumeroPrefixed(selectedLoge)}`,
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────────────

  const inputBase = (hasError: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[14px]',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      hasError ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  const labelCls = 'block text-mono-label text-text-2';

  const titleByStep: Record<Step, string> = {
    1: 'Choisir une loge',
    2: 'Effectif et poids',
    3: 'Vérifier et créer',
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={titleByStep[step]}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création d'une nouvelle bande de porcelets"
          data-testid="quick-add-bande-from-loge-form"
          data-step={step}
        >
          {/* Stepper visuel */}
          <ol
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-text-2"
            aria-label="Progression"
          >
            {[1, 2, 3].map(n => (
              <li
                key={n}
                aria-current={step === n ? 'step' : undefined}
                className={[
                  'flex-1 text-center px-2 py-1 rounded-sm border',
                  step === n
                    ? 'border-accent text-accent bg-bg-2'
                    : step > n
                      ? 'border-border text-text-1 bg-bg-2'
                      : 'border-border text-text-2',
                ].join(' ')}
              >
                {n}.{' '}
                {n === 1 ? 'Loge' : n === 2 ? 'Effectif' : 'Récap'}
              </li>
            ))}
          </ol>

          {/* ── Step 1 — Sélection loge ─────────────────────────────────── */}
          {step === 1 && (
            <section
              aria-label="Sélection de la loge"
              className="space-y-3"
              data-testid="step-1"
            >
              <p className="text-mono-label text-text-1">
                Sélectionne la loge dans laquelle tu installes la bande.
              </p>
              {availableLoges.length === 0 ? (
                <div className="card-dense text-center py-8">
                  <p className="text-mono-label text-text-1">
                    Toutes les loges sont occupées
                  </p>
                  <p className="font-mono text-[11px] text-text-2 mt-1">
                    Libère une loge ou crée-en une nouvelle.
                  </p>
                </div>
              ) : (
                <ul
                  className="card-dense !p-0 overflow-hidden divide-y divide-border"
                  data-testid="loges-list"
                >
                  {availableLoges.map(l => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => goStep2(l.id)}
                        className="pressable w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-bg-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                        aria-label={`Sélectionner ${logeNumeroPrefixed(l)}`}
                        data-testid={`loge-option-${l.id}`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-[13px] font-bold text-text-0">
                            {logeNumeroPrefixed(l)}
                          </span>
                          <span className="font-mono text-[10px] text-text-2 mt-0.5">
                            {l.type.replace('_', '-').toLowerCase()}
                            {l.capaciteMax != null
                              ? ` · capacité ${l.capaciteMax}`
                              : ''}
                            {l.batiment ? ` · ${l.batiment}` : ''}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-text-2 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ── Step 2 — Saisie effectif + poids ────────────────────────── */}
          {step === 2 && (
            <section
              aria-label="Effectif et poids"
              className="space-y-4"
              data-testid="step-2"
            >
              {selectedLoge && (
                <div className="card-dense flex items-center gap-3 py-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent font-mono text-[10px] font-bold">
                    {logeNumeroPrefixed(selectedLoge).split('-')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-mono-label text-text-0">
                      {logeNumeroPrefixed(selectedLoge)}
                    </p>
                    <p className="font-mono text-[10px] text-text-2 mt-0.5">
                      {selectedLoge.type.replace('_', '-').toLowerCase()}
                      {selectedLoge.capaciteMax != null
                        ? ` · capacité ${selectedLoge.capaciteMax}`
                        : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="qabfl-effectif" className={labelCls}>
                    Porcelets <span className="text-red normal-case">·</span>
                  </label>
                  <input
                    id="qabfl-effectif"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={200}
                    step={1}
                    aria-required="true"
                    aria-invalid={!!errors.effectif}
                    aria-describedby={errors.effectif ? 'qabfl-effectif-err' : undefined}
                    className={inputBase(!!errors.effectif)}
                    placeholder="Ex: 24"
                    value={effectif}
                    onChange={e => setEffectif(e.target.value)}
                  />
                  {errors.effectif ? (
                    <p
                      id="qabfl-effectif-err"
                      role="alert"
                      className="font-mono text-[11px] text-red"
                    >
                      {errors.effectif}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="qabfl-poids" className={labelCls}>
                    Poids moyen kg <span className="text-red normal-case">·</span>
                  </label>
                  <input
                    id="qabfl-poids"
                    type="number"
                    inputMode="decimal"
                    min={0.5}
                    max={200}
                    step={0.1}
                    aria-required="true"
                    aria-invalid={!!errors.poidsMoyenKg}
                    aria-describedby={errors.poidsMoyenKg ? 'qabfl-poids-err' : undefined}
                    className={inputBase(!!errors.poidsMoyenKg)}
                    placeholder="Ex: 18.5"
                    value={poidsMoyenKg}
                    onChange={e => setPoidsMoyenKg(e.target.value)}
                  />
                  {errors.poidsMoyenKg ? (
                    <p
                      id="qabfl-poids-err"
                      role="alert"
                      className="font-mono text-[11px] text-red"
                    >
                      {errors.poidsMoyenKg}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="qabfl-date" className={labelCls}>
                  Date d'entrée loge
                </label>
                <input
                  id="qabfl-date"
                  type="date"
                  aria-invalid={!!errors.dateEntree}
                  aria-describedby={errors.dateEntree ? 'qabfl-date-err' : undefined}
                  className={inputBase(!!errors.dateEntree)}
                  value={dateEntree}
                  onChange={e => setDateEntree(e.target.value)}
                />
                {errors.dateEntree ? (
                  <p
                    id="qabfl-date-err"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.dateEntree}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="qabfl-truie" className={labelCls}>
                  Truie mère <span className="text-text-2 normal-case">· optionnel</span>
                </label>
                <select
                  id="qabfl-truie"
                  className={inputBase(false)}
                  value={truieMereId}
                  onChange={e => setTruieMereId(e.target.value)}
                >
                  <option value="">— Inconnue —</option>
                  {truies.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.displayId || t.id}
                      {t.nom ? ` · ${t.nom}` : ''}
                      {t.boucle ? ` (${t.boucle})` : ''}
                    </option>
                  ))}
                </select>
                <p className="font-mono text-[10px] text-text-2">
                  Si tu connais la truie mère, sélectionne-la pour la traçabilité.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="qabfl-verrat" className={labelCls}>
                  Verrat père <span className="text-text-2 normal-case">· optionnel</span>
                </label>
                <select
                  id="qabfl-verrat"
                  className={inputBase(false)}
                  value={verratPereId}
                  onChange={e => setVerratPereId(e.target.value)}
                >
                  <option value="">— Inconnu —</option>
                  {verrats.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.displayId || v.id}
                      {v.nom ? ` · ${v.nom}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="pressable flex-1 h-12 rounded-md inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 font-mono text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
                  aria-label="Retour à la sélection de loge"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Retour
                </button>
                <button
                  type="button"
                  onClick={goStep3}
                  className="pressable flex-[2] h-12 rounded-md inline-flex items-center justify-center gap-2 bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide hover:brightness-110"
                  aria-label="Étape suivante : récap"
                  data-testid="step-2-next"
                >
                  Suivant
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </section>
          )}

          {/* ── Step 3 — Récap + génération ─────────────────────────────── */}
          {step === 3 && selectedLoge && (
            <section
              aria-label="Récapitulatif"
              className="space-y-4"
              data-testid="step-3"
            >
              <div className="card-dense space-y-2 py-3">
                <RecapRow
                  label="Loge"
                  value={`${logeNumeroPrefixed(selectedLoge)} · ${selectedLoge.type.replace('_', '-').toLowerCase()}`}
                />
                <RecapRow label="Effectif" value={`${effectif} porcelets`} />
                <RecapRow
                  label="Poids moyen"
                  value={`${poidsMoyenKg} kg`}
                />
                <RecapRow
                  label="Phase auto-détectée"
                  value={phaseAuto.label}
                  highlight
                />
                <RecapRow
                  label="Code bande"
                  value={generatedCodeId}
                  mono
                />
                <RecapRow
                  label="Date d'entrée"
                  value={dateEntree}
                  mono
                />
                {truieMereId ? (
                  <RecapRow
                    label="Truie mère"
                    value={
                      truies.find(t => t.id === truieMereId)?.displayId ?? truieMereId
                    }
                  />
                ) : null}
                {verratPereId ? (
                  <RecapRow
                    label="Verrat père"
                    value={
                      verrats.find(v => v.id === verratPereId)?.displayId ?? verratPereId
                    }
                  />
                ) : null}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={saving}
                  className="pressable flex-1 h-14 rounded-md inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 font-mono text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
                  aria-label="Retour à l'effectif"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  aria-busy={saving}
                  className="pressable flex-[2] h-14 rounded-md inline-flex items-center justify-center gap-2 bg-accent text-bg-0 font-mono text-[13px] font-bold uppercase tracking-wide hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Créer la bande"
                  data-testid="step-3-submit"
                >
                  {saving ? (
                    <span className="animate-pulse">Création…</span>
                  ) : (
                    <>
                      <Plus size={14} aria-hidden="true" />
                      Créer la bande
                      <Save size={14} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </section>
          )}
        </form>
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={2200}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

// ─── Sous-composant RecapRow ─────────────────────────────────────────────────

interface RecapRowProps {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}

const RecapRow: React.FC<RecapRowProps> = ({ label, value, mono, highlight }) => (
  <div className="flex items-center justify-between gap-3 py-1">
    <span className="font-mono text-[10px] uppercase tracking-wide text-text-2">
      {label}
    </span>
    <span
      className={[
        mono ? 'font-mono tabular-nums' : '',
        'text-[13px]',
        highlight ? 'text-accent font-bold' : 'text-text-0',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {value}
    </span>
  </div>
);

export default QuickAddBandeFromLogeForm;
