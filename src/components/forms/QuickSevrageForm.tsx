import React, { useMemo, useState } from 'react';
import { Baby, Check, CheckCircle2 } from 'lucide-react';

import { AppToast, BottomSheet, useAppToast } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import {
  updateBatchByCode,
  updateSowByCode,
} from '../../services/supabaseWrites';
import { useEscapeKey } from './useFormA11y';
import type { BandePorcelets } from '../../types/farm';
import {
  validateDatePresentOrPast,
  validatePoidsKg,
  validateEffectif,
} from '../../lib/validation/farmValidators';

export interface QuickSevrageFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBandeId?: string;
  onSuccess?: () => void;
}

function todayIsoLocal(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

const QuickSevrageForm: React.FC<QuickSevrageFormProps> = ({
  isOpen,
  onClose,
  defaultBandeId,
  onSuccess,
}) => {
  const { bandes, refreshData } = useFarm();

  const bandesEligibles = useMemo<BandePorcelets[]>(() => {
    return bandes.filter(b => {
      const s = (b.statut || '').toLowerCase();
      return s.includes('sous') || s.includes('mater') || s === 'sous mère';
    });
  }, [bandes]);

  const [bandeId, setBandeId] = useState<string>(defaultBandeId ?? '');
  const [dateIso, setDateIso] = useState<string>(todayIsoLocal());
  const [nbSevres, setNbSevres] = useState<string>('');
  const [poidsKg, setPoidsKg] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const { show: showToast, toastProps } = useAppToast();

  // Reset le formulaire à chaque ouverture (pattern aligné avec QuickMiseBasForm).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultBandeId: string | undefined }>({
    isOpen,
    defaultBandeId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultBandeId !== defaultBandeId) {
    setLastOpenKey({ isOpen, defaultBandeId });
    if (isOpen) {
      setBandeId(defaultBandeId ?? '');
      setDateIso(todayIsoLocal());
      setNbSevres('');
      setPoidsKg('');
      setError('');
      setSuccess(false);
      setSaving(false);
    }
  }

  useEscapeKey(isOpen && !saving, onClose);

  const selected = useMemo(
    () => bandes.find(b => b.idPortee === bandeId || b.id === bandeId) ?? null,
    [bandes, bandeId],
  );

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!bandeId) {
      setError('Sélectionne une bande');
      return;
    }
    // RT4 Volet 2 : Fail-Fast — effectif sevrés, date passée/aujourd'hui,
    // poids dans plage porcelet sevré (0.5–50 kg).
    const nb = parseInt(nbSevres, 10);
    const ef = validateEffectif(nb, { min: 1, max: 50, field: 'nbSevres' });
    if (!ef.ok) {
      setError(ef.errors[0].message);
      return;
    }
    const dr = validateDatePresentOrPast(dateIso, 'dateIso');
    if (!dr.ok) {
      setError(dr.errors[0].message);
      return;
    }
    const poids = parseFloat(poidsKg.replace(',', '.'));
    const pr = validatePoidsKg(poids, { min: 0.5, max: 50, field: 'poidsKg' });
    if (!pr.ok) {
      setError(pr.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      await updateBatchByCode(bandeId, {
        date_sevrage: dateIso,
        statut: 'Sevré',
        phase: 'post-sevrage',
        porcelets_sevrene_total: nb,
        poids_initial_kg: poids,
        poids_moyen_kg: poids,
      });
      // Libère la truie associée : statut "En attente saillie" pour déclencher
      // l'alerte retour chaleur J+5 (R3).
      const truieCode = selected?.truie?.trim();
      if (truieCode) {
        try {
          await updateSowByCode(truieCode, { statut: 'En attente saillie' });
        } catch (e) {
          console.warn('[sevrage] libération truie échouée', e);
        }
      }
      setSuccess(true);
      showToast(`Sevrage enregistré · ${nb} porcelets`, 'success', { duration: 2200 });
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erreur enregistrement : ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Saisir un sevrage"
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
            <p className="font-heading text-[18px] uppercase tracking-wide">
              Sevrage enregistré
            </p>
            {selected && (
              <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
                {selected.idPortee || selected.id}
              </p>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
            aria-label="Saisie d'un sevrage"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <Baby size={18} aria-hidden="true" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Sélectionnez la bande à sevrer
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="sevrage-bande"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Bande
              </label>
              <select
                id="sevrage-bande"
                value={bandeId}
                onChange={e => setBandeId(e.target.value)}
                disabled={saving}
                className="w-full h-12 rounded-md px-3 bg-bg-0 border border-border text-text-0 font-mono text-[13px] outline-none focus:border-accent"
              >
                <option value="">— Sélectionner une bande —</option>
                {bandesEligibles.map(b => (
                  <option key={b.id} value={b.idPortee || b.id}>
                    {b.idPortee || b.id}
                    {b.truie ? ` · ${b.truie}` : ''}
                    {b.vivants !== undefined ? ` · ${b.vivants} vivants` : ''}
                  </option>
                ))}
              </select>
              {bandesEligibles.length === 0 && (
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                  Aucune bande éligible (sous mère)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="sevrage-date"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Date de sevrage
              </label>
              <input
                id="sevrage-date"
                type="date"
                value={dateIso}
                onChange={e => setDateIso(e.target.value)}
                disabled={saving}
                className="w-full h-12 rounded-md px-3 bg-bg-0 border border-border text-text-0 font-mono text-[13px] outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="sevrage-nb"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Nombre de porcelets sevrés
              </label>
              <input
                id="sevrage-nb"
                type="text"
                inputMode="numeric"
                value={nbSevres}
                onChange={e => setNbSevres(e.target.value.replace(/[^\d]/g, ''))}
                disabled={saving}
                placeholder="0"
                className="w-full h-14 rounded-md px-4 bg-bg-0 border border-border text-text-0 font-mono text-[24px] text-center outline-none focus:border-accent tabular-nums"
              />
              {selected?.vivants !== undefined && (
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                  Max disponible : {selected.vivants}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="sevrage-poids"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Poids moyen sevrage (kg) <span className="text-red normal-case">· obligatoire</span>
                </label>
                <span className="inline-flex items-center px-2 h-6 rounded-full bg-bg-2 border border-border font-mono text-[10px] uppercase tracking-wide text-text-1">
                  5-7 kg cible
                </span>
              </div>
              <input
                id="sevrage-poids"
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0.5}
                max={50}
                aria-required="true"
                value={poidsKg}
                onChange={e => setPoidsKg(e.target.value)}
                disabled={saving}
                placeholder="6.0"
                className="w-full h-14 rounded-md px-4 bg-bg-0 border border-border text-text-0 font-mono text-[24px] text-center outline-none focus:border-accent tabular-nums"
              />
              {(() => {
                const p = parseFloat(poidsKg.replace(',', '.'));
                if (!Number.isFinite(p) || poidsKg.trim() === '') return null;
                if (p < 4 || p > 10) {
                  return (
                    <span
                      role="status"
                      className="inline-flex items-center px-2 h-6 rounded-full bg-amber-100 border border-amber-300 font-mono text-[10px] uppercase tracking-wide text-amber-900"
                    >
                      Hors plage cible 5-7 kg
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            {error && (
              <p
                role="alert"
                className="font-mono text-[11px] uppercase tracking-wide text-red"
              >
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="pressable flex-1 h-14 rounded-md bg-bg-1 border border-border text-text-1 font-mono text-[12px] font-bold uppercase tracking-wide"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !bandeId || !nbSevres || !poidsKg}
                aria-busy={saving}
                className="pressable flex-[2] h-14 rounded-md bg-accent text-bg-0 font-mono text-[13px] font-bold uppercase tracking-wide inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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

      <AppToast {...toastProps} />
    </>
  );
};

export default QuickSevrageForm;
