import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { Verrat } from '../../types/farm';
import {
  validateVerratEdit,
  ORIGINE_SUGGESTIONS,
  ALIMENTATION_SUGGESTIONS,
  STATUT_OPTIONS,
  type VerratEditForm,
  type VerratEditInitial,
  type VerratEditValidation,
} from './quickEditVerratValidation';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditVerratForm · Édition rapide d'un verrat
   ─────────────────────────────────────────────────────────────────────────
   Sections :
     - Identité     : Nom · Boucle (obligatoire) · Origine
     - Alimentation : Alimentation (suggest) · Ration kg/j (0..10, pas 0.1)
     - Statut       : Actif · Réforme · Mort · Quarantaine
     - Notes        : textarea max 200 chars

   Submit → enqueueUpdateRow('VERRATS', 'ID', verrat.id, patch) avec clés
   canoniques NOM · BOUCLE · ORIGINE · ALIMENTATION · RATION KG/J · STATUT
   · NOTES. Le patch est PARTIEL : seuls les champs modifiés sont envoyés.
   ═════════════════════════════════════════════════════════════════════════ */

// Re-export pour accès depuis les tests / autres modules
export {
  validateVerratEdit,
  ORIGINE_SUGGESTIONS,
  ALIMENTATION_SUGGESTIONS,
  STATUT_OPTIONS,
} from './quickEditVerratValidation';
export type {
  VerratEditPatch,
  VerratEditValidation,
  VerratEditForm,
  VerratEditInitial,
} from './quickEditVerratValidation';

export interface QuickEditVerratFormProps {
  isOpen: boolean;
  onClose: () => void;
  verrat: Verrat;
  onSuccess?: () => void;
}

const QuickEditVerratForm: React.FC<QuickEditVerratFormProps> = ({
  isOpen,
  onClose,
  verrat,
  onSuccess,
}) => {
  const { refreshData } = useFarm();

  const initial: VerratEditInitial = useMemo(
    () => ({
      nom: verrat.nom ?? '',
      boucle: verrat.boucle ?? '',
      origine: verrat.origine ?? '',
      alimentation: verrat.alimentation ?? '',
      ration: verrat.ration ?? 0,
      statut: verrat.statut || 'Actif',
      notes: verrat.notes ?? '',
    }),
    [verrat],
  );

  const [nom, setNom] = useState<string>(initial.nom);
  const [boucle, setBoucle] = useState<string>(initial.boucle);
  const [origine, setOrigine] = useState<string>(initial.origine);
  const [alimentation, setAlimentation] = useState<string>(initial.alimentation);
  const [ration, setRation] = useState<string>(
    initial.ration > 0 ? String(initial.ration) : '',
  );
  const [statut, setStatut] = useState<string>(initial.statut);
  const [notes, setNotes] = useState<string>(initial.notes);
  const [errors, setErrors] = useState<VerratEditValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset à chaque (ré)ouverture
  useEffect(() => {
    if (!isOpen) return;
    setNom(initial.nom);
    setBoucle(initial.boucle);
    setOrigine(initial.origine);
    setAlimentation(initial.alimentation);
    setRation(initial.ration > 0 ? String(initial.ration) : '');
    setStatut(initial.statut);
    setNotes(initial.notes);
    setErrors({});
    setSaving(false);
  }, [isOpen, initial]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc + focus auto sur 1er input (Nom)
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateVerratEdit(
      { nom, boucle, origine, alimentation, ration, statut, notes },
      initial,
    );
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    // Patch vide (aucune modification) : on ferme sans réseau
    if (Object.keys(result.patch).length === 0) {
      setToast('Aucune modification');
      onClose();
      return;
    }
    setSaving(true);
    try {
      await enqueueUpdateRow('VERRATS', 'ID', verrat.id, result.patch);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(
        online
          ? 'Modifications enregistrées'
          : 'Modifications en file · sync auto',
      );
      try {
        await refreshData();
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement local',
      );
    } finally {
      setSaving(false);
    }
  };

  const displayId = verrat.displayId || verrat.id;

  // Classe réutilisable pour les <input> en ligne
  const inputBaseClass = (invalid: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[14px]',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      invalid ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Éditer · ${displayId}`}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
          aria-label="Édition verrat"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Modifier identité & ration
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 tabular-nums mt-0.5">
                {displayId}
                {verrat.boucle ? ` · ${verrat.boucle}` : ''}
              </p>
            </div>
          </div>

          {/* ═══ Section Identité ════════════════════════════════════ */}
          <section aria-label="Identité" className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Identité
            </h3>

            {/* Nom */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-nom"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Nom <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-verrat-nom"
                ref={firstFieldRef}
                type="text"
                maxLength={30}
                aria-label={`Nom du verrat ${displayId}`}
                aria-invalid={!!errors.nom}
                aria-describedby={
                  errors.nom ? 'edit-verrat-nom-error' : 'edit-verrat-nom-hint'
                }
                className={inputBaseClass(!!errors.nom)}
                placeholder="Ex: Titan"
                value={nom}
                onChange={e => setNom(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <p
                id="edit-verrat-nom-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {nom.trim().length}/30 · laisser vide pour retirer
              </p>
              {errors.nom ? (
                <p
                  id="edit-verrat-nom-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.nom}
                </p>
              ) : null}
            </div>

            {/* Boucle (obligatoire) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-boucle"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Boucle <span className="text-red normal-case">· requis</span>
              </label>
              <input
                id="edit-verrat-boucle"
                type="text"
                maxLength={30}
                aria-label={`Boucle du verrat ${displayId}`}
                aria-required="true"
                aria-invalid={!!errors.boucle}
                aria-describedby={
                  errors.boucle
                    ? 'edit-verrat-boucle-error'
                    : 'edit-verrat-boucle-hint'
                }
                className={inputBaseClass(!!errors.boucle)}
                placeholder="Ex: V-001"
                value={boucle}
                onChange={e => setBoucle(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <p
                id="edit-verrat-boucle-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {boucle.trim().length}/30
              </p>
              {errors.boucle ? (
                <p
                  id="edit-verrat-boucle-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.boucle}
                </p>
              ) : null}
            </div>

            {/* Origine */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-origine"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Origine <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-verrat-origine"
                type="text"
                list="edit-verrat-origine-list"
                maxLength={40}
                aria-label={`Origine du verrat ${displayId}`}
                aria-invalid={!!errors.origine}
                aria-describedby={
                  errors.origine
                    ? 'edit-verrat-origine-error'
                    : 'edit-verrat-origine-hint'
                }
                className={inputBaseClass(!!errors.origine)}
                placeholder="Thomasset, Azaguie, Import…"
                value={origine}
                onChange={e => setOrigine(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <datalist id="edit-verrat-origine-list">
                {ORIGINE_SUGGESTIONS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p
                id="edit-verrat-origine-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {origine.trim().length}/40
              </p>
              {errors.origine ? (
                <p
                  id="edit-verrat-origine-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.origine}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Section Alimentation ═══════════════════════════════ */}
          <section aria-label="Alimentation" className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Alimentation
            </h3>

            {/* Alimentation (text suggest) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-alimentation"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Alimentation
              </label>
              <input
                id="edit-verrat-alimentation"
                type="text"
                list="edit-verrat-alimentation-list"
                maxLength={40}
                aria-label={`Alimentation du verrat ${displayId}`}
                aria-invalid={!!errors.alimentation}
                aria-describedby={
                  errors.alimentation
                    ? 'edit-verrat-alimentation-error'
                    : 'edit-verrat-alimentation-hint'
                }
                className={inputBaseClass(!!errors.alimentation)}
                placeholder="Mâle reproducteur, Entretien…"
                value={alimentation}
                onChange={e => setAlimentation(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <datalist id="edit-verrat-alimentation-list">
                {ALIMENTATION_SUGGESTIONS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p
                id="edit-verrat-alimentation-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {alimentation.trim().length}/40
              </p>
              {errors.alimentation ? (
                <p
                  id="edit-verrat-alimentation-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.alimentation}
                </p>
              ) : null}
            </div>

            {/* Ration */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-ration"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Ration (kg/j)
              </label>
              <input
                id="edit-verrat-ration"
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step={0.1}
                aria-label="Ration alimentaire en kilogrammes par jour"
                aria-required="true"
                aria-invalid={!!errors.ration}
                aria-describedby={
                  errors.ration
                    ? 'edit-verrat-ration-error'
                    : 'edit-verrat-ration-hint'
                }
                className={[
                  'w-full h-14 rounded-md px-4',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[22px] tabular-nums text-center',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.ration
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0.0"
                value={ration}
                onChange={e => setRation(e.target.value)}
                disabled={saving}
              />
              <p
                id="edit-verrat-ration-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                0 à 10 kg/j · pas 0.1
              </p>
              {errors.ration ? (
                <p
                  id="edit-verrat-ration-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.ration}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Section Statut ═════════════════════════════════════ */}
          <section aria-label="Statut" className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Statut
            </h3>
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-statut"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Statut du verrat
              </label>
              <select
                id="edit-verrat-statut"
                aria-label={`Statut du verrat ${displayId}`}
                aria-invalid={!!errors.statut}
                aria-describedby={
                  errors.statut ? 'edit-verrat-statut-error' : undefined
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[14px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.statut
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                value={statut}
                onChange={e => setStatut(e.target.value)}
                disabled={saving}
              >
                {STATUT_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.statut ? (
                <p
                  id="edit-verrat-statut-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.statut}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Section Notes ══════════════════════════════════════ */}
          <section aria-label="Notes" className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Notes
            </h3>
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-notes"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Notes <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <textarea
                id="edit-verrat-notes"
                maxLength={200}
                rows={3}
                aria-label={`Notes sur le verrat ${displayId}`}
                aria-invalid={!!errors.notes}
                aria-describedby={
                  errors.notes
                    ? 'edit-verrat-notes-error'
                    : 'edit-verrat-notes-hint'
                }
                className={[
                  'w-full rounded-md px-3 py-2',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  'resize-none',
                  errors.notes
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="Observations, historique, remarques…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
              />
              <p
                id="edit-verrat-notes-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {notes.trim().length}/200
              </p>
              {errors.notes ? (
                <p
                  id="edit-verrat-notes-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.notes}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Actions ════════════════════════════════════════════ */}
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
              aria-label="Enregistrer les modifications du verrat"
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

export default QuickEditVerratForm;
