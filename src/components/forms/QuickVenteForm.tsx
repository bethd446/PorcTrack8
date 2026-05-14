import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';

import { Input, Select, Textarea } from '@/design-system';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  insertFinance,
  updateBatchByCode,
} from '../../services/supabaseWrites';
import type { BandePorcelets } from '../../types/farm';
import { useFocusFirstInput } from './useFormA11y';
import { useAuth } from '../../context/AuthContext';
import { getDefaultValidationStatus } from '../../services/validationWorkflow';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import {
  buildVentePayloads,
  computeRendementCarcasse,
  computeVenteMontant,
  toIsoDateInput,
  validateVente,
  VENTE_ABATTOIR_NOM_MAX,
  VENTE_ACHETEUR_MAX,
  VENTE_CANAUX,
  VENTE_NOTES_MAX,
  VENTE_RENDEMENT_SEUIL_BON,
  type VenteCanal,
} from './quickVenteLogic';

const CANAL_LABELS: Record<VenteCanal, string> = {
  ABATTOIR: 'Abattoir',
  DIRECT: 'Vente directe',
  DEMI_GROS: 'Demi-gros',
  AUTRE: 'Autre',
};

/**
 * QuickVenteForm — Enregistrer une vente de porcs depuis une bande en finition.
 *
 * Contexte métier :
 *   Quand le porcher vend un lot de porcs (ex: abattoir), il doit :
 *     1. Réduire le nombre de vivants de la bande (et l'archiver si =0)
 *     2. Créer une ligne REVENU dans FINANCES pour la comptabilité
 *
 * Conforme FORM_CONTRACT Phase 2 :
 *   - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *   - toast canonique `useToast()` (remplace `useAppToast`/`AppToast` local)
 *   - validation `validateVente` → { ok, errors } + rendu via `<FieldError>`
 *   - helpers date partagés `_formHelpers` (via `toIsoDateInput` de la logique)
 *   - reset-on-open via `lastOpenKey` render-phase
 *   - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *     + cleanup `useEffect`
 *
 * L'enqueue ordre est préservé pour que, en cas de replay offline, l'update
 * bande passe avant l'append finance (pas de comptabilité orpheline).
 */

interface QuickVenteFormProps {
  isOpen: boolean;
  onClose: () => void;
  bande: BandePorcelets;
  onSuccess?: () => void;
}

const QuickVenteForm: React.FC<QuickVenteFormProps> = ({
  isOpen,
  onClose,
  bande,
  onSuccess,
}) => {
  const { refreshData } = useFarm();
  const { role } = useAuth();
  const { showToast } = useToast();
  const vivantsActuels = bande.vivants ?? 0;

  const [nbVendus, setNbVendus] = useState<string>('');
  const [poidsMoyen, setPoidsMoyen] = useState<string>('90');
  const [prixUnitaire, setPrixUnitaire] = useState<string>('2100');
  const [acheteur, setAcheteur] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(toIsoDateInput());
  const [notes, setNotes] = useState<string>('');
  const [canal, setCanal] = useState<VenteCanal>('DIRECT');
  const [abattoirNom, setAbattoirNom] = useState<string>('');
  const [poidsCarcasse, setPoidsCarcasse] = useState<string>('');
  const [prixCarcasse, setPrixCarcasse] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; bandeId: string }>({
    isOpen,
    bandeId: bande.id,
  });
  if (lastKey.isOpen !== isOpen || lastKey.bandeId !== bande.id) {
    setLastKey({ isOpen, bandeId: bande.id });
    if (isOpen) {
      setNbVendus('');
      setPoidsMoyen('90');
      setPrixUnitaire('2100');
      setAcheteur('');
      setDateIso(toIsoDateInput());
      setNotes('');
      setCanal('DIRECT');
      setAbattoirNom('');
      setPoidsCarcasse('');
      setPrixCarcasse('');
      setErrors({});
      setSaving(false);
    }
  }

  // Cleanup timer à l'unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback((): void => {
    if (saving) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }, [onClose, saving]);

  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  // ─ Parsing numériques ─────────────────────────────────────────────────────
  const nbNum = useMemo(() => {
    const n = parseInt(nbVendus.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) ? n : NaN;
  }, [nbVendus]);

  const poidsNum = useMemo(() => {
    const n = parseFloat(poidsMoyen.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [poidsMoyen]);

  const prixNum = useMemo(() => {
    const n = parseFloat(prixUnitaire.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [prixUnitaire]);

  const poidsCarcasseNum = useMemo(() => {
    const n = parseFloat(poidsCarcasse.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [poidsCarcasse]);

  const prixCarcasseNum = useMemo(() => {
    const n = parseFloat(prixCarcasse.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [prixCarcasse]);

  const montantTotal = useMemo(
    () => computeVenteMontant(nbNum, poidsNum, prixNum),
    [nbNum, poidsNum, prixNum],
  );

  const poidsVifTotal = useMemo(() => {
    if (!Number.isFinite(nbNum) || nbNum <= 0) return NaN;
    if (!Number.isFinite(poidsNum) || poidsNum <= 0) return NaN;
    return Math.round(nbNum * poidsNum * 100) / 100;
  }, [nbNum, poidsNum]);

  const rendementPct = useMemo(
    () => computeRendementCarcasse(poidsCarcasseNum, poidsVifTotal),
    [poidsCarcasseNum, poidsVifTotal],
  );

  const showAbattoirFields = canal === 'ABATTOIR';

  const idBandeDisplay = bande.idPortee || bande.id;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const validation = validateVente({
      nbVendus: nbNum,
      vivantsActuels,
      poidsMoyenKg: poidsNum,
      prixUnitaireFCFA: prixNum,
      acheteur,
      dateIso,
      canal,
      abattoirNom,
      poidsCarcasseKg: poidsCarcasseNum,
      prixCarcasseFCFAKg: prixCarcasseNum,
    });
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const payloads = buildVentePayloads({
        bande,
        nbVendus: nbNum,
        poidsMoyenKg: poidsNum,
        prixUnitaireFCFA: prixNum,
        acheteur,
        dateIso,
        notes,
        canal,
        abattoirNom,
        poidsCarcasseKg: poidsCarcasseNum,
        prixCarcasseFCFAKg: prixCarcasseNum,
      });

      const validationStatus = getDefaultValidationStatus(role);
      const batchPatch: Record<string, unknown> = {
        porcelets_nes_vivants: payloads.vivantsRestants,
        notes: payloads.bandePatch.NOTES as string,
        validation_status: validationStatus,
        ...payloads.carcasseDbPatch,
      };
      if (payloads.bandeVendue) batchPatch.statut = 'Vendue';
      await updateBatchByCode(bande.id, batchPatch);

      await insertFinance({
        poste: `Vente ${nbNum} porc${nbNum > 1 ? 's' : ''} ${acheteur.trim()}`,
        type: 'REVENU',
        mensuel_fcfa: payloads.montant,
        notes: (payloads.financeValues[5] as string) ?? null,
        validation_status: validationStatus,
      } as Parameters<typeof insertFinance>[0]);

      const online = typeof navigator !== 'undefined' && navigator.onLine;
      const formatted = montantTotal.toLocaleString('fr-FR');
      const baseMsg = online
        ? `Vente enregistrée · ${formatted} FCFA`
        : `Vente en file · ${formatted} FCFA · sync auto`;

      showToast(baseMsg, online ? 'success' : 'info', 2800);

      // Refresh parent (non-bloquant)
      try {
        await refreshData(true);
      } catch {
        /* queue offline applique déjà */
      }

      if (onSuccess) onSuccess();

      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // dans la fenêtre 1.5s avant fermeture (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[QuickVenteForm] enregistrement local échoué:', err);
      const msg = err instanceof Error ? err.message : 'Erreur enregistrement';
      showToast(msg, 'error', 2800);
      setSaving(false);
    }
  };

  const isValid =
    Number.isFinite(nbNum) && nbNum > 0 && nbNum <= vivantsActuels &&
    Number.isFinite(poidsNum) && poidsNum > 0 &&
    Number.isFinite(prixNum) && prixNum > 0 &&
    acheteur.trim().length > 0 &&
    !!dateIso &&
    (!showAbattoirFields || (
      abattoirNom.trim().length > 0 &&
      Number.isFinite(poidsCarcasseNum) && poidsCarcasseNum > 0 &&
      Number.isFinite(prixCarcasseNum) && prixCarcasseNum > 0
    ));

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Vente porcs"
      title={`Enregistrer vente · ${idBandeDisplay}`}
      ariaLabel="Enregistrement d'une vente de porcs"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Valider vente"
      submitAriaLabel="Valider la vente"
    >
      {/* ── Info bande (read-only) ──────────────────────────────── */}
      <div className="card-dense !p-4 flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-amber shrink-0">
          <TrendingUp size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-mono-micro text-text-2">
            Bande en finition
          </div>
          <div className="truncate ft-code text-[13px] text-text-0">
            {idBandeDisplay}
            {bande.boucleMere ? ` · ${bande.boucleMere}` : ''}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-text-2">
            <span>
              Vivants actuels ·{' '}
              <span className="text-text-0">{vivantsActuels}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Nombre de porcs vendus ───────────────────────────────── */}
      <div className="field">
        <label className="label--v77" htmlFor="vente-nb">
          NOMBRE DE PORCS VENDUS (MAX {vivantsActuels}) <span className="req">requis</span>
        </label>
        <Input
          id="vente-nb"
          ref={firstFieldRef}
          type="number"
          inputMode="numeric"
          min={1}
          max={vivantsActuels}
          step={1}
          aria-label="Nombre de porcs vendus"
          aria-required="true"
          aria-invalid={!!errors.nbVendus}
          className="font-mono text-[24px] tabular-nums text-center"
          placeholder="0"
          value={nbVendus}
          onChange={e => setNbVendus(e.target.value.replace(/[^\d]/g, ''))}
          disabled={saving}
        />
        <FieldError message={errors.nbVendus} />
      </div>

      {/* ── Poids + Prix (grid 2-col) ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label className="label--v77" htmlFor="vente-poids">
            POIDS MOYEN (KG) <span className="req">requis</span>
          </label>
          <Input
            id="vente-poids"
            type="text"
            inputMode="decimal"
            aria-label="Poids moyen par porc en kilogrammes"
            aria-required="true"
            aria-invalid={!!errors.poids}
            className="tabular-nums"
            placeholder="90"
            value={poidsMoyen}
            onChange={e => setPoidsMoyen(e.target.value.replace(/[^\d.,]/g, ''))}
            disabled={saving}
          />
          <FieldError message={errors.poids} />
        </div>

        <div className="field">
          <label className="label--v77" htmlFor="vente-prix">
            PRIX UNIT. FCFA / KG <span className="req">requis</span>
          </label>
          <Input
            id="vente-prix"
            type="text"
            inputMode="decimal"
            aria-label="Prix unitaire en FCFA par kilogramme"
            aria-required="true"
            aria-invalid={!!errors.prix}
            className="tabular-nums"
            placeholder="2100"
            value={prixUnitaire}
            onChange={e => setPrixUnitaire(e.target.value.replace(/[^\d.,]/g, ''))}
            disabled={saving}
          />
          <FieldError message={errors.prix} />
        </div>
      </div>

      {/* ── Montant total (auto-calculé) ─────────────────────────── */}
      <div
        className="card-dense !p-3 flex items-center justify-between"
        aria-live="polite"
        aria-label={`Montant total estimé : ${montantTotal.toLocaleString('fr-FR')} FCFA`}
      >
        <span className="text-mono-label text-text-2">
          Montant total
        </span>
        <span className="font-mono text-[16px] tabular-nums text-amber font-bold">
          {montantTotal.toLocaleString('fr-FR')} FCFA
        </span>
      </div>

      {/* ── Acheteur ─────────────────────────────────────────────── */}
      <div className="field">
        <label className="label--v77" htmlFor="vente-acheteur">
          ACHETEUR <span className="req">requis</span>
        </label>
        <Input
          id="vente-acheteur"
          type="text"
          aria-label="Nom de l'acheteur"
          aria-required="true"
          aria-invalid={!!errors.acheteur}
          placeholder="Ex : Abattoir Abidjan"
          value={acheteur}
          onChange={e => setAcheteur(e.target.value)}
          disabled={saving}
          maxLength={VENTE_ACHETEUR_MAX}
        />
        <FieldError message={errors.acheteur} />
      </div>

      {/* ── Date vente ───────────────────────────────────────────── */}
      <div className="field">
        <label className="label--v77" htmlFor="vente-date">
          DATE VENTE <span className="req">requis</span>
        </label>
        <Input
          id="vente-date"
          type="date"
          aria-label="Date de la vente"
          aria-required="true"
          aria-invalid={!!errors.date}
          className="font-mono tabular-nums"
          value={dateIso}
          onChange={e => setDateIso(e.target.value)}
          disabled={saving}
        />
        <FieldError message={errors.date} />
      </div>

      {/* ── Canal de vente ──────────────────────────────────────── */}
      <div className="field">
        <label className="label--v77" htmlFor="vente-canal">CANAL DE VENTE</label>
        <Select
          id="vente-canal"
          aria-label="Canal de vente"
          aria-invalid={!!errors.canal}
          value={canal}
          onChange={e => setCanal(e.target.value as VenteCanal)}
          disabled={saving}
        >
          {VENTE_CANAUX.map(c => (
            <option key={c} value={c}>{CANAL_LABELS[c]}</option>
          ))}
        </Select>
        <FieldError message={errors.canal} />
      </div>

      {/* ── Champs ABATTOIR (conditionnels) ─────────────────────── */}
      {showAbattoirFields ? (
        <div
          className="space-y-3 rounded-md border border-border bg-bg-1 p-3"
          aria-label="Informations abattoir et carcasse"
        >
          <div className="field">
            <label className="label--v77" htmlFor="vente-abattoir">
              NOM ABATTOIR <span className="req">requis</span>
            </label>
            <Input
              id="vente-abattoir"
              type="text"
              aria-label="Nom de l'abattoir"
              aria-required="true"
              aria-invalid={!!errors.abattoirNom}
              placeholder="Ex : Abattoir Abidjan"
              value={abattoirNom}
              onChange={e => setAbattoirNom(e.target.value)}
              disabled={saving}
              maxLength={VENTE_ABATTOIR_NOM_MAX}
            />
            <FieldError message={errors.abattoirNom} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label--v77" htmlFor="vente-carcasse">
                POIDS CARCASSE TOTAL (KG) <span className="req">requis</span>
              </label>
              <Input
                id="vente-carcasse"
                type="text"
                inputMode="decimal"
                aria-label="Poids carcasse total en kilogrammes"
                aria-required="true"
                aria-invalid={!!errors.poidsCarcasse}
                className="tabular-nums"
                placeholder="0"
                value={poidsCarcasse}
                onChange={e => setPoidsCarcasse(e.target.value.replace(/[^\d.,]/g, ''))}
                disabled={saving}
              />
              <FieldError message={errors.poidsCarcasse} />
            </div>

            <div className="field">
              <label className="label--v77" htmlFor="vente-prix-carcasse">
                PRIX CARCASSE (FCFA / KG) <span className="req">requis</span>
              </label>
              <Input
                id="vente-prix-carcasse"
                type="text"
                inputMode="decimal"
                aria-label="Prix par kilogramme de carcasse en FCFA"
                aria-required="true"
                aria-invalid={!!errors.prixCarcasse}
                className="tabular-nums"
                placeholder="0"
                value={prixCarcasse}
                onChange={e => setPrixCarcasse(e.target.value.replace(/[^\d.,]/g, ''))}
                disabled={saving}
              />
              <FieldError message={errors.prixCarcasse} />
            </div>
          </div>

          {/* Badge rendement carcasse auto-calculé */}
          {Number.isFinite(rendementPct) ? (
            <div
              className="card-dense !p-3 flex items-center justify-between"
              aria-live="polite"
              aria-label={`Rendement carcasse : ${rendementPct} pour cent`}
            >
              <span className="text-mono-label text-text-2">
                Rendement carcasse
              </span>
              <span
                className={[
                  'text-[14px] tabular-nums font-bold rounded-full px-3 py-0.5',
                  rendementPct >= VENTE_RENDEMENT_SEUIL_BON
                    ? 'bg-green-500/15 text-green-600'
                    : 'bg-amber/15 text-amber',
                ].join(' ')}
              >
                {rendementPct.toFixed(1)}%
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Notes (optionnel) ────────────────────────────────────── */}
      <div className="field">
        <label className="label--v77" htmlFor="vente-notes">
          NOTES <span className="hint">optionnel · {notes.length}/{VENTE_NOTES_MAX}</span>
        </label>
        <Textarea
          id="vente-notes"
          aria-label="Notes complémentaires sur la vente"
          placeholder="Ex : livraison matin, camion 1"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
          maxLength={VENTE_NOTES_MAX}
        />
      </div>
    </QuickActionSheet>
  );
};

export default QuickVenteForm;
