/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Baby, Check, CheckCircle2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
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
  validateMiseBas,
  suggestIdPortee,
  todayIsoLocal,
  nowHoursMinutes,
  type MiseBasDraft,
  type MiseBasValidationErrors,
} from './quickMiseBasHelpers';
import MiseBasTruieField from './quickMiseBas/MiseBasTruieField';
import MiseBasIdAndDateBlock from './quickMiseBas/MiseBasIdAndDateBlock';
import MiseBasCountsBlock from './quickMiseBas/MiseBasCountsBlock';
import MiseBasPoidsAndNotesBlock from './quickMiseBas/MiseBasPoidsAndNotesBlock';

export {
  MISE_BAS_BOUNDS,
  extractTruieNumber,
  suggestIdPortee,
  isoToSheetsDate,
  addDaysToSheetsDate,
  validateMiseBas,
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
  const [errors, setErrors] = useState<MiseBasValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [lastSaillie, setLastSaillie] = useState<LastSaillieResolved | null>(
    null,
  );
  const [saillieLoading, setSaillieLoading] = useState(false);
  const [saillieResolved, setSaillieResolved] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    };
    const result = validateMiseBas(draft);
    if (!result.ok || !result.normalized) {
      setErrors(result.errors);
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
        poids_portee_naissance_kg:
          result.normalized.poidsMoyen !== undefined
            ? result.normalized.poidsMoyen * vivants
            : null,
        statut: 'Sous mère',
        phase: 'maternite',
        notes: heure ? `MB ${heure} · ${notes}`.trim() : notes,
      });
      await updateSowByCode(truieId, { statut: 'Maternité' });
      const online = typeof navigator !== 'undefined' && navigator.onLine;

      setSuccess(true);
      setToast({
        show: true,
        message: online
          ? `Mise-bas enregistrée. Portée ${idPortee} créée automatiquement.`
          : `Mise-bas en file · sync auto · ${idPortee}`,
      });

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
      setToast({
        show: true,
        message:
          err instanceof Error
            ? `Erreur : ${err.message}`
            : 'Erreur enregistrement local',
      });
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
            <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
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
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                  Nouvelle portée née sous la mère
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 mt-0.5">
                  La truie passera automatiquement en Maternité
                </p>
              </div>
            </div>

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
                  'font-mono text-[11px] uppercase tracking-wide',
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

            <MiseBasIdAndDateBlock
              idPortee={idPortee}
              setIdPortee={setIdPortee}
              setIdPorteeEditedManually={setIdPorteeEditedManually}
              truieId={truieId}
              dateIso={dateIso}
              setDateIso={setDateIso}
              heure={heure}
              setHeure={setHeure}
              saving={saving}
              errorIdPortee={errors.idPortee}
            />

            <MiseBasCountsBlock
              nesVivants={nesVivants}
              setNesVivants={setNesVivants}
              mortsNes={mortsNes}
              setMortsNes={setMortsNes}
              nesTotaux={nesTotaux}
              setNesTotaux={setNesTotaux}
              setNesTotauxEditedManually={setNesTotauxEditedManually}
              saving={saving}
              errors={errors}
            />

            <MiseBasPoidsAndNotesBlock
              poidsMoyen={poidsMoyen}
              setPoidsMoyen={setPoidsMoyen}
              notes={notes}
              setNotes={setNotes}
              saving={saving}
              errors={errors}
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                aria-label="Annuler et fermer"
                className={[
                  'pressable flex-1 h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-bg-1 border border-border text-text-1',
                  'font-mono text-[12px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms] hover:border-text-2',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  saving ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !truieId || truiesEligibles.length === 0}
                aria-label="Enregistrer la mise-bas"
                aria-busy={saving}
                className={[
                  'pressable flex-[2] h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-accent text-bg-0',
                  'font-mono text-[13px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  (saving || !truieId || truiesEligibles.length === 0)
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:brightness-110',
                ].join(' ')}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <>
                    <Check size={16} aria-hidden="true" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={2400}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </>
  );
};

export default QuickMiseBasForm;
