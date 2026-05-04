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
import { FormField, Input, Select, Textarea, Button } from '@/design-system';
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
            <p className="text-mono-label text-text-1">
              Saisie conso aliment réelle
            </p>
          </div>

          {/* Sujet : Bande / Truie */}
          <fieldset className="space-y-2">
            <legend className="block text-mono-label text-text-2">
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
                <span className="text-[12px] uppercase">Bande</span>
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
                <span className="text-[12px] uppercase">Truie indiv.</span>
              </label>
            </div>
          </fieldset>

          {/* Combobox bande ou truie */}
          {subject === 'BANDE' ? (
            <FormField label="Bande" required error={errors.bandeId}>
              <Select
                id="conso-bande"
                ref={firstFieldRef as unknown as React.RefObject<HTMLSelectElement>}
                aria-label="Bande"
                aria-required="true"
                aria-invalid={!!errors.bandeId}
                aria-describedby={errors.bandeId ? 'conso-bande-error' : undefined}
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
              </Select>
            </FormField>
          ) : (
            <FormField label="Truie" required error={errors.truieId}>
              <Select
                id="conso-truie"
                aria-label="Truie"
                aria-required="true"
                aria-invalid={!!errors.truieId}
                aria-describedby={errors.truieId ? 'conso-truie-error' : undefined}
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
              </Select>
            </FormField>
          )}

          <FormField
            label="Aliment"
            required
            hint={errors.alimentId ? undefined : 'Seuls les aliments avec stock > 0 sont listés.'}
            error={errors.alimentId}
          >
            <Select
              id="conso-aliment"
              aria-label="Aliment"
              aria-required="true"
              aria-invalid={!!errors.alimentId}
              aria-describedby={
                errors.alimentId ? 'conso-aliment-error' : 'conso-aliment-hint'
              }
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
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantité (kg)" required error={errors.qtyKg}>
              <Input
                id="conso-qty"
                type="number"
                aria-label="Quantité en kilogrammes"
                inputMode="decimal"
                min={0}
                max={500}
                step={0.5}
                aria-required="true"
                aria-invalid={!!errors.qtyKg}
                aria-describedby={errors.qtyKg ? 'conso-qty-error' : undefined}
                className="font-mono tabular-nums"
                placeholder="0"
                value={qtyKg}
                onChange={e => setQtyKg(e.target.value)}
                disabled={saving}
                invalid={!!errors.qtyKg}
              />
            </FormField>

            <FormField label="Date" error={errors.dateConso}>
              <Input
                id="conso-date"
                type="date"
                aria-label="Date conso"
                aria-invalid={!!errors.dateConso}
                aria-describedby={
                  errors.dateConso ? 'conso-date-error' : undefined
                }
                className="font-mono tabular-nums"
                value={dateConso}
                onChange={e => setDateConso(e.target.value)}
                disabled={saving}
                invalid={!!errors.dateConso}
              />
            </FormField>
          </div>

          {/* Alerte rupture imminente */}
          {ruptureImminente && selectedAliment ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-amber-pork bg-amber-pork/10 px-3 py-2 text-[12px] text-amber-pork"
            >
              <AlertTriangle size={14} className="shrink-0 mt-px" aria-hidden="true" />
              <span className="min-w-0 break-words">
                Stock bas après cette saisie ({selectedAliment.libelle}).
              </span>
            </div>
          ) : null}

          <FormField label="Notes" hint="optionnel" error={errors.notes}>
            <Textarea
              id="conso-notes"
              aria-label="Notes"
              maxLength={200}
              rows={3}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? 'conso-notes-error' : undefined}
              placeholder="Observation libre…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
              ariaLabel="Annuler et fermer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              aria-busy={saving}
              ariaLabel="Enregistrer la conso aliment"
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
                  Enregistrer
                  <Send size={14} aria-hidden="true" />
                </span>
              )}
            </Button>
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
