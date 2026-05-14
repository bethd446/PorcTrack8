import React, { useMemo, useState, useCallback } from 'react';
import { SplitSquareHorizontal, Search, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import {
  insertNote,
  updateBatchByCode,
} from '../../services/supabaseWrites';
import { safeDate } from '../../lib/truieHelpers';
import { BottomSheet, DataRow } from '../agritech';
import { Button, Input, Textarea } from '@/design-system';
import { bandesAEligibleSeparation } from '../../services/bandesAggregator';
import type { BandePorcelets } from '../../types/farm';
import { kvGet } from '../../services/kvStore';
import { todayIso } from './_formHelpers';

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
  const [d, m, y] = parts;
  return safeDate(`${y}-${m}-${d}`);
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
  const { user } = useAuth();

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

      // FIX V23-AUDIT-2 : author_id doit être un UUID Supabase auth.user.id.
      const authorId = user?.id ?? null;

      await insertNote({
        content: `[BANDE:${selectedBande.id}] ${note}`,
        category: 'SEPARATION',
        author_id: authorId,
      });

      // Le schéma batches Supabase n'a pas nb_males / nb_femelles /
      // date_separation : on log la séparation dans notes (champ existant)
      // pour ne pas perdre l'info.
      await updateBatchByCode(selectedBande.id, {
        notes: `Séparation ${form.dateSeparation} · ${males}M · ${femelles}F`,
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
              <p className="text-mono-label text-text-1">
                Choisir la bande à séparer
              </p>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label
                htmlFor="sep-search"
                className="block text-mono-label text-text-2"
              >
                Rechercher
              </label>
              <div className="flex items-center gap-2">
                <Search size={14} className="text-text-2 shrink-0" aria-hidden="true" />
                <Input
                  id="sep-search"
                  type="search"
                  aria-label="Rechercher par ID portée, truie ou boucle mère"
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
                <p className="text-[12px] text-text-2">
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
              <Button
                variant="secondary"
                size="small"
                onClick={() => setStep(1)}
                aria-label="Changer de bande"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="text-mono-micro text-text-2">
                  Bande
                </div>
                <div className="truncate ft-code tabular-nums text-[13px] text-text-0">
                  {selectedBande.idPortee || selectedBande.id}
                  {selectedBande.truie ? ` · ${selectedBande.truie}` : ''}
                  {selectedBande.boucleMere ? ` · ${selectedBande.boucleMere}` : ''}
                </div>
                <div className="text-[11px] text-text-2 tabular-nums">
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
                  className="block text-mono-label text-text-2"
                >
                  Mâles
                </label>
                <Input
                  id="sep-males"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Nombre de mâles"
                  aria-invalid={!!errors.nbMales}
                  aria-describedby={errors.nbMales ? 'sep-males-error' : undefined}
                  invalid={!!errors.nbMales}
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
                  className="block text-mono-label text-text-2"
                >
                  Femelles
                </label>
                <Input
                  id="sep-femelles"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Nombre de femelles"
                  aria-invalid={!!errors.nbFemelles}
                  aria-describedby={errors.nbFemelles ? 'sep-femelles-error' : undefined}
                  invalid={!!errors.nbFemelles}
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
              <span className="text-mono-label text-text-2">
                Total séparé
              </span>
              <span className="font-mono text-[16px] tabular-nums text-text-0">
                {totalSaisi} / {totalVivants}
              </span>
            </div>

            {errors.nbMales ? (
              <p id="sep-males-error" role="alert" className="text-[11px] text-red">
                {errors.nbMales}
              </p>
            ) : null}
            {errors.nbFemelles && errors.nbFemelles !== errors.nbMales ? (
              <p id="sep-femelles-error" role="alert" className="text-[11px] text-red">
                {errors.nbFemelles}
              </p>
            ) : null}

            {/* Date séparation */}
            <div className="space-y-1.5">
              <label
                htmlFor="sep-date"
                className="block text-mono-label text-text-2"
              >
                Date séparation
              </label>
              <Input
                id="sep-date"
                type="date"
                aria-label="Date de séparation"
                aria-invalid={!!errors.dateSeparation}
                aria-describedby={errors.dateSeparation ? 'sep-date-error' : undefined}
                invalid={!!errors.dateSeparation}
                value={form.dateSeparation}
                onChange={e => setForm(f => ({ ...f, dateSeparation: e.target.value }))}
                disabled={saving}
              />
              {errors.dateSeparation ? (
                <p
                  id="sep-date-error"
                  role="alert"
                  className="text-[11px] text-red"
                >
                  {errors.dateSeparation}
                </p>
              ) : null}
            </div>

            {/* Observation */}
            <div className="space-y-1.5">
              <label
                htmlFor="sep-obs"
                className="block text-mono-label text-text-2"
              >
                Observation <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <Textarea
                id="sep-obs"
                aria-label="Observation de la séparation"
                placeholder="Note terrain…"
                value={form.observation}
                onChange={e => setForm(f => ({ ...f, observation: e.target.value }))}
                disabled={saving}
              />
            </div>

            {submitError ? (
              <p role="alert" className="text-[11px] text-red">
                {submitError}
              </p>
            ) : null}

            {/* Actions */}
            <div className="flex gap-3 justify-end px-4 py-3 border-t border-border">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={saving || !isValid}
                aria-label="Enregistrer la séparation"
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  'Enregistrer'
                )}
              </Button>
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
              size={38}
              className="text-accent mb-4"
              aria-hidden="true"
              strokeWidth={2}
            />
            <p className="agritech-heading text-[18px] uppercase tracking-wide">
              Séparation enregistrée
            </p>
            {successSummary ? (
              <p className="mt-2 text-[12px] uppercase tracking-wide text-text-2 tabular-nums text-center px-4">
                {successSummary}
              </p>
            ) : null}

            <div className="mt-8">
              <Button
                variant="primary"
                onClick={handleClose}
              >
                OK
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
};

export default QuickSexSeparationForm;
