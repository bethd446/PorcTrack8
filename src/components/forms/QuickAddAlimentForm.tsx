/**
 * QuickAddAlimentForm — Création rapide d'un nouvel aliment au catalogue
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : champs rapides pour enregistrer une nouvelle matière / aliment
 * dans `STOCK_ALIMENTS`. Submit → `enqueueAppendRow('STOCK_ALIMENTS', [...])`
 * avec l'ordre canonique des colonnes (cf. `mapStockAliment` dans
 * `src/mappers/index.ts`) :
 *
 *   ID · LIBELLE · STOCK_ACTUEL · UNITE · SEUIL_ALERTE · STATUT · NOTES
 *
 * - ID auto-suggéré = "A" + max(id numérique existant) + 1 (fallback "A01")
 * - Validation :
 *     · id format /^A\d+$/i (insensible casse)
 *     · libelle non vide, max 60
 *     · stockActuel >= 0 (nombre fini)
 *     · unite non vide
 *     · seuilAlerte >= 0 (nombre fini)
 *     · notes max 200
 * - Statut auto-calculé via `recomputeStatut(stockActuel, seuilAlerte)` :
 *     · stock <= 0 → RUPTURE
 *     · 0 < stock <= seuilAlerte → BAS
 *     · sinon → OK
 * - Toast online/offline + refreshData() au succès
 *
 * Compagnon tests : QuickAddAlimentForm.test.tsx
 *
 * Exports nommés (logique pure, testable sans React) :
 *   - validateAddAliment()
 *   - buildAddAlimentRow()
 *   - suggestNextAlimentId()
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueAppendRow, type SheetCell } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { StockAliment, StockStatut } from '../../types/farm';
import { recomputeStatut } from './quickRefillLogic';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

// ─── Types ───────────────────────────────────────────────────────────────────

export const UNITE_SUGGESTIONS: ReadonlyArray<string> = [
  'kg',
  'sac',
  'tonne',
];

export interface AddAlimentDraft {
  id: string;
  libelle: string;
  stockActuel: string;
  unite: string;
  seuilAlerte: string;
  notes: string;
}

export interface AddAlimentValidation {
  ok: boolean;
  errors: {
    id?: string;
    libelle?: string;
    stockActuel?: string;
    unite?: string;
    seuilAlerte?: string;
    notes?: string;
  };
  row?: SheetCell[];
  statut?: StockStatut;
}

// ─── Pure helpers (testés unitairement) ──────────────────────────────────────

/**
 * Suggère un nouvel ID aliment sous forme `A<nn>` à partir de la liste existante.
 * - Extrait la partie numérique (A05 → 5, ALIM-12 → 12, A-17 → 17)
 * - Prend le max + 1
 * - Fallback "A01" si aucun aliment existant ou parse échoue
 */
export function suggestNextAlimentId(
  aliments: ReadonlyArray<Pick<StockAliment, 'id'>>,
): string {
  let maxN = 0;
  for (const a of aliments) {
    const m = String(a.id ?? '').match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  const next = maxN > 0 ? maxN + 1 : 1;
  return `A${String(next).padStart(2, '0')}`;
}

/** Parse une valeur numérique (accepte virgule décimale FR). */
function parseNum(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validation + construction de la ligne Sheets.
 *
 * Règles :
 *   - id : /^A\d+$/i (après trim + upper)
 *   - libelle : non vide après trim, max 60
 *   - stockActuel : nombre fini >= 0
 *   - unite : non vide après trim
 *   - seuilAlerte : nombre fini >= 0
 *   - notes : max 200 caractères
 *
 * Colonnes renvoyées (ordre canonique STOCK_ALIMENTS) :
 *   [ID, LIBELLE, STOCK_ACTUEL, UNITE, SEUIL_ALERTE, STATUT, NOTES]
 *
 * Statut auto-calculé :
 *   - stock <= 0 → RUPTURE
 *   - 0 < stock <= seuilAlerte → BAS (si seuilAlerte > 0)
 *   - sinon → OK
 */
export function validateAddAliment(
  draft: AddAlimentDraft,
): AddAlimentValidation {
  const errors: AddAlimentValidation['errors'] = {};

  const id = String(draft.id ?? '').trim().toUpperCase();
  if (!id) {
    errors.id = 'ID requis';
  } else if (!/^A\d+$/.test(id)) {
    errors.id = 'Format invalide (ex: A01)';
  }

  const libelle = String(draft.libelle ?? '').trim();
  if (!libelle) {
    errors.libelle = 'Libellé requis';
  } else if (libelle.length > 60) {
    errors.libelle = 'Libellé trop long (max 60)';
  }

  const stockActuel = parseNum(draft.stockActuel);
  if (stockActuel === null) {
    errors.stockActuel = 'Stock requis';
  } else if (stockActuel < 0) {
    errors.stockActuel = 'Stock doit être ≥ 0';
  }

  const unite = String(draft.unite ?? '').trim();
  if (!unite) {
    errors.unite = 'Unité requise';
  }

  const seuilAlerte = parseNum(draft.seuilAlerte);
  if (seuilAlerte === null) {
    errors.seuilAlerte = 'Seuil requis';
  } else if (seuilAlerte < 0) {
    errors.seuilAlerte = 'Seuil doit être ≥ 0';
  }

  const notes = String(draft.notes ?? '').trim();
  if (notes.length > 200) {
    errors.notes = 'Notes trop longues (max 200)';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const stockRounded = Math.round((stockActuel as number) * 10) / 10;
  const seuilRounded = Math.round((seuilAlerte as number) * 10) / 10;
  const statut = recomputeStatut(stockRounded, seuilRounded);

  const row: SheetCell[] = [
    id,             // ID
    libelle,        // LIBELLE
    stockRounded,   // STOCK_ACTUEL
    unite,          // UNITE
    seuilRounded,   // SEUIL_ALERTE
    statut,         // STATUT
    notes,          // NOTES
  ];

  return { ok: true, errors: {}, row, statut };
}

/**
 * Helper exposé pour les tests : construit la row uniquement (sans valider).
 */
export function buildAddAlimentRow(draft: AddAlimentDraft): SheetCell[] | null {
  const v = validateAddAliment(draft);
  return v.row ?? null;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export interface QuickAddAlimentFormProps {
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
  const [toast, setToast] = useState<string>('');

  // Reset à l'ouverture (et re-calcule l'ID auto-suggéré)
  useEffect(() => {
    if (!isOpen) return;
    setId(suggestedId);
    setLibelle('');
    setStockActuel('0');
    setUnite('kg');
    setSeuilAlerte('50');
    setNotes('');
    setErrors({});
    setSaving(false);
  }, [isOpen, suggestedId]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc ferme + focus auto
  useEscapeKey(isOpen && !saving, handleClose);
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
      await enqueueAppendRow('STOCK_ALIMENTS', result.row);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(
        online ? 'Aliment ajouté' : 'Aliment en file · sync auto',
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
          : 'Erreur enregistrement',
      );
    } finally {
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
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Nouvel aliment"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création d'un nouvel aliment"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
              Ajouter un aliment au catalogue
            </p>
          </div>

          {/* ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-aliment-id"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              ID <span className="text-text-2 normal-case">· auto-suggéré</span>
            </label>
            <input
              id="add-aliment-id"
              ref={firstFieldRef}
              type="text"
              maxLength={10}
              autoCapitalize="characters"
              aria-label="Identifiant de l'aliment"
              aria-required="true"
              aria-invalid={!!errors.id}
              aria-describedby={
                errors.id ? 'add-aliment-id-error' : 'add-aliment-id-hint'
              }
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] uppercase tabular-nums',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.id ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="A01"
              value={id}
              onChange={e => setId(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.id ? (
              <p
                id="add-aliment-id-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.id}
              </p>
            ) : (
              <p
                id="add-aliment-id-hint"
                className="font-mono text-[10px] text-text-2"
              >
                Format A suivi de chiffres (ex: A01)
              </p>
            )}
          </div>

          {/* Libellé */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-aliment-libelle"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Libellé <span className="text-red normal-case">· obligatoire</span>
            </label>
            <input
              id="add-aliment-libelle"
              type="text"
              maxLength={60}
              aria-label="Libellé de l'aliment"
              aria-required="true"
              aria-invalid={!!errors.libelle}
              aria-describedby={
                errors.libelle ? 'add-aliment-libelle-error' : undefined
              }
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-sans text-[14px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.libelle
                  ? 'border-red'
                  : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: Maïs grain"
              value={libelle}
              onChange={e => setLibelle(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.libelle ? (
              <p
                id="add-aliment-libelle-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.libelle}
              </p>
            ) : null}
          </div>

          {/* Stock initial + Unité (2 colonnes) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="add-aliment-stock"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Stock initial
              </label>
              <input
                id="add-aliment-stock"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                aria-label="Stock initial"
                aria-required="true"
                aria-invalid={!!errors.stockActuel}
                aria-describedby={
                  errors.stockActuel ? 'add-aliment-stock-error' : undefined
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[16px] tabular-nums',
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
                  id="add-aliment-stock-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.stockActuel}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="add-aliment-unite"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Unité
              </label>
              <input
                id="add-aliment-unite"
                type="text"
                list="add-aliment-unite-list"
                maxLength={20}
                aria-label="Unité de mesure"
                aria-required="true"
                aria-invalid={!!errors.unite}
                aria-describedby={
                  errors.unite ? 'add-aliment-unite-error' : undefined
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[14px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.unite
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
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
              {errors.unite ? (
                <p
                  id="add-aliment-unite-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.unite}
                </p>
              ) : null}
            </div>
          </div>

          {/* Seuil alerte */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-aliment-seuil"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Seuil alerte
            </label>
            <input
              id="add-aliment-seuil"
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              aria-label="Seuil d'alerte stock bas"
              aria-required="true"
              aria-invalid={!!errors.seuilAlerte}
              aria-describedby={
                errors.seuilAlerte
                  ? 'add-aliment-seuil-error'
                  : 'add-aliment-seuil-hint'
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
              placeholder="50"
              value={seuilAlerte}
              onChange={e => setSeuilAlerte(e.target.value)}
              disabled={saving}
            />
            {errors.seuilAlerte ? (
              <p
                id="add-aliment-seuil-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.seuilAlerte}
              </p>
            ) : (
              <p
                id="add-aliment-seuil-hint"
                className="font-mono text-[10px] text-text-2"
              >
                Statut auto-calculé :{' '}
                {previewStatut ? (
                  <span className="uppercase tracking-wide">
                    {previewStatut}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-aliment-notes"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="add-aliment-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes libres"
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'add-aliment-notes-error' : undefined
              }
              className={[
                'w-full rounded-md px-3 py-2',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-sans text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.notes
                  ? 'border-red'
                  : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Fournisseur, calibre, observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
            {errors.notes ? (
              <p
                id="add-aliment-notes-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.notes}
              </p>
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
              aria-label="Ajouter l'aliment au catalogue"
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

export default QuickAddAlimentForm;
