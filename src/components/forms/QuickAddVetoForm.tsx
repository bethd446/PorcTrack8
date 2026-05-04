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

import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Textarea, Button } from '@/design-system';
import { insertProduitVeto } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
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

  // Render-time sync: reset on (re)open (avoids setState-in-effect cascading renders).
  const [lastOpen, setLastOpen] = useState<boolean>(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
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
      setToast(online ? 'Produit ajouté' : 'Produit en file · sync auto');
      try {
        await refreshData(true);
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
            <p className="text-mono-label text-text-1">
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

          <FormField
            label="ID"
            hint={errors.id ? undefined : 'Format V suivi de chiffres (ex: V01)'}
            error={errors.id}
          >
            <Input
              id="add-veto-id"
              ref={firstFieldRef}
              type="text"
              maxLength={10}
              autoCapitalize="characters"
              aria-label="Identifiant du produit vétérinaire"
              aria-required="true"
              aria-invalid={!!errors.id}
              aria-describedby={errors.id ? 'add-veto-id-error' : 'add-veto-id-hint'}
              className="ft-code uppercase"
              placeholder="V01"
              value={id}
              onChange={e => setId(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.id}
            />
          </FormField>

          <FormField label="Produit" required error={errors.produit}>
            <Input
              id="add-veto-produit"
              type="text"
              maxLength={80}
              aria-label="Nom du produit vétérinaire"
              aria-required="true"
              aria-invalid={!!errors.produit}
              aria-describedby={errors.produit ? 'add-veto-produit-error' : undefined}
              placeholder="Ex: Ivermectine 1%"
              value={produit}
              onChange={e => setProduit(e.target.value)}
              disabled={saving}
              autoComplete="off"
              invalid={!!errors.produit}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Input
                id="add-veto-type"
                type="text"
                list="add-veto-types"
                maxLength={40}
                aria-label="Type de produit vétérinaire"
                placeholder="Antiparasitaire"
                value={type}
                onChange={e => setType(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>
            <FormField label="Usage">
              <Input
                id="add-veto-usage"
                type="text"
                list="add-veto-usages"
                maxLength={40}
                aria-label="Usage du produit vétérinaire"
                placeholder="Prévention"
                value={usage}
                onChange={e => setUsage(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <FormField label="Stock initial" error={errors.stockActuel}>
              <Input
                id="add-veto-stock"
                type="text"
                inputMode="decimal"
                aria-label="Stock initial"
                aria-required="true"
                aria-invalid={!!errors.stockActuel}
                aria-describedby={errors.stockActuel ? 'add-veto-stock-error' : undefined}
                className="font-mono text-[20px] tabular-nums text-center"
                placeholder="0"
                value={stockActuel}
                onChange={e => setStockActuel(e.target.value.replace(/[^\d.,]/g, ''))}
                disabled={saving}
                invalid={!!errors.stockActuel}
              />
            </FormField>

            <FormField label="Unité" error={errors.unite}>
              <Input
                id="add-veto-unite"
                type="text"
                list="add-veto-unites"
                maxLength={20}
                aria-label="Unité de mesure"
                aria-required="true"
                aria-invalid={!!errors.unite}
                aria-describedby={errors.unite ? 'add-veto-unite-error' : undefined}
                className="uppercase tracking-wide text-center"
                placeholder="mL"
                value={unite}
                onChange={e => setUnite(e.target.value)}
                disabled={saving}
                autoComplete="off"
                invalid={!!errors.unite}
              />
            </FormField>
          </div>

          <FormField
            label="Seuil alerte"
            hint={
              errors.seuilAlerte
                ? undefined
                : previewStatut
                ? undefined
                : 'défaut 5 · Notification stock bas si stock ≤ seuil'
            }
            error={errors.seuilAlerte}
          >
            <Input
              id="add-veto-seuil"
              type="text"
              inputMode="decimal"
              aria-label="Seuil d'alerte stock bas"
              aria-invalid={!!errors.seuilAlerte}
              aria-describedby={
                errors.seuilAlerte ? 'add-veto-seuil-error' : 'add-veto-seuil-hint'
              }
              className="tabular-nums"
              placeholder="5"
              value={seuilAlerte}
              onChange={e => setSeuilAlerte(e.target.value.replace(/[^\d.,]/g, ''))}
              disabled={saving}
              invalid={!!errors.seuilAlerte}
            />
            {!errors.seuilAlerte && previewStatut ? (
              <p
                id="add-veto-seuil-hint"
                aria-live="polite"
                className="mt-1 text-[10px] text-text-2"
              >
                Statut calculé · <span className={previewTone}>{previewStatut}</span>
              </p>
            ) : null}
          </FormField>

          <FormField label="Notes" hint={`optionnel · ${notes.length}/200`}>
            <Textarea
              id="add-veto-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes sur le produit"
              placeholder="Posologie, précautions, fournisseur…"
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
              ariaLabel="Ajouter le produit à la pharmacie"
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

export default QuickAddVetoForm;
