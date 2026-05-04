/**
 * QuickAddBandeFromLogeForm — Workflow "Créer une bande dans une loge".
 * ════════════════════════════════════════════════════════════════════════
 * 5 steps simples pour le porcher :
 *   1. Sélection LOGE active et libre
 *   2. Effectif + poids moyen + date d'entrée
 *   3. Âge estimé (texte libre parsé : "1 mois", "30j", "3 sem"…)
 *   4. Génétique (truie mère + verrat père, optionnel, bouton "Aléatoire")
 *   5. Récap + génération auto (code_id, statut, phase)
 *
 * Modes :
 *   - Création : insertBatch + (optionnel) addBatchSource
 *   - Édition d'une bande PENDING : précharge depuis Supabase, UPDATE avec
 *     validation_status='VALIDATED'.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { ChevronLeft, ChevronRight, Save, Plus, Shuffle, X } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { Button, FormField, Input, Select } from '@/design-system';
import {
  addBatchSource,
  insertBatch,
  listLoges,
} from '../../services/supabaseWrites';
import { supabase } from '../../services/supabaseClient';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey } from './useFormA11y';
import type { Loge } from '../../types/farm';
import {
  detectPhaseFromPoids,
  generateBandeCodeId,
  parseAgeText,
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
  /**
   * Mode édition : si fourni, le form précharge les valeurs de la bande
   * `validation_status='PENDING'` correspondante et au submit fait UPDATE
   * avec `validation_status='VALIDATED'` au lieu d'INSERT.
   */
  editPendingBatchId?: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface PendingBatchPreload {
  loge_id: string | null;
  porcelets_nes_vivants: number | null;
  poids_moyen_kg: number | null;
  date_mise_bas: string | null;
  notes: string | null;
  sow_id: string | null;
  boar_id: string | null;
  age_jours_estime: number | null;
}

// Pattern utilisé pour extraire age_jours stocké en suffixe de notes quand
// la colonne age_jours_estime n'existe pas en DB (fallback). Format :
// "<notes utilisateur> [age_j=NN]"
const AGE_NOTES_RE = /\s*\[age_j=(\d+)\]\s*$/;

function extractAgeFromNotes(notes: string | null): number | null {
  if (!notes) return null;
  const m = AGE_NOTES_RE.exec(notes);
  return m ? Number(m[1]) : null;
}

function notesWithAge(baseNotes: string | null | undefined, ageJours: number | null): string | null {
  const cleaned = (baseNotes ?? '').replace(AGE_NOTES_RE, '').trimEnd();
  if (ageJours == null) return cleaned || null;
  const tag = `[age_j=${ageJours}]`;
  return cleaned ? `${cleaned} ${tag}` : tag;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const QuickAddBandeFromLogeForm: React.FC<QuickAddBandeFromLogeFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedLogeId,
  editPendingBatchId,
}) => {
  const { truies, verrats, bandes, refreshData } = useFarm();
  const isEditMode = !!editPendingBatchId;
  const [step, setStep] = useState<Step>(1);
  const [loges, setLoges] = useState<Loge[]>([]);
  const [selectedLogeId, setSelectedLogeId] = useState<string>('');
  const [effectif, setEffectif] = useState('');
  const [poidsMoyenKg, setPoidsMoyenKg] = useState('');
  const [dateEntree, setDateEntree] = useState(todayIso());
  const [ageText, setAgeText] = useState('');
  const [ageInconnu, setAgeInconnu] = useState(false);
  const [truieMereId, setTruieMereId] = useState('');
  const [verratPereId, setVerratPereId] = useState('');
  const [errors, setErrors] = useState<FromLogeValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Reset à l'ouverture
  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setStep(preselectedLogeId || isEditMode ? 2 : 1);
      setSelectedLogeId(preselectedLogeId ?? '');
      setEffectif('');
      setPoidsMoyenKg('');
      setDateEntree(todayIso());
      setAgeText('');
      setAgeInconnu(false);
      setTruieMereId('');
      setVerratPereId('');
      setErrors({});
      setSaving(false);
    }
  }

  // Fetch loges
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

  // Mode édition : précharge depuis batches PENDING
  useEffect(() => {
    if (!isOpen || !editPendingBatchId) return;
    let cancelled = false;
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('batches') as any)
          .select(
            'loge_id, porcelets_nes_vivants, poids_moyen_kg, date_mise_bas, notes, sow_id, boar_id, age_jours_estime',
          )
          .eq('id', editPendingBatchId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          // age_jours_estime absent ? retry sans la colonne.
          if (error && /age_jours_estime/i.test(error.message)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const retry = await (supabase.from('batches') as any)
              .select(
                'loge_id, porcelets_nes_vivants, poids_moyen_kg, date_mise_bas, notes, sow_id, boar_id',
              )
              .eq('id', editPendingBatchId)
              .maybeSingle();
            if (cancelled) return;
            if (retry.data) preloadFrom({ ...retry.data, age_jours_estime: null });
          }
          return;
        }
        preloadFrom(data as PendingBatchPreload);
      } catch {
        /* noop */
      }
    })();
    function preloadFrom(p: PendingBatchPreload): void {
      setSelectedLogeId(p.loge_id ?? '');
      setEffectif(p.porcelets_nes_vivants != null ? String(p.porcelets_nes_vivants) : '');
      setPoidsMoyenKg(p.poids_moyen_kg != null ? String(p.poids_moyen_kg) : '');
      setDateEntree(p.date_mise_bas ?? todayIso());
      const ageDb = p.age_jours_estime ?? extractAgeFromNotes(p.notes);
      if (ageDb != null) {
        setAgeText(`${ageDb} jours`);
        setAgeInconnu(false);
      } else {
        setAgeText('');
        setAgeInconnu(true);
      }
      setTruieMereId(p.sow_id ?? '');
      setVerratPereId(p.boar_id ?? '');
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, editPendingBatchId]);

  const occupiedLogeIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of bandes) {
      if (b.logeId && (b.statut !== 'RECAP')) {
        // En mode édition, on n'exclut pas la loge déjà attribuée à la bande
        // qu'on est en train d'éditer (sinon elle disparaîtrait de la liste).
        if (isEditMode && b.id === editPendingBatchId) continue;
        set.add(b.logeId);
      }
    }
    return set;
  }, [bandes, isEditMode, editPendingBatchId]);

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

  // Parser âge (live)
  const ageParsed = useMemo(() => {
    if (ageInconnu) return { jours: null };
    return parseAgeText(ageText);
  }, [ageText, ageInconnu]);

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

  const goStep4 = (): void => {
    setStep(4);
  };

  const goStep5 = (): void => {
    setStep(5);
  };

  // ── Sélection aléatoire d'une truie / verrat ─────────────────────────────
  const pickRandomTruie = (): void => {
    if (truies.length === 0) return;
    const picked = truies[Math.floor(Math.random() * truies.length)];
    setTruieMereId(picked.id);
  };
  const pickRandomVerrat = (): void => {
    if (verrats.length === 0) return;
    const picked = verrats[Math.floor(Math.random() * verrats.length)];
    setVerratPereId(picked.id);
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
    const ageJours = ageInconnu ? null : ageParsed.jours;

    setSaving(true);
    try {
      if (isEditMode && editPendingBatchId) {
        // ── UPDATE bande PENDING → VALIDATED ────────────────────────────
        const patch: Record<string, unknown> = {
          loge_id: selectedLoge.id,
          porcelets_nes_total: result.values.effectif,
          porcelets_nes_vivants: result.values.effectif,
          poids_initial_kg: result.values.poidsMoyenKg,
          poids_moyen_kg: result.values.poidsMoyenKg,
          date_mise_bas: result.values.dateEntree,
          statut: phaseAuto.statut,
          phase: phaseAuto.phase,
          sow_id: truieMereId || null,
          boar_id: verratPereId || null,
          validation_status: 'VALIDATED',
          age_jours_estime: ageJours,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('batches') as any)
          .update(patch)
          .eq('id', editPendingBatchId);
        if (error) {
          // Fallback sans age_jours_estime : on stocke l'âge dans notes
          if (/age_jours_estime/i.test(error.message)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existing } = await (supabase.from('batches') as any)
              .select('notes')
              .eq('id', editPendingBatchId)
              .maybeSingle();
            const baseNotes = existing?.notes ?? null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const patch2: Record<string, unknown> = { ...patch };
            delete patch2.age_jours_estime;
            patch2.notes = notesWithAge(baseNotes, ageJours);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: e2 } = await (supabase.from('batches') as any)
              .update(patch2)
              .eq('id', editPendingBatchId);
            if (e2) throw new Error(e2.message);
          } else {
            throw new Error(error.message);
          }
        }
        setToast(`Bande validée : ${logeNumeroPrefixed(selectedLoge)}`);
      } else {
        // ── INSERT nouvelle bande ───────────────────────────────────────
        const insertPayload: Record<string, unknown> = {
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
          age_jours_estime: ageJours,
        };

        let createdId: string | null = null;
        try {
          const created = await insertBatch(
            insertPayload as Parameters<typeof insertBatch>[0],
          );
          createdId = created?.id ?? null;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/age_jours_estime/i.test(msg)) {
            // Fallback : stocker age_jours dans notes.
            const fallbackPayload = { ...insertPayload };
            delete fallbackPayload.age_jours_estime;
            fallbackPayload.notes = notesWithAge(null, ageJours);
            const created = await insertBatch(
              fallbackPayload as Parameters<typeof insertBatch>[0],
            );
            createdId = created?.id ?? null;
          } else {
            throw err;
          }
        }

        // Génétique : insère ligne batch_sows si truie fournie.
        if (createdId && truieMereId) {
          try {
            await addBatchSource({
              batchId: createdId,
              sowId: truieMereId,
              nbPorcelets: result.values.effectif,
              dateAjout: result.values.dateEntree,
            });
          } catch {
            // best-effort : ne pas bloquer la création si batch_sows échoue.
          }
        }

        setToast(
          `Bande ${generatedCodeId} créée dans ${logeNumeroPrefixed(selectedLoge)}`,
        );
      }

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

  const titleByStep: Record<Step, string> = {
    1: 'Choisir une loge',
    2: 'Effectif et poids',
    3: 'Âge des porcelets',
    4: 'Génétique',
    5: isEditMode ? 'Valider la bande' : 'Vérifier et créer',
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
          aria-label={
            isEditMode
              ? 'Validation d\'une bande en attente'
              : 'Création d\'une nouvelle bande de porcelets'
          }
          data-testid="quick-add-bande-from-loge-form"
          data-step={step}
        >
          {/* Stepper visuel */}
          <ol
            className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-2"
            aria-label="Progression"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <li
                key={n}
                aria-current={step === n ? 'step' : undefined}
                className={[
                  'flex-1 text-center px-1.5 py-1 rounded-sm border',
                  step === n
                    ? 'border-accent text-accent bg-bg-2'
                    : step > n
                      ? 'border-border text-text-1 bg-bg-2'
                      : 'border-border text-text-2',
                ].join(' ')}
              >
                {n}.{' '}
                {n === 1
                  ? 'Loge'
                  : n === 2
                    ? 'Eff.'
                    : n === 3
                      ? 'Âge'
                      : n === 4
                        ? 'Gén.'
                        : 'Récap'}
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
                  <p className="text-[11px] text-text-2 mt-1">
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
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => goStep2(l.id)}
                        className="pressable w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-bg-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                        ariaLabel={`Sélectionner ${logeNumeroPrefixed(l)}`}
                        data-testid={`loge-option-${l.id}`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="ft-code text-[13px] font-bold text-text-0">
                            {logeNumeroPrefixed(l)}
                          </span>
                          <span className="text-[10px] text-text-2 mt-0.5">
                            {l.type.replace('_', '-').toLowerCase()}
                            {l.capaciteMax != null
                              ? ` · capacité ${l.capaciteMax}`
                              : ''}
                            {l.batiment ? ` · ${l.batiment}` : ''}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-text-2 shrink-0" />
                      </Button>
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
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent ft-code text-[10px] font-bold">
                    {logeNumeroPrefixed(selectedLoge).split('-')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-mono-label text-text-0">
                      {logeNumeroPrefixed(selectedLoge)}
                    </p>
                    <p className="text-[10px] text-text-2 mt-0.5">
                      {selectedLoge.type.replace('_', '-').toLowerCase()}
                      {selectedLoge.capaciteMax != null
                        ? ` · capacité ${selectedLoge.capaciteMax}`
                        : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Porcelets" required error={errors.effectif}>
                  <Input
                    id="qabfl-effectif"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={200}
                    step={1}
                    aria-required="true"
                    invalid={!!errors.effectif}
                    placeholder="Ex: 24"
                    value={effectif}
                    onChange={e => setEffectif(e.target.value)}
                  />
                </FormField>

                <FormField label="Poids moyen kg" required error={errors.poidsMoyenKg}>
                  <Input
                    id="qabfl-poids"
                    type="number"
                    inputMode="decimal"
                    min={0.5}
                    max={200}
                    step={0.1}
                    aria-required="true"
                    invalid={!!errors.poidsMoyenKg}
                    placeholder="Ex: 18.5"
                    value={poidsMoyenKg}
                    onChange={e => setPoidsMoyenKg(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Date d'entrée loge" error={errors.dateEntree}>
                <Input
                  id="qabfl-date"
                  type="date"
                  invalid={!!errors.dateEntree}
                  value={dateEntree}
                  onChange={e => setDateEntree(e.target.value)}
                />
              </FormField>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(1)}
                  className="pressable flex-1 h-12 rounded-md inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
                  ariaLabel="Retour à la sélection de loge"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Retour
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={goStep3}
                  className="pressable flex-[2] h-12 rounded-md inline-flex items-center justify-center gap-2 bg-accent text-bg-0 text-[12px] font-bold uppercase tracking-wide hover:brightness-110"
                  ariaLabel="Étape suivante : âge"
                  data-testid="step-2-next"
                >
                  Suivant
                  <ChevronRight size={14} aria-hidden="true" />
                </Button>
              </div>
            </section>
          )}

          {/* ── Step 3 — Âge ────────────────────────────────────────────── */}
          {step === 3 && (
            <section
              aria-label="Âge estimé"
              className="space-y-4"
              data-testid="step-3"
            >
              <p className="text-mono-label text-text-1">
                Saisis l'âge estimé des porcelets en texte libre. Ex :{' '}
                <span className="ft-code">"30j"</span>,{' '}
                <span className="ft-code">"1 mois"</span>,{' '}
                <span className="ft-code">"3 sem"</span>,{' '}
                <span className="ft-code">"2 mois 1 semaine"</span>.
              </p>

              <FormField label="Âge des porcelets">
                <Input
                  id="qabfl-age"
                  type="text"
                  placeholder="Ex: 1 mois, 30j, 3 sem"
                  value={ageText}
                  disabled={ageInconnu}
                  onChange={e => setAgeText(e.target.value)}
                  data-testid="age-input"
                  autoComplete="off"
                />
                <div
                  className="text-[11px] tabular-nums mt-1"
                  aria-live="polite"
                  data-testid="age-live-indicator"
                >
                  {ageInconnu ? (
                    <span className="text-text-2">Âge inconnu — passé</span>
                  ) : ageParsed.jours == null ? (
                    <span className="text-text-2">
                      = ?? jours (saisie non reconnue)
                    </span>
                  ) : (
                    <span className="text-accent">
                      = {ageParsed.jours} jours
                      {ageParsed.warning ? ` · ${ageParsed.warning}` : ''}
                    </span>
                  )}
                </div>
              </FormField>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={ageInconnu}
                  onChange={e => setAgeInconnu(e.target.checked)}
                  data-testid="age-unknown-checkbox"
                />
                <span className="text-[12px] text-text-1">
                  Je ne sais pas
                </span>
              </label>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(2)}
                  className="pressable flex-1 h-12 rounded-md inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
                  ariaLabel="Retour à l'effectif"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Retour
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={goStep4}
                  className="pressable flex-[2] h-12 rounded-md inline-flex items-center justify-center gap-2 bg-accent text-bg-0 text-[12px] font-bold uppercase tracking-wide hover:brightness-110"
                  ariaLabel="Étape suivante : génétique"
                  data-testid="step-3-next"
                >
                  Suivant
                  <ChevronRight size={14} aria-hidden="true" />
                </Button>
              </div>
            </section>
          )}

          {/* ── Step 4 — Génétique (optionnelle) ─────────────────────────── */}
          {step === 4 && (
            <section
              aria-label="Génétique"
              className="space-y-4"
              data-testid="step-4"
            >
              <p className="text-mono-label text-text-1">
                Renseigne la généalogie si elle est connue. Tu peux aussi tirer
                une truie / un verrat au hasard ou laisser vide.
              </p>

              {/* Truie mère */}
              <FormField label="Truie mère" hint="optionnel">
                <Select
                  id="qabfl-truie"
                  value={truieMereId}
                  onChange={e => setTruieMereId(e.target.value)}
                  data-testid="truie-select"
                >
                  <option value="">— Inconnue —</option>
                  {truies.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.displayId || t.id}
                      {t.nom ? ` · ${t.nom}` : ''}
                      {t.boucle ? ` (${t.boucle})` : ''}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={pickRandomTruie}
                    disabled={truies.length === 0}
                    className="pressable inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 h-8 text-[10px] uppercase tracking-wide text-text-1 hover:border-accent hover:text-accent disabled:opacity-40"
                    ariaLabel="Choisir une truie au hasard"
                    data-testid="truie-random"
                  >
                    <Shuffle size={11} aria-hidden="true" />
                    Aléatoire
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTruieMereId('')}
                    className="pressable inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 h-8 text-[10px] uppercase tracking-wide text-text-1 hover:border-text-2"
                    ariaLabel="Ne pas renseigner la truie"
                    data-testid="truie-clear"
                  >
                    <X size={11} aria-hidden="true" />
                    Ne pas renseigner
                  </Button>
                </div>
              </FormField>

              {/* Verrat père */}
              <FormField label="Verrat père" hint="optionnel">
                <Select
                  id="qabfl-verrat"
                  value={verratPereId}
                  onChange={e => setVerratPereId(e.target.value)}
                  data-testid="verrat-select"
                >
                  <option value="">— Inconnu —</option>
                  {verrats.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.displayId || v.id}
                      {v.nom ? ` · ${v.nom}` : ''}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={pickRandomVerrat}
                    disabled={verrats.length === 0}
                    className="pressable inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 h-8 text-[10px] uppercase tracking-wide text-text-1 hover:border-accent hover:text-accent disabled:opacity-40"
                    ariaLabel="Choisir un verrat au hasard"
                    data-testid="verrat-random"
                  >
                    <Shuffle size={11} aria-hidden="true" />
                    Aléatoire
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setVerratPereId('')}
                    className="pressable inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 h-8 text-[10px] uppercase tracking-wide text-text-1 hover:border-text-2"
                    ariaLabel="Ne pas renseigner le verrat"
                    data-testid="verrat-clear"
                  >
                    <X size={11} aria-hidden="true" />
                    Ne pas renseigner
                  </Button>
                </div>
              </FormField>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(3)}
                  className="pressable flex-1 h-12 rounded-md inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
                  ariaLabel="Retour à l'âge"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Retour
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={goStep5}
                  className="pressable flex-[2] h-12 rounded-md inline-flex items-center justify-center gap-2 bg-accent text-bg-0 text-[12px] font-bold uppercase tracking-wide hover:brightness-110"
                  ariaLabel="Étape suivante : récap"
                  data-testid="step-4-next"
                >
                  Suivant
                  <ChevronRight size={14} aria-hidden="true" />
                </Button>
              </div>
            </section>
          )}

          {/* ── Step 5 — Récap + génération ─────────────────────────────── */}
          {step === 5 && selectedLoge && (
            <section
              aria-label="Récapitulatif"
              className="space-y-4"
              data-testid="step-5"
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
                  label="Âge estimé"
                  value={
                    ageInconnu
                      ? 'Inconnu'
                      : ageParsed.jours != null
                        ? `${ageParsed.jours} jours`
                        : '—'
                  }
                />
                <RecapRow
                  label="Phase auto-détectée"
                  value={phaseAuto.label}
                  highlight
                />
                {!isEditMode && (
                  <RecapRow
                    label="Code bande"
                    value={generatedCodeId}
                    mono
                  />
                )}
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(4)}
                  disabled={saving}
                  className="pressable flex-1 h-14 rounded-md inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
                  ariaLabel="Retour à la génétique"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Retour
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  aria-busy={saving}
                  className="pressable flex-[2] h-14 rounded-md inline-flex items-center justify-center gap-2 bg-accent text-bg-0 text-[13px] font-bold uppercase tracking-wide hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                  ariaLabel={isEditMode ? 'Valider la bande' : 'Créer la bande'}
                  data-testid="step-5-submit"
                >
                  {saving ? (
                    <span className="animate-pulse">{isEditMode ? 'Validation…' : 'Création…'}</span>
                  ) : (
                    <>
                      <Plus size={14} aria-hidden="true" />
                      {isEditMode ? 'Valider' : 'Créer la bande'}
                      <Save size={14} aria-hidden="true" />
                    </>
                  )}
                </Button>
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
    <span className="text-[10px] uppercase tracking-wide text-text-2">
      {label}
    </span>
    <span
      className={[
        mono ? 'tabular-nums' : '',
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
