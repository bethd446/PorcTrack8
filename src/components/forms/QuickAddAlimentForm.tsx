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

import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Textarea, Button } from '@/design-system';
import { insertProduitAliment } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import type { StockStatut } from '../../types/farm';
import { recomputeStatut } from './quickRefillLogic';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
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

  // Reset à l'ouverture (render-time sync) — re-calcule l'ID auto-suggéré
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; suggestedId: string }>({
    isOpen,
    suggestedId,
  });
  if (lastKey.isOpen !== isOpen || lastKey.suggestedId !== suggestedId) {
    setLastKey({ isOpen, suggestedId });
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
      setToast(
        online ? 'Aliment ajouté' : 'Aliment en file · sync auto',
      );
      try {
        await refreshData(true); // Force process queue + refresh
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
            <p className="text-mono-label text-text-1">
              Ajouter un aliment au catalogue
            </p>
          </div>

          <FormField
            label="ID"
            hint={errors.id ? undefined : 'Format A suivi de chiffres (ex: A01)'}
            error={errors.id}
          >
            <Input
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
              className="ft-code uppercase"
              placeholder="A01"
              value={id}
              onChange={e => setId(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.id}
            />
          </FormField>

          <FormField label="Libellé" required error={errors.libelle}>
            <Input
              id="add-aliment-libelle"
              type="text"
              maxLength={60}
              aria-label="Libellé de l'aliment"
              aria-required="true"
              aria-invalid={!!errors.libelle}
              aria-describedby={
                errors.libelle ? 'add-aliment-libelle-error' : undefined
              }
              placeholder="Ex: Maïs grain"
              value={libelle}
              onChange={e => setLibelle(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.libelle}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Stock initial" error={errors.stockActuel}>
              <Input
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
                className="font-mono tabular-nums"
                placeholder="0"
                value={stockActuel}
                onChange={e => setStockActuel(e.target.value)}
                disabled={saving}
                invalid={!!errors.stockActuel}
              />
            </FormField>

            <FormField label="Unité" error={errors.unite}>
              <Input
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
                placeholder="kg"
                value={unite}
                onChange={e => setUnite(e.target.value)}
                disabled={saving}
                autoComplete="off"
                invalid={!!errors.unite}
              />
              <datalist id="add-aliment-unite-list">
                {UNITE_SUGGESTIONS.map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </FormField>
          </div>

          <FormField
            label="Seuil alerte"
            hint={
              errors.seuilAlerte
                ? undefined
                : `Statut auto-calculé : ${previewStatut ?? '—'}`
            }
            error={errors.seuilAlerte}
          >
            <Input
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
              className="font-mono tabular-nums"
              placeholder="50"
              value={seuilAlerte}
              onChange={e => setSeuilAlerte(e.target.value)}
              disabled={saving}
              invalid={!!errors.seuilAlerte}
            />
          </FormField>

          <FormField label="Notes" hint="optionnel" error={errors.notes}>
            <Textarea
              id="add-aliment-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes libres"
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'add-aliment-notes-error' : undefined
              }
              placeholder="Fournisseur, calibre, observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button
              variant="secondary"
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
              ariaLabel="Ajouter l'aliment au catalogue"
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
