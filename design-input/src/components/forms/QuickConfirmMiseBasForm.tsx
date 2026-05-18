/**
 * QuickConfirmMiseBasForm — Confirmation rigoureuse d'une mise-bas.
 * ════════════════════════════════════════════════════════════════════
 * Workflow :
 *   1. Précharge depuis `saillies` (sow_id, boar_id, date_saillie)
 *   2. Saisie : date MB réelle, nb total, nb vivants, mort-nés (auto),
 *      poids portée, M/F, loge
 *   3. Submit → INSERT batch phase=SOUS_MERE, validation_status=VALIDATED
 *
 * Migré FORM_CONTRACT Phase 2 (batch A) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` unique (remplace `useAppToast` + `AppToast`)
 *  - validation `validateMiseBas` → { ok, errors, values }, rendu via FormField
 *  - helper date partagé `todayIso`
 *  - reset-on-open via `lastKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Logique pure dans `quickConfirmMiseBasLogic` (testée).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormField, Input, Section, Select } from '@/design-system';
import { listLoges } from '../../services/supabaseWrites';
import { supabase } from '../../services/supabaseClient';
import { confirmMiseBas } from '../../services/mbWorkflowService';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import type { Loge } from '../../types/farm';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';
import {
  computeMortNes,
  generateMbCodeId,
  validateMiseBas,
  type MiseBasValidation,
} from './quickConfirmMiseBasLogic';
import { logeNumeroPrefixed } from '../../features/troupeau/TroupeauPorceletsView';

export interface QuickConfirmMiseBasFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** UUID de la saillie à confirmer (précharge truie + verrat + date saillie). */
  saillieId: string;
  onSuccess?: (newBatchId: string) => void;
}

interface SailliePreload {
  sow_id: string | null;
  boar_id: string | null;
  date_saillie: string | null;
  sow_code_id: string | null;
  boar_code_id: string | null;
}

const QuickConfirmMiseBasForm: React.FC<QuickConfirmMiseBasFormProps> = ({
  isOpen,
  onClose,
  saillieId,
  onSuccess,
}) => {
  const { truies, verrats, refreshData } = useFarm();
  const { showToast } = useToast();

  const [saillie, setSaillie] = useState<SailliePreload | null>(null);
  const [loges, setLoges] = useState<Loge[]>([]);

  const [dateMiseBas, setDateMiseBas] = useState(todayIso());
  const [nbTotal, setNbTotal] = useState('');
  const [nbVivants, setNbVivants] = useState('');
  const [poidsPorteeKg, setPoidsPorteeKg] = useState('');
  const [nbMales, setNbMales] = useState('');
  const [nbFemelles, setNbFemelles] = useState('');
  const [logeId, setLogeId] = useState('');

  const [errors, setErrors] = useState<MiseBasValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset à l'ouverture (render-phase, FORM_CONTRACT).
  const [lastKey, setLastKey] = useState({ isOpen, saillieId });
  if (lastKey.isOpen !== isOpen || lastKey.saillieId !== saillieId) {
    setLastKey({ isOpen, saillieId });
    if (isOpen) {
      setDateMiseBas(todayIso());
      setNbTotal('');
      setNbVivants('');
      setPoidsPorteeKg('');
      setNbMales('');
      setNbFemelles('');
      setLogeId('');
      setErrors({});
      setSaving(false);
      setSaillie(null);
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

  // Précharge saillie
  useEffect(() => {
    if (!isOpen || !saillieId) return;
    let cancelled = false;
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('saillies') as any)
          .select('sow_id, boar_id, date_saillie, sow_code_id, boar_code_id')
          .eq('id', saillieId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          showToast('Saillie introuvable', 'error');
          return;
        }
        setSaillie(data as SailliePreload);
      } catch {
        if (!cancelled) showToast('Erreur précharge saillie', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, saillieId, showToast]);

  // Précharge loges
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then(rows => {
        if (cancelled) return;
        setLoges(rows.filter(l => l.active));
      })
      .catch(() => {
        if (!cancelled) setLoges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Truie / verrat précalculés pour affichage
  const truieDisplay = useMemo(() => {
    if (!saillie?.sow_id) return null;
    return truies.find(t => t.id === saillie.sow_id) ?? null;
  }, [truies, saillie]);
  const verratDisplay = useMemo(() => {
    if (!saillie?.boar_id) return null;
    return verrats.find(v => v.id === saillie.boar_id) ?? null;
  }, [verrats, saillie]);

  // Calculs dérivés
  const mortNesDerivé = useMemo(() => {
    const t = Number(nbTotal);
    const v = Number(nbVivants);
    return computeMortNes(t, v);
  }, [nbTotal, nbVivants]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }, [onClose, saving]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!saillie) return;

    const draft = {
      dateMiseBas,
      nbTotal,
      nbVivants,
      poidsPorteeKg,
      nbMales,
      nbFemelles,
      logeId,
      dateSaillie: saillie.date_saillie,
    };
    const result = validateMiseBas(draft);
    if (!result.ok || !result.values) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const truieCodeForId =
        saillie.sow_code_id ?? truieDisplay?.displayId ?? saillie.sow_id ?? 'X';
      const codeId = generateMbCodeId(result.values.dateMiseBas, truieCodeForId);

      const { id: newBatchId } = await confirmMiseBas({
        saillie_id: saillieId,
        sow_id: saillie.sow_id,
        boar_id: saillie.boar_id,
        date_saillie: saillie.date_saillie,
        date_mise_bas: result.values.dateMiseBas,
        porcelets_nes_total: result.values.nbTotal,
        porcelets_nes_vivants: result.values.nbVivants,
        nb_mort_nes: result.values.nbMortNes,
        poids_portee_naissance_kg: result.values.poidsPorteeKg,
        nb_males_naissance: result.values.nbMales,
        nb_femelles_naissance: result.values.nbFemelles,
        loge_id: result.values.logeId,
        code_id: codeId,
      });

      const codeTruie = truieDisplay?.displayId ?? saillie.sow_code_id ?? '—';
      showToast(
        `Mise-bas enregistrée · ${codeTruie} · ${result.values.nbVivants} nés vivants · bande ${codeId}`,
        'success',
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      onSuccess?.(newBatchId);
      // Garder saving=true jusqu'au onClose pour bloquer le double-clic
      // pendant la fenêtre de toast (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : "Erreur lors de l'enregistrement de la mise-bas",
        'error',
        4000,
      );
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Mise-bas"
      title="Confirmer la mise bas"
      ariaLabel="Confirmation rigoureuse d'une mise bas"
      saving={saving}
      isValid={!!saillie}
      onSubmit={handleSubmit}
      submitLabel="VALIDER"
      submitAriaLabel="Confirmer la mise bas"
    >
      {/* ── RÉCAP SAILLIE ──────────────────────────────────────── */}
      <Section label="SAILLIE SOURCE" />

      {saillie ? (
        <div className="card-dense space-y-1 py-3" data-testid="saillie-recap">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wide text-text-2">
              Truie
            </span>
            <span className="ft-code tabular-nums text-[13px] text-text-0">
              {truieDisplay?.displayId ?? saillie.sow_code_id ?? '—'}
              {truieDisplay?.nom ? ` · ${truieDisplay.nom}` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wide text-text-2">
              Verrat
            </span>
            <span className="ft-code tabular-nums text-[13px] text-text-0">
              {verratDisplay?.displayId ?? saillie.boar_code_id ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wide text-text-2">
              Date saillie
            </span>
            <span className="ft-code tabular-nums text-[13px] text-text-0">
              {saillie.date_saillie ?? '—'}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-text-2 italic">
          Chargement de la saillie…
        </p>
      )}

      {/* ── INFORMATIONS PRINCIPALES ───────────────────────────── */}
      <Section label="INFORMATIONS PRINCIPALES" />

      <FormField label="Date de mise bas" required error={errors.dateMiseBas}>
        <Input
          id="qcmb-date"
          type="date"
          aria-label="Date de mise bas"
          value={dateMiseBas}
          onChange={e => setDateMiseBas(e.target.value)}
          aria-invalid={!!errors.dateMiseBas}
          invalid={!!errors.dateMiseBas}
          disabled={saving}
        />
      </FormField>

      {/* ── PORTÉE ─────────────────────────────────────────────── */}
      <Section label="PORTÉE" />

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nés total" required error={errors.nbTotal}>
          <Input
            id="qcmb-total"
            type="number"
            aria-label="Nés total"
            inputMode="numeric"
            min={1}
            max={25}
            step={1}
            placeholder="Ex: 12"
            value={nbTotal}
            onChange={e => setNbTotal(e.target.value)}
            aria-invalid={!!errors.nbTotal}
            data-testid="qcmb-total"
            invalid={!!errors.nbTotal}
            disabled={saving}
          />
        </FormField>
        <FormField label="Nés vivants" required error={errors.nbVivants}>
          <Input
            id="qcmb-vivants"
            type="number"
            aria-label="Nés vivants"
            inputMode="numeric"
            min={0}
            max={25}
            step={1}
            placeholder="Ex: 11"
            value={nbVivants}
            onChange={e => setNbVivants(e.target.value)}
            aria-invalid={!!errors.nbVivants}
            data-testid="qcmb-vivants"
            invalid={!!errors.nbVivants}
            disabled={saving}
          />
        </FormField>
      </div>

      {/* Mort-nés (auto, lecture seule) */}
      <div className="card-dense flex items-center justify-between gap-3 py-2">
        <span className="text-[10px] uppercase tracking-wide text-text-2">
          Mort-nés (auto)
        </span>
        <span
          className="tabular-nums text-[13px] text-accent"
          data-testid="qcmb-mort-nes"
        >
          {mortNesDerivé}
        </span>
      </div>

      <FormField label="Poids portée kg" hint="optionnel" error={errors.poidsPorteeKg}>
        <Input
          id="qcmb-poids"
          type="number"
          aria-label="Poids portée"
          inputMode="decimal"
          min={0.5}
          max={50}
          step={0.1}
          placeholder="Ex: 16.5"
          value={poidsPorteeKg}
          onChange={e => setPoidsPorteeKg(e.target.value)}
          invalid={!!errors.poidsPorteeKg}
          disabled={saving}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Mâles" hint="optionnel" error={errors.nbMales}>
          <Input
            id="qcmb-males"
            type="number"
            aria-label="Mâles"
            inputMode="numeric"
            min={0}
            max={25}
            step={1}
            placeholder="—"
            value={nbMales}
            onChange={e => setNbMales(e.target.value)}
            invalid={!!errors.nbMales}
            disabled={saving}
          />
        </FormField>
        <FormField label="Femelles" hint="optionnel" error={errors.nbFemelles}>
          <Input
            id="qcmb-femelles"
            type="number"
            aria-label="Femelles"
            inputMode="numeric"
            min={0}
            max={25}
            step={1}
            placeholder="—"
            value={nbFemelles}
            onChange={e => setNbFemelles(e.target.value)}
            invalid={!!errors.nbFemelles}
            disabled={saving}
          />
        </FormField>
      </div>

      {/* ── LOGE ───────────────────────────────────────────────── */}
      <Section label="LOGE MATERNITÉ" />

      <FormField label="Loge maternité" required error={errors.logeId}>
        <Select
          id="qcmb-loge"
          aria-label="Loge maternité"
          value={logeId}
          onChange={e => setLogeId(e.target.value)}
          aria-invalid={!!errors.logeId}
          data-testid="qcmb-loge"
          disabled={saving}
        >
          <option value="">— Choisir une loge —</option>
          {loges.map(l => (
            <option key={l.id} value={l.id}>
              {logeNumeroPrefixed(l)}
              {l.batiment ? ` · ${l.batiment}` : ''}
            </option>
          ))}
        </Select>
      </FormField>
    </QuickActionSheet>
  );
};

export default QuickConfirmMiseBasForm;
