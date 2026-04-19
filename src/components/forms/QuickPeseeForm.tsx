import React, { useMemo, useState, useCallback } from 'react';
import { Scale, Search, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { enqueueAppendRow } from '../../services/offlineQueue';
import { BottomSheet, DataRow } from '../agritech';
import type { BandePorcelets } from '../../types/farm';

/* ═════════════════════════════════════════════════════════════════════════
   QuickPeseeForm · Pesée rapide d'une bande de porcelets (bulk poids moyen)
   ─────────────────────────────────────────────────────────────────────────
   Flow 3 étapes :
     1. Sélection bande (statut "Sous mère" ou "Sevrés")
     2. Saisie nombre pesés + poids moyen + écart-type + observation
     3. Confirmation succès
   Persist : NOTES_TERRAIN (5-col) via offline queue.
   ═════════════════════════════════════════════════════════════════════════ */

interface QuickPeseeFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

interface PeseeFormState {
  nbPeses: string;
  poidsMoyen: string;
  ecartType: string;
  observation: string;
}

const INITIAL_STATE: PeseeFormState = {
  nbPeses: '',
  poidsMoyen: '',
  ecartType: '',
  observation: '',
};

/** DD/MM/YYYY → Date | null */
function parseFrDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Jours écoulés depuis une date DD/MM/YYYY (positif = passé). */
function jFrom(frDate: string | undefined): number | null {
  const dt = parseFrDate(frDate);
  if (!dt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - dt.getTime()) / 86_400_000);
}

const QuickPeseeForm: React.FC<QuickPeseeFormProps> = ({ isOpen, onClose }) => {
  const { bandes } = useFarm();

  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState('');
  const [selectedBande, setSelectedBande] = useState<BandePorcelets | null>(null);
  const [form, setForm] = useState<PeseeFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  // ── Bandes éligibles (Sous mère ou Sevrés) + filtre recherche ─────────
  const eligibleBandes = useMemo<BandePorcelets[]>(() => {
    const q = query.trim().toLowerCase();
    return bandes.filter(b => {
      const statut = (b.statut ?? '').toLowerCase();
      const isEligible =
        statut.includes('sous') ||
        statut.includes('sevr') ||
        statut.includes('mère');
      if (!isEligible) return false;
      if (!q) return true;
      const hay = [b.idPortee, b.id, b.truie, b.boucleMere]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bandes, query]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const resetAll = useCallback((): void => {
    setStep(1);
    setQuery('');
    setSelectedBande(null);
    setForm(INITIAL_STATE);
    setErrors({});
    setSubmitError('');
    setSaving(false);
  }, []);

  const handleClose = useCallback((): void => {
    resetAll();
    onClose();
  }, [onClose, resetAll]);

  const handleSelectBande = (b: BandePorcelets): void => {
    setSelectedBande(b);
    setForm(prev => ({
      ...prev,
      nbPeses: b.vivants !== undefined ? String(b.vivants) : '',
    }));
    setErrors({});
    setStep(2);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const nb = Number(form.nbPeses);
    const poids = Number(form.poidsMoyen.replace(',', '.'));
    const ecart = form.ecartType.trim()
      ? Number(form.ecartType.replace(',', '.'))
      : null;

    if (!selectedBande) next.bande = 'Bande requise';
    if (!Number.isFinite(nb) || nb <= 0) {
      next.nbPeses = 'Nombre > 0 requis';
    } else if (selectedBande?.vivants !== undefined && nb > selectedBande.vivants) {
      next.nbPeses = `Max ${selectedBande.vivants} vivants`;
    }
    if (!Number.isFinite(poids) || poids <= 0) {
      next.poidsMoyen = 'Poids > 0 requis';
    } else if (poids >= 50) {
      next.poidsMoyen = 'Poids < 50 kg';
    }
    if (ecart !== null) {
      if (!Number.isFinite(ecart) || ecart < 0) {
        next.ecartType = 'Écart-type ≥ 0';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedBande) return;
    if (!validate()) return;

    setSaving(true);
    setSubmitError('');

    try {
      const nb = Number(form.nbPeses);
      const poids = Number(form.poidsMoyen.replace(',', '.'));
      const ecart = form.ecartType.trim()
        ? Number(form.ecartType.replace(',', '.'))
        : null;
      const obs = form.observation.trim();
      const jMB = jFrom(selectedBande.dateMB);
      const jTag = jMB !== null ? ` · J+${jMB}` : '';
      const ecartTag = ecart !== null ? ` ±${ecart}` : '';
      const obsTag = obs ? ` · ${obs}` : '';

      const note = `Pesée ${nb} porcelets · ${poids}kg moy${ecartTag}${jTag}${obsTag}`;

      const author =
        typeof window !== 'undefined'
          ? localStorage.getItem('user_name') || 'Anonyme'
          : 'Anonyme';

      const row: string[] = [
        new Date().toISOString().slice(0, 10), // DATE YYYY-MM-DD
        'BANDE',                                // TYPE_ANIMAL
        selectedBande.id,                       // ID_ANIMAL
        note,                                   // NOTE
        author,                                 // AUTEUR
      ];

      await enqueueAppendRow('NOTES_TERRAIN', row);
      setStep(3);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Erreur enregistrement pesée',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Pré-calculs pour Étape 2 / 3 ─────────────────────────────────────
  const jSinceMB = selectedBande ? jFrom(selectedBande.dateMB) : null;
  const successSummary = useMemo(() => {
    if (step !== 3 || !selectedBande) return null;
    const nb = Number(form.nbPeses) || 0;
    const poids = form.poidsMoyen.replace(',', '.');
    const jTag = jSinceMB !== null ? ` · J+${jSinceMB}` : '';
    return `${nb} porcelets · ${poids} kg moyen${jTag}`;
  }, [step, selectedBande, form.nbPeses, form.poidsMoyen, jSinceMB]);

  const isValid =
    selectedBande !== null &&
    form.nbPeses.trim() !== '' &&
    form.poidsMoyen.trim() !== '' &&
    Object.keys(errors).length === 0;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Pesée rapide · Bande"
      height="full"
    >
      <div
        role="dialog"
        aria-labelledby="pesee-form-heading"
        aria-modal="true"
        className="space-y-5"
      >
        {/* ── Stepper ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-center gap-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          aria-label={`Étape ${step} sur 3`}
        >
          {[1, 2, 3].map(n => {
            const active = n === step;
            const done = n < step;
            return (
              <span
                key={n}
                aria-hidden="true"
                className={[
                  'h-1.5 rounded-full transition-all duration-[220ms]',
                  active ? 'w-8 bg-accent' : done ? 'w-4 bg-accent/60' : 'w-4 bg-border',
                ].join(' ')}
              />
            );
          })}
        </div>

        {/* ── Heading sr-only ──────────────────────────────────────── */}
        <h2 id="pesee-form-heading" className="sr-only">
          Pesée rapide bande — étape {step}
        </h2>

        {/* ══════════════ ÉTAPE 1 — Sélection bande ══════════════════ */}
        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <Scale size={18} aria-hidden="true" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Choisir la bande à peser
              </p>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label
                htmlFor="pesee-search"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Rechercher
              </label>
              <div
                className={[
                  'flex items-center gap-2 h-11 px-3 rounded-md',
                  'bg-bg-0 border border-border',
                  'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
                  'transition-colors duration-[160ms]',
                ].join(' ')}
              >
                <Search size={14} className="text-text-2 shrink-0" aria-hidden="true" />
                <input
                  id="pesee-search"
                  type="search"
                  aria-label="Rechercher par ID portée ou boucle mère"
                  className="flex-1 bg-transparent outline-none font-mono text-[13px] text-text-0 placeholder:text-text-2"
                  placeholder="ID portée, truie, boucle mère…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Liste bandes éligibles */}
            {eligibleBandes.length === 0 ? (
              <div className="card-dense">
                <p className="font-mono text-[12px] text-text-2">
                  {query.trim()
                    ? 'Aucune bande ne correspond à la recherche.'
                    : 'Aucune bande éligible (Sous mère ou Sevrés).'}
                </p>
              </div>
            ) : (
              <ul
                className="card-dense !p-0 overflow-hidden"
                aria-label="Bandes éligibles"
              >
                {eligibleBandes.map(b => {
                  const j = jFrom(b.dateMB);
                  const vivants = b.vivants ?? 0;
                  const sevrageDate = b.dateSevragePrevue ?? '—';
                  const primary = [
                    b.idPortee || b.id,
                    b.truie ? `· ${b.truie}` : '',
                    b.boucleMere ? `· ${b.boucleMere}` : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const secondary =
                    `Sevrage ${sevrageDate} · ${vivants} vivants` +
                    (j !== null ? ` · J+${j}` : '');
                  return (
                    <li key={b.id}>
                      <DataRow
                        primary={primary}
                        secondary={secondary}
                        accessory={
                          <ChevronRight
                            size={14}
                            className="text-text-2"
                            aria-hidden="true"
                          />
                        }
                        onClick={() => handleSelectBande(b)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {/* ══════════════ ÉTAPE 2 — Saisie ═══════════════════════════ */}
        {step === 2 && selectedBande ? (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Bande sélectionnée */}
            <div className="card-dense !p-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                aria-label="Changer de bande"
                className="pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-wide text-text-2">
                  Bande
                </div>
                <div className="truncate font-mono text-[13px] text-text-0 tabular-nums">
                  {selectedBande.idPortee || selectedBande.id}
                  {selectedBande.truie ? ` · ${selectedBande.truie}` : ''}
                  {selectedBande.boucleMere ? ` · ${selectedBande.boucleMere}` : ''}
                </div>
                <div className="font-mono text-[11px] text-text-2 tabular-nums">
                  {selectedBande.vivants ?? 0} vivants
                  {jSinceMB !== null ? ` · J+${jSinceMB}` : ''}
                </div>
              </div>
            </div>

            {/* Nombre pesés */}
            <div className="space-y-1.5">
              <label
                htmlFor="pesee-nb"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Nombre pesés
              </label>
              <input
                id="pesee-nb"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Nombre de porcelets pesés"
                aria-invalid={!!errors.nbPeses}
                aria-describedby={errors.nbPeses ? 'pesee-nb-error' : undefined}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[20px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.nbPeses ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0"
                value={form.nbPeses}
                onChange={e =>
                  setForm(f => ({ ...f, nbPeses: e.target.value.replace(/[^\d]/g, '') }))
                }
                disabled={saving}
              />
              {errors.nbPeses ? (
                <p
                  id="pesee-nb-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.nbPeses}
                </p>
              ) : null}
            </div>

            {/* Poids moyen — champ signature, font-size XL */}
            <div className="space-y-1.5">
              <label
                htmlFor="pesee-poids"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Poids moyen (kg)
              </label>
              <input
                id="pesee-poids"
                type="text"
                inputMode="decimal"
                aria-label="Poids moyen en kilogrammes"
                aria-invalid={!!errors.poidsMoyen}
                aria-describedby={errors.poidsMoyen ? 'pesee-poids-error' : undefined}
                className={[
                  'w-full h-16 rounded-md px-4',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[28px] tabular-nums text-center',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.poidsMoyen ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0.0"
                value={form.poidsMoyen}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    poidsMoyen: e.target.value.replace(/[^\d.,]/g, ''),
                  }))
                }
                disabled={saving}
              />
              {errors.poidsMoyen ? (
                <p
                  id="pesee-poids-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.poidsMoyen}
                </p>
              ) : null}
            </div>

            {/* Écart-type */}
            <div className="space-y-1.5">
              <label
                htmlFor="pesee-ecart"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Écart-type (kg) <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="pesee-ecart"
                type="text"
                inputMode="decimal"
                aria-label="Écart-type en kilogrammes"
                aria-invalid={!!errors.ecartType}
                aria-describedby={errors.ecartType ? 'pesee-ecart-error' : undefined}
                className={[
                  'w-full h-11 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[14px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.ecartType ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0.0"
                value={form.ecartType}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    ecartType: e.target.value.replace(/[^\d.,]/g, ''),
                  }))
                }
                disabled={saving}
              />
              {errors.ecartType ? (
                <p
                  id="pesee-ecart-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.ecartType}
                </p>
              ) : null}
            </div>

            {/* Observation */}
            <div className="space-y-1.5">
              <label
                htmlFor="pesee-obs"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Observation <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <textarea
                id="pesee-obs"
                aria-label="Observation de la pesée"
                className={[
                  'w-full rounded-md px-3 py-3',
                  'bg-bg-0 border border-border text-text-0 placeholder:text-text-2',
                  'font-mono text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  'min-h-[80px] resize-y',
                  'hover:border-text-2',
                ].join(' ')}
                placeholder="Note terrain…"
                value={form.observation}
                onChange={e => setForm(f => ({ ...f, observation: e.target.value }))}
                disabled={saving}
              />
            </div>

            {submitError ? (
              <p role="alert" className="font-mono text-[11px] text-red">
                {submitError}
              </p>
            ) : null}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
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
                aria-label="Enregistrer la pesée"
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
                  'Enregistrer'
                )}
              </button>
            </div>
          </form>
        ) : null}

        {/* ══════════════ ÉTAPE 3 — Succès ═══════════════════════════ */}
        {step === 3 ? (
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
              Pesée enregistrée
            </p>
            {successSummary ? (
              <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-text-2 tabular-nums text-center px-4">
                {successSummary}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleClose}
              className="pressable mt-8 h-12 px-8 rounded-md bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              OK
            </button>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
};

export default QuickPeseeForm;
