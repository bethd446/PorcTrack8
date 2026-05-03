/**
 * QuickConfirmMiseBasForm — Confirmation rigoureuse d'une mise-bas.
 * ════════════════════════════════════════════════════════════════════
 * Workflow :
 *   1. Précharge depuis `saillies` (sow_id, boar_id, date_saillie)
 *   2. Saisie : date MB réelle, nb total, nb vivants, mort-nés (auto),
 *      poids portée, M/F, loge
 *   3. Submit → INSERT batch phase=SOUS_MERE, validation_status=VALIDATED
 *
 * Pattern BottomSheet inspiré de QuickAddBandeFromLogeForm.
 * Logique pure dans `quickConfirmMiseBasLogic` (testée).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { listLoges } from '../../services/supabaseWrites';
import { supabase } from '../../services/supabaseClient';
import { confirmMiseBas } from '../../services/mbWorkflowService';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey } from './useFormA11y';
import type { Loge } from '../../types/farm';
import {
  computeMortNes,
  generateMbCodeId,
  todayIso,
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
  const [toast, setToast] = useState('');

  // Reset à l'ouverture
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
          setToast('Saillie introuvable');
          return;
        }
        setSaillie(data as SailliePreload);
      } catch {
        if (!cancelled) setToast('Erreur précharge saillie');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, saillieId]);

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
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);

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

      setToast(`Mise bas confirmée — bande ${codeId}`);
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      onSuccess?.(newBatchId);
      onClose();
    } catch (err) {
      setToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────────────

  const inputBase = (hasError: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'text-[14px]',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      hasError ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  const labelCls = 'block text-mono-label text-text-2';

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Confirmer la mise bas"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          aria-label="Confirmation rigoureuse d'une mise bas"
          data-testid="quick-confirm-mise-bas-form"
        >
          {/* Récap saillie */}
          {saillie ? (
            <div
              className="card-dense space-y-1 py-3"
              data-testid="saillie-recap"
            >
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

          {/* Date MB */}
          <div className="space-y-1.5">
            <label htmlFor="qcmb-date" className={labelCls}>
              Date de mise bas <span className="text-red normal-case">·</span>
            </label>
            <input
              id="qcmb-date"
              type="date"
              className={inputBase(!!errors.dateMiseBas)}
              value={dateMiseBas}
              onChange={e => setDateMiseBas(e.target.value)}
              aria-invalid={!!errors.dateMiseBas}
            />
            {errors.dateMiseBas ? (
              <p role="alert" className="text-[11px] text-red">
                {errors.dateMiseBas}
              </p>
            ) : null}
          </div>

          {/* nbTotal + nbVivants */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="qcmb-total" className={labelCls}>
                Nés total <span className="text-red normal-case">·</span>
              </label>
              <input
                id="qcmb-total"
                type="number"
                inputMode="numeric"
                min={1}
                max={25}
                step={1}
                className={inputBase(!!errors.nbTotal)}
                placeholder="Ex: 12"
                value={nbTotal}
                onChange={e => setNbTotal(e.target.value)}
                aria-invalid={!!errors.nbTotal}
                data-testid="qcmb-total"
              />
              {errors.nbTotal ? (
                <p role="alert" className="text-[11px] text-red">
                  {errors.nbTotal}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="qcmb-vivants" className={labelCls}>
                Nés vivants <span className="text-red normal-case">·</span>
              </label>
              <input
                id="qcmb-vivants"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                className={inputBase(!!errors.nbVivants)}
                placeholder="Ex: 11"
                value={nbVivants}
                onChange={e => setNbVivants(e.target.value)}
                aria-invalid={!!errors.nbVivants}
                data-testid="qcmb-vivants"
              />
              {errors.nbVivants ? (
                <p role="alert" className="text-[11px] text-red">
                  {errors.nbVivants}
                </p>
              ) : null}
            </div>
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

          {/* Poids portée + sexes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="qcmb-poids" className={labelCls}>
                Poids portée kg
              </label>
              <input
                id="qcmb-poids"
                type="number"
                inputMode="decimal"
                min={0.5}
                max={50}
                step={0.1}
                className={inputBase(!!errors.poidsPorteeKg)}
                placeholder="Ex: 16.5"
                value={poidsPorteeKg}
                onChange={e => setPoidsPorteeKg(e.target.value)}
              />
              {errors.poidsPorteeKg ? (
                <p role="alert" className="text-[11px] text-red">
                  {errors.poidsPorteeKg}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label htmlFor="qcmb-males" className={labelCls}>
                  Mâles
                </label>
                <input
                  id="qcmb-males"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  className={inputBase(!!errors.nbMales)}
                  placeholder="—"
                  value={nbMales}
                  onChange={e => setNbMales(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="qcmb-femelles" className={labelCls}>
                  Femelles
                </label>
                <input
                  id="qcmb-femelles"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  className={inputBase(!!errors.nbFemelles)}
                  placeholder="—"
                  value={nbFemelles}
                  onChange={e => setNbFemelles(e.target.value)}
                />
              </div>
            </div>
          </div>
          {errors.nbMales ? (
            <p role="alert" className="text-[11px] text-red">
              {errors.nbMales}
            </p>
          ) : null}

          {/* Loge */}
          <div className="space-y-1.5">
            <label htmlFor="qcmb-loge" className={labelCls}>
              Loge maternité <span className="text-red normal-case">·</span>
            </label>
            <select
              id="qcmb-loge"
              className={inputBase(!!errors.logeId)}
              value={logeId}
              onChange={e => setLogeId(e.target.value)}
              aria-invalid={!!errors.logeId}
              data-testid="qcmb-loge"
            >
              <option value="">— Choisir une loge —</option>
              {loges.map(l => (
                <option key={l.id} value={l.id}>
                  {logeNumeroPrefixed(l)}
                  {l.batiment ? ` · ${l.batiment}` : ''}
                </option>
              ))}
            </select>
            {errors.logeId ? (
              <p role="alert" className="text-[11px] text-red">
                {errors.logeId}
              </p>
            ) : null}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="pressable flex-1 h-14 rounded-md inline-flex items-center justify-center gap-2 bg-bg-1 border border-border text-text-1 text-[12px] font-bold uppercase tracking-wide hover:border-text-2"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !saillie}
              aria-busy={saving}
              className="pressable flex-[2] h-14 rounded-md inline-flex items-center justify-center gap-2 bg-accent text-bg-0 text-[13px] font-bold uppercase tracking-wide hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="qcmb-submit"
            >
              {saving ? (
                <span className="animate-pulse">Confirmation…</span>
              ) : (
                <>
                  <Save size={14} aria-hidden="true" />
                  Confirmer mise bas
                </>
              )}
            </button>
          </div>
        </form>
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={2400}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default QuickConfirmMiseBasForm;
