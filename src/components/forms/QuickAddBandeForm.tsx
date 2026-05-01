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
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Importer une bande historique
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 mt-0.5">
                Pour les portées antérieures à l'application
              </p>
            </div>
          </div>

          {/* Truie mère */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-bande-truie"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Truie mère <span className="text-red normal-case">· obligatoire</span>
            </label>
            <select
              id="add-bande-truie"
              ref={firstFieldRef}
              aria-required="true"
              aria-invalid={!!errors.truieId}
              aria-describedby={errors.truieId ? 'add-bande-truie-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                'font-mono text-[14px] outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.truieId ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
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
            </select>
            {errors.truieId ? (
              <p id="add-bande-truie-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.truieId}
              </p>
            ) : null}
          </div>

          {/* Verrat père */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-bande-verrat"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Verrat père <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <select
              id="add-bande-verrat"
              aria-invalid={!!errors.verratId}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                'font-mono text-[14px] outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.verratId ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
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
            </select>
          </div>

          {/* ID portée */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-bande-id"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              ID portée <span className="text-text-2 normal-case">· auto-suggéré</span>
            </label>
            <input
              id="add-bande-id"
              type="text"
              maxLength={30}
              autoCapitalize="characters"
              aria-required="true"
              aria-invalid={!!errors.idPortee}
              aria-describedby={errors.idPortee ? 'add-bande-id-error' : 'add-bande-id-hint'}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] uppercase tabular-nums outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.idPortee ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="26-T1-01"
              value={idPortee}
              onChange={e => setIdPortee(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.idPortee ? (
              <p id="add-bande-id-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.idPortee}
              </p>
            ) : (
              <p id="add-bande-id-hint" className="font-mono text-[10px] text-text-2">
                Format YY-T{'<n>'}-NN (ex: 26-T1-01)
              </p>
            )}
          </div>

          {/* Date mise-bas */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-bande-date-mb"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Date de mise-bas
            </label>
            <input
              id="add-bande-date-mb"
              type="date"
              aria-invalid={!!errors.dateMb}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                'font-mono text-[14px] tabular-nums outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.dateMb ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              value={dateMb}
              onChange={e => setDateMb(e.target.value)}
              disabled={saving}
            />
            {errors.dateMb ? (
              <p role="alert" className="font-mono text-[11px] text-red">{errors.dateMb}</p>
            ) : null}
          </div>

          {/* Nés vivants + morts-nés */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="add-bande-nv"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Nés vivants <span className="text-red normal-case">·</span>
              </label>
              <input
                id="add-bande-nv"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                aria-required="true"
                aria-invalid={!!errors.nesVivants}
                aria-describedby={errors.nesVivants ? 'add-bande-nv-error' : undefined}
                className={[
                  'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                  'font-mono text-[16px] tabular-nums text-center outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.nesVivants ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                value={nesVivants}
                onChange={e => setNesVivants(e.target.value)}
                disabled={saving}
              />
              {errors.nesVivants ? (
                <p id="add-bande-nv-error" role="alert" className="font-mono text-[11px] text-red">
                  {errors.nesVivants}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="add-bande-mn"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Morts-nés
              </label>
              <input
                id="add-bande-mn"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                aria-invalid={!!errors.mortsNes}
                className={[
                  'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                  'font-mono text-[16px] tabular-nums text-center outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.mortsNes ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0"
                value={mortsNes}
                onChange={e => setMortsNes(e.target.value)}
                disabled={saving}
              />
              {errors.mortsNes ? (
                <p role="alert" className="font-mono text-[11px] text-red">{errors.mortsNes}</p>
              ) : null}
            </div>
          </div>

          {/* Mort-nés mâles / femelles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="add-bande-mn-m"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Mort-nés ♂ <span className="text-text-2 normal-case">· opt.</span>
              </label>
              <input
                id="add-bande-mn-m"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                aria-invalid={!!errors.mortsNesMales}
                className={[
                  'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                  'font-mono text-[16px] tabular-nums text-center outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.mortsNesMales ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0"
                value={mortsNesMales}
                onChange={e => setMortsNesMales(e.target.value)}
                disabled={saving}
              />
              {errors.mortsNesMales ? (
                <p role="alert" className="font-mono text-[11px] text-red">{errors.mortsNesMales}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="add-bande-mn-f"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Mort-nés ♀ <span className="text-text-2 normal-case">· opt.</span>
              </label>
              <input
                id="add-bande-mn-f"
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                step={1}
                aria-invalid={!!errors.mortsNesFemelles}
                className={[
                  'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                  'font-mono text-[16px] tabular-nums text-center outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.mortsNesFemelles ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0"
                value={mortsNesFemelles}
                onChange={e => setMortsNesFemelles(e.target.value)}
                disabled={saving}
              />
              {errors.mortsNesFemelles ? (
                <p role="alert" className="font-mono text-[11px] text-red">{errors.mortsNesFemelles}</p>
              ) : null}
            </div>
          </div>

          {errors.coherence ? (
            <p role="alert" className="font-mono text-[11px] text-red">
              {errors.coherence}
            </p>
          ) : null}

          {/* Statut */}
          <div className="space-y-1.5">
            <span
              id="add-bande-statut-label"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Statut initial
            </span>
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
                      'font-mono text-[12px] uppercase tracking-wide',
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="add-bande-poids"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Poids moyen sevrage (kg){' '}
                {statut === 'Sevrés' ? (
                  <span className="text-red normal-case">· obligatoire</span>
                ) : (
                  <span className="text-text-2 normal-case">· défaut naissance 1.4 kg</span>
                )}
              </label>
              <span className="inline-flex items-center px-2 h-6 rounded-full bg-bg-2 border border-border font-mono text-[10px] uppercase tracking-wide text-text-1">
                5-7 kg cible
              </span>
            </div>
            <input
              id="add-bande-poids"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0.5}
              max={50}
              aria-required={statut === 'Sevrés'}
              aria-invalid={!!errors.poidsKg}
              aria-describedby={errors.poidsKg ? 'add-bande-poids-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[16px] tabular-nums text-center outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.poidsKg ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder={statut === 'Sevrés' ? '6.0' : '1.4'}
              value={poidsKg}
              onChange={e => setPoidsKg(e.target.value)}
              disabled={saving}
            />
            {errors.poidsKg ? (
              <p id="add-bande-poids-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.poidsKg}
              </p>
            ) : (() => {
              const p = parseFloat(poidsKg.replace(',', '.'));
              if (!Number.isFinite(p) || poidsKg.trim() === '') return null;
              if (statut === 'Sevrés' && (p < 4 || p > 10)) {
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

          {/* Loge actuelle */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-bande-loge"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Loge actuelle
            </label>
            <input
              id="add-bande-loge"
              type="text"
              maxLength={30}
              aria-invalid={!!errors.loge}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.loge ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: M1, P-Sev 2"
              value={loge}
              onChange={e => setLoge(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.loge ? (
              <p role="alert" className="font-mono text-[11px] text-red">{errors.loge}</p>
            ) : null}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-bande-notes"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Notes
            </label>
            <textarea
              id="add-bande-notes"
              rows={3}
              maxLength={300}
              aria-invalid={!!errors.notes}
              className={[
                'w-full rounded-md px-3 py-2 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[13px] outline-none transition-colors duration-[160ms] resize-none',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Origine, contexte, observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
            {errors.notes ? (
              <p role="alert" className="font-mono text-[11px] text-red">{errors.notes}</p>
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
              aria-label="Ajouter la bande historique"
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
                  <span>Ajouter</span>
                  <Save size={14} aria-hidden="true" />
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

export default QuickAddBandeForm;
