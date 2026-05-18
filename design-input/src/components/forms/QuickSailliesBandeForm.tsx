/**
 * QuickSailliesBandeForm — Sprint 11 · migré FORM_CONTRACT Phase 2 (batch A)
 * ════════════════════════════════════════════════════════════════════════
 * Saisie de N saillies en bande sur 1 verrat (ou 2, alternés) à 1 date
 * commune. Workflow industriel : on synchronise le post-sevrage groupé
 * → toutes les truies reviennent en chaleur ±3j → saillie en lot.
 *
 * Différence avec QuickSaillieBandeForm (singulier, V6-B) :
 *   - QuickSaillieBandeForm : wizard 3-step (truies → verrat → date),
 *     min 2 truies, 1 verrat unique.
 *   - QuickSailliesBandeForm (ce fichier) : single-sheet, preview cycle
 *     prévu inline (écho J28, MB J115, sevrage J143), support 1-2
 *     verrats (alternance auto si 2).
 *
 * Conforme au contrat :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global)
 *  - helpers date partagés `_formHelpers` (todayIso / formatFr)
 *  - reset-on-open via `lastIsOpen` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * MIGRATION FORM_CONTRACT Phase 3b (batch G) :
 *  - sélection multi-truies → `<EntityPicker mode="chips" multi>` (sans cap).
 *  - sélection verrats : multi-select custom CONSERVÉ — `EntityPicker multi`
 *    n'expose pas de cap de sélection ni de désactivation conditionnelle par
 *    chip, or le verrat est plafonné à 2 (round-robin). Cf. section SPEC.
 *
 * Si une saillie échoue, on continue les autres et on remonte un toast
 * partial-success. Le but : pas perdre la saisie pour 1 erreur réseau.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Users } from 'lucide-react';

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

const ECHO_DAYS = 28;
const MB_DAYS = 115;
const SEVRAGE_DAYS = 143;
const MAX_VERRATS = 2;

function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isTruieEligible(t: Truie): boolean {
  const c = normaliseStatut(t.statut);
  // Vide / chaleur / flushing : éligibles à saillie.
  if (c === 'VIDE' || c === 'CHALEUR' || c === 'FLUSHING') return true;
  // Surveillance : on tolère (l'éleveur sait ce qu'il fait).
  if (c === 'SURVEILLANCE') return true;
  return false;
}

export interface QuickSailliesBandeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickSailliesBandeForm: React.FC<QuickSailliesBandeFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { truies, verrats, refreshData } = useFarm();
  const { showToast } = useToast();

  const [selectedTruieIds, setSelectedTruieIds] = useState<string[]>([]);
  const [selectedVerratIds, setSelectedVerratIds] = useState<string[]>([]);
  const [dateIso, setDateIso] = useState<string>(todayIso());
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastIsOpen render-phase (FORM_CONTRACT).
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    if (isOpen) {
      setSelectedTruieIds([]);
      setSelectedVerratIds([]);
      setDateIso(todayIso());
      setNotes('');
      setSaving(false);
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

  const truiesEligibles = useMemo<Truie[]>(
    () => truies.filter(isTruieEligible),
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

  const dateEcho = useMemo(() => addDaysIso(dateIso, ECHO_DAYS), [dateIso]);
  const dateMB = useMemo(() => addDaysIso(dateIso, MB_DAYS), [dateIso]);
  const dateSevrage = useMemo(() => addDaysIso(dateIso, SEVRAGE_DAYS), [dateIso]);

  const toggleVerrat = (id: string): void => {
    setSelectedVerratIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_VERRATS) return prev; // cap 2.
      return [...prev, id];
    });
  };

  const verratNames = selectedVerratIds.join(' + ');

  const isValid =
    selectedTruieIds.length >= 1 && selectedVerratIds.length >= 1 && !!dateIso;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);

    // Pré-résoudre les IDs verrats pour ne pas refaire l'appel à chaque truie.
    const boarIdMap = new Map<string, string | null>();
    for (const code of selectedVerratIds) {
      try {
        const id = await resolveBoarIdByCode(code);
        boarIdMap.set(code, id);
      } catch (err) {
        console.warn('[saillies-bande] resolveBoarId failed', code, err);
        boarIdMap.set(code, null);
      }
    }

    const failures: string[] = [];
    let i = 0;
    for (const truieCode of selectedTruieIds) {
      // Round-robin si 2 verrats sélectionnés.
      const verratCode = selectedVerratIds[i % selectedVerratIds.length];
      const boarId = boarIdMap.get(verratCode) ?? null;

      let sowId: string | null = null;
      try {
        sowId = await resolveSowIdByCode(truieCode);
      } catch (err) {
        console.warn('[saillies-bande] resolveSowId failed', truieCode, err);
      }

      try {
        await insertSaillie({
          sow_id: sowId,
          boar_id: boarId,
          sow_code_id: truieCode,
          boar_code_id: verratCode,
          date_saillie: dateIso,
          date_mb_prevue: dateMB,
          statut: 'SAILLIE',
          notes: notes.trim() || `Saillie en bande (${selectedTruieIds.length} truies)`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push(`${truieCode}: ${msg}`);
      }
      i += 1;
    }

    const total = selectedTruieIds.length;
    const ok = total - failures.length;

    if (ok === 0) {
      showToast(
        `Échec total · ${failures[0] ?? 'erreur réseau'}`,
        'error',
        4000,
      );
      setSaving(false);
      return;
    }
    if (failures.length > 0) {
      showToast(
        `${ok}/${total} saillies enregistrées · ${failures.length} échec(s)`,
        'info',
        4000,
      );
    } else {
      showToast(
        `${ok} saillies en bande enregistrées · ${verratNames}`,
        'success',
      );
    }

    try {
      await refreshData(true);
    } catch {
      /* noop */
    }
    onSuccess?.();
    // Garder saving=true jusqu'au onClose pour bloquer le double-clic
    // pendant la fenêtre de toast (FORM_CONTRACT).
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setSaving(false);
      onClose();
    }, 1500);
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Saillies en bande"
      title="Saillir plusieurs truies en lot"
      ariaLabel="Saillies en bande"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel={`Enregistrer ${selectedTruieIds.length} saillie${selectedTruieIds.length > 1 ? 's' : ''}`}
      submitAriaLabel={`Enregistrer ${selectedTruieIds.length} saillies en bande`}
    >
      <p className="sheet__sub">
        Pattern industriel : truies synchrones (post-sevrage groupé) saillies à la même date par 1-2 verrats.
      </p>

      <div className="field--inline" style={{ alignItems: 'center', gap: 12 }}>
        <div
          className="inline-flex items-center justify-center"
          style={{
            height: 40,
            width: 40,
            borderRadius: 10,
            background: 'var(--pt-bg)',
            color: 'var(--pt-primary)',
            flex: '0 0 auto',
          }}
        >
          <Users size={18} aria-hidden="true" />
        </div>
        <p
          className="tabular-nums"
          style={{
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 12,
            color: 'var(--pt-ink)',
            margin: 0,
          }}
        >
          {selectedTruieIds.length} truie{selectedTruieIds.length > 1 ? 's' : ''} sélectionnée{selectedTruieIds.length > 1 ? 's' : ''}
          {selectedVerratIds.length > 0 ? ` × ${selectedVerratIds.length} verrat${selectedVerratIds.length > 1 ? 's' : ''}` : ''}
        </p>
      </div>

      <div className="step-pill">Étape 1 / 4 · Truies à saillir</div>

      <div className="field">
        <label className="label--v77">
          SÉLECTION MULTIPLE <span className="req">requis</span>
        </label>
        <EntityPicker<Truie>
          mode="chips"
          multi
          entities={truiesEligibles}
          value={selectedTruieIds}
          onChange={setSelectedTruieIds}
          entityLabel="la truie"
          groupLabel="Liste truies éligibles"
          emptyText="Aucune truie éligible (vide / chaleur)."
          disabled={saving}
          getAriaLabel={t => `Sélectionner truie ${t.displayId}`}
          renderSubLabel={t => `${t.nom ? `${t.nom} · ` : ''}${t.statut}`}
        />
      </div>

      <div className="step-pill">Étape 2 / 4 · Verrat(s)</div>

      <div className="field">
        <label className="label--v77">
          1 OU 2 VERRATS <span className="req">requis</span>
          {selectedVerratIds.length === 2 ? (
            <span className="hint"> · round-robin : T1 › V1, T2 › V2…</span>
          ) : null}
        </label>
        {verratsActifs.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--pt-font-mono)',
              fontSize: 12,
              color: 'var(--pt-subtle)',
              margin: 0,
            }}
          >
            Aucun verrat actif.
          </p>
        ) : (
          <div
            className="radio-chips--cards"
            aria-label="Sélectionner 1 ou 2 verrats"
          >
            {verratsActifs.map(v => {
              const isSel = selectedVerratIds.includes(v.displayId);
              const isCapped = !isSel && selectedVerratIds.length >= MAX_VERRATS;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={isSel}
                  aria-label={`Sélectionner verrat ${v.displayId}`}
                  data-testid={`bande-verrat-${v.displayId}`}
                  onClick={() => toggleVerrat(v.displayId)}
                  disabled={isCapped || saving}
                  className={`radio-chip--card${isSel ? ' is-selected' : ''}`}
                  style={isCapped ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                >
                  <div className="radio-chip__code">
                    {v.displayId}{v.nom ? ` · ${v.nom}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="step-pill">Étape 3 / 4 · Date saillie commune</div>

      <div className="field">
        <label className="label--v77" htmlFor="saillies-date">
          DATE <span className="req">requis</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="saillies-date"
            className={`field__input mono${dateIso ? ' filled' : ' field__input--ghost'}`}
            type="date"
            aria-label="Date saillie commune"
            value={dateIso}
            max={todayIso()}
            onChange={e => setDateIso(e.target.value)}
            disabled={saving}
          />
          <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pt-subtle)', pointerEvents: 'none' }}>
            <Calendar size={16} />
          </span>
        </div>
      </div>

      <div
        className="calc-card"
        aria-label="Cycle prévu groupe"
        data-testid="cycle-preview"
      >
        <div className="eyebrow" style={{ marginBottom: 8 }}>Cycle prévu groupe</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)' }}>
            <span style={{ color: 'var(--pt-subtle)' }}>Écho J{ECHO_DAYS}</span>
            <span>{formatFr(dateEcho)}</span>
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)' }}>
            <span style={{ color: 'var(--pt-subtle)' }}>MB attendues J{MB_DAYS}</span>
            <span>{formatFr(dateMB)}</span>
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)' }}>
            <span style={{ color: 'var(--pt-subtle)' }}>Sevrage prévu J{SEVRAGE_DAYS}</span>
            <span>{formatFr(dateSevrage)}</span>
          </li>
        </ul>
      </div>

      <div className="step-pill">Étape 4 / 4 · Notes</div>

      <div className="field">
        <label className="label--v77" htmlFor="saillies-notes">
          NOTES <span className="hint">optionnel</span>
        </label>
        <textarea
          id="saillies-notes"
          className="field__input"
          style={{ minHeight: 80, resize: 'vertical' }}
          placeholder="Ex: lot saillie semaine 18, post-sevrage du 14/04…"
          maxLength={240}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
      </div>
    </QuickActionSheet>
  );
};

export default QuickSailliesBandeForm;
