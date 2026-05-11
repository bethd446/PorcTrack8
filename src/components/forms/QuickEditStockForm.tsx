import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save, RefreshCw } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button } from '@/design-system';
import {
  updateProduitAliment,
  updateProduitVeto,
  resolveProduitAlimentByCode,
  resolveProduitVetoByCode,
} from '../../services/supabaseWrites';
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

  // Reset à chaque (re)ouverture avec un nouvel item — render-time sync
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; itemId: string }>({
    isOpen,
    itemId: stockItem.id,
  });
  if (lastKey.isOpen !== isOpen || lastKey.itemId !== stockItem.id) {
    setLastKey({ isOpen, itemId: stockItem.id });
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
      setToast(
        online
          ? 'Stock mis à jour'
          : 'Modifications en file · sync auto',
      );
      try {
        await refreshData(true);
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
              <p className="text-mono-label text-text-1">
                {kind === 'ALIMENT' ? 'Éditer aliment' : 'Éditer produit véto'}
              </p>
              <p className="text-mono-micro text-text-2 tabular-nums mt-0.5 truncate">
                {stockItem.id}
              </p>
            </div>
          </div>

          {/* ── Section Identité ─────────────────────────────────────── */}
          {kind === 'ALIMENT' ? (
            <FormField label="Libellé" required error={errors.libelle}>
              <Input
                id="edit-stock-libelle"
                ref={firstFieldRef}
                type="text"
                maxLength={60}
                aria-label="Libellé de l'aliment"
                aria-required="true"
                aria-invalid={!!errors.libelle}
                aria-describedby={errors.libelle ? 'edit-stock-libelle-error' : undefined}
                placeholder="Ex: Truie gestation"
                value={libelle}
                onChange={e => setLibelle(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>
          ) : (
            <div className="space-y-3">
              <FormField label="Produit" required error={errors.produit}>
                <Input
                  id="edit-stock-produit"
                  ref={firstFieldRef}
                  type="text"
                  maxLength={60}
                  aria-label="Nom du produit vétérinaire"
                  aria-required="true"
                  aria-invalid={!!errors.produit}
                  aria-describedby={errors.produit ? 'edit-stock-produit-error' : undefined}
                  placeholder="Ex: Ivermectine"
                  value={produit}
                  onChange={e => setProduit(e.target.value)}
                  disabled={saving}
                  autoComplete="off"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Type" hint="optionnel" error={errors.type}>
                  <Input
                    id="edit-stock-type"
                    type="text"
                    maxLength={60}
                    aria-label="Type (catégorie) du produit"
                    aria-invalid={!!errors.type}
                    aria-describedby={errors.type ? 'edit-stock-type-error' : undefined}
                    placeholder="Ex: Antibiotique"
                    value={typeVeto}
                    onChange={e => setTypeVeto(e.target.value)}
                    disabled={saving}
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Usage" hint="optionnel" error={errors.usage}>
                  <Input
                    id="edit-stock-usage"
                    type="text"
                    maxLength={60}
                    aria-label="Usage du produit"
                    aria-invalid={!!errors.usage}
                    aria-describedby={errors.usage ? 'edit-stock-usage-error' : undefined}
                    placeholder="Ex: Prévention"
                    value={usageVeto}
                    onChange={e => setUsageVeto(e.target.value)}
                    disabled={saving}
                    autoComplete="off"
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* ── Section Stock ───────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-mono-micro text-text-2">Stock</p>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Stock actuel" required error={errors.stockActuel}>
                <Input
                  id="edit-stock-actuel"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={9999}
                  step={0.1}
                  aria-label="Stock actuel"
                  aria-required="true"
                  aria-invalid={!!errors.stockActuel}
                  aria-describedby={errors.stockActuel ? 'edit-stock-actuel-error' : undefined}
                  className="font-mono tabular-nums text-center"
                  placeholder="0"
                  value={stockActuel}
                  onChange={e => setStockActuel(e.target.value)}
                  disabled={saving}
                />
              </FormField>

              <FormField label="Unité" required error={errors.unite}>
                <Input
                  id="edit-stock-unite"
                  type="text"
                  list="edit-stock-unite-suggestions"
                  maxLength={20}
                  aria-label="Unité de mesure"
                  aria-required="true"
                  aria-invalid={!!errors.unite}
                  aria-describedby={errors.unite ? 'edit-stock-unite-error' : undefined}
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
              </FormField>
            </div>

            <FormField
              label="Seuil d'alerte"
              required
              hint="Stock ≤ ce seuil › statut BAS"
              error={errors.seuilAlerte}
            >
              <Input
                id="edit-stock-seuil"
                type="number"
                inputMode="decimal"
                min={0}
                max={9999}
                step={0.1}
                aria-label="Seuil d'alerte"
                aria-required="true"
                aria-invalid={!!errors.seuilAlerte}
                aria-describedby={errors.seuilAlerte ? 'edit-stock-seuil-error' : 'edit-stock-seuil-hint'}
                className="font-mono tabular-nums"
                placeholder="0"
                value={seuilAlerte}
                onChange={e => setSeuilAlerte(e.target.value)}
                disabled={saving}
              />
            </FormField>
          </div>

          {/* ── Section Statut ──────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="edit-stock-statut"
                className="block text-mono-label text-text-2"
              >
                Statut · <span className={statutTone}>{statut}</span>
              </label>
              <Button
                variant="secondary"
                size="small"
                onClick={handleRecalculer}
                disabled={saving}
                ariaLabel="Recalculer le statut depuis stock actuel et seuil"
              >
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw size={12} aria-hidden="true" />
                  Recalculer
                </span>
              </Button>
            </div>
            <Select
              id="edit-stock-statut"
              aria-label="Statut du stock"
              aria-invalid={!!errors.statut}
              value={statut}
              onChange={e => setStatut(e.target.value as EditableStatut)}
              disabled={saving}
            >
              <option value="OK">OK</option>
              <option value="BAS">BAS</option>
              <option value="RUPTURE">RUPTURE</option>
            </Select>
            {errors.statut ? (
              <p role="alert" className="text-[11px] text-red">
                {errors.statut}
              </p>
            ) : null}
          </div>

          {/* ── Section Notes ───────────────────────────────────────── */}
          <FormField
            label="Notes"
            hint={`optionnel · ${notes.length}/200`}
            error={errors.notes}
          >
            <Textarea
              id="edit-stock-notes"
              maxLength={200}
              rows={3}
              aria-label="Notes libres"
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? 'edit-stock-notes-error' : 'edit-stock-notes-hint'}
              placeholder="Lot, fournisseur, observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={saving}
            />
          </FormField>

          {/* ── Actions ─────────────────────────────────────────────── */}
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
              ariaLabel="Enregistrer les modifications du stock"
              aria-busy={saving}
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
                  Enregistrer
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

export default QuickEditStockForm;
