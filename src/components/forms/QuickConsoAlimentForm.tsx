/**
 * QuickConsoAlimentForm — Saisie rapide d'une consommation aliment réelle
 * ════════════════════════════════════════════════════════════════════════
 * V21-3 (2026-05-01).
 *
 * Permet à l'éleveur de saisir la conso aliment réelle pour :
 *   • Une bande active (statut ≠ Vendu/RECAP)
 *   • Une truie individuelle
 *
 * Champs :
 *   - Sujet (radio Bande | Truie)
 *   - Combobox bande / truie (filtré actif)
 *   - Aliment utilisé (combobox produits_aliments non épuisés)
 *   - Quantité (kg) 0-500 step 0.5
 *   - Date (défaut aujourd'hui)
 *   - Notes libre 200 chars
 *
 * Persist :
 *   - INSERT feed_consumption_logs (via insertFeedConsumption)
 *   - DECREMENT produits_aliments.stock_actuel (via updateProduitAliment)
 *
 * Compagnon tests : QuickConsoAlimentForm.test.tsx (helpers purs).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Wheat, Send, AlertTriangle } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import { updateProduitAliment } from '../../services/supabaseWrites';
import { insertFeedConsumption } from '../../services/feedConsumptionAnalyzer';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  buildConsoPayload,
  filterActiveBandes,
  parseConsoNum,
  toIsoDateInput,
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

  const initialDate = useMemo(() => toIsoDateInput(), []);

  const [subject, setSubject] = useState<ConsoSubject>(
    defaultBandeId ? 'BANDE' : 'BANDE',
  );
  const [bandeId, setBandeId] = useState<string>(defaultBandeId ?? '');
  const [truieId, setTruieId] = useState<string>('');
  const [alimentId, setAlimentId] = useState<string>('');
  const [qtyKg, setQtyKg] = useState<string>('');
  const [dateConso, setDateConso] = useState<string>(initialDate);
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset à l'ouverture (render-time sync)
  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setSubject(defaultBandeId ? 'BANDE' : 'BANDE');
      setBandeId(defaultBandeId ?? '');
      setTruieId('');
      setAlimentId('');
      setQtyKg('');
      setDateConso(initialDate);
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

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
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
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
      setToast(
        ruptureImminente
          ? `${baseMsg} · stock bas !`
          : baseMsg,
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Conso aliment"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Saisie conso aliment réelle"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Wheat size={18} aria-hidden="true" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
              Saisie conso aliment réelle
            </p>
          </div>

          {/* Sujet : Bande / Truie */}
          <fieldset className="space-y-2">
            <legend className="block font-mono text-[11px] uppercase tracking-wide text-text-2">
              Sujet
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={[
                  'flex items-center gap-2 rounded-md border px-3 py-3 cursor-pointer',
                  subject === 'BANDE'
                    ? 'border-accent bg-bg-2'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="conso-subject"
                  value="BANDE"
                  checked={subject === 'BANDE'}
                  onChange={() => setSubject('BANDE')}
                  className="accent-accent"
                  disabled={saving}
                />
                <span className="font-mono text-[12px] uppercase">Bande</span>
              </label>
              <label
                className={[
                  'flex items-center gap-2 rounded-md border px-3 py-3 cursor-pointer',
                  subject === 'TRUIE'
                    ? 'border-accent bg-bg-2'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="conso-subject"
                  value="TRUIE"
                  checked={subject === 'TRUIE'}
                  onChange={() => setSubject('TRUIE')}
                  className="accent-accent"
                  disabled={saving}
                />
                <span className="font-mono text-[12px] uppercase">Truie indiv.</span>
              </label>
            </div>
          </fieldset>

          {/* Combobox bande ou truie */}
          {subject === 'BANDE' ? (
            <div className="space-y-1.5">
              <label
                htmlFor="conso-bande"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Bande <span className="text-red normal-case">· obligatoire</span>
              </label>
              <select
                id="conso-bande"
                ref={firstFieldRef as unknown as React.RefObject<HTMLSelectElement>}
                aria-required="true"
                aria-invalid={!!errors.bandeId}
                aria-describedby={errors.bandeId ? 'conso-bande-error' : undefined}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[14px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.bandeId ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
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
              {errors.bandeId ? (
                <p
                  id="conso-bande-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.bandeId}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label
                htmlFor="conso-truie"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Truie <span className="text-red normal-case">· obligatoire</span>
              </label>
              <select
                id="conso-truie"
                aria-required="true"
                aria-invalid={!!errors.truieId}
                aria-describedby={errors.truieId ? 'conso-truie-error' : undefined}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[14px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.truieId ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
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
              {errors.truieId ? (
                <p
                  id="conso-truie-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.truieId}
                </p>
              ) : null}
            </div>
          )}

          {/* Aliment utilisé */}
          <div className="space-y-1.5">
            <label
              htmlFor="conso-aliment"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Aliment <span className="text-red normal-case">· obligatoire</span>
            </label>
            <select
              id="conso-aliment"
              aria-required="true"
              aria-invalid={!!errors.alimentId}
              aria-describedby={
                errors.alimentId ? 'conso-aliment-error' : 'conso-aliment-hint'
              }
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0',
                'font-mono text-[14px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.alimentId ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
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
            {errors.alimentId ? (
              <p
                id="conso-aliment-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.alimentId}
              </p>
            ) : (
              <p
                id="conso-aliment-hint"
                className="font-mono text-[10px] text-text-2"
              >
                Seuls les aliments avec stock &gt; 0 sont listés.
              </p>
            )}
          </div>

          {/* Quantité + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="conso-qty"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Quantité (kg) <span className="text-red normal-case">·</span>
              </label>
              <input
                id="conso-qty"
                type="number"
                inputMode="decimal"
                min={0}
                max={500}
                step={0.5}
                aria-required="true"
                aria-invalid={!!errors.qtyKg}
                aria-describedby={errors.qtyKg ? 'conso-qty-error' : undefined}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[16px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.qtyKg ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0"
                value={qtyKg}
                onChange={e => setQtyKg(e.target.value)}
                disabled={saving}
              />
              {errors.qtyKg ? (
                <p
                  id="conso-qty-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.qtyKg}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="conso-date"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Date
              </label>
              <input
                id="conso-date"
                type="date"
                aria-invalid={!!errors.dateConso}
                aria-describedby={
                  errors.dateConso ? 'conso-date-error' : undefined
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[14px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.dateConso
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                value={dateConso}
                onChange={e => setDateConso(e.target.value)}
                disabled={saving}
              />
              {errors.dateConso ? (
                <p
                  id="conso-date-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.dateConso}
                </p>
              ) : null}
            </div>
          </div>

          {/* Alerte rupture imminente */}
          {ruptureImminente && selectedAliment ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-amber-pork bg-amber-pork/10 px-3 py-2 font-mono text-[12px] text-amber-pork"
            >
              <AlertTriangle size={14} className="shrink-0 mt-px" aria-hidden="true" />
              <span className="min-w-0 break-words">
                Stock bas après cette saisie ({selectedAliment.libelle}).
              </span>
            </div>
          ) : null}

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="conso-notes"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="conso-notes"
              maxLength={200}
              rows={3}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? 'conso-notes-error' : undefined}
              className={[
                'w-full rounded-md px-3 py-2',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-sans text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Observation libre…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
            {errors.notes ? (
              <p
                id="conso-notes-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* Actions */}
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
              disabled={saving}
              aria-label="Enregistrer la conso aliment"
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'font-mono text-[13px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
              ].join(' ')}
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement…</span>
              ) : (
                <>
                  <span>Enregistrer</span>
                  <Send size={14} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={1800}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default QuickConsoAlimentForm;
