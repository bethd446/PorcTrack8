/**
 * QuickAddVetoForm — Création rapide d'un nouveau produit vétérinaire
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : 8 champs (ID auto-suggéré · Produit · Type · Usage · Stock
 * initial · Unité · Seuil alerte · Notes).
 *
 * Submit → `enqueueAppendRow('STOCK_VETO', [...])` dans l'ordre des colonnes
 * attendu par `mapStockVeto` (cf. `src/mappers/index.ts:287`) :
 *
 *   ID · PRODUIT · TYPE · USAGE · STOCK_ACTUEL · UNITE · SEUIL_ALERTE ·
 *   STATUT · NOTES
 *
 * Le STATUT est auto-calculé (recomputeStatut) à partir du stock initial et
 * du seuil d'alerte.
 *
 * - ID auto-suggéré = "V" + max(id numérique existant) + 1 (fallback "V01")
 * - Validation : pure `validateAddVeto` → { ok, errors, row }
 * - Toast online/offline canonique `useToast()` + refreshData() au succès
 *
 * Conforme FORM_CONTRACT Phase 1 :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace IonToast local)
 *  - validation `{ ok, errors, row }` + rendu erreur via `<FieldError>`
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Compagnon tests : QuickAddVetoForm.test.tsx
 *
 * Exports nommés (testés unitairement, logique pure) :
 *   - suggestNextVetoId()
 *   - validateAddVeto()
 *   - buildAddVetoRow()
 *   - TYPE_SUGGESTIONS / USAGE_SUGGESTIONS / UNITE_SUGGESTIONS
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { insertProduitVeto } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import {
  TYPE_SUGGESTIONS,
  USAGE_SUGGESTIONS,
  UNITE_SUGGESTIONS,
  suggestNextVetoId,
  validateAddVeto,
  type AddVetoValidation,
} from './quickAddVetoLogic';
import { recomputeStatut } from './quickRefillLogic';

// ─── Composant ───────────────────────────────────────────────────────────────

interface QuickAddVetoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickAddVetoForm: React.FC<QuickAddVetoFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { stockVeto, refreshData } = useFarm();
  const { showToast } = useToast();

  const suggestedId = useMemo(() => suggestNextVetoId(stockVeto), [stockVeto]);

  const [id, setId] = useState<string>(suggestedId);
  const [produit, setProduit] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [usage, setUsage] = useState<string>('');
  const [stockActuel, setStockActuel] = useState<string>('0');
  const [unite, setUnite] = useState<string>('mL');
  const [seuilAlerte, setSeuilAlerte] = useState<string>('5');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<AddVetoValidation['errors']>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; suggestedId: string }>({
    isOpen, suggestedId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.suggestedId !== suggestedId) {
    setLastOpenKey({ isOpen, suggestedId });
    if (isOpen) {
      setId(suggestedId);
      setProduit('');
      setType('');
      setUsage('');
      setStockActuel('0');
      setUnite('mL');
      setSeuilAlerte('5');
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
    const result = validateAddVeto({
      id,
      produit,
      type,
      usage,
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
      await insertProduitVeto({
        code_id: row[0] as string,
        libelle: row[1] as string,
        type: (row[2] as string) || null,
        usage: (row[3] as string) || null,
        stock_actuel: row[4] as number,
        unite: (row[5] as string) || null,
        stock_min: row[6] as number,
        alerte_stock_bas: (row[7] as string) !== 'OK',
        notes: (row[8] as string) || null,
      });
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(
        online ? 'Produit ajouté' : 'Produit en file · sync auto',
        online ? 'success' : 'info',
        1800,
      );
      try {
        await refreshData(true);
      } catch {
        /* non-bloquant : queue offline applique déjà */
      }
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // pendant la fenêtre 1.5s de toast (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
        'error', 4000,
      );
      setSaving(false);
    }
  };

  // Preview statut calculé live
  const previewStatut = useMemo(() => {
    const s = Number(String(stockActuel).replace(',', '.'));
    const seuil = Number(String(seuilAlerte).replace(',', '.'));
    if (!Number.isFinite(s) || !Number.isFinite(seuil)) return null;
    return recomputeStatut(s, seuil);
  }, [stockActuel, seuilAlerte]);

  const previewTone =
    previewStatut === 'RUPTURE' ? 'text-red'
      : previewStatut === 'BAS' ? 'text-amber'
        : 'text-accent';

  const isValid = produit.trim() !== '' && unite.trim() !== '';

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouveau produit"
      title="Nouveau produit véto"
      ariaLabel="Création d'un nouveau produit vétérinaire"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Ajouter"
      submitAriaLabel="Ajouter le produit à la pharmacie"
    >
      {/* Datalists pour suggestions */}
      <datalist id="add-veto-types">
        {TYPE_SUGGESTIONS.map(t => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="add-veto-usages">
        {USAGE_SUGGESTIONS.map(u => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <datalist id="add-veto-unites">
        {UNITE_SUGGESTIONS.map(u => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className="field">
        <label className="label--v77" htmlFor="add-veto-id">
          ID <span className="hint">auto</span>
        </label>
        <input
          id="add-veto-id"
          ref={firstFieldRef}
          type="text"
          maxLength={10}
          autoCapitalize="characters"
          className={`field__input mono${id ? ' filled' : ' field__input--ghost'}`}
          aria-label="Identifiant du produit vétérinaire"
          aria-required="true"
          aria-invalid={!!errors.id}
          placeholder="V01"
          value={id}
          onChange={e => setId(e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.id} />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-veto-produit">
          PRODUIT <span className="req">requis</span>
        </label>
        <input
          id="add-veto-produit"
          type="text"
          maxLength={80}
          className={`field__input${produit ? ' mono filled' : ' field__input--ghost'}`}
          aria-label="Nom du produit vétérinaire"
          aria-required="true"
          aria-invalid={!!errors.produit}
          placeholder="Ex: Ivermectine 1%"
          value={produit}
          onChange={e => setProduit(e.target.value)}
          disabled={saving}
          autoComplete="off"
        />
        <FieldError message={errors.produit} />
      </div>

      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="add-veto-type">TYPE</label>
          <input
            id="add-veto-type"
            type="text"
            list="add-veto-types"
            maxLength={40}
            className={`field__input${type ? ' mono filled' : ' field__input--ghost'}`}
            aria-label="Type de produit vétérinaire"
            placeholder="Antiparasitaire"
            value={type}
            onChange={e => setType(e.target.value)}
            disabled={saving}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label className="label--v77" htmlFor="add-veto-usage">USAGE</label>
          <input
            id="add-veto-usage"
            type="text"
            list="add-veto-usages"
            maxLength={40}
            className={`field__input${usage ? ' mono filled' : ' field__input--ghost'}`}
            aria-label="Usage du produit vétérinaire"
            placeholder="Prévention"
            value={usage}
            onChange={e => setUsage(e.target.value)}
            disabled={saving}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="add-veto-stock">
            STOCK INITIAL <span className="req">requis</span>
          </label>
          <input
            id="add-veto-stock"
            type="text"
            inputMode="decimal"
            className={`field__input mono${stockActuel ? ' filled' : ' field__input--ghost'}`}
            aria-label="Stock initial"
            aria-required="true"
            aria-invalid={!!errors.stockActuel}
            placeholder="0"
            value={stockActuel}
            onChange={e => setStockActuel(e.target.value.replace(/[^\d.,]/g, ''))}
            disabled={saving}
          />
          <FieldError message={errors.stockActuel} />
        </div>
        <div className="field">
          <label className="label--v77" htmlFor="add-veto-unite">
            UNITÉ <span className="req">requis</span>
          </label>
          <input
            id="add-veto-unite"
            type="text"
            list="add-veto-unites"
            maxLength={20}
            className={`field__input${unite ? ' mono filled' : ' field__input--ghost'}`}
            aria-label="Unité de mesure"
            aria-required="true"
            aria-invalid={!!errors.unite}
            placeholder="mL"
            value={unite}
            onChange={e => setUnite(e.target.value)}
            disabled={saving}
            autoComplete="off"
          />
          <FieldError message={errors.unite} />
        </div>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-veto-seuil">
          SEUIL ALERTE <span className="hint">défaut 5</span>
        </label>
        <input
          id="add-veto-seuil"
          type="text"
          inputMode="decimal"
          className={`field__input mono${seuilAlerte ? ' filled' : ' field__input--ghost'}`}
          aria-label="Seuil d'alerte stock bas"
          aria-invalid={!!errors.seuilAlerte}
          placeholder="5"
          value={seuilAlerte}
          onChange={e => setSeuilAlerte(e.target.value.replace(/[^\d.,]/g, ''))}
          disabled={saving}
        />
        <FieldError message={errors.seuilAlerte} />
        {!errors.seuilAlerte && previewStatut ? (
          <p
            aria-live="polite"
            style={{ marginTop: 4, fontFamily: 'var(--pt-font-mono)', fontSize: 10, color: 'var(--pt-subtle)' }}
          >
            Statut calculé · <span className={previewTone}>{previewStatut}</span>
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="add-veto-notes">
          NOTES <span className="hint">optionnel · {notes.length}/200</span>
        </label>
        <textarea
          id="add-veto-notes"
          maxLength={200}
          rows={3}
          className={`field__input${notes ? ' filled' : ' field__input--ghost'}`}
          aria-label="Notes sur le produit"
          placeholder="Posologie, précautions, fournisseur…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
      </div>
    </QuickActionSheet>
  );
};

export default QuickAddVetoForm;
