/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Baby, Check, CheckCircle2 } from 'lucide-react';

import { AppToast, BottomSheet, useAppToast } from '../agritech';
import {
  Button,
  FormField,
  Input,
  Section,
  Textarea,
} from '@/design-system';
import {
  insertBatch,
  updateSowByCode,
  resolveSowIdByCode,
  resolveBoarIdByCode,
  findLastSaillieForTruie,
  type LastSaillieResolved,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { normaliseStatut } from '../../lib/truieStatut';
import type { Truie } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  MISE_BAS_BOUNDS,
  validateMiseBas,
  suggestIdPortee,
  todayIsoLocal,
  nowHoursMinutes,
  type MiseBasDraft,
  type MiseBasValidationErrors,
} from './quickMiseBasHelpers';
import {
  validateDatePresentOrPast,
  validateEffectif,
} from '../../lib/validation/farmValidators';
import MiseBasTruieField from './quickMiseBas/MiseBasTruieField';

export {
  MISE_BAS_BOUNDS,
  extractTruieNumber,
  suggestIdPortee,
  isoToSheetsDate,
  addDaysToSheetsDate,
  validateMiseBas,
  validateSexRatio,
  buildMiseBasRow,
  submitMiseBas,
  type MiseBasDraft,
  type MiseBasValidation,
  type MiseBasValidationErrors,
  type MiseBasBatchValues,
} from './quickMiseBasHelpers';

export interface QuickMiseBasFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruieId?: string;
  onSuccess?: () => void;
}

const QuickMiseBasForm: React.FC<QuickMiseBasFormProps> = ({
  isOpen,
  onClose,
  defaultTruieId,
  onSuccess,
}) => {
  const { truies, verrats, bandes, refreshData } = useFarm();

  const truiesEligibles = useMemo<Truie[]>(() => {
    return truies.filter(t => {
      const c = normaliseStatut(t.statut);
      return c === 'MATERNITE' || c === 'PLEINE' || c === 'SURVEILLANCE';
    });
  }, [truies]);

  const [truieId, setTruieId] = useState<string>(defaultTruieId ?? '');
  const [dateIso, setDateIso] = useState<string>(todayIsoLocal());
  const [heure, setHeure] = useState<string>(nowHoursMinutes());
  const [nesVivants, setNesVivants] = useState<string>('');
  const [mortsNes, setMortsNes] = useState<string>('0');
  const [nesTotaux, setNesTotaux] = useState<string>('');
  const [nesTotauxEditedManually, setNesTotauxEditedManually] = useState(false);
  const [poidsMoyen, setPoidsMoyen] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [nbMales, setNbMales] = useState<string>('');
  const [nbFemelles, setNbFemelles] = useState<string>('');
  const [nbFemellesEditedManually, setNbFemellesEditedManually] = useState(false);
  const [errors, setErrors] = useState<MiseBasValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { show: showToast, toastProps } = useAppToast();
  const [lastSaillie, setLastSaillie] = useState<LastSaillieResolved | null>(
    null,
  );
  const [saillieLoading, setSaillieLoading] = useState(false);
  const [saillieResolved, setSaillieResolved] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-suggestion totaux = vivants + morts-nés tant que l'utilisateur
  // n'a pas saisi explicitement la valeur.
  const [lastAutoInputs, setLastAutoInputs] = useState<{ nesVivants: string; mortsNes: string }>({
    nesVivants,
    mortsNes,
  });
  if (
    !nesTotauxEditedManually &&
    (lastAutoInputs.nesVivants !== nesVivants || lastAutoInputs.mortsNes !== mortsNes)
  ) {
    setLastAutoInputs({ nesVivants, mortsNes });
    const v = parseInt(nesVivants, 10);
    const m = parseInt(mortsNes, 10);
    if (Number.isFinite(v) && Number.isFinite(m)) {
      setNesTotaux(String(v + m));
    } else if (Number.isFinite(v)) {
      setNesTotaux(String(v));
    }
  }

  // Auto-suggestion femelles = nv - males si l'utilisateur n'a pas saisi
  // explicitement le nb de femelles.
  const [lastAutoSex, setLastAutoSex] = useState<{ nbMales: string; nesVivants: string }>({
    nbMales,
    nesVivants,
  });
  if (
    !nbFemellesEditedManually &&
    (lastAutoSex.nbMales !== nbMales || lastAutoSex.nesVivants !== nesVivants)
  ) {
    setLastAutoSex({ nbMales, nesVivants });
    const m = parseInt(nbMales, 10);
    const v = parseInt(nesVivants, 10);
    if (Number.isFinite(m) && Number.isFinite(v) && v - m >= 0) {
      setNbFemelles(String(v - m));
    } else if (nbMales === '') {
      setNbFemelles('');
    }
  }

  const suggestedIdPortee = useMemo(() => {
    if (!truieId) return '';
    return suggestIdPortee(truieId, bandes);
  }, [truieId, bandes]);

  const detectedBoarLabel = useMemo<string | null>(() => {
    if (!lastSaillie) return null;
    const code = lastSaillie.boar_code_id;
    if (!code) return null;
    const v = verrats.find(
      x => x.displayId === code || x.id === lastSaillie.boar_id,
    );
    return v?.nom ? `${code} (${v.nom})` : code;
  }, [lastSaillie, verrats]);

  const saillieEcartJours = useMemo<number | null>(() => {
    if (!lastSaillie?.date_saillie || !dateIso) return null;
    const ds = new Date(lastSaillie.date_saillie);
    const dm = new Date(dateIso);
    if (!Number.isFinite(ds.getTime()) || !Number.isFinite(dm.getTime())) {
      return null;
    }
    return Math.round((dm.getTime() - ds.getTime()) / 86400000);
  }, [lastSaillie, dateIso]);

  const [idPortee, setIdPortee] = useState<string>(suggestedIdPortee);
  const [idPorteeEditedManually, setIdPorteeEditedManually] = useState(false);

  const [lastSuggestedIdPortee, setLastSuggestedIdPortee] = useState<string>(suggestedIdPortee);
  if (!idPorteeEditedManually && lastSuggestedIdPortee !== suggestedIdPortee) {
    setLastSuggestedIdPortee(suggestedIdPortee);
    setIdPortee(suggestedIdPortee);
  }

  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultTruieId: string | undefined }>({
    isOpen,
    defaultTruieId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultTruieId !== defaultTruieId) {
    setLastOpenKey({ isOpen, defaultTruieId });
    if (isOpen) {
      setTruieId(defaultTruieId ?? '');
      setDateIso(todayIsoLocal());
      setHeure(nowHoursMinutes());
      setNesVivants('');
      setMortsNes('0');
      setNesTotaux('');
      setNesTotauxEditedManually(false);
      setPoidsMoyen('');
      setNotes('');
      setNbMales('');
      setNbFemelles('');
      setNbFemellesEditedManually(false);
      setIdPorteeEditedManually(false);
      setErrors({});
      setSuccess(false);
      setSaving(false);
      setLastSaillie(null);
      setSaillieResolved(false);
      setSaillieLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  // Résolution auto de la saillie source dès que truie + date sont posées.
  useEffect(() => {
    if (!isOpen) return;
    if (!truieId || !dateIso) {
      setLastSaillie(null);
      setSaillieResolved(false);
      return;
    }
    let cancelled = false;
    setSaillieLoading(true);
    setSaillieResolved(false);
    findLastSaillieForTruie(truieId, new Date(dateIso))
      .then(res => {
        if (cancelled) return;
        setLastSaillie(res);
      })
      .catch(() => {
        if (cancelled) return;
        setLastSaillie(null);
      })
      .finally(() => {
        if (cancelled) return;
        setSaillieLoading(false);
        setSaillieResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, truieId, dateIso]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(
    isOpen && !success,
  ) as unknown as React.RefObject<HTMLSelectElement>;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const draft: MiseBasDraft = {
      truieId,
      idPortee,
      dateIso,
      heure,
      nesVivants,
      mortsNes,
      nesTotaux,
      poidsMoyen,
      notes,
      nbMales,
      nbFemelles,
    };
    const result = validateMiseBas(draft);
    if (!result.ok || !result.normalized) {
      setErrors(result.errors);
      return;
    }
    // RT4 Volet 2 : Fail-Fast — date MB ne peut pas être dans le futur,
    // effectif positif borné. Défense en profondeur sur la couche métier.
    const failFast: MiseBasValidationErrors = {};
    const dr = validateDatePresentOrPast(dateIso, 'dateIso');
    if (!dr.ok) failFast.dateIso = dr.errors[0].message;
    const ef = validateEffectif(result.normalized.nesTotaux, {
      max: 50,
      field: 'nesTotaux',
    });
    if (!ef.ok) failFast.nesTotaux = ef.errors[0].message;
    if (Object.keys(failFast).length > 0) {
      setErrors(failFast);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const sowId = await resolveSowIdByCode(truieId);
      const vivants = Math.max(
        0,
        result.normalized.nesTotaux - result.normalized.mortsNes,
      );
      // Résolution finale du verrat : préférer la saillie auto-détectée,
      // sinon retomber sur une résolution synchrone (au cas où le useEffect
      // n'aurait pas eu le temps de finir).
      let boarUuid: string | null = lastSaillie?.boar_id ?? null;
      if (!boarUuid && lastSaillie?.boar_code_id) {
        boarUuid = await resolveBoarIdByCode(lastSaillie.boar_code_id);
      }
      await insertBatch({
        code_id: idPortee,
        sow_id: sowId,
        boar_id: boarUuid,
        date_mise_bas: result.normalized.dateMbSheets
          .split('/')
          .reverse()
          .join('-'),
        date_sevrage_prevue: result.normalized.dateSevragePrevue
          .split('/')
          .reverse()
          .join('-'),
        porcelets_nes_total: result.normalized.nesTotaux,
        porcelets_nes_vivants: vivants,
        nb_mort_nes: result.normalized.mortsNes,
        ...(result.normalized.nbMales !== undefined
          ? { nb_males_naissance: result.normalized.nbMales }
          : {}),
        ...(result.normalized.nbFemelles !== undefined
          ? { nb_femelles_naissance: result.normalized.nbFemelles }
          : {}),
        poids_portee_naissance_kg:
          result.normalized.poidsMoyen !== undefined
            ? result.normalized.poidsMoyen * vivants
            : null,
        // FIX V23-AUDIT-2 : batches.poids_initial_kg NOT NULL CHECK >0 <=200.
        // Sans cette ligne le INSERT échouait avec 23502 sur toute MB où
        // l'éleveur n'avait pas saisi le poids moyen (champ marqué "optionnel"
        // dans le form). Cible métier : porcelet ≈ 1.4 kg à la naissance.
        poids_initial_kg: result.normalized.poidsMoyen ?? 1.4,
        statut: 'Sous mère',
        phase: 'maternite',
        notes: heure ? `MB ${heure} · ${notes}`.trim() : notes,
      } as Parameters<typeof insertBatch>[0]);
      await updateSowByCode(truieId, { statut: 'Maternité' });
      const online = typeof navigator !== 'undefined' && navigator.onLine;

      setSuccess(true);
      showToast(
        online
          ? `Mise-bas enregistrée. Portée ${idPortee} créée automatiquement.`
          : `Mise-bas en file · sync auto · ${idPortee}`,
        online ? 'success' : 'info',
        { duration: 2400 },
      );

      try {
        await refreshData(true);
      } catch {
        /* noop */
      }

      if (onSuccess) onSuccess();

      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[QuickMiseBasForm] enregistrement local échoué:', err);
      showToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement local',
        'error',
        { duration: 2400 },
      );
    } finally {
      setSaving(false);
    }
  };

  const displayTruie = (t: Truie): string => {
    const parts = [t.displayId];
    if (t.boucle) parts.push(`B.${t.boucle}`);
    if (t.nom) parts.push(t.nom);
    return parts.join(' · ');
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Saisir mise-bas"
        height="full"
      >
        {success ? (
          <div
            className="flex flex-col items-center justify-center py-20 animate-scale-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={64}
              className="text-accent mb-4"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="agritech-heading text-[18px] uppercase tracking-wide">
              Portée créée
            </p>
            <p className="mt-2 ft-code text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
              {idPortee}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
            aria-label="Saisie d'une mise-bas"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <Baby size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-mono-label text-text-1">
                  Nouvelle portée née sous la mère
                </p>
                <p className="text-mono-micro text-text-2 mt-0.5">
                  La truie passera automatiquement en Maternité
                </p>
              </div>
            </div>

            {/* ── INFORMATIONS PRINCIPALES ───────────────────────────── */}
            <Section label="INFORMATIONS PRINCIPALES" />

            <MiseBasTruieField
              truies={truiesEligibles}
              truieId={truieId}
              setTruieId={setTruieId}
              saving={saving}
              error={errors.truieId}
              selectRef={firstFieldRef}
              displayTruie={displayTruie}
            />

            {truieId ? (
              <div
                role="status"
                aria-live="polite"
                data-testid="saillie-detected"
                className={[
                  'rounded-md border px-3 py-2',
                  'text-mono-label',
                  saillieLoading
                    ? 'border-border bg-bg-1 text-text-2'
                    : lastSaillie
                      ? 'border-accent/40 bg-accent/5 text-text-1'
                      : saillieResolved
                        ? 'border-amber/60 bg-amber/5 text-text-1'
                        : 'border-border bg-bg-1 text-text-2',
                ].join(' ')}
              >
                {saillieLoading ? (
                  <span>Recherche de la saillie source…</span>
                ) : lastSaillie ? (
                  <span>
                    Saillie détectée : {truieId} ×{' '}
                    {detectedBoarLabel ?? '—'} le{' '}
                    {lastSaillie.date_saillie
                      .split('-')
                      .reverse()
                      .join('/')}
                    {saillieEcartJours !== null
                      ? ` (J+${saillieEcartJours})`
                      : ''}
                  </span>
                ) : saillieResolved ? (
                  <span>
                    Aucune saillie historique trouvée. Le verrat père sera
                    vide — vous pourrez le compléter plus tard.
                  </span>
                ) : null}
              </div>
            ) : null}

            <FormField
              label="ID portée"
              required
              hint="Format YY-T{N}-SEQ (ex: 26-T7-01)"
              error={errors.idPortee}
            >
              <Input
                id="mb-id-portee"
                type="text"
                maxLength={20}
                autoCapitalize="characters"
                aria-label="Identifiant de la portée (auto-suggéré)"
                aria-required="true"
                aria-invalid={!!errors.idPortee}
                invalid={!!errors.idPortee}
                placeholder="26-T7-01"
                value={idPortee}
                onChange={e => {
                  setIdPortee(e.target.value);
                  setIdPorteeEditedManually(true);
                }}
                disabled={saving || !truieId}
                autoComplete="off"
                className="ft-code uppercase"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date MB" required error={errors.dateIso}>
                <Input
                  id="mb-date"
                  type="date"
                  aria-label="Date de mise-bas"
                  aria-invalid={!!errors.dateIso}
                  invalid={!!errors.dateIso}
                  value={dateIso}
                  onChange={e => setDateIso(e.target.value)}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Heure">
                <Input
                  id="mb-heure"
                  type="time"
                  aria-label="Heure de mise-bas"
                  value={heure}
                  onChange={e => setHeure(e.target.value)}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* ── PORTÉE ─────────────────────────────────────────────── */}
            <Section label="PORTÉE" />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                label="Nés vivants"
                required
                error={errors.nesVivants}
              >
                <Input
                  id="mb-nv"
                  type="number"
                  inputMode="numeric"
                  min={MISE_BAS_BOUNDS.minNes}
                  max={MISE_BAS_BOUNDS.maxNes}
                  step={1}
                  aria-label="Nombre de porcelets nés vivants"
                  aria-required="true"
                  aria-invalid={!!errors.nesVivants}
                  invalid={!!errors.nesVivants}
                  placeholder="0"
                  value={nesVivants}
                  onChange={e => setNesVivants(e.target.value)}
                  disabled={saving}
                  className="text-center font-mono tabular-nums text-[18px] font-bold"
                />
              </FormField>
              <FormField label="Morts-nés" error={errors.mortsNes}>
                <Input
                  id="mb-mn"
                  type="number"
                  inputMode="numeric"
                  min={MISE_BAS_BOUNDS.minNes}
                  max={MISE_BAS_BOUNDS.maxNes}
                  step={1}
                  aria-label="Nombre de porcelets morts-nés"
                  aria-invalid={!!errors.mortsNes}
                  invalid={!!errors.mortsNes}
                  placeholder="0"
                  value={mortsNes}
                  onChange={e => setMortsNes(e.target.value)}
                  disabled={saving}
                  className="text-center font-mono tabular-nums text-[18px] font-bold"
                />
              </FormField>
              <FormField
                label="Nés totaux"
                hint="= vivants + morts-nés"
                error={errors.nesTotaux}
              >
                <Input
                  id="mb-nt"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MISE_BAS_BOUNDS.maxNesTotaux}
                  step={1}
                  aria-label="Nombre total de porcelets nés (vivants + morts-nés)"
                  aria-invalid={!!errors.nesTotaux}
                  invalid={!!errors.nesTotaux}
                  placeholder="0"
                  value={nesTotaux}
                  onChange={e => {
                    setNesTotaux(e.target.value);
                    setNesTotauxEditedManually(true);
                  }}
                  disabled={saving}
                  className="text-center font-mono tabular-nums text-[18px] font-bold"
                />
              </FormField>
            </div>

            {errors.coherence ? (
              <p role="alert" className="text-[11px]" style={{ color: 'var(--pt-danger)' }}>
                {errors.coherence}
              </p>
            ) : null}

            <FormField
              label="Poids moyen porcelet (kg)"
              hint={`${MISE_BAS_BOUNDS.minPoids} à ${MISE_BAS_BOUNDS.maxPoids} kg · optionnel`}
              error={errors.poidsMoyen}
            >
              <Input
                id="mb-poids"
                type="number"
                inputMode="decimal"
                min={MISE_BAS_BOUNDS.minPoids}
                max={MISE_BAS_BOUNDS.maxPoids}
                step={0.1}
                aria-label="Poids moyen d'un porcelet en kg (optionnel)"
                aria-invalid={!!errors.poidsMoyen}
                invalid={!!errors.poidsMoyen}
                placeholder="1.4"
                value={poidsMoyen}
                onChange={e => setPoidsMoyen(e.target.value)}
                disabled={saving}
                className="font-mono tabular-nums"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Mâles"
                hint="optionnel"
                error={errors.nbMales}
              >
                <Input
                  id="mb-males"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-label="Nombre de porcelets mâles"
                  aria-invalid={!!errors.nbMales}
                  invalid={!!errors.nbMales}
                  placeholder="—"
                  value={nbMales}
                  onChange={e => setNbMales(e.target.value)}
                  disabled={saving}
                  className="font-mono tabular-nums"
                />
              </FormField>
              <FormField
                label="Femelles"
                hint="auto = vivants − mâles"
                error={errors.nbFemelles}
              >
                <Input
                  id="mb-femelles"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-label="Nombre de porcelets femelles"
                  aria-invalid={!!errors.nbFemelles}
                  invalid={!!errors.nbFemelles}
                  placeholder="—"
                  value={nbFemelles}
                  onChange={e => {
                    setNbFemelles(e.target.value);
                    setNbFemellesEditedManually(true);
                  }}
                  disabled={saving}
                  className="font-mono tabular-nums"
                />
              </FormField>
            </div>

            {errors.sexRatio ? (
              <p role="alert" className="text-[11px]" style={{ color: 'var(--pt-danger)' }}>
                {errors.sexRatio}
              </p>
            ) : null}

            {/* ── NOTES ──────────────────────────────────────────────── */}
            <Section label="NOTES" />

            <FormField
              label="Notes"
              hint={`${notes.length}/${MISE_BAS_BOUNDS.maxNotes} · optionnel`}
              error={errors.notes}
            >
              <Textarea
                id="mb-notes"
                aria-label="Notes de mise-bas (optionnel)"
                aria-invalid={!!errors.notes}
                placeholder="Ex: MB sans assistance, portée homogène"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
                maxLength={MISE_BAS_BOUNDS.maxNotes}
                style={{
                  minHeight: 88,
                  borderColor: errors.notes ? 'var(--pt-danger)' : undefined,
                }}
              />
            </FormField>

            <div className="flex gap-3 justify-end pt-3 border-t border-border">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={saving}
                ariaLabel="Annuler et fermer"
              >
                ANNULER
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={saving || !truieId || truiesEligibles.length === 0}
                ariaLabel="Enregistrer la mise-bas"
                aria-busy={saving}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Check size={16} aria-hidden="true" />
                    VALIDER
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </BottomSheet>

      <AppToast {...toastProps} />
    </>
  );
};

export default QuickMiseBasForm;
