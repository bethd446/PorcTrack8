/**
 * QuickAddBandeForm — Création manuelle d'une bande historique
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : ID portée auto-suggéré · Truie mère · Verrat père · Date MB ·
 * Nés vivants · Morts-nés (+ M/F optionnels) · Statut · Loge · Notes.
 *
 * NB : 99% des bandes sont auto-créées via la mise-bas (Agent B). Ce form
 * sert uniquement à importer une bande historique (ex: animaux antérieurs
 * à l'app). Submit → `insertBatch()` (Supabase) avec auto-injection du
 * `farm_id` via `runInsert`.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button } from '@/design-system';
import {
  insertBatch,
  resolveSowIdByCode,
  resolveBoarIdByCode,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  BANDE_STATUTS_INITIAUX,
  suggestNextIdPortee,
  validateAddBande,
  type AddBandeValidation,
  type BandeStatutInitial,
} from './quickAddBandeLogic';
import {
  validatePoidsKg,
  validateDatePresentOrPast,
  validateEffectif,
} from '../../lib/validation/farmValidators';

// ─── Composant ───────────────────────────────────────────────────────────────

interface QuickAddBandeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddBandeForm: React.FC<QuickAddBandeFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { truies, verrats, bandes, refreshData } = useFarm();

  const [idPortee, setIdPortee] = useState<string>('');
  const [truieId, setTruieId] = useState<string>('');
  const [verratId, setVerratId] = useState<string>('');
  const [dateMb, setDateMb] = useState<string>('');
  const [nesVivants, setNesVivants] = useState<string>('');
  const [mortsNes, setMortsNes] = useState<string>('');
  const [mortsNesMales, setMortsNesMales] = useState<string>('');
  const [mortsNesFemelles, setMortsNesFemelles] = useState<string>('');
  const [statut, setStatut] = useState<BandeStatutInitial>('Sous mère');
  const [poidsKg, setPoidsKg] = useState<string>('');
  const [loge, setLoge] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<AddBandeValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Auto-suggest ID portée dès qu'une truie est sélectionnée
  const suggestedId = useMemo(() => {
    if (!truieId) return '';
    return suggestNextIdPortee(truieId, bandes);
  }, [truieId, bandes]);

  // Reset à l'ouverture
  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setIdPortee('');
      setTruieId('');
      setVerratId('');
      setDateMb('');
      setNesVivants('');
      setMortsNes('');
      setMortsNesMales('');
      setMortsNesFemelles('');
      setStatut('Sous mère');
      setPoidsKg('');
      setLoge('');
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

  // Synchronise l'ID suggéré quand truieId change (sans écraser une saisie manuelle)
  const [lastSuggested, setLastSuggested] = useState<string>('');
  if (suggestedId !== lastSuggested) {
    setLastSuggested(suggestedId);
    if (suggestedId && (idPortee === '' || idPortee === lastSuggested)) {
      setIdPortee(suggestedId);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(isOpen);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddBande({
      idPortee,
      truieId,
      verratId,
      dateMb,
      nesVivants,
      mortsNes,
      mortsNesMales,
      mortsNesFemelles,
      statut,
      poidsKg,
      loge,
      notes,
    });
    if (!result.ok || !result.values) {
      setErrors(result.errors);
      return;
    }
    // RT4 Volet 2 : Fail-Fast farm validators en complément (sécurité défense
    // en profondeur). Bornes plus larges que la logique métier locale, mais
    // attrapent NaN/dates futures si la regex de validateAddBande passe.
    const failFast: AddBandeValidation['errors'] = {};
    if (result.values.date_mise_bas) {
      const dr = validateDatePresentOrPast(result.values.date_mise_bas, 'dateMb');
      if (!dr.ok) failFast.dateMb = dr.errors[0].message;
    }
    const ef = validateEffectif(result.values.porcelets_nes_vivants, {
      max: 25,
      field: 'nesVivants',
    });
    if (!ef.ok) failFast.nesVivants = ef.errors[0].message;
    const pr = validatePoidsKg(result.values.poids_initial_kg, {
      min: 0.5,
      max: 50,
      field: 'poidsKg',
    });
    if (!pr.ok) failFast.poidsKg = pr.errors[0].message;
    if (Object.keys(failFast).length > 0) {
      setErrors(failFast);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const sowUuid = await resolveSowIdByCode(result.values.sow_code_id);
      if (!sowUuid) {
        throw new Error(`Truie ${result.values.sow_code_id} introuvable`);
      }
      const boarUuid = result.values.boar_code_id
        ? await resolveBoarIdByCode(result.values.boar_code_id)
        : null;

      await insertBatch({
        code_id: result.values.code_id,
        sow_id: sowUuid,
        boar_id: boarUuid,
        date_mise_bas: result.values.date_mise_bas,
        porcelets_nes_vivants: result.values.porcelets_nes_vivants,
        porcelets_nes_total: result.values.porcelets_nes_total,
        nb_mort_nes: result.values.nb_mort_nes,
        statut: result.values.statut,
        loge: result.values.loge,
        notes: result.values.notes,
        // Colonne V23 (NOT NULL) — type Database pas encore régénéré.
        poids_initial_kg: result.values.poids_initial_kg,
      } as Parameters<typeof insertBatch>[0]);
      const online =
        typeof navigator !== 'undefined' && navigator.onLine;
      setToast(online ? 'Bande ajoutée' : 'Bande en file · sync auto');
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
        title="Bande historique"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création d'une bande historique"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-mono-label text-text-1">
                Importer une bande historique
              </p>
              <p className="text-mono-micro text-text-2 mt-0.5">
                Pour les portées antérieures à l'application
              </p>
            </div>
          </div>

          {/* Truie mère */}
          <FormField label="Truie mère" required error={errors.truieId}>
            <Select
              id="add-bande-truie"
              ref={firstFieldRef}
              aria-required="true"
              aria-invalid={!!errors.truieId}
              aria-describedby={errors.truieId ? 'add-bande-truie-error' : undefined}
              value={truieId}
              onChange={e => setTruieId(e.target.value)}
              disabled={saving}
            >
              <option value="">— Sélectionner une truie —</option>
              {truies.map(t => (
                <option key={t.id} value={t.displayId || t.id}>
                  {t.displayId || t.id}{t.nom ? ` · ${t.nom}` : ''}{t.boucle ? ` (${t.boucle})` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Verrat père */}
          <FormField label="Verrat père" hint="optionnel" error={errors.verratId}>
            <Select
              id="add-bande-verrat"
              aria-invalid={!!errors.verratId}
              value={verratId}
              onChange={e => setVerratId(e.target.value)}
              disabled={saving}
            >
              <option value="">— Aucun —</option>
              {verrats.map(v => (
                <option key={v.id} value={v.displayId || v.id}>
                  {v.displayId || v.id}{v.nom ? ` · ${v.nom}` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          {/* ID portée */}
          <FormField
            label="ID portée"
            required
            hint={`auto-suggéré · Format YY-T<n>-NN (ex: 26-T1-01)`}
            error={errors.idPortee}
          >
            <Input
              id="add-bande-id"
              type="text"
              maxLength={30}
              autoCapitalize="characters"
              aria-required="true"
              aria-invalid={!!errors.idPortee}
              aria-describedby={errors.idPortee ? 'add-bande-id-error' : 'add-bande-id-hint'}
              className="ft-code uppercase"
              placeholder="26-T1-01"
              value={idPortee}
              onChange={e => setIdPortee(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
          </FormField>

          {/* Date mise-bas */}
          <FormField label="Date de mise-bas" error={errors.dateMb}>
            <Input
              id="add-bande-date-mb"
              type="date"
              aria-invalid={!!errors.dateMb}
              value={dateMb}
              onChange={e => setDateMb(e.target.value)}
              disabled={saving}
            />
          </FormField>

          {/* Nés vivants + morts-nés */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nés vivants" required error={errors.nesVivants}>
              <Input
                id="add-bande-nv"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                aria-required="true"
                aria-invalid={!!errors.nesVivants}
                aria-describedby={errors.nesVivants ? 'add-bande-nv-error' : undefined}
                className="font-mono tabular-nums text-center"
                value={nesVivants}
                onChange={e => setNesVivants(e.target.value)}
                disabled={saving}
              />
            </FormField>
            <FormField label="Morts-nés" error={errors.mortsNes}>
              <Input
                id="add-bande-mn"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                aria-invalid={!!errors.mortsNes}
                className="font-mono tabular-nums text-center"
                placeholder="0"
                value={mortsNes}
                onChange={e => setMortsNes(e.target.value)}
                disabled={saving}
              />
            </FormField>
          </div>

          {/* Mort-nés mâles / femelles */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Mort-nés ♂" hint="optionnel" error={errors.mortsNesMales}>
              <Input
                id="add-bande-mn-m"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                aria-invalid={!!errors.mortsNesMales}
                className="font-mono tabular-nums text-center"
                placeholder="0"
                value={mortsNesMales}
                onChange={e => setMortsNesMales(e.target.value)}
                disabled={saving}
              />
            </FormField>
            <FormField label="Mort-nés ♀" hint="optionnel" error={errors.mortsNesFemelles}>
              <Input
                id="add-bande-mn-f"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                aria-invalid={!!errors.mortsNesFemelles}
                className="font-mono tabular-nums text-center"
                placeholder="0"
                value={mortsNesFemelles}
                onChange={e => setMortsNesFemelles(e.target.value)}
                disabled={saving}
              />
            </FormField>
          </div>

          {errors.coherence ? (
            <p role="alert" className="text-[11px] text-red">
              {errors.coherence}
            </p>
          ) : null}

          {/* Statut */}
          <div className="space-y-1.5">
            <span
              id="add-bande-statut-label"
              className="block text-mono-label text-text-2"
            >
              Statut initial
            </span>
            {/* TODO V44: Radio DS missing — radiogroup natif conservé */}
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby="add-bande-statut-label"
            >
              {BANDE_STATUTS_INITIAUX.map(s => {
                const selected = statut === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Statut ${s}`}
                    onClick={() => setStatut(s)}
                    disabled={saving}
                    className={[
                      'pressable inline-flex items-center justify-center',
                      'h-10 px-3 rounded-md border',
                      'text-[12px] uppercase tracking-wide',
                      'transition-colors duration-[160ms]',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                      selected
                        ? 'bg-accent text-bg-0 border-accent font-semibold'
                        : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                    ].join(' ')}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Poids moyen au sevrage / naissance */}
          <FormField
            label="Poids moyen sevrage (kg)"
            required={statut === 'Sevrés'}
            hint={statut === 'Sevrés' ? '5-7 kg cible' : 'défaut naissance 1.4 kg · 5-7 kg cible'}
            error={errors.poidsKg}
          >
            <Input
              id="add-bande-poids"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0.5}
              max={50}
              aria-required={statut === 'Sevrés'}
              aria-invalid={!!errors.poidsKg}
              aria-describedby={errors.poidsKg ? 'add-bande-poids-error' : undefined}
              className="font-mono tabular-nums text-center"
              placeholder={statut === 'Sevrés' ? '6.0' : '1.4'}
              value={poidsKg}
              onChange={e => setPoidsKg(e.target.value)}
              disabled={saving}
            />
            {!errors.poidsKg && (() => {
              const p = parseFloat(poidsKg.replace(',', '.'));
              if (!Number.isFinite(p) || poidsKg.trim() === '') return null;
              if (statut === 'Sevrés' && (p < 4 || p > 10)) {
                return (
                  <span
                    role="status"
                    className="inline-flex items-center mt-1 px-2 h-6 rounded-full bg-amber-100 border border-amber-300 text-mono-micro text-amber-900"
                  >
                    Hors plage cible 5-7 kg
                  </span>
                );
              }
              return null;
            })()}
          </FormField>

          {/* Loge actuelle */}
          <FormField label="Loge actuelle" error={errors.loge}>
            <Input
              id="add-bande-loge"
              type="text"
              maxLength={30}
              aria-invalid={!!errors.loge}
              placeholder="Ex: M1, P-Sev 2"
              value={loge}
              onChange={e => setLoge(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes" error={errors.notes}>
            <Textarea
              id="add-bande-notes"
              rows={3}
              maxLength={300}
              aria-invalid={!!errors.notes}
              placeholder="Origine, contexte, observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
          </FormField>

          {/* Actions */}
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
              ariaLabel="Ajouter la bande historique"
              aria-busy={saving}
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
                  Ajouter
                  <Save size={14} aria-hidden="true" />
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

export default QuickAddBandeForm;
