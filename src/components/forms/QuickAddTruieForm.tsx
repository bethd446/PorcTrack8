/**
 * QuickAddTruieForm — Création rapide d'une nouvelle truie
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : 5 champs rapides (ID auto-suggéré · Boucle · Nom · Stade ·
 * Ration). Submit → `enqueueAppendRow('SUIVI_TRUIES_REPRODUCTION', [...])`
 * avec l'ordre canonique des colonnes (cf. `docs/SHEETS_SCHEMA_TARGET.md`
 * + `mapTruie` dans `src/mappers/index.ts`) :
 *
 *   ID · Nom · Boucle · Statut · Stade · Nb Portées · Dernière portée NV ·
 *   Date MB prévue · Ration kg/j · Notes
 *
 * - ID auto-suggéré = "T" + max(id numérique existant) + 1 (fallback "T20")
 * - Validation :
 *     · ID format /^T\d+$/i (insensible casse)
 *     · Boucle non vide (trim)
 *     · Ration 0..10
 * - Toast online/offline + refreshData() au succès
 *
 * Compagnon tests : QuickAddTruieForm.test.tsx
 *
 * Exports nommés (utilisés par les tests, logique pure) :
 *   - validateAddTruie()
 *   - buildAddTruieRow()
 *   - suggestNextTruieId()
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Save } from 'lucide-react';

import { AppToast, BottomSheet, useAppToast } from '../agritech';
import { insertSow } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  STADES,
  suggestNextTruieId,
  validateAddTruie,
  type AddTruieValidation,
  type StadeChoice,
} from './quickAddTruieLogic';

// ─── Composant ───────────────────────────────────────────────────────────────

interface QuickAddTruieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddTruieForm: React.FC<QuickAddTruieFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { truies, refreshData } = useFarm();

  const suggestedId = useMemo(() => suggestNextTruieId(truies), [truies]);

  const [id, setId] = useState<string>(suggestedId);
  const [boucle, setBoucle] = useState<string>('');
  const [nom, setNom] = useState<string>('');
  const [stade, setStade] = useState<StadeChoice>('Adulte');
  const [ration, setRation] = useState<string>('3.0');
  const [errors, setErrors] = useState<AddTruieValidation['errors']>({});
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
      setStade('Adulte');
      setRation('3.0');
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc ferme + focus auto
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddTruie({ id, boucle, nom, stade, ration });
    if (!result.ok || !result.row) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const row = result.row;
      await insertSow({
        code_id: row[0] as string,
        name: (row[1] as string) || null,
        boucle: (row[2] as string) || null,
        statut: row[3] as string,
        nb_portees: row[5] as number,
        ration_kg_j: row[8] as number,
      });
      const online =
        typeof navigator !== 'undefined' && navigator.onLine;
      showToast(
        online ? 'Truie ajoutée' : 'Truie en file · sync auto',
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
        title="Nouvelle truie"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création d'une nouvelle truie"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <p className="text-mono-label text-text-1">
              Ajouter une truie au troupeau
            </p>
          </div>

          {/* ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-truie-id"
              className="block text-mono-label text-text-2"
            >
              ID <span className="text-text-2 normal-case">· auto-suggéré</span>
            </label>
            <input
              id="add-truie-id"
              ref={firstFieldRef}
              type="text"
              maxLength={10}
              autoCapitalize="characters"
              aria-label="Identifiant de la truie"
              aria-required="true"
              aria-invalid={!!errors.id}
              aria-describedby={
                errors.id ? 'add-truie-id-error' : 'add-truie-id-hint'
              }
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] uppercase tabular-nums',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.id ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="T20"
              value={id}
              onChange={e => setId(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.id ? (
              <p
                id="add-truie-id-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.id}
              </p>
            ) : (
              <p
                id="add-truie-id-hint"
                className="font-mono text-[10px] text-text-2"
              >
                Format T suivi de chiffres (ex: T20)
              </p>
            )}
          </div>

          {/* Boucle */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-truie-boucle"
              className="block text-mono-label text-text-2"
            >
              Boucle <span className="text-red normal-case">· obligatoire</span>
            </label>
            <input
              id="add-truie-boucle"
              type="text"
              maxLength={20}
              aria-label="Numéro de boucle de la truie"
              aria-required="true"
              aria-invalid={!!errors.boucle}
              aria-describedby={errors.boucle ? 'add-truie-boucle-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] tabular-nums',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.boucle ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="FR-12345"
              value={boucle}
              onChange={e => setBoucle(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.boucle ? (
              <p
                id="add-truie-boucle-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.boucle}
              </p>
            ) : null}
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-truie-nom"
              className="block text-mono-label text-text-2"
            >
              Nom <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <input
              id="add-truie-nom"
              type="text"
              maxLength={30}
              aria-label="Nom de la truie"
              className="w-full h-12 rounded-md px-3 bg-bg-0 border border-border hover:border-text-2 text-text-0 placeholder:text-text-2 font-mono text-[14px] outline-none transition-colors duration-[160ms] focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="Ex: Berthe"
              value={nom}
              onChange={e => setNom(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
          </div>

          {/* Stade */}
          <div className="space-y-1.5">
            <span
              id="add-truie-stade-label"
              className="block text-mono-label text-text-2"
            >
              Stade
            </span>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby="add-truie-stade-label"
            >
              {STADES.map(s => {
                const selected = stade === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Stade ${s}`}
                    onClick={() => setStade(s)}
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
              htmlFor="add-truie-ration"
              className="block text-mono-label text-text-2"
            >
              Ration (kg/j)
            </label>
            <input
              id="add-truie-ration"
              type="number"
              inputMode="decimal"
              min={0}
              max={10}
              step={0.1}
              aria-label="Ration alimentaire en kilogrammes par jour"
              aria-required="true"
              aria-invalid={!!errors.ration}
              aria-describedby={
                errors.ration ? 'add-truie-ration-error' : 'add-truie-ration-hint'
              }
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
              <p
                id="add-truie-ration-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.ration}
              </p>
            ) : (
              <p
                id="add-truie-ration-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
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
              aria-label="Ajouter la truie au troupeau"
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

      <AppToast {...toastProps} />
    </>
  );
};

export default QuickAddTruieForm;
