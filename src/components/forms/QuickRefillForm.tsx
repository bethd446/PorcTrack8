import React, { useMemo, useState, useCallback } from 'react';
import { Package, Send, CheckCircle2 } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import {
  insertFinance,
  updateProduitAliment,
  updateProduitVeto,
  resolveProduitAlimentByCode,
  resolveProduitVetoByCode,
} from '../../services/supabaseWrites';
import { AppToast, BottomSheet, useAppToast } from '../agritech';
import { Button, FormField, Input, Section } from '@/design-system';
import type { StockStatut } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import {
  buildRefillPayloads,
  labelFor,
  recomputeStatut,
  toIsoDateInput,
  type RefillStockItem,
} from './quickRefillLogic';

/* ═════════════════════════════════════════════════════════════════════════
   QuickRefillForm · Réapprovisionnement rapide d'un aliment ou véto
   ─────────────────────────────────────────────────────────────────────────
   V44 archétype 5 : Section UPPERCASE + FormField wrapper + AppToast DS
   Flow (BottomSheet) :
     1. En-tête "Réapprovisionner : <produit>" + rappel stock / seuil / unité
     2. Quantité à ajouter (kg pour aliments, doses/mL pour véto)
     3. Fournisseur (optionnel) + Prix unitaire FCFA (optionnel)
     4. Date (défaut aujourd'hui)
     5. Valider réception
   Persist :
     - UPDATE STOCK_ALIMENTS|STOCK_VETO : { STOCK_ACTUEL, STATUT_STOCK }
     - APPEND FINANCES : [DATE, CATEGORIE, LIBELLE, MONTANT, TYPE, NOTES]
       (uniquement si prix unitaire fourni → montant > 0)
   ═════════════════════════════════════════════════════════════════════════ */

interface QuickRefillFormProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: RefillStockItem | null;
  onSuccess?: () => void;
}

const QuickRefillForm: React.FC<QuickRefillFormProps> = ({
  isOpen,
  onClose,
  stockItem,
  onSuccess,
}) => {
  const { refreshData } = useFarm();
  const { show: showToast, toastProps } = useAppToast();

  const [quantite, setQuantite] = useState<string>('');
  const [fournisseur, setFournisseur] = useState<string>('');
  const [prixUnitaire, setPrixUnitaire] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(toIsoDateInput());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset quand la sheet s'ouvre / l'item change — render-time sync
  const currentItemId = stockItem?.id ?? '';
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; itemId: string }>({
    isOpen,
    itemId: currentItemId,
  });
  if (lastKey.isOpen !== isOpen || lastKey.itemId !== currentItemId) {
    setLastKey({ isOpen, itemId: currentItemId });
    if (isOpen) {
      setQuantite('');
      setFournisseur('');
      setPrixUnitaire('');
      setDateIso(toIsoDateInput());
      setErrors({});
      setSaving(false);
      setSuccess(false);
    }
  }

  const resetAndClose = useCallback((): void => {
    setQuantite('');
    setFournisseur('');
    setPrixUnitaire('');
    setDateIso(toIsoDateInput());
    setErrors({});
    setSaving(false);
    setSuccess(false);
    onClose();
  }, [onClose]);

  // ── A11y : Esc ferme la sheet + focus auto sur quantité ────────────────
  useEscapeKey(isOpen && !saving, resetAndClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(
    isOpen && !!stockItem && !success,
  );

  const qtyNum = useMemo(() => {
    const n = parseFloat(quantite.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [quantite]);

  const prixNum = useMemo(() => {
    if (!prixUnitaire.trim()) return undefined;
    const n = parseFloat(prixUnitaire.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [prixUnitaire]);

  const totalMontant = useMemo(() => {
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return 0;
    if (prixNum === undefined || !Number.isFinite(prixNum) || prixNum <= 0) return 0;
    return Math.round(qtyNum * prixNum);
  }, [qtyNum, prixNum]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!stockItem) {
      next.item = 'Produit manquant';
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      next.quantite = 'Quantité > 0 requise';
    }
    if (prixUnitaire.trim() && (!Number.isFinite(prixNum as number) || (prixNum as number) < 0)) {
      next.prix = 'Prix invalide';
    }
    if (!dateIso) {
      next.date = 'Date requise';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!stockItem) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const payloads = buildRefillPayloads({
        item: stockItem,
        quantite: qtyNum,
        fournisseur,
        prixUnitaire: prixNum,
        dateIso,
      });

      // 1. Update ligne stock (aliment ou véto)
      const stockUpdate = {
        stock_actuel: payloads.stockPatch.STOCK_ACTUEL as number,
        en_alerte: payloads.stockPatch.STATUT_STOCK !== 'OK',
      };
      if (stockItem.kind === 'ALIMENT') {
        const id = await resolveProduitAlimentByCode(stockItem.id);
        if (id) await updateProduitAliment(id, stockUpdate);
      } else {
        const id = await resolveProduitVetoByCode(stockItem.id);
        if (id) {
          await updateProduitVeto(id, {
            stock_actuel: stockUpdate.stock_actuel,
            alerte_stock_bas: stockUpdate.en_alerte,
          });
        }
      }

      // 2. Append finance si prix fourni
      if (payloads.financeValues) {
        await insertFinance({
          poste: payloads.financeValues[2] as string,
          type: 'DEPENSE',
          mensuel_fcfa: payloads.financeValues[3] as number,
          notes: payloads.financeValues[5] as string,
        });
      }

      const online = typeof navigator !== 'undefined' && navigator.onLine;
      const name = labelFor(stockItem);
      const baseMsg = online
        ? `${name} · ${qtyNum} ${stockItem.unite} ajoutés`
        : `${name} · ${qtyNum} ${stockItem.unite} · file sync`;
      showToast(baseMsg, 'success');
      setSuccess(true);

      // Refresh data pour que l'UI reflète le nouveau stock / statut
      try {
        await refreshData(true);
      } catch {
        /* non-bloquant : la queue offline applique déjà */
      }

      if (onSuccess) onSuccess();

      // Auto-close après court délai
      setTimeout(() => {
        resetAndClose();
      }, 1400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur enregistrement';
      showToast(msg, 'error');
      setSaving(false);
    }
  };

  // ─── UI ────────────────────────────────────────────────────────────────────
  const unite = stockItem?.unite ?? '';
  const stockActuel = stockItem?.stockActuel ?? 0;
  const seuilAlerte = stockItem?.seuilAlerte ?? 0;
  const previewStock = Number.isFinite(qtyNum) && qtyNum > 0
    ? +(stockActuel + qtyNum).toFixed(3)
    : stockActuel;
  const previewStatut: StockStatut = recomputeStatut(previewStock, seuilAlerte);

  const statutTone =
    previewStatut === 'RUPTURE' ? 'text-red'
      : previewStatut === 'BAS' ? 'text-amber'
        : 'text-accent';

  const name = stockItem ? labelFor(stockItem) : '';
  const title = stockItem ? `Réapprovisionner : ${name}` : 'Réapprovisionner';

  const isValid =
    !!stockItem &&
    Number.isFinite(qtyNum) && qtyNum > 0 &&
    !!dateIso;

  const qtyHint =
    Number.isFinite(qtyNum) && qtyNum > 0
      ? undefined
      : `Saisis la quantité reçue en ${unite}.`;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={resetAndClose}
      title={title}
      height="full"
    >
      <div
        role="dialog"
        aria-labelledby="refill-form-heading"
        aria-modal="true"
        className="space-y-5"
      >
        <h2 id="refill-form-heading" className="sr-only">
          Réapprovisionnement stock
        </h2>

        {success ? (
          /* ── Success state ────────────────────────────────────────── */
          <div
            className="flex flex-col items-center justify-center py-16 animate-scale-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={64}
              className="text-accent mb-4"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="agritech-heading text-[18px] uppercase tracking-wide">
              Réception enregistrée
            </p>
            <p className="mt-2 text-[12px] uppercase tracking-wide text-text-2 tabular-nums text-center px-4">
              Nouveau stock · {previewStock} {unite} ({previewStatut})
            </p>
          </div>
        ) : stockItem ? (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* ── Bloc info produit (read-only) ────────────────────── */}
            <div className="card-dense !p-4 flex items-start gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent shrink-0">
                <Package size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-mono-micro text-text-2">
                  {stockItem.kind === 'ALIMENT' ? 'Aliment' : 'Véto / soin'}
                </div>
                <div className="truncate text-[13px] text-text-0">
                  {name}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px] tabular-nums text-text-2">
                  <span>
                    Stock actuel · <span className="text-text-0">{stockActuel} {unite}</span>
                  </span>
                  {seuilAlerte > 0 ? (
                    <span>
                      Seuil · <span className="text-text-0">{seuilAlerte} {unite}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ═══ Section : Quantités ═══════════════════════════════════ */}
            <Section label="QUANTITÉS" />

            <FormField
              label={`Quantité reçue (${unite})`}
              required
              hint={qtyHint}
              error={errors.quantite}
            >
              <div className="flex items-center gap-2">
                <Input
                  id="refill-qty"
                  ref={firstFieldRef}
                  type="text"
                  inputMode="decimal"
                  aria-label={`Quantité reçue en ${unite}`}
                  aria-required="true"
                  aria-invalid={!!errors.quantite}
                  aria-describedby={errors.quantite ? 'refill-qty-error' : 'refill-qty-hint'}
                  invalid={!!errors.quantite}
                  placeholder="0.0"
                  min={0.1}
                  step={0.5}
                  value={quantite}
                  onChange={e =>
                    setQuantite(e.target.value.replace(/[^\d.,]/g, ''))
                  }
                  disabled={saving}
                />
                <span id="refill-qty-hint" className="sr-only">{qtyHint}</span>
                {errors.quantite && (
                  <span id="refill-qty-error" className="sr-only">{errors.quantite}</span>
                )}
                <span className="text-[14px] text-text-2 uppercase tracking-wide shrink-0 w-14 text-center">
                  {unite}
                </span>
              </div>

              {/* Preview nouveau stock / statut */}
              {Number.isFinite(qtyNum) && qtyNum > 0 ? (
                <p
                  aria-live="polite"
                  className="text-[11px] tabular-nums text-text-2 mt-1"
                >
                  Nouveau stock · <span className="text-text-0">{previewStock} {unite}</span>
                  {' · '}
                  Statut · <span className={statutTone}>{previewStatut}</span>
                </p>
              ) : null}
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Prix unit. FCFA"
                hint="optionnel"
                error={errors.prix}
              >
                <Input
                  id="refill-price"
                  type="text"
                  inputMode="decimal"
                  aria-label="Prix unitaire en FCFA (optionnel)"
                  aria-invalid={!!errors.prix}
                  aria-describedby={errors.prix ? 'refill-price-error' : undefined}
                  invalid={!!errors.prix}
                  placeholder="0"
                  value={prixUnitaire}
                  onChange={e =>
                    setPrixUnitaire(e.target.value.replace(/[^\d.,]/g, ''))
                  }
                  disabled={saving}
                />
                {errors.prix && (
                  <span id="refill-price-error" className="sr-only">{errors.prix}</span>
                )}
              </FormField>

              <FormField label="Date" required error={errors.date}>
                <Input
                  id="refill-date"
                  type="date"
                  aria-label="Date de réception"
                  aria-required="true"
                  aria-invalid={!!errors.date}
                  aria-describedby={errors.date ? 'refill-date-error' : undefined}
                  invalid={!!errors.date}
                  value={dateIso}
                  onChange={e => setDateIso(e.target.value)}
                  disabled={saving}
                />
                {errors.date && (
                  <span id="refill-date-error" className="sr-only">{errors.date}</span>
                )}
              </FormField>
            </div>

            {/* Total si prix fourni */}
            {totalMontant > 0 ? (
              <div className="card-dense !p-3 flex items-center justify-between">
                <span className="text-mono-label text-text-2">
                  Montant total
                </span>
                <span className="text-[14px] tabular-nums text-text-0">
                  {totalMontant.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ) : null}

            {/* ═══ Section : Notes ═══════════════════════════════════════ */}
            <Section label="NOTES" />

            <FormField label="Fournisseur" hint="optionnel">
              <Input
                id="refill-supplier"
                type="text"
                aria-label="Fournisseur (optionnel)"
                placeholder="Ex: SENAC Feed"
                value={fournisseur}
                onChange={e => setFournisseur(e.target.value)}
                disabled={saving}
                maxLength={80}
              />
            </FormField>

            {/* ── Actions ─────────────────────────────────────────── */}
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={resetAndClose}
                disabled={saving}
                ariaLabel="Annuler le réapprovisionnement"
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={saving || !isValid}
                ariaLabel="Valider la réception du réapprovisionnement"
                aria-busy={saving}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Valider réception
                    <Send size={14} className="flex-shrink-0" aria-hidden="true" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-[12px] text-text-2">
            Aucun produit sélectionné.
          </p>
        )}
      </div>

      <AppToast {...toastProps} />
    </BottomSheet>
  );
};

export default QuickRefillForm;
