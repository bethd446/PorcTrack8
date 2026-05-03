import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import { TrendingUp, Check, CheckCircle2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import {
  insertFinance,
  updateBatchByCode,
} from '../../services/supabaseWrites';
import type { BandePorcelets } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import { useAuth } from '../../context/AuthContext';
import { getDefaultValidationStatus } from '../../services/validationWorkflow';
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
 * Pattern (cf. QuickMortalityForm + QuickRefillForm) :
 *   - BottomSheet wrapper
 *   - 2 enqueues atomiques (update bande PUIS append finance)
 *   - Idempotent : valeurs absolues côté bande (VIVANTS = currentVivants - nb)
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
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false, message: '',
  });

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Render-time sync: reset quand la sheet s'ouvre ou que la bande change
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
      setSuccess(false);
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

  const resetAndClose = useCallback((): void => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
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
    setSuccess(false);
    onClose();
  }, [onClose]);

  // ─ A11y : Esc ferme la sheet + focus auto sur nbVendus ────────────────────
  useEscapeKey(isOpen && !saving, resetAndClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(
    isOpen && !success,
  );

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

      setToast({ show: true, message: baseMsg });
      setSuccess(true);

      // Refresh parent (non-bloquant)
      try {
        await refreshData(true);
      } catch {
        /* queue offline applique déjà */
      }

      if (onSuccess) onSuccess();

      // Fermeture différée
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        resetAndClose();
      }, 1500);
    } catch (err) {
      console.error('[QuickVenteForm] enregistrement local échoué:', err);
      const msg = err instanceof Error ? err.message : 'Erreur enregistrement';
      setToast({ show: true, message: msg });
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
    <BottomSheet
      isOpen={isOpen}
      onClose={resetAndClose}
      title={`Enregistrer vente · ${idBandeDisplay}`}
      height="full"
    >
      <div
        role="dialog"
        aria-labelledby="vente-form-heading"
        aria-modal="true"
        className="space-y-5"
      >
        <h2 id="vente-form-heading" className="sr-only">
          Enregistrement d'une vente de porcs
        </h2>

        {success ? (
          /* ── Success state ───────────────────────────────────────────── */
          <div
            className="flex flex-col items-center justify-center py-16 animate-scale-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={64}
              className="text-amber mb-4"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="agritech-heading text-[18px] uppercase tracking-wide">
              Vente enregistrée
            </p>
            <p className="mt-2 ft-code text-[12px] uppercase tracking-wide text-text-2 tabular-nums text-center px-4">
              {idBandeDisplay} · {nbNum} porc{nbNum > 1 ? 's' : ''} · {montantTotal.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
            <div className="space-y-1.5">
              <label
                htmlFor="vente-nb"
                className="block text-mono-label text-text-2"
              >
                Nombre de porcs vendus (max {vivantsActuels})
              </label>
              <input
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
                aria-describedby={errors.nbVendus ? 'vente-nb-error' : undefined}
                className={[
                  'w-full h-14 rounded-md px-4',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[24px] tabular-nums text-center',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-amber focus:ring-1 focus:ring-amber',
                  errors.nbVendus ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0"
                value={nbVendus}
                onChange={e => setNbVendus(e.target.value.replace(/[^\d]/g, ''))}
                disabled={saving}
              />
              {errors.nbVendus ? (
                <p
                  id="vente-nb-error"
                  role="alert"
                  className="text-[11px] text-red"
                >
                  {errors.nbVendus}
                </p>
              ) : null}
            </div>

            {/* ── Poids + Prix (grid 2-col) ────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="vente-poids"
                  className="block text-mono-label text-text-2"
                >
                  Poids moyen (kg)
                </label>
                <input
                  id="vente-poids"
                  type="text"
                  inputMode="decimal"
                  aria-label="Poids moyen par porc en kilogrammes"
                  aria-required="true"
                  aria-invalid={!!errors.poids}
                  aria-describedby={errors.poids ? 'vente-poids-error' : undefined}
                  className={[
                    'w-full h-11 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'text-[13px] tabular-nums',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-amber focus:ring-1 focus:ring-amber',
                    errors.poids ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
                  placeholder="90"
                  value={poidsMoyen}
                  onChange={e =>
                    setPoidsMoyen(e.target.value.replace(/[^\d.,]/g, ''))
                  }
                  disabled={saving}
                />
                {errors.poids ? (
                  <p
                    id="vente-poids-error"
                    role="alert"
                    className="text-[11px] text-red"
                  >
                    {errors.poids}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="vente-prix"
                  className="block text-mono-label text-text-2"
                >
                  Prix unit. FCFA / kg
                </label>
                <input
                  id="vente-prix"
                  type="text"
                  inputMode="decimal"
                  aria-label="Prix unitaire en FCFA par kilogramme"
                  aria-required="true"
                  aria-invalid={!!errors.prix}
                  aria-describedby={errors.prix ? 'vente-prix-error' : undefined}
                  className={[
                    'w-full h-11 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'text-[13px] tabular-nums',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-amber focus:ring-1 focus:ring-amber',
                    errors.prix ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
                  placeholder="2100"
                  value={prixUnitaire}
                  onChange={e =>
                    setPrixUnitaire(e.target.value.replace(/[^\d.,]/g, ''))
                  }
                  disabled={saving}
                />
                {errors.prix ? (
                  <p
                    id="vente-prix-error"
                    role="alert"
                    className="text-[11px] text-red"
                  >
                    {errors.prix}
                  </p>
                ) : null}
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
            <div className="space-y-1.5">
              <label
                htmlFor="vente-acheteur"
                className="block text-mono-label text-text-2"
              >
                Acheteur
              </label>
              <input
                id="vente-acheteur"
                type="text"
                aria-label="Nom de l'acheteur"
                aria-required="true"
                aria-invalid={!!errors.acheteur}
                aria-describedby={errors.acheteur ? 'vente-acheteur-error' : undefined}
                className={[
                  'w-full h-11 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-amber focus:ring-1 focus:ring-amber',
                  errors.acheteur ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="Ex : Abattoir Abidjan"
                value={acheteur}
                onChange={e => setAcheteur(e.target.value)}
                disabled={saving}
                maxLength={VENTE_ACHETEUR_MAX}
              />
              {errors.acheteur ? (
                <p
                  id="vente-acheteur-error"
                  role="alert"
                  className="text-[11px] text-red"
                >
                  {errors.acheteur}
                </p>
              ) : null}
            </div>

            {/* ── Date vente ───────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="vente-date"
                className="block text-mono-label text-text-2"
              >
                Date vente
              </label>
              <input
                id="vente-date"
                type="date"
                aria-label="Date de la vente"
                aria-required="true"
                aria-invalid={!!errors.date}
                aria-describedby={errors.date ? 'vente-date-error' : undefined}
                className={[
                  'w-full h-11 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[13px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-amber focus:ring-1 focus:ring-amber',
                  errors.date ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                value={dateIso}
                onChange={e => setDateIso(e.target.value)}
                disabled={saving}
              />
              {errors.date ? (
                <p
                  id="vente-date-error"
                  role="alert"
                  className="text-[11px] text-red"
                >
                  {errors.date}
                </p>
              ) : null}
            </div>

            {/* ── Canal de vente ──────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="vente-canal"
                className="block text-mono-label text-text-2"
              >
                Canal de vente
              </label>
              <select
                id="vente-canal"
                aria-label="Canal de vente"
                aria-invalid={!!errors.canal}
                aria-describedby={errors.canal ? 'vente-canal-error' : undefined}
                className={[
                  'w-full h-11 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-amber focus:ring-1 focus:ring-amber',
                  errors.canal ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                value={canal}
                onChange={e => setCanal(e.target.value as VenteCanal)}
                disabled={saving}
              >
                {VENTE_CANAUX.map(c => (
                  <option key={c} value={c}>{CANAL_LABELS[c]}</option>
                ))}
              </select>
              {errors.canal ? (
                <p
                  id="vente-canal-error"
                  role="alert"
                  className="text-[11px] text-red"
                >
                  {errors.canal}
                </p>
              ) : null}
            </div>

            {/* ── Champs ABATTOIR (conditionnels) ─────────────────────── */}
            {showAbattoirFields ? (
              <div
                className="space-y-3 rounded-md border border-border bg-bg-1 p-3"
                aria-label="Informations abattoir et carcasse"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="vente-abattoir"
                    className="block text-mono-label text-text-2"
                  >
                    Nom abattoir
                  </label>
                  <input
                    id="vente-abattoir"
                    type="text"
                    aria-label="Nom de l'abattoir"
                    aria-required="true"
                    aria-invalid={!!errors.abattoirNom}
                    aria-describedby={errors.abattoirNom ? 'vente-abattoir-error' : undefined}
                    className={[
                      'w-full h-11 rounded-md px-3',
                      'bg-bg-0 border text-text-0 placeholder:text-text-2',
                      'text-[13px]',
                      'outline-none transition-colors duration-[160ms]',
                      'focus:border-amber focus:ring-1 focus:ring-amber',
                      errors.abattoirNom ? 'border-red' : 'border-border hover:border-text-2',
                    ].join(' ')}
                    placeholder="Ex : Abattoir Abidjan"
                    value={abattoirNom}
                    onChange={e => setAbattoirNom(e.target.value)}
                    disabled={saving}
                    maxLength={VENTE_ABATTOIR_NOM_MAX}
                  />
                  {errors.abattoirNom ? (
                    <p
                      id="vente-abattoir-error"
                      role="alert"
                      className="text-[11px] text-red"
                    >
                      {errors.abattoirNom}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="vente-carcasse"
                      className="block text-mono-label text-text-2"
                    >
                      Poids carcasse total (kg)
                    </label>
                    <input
                      id="vente-carcasse"
                      type="text"
                      inputMode="decimal"
                      aria-label="Poids carcasse total en kilogrammes"
                      aria-required="true"
                      aria-invalid={!!errors.poidsCarcasse}
                      aria-describedby={errors.poidsCarcasse ? 'vente-carcasse-error' : undefined}
                      className={[
                        'w-full h-11 rounded-md px-3',
                        'bg-bg-0 border text-text-0 placeholder:text-text-2',
                        'text-[13px] tabular-nums',
                        'outline-none transition-colors duration-[160ms]',
                        'focus:border-amber focus:ring-1 focus:ring-amber',
                        errors.poidsCarcasse ? 'border-red' : 'border-border hover:border-text-2',
                      ].join(' ')}
                      placeholder="0"
                      value={poidsCarcasse}
                      onChange={e =>
                        setPoidsCarcasse(e.target.value.replace(/[^\d.,]/g, ''))
                      }
                      disabled={saving}
                    />
                    {errors.poidsCarcasse ? (
                      <p
                        id="vente-carcasse-error"
                        role="alert"
                        className="text-[11px] text-red"
                      >
                        {errors.poidsCarcasse}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="vente-prix-carcasse"
                      className="block text-mono-label text-text-2"
                    >
                      Prix carcasse (FCFA / kg)
                    </label>
                    <input
                      id="vente-prix-carcasse"
                      type="text"
                      inputMode="decimal"
                      aria-label="Prix par kilogramme de carcasse en FCFA"
                      aria-required="true"
                      aria-invalid={!!errors.prixCarcasse}
                      aria-describedby={errors.prixCarcasse ? 'vente-prix-carcasse-error' : undefined}
                      className={[
                        'w-full h-11 rounded-md px-3',
                        'bg-bg-0 border text-text-0 placeholder:text-text-2',
                        'text-[13px] tabular-nums',
                        'outline-none transition-colors duration-[160ms]',
                        'focus:border-amber focus:ring-1 focus:ring-amber',
                        errors.prixCarcasse ? 'border-red' : 'border-border hover:border-text-2',
                      ].join(' ')}
                      placeholder="0"
                      value={prixCarcasse}
                      onChange={e =>
                        setPrixCarcasse(e.target.value.replace(/[^\d.,]/g, ''))
                      }
                      disabled={saving}
                    />
                    {errors.prixCarcasse ? (
                      <p
                        id="vente-prix-carcasse-error"
                        role="alert"
                        className="text-[11px] text-red"
                      >
                        {errors.prixCarcasse}
                      </p>
                    ) : null}
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
            <div className="space-y-1.5">
              <label
                htmlFor="vente-notes"
                className="block text-mono-label text-text-2"
              >
                Notes <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <textarea
                id="vente-notes"
                aria-label="Notes complémentaires sur la vente"
                aria-describedby="vente-notes-hint"
                className={[
                  'w-full rounded-md px-3 py-3',
                  'bg-bg-0 border border-border text-text-0 placeholder:text-text-2',
                  'text-[12px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-amber focus:ring-1 focus:ring-amber',
                  'min-h-[72px] resize-y',
                ].join(' ')}
                placeholder="Ex : livraison matin, camion 1"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
                maxLength={VENTE_NOTES_MAX}
              />
              <p
                id="vente-notes-hint"
                className="text-[10px] text-text-2 tabular-nums"
              >
                {notes.length}/{VENTE_NOTES_MAX}
              </p>
            </div>

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={saving}
                aria-label="Annuler la vente"
                className={[
                  'pressable flex-1 h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-bg-1 border border-border text-text-1',
                  'text-[12px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms]',
                  'hover:border-text-2',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2',
                  saving ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !isValid}
                aria-label="Valider la vente"
                aria-busy={saving}
                className={[
                  'pressable flex-[2] h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-amber text-bg-0',
                  'text-[13px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-2',
                  saving || !isValid ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
                ].join(' ')}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <>
                    <Check size={14} aria-hidden="true" />
                    <span>Valider vente</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={2800}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </BottomSheet>
  );
};

export default QuickVenteForm;
