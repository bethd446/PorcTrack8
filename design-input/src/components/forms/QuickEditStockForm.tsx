/**
 * QuickEditStockForm · Édition admin d'un stock (aliment OU véto)
 * ════════════════════════════════════════════════════════════════════════
 * Distinct de QuickRefillForm :
 *   - QuickRefillForm AJOUTE une quantité (flow porcher / réception).
 *   - QuickEditStockForm CORRIGE les infos (flow admin — rattrapage).
 *
 * Sections :
 *   • Identité : libelle (aliment) OU produit + type + usage (véto)
 *   • Stock    : stockActuel, unite, seuilAlerte
 *   • Statut   : OK / BAS / RUPTURE (+ bouton Recalculer)
 *   • Notes    : textarea max 200 chars
 *
 * Conforme FORM_CONTRACT : shell `<QuickActionSheet>`, `<form onSubmit>`,
 * toast canonique `useToast()`, validation `validateStockEdit` →
 * `{ ok, errors, patch }` + `<FieldError>`, reset-on-open `lastOpenKey`,
 * garde double-clic `closeTimerRef` + cleanup.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import {
  updateProduitAliment,
  updateProduitVeto,
  resolveProduitAlimentByCode,
  resolveProduitVetoByCode,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import type { StockAliment, StockVeto } from '../../types/farm';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import {
  recomputeStatut,
  stockLabelFor,
  toStockEditInput,
  validateStockEdit,
  type EditableStatut,
  type StockEditErrors,
  type StockKind,
} from './quickEditStockLogic';

const UNITE_SUGGESTIONS = ['kg', 'mL', 'doses', 'sacs', 'unités'];

interface QuickEditStockFormProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: StockAliment | StockVeto;
  kind: StockKind;
  onSuccess?: () => void;
}

const QuickEditStockForm: React.FC<QuickEditStockFormProps> = ({
  isOpen,
  onClose,
  stockItem,
  kind,
  onSuccess,
}) => {
  const { refreshData } = useFarm();
  const { showToast } = useToast();

  // ── State form ───────────────────────────────────────────────────────────
  const initial = useMemo(
    () => toStockEditInput(stockItem, kind),
    [stockItem, kind],
  );

  const [libelle, setLibelle] = useState<string>(initial.libelle ?? '');
  const [produit, setProduit] = useState<string>(initial.produit ?? '');
  const [typeVeto, setTypeVeto] = useState<string>(initial.type ?? '');
  const [usageVeto, setUsageVeto] = useState<string>(initial.usage ?? '');
  const [stockActuel, setStockActuel] = useState<string>(initial.stockActuel);
  const [unite, setUnite] = useState<string>(initial.unite);
  const [seuilAlerte, setSeuilAlerte] = useState<string>(initial.seuilAlerte);
  const [statut, setStatut] = useState<EditableStatut>(initial.statut);
  const [notes, setNotes] = useState<string>(initial.notes);

  const [errors, setErrors] = useState<StockEditErrors>({});
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; itemId: string }>({
    isOpen,
    itemId: stockItem.id,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.itemId !== stockItem.id) {
    setLastOpenKey({ isOpen, itemId: stockItem.id });
    if (isOpen) {
      setLibelle(initial.libelle ?? '');
      setProduit(initial.produit ?? '');
      setTypeVeto(initial.type ?? '');
      setUsageVeto(initial.usage ?? '');
      setStockActuel(initial.stockActuel);
      setUnite(initial.unite);
      setSeuilAlerte(initial.seuilAlerte);
      setStatut(initial.statut);
      setNotes(initial.notes);
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

  // Recalcule le statut depuis stockActuel + seuilAlerte courants
  const handleRecalculer = useCallback((): void => {
    const stockNum = Number(String(stockActuel).replace(',', '.'));
    const seuilNum = Number(String(seuilAlerte).replace(',', '.'));
    const next = recomputeStatut(
      Number.isFinite(stockNum) ? stockNum : 0,
      Number.isFinite(seuilNum) ? seuilNum : 0,
    );
    setStatut(next);
  }, [stockActuel, seuilAlerte]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateStockEdit({
      kind,
      libelle,
      produit,
      type: typeVeto,
      usage: usageVeto,
      stockActuel,
      unite,
      seuilAlerte,
      statut,
      notes,
    });
    if (!result.ok || !result.patch || !result.sheetName) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const p = result.patch as Record<string, unknown>;
      if (kind === 'ALIMENT') {
        const id = await resolveProduitAlimentByCode(stockItem.id);
        if (id) {
          await updateProduitAliment(id, {
            libelle: p.LIBELLE as string,
            stock_actuel: p.STOCK_ACTUEL as number,
            unite: p.UNITE as string,
            seuil_alerte: p.SEUIL_ALERTE as number,
            en_alerte: p.STATUT_STOCK !== 'OK',
            notes: (p.NOTES as string) || null,
          });
        }
      } else {
        const id = await resolveProduitVetoByCode(stockItem.id);
        if (id) {
          await updateProduitVeto(id, {
            libelle: p.PRODUIT as string,
            type: (p.TYPE as string) || null,
            usage: (p.USAGE as string) || null,
            stock_actuel: p.STOCK_ACTUEL as number,
            unite: p.UNITE as string,
            stock_min: p.SEUIL_ALERTE as number,
            alerte_stock_bas: p.STATUT_STOCK !== 'OK',
            notes: (p.NOTES as string) || null,
          });
        }
      }
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      showToast(
        online ? 'Stock mis à jour' : 'Modifications en file · sync auto',
        online ? 'success' : 'info',
      );
      try {
        await refreshData(true);
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
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement local',
        'error',
        4000,
      );
      setSaving(false);
    }
  };

  const displayLabel = stockLabelFor(stockItem, kind);
  const title = `Éditer · ${displayLabel || stockItem.id}`;

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow={kind === 'ALIMENT' ? 'Éditer aliment' : 'Éditer produit véto'}
      title={title}
      ariaLabel={`Édition stock ${kind === 'ALIMENT' ? 'aliment' : 'vétérinaire'}`}
      saving={saving}
      isValid
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      submitAriaLabel="Enregistrer les modifications du stock"
    >
      {/* ── Section Identité ─────────────────────────────────────── */}
      {kind === 'ALIMENT' ? (
        <div className="field">
          <label className="label--v77" htmlFor="edit-stock-libelle">
            LIBELLÉ <span className="req">requis</span>
          </label>
          <input
            id="edit-stock-libelle"
            ref={firstFieldRef}
            className={`field__input${libelle ? ' filled' : ' field__input--ghost'}`}
            type="text"
            maxLength={60}
            aria-label="Libellé de l'aliment"
            aria-required="true"
            aria-invalid={!!errors.libelle}
            placeholder="Ex: Truie gestation"
            value={libelle}
            onChange={e => setLibelle(e.target.value)}
            disabled={saving}
            autoComplete="off"
          />
          <FieldError message={errors.libelle} />
        </div>
      ) : (
        <>
          <div className="field">
            <label className="label--v77" htmlFor="edit-stock-produit">
              PRODUIT <span className="req">requis</span>
            </label>
            <input
              id="edit-stock-produit"
              ref={firstFieldRef}
              className={`field__input${produit ? ' filled' : ' field__input--ghost'}`}
              type="text"
              maxLength={60}
              aria-label="Nom du produit vétérinaire"
              aria-required="true"
              aria-invalid={!!errors.produit}
              placeholder="Ex: Ivermectine"
              value={produit}
              onChange={e => setProduit(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            <FieldError message={errors.produit} />
          </div>

          <div className="field--inline">
            <div className="field">
              <label className="label--v77" htmlFor="edit-stock-type">
                TYPE <span className="hint">optionnel</span>
              </label>
              <input
                id="edit-stock-type"
                className={`field__input${typeVeto ? ' filled' : ' field__input--ghost'}`}
                type="text"
                maxLength={60}
                aria-label="Type (catégorie) du produit"
                aria-invalid={!!errors.type}
                placeholder="Ex: Antibiotique"
                value={typeVeto}
                onChange={e => setTypeVeto(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <FieldError message={errors.type} />
            </div>
            <div className="field">
              <label className="label--v77" htmlFor="edit-stock-usage">
                USAGE <span className="hint">optionnel</span>
              </label>
              <input
                id="edit-stock-usage"
                className={`field__input${usageVeto ? ' filled' : ' field__input--ghost'}`}
                type="text"
                maxLength={60}
                aria-label="Usage du produit"
                aria-invalid={!!errors.usage}
                placeholder="Ex: Prévention"
                value={usageVeto}
                onChange={e => setUsageVeto(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <FieldError message={errors.usage} />
            </div>
          </div>
        </>
      )}

      {/* ── Section Stock ───────────────────────────────────────── */}
      <div className="field--inline">
        <div className="field">
          <label className="label--v77" htmlFor="edit-stock-actuel">
            STOCK ACTUEL <span className="req">requis</span>
          </label>
          <input
            id="edit-stock-actuel"
            className={`field__input mono${stockActuel ? ' filled' : ' field__input--ghost'}`}
            type="number"
            inputMode="decimal"
            min={0}
            max={9999}
            step={0.1}
            aria-label="Stock actuel"
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
          <label className="label--v77" htmlFor="edit-stock-unite">
            UNITÉ <span className="req">requis</span>
          </label>
          <input
            id="edit-stock-unite"
            className={`field__input${unite ? ' filled' : ' field__input--ghost'}`}
            type="text"
            list="edit-stock-unite-suggestions"
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
          <datalist id="edit-stock-unite-suggestions">
            {UNITE_SUGGESTIONS.map(u => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <FieldError message={errors.unite} />
        </div>
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="edit-stock-seuil">
          SEUIL D'ALERTE <span className="req">requis</span>
        </label>
        <input
          id="edit-stock-seuil"
          className={`field__input mono${seuilAlerte ? ' filled' : ' field__input--ghost'}`}
          type="number"
          inputMode="decimal"
          min={0}
          max={9999}
          step={0.1}
          aria-label="Seuil d'alerte"
          aria-required="true"
          aria-invalid={!!errors.seuilAlerte}
          placeholder="0"
          value={seuilAlerte}
          onChange={e => setSeuilAlerte(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.seuilAlerte} />
        {!errors.seuilAlerte ? (
          <span className="hint">Stock ≤ ce seuil › statut BAS</span>
        ) : null}
      </div>

      {/* ── Section Statut ──────────────────────────────────────── */}
      <div className="field">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label className="label--v77" htmlFor="edit-stock-statut">
            STATUT · {statut}
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleRecalculer}
            disabled={saving}
            aria-label="Recalculer le statut depuis stock actuel et seuil"
          >
            <RefreshCw size={12} aria-hidden="true" /> Recalculer
          </button>
        </div>
        <select
          id="edit-stock-statut"
          className={`field__input${statut ? ' filled' : ''}`}
          aria-label="Statut du stock"
          aria-invalid={!!errors.statut}
          value={statut}
          onChange={e => setStatut(e.target.value as EditableStatut)}
          disabled={saving}
        >
          <option value="OK">OK</option>
          <option value="BAS">BAS</option>
          <option value="RUPTURE">RUPTURE</option>
        </select>
        <FieldError message={errors.statut} />
      </div>

      {/* ── Section Notes ───────────────────────────────────────── */}
      <div className="field">
        <label className="label--v77" htmlFor="edit-stock-notes">
          NOTES <span className="hint">optionnel · {notes.length}/200</span>
        </label>
        <textarea
          id="edit-stock-notes"
          className={`field__input${notes ? ' filled' : ' field__input--ghost'}`}
          maxLength={200}
          rows={3}
          aria-label="Notes libres"
          aria-invalid={!!errors.notes}
          placeholder="Lot, fournisseur, observations…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.notes} />
      </div>
    </QuickActionSheet>
  );
};

export default QuickEditStockForm;
