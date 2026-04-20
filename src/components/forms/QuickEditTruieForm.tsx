import React, { useCallback, useEffect, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { Truie } from '../../types/farm';
import {
  validateTruieEdit,
  type TruieEditValidation,
} from './quickEditTruieValidation';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditTruieForm · Édition rapide Nom + Ration d'une truie
   ─────────────────────────────────────────────────────────────────────────
   - Nom (texte, 0..30 chars, vide autorisé → retire le nom)
   - Ration (nombre, 0..10 kg/j, pas 0.1)
   - Submit → enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id, patch)
   - Toast online : "Modifications enregistrées"
     Toast offline : "Modifications en file · sync auto"
   ═════════════════════════════════════════════════════════════════════════ */

// Re-export pour compat (API publique inchangée pour les imports existants)
export { validateTruieEdit } from './quickEditTruieValidation';
export type { TruieEditPatch, TruieEditValidation } from './quickEditTruieValidation';

export interface QuickEditTruieFormProps {
  isOpen: boolean;
  onClose: () => void;
  truie: Truie;
  onSuccess?: () => void;
}

const QuickEditTruieForm: React.FC<QuickEditTruieFormProps> = ({
  isOpen,
  onClose,
  truie,
  onSuccess,
}) => {
  const { refreshData } = useFarm();

  const [nom, setNom] = useState<string>(truie.nom ?? '');
  const [ration, setRation] = useState<string>(
    truie.ration > 0 ? String(truie.ration) : '',
  );
  const [errors, setErrors] = useState<TruieEditValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset quand on (re)ouvre la sheet avec une nouvelle truie
  useEffect(() => {
    if (!isOpen) return;
    setNom(truie.nom ?? '');
    setRation(truie.ration > 0 ? String(truie.ration) : '');
    setErrors({});
    setSaving(false);
  }, [isOpen, truie]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateTruieEdit(nom, ration);
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await enqueueUpdateRow(
        'SUIVI_TRUIES_REPRODUCTION',
        'ID',
        truie.id,
        result.patch,
      );
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(
        online
          ? 'Modifications enregistrées'
          : 'Modifications en file · sync auto',
      );
      // Rafraîchit le contexte Farm — best effort (ne bloque pas le close)
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

  const displayId = truie.displayId || truie.id;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Éditer · ${displayId}`}
        height="auto"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Édition truie"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Modifier nom & ration
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 tabular-nums mt-0.5">
                {displayId}
                {truie.boucle ? ` · ${truie.boucle}` : ''}
              </p>
            </div>
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-truie-nom"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Nom <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <input
              id="edit-truie-nom"
              type="text"
              maxLength={30}
              aria-label="Nom de la truie"
              aria-invalid={!!errors.nom}
              aria-describedby={errors.nom ? 'edit-truie-nom-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.nom ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: Berthe"
              value={nom}
              onChange={e => setNom(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            <p className="font-mono text-[10px] text-text-2 tabular-nums">
              {nom.trim().length}/30 · laisser vide pour retirer
            </p>
            {errors.nom ? (
              <p
                id="edit-truie-nom-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.nom}
              </p>
            ) : null}
          </div>

          {/* Ration */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-truie-ration"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Ration (kg/j)
            </label>
            <input
              id="edit-truie-ration"
              type="number"
              inputMode="decimal"
              min={0}
              max={10}
              step={0.1}
              aria-label="Ration en kilogrammes par jour"
              aria-invalid={!!errors.ration}
              aria-describedby={
                errors.ration ? 'edit-truie-ration-error' : undefined
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
            <p className="font-mono text-[10px] text-text-2 tabular-nums">
              0 à 10 kg/j · pas 0.1
            </p>
            {errors.ration ? (
              <p
                id="edit-truie-ration-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.ration}
              </p>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
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
              aria-label="Enregistrer les modifications"
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

export default QuickEditTruieForm;
