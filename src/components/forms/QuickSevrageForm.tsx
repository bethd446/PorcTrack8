import React, { useMemo, useState } from 'react';
import { Baby, Check, CheckCircle2 } from 'lucide-react';

import { AppToast, BottomSheet, useAppToast } from '../agritech';
import { Button, Input, Section, Select } from '@/design-system';
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

/**
 * QuickSevrageForm — Saisie d'un sevrage (J+28).
 *
 * V44 archétype 5 : BottomSheet + Section DS + Input/Select DS.
 * Workflow critique : transition phase bande (Sous mère → Sevré / post-sevrage)
 * et libération de la truie (En attente saillie) déclenchant l'alerte
 * R3 (retour chaleur J+5).
 *
 * Note : pas de FormField wrapper — labels htmlFor + aria-* explicites pour
 * compat tests existants (getByLabelText) et a11y native.
 */

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

const FIELD_LABEL_CLASS = 'block text-[11px] uppercase tracking-wide text-text-2 font-semibold';
const FIELD_HINT_CLASS = 'text-[11px] text-text-2';
const FIELD_ERROR_CLASS = 'text-[11px] text-red';

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

  const poidsHorsCible = useMemo(() => {
    const p = parseFloat(poidsKg.replace(',', '.'));
    if (!Number.isFinite(p) || poidsKg.trim() === '') return false;
    return p < 4 || p > 10;
  }, [poidsKg]);

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
      showToast(
        `Sevrage enregistré · ${nb} porcelets · ${poids.toFixed(1)} kg`,
        'success',
        { duration: 2400 },
      );
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
              <p className="mt-2 ft-code text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
                {selected.idPortee || selected.id}
              </p>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            noValidate
            aria-label="Saisie d'un sevrage"
          >
            {/* Header description */}
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <Baby size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-mono-label text-text-1">
                  Sevrage de la portée (J+28)
                </p>
                <p className="text-mono-micro text-text-2 mt-0.5">
                  Libère la truie pour le retour chaleur
                </p>
              </div>
            </div>

            {/* "Le saviez-vous ?" — pédagogie sevrage */}
            <aside
              role="note"
              style={{
                background: 'rgba(244, 162, 97, 0.10)',
                border: '1px solid rgba(244, 162, 97, 0.35)',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>💡</span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Le saviez-vous ?
                </strong>
                <p style={{ fontSize: 12, margin: '4px 0 0', lineHeight: 1.45 }}>
                  Sevrage standard à <strong>J28</strong>. Plus tôt fragilise les porcelets,
                  plus tard alourdit la truie. Poids attendu <strong>5-7 kg</strong>,
                  mortalité &lt;5 % à ce stade est excellente.
                </p>
                <a
                  href="/reglages/encyclopedie?slug=05-sevrage-timing-conditions"
                  style={{ fontSize: 11, color: 'var(--color-accent, #c2662b)', textDecoration: 'underline' }}
                >
                  En savoir plus →
                </a>
              </div>
            </aside>

            {/* ═══ Section : Informations principales ════════════════════ */}
            <Section label="INFORMATIONS PRINCIPALES" />

            <div className="space-y-1.5">
              <label htmlFor="sevrage-bande" className={FIELD_LABEL_CLASS}>
                Bande <span className="text-red normal-case font-normal">· requis</span>
              </label>
              <Select
                id="sevrage-bande"
                aria-label="Bande"
                aria-required="true"
                value={bandeId}
                onChange={e => setBandeId(e.target.value)}
                disabled={saving}
              >
                <option value="">— Sélectionner une bande —</option>
                {bandesEligibles.map(b => (
                  <option key={b.id} value={b.idPortee || b.id}>
                    {b.idPortee || b.id}
                    {b.truie ? ` · ${b.truie}` : ''}
                    {b.vivants !== undefined ? ` · ${b.vivants} vivants` : ''}
                  </option>
                ))}
              </Select>
              {bandesEligibles.length === 0 && (
                <p className={FIELD_HINT_CLASS}>Aucune bande éligible (sous mère)</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sevrage-date" className={FIELD_LABEL_CLASS}>
                Date de sevrage <span className="text-red normal-case font-normal">· requis</span>
              </label>
              <Input
                id="sevrage-date"
                type="date"
                aria-label="Date de sevrage"
                aria-required="true"
                className="font-mono tabular-nums"
                value={dateIso}
                max={todayIsoLocal()}
                onChange={e => setDateIso(e.target.value)}
                disabled={saving}
              />
            </div>

            {/* ═══ Section : Effectifs ═══════════════════════════════════ */}
            <Section label="EFFECTIFS" />

            <div className="space-y-1.5">
              <label htmlFor="sevrage-nb" className={FIELD_LABEL_CLASS}>
                Nombre de porcelets sevrés <span className="text-red normal-case font-normal">· requis</span>
              </label>
              <Input
                id="sevrage-nb"
                type="text"
                inputMode="numeric"
                aria-label="Nombre de porcelets sevrés"
                aria-required="true"
                className="font-mono"
                value={nbSevres}
                onChange={e => setNbSevres(e.target.value.replace(/[^\d]/g, ''))}
                disabled={saving}
                placeholder="0"
              />
              {selected?.vivants !== undefined && (
                <p className={FIELD_HINT_CLASS}>Max disponible : {selected.vivants}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="sevrage-poids" className={FIELD_LABEL_CLASS}>
                  Poids moyen sevrage (kg) <span className="text-red normal-case font-normal">· requis</span>
                </label>
                <span className="inline-flex items-center px-2 h-6 rounded-full bg-bg-2 border border-border text-mono-micro text-text-1">
                  5-7 kg cible
                </span>
              </div>
              <Input
                id="sevrage-poids"
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0.5}
                max={50}
                aria-label="Poids moyen sevrage"
                aria-required="true"
                className="font-mono tabular-nums"
                value={poidsKg}
                onChange={e => setPoidsKg(e.target.value)}
                disabled={saving}
                placeholder="6.0"
              />
              {poidsHorsCible && (
                <span
                  role="status"
                  className="inline-flex items-center px-2 h-6 rounded-full bg-amber-100 border border-amber-300 text-mono-micro text-amber-900"
                >
                  Hors plage cible 5-7 kg
                </span>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className={FIELD_ERROR_CLASS}
              >
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={saving}
                ariaLabel="Annuler et fermer"
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={saving || !bandeId || !nbSevres || !poidsKg}
                aria-busy={saving}
                ariaLabel="Enregistrer le sevrage"
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Check size={16} aria-hidden="true" />
                    Enregistrer
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

export default QuickSevrageForm;
