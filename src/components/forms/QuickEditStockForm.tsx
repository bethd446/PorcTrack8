import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save, RefreshCw } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { StockAliment, StockVeto } from '../../types/farm';
import {
  recomputeStatut,
  stockLabelFor,
  toStockEditInput,
  validateStockEdit,
  type EditableStatut,
  type StockEditErrors,
  type StockKind,
} from './quickEditStockLogic';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditStockForm · Édition admin d'un stock (aliment OU véto)
   ─────────────────────────────────────────────────────────────────────────
   Distinct de QuickRefillForm :
     - QuickRefillForm AJOUTE une quantité (flow porcher / réception).
     - QuickEditStockForm CORRIGE les infos (flow admin — rattrapage).

   Sections :
     • Identité         : libelle (aliment) OU produit + type + usage (véto)
     • Stock            : stockActuel, unite, seuilAlerte
     • Statut           : OK / BAS / RUPTURE (+ bouton Recalculer)
     • Notes            : textarea max 200 chars
   ═════════════════════════════════════════════════════════════════════════ */

// Ré-exports pour tests & intégration
export {
  recomputeStatut,
  stockLabelFor,
  toStockEditInput,
  validateStockEdit,
} from './quickEditStockLogic';
export type {
  EditableStatut,
  StockEditErrors,
  StockEditInput,
  StockEditValidation,
  StockKind,
} from './quickEditStockLogic';

const UNITE_SUGGESTIONS = ['kg', 'mL', 'doses', 'sacs', 'unités'];

export interface QuickEditStockFormProps {
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
  const [toast, setToast] = useState<string>('');

  // Reset à chaque (re)ouverture avec un nouvel item
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, initial]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc ferme la sheet + focus auto sur 1er champ
  useEscapeKey(isOpen && !saving, handleClose);
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
      await enqueueUpdateRow(
        result.sheetName,
        'ID',
        stockItem.id,
        result.patch,
      );
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(
        online
          ? 'Stock mis à jour'
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

  const displayLabel = stockLabelFor(stockItem, kind);
  const title = `Éditer · ${displayLabel || stockItem.id}`;

  const statutTone =
    statut === 'RUPTURE' ? 'text-red'
      : statut === 'BAS' ? 'text-amber'
        : 'text-accent';

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label={`Édition stock ${kind === 'ALIMENT' ? 'aliment' : 'vétérinaire'}`}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                {kind === 'ALIMENT' ? 'Éditer aliment' : 'Éditer produit véto'}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 tabular-nums mt-0.5 truncate">
                {stockItem.id}
              </p>
            </div>
          </div>

          {/* ── Section Identité ─────────────────────────────────────── */}
          {kind === 'ALIMENT' ? (
            <div className="space-y-1.5">
              <label
                htmlFor="edit-stock-libelle"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Libellé
              </label>
              <input
                id="edit-stock-libelle"
                ref={firstFieldRef}
                type="text"
                maxLength={60}
                aria-label="Libellé de l'aliment"
                aria-required="true"
                aria-invalid={!!errors.libelle}
                aria-describedby={
                  errors.libelle ? 'edit-stock-libelle-error' : undefined
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[14px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.libelle ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="Ex: Truie gestation"
                value={libelle}
                onChange={e => setLibelle(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              {errors.libelle ? (
                <p
                  id="edit-stock-libelle-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.libelle}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-stock-produit"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Produit
                </label>
                <input
                  id="edit-stock-produit"
                  ref={firstFieldRef}
                  type="text"
                  maxLength={60}
                  aria-label="Nom du produit vétérinaire"
                  aria-required="true"
                  aria-invalid={!!errors.produit}
                  aria-describedby={
                    errors.produit ? 'edit-stock-produit-error' : undefined
                  }
                  className={[
                    'w-full h-12 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'font-mono text-[14px]',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.produit ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
                  placeholder="Ex: Ivermectine"
                  value={produit}
                  onChange={e => setProduit(e.target.value)}
                  disabled={saving}
                  autoComplete="off"
                />
                {errors.produit ? (
                  <p
                    id="edit-stock-produit-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.produit}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-stock-type"
                    className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                  >
                    Type <span className="text-text-2 normal-case">· opt.</span>
                  </label>
                  <input
                    id="edit-stock-type"
                    type="text"
                    maxLength={60}
                    aria-label="Type (catégorie) du produit"
                    aria-invalid={!!errors.type}
                    aria-describedby={
                      errors.type ? 'edit-stock-type-error' : undefined
                    }
                    className={[
                      'w-full h-11 rounded-md px-3',
                      'bg-bg-0 border text-text-0 placeholder:text-text-2',
                      'font-mono text-[13px]',
                      'outline-none transition-colors duration-[160ms]',
                      'focus:border-accent focus:ring-1 focus:ring-accent',
                      errors.type ? 'border-red' : 'border-border hover:border-text-2',
                    ].join(' ')}
                    placeholder="Ex: Antibiotique"
                    value={typeVeto}
                    onChange={e => setTypeVeto(e.target.value)}
                    disabled={saving}
                    autoComplete="off"
                  />
                  {errors.type ? (
                    <p
                      id="edit-stock-type-error"
                      role="alert"
                      className="font-mono text-[11px] text-red"
                    >
                      {errors.type}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-stock-usage"
                    className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                  >
                    Usage <span className="text-text-2 normal-case">· opt.</span>
                  </label>
                  <input
                    id="edit-stock-usage"
                    type="text"
                    maxLength={60}
                    aria-label="Usage du produit"
                    aria-invalid={!!errors.usage}
                    aria-describedby={
                      errors.usage ? 'edit-stock-usage-error' : undefined
                    }
                    className={[
                      'w-full h-11 rounded-md px-3',
                      'bg-bg-0 border text-text-0 placeholder:text-text-2',
                      'font-mono text-[13px]',
                      'outline-none transition-colors duration-[160ms]',
                      'focus:border-accent focus:ring-1 focus:ring-accent',
                      errors.usage ? 'border-red' : 'border-border hover:border-text-2',
                    ].join(' ')}
                    placeholder="Ex: Prévention"
                    value={usageVeto}
                    onChange={e => setUsageVeto(e.target.value)}
                    disabled={saving}
                    autoComplete="off"
                  />
                  {errors.usage ? (
                    <p
                      id="edit-stock-usage-error"
                      role="alert"
                      className="font-mono text-[11px] text-red"
                    >
                      {errors.usage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* ── Section Stock ───────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-2">
              Stock
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-stock-actuel"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Stock actuel
                </label>
                <input
                  id="edit-stock-actuel"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={9999}
                  step={0.1}
                  aria-label="Stock actuel"
                  aria-required="true"
                  aria-invalid={!!errors.stockActuel}
                  aria-describedby={
                    errors.stockActuel ? 'edit-stock-actuel-error' : undefined
                  }
                  className={[
                    'w-full h-12 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'font-mono text-[16px] tabular-nums text-center',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.stockActuel
                      ? 'border-red'
                      : 'border-border hover:border-text-2',
                  ].join(' ')}
                  placeholder="0"
                  value={stockActuel}
                  onChange={e => setStockActuel(e.target.value)}
                  disabled={saving}
                />
                {errors.stockActuel ? (
                  <p
                    id="edit-stock-actuel-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.stockActuel}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-stock-unite"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Unité
                </label>
                <input
                  id="edit-stock-unite"
                  type="text"
                  list="edit-stock-unite-suggestions"
                  maxLength={20}
                  aria-label="Unité de mesure"
                  aria-required="true"
                  aria-invalid={!!errors.unite}
                  aria-describedby={
                    errors.unite ? 'edit-stock-unite-error' : undefined
                  }
                  className={[
                    'w-full h-12 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'font-mono text-[14px]',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.unite ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
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
                {errors.unite ? (
                  <p
                    id="edit-stock-unite-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.unite}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-stock-seuil"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Seuil d'alerte
              </label>
              <input
                id="edit-stock-seuil"
                type="number"
                inputMode="decimal"
                min={0}
                max={9999}
                step={0.1}
                aria-label="Seuil d'alerte"
                aria-required="true"
                aria-invalid={!!errors.seuilAlerte}
                aria-describedby={
                  errors.seuilAlerte
                    ? 'edit-stock-seuil-error'
                    : 'edit-stock-seuil-hint'
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[16px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.seuilAlerte
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0"
                value={seuilAlerte}
                onChange={e => setSeuilAlerte(e.target.value)}
                disabled={saving}
              />
              {errors.seuilAlerte ? (
                <p
                  id="edit-stock-seuil-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.seuilAlerte}
                </p>
              ) : (
                <p
                  id="edit-stock-seuil-hint"
                  className="font-mono text-[10px] text-text-2"
                >
                  Stock ≤ ce seuil → statut BAS
                </p>
              )}
            </div>
          </div>

          {/* ── Section Statut ──────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="edit-stock-statut"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Statut · <span className={statutTone}>{statut}</span>
              </label>
              <button
                type="button"
                onClick={handleRecalculer}
                disabled={saving}
                aria-label="Recalculer le statut depuis stock actuel et seuil"
                className={[
                  'pressable inline-flex items-center gap-1.5 h-8 px-3 rounded-md',
                  'bg-bg-1 border border-border text-text-1',
                  'font-mono text-[10px] uppercase tracking-wide',
                  'transition-colors duration-[160ms] hover:border-text-2 hover:text-accent',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  saving ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <RefreshCw size={12} aria-hidden="true" />
                Recalculer
              </button>
            </div>
            <select
              id="edit-stock-statut"
              aria-label="Statut du stock"
              aria-invalid={!!errors.statut}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0',
                'font-mono text-[14px] uppercase tracking-wide',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.statut ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              value={statut}
              onChange={e => setStatut(e.target.value as EditableStatut)}
              disabled={saving}
            >
              <option value="OK">OK</option>
              <option value="BAS">BAS</option>
              <option value="RUPTURE">RUPTURE</option>
            </select>
            {errors.statut ? (
              <p role="alert" className="font-mono text-[11px] text-red">
                {errors.statut}
              </p>
            ) : null}
          </div>

          {/* ── Section Notes ───────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-stock-notes"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="edit-stock-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes libres"
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'edit-stock-notes-error' : 'edit-stock-notes-hint'
              }
              className={[
                'w-full rounded-md px-3 py-2',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[13px] resize-none',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Lot, fournisseur, observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
            <p
              id="edit-stock-notes-hint"
              className="font-mono text-[10px] text-text-2 tabular-nums"
            >
              {notes.length}/200
            </p>
            {errors.notes ? (
              <p
                id="edit-stock-notes-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* ── Actions ─────────────────────────────────────────────── */}
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
              aria-label="Enregistrer les modifications du stock"
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

export default QuickEditStockForm;
