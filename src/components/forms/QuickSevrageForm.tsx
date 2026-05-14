/**
 * QuickSevrageForm — Saisie d'un sevrage (J+28).
 * ════════════════════════════════════════════════════════════════════════
 * Workflow critique : transition phase bande (Sous mère → Sevré / post-sevrage)
 * et libération de la truie (En attente saillie) déclenchant l'alerte
 * R3 (retour chaleur J+5).
 *
 * Conforme au contrat (FORM_CONTRACT) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace useAppToast local)
 *  - validation fail-fast `farmValidators` → état `errors`, rendu `<FieldError>`
 *  - helpers date partagés `_formHelpers` (todayIso)
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Baby, Lightbulb } from 'lucide-react';

import { useToast } from '../../context/ToastContext';
import { useFarm } from '../../context/FarmContext';
import {
  updateBatchByCode,
  updateSowByCode,
} from '../../services/supabaseWrites';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';
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

interface SevrageErrors {
  bandeId?: string;
  dateIso?: string;
  nbSevres?: string;
  poidsKg?: string;
}

const QuickSevrageForm: React.FC<QuickSevrageFormProps> = ({
  isOpen,
  onClose,
  defaultBandeId,
  onSuccess,
}) => {
  const { bandes, refreshData } = useFarm();
  const { showToast } = useToast();

  const bandesEligibles = useMemo<BandePorcelets[]>(() => {
    return bandes.filter(b => {
      const s = (b.statut || '').toLowerCase();
      return s.includes('sous') || s.includes('mater') || s === 'sous mère';
    });
  }, [bandes]);

  const [bandeId, setBandeId] = useState<string>(defaultBandeId ?? '');
  const [dateIso, setDateIso] = useState<string>(todayIso());
  const [nbSevres, setNbSevres] = useState<string>('');
  const [poidsKg, setPoidsKg] = useState<string>('');
  const [errors, setErrors] = useState<SevrageErrors>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultBandeId: string | undefined }>({
    isOpen,
    defaultBandeId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultBandeId !== defaultBandeId) {
    setLastOpenKey({ isOpen, defaultBandeId });
    if (isOpen) {
      setBandeId(defaultBandeId ?? '');
      setDateIso(todayIso());
      setNbSevres('');
      setPoidsKg('');
      setErrors({});
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(isOpen);

  const selected = useMemo(
    () => bandes.find(b => b.idPortee === bandeId || b.id === bandeId) ?? null,
    [bandes, bandeId],
  );

  const poidsHorsCible = useMemo(() => {
    const p = parseFloat(poidsKg.replace(',', '.'));
    if (!Number.isFinite(p) || poidsKg.trim() === '') return false;
    return p < 4 || p > 10;
  }, [poidsKg]);

  const isValid = !!bandeId && !!nbSevres && !!poidsKg;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const nextErrors: SevrageErrors = {};
    if (!bandeId) {
      nextErrors.bandeId = 'Sélectionne une bande';
      setErrors(nextErrors);
      return;
    }
    // RT4 Volet 2 : Fail-Fast — effectif sevrés, date passée/aujourd'hui,
    // poids dans plage porcelet sevré (0.5–50 kg).
    const nb = parseInt(nbSevres, 10);
    const ef = validateEffectif(nb, { min: 1, max: 50, field: 'nbSevres' });
    if (!ef.ok) {
      nextErrors.nbSevres = ef.errors[0].message;
      setErrors(nextErrors);
      return;
    }
    const dr = validateDatePresentOrPast(dateIso, 'dateIso');
    if (!dr.ok) {
      nextErrors.dateIso = dr.errors[0].message;
      setErrors(nextErrors);
      return;
    }
    const poids = parseFloat(poidsKg.replace(',', '.'));
    const pr = validatePoidsKg(poids, { min: 0.5, max: 50, field: 'poidsKg' });
    if (!pr.ok) {
      nextErrors.poidsKg = pr.errors[0].message;
      setErrors(nextErrors);
      return;
    }
    setErrors({});
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
        } catch (err) {
          console.warn('[sevrage] libération truie échouée', err);
        }
      }
      showToast(
        `Sevrage enregistré · ${nb} porcelets · ${poids.toFixed(1)} kg`,
        'success',
        2400,
      );
      try { await refreshData(true); } catch { /* noop */ }
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // (FORM_CONTRACT). setSaving n'est reset qu'en cas d'erreur (catch).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erreur enregistrement : ${msg}`, 'error', 4000);
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouveau sevrage"
      title="Saisir un sevrage"
      ariaLabel="Saisie d'un sevrage"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer le sevrage"
      submitAriaLabel="Enregistrer le sevrage"
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
        <Lightbulb size={18} aria-hidden />
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
            style={{ fontSize: 11, color: 'var(--pt-accent)', textDecoration: 'underline' }}
          >
            En savoir plus ›
          </a>
        </div>
      </aside>

      <div className="field">
        <label className="label--v77" htmlFor="sevrage-bande">
          BANDE <span className="req">requis</span>
        </label>
        <select
          id="sevrage-bande"
          ref={firstFieldRef}
          className={`field__input${bandeId ? ' mono filled' : ' field__input--ghost'}`}
          aria-label="Bande"
          aria-required="true"
          aria-invalid={!!errors.bandeId}
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
        </select>
        {bandesEligibles.length === 0 && (
          <span className="hint">Aucune bande éligible (sous mère)</span>
        )}
        <FieldError message={errors.bandeId} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="sevrage-date">
          DATE DE SEVRAGE <span className="req">requis</span>
        </label>
        <input
          id="sevrage-date"
          className={`field__input mono${dateIso ? ' filled' : ' field__input--ghost'}`}
          type="date"
          aria-label="Date de sevrage"
          aria-required="true"
          aria-invalid={!!errors.dateIso}
          value={dateIso}
          max={todayIso()}
          onChange={e => setDateIso(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.dateIso} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="sevrage-nb">
          NOMBRE DE PORCELETS SEVRÉS <span className="req">requis</span>
        </label>
        <input
          id="sevrage-nb"
          className={`field__input mono${nbSevres ? ' filled' : ' field__input--ghost'}`}
          type="text"
          inputMode="numeric"
          aria-label="Nombre de porcelets sevrés"
          aria-required="true"
          aria-invalid={!!errors.nbSevres}
          value={nbSevres}
          onChange={e => setNbSevres(e.target.value.replace(/[^\d]/g, ''))}
          disabled={saving}
          placeholder="0"
        />
        {selected?.vivants !== undefined && (
          <span className="hint">Max disponible : {selected.vivants}</span>
        )}
        <FieldError message={errors.nbSevres} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="sevrage-poids">
          POIDS MOYEN SEVRAGE (KG) <span className="req">requis</span>
          <span className="hint"> · 5-7 kg cible</span>
        </label>
        <input
          id="sevrage-poids"
          className={`field__input mono${poidsKg ? ' filled' : ' field__input--ghost'}`}
          type="number"
          inputMode="decimal"
          step={0.1}
          min={0.5}
          max={50}
          aria-label="Poids moyen sevrage"
          aria-required="true"
          aria-invalid={!!errors.poidsKg}
          value={poidsKg}
          onChange={e => setPoidsKg(e.target.value)}
          disabled={saving}
          placeholder="6.0"
        />
        {poidsHorsCible && (
          <span role="status" className="hint">
            Hors plage cible 5-7 kg
          </span>
        )}
        <FieldError message={errors.poidsKg} />
      </div>
    </QuickActionSheet>
  );
};

export default QuickSevrageForm;
