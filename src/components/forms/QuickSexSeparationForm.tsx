import React, { useMemo, useState, useCallback } from 'react';
import { SplitSquareHorizontal, Search, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { enqueueAppendRow, enqueueUpdateRow } from '../../services/offlineQueue';
import { BottomSheet, DataRow } from '../agritech';
import { bandesAEligibleSeparation } from '../../services/bandesAggregator';
import type { BandePorcelets } from '../../types/farm';

/* ═════════════════════════════════════════════════════════════════════════
   QuickSexSeparationForm · Séparation par sexe d'une bande d'engraissement
   ─────────────────────────────────────────────────────────────────────────
   Contexte terrain (K13) :
     À J+70 post-sevrage, les porcelets mixtes sont séparés en 2 loges :
       - 1 loge mâles (logeEngraissement='M')
       - 1 loge femelles (logeEngraissement='F')
     jusqu'à la finition.

   Flow 3 étapes :
     1. Sélection bande (phase ENGRAISSEMENT, non séparée — via
        `bandesAEligibleSeparation`)
     2. Saisie nbMales + nbFemelles + dateSéparation + observation
        Validation : nbMales + nbFemelles <= bande.vivants
     3. Confirmation succès ("X mâles en loge M · Y femelles en loge F")

   Persistance :
     - Append NOTES_TERRAIN row (5-col canonical)
     - Update PORCELETS_BANDES (patch nbMales/nbFemelles/dateSeparation)
       via offline queue. Le worker côté Sheets ignore un patch si la colonne
       n'existe pas — compatible schéma incrémental.
   ═════════════════════════════════════════════════════════════════════════ */

interface QuickSexSeparationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

interface SeparationFormState {
  nbMales: string;
  nbFemelles: string;
  dateSeparation: string;
  observation: string;
}

/** Retourne la date du jour au format YYYY-MM-DD (ISO court). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialFormState(): SeparationFormState {
  return {
    nbMales: '',
    nbFemelles: '',
    dateSeparation: todayIso(),
    observation: '',
  };
}

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

/** YYYY-MM-DD → DD/MM (court pour la note terrain). */
function isoToShortFr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}`;
}

const QuickSexSeparationForm: React.FC<QuickSexSeparationFormProps> = ({ isOpen, onClose }) => {
  const { bandes } = useFarm();

  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState('');
  const [selectedBande, setSelectedBande] = useState<BandePorcelets | null>(null);
  const [form, setForm] = useState<SeparationFormState>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  // ── Bandes éligibles à la séparation ──────────────────────────────────
  const eligibleBandes = useMemo<BandePorcelets[]>(() => {
    const q = query.trim().toLowerCase();
    const list = bandesAEligibleSeparation(bandes);
    if (!q) return list;
    return list.filter(b => {
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
    setForm(initialFormState());
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
    setErrors({});
    setStep(2);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const males = Number(form.nbMales);
    const femelles = Number(form.nbFemelles);
    const totalVivants = selectedBande?.vivants ?? 0;
    const total = males + femelles;

    if (!selectedBande) next.bande = 'Bande requise';
    if (!Number.isFinite(males) || males < 0) {
      next.nbMales = 'Nombre de mâles requis (≥ 0)';
    }
    if (!Number.isFinite(femelles) || femelles < 0) {
      next.nbFemelles = 'Nombre de femelles requis (≥ 0)';
    }
    if (total <= 0) {
      next.nbMales = next.nbMales || 'Au moins un porcelet à séparer';
    }
    if (selectedBande && total > totalVivants) {
      next.nbMales = `Total ${total} > ${totalVivants} vivants`;
      next.nbFemelles = `Total ${total} > ${totalVivants} vivants`;
    }
    if (!form.dateSeparation) {
      next.dateSeparation = 'Date requise';
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
      const males = Number(form.nbMales);
      const femelles = Number(form.nbFemelles);
      const obs = form.observation.trim();
      const dateShort = isoToShortFr(form.dateSeparation);
      const obsTag = obs ? ` · ${obs}` : '';

      const note = `Séparation sexe · ${males} mâles · ${femelles} femelles · date=${dateShort}${obsTag}`;

      const author =
        typeof window !== 'undefined'
          ? localStorage.getItem('user_name') || 'Anonyme'
          : 'Anonyme';

      const row: string[] = [
        form.dateSeparation,     // DATE (ISO YYYY-MM-DD)
        'BANDE',                 // TYPE_ANIMAL
        selectedBande.id,        // ID_ANIMAL
        note,                    // NOTE
        author,                  // AUTEUR
      ];

      await enqueueAppendRow('NOTES_TERRAIN', row);

      // Patch best-effort sur PORCELETS_BANDES — le worker ignore silencieusement
      // les clés du patch dont la colonne n'existe pas côté Sheets.
      await enqueueUpdateRow('PORCELETS_BANDES', 'ID Portée', selectedBande.id, {
        nbMales: males,
        nbFemelles: femelles,
        dateSeparation: form.dateSeparation,
      });

      setStep(3);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Erreur enregistrement séparation',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Pré-calculs ──────────────────────────────────────────────────────
  const jSinceSevrage = useMemo<number | null>(() => {
    if (!selectedBande) return null;
    return jFrom(selectedBande.dateSevrageReelle ?? selectedBande.dateSevragePrevue);
  }, [selectedBande]);

  const successSummary = useMemo(() => {
    if (step !== 3 || !selectedBande) return null;
    const males = Number(form.nbMales) || 0;
    const femelles = Number(form.nbFemelles) || 0;
    return `${males} mâles en loge M · ${femelles} femelles en loge F`;
  }, [step, selectedBande, form.nbMales, form.nbFemelles]);

  const totalSaisi = (Number(form.nbMales) || 0) + (Number(form.nbFemelles) || 0);
  const totalVivants = selectedBande?.vivants ?? 0;
  const totalOk = totalSaisi > 0 && totalSaisi <= totalVivants;

  const isValid =
    selectedBande !== null &&
    form.nbMales.trim() !== '' &&
    form.nbFemelles.trim() !== '' &&
    totalOk &&
    form.dateSeparation !== '' &&
    Object.keys(errors).length === 0;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Séparation sexe · Bande"
      height="full"
    >
      <div
        role="dialog"
        aria-labelledby="sep-form-heading"
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
        <h2 id="sep-form-heading" className="sr-only">
          Séparation sexe bande — étape {step}
        </h2>

        {/* ══════════════ ÉTAPE 1 — Sélection bande ══════════════════ */}
        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <SplitSquareHorizontal size={18} aria-hidden="true" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Choisir la bande à séparer
              </p>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label
                htmlFor="sep-search"
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
                  id="sep-search"
                  type="search"
                  aria-label="Rechercher par ID portée, truie ou boucle mère"
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
                    : 'Aucune bande éligible. Les bandes en engraissement (J+70 post-sevrage) non encore séparées apparaissent ici.'}
                </p>
              </div>
            ) : (
              <ul
                className="card-dense !p-0 overflow-hidden"
                aria-label="Bandes éligibles à la séparation sexe"
              >
                {eligibleBandes.map(b => {
                  const jSev = jFrom(b.dateSevrageReelle ?? b.dateSevragePrevue);
                  const vivants = b.vivants ?? 0;
                  const primary = [
                    b.idPortee || b.id,
                    b.truie ? `· ${b.truie}` : '',
                    b.boucleMere ? `· ${b.boucleMere}` : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const secondary =
                    `Vivants ${vivants}` +
                    (jSev !== null ? ` · J+${jSev} post-sevrage` : '');
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
                  {jSinceSevrage !== null ? ` · J+${jSinceSevrage} post-sevrage` : ''}
                </div>
              </div>
            </div>

            {/* Grille Mâles / Femelles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="sep-males"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Mâles
                </label>
                <input
                  id="sep-males"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Nombre de mâles"
                  aria-invalid={!!errors.nbMales}
                  aria-describedby={errors.nbMales ? 'sep-males-error' : undefined}
                  className={[
                    'w-full h-16 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'font-mono text-[28px] tabular-nums text-center',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.nbMales ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
                  placeholder="0"
                  value={form.nbMales}
                  onChange={e =>
                    setForm(f => ({ ...f, nbMales: e.target.value.replace(/[^\d]/g, '') }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="sep-femelles"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Femelles
                </label>
                <input
                  id="sep-femelles"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Nombre de femelles"
                  aria-invalid={!!errors.nbFemelles}
                  aria-describedby={errors.nbFemelles ? 'sep-femelles-error' : undefined}
                  className={[
                    'w-full h-16 rounded-md px-3',
                    'bg-bg-0 border text-text-0 placeholder:text-text-2',
                    'font-mono text-[28px] tabular-nums text-center',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.nbFemelles ? 'border-red' : 'border-border hover:border-text-2',
                  ].join(' ')}
                  placeholder="0"
                  value={form.nbFemelles}
                  onChange={e =>
                    setForm(f => ({ ...f, nbFemelles: e.target.value.replace(/[^\d]/g, '') }))
                  }
                  disabled={saving}
                />
              </div>
            </div>

            {/* Total live counter */}
            <div
              className={[
                'card-dense !p-3 flex items-center justify-between',
                totalSaisi > totalVivants ? 'border border-red' : '',
              ].join(' ')}
              aria-live="polite"
            >
              <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                Total séparé
              </span>
              <span className="font-mono text-[16px] tabular-nums text-text-0">
                {totalSaisi} / {totalVivants}
              </span>
            </div>

            {errors.nbMales ? (
              <p id="sep-males-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.nbMales}
              </p>
            ) : null}
            {errors.nbFemelles && errors.nbFemelles !== errors.nbMales ? (
              <p id="sep-femelles-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.nbFemelles}
              </p>
            ) : null}

            {/* Date séparation */}
            <div className="space-y-1.5">
              <label
                htmlFor="sep-date"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Date séparation
              </label>
              <input
                id="sep-date"
                type="date"
                aria-label="Date de séparation"
                aria-invalid={!!errors.dateSeparation}
                aria-describedby={errors.dateSeparation ? 'sep-date-error' : undefined}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[14px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.dateSeparation ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                value={form.dateSeparation}
                onChange={e => setForm(f => ({ ...f, dateSeparation: e.target.value }))}
                disabled={saving}
              />
              {errors.dateSeparation ? (
                <p
                  id="sep-date-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.dateSeparation}
                </p>
              ) : null}
            </div>

            {/* Observation */}
            <div className="space-y-1.5">
              <label
                htmlFor="sep-obs"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Observation <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <textarea
                id="sep-obs"
                aria-label="Observation de la séparation"
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
                aria-label="Enregistrer la séparation"
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
              Séparation enregistrée
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

export default QuickSexSeparationForm;
