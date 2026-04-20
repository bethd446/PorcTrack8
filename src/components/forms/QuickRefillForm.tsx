import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { IonToast } from '@ionic/react';
import { Package, Send, CheckCircle2 } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import {
  enqueueUpdateRow,
  enqueueAppendRow,
} from '../../services/offlineQueue';
import { BottomSheet } from '../agritech';
import type { StockStatut } from '../../types/farm';
import {
  buildRefillPayloads,
  labelFor,
  recomputeStatut,
  toIsoDateInput,
  toFrDate,
  toRefillItem,
  type RefillStockItem,
  type RefillPayloads,
} from './quickRefillLogic';

// Ré-exports pour les imports existants (RessourcesHub, tests, etc.)
export {
  buildRefillPayloads,
  labelFor,
  recomputeStatut,
  toIsoDateInput,
  toFrDate,
  toRefillItem,
};
export type { RefillStockItem, RefillPayloads };

/* ═════════════════════════════════════════════════════════════════════════
   QuickRefillForm · Réapprovisionnement rapide d'un aliment ou véto
   ─────────────────────────────────────────────────────────────────────────
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

// ─── Composant ──────────────────────────────────────────────────────────────

export interface QuickRefillFormProps {
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

  const [quantite, setQuantite] = useState<string>('');
  const [fournisseur, setFournisseur] = useState<string>('');
  const [prixUnitaire, setPrixUnitaire] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(toIsoDateInput());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

  // Reset quand la sheet s'ouvre / l'item change
  useEffect(() => {
    if (isOpen) {
      setQuantite('');
      setFournisseur('');
      setPrixUnitaire('');
      setDateIso(toIsoDateInput());
      setErrors({});
      setSaving(false);
      setSuccess(false);
    }
  }, [isOpen, stockItem?.id]);

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

      // 1. Update ligne STOCK_*
      await enqueueUpdateRow(
        payloads.stockSheet,
        payloads.stockIdHeader,
        payloads.stockIdValue,
        payloads.stockPatch,
      );

      // 2. Append FINANCES si prix fourni
      if (payloads.financeValues) {
        await enqueueAppendRow('FINANCES', payloads.financeValues);
      }

      const online = typeof navigator !== 'undefined' && navigator.onLine;
      const name = labelFor(stockItem);
      const baseMsg = online
        ? `${name} · ${qtyNum} ${stockItem.unite} ajoutés`
        : `${name} · ${qtyNum} ${stockItem.unite} · file sync`;
      setToast({ show: true, message: baseMsg });
      setSuccess(true);

      // Refresh data pour que l'UI reflète le nouveau stock / statut
      try {
        await refreshData();
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
      setToast({ show: true, message: msg });
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
            <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-text-2 tabular-nums text-center px-4">
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
                <div className="font-mono text-[10px] uppercase tracking-wide text-text-2">
                  {stockItem.kind === 'ALIMENT' ? 'Aliment' : 'Véto / soin'}
                </div>
                <div className="truncate font-mono text-[13px] text-text-0">
                  {name}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 font-mono text-[11px] tabular-nums text-text-2">
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

            {/* ── Quantité à ajouter ──────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="refill-qty"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Quantité reçue ({unite})
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="refill-qty"
                  type="text"
                  inputMode="decimal"
                  aria-label={`Quantité reçue en ${unite}`}
                  aria-invalid={!!errors.quantite}
                  aria-describedby={errors.quantite ? 'refill-qty-error' : undefined}
                  className={[
                    'flex-1 h-16 rounded-md px-4',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'font-mono text-[28px] tabular-nums text-center',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.quantite ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
                  placeholder="0.0"
                  min={0.1}
                  step={0.5}
                  value={quantite}
                  onChange={e =>
                    setQuantite(e.target.value.replace(/[^\d.,]/g, ''))
                  }
                  disabled={saving}
                />
                <span className="font-mono text-[14px] text-text-2 uppercase tracking-wide shrink-0 w-14 text-center">
                  {unite}
                </span>
              </div>
              {errors.quantite ? (
                <p
                  id="refill-qty-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.quantite}
                </p>
              ) : null}

              {/* Preview nouveau stock / statut */}
              {Number.isFinite(qtyNum) && qtyNum > 0 ? (
                <p className="font-mono text-[11px] tabular-nums text-text-2">
                  Nouveau stock · <span className="text-text-0">{previewStock} {unite}</span>
                  {' · '}
                  Statut · <span className={statutTone}>{previewStatut}</span>
                </p>
              ) : null}
            </div>

            {/* ── Fournisseur ────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="refill-supplier"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Fournisseur <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="refill-supplier"
                type="text"
                aria-label="Fournisseur"
                className={[
                  'w-full h-11 rounded-md px-3',
                  'bg-bg-0 border border-border text-text-0 placeholder:text-text-2',
                  'font-mono text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  'hover:border-text-2',
                ].join(' ')}
                placeholder="Ex: SENAC Feed"
                value={fournisseur}
                onChange={e => setFournisseur(e.target.value)}
                disabled={saving}
                maxLength={80}
              />
            </div>

            {/* ── Prix unitaire + Date (grid 2-col) ───────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="refill-price"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Prix unit. FCFA <span className="text-text-2 normal-case">· opt.</span>
                </label>
                <input
                  id="refill-price"
                  type="text"
                  inputMode="decimal"
                  aria-label="Prix unitaire en FCFA"
                  aria-invalid={!!errors.prix}
                  aria-describedby={errors.prix ? 'refill-price-error' : undefined}
                  className={[
                    'w-full h-11 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'font-mono text-[13px] tabular-nums',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.prix ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
                  placeholder="0"
                  value={prixUnitaire}
                  onChange={e =>
                    setPrixUnitaire(e.target.value.replace(/[^\d.,]/g, ''))
                  }
                  disabled={saving}
                />
                {errors.prix ? (
                  <p
                    id="refill-price-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.prix}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="refill-date"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Date
                </label>
                <input
                  id="refill-date"
                  type="date"
                  aria-label="Date de réception"
                  aria-invalid={!!errors.date}
                  className={[
                    'w-full h-11 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'font-mono text-[13px] tabular-nums',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.date ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
                  value={dateIso}
                  onChange={e => setDateIso(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Total si prix fourni */}
            {totalMontant > 0 ? (
              <div className="card-dense !p-3 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                  Montant total
                </span>
                <span className="font-mono text-[14px] tabular-nums text-text-0">
                  {totalMontant.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ) : null}

            {/* ── Actions ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={saving}
                className={[
                  'pressable flex-1 h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-bg-1 border border-border text-text-1',
                  'font-mono text-[12px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms]',
                  'hover:border-text-2',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  saving ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !isValid}
                aria-label="Valider réception"
                className={[
                  'pressable flex-[2] h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-accent text-bg-0',
                  'font-mono text-[13px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  saving || !isValid ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
                ].join(' ')}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <>
                    <span>Valider réception</span>
                    <Send size={14} className="flex-shrink-0" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <p className="font-mono text-[12px] text-text-2">
            Aucun produit sélectionné.
          </p>
        )}
      </div>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={2600}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </BottomSheet>
  );
};

export default QuickRefillForm;
