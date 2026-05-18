/**
 * QuickConsoAlimentForm — Saisie rapide d'une consommation aliment réelle
 * ════════════════════════════════════════════════════════════════════════
 * Permet à l'éleveur de saisir la conso aliment réelle pour :
 *   • Une bande active (statut ≠ Vendu/RECAP)
 *   • Une truie individuelle
 *
 * Champs : Sujet (radio Bande | Truie) · Combobox bande/truie · Aliment ·
 *          Quantité (kg) · Date · Notes.
 *
 * Persist :
 *   - INSERT feed_consumption_logs (via insertFeedConsumption)
 *   - DECREMENT produits_aliments.stock_actuel (via updateProduitAliment)
 *
 * Conforme FORM_CONTRACT : shell `<QuickActionSheet>`, `<form onSubmit>`,
 * toast canonique `useToast()`, validation `validateConsoForm` →
 * `{ ok, errors }` + `<FieldError>`, helpers date partagés, reset-on-open
 * `lastOpenKey`, garde double-clic `closeTimerRef` + cleanup.
 *
 * Compagnon tests : QuickConsoAlimentForm.test.tsx (helpers purs).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { updateProduitAliment } from '../../services/supabaseWrites';
import { insertFeedConsumption } from '../../services/feedConsumptionAnalyzer';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';
import {
  buildConsoPayload,
  filterActiveBandes,
  parseConsoNum,
  validateConsoForm,
  type ConsoFormInput,
  type ConsoSubject,
} from './quickConsoAlimentLogic';
import type { BandePorcelets, StockAliment, Truie } from '../../types/farm';

interface QuickConsoAlimentFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pré-sélectionne une bande (ex: depuis la fiche bande). */
  defaultBandeId?: string;
  onSuccess?: () => void;
}

const QuickConsoAlimentForm: React.FC<QuickConsoAlimentFormProps> = ({
  isOpen,
  onClose,
  defaultBandeId,
  onSuccess,
}) => {
  const { bandes, truies, stockAliment, refreshData } = useFarm();
  const { showToast } = useToast();

  const [subject, setSubject] = useState<ConsoSubject>('BANDE');
  const [bandeId, setBandeId] = useState<string>(defaultBandeId ?? '');
  const [truieId, setTruieId] = useState<string>('');
  const [alimentId, setAlimentId] = useState<string>('');
  const [qtyKg, setQtyKg] = useState<string>('');
  const [dateConso, setDateConso] = useState<string>(todayIso);
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      setSubject('BANDE');
      setBandeId(defaultBandeId ?? '');
      setTruieId('');
      setAlimentId('');
      setQtyKg('');
      setDateConso(todayIso());
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  // ── Listes filtrées ────────────────────────────────────────────────────
  const activeBandes: BandePorcelets[] = useMemo(
    () => filterActiveBandes(bandes),
    [bandes],
  );

  const activeTruies: Truie[] = useMemo(
    () => truies.filter(t => (t.statut || '').toLowerCase() !== 'morte'),
    [truies],
  );

  const availableAliments: StockAliment[] = useMemo(
    () => stockAliment.filter(a => (a.stockActuel ?? 0) > 0),
    [stockAliment],
  );

  const selectedAliment = useMemo(
    () => stockAliment.find(a => a.id === alimentId) ?? null,
    [stockAliment, alimentId],
  );

  // Alerte rupture imminente : stock - qty <= seuilAlerte
  const ruptureImminente = useMemo(() => {
    if (!selectedAliment) return false;
    const qty = parseConsoNum(qtyKg);
    if (qty == null) return false;
    const newStock = (selectedAliment.stockActuel ?? 0) - qty;
    return newStock <= (selectedAliment.seuilAlerte ?? 0);
  }, [selectedAliment, qtyKg]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);

  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const input: ConsoFormInput = {
      subject,
      bandeId,
      truieId,
      alimentId,
      qtyKg,
      dateConso,
      notes,
    };
    const validation = validateConsoForm(input);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = buildConsoPayload(input);

      // 1. Insert log
      await insertFeedConsumption(payload);

      // 2. Décrément stock aliment (best-effort)
      if (selectedAliment && payload.produit_aliment_id) {
        const newStock = Math.max(
          0,
          (selectedAliment.stockActuel ?? 0) - payload.qty_kg,
        );
        const enAlerte = newStock <= (selectedAliment.seuilAlerte ?? 0);
        await updateProduitAliment(selectedAliment.id, {
          stock_actuel: newStock,
          en_alerte: enAlerte,
        });
      }

      const online = typeof navigator !== 'undefined' && navigator.onLine;
      const baseMsg = online ? 'Conso enregistrée' : 'Conso en file · sync auto';
      // useToast ne supporte pas le tone 'warning' : la rupture imminente est
      // signalée via le texte du toast + l'alerte inline visible avant submit.
      showToast(
        ruptureImminente ? `${baseMsg} · stock bas !` : baseMsg,
        online ? 'success' : 'info',
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      // Garde double-clic : saving maintenu jusqu'au onClose (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
        'error',
        4000,
      );
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Conso aliment"
      title="Saisie conso aliment réelle"
      ariaLabel="Saisie conso aliment réelle"
      saving={saving}
      isValid
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      submitAriaLabel="Enregistrer la conso aliment"
    >
      {/* Sujet : Bande / Truie */}
      <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="label--v77">SUJET</legend>
        <div className="radio-chips--cards" role="radiogroup" aria-label="Sujet">
          <button
            type="button"
            className={`radio-chip--card${subject === 'BANDE' ? ' is-selected' : ''}`}
            role="radio"
            aria-checked={subject === 'BANDE'}
            onClick={() => setSubject('BANDE')}
            disabled={saving}
          >
            Bande
          </button>
          <button
            type="button"
            className={`radio-chip--card${subject === 'TRUIE' ? ' is-selected' : ''}`}
            role="radio"
            aria-checked={subject === 'TRUIE'}
            onClick={() => setSubject('TRUIE')}
            disabled={saving}
          >
            Truie indiv.
          </button>
        </div>
      </fieldset>

      {/* Combobox bande ou truie */}
      {subject === 'BANDE' ? (
        <div className="field">
          <label className="label--v77" htmlFor="conso-bande">
            BANDE <span className="req">requis</span>
          </label>
          <select
            id="conso-bande"
            ref={firstFieldRef as unknown as React.RefObject<HTMLSelectElement>}
            className={`field__input${bandeId ? ' filled' : ''}`}
            aria-label="Bande"
            aria-required="true"
            aria-invalid={!!errors.bandeId}
            value={bandeId}
            onChange={e => setBandeId(e.target.value)}
            disabled={saving}
          >
            <option value="">— Choisir une bande —</option>
            {activeBandes.map(b => (
              <option key={b.id} value={b.id}>
                {b.idPortee} {b.truie ? `· ${b.truie}` : ''}
              </option>
            ))}
          </select>
          <FieldError message={errors.bandeId} />
        </div>
      ) : (
        <div className="field">
          <label className="label--v77" htmlFor="conso-truie">
            TRUIE <span className="req">requis</span>
          </label>
          <select
            id="conso-truie"
            className={`field__input${truieId ? ' filled' : ''}`}
            aria-label="Truie"
            aria-required="true"
            aria-invalid={!!errors.truieId}
            value={truieId}
            onChange={e => setTruieId(e.target.value)}
            disabled={saving}
          >
            <option value="">— Choisir une truie —</option>
            {activeTruies.map(t => (
              <option key={t.id} value={t.id}>
                {t.displayId} {t.boucle ? `· ${t.boucle}` : ''}
              </option>
            ))}
          </select>
          <FieldError message={errors.truieId} />
        </div>
      )}

      <div className="field">
        <label className="label--v77" htmlFor="conso-aliment">
          ALIMENT <span className="req">requis</span>
        </label>
        <select
          id="conso-aliment"
          className={`field__input${alimentId ? ' filled' : ''}`}
          aria-label="Aliment"
          aria-required="true"
          aria-invalid={!!errors.alimentId}
          value={alimentId}
          onChange={e => setAlimentId(e.target.value)}
          disabled={saving}
        >
          <option value="">— Choisir un aliment —</option>
          {availableAliments.map(a => (
            <option key={a.id} value={a.id}>
              {a.libelle} ({a.stockActuel} {a.unite})
            </option>
          ))}
        </select>
        <FieldError message={errors.alimentId} />
        {!errors.alimentId ? (
          <span className="hint">Seuls les aliments avec stock &gt; 0 sont listés.</span>
        ) : null}
      </div>

      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="conso-qty">
            QUANTITÉ (KG) <span className="req">requis</span>
          </label>
          <input
            id="conso-qty"
            className={`field__input mono${qtyKg ? ' filled' : ' field__input--ghost'}`}
            type="number"
            inputMode="decimal"
            min={0}
            max={500}
            step={0.5}
            aria-label="Quantité en kilogrammes"
            aria-required="true"
            aria-invalid={!!errors.qtyKg}
            placeholder="0"
            value={qtyKg}
            onChange={e => setQtyKg(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.qtyKg} />
        </div>

        <div className="field">
          <label className="label--v77" htmlFor="conso-date">DATE</label>
          <input
            id="conso-date"
            className={`field__input mono${dateConso ? ' filled' : ' field__input--ghost'}`}
            type="date"
            aria-label="Date conso"
            aria-invalid={!!errors.dateConso}
            value={dateConso}
            onChange={e => setDateConso(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.dateConso} />
        </div>
      </div>

      {/* Alerte rupture imminente */}
      {ruptureImminente && selectedAliment ? (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--pt-warning)',
            background: 'color-mix(in srgb, var(--pt-warning) 10%, transparent)',
            fontSize: 12,
            color: 'var(--pt-warning)',
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <span style={{ minWidth: 0, wordBreak: 'break-word' }}>
            Stock bas après cette saisie ({selectedAliment.libelle}).
          </span>
        </div>
      ) : null}

      <div className="field">
        <label className="label--v77" htmlFor="conso-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="conso-notes"
          className={`field__input${notes ? ' filled' : ' field__input--ghost'}`}
          maxLength={200}
          rows={3}
          aria-label="Notes"
          aria-invalid={!!errors.notes}
          placeholder="Observation libre…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.notes} />
      </div>
    </QuickActionSheet>
  );
};

export default QuickConsoAlimentForm;
