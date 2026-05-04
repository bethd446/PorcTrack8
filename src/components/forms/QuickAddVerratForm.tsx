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
import { Plus, Save } from 'lucide-react';

import { AppToast, BottomSheet, useAppToast } from '../agritech';
import { FormField, Input, Button, Segment } from '@/design-system';
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
  const { show: showToast, toastProps } = useAppToast();

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
      showToast(
        online ? 'Verrat ajouté' : 'Verrat en file · sync auto',
        online ? 'success' : 'info',
        { duration: 1800 },
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
        'error',
        { duration: 1800 },
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

          <FormField
            label="ID"
            hint={errors.id ? undefined : 'Format V suivi de chiffres (ex: V01)'}
            error={errors.id}
          >
            <Input
              id="add-verrat-id"
              ref={firstFieldRef}
              type="text"
              aria-label="Identifiant du verrat"
              maxLength={10}
              autoCapitalize="characters"
              aria-required="true"
              aria-invalid={!!errors.id}
              aria-describedby={errors.id ? 'add-verrat-id-error' : 'add-verrat-id-hint'}
              className="ft-code uppercase"
              placeholder="V01"
              value={id}
              onChange={e => setId(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.id}
            />
          </FormField>

          <FormField label="Nom" hint="optionnel" error={errors.nom}>
            <Input
              id="add-verrat-nom"
              type="text"
              aria-label="Nom du verrat"
              maxLength={30}
              aria-invalid={!!errors.nom}
              placeholder="Ex: Bobi"
              value={nom}
              onChange={e => setNom(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.nom}
            />
          </FormField>

          <FormField label="Boucle" required error={errors.boucle}>
            <Input
              id="add-verrat-boucle"
              type="text"
              aria-label="Boucle du verrat"
              maxLength={30}
              aria-required="true"
              aria-invalid={!!errors.boucle}
              aria-describedby={errors.boucle ? 'add-verrat-boucle-error' : undefined}
              className="ft-code"
              placeholder="FR-V01-001"
              value={boucle}
              onChange={e => setBoucle(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.boucle}
            />
          </FormField>

          <FormField label="Race" error={errors.race}>
            <Input
              id="add-verrat-race"
              type="text"
              aria-label="Race"
              list="add-verrat-race-list"
              maxLength={40}
              aria-invalid={!!errors.race}
              placeholder="Ex: Large White"
              value={race}
              onChange={e => setRace(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.race}
            />
            <datalist id="add-verrat-race-list">
              {VERRAT_RACE_SUGGESTIONS.map(r => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </FormField>

          <FormField label="Date de naissance" hint="optionnel" error={errors.dateNaissance}>
            <Input
              id="add-verrat-date-naissance"
              type="date"
              aria-label="Date de naissance"
              aria-invalid={!!errors.dateNaissance}
              className="tabular-nums"
              value={dateNaissance}
              onChange={e => setDateNaissance(e.target.value)}
              disabled={saving}
              invalid={!!errors.dateNaissance}
            />
          </FormField>

          <FormField label="Origine" error={errors.origine}>
            <Input
              id="add-verrat-origine"
              type="text"
              aria-label="Origine"
              maxLength={50}
              aria-invalid={!!errors.origine}
              placeholder="Ex: Élevage Thomasset"
              value={origine}
              onChange={e => setOrigine(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.origine}
            />
          </FormField>

          <FormField label="Localisation (loge)" error={errors.loge}>
            <Input
              id="add-verrat-loge"
              type="text"
              aria-label="Localisation (loge)"
              maxLength={30}
              aria-invalid={!!errors.loge}
              placeholder="Ex: V1, Bât A"
              value={loge}
              onChange={e => setLoge(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.loge}
            />
          </FormField>

          <FormField label="Statut">
            <Segment<VerratStatutChoice>
              value={statut}
              onChange={v => setStatut(v)}
              options={VERRAT_STATUTS.map(s => ({ value: s, label: s }))}
              ariaLabel="Statut du verrat"
            />
          </FormField>

          <FormField
            label="Ration (kg/j)"
            hint={errors.ration ? undefined : '0 à 10 kg/j · défaut 3.0'}
            error={errors.ration}
          >
            <Input
              id="add-verrat-ration"
              type="number"
              aria-label="Ration en kilogrammes par jour"
              inputMode="decimal"
              min={0}
              max={10}
              step={0.1}
              aria-required="true"
              aria-invalid={!!errors.ration}
              aria-describedby={errors.ration ? 'add-verrat-ration-error' : 'add-verrat-ration-hint'}
              className="font-mono text-[22px] tabular-nums text-center"
              placeholder="3.0"
              value={ration}
              onChange={e => setRation(e.target.value)}
              disabled={saving}
              invalid={!!errors.ration}
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button
              variant="ghost"
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
              ariaLabel="Ajouter le verrat au troupeau"
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

      <AppToast {...toastProps} />
    </>
  );
};

export default QuickAddVerratForm;
