/**
 * QuickSaillieBandeForm — V6-B (Vague 6 Bandes multi-mères + Loges, Sprint 3)
 * ════════════════════════════════════════════════════════════════════════
 * Saillie en bande : N truies × 1 verrat × 1 date.
 *
 * Workflow 3 steps :
 *   1. Sélection multi-truies (filtrées VIDE / CHALEUR / En attente saillie).
 *      Min 2 truies obligatoire.
 *   2. Sélection 1 verrat (radio).
 *   3. Date saillie + notes optionnelles + submit.
 *
 * Submit → INSERT N rows dans `saillies` (1 par truie, même verrat,
 * même date, même notes). Best-effort : log les échecs sans bloquer.
 *
 * MIGRATION FORM_CONTRACT Phase 2 (batch A) — PARTIELLE :
 *  - helpers date partagés `_formHelpers` (todayIso / formatFr) ✓
 *  - garde double-clic propre : `closeTimerRef` + cleanup `useEffect` ✓
 *  - reset-on-open render-phase (déjà conforme) ✓
 *  - shell `<QuickActionSheet>` NON appliqué : ce form est un wizard 3-step
 *    navigable (boutons Retour / Suivant / Enregistrer dynamiques) que le
 *    footer fixe du shell (Annuler + 1 submit) ne peut pas porter. Le
 *    `BottomSheet` + footer wizard custom sont conservés (cf. section SPEC).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import {
  ArrowRight,
  CheckCircle2,
  Heart,
} from 'lucide-react';

import { BottomSheet } from '../agritech';
import { Button, Input, Textarea } from '@/design-system';
import { useFarm } from '../../context/FarmContext';
import {
  insertSaillie,
  resolveBoarIdByCode,
  resolveSowIdByCode,
} from '../../services/supabaseWrites';
import { useEscapeKey } from './useFormA11y';
import { normaliseStatut } from '../../lib/truieStatut';
import type { Truie, Verrat } from '../../types/farm';
import { todayIso, formatFr } from './_formHelpers';

export interface QuickSaillieBandeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3;

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isTruieDispo(t: Truie): boolean {
  const c = normaliseStatut(t.statut);
  if (c === 'VIDE') return true;
  return c !== 'PLEINE' && c !== 'MATERNITE' && c !== 'REFORME';
}

const QuickSaillieBandeForm: React.FC<QuickSaillieBandeFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { truies, verrats, refreshData } = useFarm();

  const [step, setStep] = useState<Step>(1);
  const [selectedTruieIds, setSelectedTruieIds] = useState<string[]>([]);
  const [selectedVerratId, setSelectedVerratId] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(todayIso());
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    if (isOpen) {
      setStep(1);
      setSelectedTruieIds([]);
      setSelectedVerratId('');
      setDateIso(todayIso());
      setNotes('');
      setSaving(false);
      setSuccess(false);
      setError('');
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEscapeKey(isOpen && !saving, onClose);

  const truiesDispo = useMemo<Truie[]>(
    () => truies.filter(isTruieDispo),
    [truies],
  );

  const verratsActifs = useMemo<Verrat[]>(
    () =>
      verrats.filter(v => {
        const s = (v.statut ?? '').toLowerCase();
        return !/réform|reforme|morte|sortie/.test(s);
      }),
    [verrats],
  );

  const dateMBPrevue = useMemo(() => addDays(dateIso, 115), [dateIso]);

  const toggleTruie = (displayId: string): void => {
    setSelectedTruieIds(prev =>
      prev.includes(displayId)
        ? prev.filter(id => id !== displayId)
        : [...prev, displayId],
    );
  };

  const goNext = (): void => {
    setError('');
    if (step === 1) {
      if (selectedTruieIds.length < 2) {
        setError(
          'Sélectionne au moins 2 truies (saillie individuelle = QuickSaillieForm)',
        );
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!selectedVerratId) {
        setError('Sélectionne un verrat');
        return;
      }
      setStep(3);
      return;
    }
  };

  const goPrev = (): void => {
    setError('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async (): Promise<void> => {
    setError('');
    if (selectedTruieIds.length < 2) {
      setError('Au moins 2 truies requises');
      return;
    }
    if (!selectedVerratId) {
      setError('Verrat requis');
      return;
    }
    if (!dateIso) {
      setError('Date requise');
      return;
    }
    setSaving(true);

    let boarId: string | null = null;
    try {
      boarId = await resolveBoarIdByCode(selectedVerratId);
    } catch (e) {
      console.warn('[saillie-bande] resolve verrat failed', e);
    }

    const failures: string[] = [];
    for (const truieCode of selectedTruieIds) {
      let sowId: string | null = null;
      try {
        sowId = await resolveSowIdByCode(truieCode);
      } catch (e) {
        console.warn('[saillie-bande] resolve truie failed', truieCode, e);
      }
      try {
        await insertSaillie({
          sow_id: sowId,
          boar_id: boarId,
          sow_code_id: truieCode,
          boar_code_id: selectedVerratId,
          date_saillie: dateIso,
          statut: 'SAILLIE',
          notes: notes.trim() || 'Saillie en bande',
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(`${truieCode}: ${msg}`);
      }
    }

    if (failures.length === selectedTruieIds.length) {
      setError(`Échec total — ${failures[0]}`);
      setSaving(false);
      return;
    }
    if (failures.length > 0) {
      setToast({
        open: true,
        message: `Partiel · ${failures.length} échec(s)`,
      });
    } else {
      setToast({
        open: true,
        message: `${selectedTruieIds.length} saillies enregistrées · MB prévue ${formatFr(dateMBPrevue)}`,
      });
    }

    setSuccess(true);
    try {
      await refreshData(true);
    } catch {
      /* noop */
    }
    onSuccess?.();
    // Garde double-clic : `saving` reste true jusqu'au onClose, timer suivi
    // par closeTimerRef + cleanup useEffect (FORM_CONTRACT).
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setSuccess(false);
      setSaving(false);
      onClose();
    }, 1400);
  };

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderStep1 = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 border-b border-border bg-bg-1 px-4 py-3">
        <p className="text-[12px] uppercase tracking-wide text-text-2">
          Étape 1 / 3 — Truies à saillir
        </p>
        <p className="mt-1 font-heading text-[16px] uppercase tracking-wide tabular-nums">
          {selectedTruieIds.length} truie(s) sélectionnée(s)
        </p>
      </div>

      {truiesDispo.length === 0 ? (
        <p className="text-[12px] uppercase tracking-wide text-text-2">
          Aucune truie disponible (vide / chaleur)
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Truies disponibles">
          {truiesDispo.map(t => {
            const checked = selectedTruieIds.includes(t.displayId);
            return (
              <li key={t.id}>
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-bg-0 p-3 hover:border-accent"
                  data-testid={`truie-${t.displayId}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTruie(t.displayId)}
                    className="h-5 w-5 accent-accent"
                    aria-label={`Sélectionner ${t.displayId}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate ft-code tabular-nums text-[13px] text-text-0">
                      {t.displayId}
                      {t.nom ? ` · ${t.nom}` : ''}
                    </p>
                    <p className="text-mono-label text-text-2">
                      {t.statut}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const renderStep2 = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 border-b border-border bg-bg-1 px-4 py-3">
        <p className="text-[12px] uppercase tracking-wide text-text-2">
          Étape 2 / 3 — Verrat
        </p>
        <p className="mt-1 font-heading text-[16px] uppercase tracking-wide tabular-nums">
          {selectedTruieIds.length} truies × 1 verrat
        </p>
      </div>

      {verratsActifs.length === 0 ? (
        <p className="text-[12px] uppercase tracking-wide text-text-2">
          Aucun verrat actif
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Sélectionner un verrat"
          className="flex flex-wrap gap-2"
        >
          {verratsActifs.map(v => {
            const isSel = selectedVerratId === v.displayId;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={isSel}
                aria-label={`Sélectionner verrat ${v.displayId}`}
                data-testid={`verrat-${v.displayId}`}
                onClick={() => setSelectedVerratId(v.displayId)}
                className={[
                  'pressable inline-flex items-center justify-center',
                  'h-9 px-3 rounded-md border',
                  'ft-code text-[12px] uppercase tracking-wide tabular-nums',
                  isSel
                    ? 'bg-accent text-bg-0 border-accent font-semibold'
                    : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                ].join(' ')}
              >
                {v.displayId}
                {v.nom ? ` · ${v.nom}` : ''}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStep3 = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 border-b border-border bg-bg-1 px-4 py-3">
        <p className="text-[12px] uppercase tracking-wide text-text-2">
          Étape 3 / 3 — Date & notes
        </p>
        <p className="mt-1 font-heading text-[16px] uppercase tracking-wide tabular-nums">
          {selectedTruieIds.length} saillies · MB prévue {formatFr(dateMBPrevue)}
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="saillie-bande-date"
          className="block text-mono-label text-text-2"
        >
          Date de saillie
        </label>
        <Input
          id="saillie-bande-date"
          type="date"
          value={dateIso}
          onChange={e => setDateIso(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="saillie-bande-notes"
          className="block text-mono-label text-text-2"
        >
          Notes <span className="text-text-2 normal-case">· optionnel</span>
        </label>
        <Textarea
          id="saillie-bande-notes"
          maxLength={200}
          placeholder="Ex: lot saillie semaine 18…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div className="rounded-md border border-border bg-bg-0 p-3">
        <p className="mb-2 text-mono-label text-text-2">
          Récapitulatif
        </p>
        <ul className="space-y-1">
          {selectedTruieIds.map(id => (
            <li
              key={id}
              className="ft-code tabular-nums text-[12px] text-text-0"
            >
              {id} × {selectedVerratId} · {formatFr(dateIso)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Saillie en bande"
        height="full"
      >
        {success ? (
          <div
            className="flex flex-col items-center justify-center py-20"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={38}
              className="mb-4 text-accent"
              strokeWidth={2}
              aria-hidden="true"
            />
            <p className="font-heading text-[18px] uppercase tracking-wide">
              {selectedTruieIds.length} saillies enregistrées
            </p>
            <p className="mt-2 text-[12px] uppercase tracking-wide text-text-2">
              MB prévue {formatFr(dateMBPrevue)}
            </p>
          </div>
        ) : (
          <div className="space-y-5" aria-label="Wizard saillie en bande">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <Heart size={18} aria-hidden="true" />
              </div>
              <p className="text-mono-label text-text-1">
                N truies × 1 verrat × 1 date
              </p>
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {error && (
              <p
                role="alert"
                className="text-mono-label text-red"
              >
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end px-4 py-3 border-t border-border">
              {step > 1 ? (
                <Button
                  variant="secondary"
                  onClick={goPrev}
                  disabled={saving}
                >
                  Retour
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Annuler
                </Button>
              )}

              {step < 3 ? (
                <Button
                  variant="primary"
                  onClick={goNext}
                  disabled={
                    saving ||
                    (step === 1 && selectedTruieIds.length < 2) ||
                    (step === 2 && !selectedVerratId)
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    Suivant
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={saving}
                  aria-busy={saving}
                >
                  {saving ? (
                    <span className="animate-pulse">Enregistrement…</span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Enregistrer {selectedTruieIds.length} saillies
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      <IonToast
        isOpen={toast.open}
        message={toast.message}
        duration={2400}
        position="bottom"
        onDidDismiss={() => setToast({ open: false, message: '' })}
      />
    </>
  );
};

export default QuickSaillieBandeForm;
