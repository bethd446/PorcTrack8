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
 * - Validation :
 *     · produit non vide (trim, max 80)
 *     · unité non vide (trim)
 *     · stockActuel ≥ 0
 *     · seuilAlerte ≥ 0
 * - Toast online/offline + refreshData() au succès
 *
 * Compagnon tests : QuickAddVetoForm.test.tsx
 *
 * Exports nommés (testés unitairement, logique pure) :
 *   - suggestNextVetoId()
 *   - validateAddVeto()
 *   - buildAddVetoRow()
 *   - TYPE_SUGGESTIONS / USAGE_SUGGESTIONS / UNITE_SUGGESTIONS
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueAppendRow, type SheetCell } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import type { StockVeto } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import { recomputeStatut } from './quickRefillLogic';

// ─── Constantes (suggestions datalist) ───────────────────────────────────────

export const TYPE_SUGGESTIONS: ReadonlyArray<string> = [
  'Antiparasitaire',
  'Antibiotique',
  'Vaccin',
  'Vitamine',
  'Hormone',
  'Désinfectant',
];

export const USAGE_SUGGESTIONS: ReadonlyArray<string> = [
  'Prévention',
  'Traitement',
  'Curatif',
  'Maintenance',
];

export const UNITE_SUGGESTIONS: ReadonlyArray<string> = [
  'mL',
  'doses',
  'unités',
  'flacons',
  'sachets',
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AddVetoDraft {
  id: string;
  produit: string;
  type: string;
  usage: string;
  stockActuel: string;
  unite: string;
  seuilAlerte: string;
  notes: string;
}

export interface AddVetoValidation {
  ok: boolean;
  errors: {
    id?: string;
    produit?: string;
    unite?: string;
    stockActuel?: string;
    seuilAlerte?: string;
  };
  row?: SheetCell[];
}

// ─── Pure helpers (testés unitairement) ──────────────────────────────────────

/**
 * Suggère un nouvel ID véto sous forme `V<NN>` à partir de la liste existante.
 * - Extrait la partie numérique (V03 → 3, VET-12 → 12, 7 → 7)
 * - Prend le max + 1
 * - Fallback "V01" si aucun produit existant ou parse échoue
 */
export function suggestNextVetoId(vetos: ReadonlyArray<Pick<StockVeto, 'id'>>): string {
  let maxN = 0;
  for (const v of vetos) {
    const m = String(v.id ?? '').match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  const next = maxN > 0 ? maxN + 1 : 1;
  return `V${String(next).padStart(2, '0')}`;
}

/** Parse un nombre non-négatif (accepte virgule décimale FR). */
function parseNonNegative(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Validation + construction de la ligne Sheets.
 *
 * Règles :
 *   - id : non vide après trim (format libre, "V01" suggéré par défaut)
 *   - produit : non vide après trim (max 80 via maxLength input)
 *   - unite : non vide après trim
 *   - stockActuel : ≥ 0 (finite)
 *   - seuilAlerte : ≥ 0 (finite, défaut 5 côté UI)
 *
 * Colonnes renvoyées (ordre canonique STOCK_VETO, cf. mapStockVeto) :
 *   [ID, PRODUIT, TYPE, USAGE, STOCK_ACTUEL, UNITE, SEUIL_ALERTE,
 *    STATUT, NOTES]
 *
 * STATUT est auto-calculé via `recomputeStatut(stockActuel, seuilAlerte)`.
 */
export function validateAddVeto(draft: AddVetoDraft): AddVetoValidation {
  const errors: AddVetoValidation['errors'] = {};

  const id = String(draft.id ?? '').trim().toUpperCase();
  if (!id) errors.id = 'ID requis';

  const produit = String(draft.produit ?? '').trim();
  if (!produit) errors.produit = 'Produit requis';

  const unite = String(draft.unite ?? '').trim();
  if (!unite) errors.unite = 'Unité requise';

  const stockActuel = parseNonNegative(draft.stockActuel);
  if (stockActuel === null) {
    errors.stockActuel = 'Stock ≥ 0 requis';
  }

  const seuilAlerte = parseNonNegative(draft.seuilAlerte);
  if (seuilAlerte === null) {
    errors.seuilAlerte = 'Seuil ≥ 0 requis';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const stockNum = stockActuel as number;
  const seuilNum = seuilAlerte as number;
  const type = String(draft.type ?? '').trim();
  const usage = String(draft.usage ?? '').trim();
  const notes = String(draft.notes ?? '').trim();
  const statut = recomputeStatut(stockNum, seuilNum);

  const row: SheetCell[] = [
    id,          // ID
    produit,     // PRODUIT / LIBELLÉ
    type,        // TYPE
    usage,       // USAGE
    stockNum,    // STOCK_ACTUEL
    unite,       // UNITE
    seuilNum,    // SEUIL_ALERTE
    statut,      // STATUT (auto)
    notes,       // NOTES
  ];

  return { ok: true, errors: {}, row };
}

/** Helper pour tests : construit la row si la validation passe, sinon null. */
export function buildAddVetoRow(draft: AddVetoDraft): SheetCell[] | null {
  const v = validateAddVeto(draft);
  return v.row ?? null;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export interface QuickAddVetoFormProps {
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
  const [toast, setToast] = useState<string>('');

  // Reset à l'ouverture + re-calcule l'ID auto-suggéré
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, suggestedId]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc ferme + focus auto sur premier champ
  useEscapeKey(isOpen && !saving, handleClose);
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
      await enqueueAppendRow('STOCK_VETO', result.row);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(online ? 'Produit ajouté' : 'Produit en file · sync auto');
      try {
        await refreshData();
      } catch {
        /* non-bloquant : queue offline applique déjà */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement');
    } finally {
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

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Nouveau produit véto"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création d'un nouveau produit vétérinaire"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
              Ajouter un produit à la pharmacie
            </p>
          </div>

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

          {/* ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-veto-id"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              ID <span className="text-text-2 normal-case">· auto-suggéré</span>
            </label>
            <input
              id="add-veto-id"
              ref={firstFieldRef}
              type="text"
              maxLength={10}
              autoCapitalize="characters"
              aria-label="Identifiant du produit vétérinaire"
              aria-required="true"
              aria-invalid={!!errors.id}
              aria-describedby={errors.id ? 'add-veto-id-error' : 'add-veto-id-hint'}
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
              <p id="add-veto-id-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.id}
              </p>
            ) : (
              <p id="add-veto-id-hint" className="font-mono text-[10px] text-text-2">
                Format V suivi de chiffres (ex: V01)
              </p>
            )}
          </div>

          {/* Produit */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-veto-produit"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Produit <span className="text-red normal-case">· obligatoire</span>
            </label>
            <input
              id="add-veto-produit"
              type="text"
              maxLength={80}
              aria-label="Nom du produit vétérinaire"
              aria-required="true"
              aria-invalid={!!errors.produit}
              aria-describedby={errors.produit ? 'add-veto-produit-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.produit ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: Ivermectine 1%"
              value={produit}
              onChange={e => setProduit(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            {errors.produit ? (
              <p id="add-veto-produit-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.produit}
              </p>
            ) : null}
          </div>

          {/* Type + Usage (grid 2-col) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="add-veto-type"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Type
              </label>
              <input
                id="add-veto-type"
                type="text"
                list="add-veto-types"
                maxLength={40}
                aria-label="Type de produit vétérinaire"
                className="w-full h-11 rounded-md px-3 bg-bg-0 border border-border hover:border-text-2 text-text-0 placeholder:text-text-2 font-mono text-[13px] outline-none transition-colors duration-[160ms] focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="Antiparasitaire"
                value={type}
                onChange={e => setType(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="add-veto-usage"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Usage
              </label>
              <input
                id="add-veto-usage"
                type="text"
                list="add-veto-usages"
                maxLength={40}
                aria-label="Usage du produit vétérinaire"
                className="w-full h-11 rounded-md px-3 bg-bg-0 border border-border hover:border-text-2 text-text-0 placeholder:text-text-2 font-mono text-[13px] outline-none transition-colors duration-[160ms] focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="Prévention"
                value={usage}
                onChange={e => setUsage(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Stock initial + Unité (grid) */}
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="add-veto-stock"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Stock initial
              </label>
              <input
                id="add-veto-stock"
                type="text"
                inputMode="decimal"
                aria-label="Stock initial"
                aria-required="true"
                aria-invalid={!!errors.stockActuel}
                aria-describedby={errors.stockActuel ? 'add-veto-stock-error' : undefined}
                className={[
                  'w-full h-14 rounded-md px-4',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[20px] tabular-nums text-center',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.stockActuel ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0"
                value={stockActuel}
                onChange={e => setStockActuel(e.target.value.replace(/[^\d.,]/g, ''))}
                disabled={saving}
              />
              {errors.stockActuel ? (
                <p id="add-veto-stock-error" role="alert" className="font-mono text-[11px] text-red">
                  {errors.stockActuel}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="add-veto-unite"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Unité
              </label>
              <input
                id="add-veto-unite"
                type="text"
                list="add-veto-unites"
                maxLength={20}
                aria-label="Unité de mesure"
                aria-required="true"
                aria-invalid={!!errors.unite}
                aria-describedby={errors.unite ? 'add-veto-unite-error' : undefined}
                className={[
                  'w-full h-14 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[14px] uppercase tracking-wide text-center',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.unite ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="mL"
                value={unite}
                onChange={e => setUnite(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              {errors.unite ? (
                <p id="add-veto-unite-error" role="alert" className="font-mono text-[11px] text-red">
                  {errors.unite}
                </p>
              ) : null}
            </div>
          </div>

          {/* Seuil alerte */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-veto-seuil"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Seuil alerte <span className="text-text-2 normal-case">· défaut 5</span>
            </label>
            <input
              id="add-veto-seuil"
              type="text"
              inputMode="decimal"
              aria-label="Seuil d'alerte stock bas"
              aria-invalid={!!errors.seuilAlerte}
              aria-describedby={
                errors.seuilAlerte ? 'add-veto-seuil-error' : 'add-veto-seuil-hint'
              }
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[14px] tabular-nums',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.seuilAlerte ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="5"
              value={seuilAlerte}
              onChange={e => setSeuilAlerte(e.target.value.replace(/[^\d.,]/g, ''))}
              disabled={saving}
            />
            {errors.seuilAlerte ? (
              <p id="add-veto-seuil-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.seuilAlerte}
              </p>
            ) : previewStatut ? (
              <p
                id="add-veto-seuil-hint"
                aria-live="polite"
                className="font-mono text-[10px] text-text-2"
              >
                Statut calculé · <span className={previewTone}>{previewStatut}</span>
              </p>
            ) : (
              <p id="add-veto-seuil-hint" className="font-mono text-[10px] text-text-2">
                Notification stock bas si stock ≤ seuil
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-veto-notes"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="add-veto-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes sur le produit"
              className="w-full rounded-md px-3 py-2 bg-bg-0 border border-border hover:border-text-2 text-text-0 placeholder:text-text-2 font-mono text-[13px] outline-none transition-colors duration-[160ms] focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              placeholder="Posologie, précautions, fournisseur…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
            <p className="font-mono text-[10px] text-text-2 tabular-nums text-right">
              {notes.length}/200
            </p>
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
              aria-label="Ajouter le produit à la pharmacie"
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

export default QuickAddVetoForm;
