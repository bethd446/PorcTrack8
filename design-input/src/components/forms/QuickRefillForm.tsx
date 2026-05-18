/**
 * QuickRefillForm · Réapprovisionnement rapide d'un aliment ou véto
 * ════════════════════════════════════════════════════════════════════════
 * Flow :
 *   1. En-tête "Réapprovisionner : <produit>" + rappel stock / seuil / unité
 *   2. Quantité à ajouter (kg pour aliments, doses/mL pour véto)
 *   3. Prix unitaire FCFA (optionnel) + Date (défaut aujourd'hui)
 *   4. Fournisseur (optionnel)
 *   5. Valider réception
 * Persist :
 *   - UPDATE produits_aliments|produits_veto : { stock_actuel, en_alerte }
 *   - INSERT finances si prix unitaire fourni (montant > 0)
 *
 * Conforme FORM_CONTRACT : shell `<QuickActionSheet>`, `<form onSubmit>`,
 * toast canonique `useToast()`, validation `validateRefill` →
 * `{ ok, errors, normalized }` + `<FieldError>`, helpers date partagés,
 * reset-on-open `lastOpenKey`, garde double-clic `closeTimerRef` + cleanup.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  insertFinance,
  updateProduitAliment,
  updateProduitVeto,
  resolveProduitAlimentByCode,
  resolveProduitVetoByCode,
} from '../../services/supabaseWrites';
import type { StockStatut } from '../../types/farm';
import { useFocusFirstInput } from './useFormA11y';
import { FieldError } from './_formFields';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';
import {
  buildRefillPayloads,
  labelFor,
  recomputeStatut,
  validateRefill,
  type RefillErrors,
  type RefillStockItem,
} from './quickRefillLogic';

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
  const { showToast } = useToast();

  const [quantite, setQuantite] = useState<string>('');
  const [fournisseur, setFournisseur] = useState<string>('');
  const [prixUnitaire, setPrixUnitaire] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(todayIso);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<RefillErrors>({});

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const currentItemId = stockItem?.id ?? '';
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; itemId: string }>({
    isOpen,
    itemId: currentItemId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.itemId !== currentItemId) {
    setLastOpenKey({ isOpen, itemId: currentItemId });
    if (isOpen) {
      setQuantite('');
      setFournisseur('');
      setPrixUnitaire('');
      setDateIso(todayIso());
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

  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen && !!stockItem);

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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!stockItem) return;
    const validation = validateRefill({
      hasItem: !!stockItem,
      quantite,
      prixUnitaire,
      dateIso,
    });
    if (!validation.ok || !validation.normalized) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    const { quantite: qty, prixUnitaire: prix, dateIso: date } = validation.normalized;

    setSaving(true);
    try {
      const payloads = buildRefillPayloads({
        item: stockItem,
        quantite: qty,
        fournisseur,
        prixUnitaire: prix,
        dateIso: date,
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
        ? `${name} · ${qty} ${stockItem.unite} ajoutés`
        : `${name} · ${qty} ${stockItem.unite} · file sync`;
      showToast(baseMsg, online ? 'success' : 'info');

      try {
        await refreshData(true);
      } catch {
        /* non-bloquant : la queue offline applique déjà */
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
        err instanceof Error ? err.message : 'Erreur enregistrement',
        'error',
        4000,
      );
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

  const statutColor =
    previewStatut === 'RUPTURE' ? 'var(--pt-danger)'
      : previewStatut === 'BAS' ? 'var(--pt-warning)'
        : 'var(--pt-success)';

  const name = stockItem ? labelFor(stockItem) : '';
  const title = stockItem ? `Réapprovisionner : ${name}` : 'Réapprovisionner';

  const isValid =
    !!stockItem &&
    Number.isFinite(qtyNum) && qtyNum > 0 &&
    !!dateIso;

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Réapprovisionnement"
      title={title}
      ariaLabel="Réapprovisionnement stock"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Valider réception"
      submitAriaLabel="Valider la réception du réapprovisionnement"
      submitDisabled={!stockItem}
    >
      {!stockItem ? (
        <p style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-subtle)', margin: 0 }}>
          Aucun produit sélectionné.
        </p>
      ) : (
        <>
          {/* ── Bloc info produit (read-only) ────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: '1px solid var(--pt-line)', borderRadius: 12, background: 'var(--pt-bg)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 40, width: 40, borderRadius: 8, background: 'var(--pt-warm)', color: 'var(--pt-accent)', flexShrink: 0 }}>
              <Package size={18} aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow">
                {stockItem.kind === 'ALIMENT' ? 'Aliment' : 'Véto / soin'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--pt-ink)' }}>{name}</div>
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, fontFamily: 'var(--pt-font-mono)', color: 'var(--pt-subtle)' }}>
                <span>
                  Stock actuel · <span style={{ color: 'var(--pt-ink)' }}>{stockActuel} {unite}</span>
                </span>
                {seuilAlerte > 0 ? (
                  <span>
                    Seuil · <span style={{ color: 'var(--pt-ink)' }}>{seuilAlerte} {unite}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label--v77" htmlFor="refill-qty">
              QUANTITÉ REÇUE ({unite}) <span className="req">requis</span>
            </label>
            <input
              id="refill-qty"
              ref={firstFieldRef}
              className={`field__input mono${quantite ? ' filled' : ' field__input--ghost'}`}
              type="text"
              inputMode="decimal"
              aria-label={`Quantité reçue en ${unite}`}
              aria-required="true"
              aria-invalid={!!errors.quantite}
              placeholder="0.0"
              min={0.1}
              step={0.5}
              value={quantite}
              onChange={e => setQuantite(e.target.value.replace(/[^\d.,]/g, ''))}
              disabled={saving}
            />
            <FieldError message={errors.quantite} />
            {Number.isFinite(qtyNum) && qtyNum > 0 ? (
              <span className="hint" aria-live="polite">
                Nouveau stock · {previewStock} {unite} · Statut ·{' '}
                <span style={{ color: statutColor }}>{previewStatut}</span>
              </span>
            ) : (
              <span className="hint">Saisis la quantité reçue en {unite}.</span>
            )}
          </div>

          <div className="field--inline">
            <div className="field">
              <label className="label--v77" htmlFor="refill-price">
                PRIX UNIT. FCFA <span className="hint">optionnel</span>
              </label>
              <input
                id="refill-price"
                className={`field__input mono${prixUnitaire ? ' filled' : ' field__input--ghost'}`}
                type="text"
                inputMode="decimal"
                aria-label="Prix unitaire en FCFA (optionnel)"
                aria-invalid={!!errors.prix}
                placeholder="0"
                value={prixUnitaire}
                onChange={e => setPrixUnitaire(e.target.value.replace(/[^\d.,]/g, ''))}
                disabled={saving}
              />
              <FieldError message={errors.prix} />
            </div>

            <div className="field">
              <label className="label--v77" htmlFor="refill-date">
                DATE <span className="req">requis</span>
              </label>
              <input
                id="refill-date"
                className={`field__input mono${dateIso ? ' filled' : ' field__input--ghost'}`}
                type="date"
                aria-label="Date de réception"
                aria-required="true"
                aria-invalid={!!errors.date}
                value={dateIso}
                onChange={e => setDateIso(e.target.value)}
                disabled={saving}
              />
              <FieldError message={errors.date} />
            </div>
          </div>

          {/* Total si prix fourni */}
          {totalMontant > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--pt-line)', borderRadius: 10, background: 'var(--pt-bg)' }}>
              <span className="eyebrow">Montant total</span>
              <span style={{ fontSize: 14, fontFamily: 'var(--pt-font-mono)', color: 'var(--pt-ink)' }}>
                {totalMontant.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          ) : null}

          <div className="field">
            <label className="label--v77" htmlFor="refill-supplier">
              FOURNISSEUR <span className="hint">optionnel</span>
            </label>
            <input
              id="refill-supplier"
              className={`field__input${fournisseur ? ' filled' : ' field__input--ghost'}`}
              type="text"
              aria-label="Fournisseur (optionnel)"
              placeholder="Ex: SENAC Feed"
              value={fournisseur}
              onChange={e => setFournisseur(e.target.value)}
              disabled={saving}
              maxLength={80}
            />
          </div>
        </>
      )}
    </QuickActionSheet>
  );
};

export default QuickRefillForm;
