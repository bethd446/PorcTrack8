/**
 * QuickAddAlimentForm — Création rapide d'un nouvel aliment au catalogue
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : champs rapides pour enregistrer une nouvelle matière / aliment
 * dans `produits_aliments`. Submit → `insertProduitAliment(...)`.
 *
 * - ID auto-suggéré = "A" + max(id numérique existant) + 1 (fallback "A01")
 * - Validation :
 *     · id format /^A\d+$/i (insensible casse)
 *     · libelle non vide, max 60
 *     · stockActuel >= 0 (nombre fini)
 *     · unite non vide
 *     · seuilAlerte >= 0 (nombre fini)
 *     · notes max 200
 * - Statut auto-calculé via `recomputeStatut(stockActuel, seuilAlerte)`
 * - Toast online/offline + refreshData() au succès
 *
 * Conforme FORM_CONTRACT : shell `<QuickActionSheet>`, `<form onSubmit>`,
 * toast canonique `useToast()`, validation `{ ok, errors, row }` +
 * `<FieldError>`, reset-on-open `lastOpenKey`, garde double-clic
 * `closeTimerRef` + cleanup.
 *
 * Compagnon tests : QuickAddAlimentForm.test.tsx
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { insertProduitAliment } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import type { StockStatut } from '../../types/farm';
import { recomputeStatut } from './quickRefillLogic';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import {
  UNITE_SUGGESTIONS,
  suggestNextAlimentId,
  validateAddAliment,
  type AddAlimentValidation,
} from './quickAddAlimentLogic';

/** Parse une valeur numérique (accepte virgule décimale FR). */
function parseNum(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ─── Composant ───────────────────────────────────────────────────────────────

interface QuickAddAlimentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddAlimentForm: React.FC<QuickAddAlimentFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { stockAliment, refreshData } = useFarm();
  const { showToast } = useToast();

  const suggestedId = useMemo(
    () => suggestNextAlimentId(stockAliment),
    [stockAliment],
  );

  const [id, setId] = useState<string>(suggestedId);
  const [libelle, setLibelle] = useState<string>('');
  const [stockActuel, setStockActuel] = useState<string>('0');
  const [unite, setUnite] = useState<string>('kg');
  const [seuilAlerte, setSeuilAlerte] = useState<string>('50');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<AddAlimentValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; suggestedId: string }>({
    isOpen,
    suggestedId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.suggestedId !== suggestedId) {
    setLastOpenKey({ isOpen, suggestedId });
    if (isOpen) {
      setId(suggestedId);
      setLibelle('');
      setStockActuel('0');
      setUnite('kg');
      setSeuilAlerte('50');
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

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);

  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateAddAliment({
      id,
      libelle,
      stockActuel,
      unite,
      seuilAlerte,
      notes,
    });
    if (!result.ok || !result.row) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const row = result.row;
      await insertProduitAliment({
        code_id: row[0] as string,
        libelle: row[1] as string,
        stock_actuel: row[2] as number,
        unite: (row[3] as string) || null,
        seuil_alerte: row[4] as number,
        en_alerte: (row[5] as string) !== 'OK',
        notes: (row[6] as string) || null,
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(
        online ? 'Aliment ajouté' : 'Aliment en file · sync auto',
        online ? 'success' : 'info',
      );
      try {
        await refreshData(true); // Force process queue + refresh
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

  // Preview statut basé sur les valeurs courantes (si valides)
  const previewStatut = useMemo<StockStatut | null>(() => {
    const s = parseNum(stockActuel);
    const a = parseNum(seuilAlerte);
    if (s === null || a === null || s < 0 || a < 0) return null;
    return recomputeStatut(s, a);
  }, [stockActuel, seuilAlerte]);

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouvel aliment"
      title="Ajouter un aliment"
      ariaLabel="Création d'un nouvel aliment"
      saving={saving}
      isValid
      onSubmit={handleSubmit}
      submitLabel="Ajouter"
      submitAriaLabel="Ajouter l'aliment au catalogue"
    >
      <div className="field">
        <label className="label--v77" htmlFor="add-aliment-id">
          ID <span className="req">requis</span>
        </label>
        <input
          id="add-aliment-id"
          ref={firstFieldRef}
          className={`field__input mono${id ? ' filled' : ' field__input--ghost'}`}
          type="text"
          maxLength={10}
          autoCapitalize="characters"
          aria-label="Identifiant de l'aliment"
          aria-required="true"
          aria-invalid={!!errors.id}
          placeholder="A01"
          value={id}
          onChange={e => setId(e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.id} />
        {!errors.id ? (
          <span className="hint">Format A suivi de chiffres (ex: A01)</span>
        ) : null}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-aliment-libelle">
          LIBELLÉ <span className="req">requis</span>
        </label>
        <input
          id="add-aliment-libelle"
          className={`field__input${libelle ? ' filled' : ' field__input--ghost'}`}
          type="text"
          maxLength={60}
          aria-label="Libellé de l'aliment"
          aria-required="true"
          aria-invalid={!!errors.libelle}
          placeholder="Ex: Maïs grain"
          value={libelle}
          onChange={e => setLibelle(e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.libelle} />
      </div>

      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="add-aliment-stock">STOCK INITIAL</label>
          <input
            id="add-aliment-stock"
            className={`field__input mono${stockActuel ? ' filled' : ' field__input--ghost'}`}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            aria-label="Stock initial"
            aria-required="true"
            aria-invalid={!!errors.stockActuel}
            placeholder="0"
            value={stockActuel}
            onChange={e => setStockActuel(e.target.value)}
            disabled={saving}
          />
          <FieldError message={errors.stockActuel} />
        </div>

        <div className="field">
          <label className="label--v77" htmlFor="add-aliment-unite">UNITÉ</label>
          <input
            id="add-aliment-unite"
            className={`field__input${unite ? ' filled' : ' field__input--ghost'}`}
            type="text"
            list="add-aliment-unite-list"
            maxLength={20}
            aria-label="Unité de mesure"
            aria-required="true"
            aria-invalid={!!errors.unite}
            placeholder="kg"
            value={unite}
            onChange={e => setUnite(e.target.value)}
            disabled={saving}
            autoComplete="off"
          />
          <datalist id="add-aliment-unite-list">
            {UNITE_SUGGESTIONS.map(u => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <FieldError message={errors.unite} />
        </div>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-aliment-seuil">SEUIL ALERTE</label>
        <input
          id="add-aliment-seuil"
          className={`field__input mono${seuilAlerte ? ' filled' : ' field__input--ghost'}`}
          type="number"
          inputMode="decimal"
          min={0}
          step={1}
          aria-label="Seuil d'alerte stock bas"
          aria-required="true"
          aria-invalid={!!errors.seuilAlerte}
          placeholder="50"
          value={seuilAlerte}
          onChange={e => setSeuilAlerte(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.seuilAlerte} />
        {!errors.seuilAlerte ? (
          <span className="hint">Statut auto-calculé : {previewStatut ?? '—'}</span>
        ) : null}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-aliment-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="add-aliment-notes"
          className={`field__input${notes ? ' filled' : ' field__input--ghost'}`}
          maxLength={200}
          rows={3}
          aria-label="Notes libres"
          aria-invalid={!!errors.notes}
          placeholder="Fournisseur, calibre, observations…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.notes} />
      </div>
    </QuickActionSheet>
  );
};

export default QuickAddAlimentForm;
