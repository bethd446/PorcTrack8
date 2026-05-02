/**
 * QuickAddVerratForm — Création rapide d'un nouveau verrat
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : ID auto-suggéré · Boucle · Nom · Race · Date naissance ·
 * Origine · Loge · Statut · Ration. Submit → `insertBoar()` (Supabase) avec
 * auto-injection `farm_id` via `runInsert`.
 *
 * Patron miroir de `QuickAddTruieForm.tsx`.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { insertBoar } from '../../services/supabaseWrites';
import { enqueueInsert, isOnline } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  VERRAT_STATUTS,
  VERRAT_RACE_SUGGESTIONS,
  suggestNextVerratId,
  validateAddVerrat,
  type AddVerratValidation,
  type VerratStatutChoice,
} from './quickAddVerratLogic';

// ─── Composant ───────────────────────────────────────────────────────────────

interface QuickAddVerratFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddVerratForm: React.FC<QuickAddVerratFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { verrats, refreshData } = useFarm();

  const suggestedId = useMemo(() => suggestNextVerratId(verrats), [verrats]);

  const [id, setId] = useState<string>(suggestedId);
  const [boucle, setBoucle] = useState<string>('');
  const [nom, setNom] = useState<string>('');
  const [race, setRace] = useState<string>('');
  const [dateNaissance, setDateNaissance] = useState<string>('');
  const [origine, setOrigine] = useState<string>('');
  const [loge, setLoge] = useState<string>('');
  const [statut, setStatut] = useState<VerratStatutChoice>('Actif');
  const [ration, setRation] = useState<string>('3.0');
  const [errors, setErrors] = useState<AddVerratValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset à l'ouverture (render-time sync)
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; suggestedId: string }>({
    isOpen,
    suggestedId,
  });
  if (lastKey.isOpen !== isOpen || lastKey.suggestedId !== suggestedId) {
    setLastKey({ isOpen, suggestedId });
    if (isOpen) {
      setId(suggestedId);
      setBoucle('');
      setNom('');
      setRace('');
      setDateNaissance('');
      setOrigine('');
      setLoge('');
      setStatut('Actif');
      setRation('3.0');
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddVerrat({
      id,
      boucle,
      nom,
      race,
      dateNaissance,
      origine,
      loge,
      statut,
      ration,
    });
    if (!result.ok || !result.values) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      // E3 : offline-aware. Online → insert direct. Offline → queue + flush
      // automatique au reconnect (cf. installOnlineFlushListener).
      const online = isOnline();
      if (online) {
        await insertBoar(result.values);
      } else {
        await enqueueInsert('boars', result.values as Record<string, unknown>);
      }
      setToast(online ? 'Verrat ajouté' : 'Verrat en file · sync auto');
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
        title="Nouveau verrat"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création d'un nouveau verrat"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <p className="text-mono-label text-text-1">
              Ajouter un verrat au troupeau
            </p>
          </div>

          {/* ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-verrat-id"
              className="block text-mono-label text-text-2"
            >
              ID <span className="text-text-2 normal-case">· auto-suggéré</span>
            </label>
            <input
              id="add-verrat-id"
              ref={firstFieldRef}
              type="text"
              maxLength={10}
              autoCapitalize="characters"
              aria-required="true"
              aria-invalid={!!errors.id}
              aria-describedby={errors.id ? 'add-verrat-id-error' : 'add-verrat-id-hint'}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] uppercase tabular-nums',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.id ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="V01"
              value={id}
              onChange={e => setId(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.id ? (
              <p id="add-verrat-id-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.id}
              </p>
            ) : (
              <p id="add-verrat-id-hint" className="font-mono text-[10px] text-text-2">
                Format V suivi de chiffres (ex: V01)
              </p>
            )}
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-verrat-nom"
              className="block text-mono-label text-text-2"
            >
              Nom <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <input
              id="add-verrat-nom"
              type="text"
              maxLength={30}
              aria-invalid={!!errors.nom}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.nom ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: Bobi"
              value={nom}
              onChange={e => setNom(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.nom ? (
              <p role="alert" className="font-mono text-[11px] text-red">{errors.nom}</p>
            ) : null}
          </div>

          {/* Boucle */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-verrat-boucle"
              className="block text-mono-label text-text-2"
            >
              Boucle <span className="text-red normal-case">· obligatoire</span>
            </label>
            <input
              id="add-verrat-boucle"
              type="text"
              maxLength={30}
              aria-required="true"
              aria-invalid={!!errors.boucle}
              aria-describedby={errors.boucle ? 'add-verrat-boucle-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] tabular-nums outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.boucle ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="FR-V01-001"
              value={boucle}
              onChange={e => setBoucle(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.boucle ? (
              <p id="add-verrat-boucle-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.boucle}
              </p>
            ) : null}
          </div>

          {/* Race */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-verrat-race"
              className="block text-mono-label text-text-2"
            >
              Race
            </label>
            <input
              id="add-verrat-race"
              type="text"
              list="add-verrat-race-list"
              maxLength={40}
              aria-invalid={!!errors.race}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.race ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: Large White"
              value={race}
              onChange={e => setRace(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            <datalist id="add-verrat-race-list">
              {VERRAT_RACE_SUGGESTIONS.map(r => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {errors.race ? (
              <p role="alert" className="font-mono text-[11px] text-red">{errors.race}</p>
            ) : null}
          </div>

          {/* Date naissance */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-verrat-date-naissance"
              className="block text-mono-label text-text-2"
            >
              Date de naissance <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <input
              id="add-verrat-date-naissance"
              type="date"
              aria-invalid={!!errors.dateNaissance}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0',
                'font-mono text-[14px] tabular-nums outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.dateNaissance ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              value={dateNaissance}
              onChange={e => setDateNaissance(e.target.value)}
              disabled={saving}
            />
            {errors.dateNaissance ? (
              <p role="alert" className="font-mono text-[11px] text-red">{errors.dateNaissance}</p>
            ) : null}
          </div>

          {/* Origine */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-verrat-origine"
              className="block text-mono-label text-text-2"
            >
              Origine
            </label>
            <input
              id="add-verrat-origine"
              type="text"
              maxLength={50}
              aria-invalid={!!errors.origine}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.origine ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: Élevage Thomasset"
              value={origine}
              onChange={e => setOrigine(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.origine ? (
              <p role="alert" className="font-mono text-[11px] text-red">{errors.origine}</p>
            ) : null}
          </div>

          {/* Loge */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-verrat-loge"
              className="block text-mono-label text-text-2"
            >
              Localisation (loge)
            </label>
            <input
              id="add-verrat-loge"
              type="text"
              maxLength={30}
              aria-invalid={!!errors.loge}
              className={[
                'w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.loge ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: V1, Bât A"
              value={loge}
              onChange={e => setLoge(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.loge ? (
              <p role="alert" className="font-mono text-[11px] text-red">{errors.loge}</p>
            ) : null}
          </div>

          {/* Statut */}
          <div className="space-y-1.5">
            <span
              id="add-verrat-statut-label"
              className="block text-mono-label text-text-2"
            >
              Statut
            </span>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby="add-verrat-statut-label"
            >
              {VERRAT_STATUTS.map(s => {
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

          {/* Ration */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-verrat-ration"
              className="block text-mono-label text-text-2"
            >
              Ration (kg/j)
            </label>
            <input
              id="add-verrat-ration"
              type="number"
              inputMode="decimal"
              min={0}
              max={10}
              step={0.1}
              aria-required="true"
              aria-invalid={!!errors.ration}
              aria-describedby={errors.ration ? 'add-verrat-ration-error' : 'add-verrat-ration-hint'}
              className={[
                'w-full h-14 rounded-md px-4',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[22px] tabular-nums text-center',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.ration ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="3.0"
              value={ration}
              onChange={e => setRation(e.target.value)}
              disabled={saving}
            />
            {errors.ration ? (
              <p id="add-verrat-ration-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.ration}
              </p>
            ) : (
              <p id="add-verrat-ration-hint" className="font-mono text-[10px] text-text-2 tabular-nums">
                0 à 10 kg/j · défaut 3.0
              </p>
            )}
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
              aria-label="Ajouter le verrat au troupeau"
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

export default QuickAddVerratForm;
