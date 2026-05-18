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
 * MIGRATION FORM_CONTRACT Phase 3b (batch G) — WIZARD :
 *  - shell `<QuickActionSheet>` + prop `footer` custom (navigation 3 étapes
 *    Annuler/Retour · Suivant/Enregistrer), pattern QuickSplitBandeForm.
 *  - étape 1 → `<EntityPicker mode="chips" multi>` (sélection multi-truies).
 *  - étape 2 → `<EntityPicker mode="chips">` (verrat mono).
 *  - toast canonique `useToast()` (remplace l'`IonToast` local).
 *  - garde double-clic : `closeTimerRef` + cleanup `useEffect`.
 *  - reset-on-open render-phase (`lastIsOpen`).
 *
 * Les `getAriaLabel` des pickers préservent les `aria-label` contractuels
 * `Sélectionner {displayId}` / `Sélectionner verrat {displayId}` attendus
 * par les tests existants.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  insertSaillie,
  resolveBoarIdByCode,
  resolveSowIdByCode,
} from '../../services/supabaseWrites';
import { normaliseStatut } from '../../lib/truieStatut';
import type { Truie, Verrat } from '../../types/farm';
import { todayIso, formatFr } from './_formHelpers';
import { EntityPicker } from './_formFields';
import QuickActionSheet from './QuickActionSheet';

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
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [selectedTruieIds, setSelectedTruieIds] = useState<string[]>([]);
  const [selectedVerratId, setSelectedVerratId] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(todayIso());
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

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

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }, [onClose, saving]);

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

  const goNext = (): void => {
    if (saving) return;
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
    if (saving) return;
    setError('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (step !== 3) return;
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
    } catch (err) {
      console.warn('[saillie-bande] resolve verrat failed', err);
    }

    const failures: string[] = [];
    for (const truieCode of selectedTruieIds) {
      let sowId: string | null = null;
      try {
        sowId = await resolveSowIdByCode(truieCode);
      } catch (err) {
        console.warn('[saillie-bande] resolve truie failed', truieCode, err);
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push(`${truieCode}: ${msg}`);
      }
    }

    if (failures.length === selectedTruieIds.length) {
      setError(`Échec total — ${failures[0]}`);
      setSaving(false);
      return;
    }
    if (failures.length > 0) {
      showToast(`Partiel · ${failures.length} échec(s)`, 'info', 2400);
    } else {
      showToast(
        `${selectedTruieIds.length} saillies enregistrées · MB prévue ${formatFr(dateMBPrevue)}`,
        'success',
        2400,
      );
    }

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
      setSaving(false);
      onClose();
    }, 1400);
  };

  // ── Render des étapes ──────────────────────────────────────────────────

  const renderStep1 = (): React.ReactNode => (
    <div className="field">
      <div className="step-pill" aria-live="polite">
        Étape 1 / 3 · Truies à saillir
      </div>
      <label className="label--v77">
        TRUIES À SAILLIR <span className="req">requis</span>
      </label>
      <p
        className="tabular-nums"
        style={{
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 12,
          color: 'var(--pt-ink)',
          margin: '0 0 8px',
        }}
      >
        {selectedTruieIds.length} truie(s) sélectionnée(s)
      </p>
      <EntityPicker<Truie>
        mode="chips"
        multi
        entities={truiesDispo}
        value={selectedTruieIds}
        onChange={setSelectedTruieIds}
        entityLabel="la truie"
        groupLabel="Truies disponibles"
        emptyText="Aucune truie disponible (vide / chaleur)"
        disabled={saving}
        getAriaLabel={t => `Sélectionner ${t.displayId}`}
        renderSubLabel={t => t.statut}
      />
    </div>
  );

  const renderStep2 = (): React.ReactNode => (
    <div className="field">
      <div className="step-pill" aria-live="polite">
        Étape 2 / 3 · Verrat
      </div>
      <label className="label--v77">
        VERRAT <span className="req">requis</span>
      </label>
      <p
        className="tabular-nums"
        style={{
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 12,
          color: 'var(--pt-ink)',
          margin: '0 0 8px',
        }}
      >
        {selectedTruieIds.length} truies × 1 verrat
      </p>
      <EntityPicker<Verrat>
        mode="chips"
        entities={verratsActifs}
        value={selectedVerratId}
        onChange={setSelectedVerratId}
        entityLabel="le verrat"
        groupLabel="Sélectionner un verrat"
        emptyText="Aucun verrat actif"
        disabled={saving}
        getAriaLabel={v => `Sélectionner verrat ${v.displayId}`}
      />
    </div>
  );

  const renderStep3 = (): React.ReactNode => (
    <>
      <div className="step-pill" aria-live="polite">
        Étape 3 / 3 · Date & notes
      </div>
      <p
        className="tabular-nums"
        style={{
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 12,
          color: 'var(--pt-ink)',
          margin: '0 0 4px',
        }}
      >
        {selectedTruieIds.length} saillies · MB prévue {formatFr(dateMBPrevue)}
      </p>

      <div className="field">
        <label className="label--v77" htmlFor="saillie-bande-date">
          DATE DE SAILLIE
        </label>
        <input
          id="saillie-bande-date"
          className={`field__input mono${dateIso ? ' filled' : ' field__input--ghost'}`}
          type="date"
          aria-label="Date de saillie"
          value={dateIso}
          onChange={e => setDateIso(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="saillie-bande-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="saillie-bande-notes"
          className="field__input"
          style={{ minHeight: 80, resize: 'vertical' }}
          maxLength={200}
          placeholder="Ex: lot saillie semaine 18…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="calc-card" aria-label="Récapitulatif">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Récapitulatif</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {selectedTruieIds.map(id => (
            <li
              key={id}
              className="tabular-nums"
              style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)' }}
            >
              {id} × {selectedVerratId} · {formatFr(dateIso)}
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  // ── Footer custom wizard (remplace le footer canonique) ────────────────

  const nextDisabled =
    saving ||
    (step === 1 && selectedTruieIds.length < 2) ||
    (step === 2 && !selectedVerratId);
  const isLast = step === 3;
  const submitDisabled = saving || selectedTruieIds.length < 2 || !selectedVerratId || !dateIso;

  const footer = (
    <>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={step === 1 ? handleClose : goPrev}
        disabled={saving}
        aria-label={step === 1 ? 'Annuler et fermer' : "Revenir à l'étape précédente"}
      >
        {step === 1 ? 'Annuler' : 'Retour'}
      </button>
      {isLast ? (
        <button
          type="submit"
          className="btn btn--primary btn--lg btn--block"
          disabled={submitDisabled}
          aria-busy={saving}
          aria-label={`Enregistrer ${selectedTruieIds.length} saillies en bande`}
        >
          {saving ? 'Enregistrement…' : `Enregistrer ${selectedTruieIds.length} saillies`}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn--primary btn--lg btn--block"
          onClick={goNext}
          disabled={nextDisabled}
          aria-label="Passer à l'étape suivante"
        >
          Suivant
        </button>
      )}
    </>
  );

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Saillie en bande"
      title="Saillir plusieurs truies en lot"
      ariaLabel="Saillie en bande"
      saving={saving}
      isValid={!submitDisabled}
      onSubmit={handleSubmit}
      submitLabel={`Enregistrer ${selectedTruieIds.length} saillies`}
      footer={footer}
      bodyClassName="sheet__body--wizard"
    >
      <div className="field--inline" style={{ alignItems: 'center', gap: 12 }}>
        <p className="text-mono-label" style={{ margin: 0, color: 'var(--pt-subtle)' }}>
          N truies × 1 verrat × 1 date
        </p>
      </div>

      {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}

      {error ? (
        <p role="alert" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-danger)', marginTop: 8 }}>
          {error}
        </p>
      ) : null}
    </QuickActionSheet>
  );
};

export default QuickSaillieBandeForm;
