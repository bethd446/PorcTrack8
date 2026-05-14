/**
 * QuickRetourChaleurForm — Sprint 11 · migré FORM_CONTRACT Phase 2 (batch A)
 * ════════════════════════════════════════════════════════════════════════
 * Saisie d'un retour de chaleur observé chez une truie présumée gestante.
 *
 * Métier porcin :
 *   Après une saillie, si la truie n'est pas pleine, elle "revient en
 *   chaleur" autour de J18-J21 post-saillie (parfois jusqu'à J28 pour
 *   un 2e cycle). Diagnostic terrain par observation : truie excitée,
 *   marque vulvaire, immobilité positive devant verrat.
 *
 *   Enregistrer ce retour permet :
 *     1. de re-saillir rapidement sans attendre l'écho J28 (ratée),
 *     2. de calculer le taux de fécondation (saillies utiles / saillies),
 *     3. de tracer les truies à surveiller (2e retour → réforme).
 *
 * Conforme au contrat :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global)
 *  - helper date partagé `_formHelpers` (todayIso)
 *  - reset-on-open via `lastIsOpen` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * NOTE : la sélection de truie porte sur des `TruieAvecSaillie` enrichies
 * (sub-label J+X · saillie du …, `data-testid`, `aria-label` paramétré) que
 * `EntityPicker` ne sait pas rendre — les chips custom sont conservées
 * (cf. section SPEC du rapport).
 *
 * Implémentation :
 *   - On filtre les truies dont la dernière saillie est dans la fenêtre
 *     [J+12 ; J+35] (un peu plus large que J18-J21 pour tolérance terrain).
 *   - On loggue l'évènement dans `health_logs` avec
 *     `log_type = 'RETOUR_CHALEUR'` et `sow_id` lié.
 *   - Si action = "re-saillir maintenant", on remonte l'info au parent
 *     via `onResaillir(truieDisplayId)`.
 *   - Si action = "réformer si 2e retour", on update statut truie en
 *     "À surveiller" (pas de réforme automatique — décision humaine).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  insertHealthLog,
  resolveSowIdByCode,
  updateSow,
} from '../../services/supabaseWrites';
import type { Saillie, Truie } from '../../types/farm';
import { todayIso } from './_formHelpers';
import QuickActionSheet from './QuickActionSheet';

const RETOUR_WINDOW_MIN_DAYS = 12;
const RETOUR_WINDOW_MAX_DAYS = 35;

export type RetourChaleurAction = 'RESAILLIR' | 'ATTENDRE' | 'SURVEILLER';

export interface QuickRetourChaleurFormProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Si l'utilisateur choisit "Re-saillir maintenant", le parent reçoit le
   * displayId de la truie et peut enchaîner avec QuickSaillieForm.
   */
  onResaillir?: (truieDisplayId: string) => void;
}

function parseDateLoose(s?: string | null): Date | null {
  if (!s) return null;
  // Formats acceptés : ISO yyyy-MM-dd, dd/MM/yyyy.
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(s);
  if (isoMatch) {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function formatDateFr(iso: string): string {
  const d = parseDateLoose(iso);
  if (!d) return iso;
  return d.toLocaleDateString('fr-FR');
}

interface TruieAvecSaillie {
  truie: Truie;
  saillie: Saillie;
  saillieDate: Date;
  joursDepuisSaillie: number;
}

const QuickRetourChaleurForm: React.FC<QuickRetourChaleurFormProps> = ({
  isOpen,
  onClose,
  onResaillir,
}) => {
  const { truies, saillies, refreshData } = useFarm();
  const { showToast } = useToast();

  const [selectedTruieId, setSelectedTruieId] = useState<string>('');
  const [dateObs, setDateObs] = useState<string>(todayIso());
  const [action, setAction] = useState<RetourChaleurAction>('RESAILLIR');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastIsOpen render-phase (FORM_CONTRACT).
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    if (isOpen) {
      setSelectedTruieId('');
      setDateObs(todayIso());
      setAction('RESAILLIR');
      setNote('');
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

  /**
   * Truies dans la fenêtre d'observation : on prend la saillie la plus
   * récente par truie, puis on garde celles dont l'écart date observation
   * - date saillie est ∈ [12 ; 35] jours.
   */
  const candidates = useMemo<TruieAvecSaillie[]>(() => {
    const obsDate = parseDateLoose(dateObs);
    if (!obsDate) return [];

    // Map truieId -> dernière saillie.
    const lastByTruie = new Map<string, Saillie>();
    for (const s of saillies) {
      const prev = lastByTruie.get(s.truieId);
      const dCur = parseDateLoose(s.dateSaillie);
      const dPrev = prev ? parseDateLoose(prev.dateSaillie) : null;
      if (!dCur) continue;
      if (!dPrev || dCur.getTime() > dPrev.getTime()) {
        lastByTruie.set(s.truieId, s);
      }
    }

    const list: TruieAvecSaillie[] = [];
    for (const truie of truies) {
      const sail = lastByTruie.get(truie.displayId);
      if (!sail) continue;
      const dSail = parseDateLoose(sail.dateSaillie);
      if (!dSail) continue;
      const diff = daysBetween(dSail, obsDate);
      if (diff < RETOUR_WINDOW_MIN_DAYS || diff > RETOUR_WINDOW_MAX_DAYS) continue;
      list.push({
        truie,
        saillie: sail,
        saillieDate: dSail,
        joursDepuisSaillie: diff,
      });
    }
    list.sort((a, b) => a.joursDepuisSaillie - b.joursDepuisSaillie);
    return list;
  }, [truies, saillies, dateObs]);

  const selected = useMemo(
    () => candidates.find(c => c.truie.displayId === selectedTruieId) ?? null,
    [candidates, selectedTruieId],
  );

  const isValid = !!selectedTruieId && !!selected;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedTruieId || !selected) return;
    setSaving(true);
    try {
      let sowId: string | null = null;
      try {
        sowId = await resolveSowIdByCode(selectedTruieId);
      } catch (err) {
        console.warn('[retour-chaleur] resolveSowId failed', err);
      }

      const ts = Date.now();
      const noteFull =
        `Retour chaleur observé J+${selected.joursDepuisSaillie} post-saillie ` +
        `(saillie du ${formatDateFr(selected.saillie.dateSaillie)}). ` +
        `Action : ${actionLabel(action)}.` +
        (note.trim() ? ` Note : ${note.trim()}` : '');

      await insertHealthLog({
        code_id: `RC-${selectedTruieId}-${ts}`,
        log_type: 'RETOUR_CHALEUR',
        animal_type: 'TRUIE',
        animal_code: selectedTruieId,
        sow_id: sowId,
        log_date: dateObs,
        notes: noteFull,
      });

      // Action métier secondaire.
      if (action === 'SURVEILLER') {
        try {
          await updateSow(selected.truie.id, { statut: 'À surveiller' });
        } catch (err) {
          console.warn('[retour-chaleur] updateSow statut failed', err);
        }
      }

      try {
        await refreshData(true);
      } catch {
        /* noop */
      }

      showToast(
        `Retour chaleur enregistré · ${selectedTruieId} (J+${selected.joursDepuisSaillie})`,
        'success',
      );

      // Garder saving=true jusqu'au onClose pour bloquer le double-clic
      // pendant la fenêtre de toast (FORM_CONTRACT).
      const truieToResaillir = selectedTruieId;
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        if (action === 'RESAILLIR' && onResaillir) {
          onResaillir(truieToResaillir);
        }
        onClose();
      }, 1500);
    } catch (e2) {
      console.error('[retour-chaleur] save failed', e2);
      const msg = (e2 as Error)?.message ?? 'Erreur enregistrement retour chaleur';
      showToast(msg, 'error', 4000);
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Retour de chaleur"
      title="Saisir un retour de chaleur"
      ariaLabel="Saisir un retour de chaleur"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer le retour"
      submitAriaLabel="Enregistrer le retour"
    >
      <p className="sheet__sub">
        Truie revenue en chaleur après une saillie. Fenêtre normale d'observation : J18-J21 post-saillie.
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
          <Heart size={18} aria-hidden="true" />
        </div>
        <p
          style={{
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 12,
            color: 'var(--pt-ink)',
            margin: 0,
          }}
        >
          {candidates.length} truie{candidates.length > 1 ? 's' : ''} dans la fenêtre J{RETOUR_WINDOW_MIN_DAYS}-J{RETOUR_WINDOW_MAX_DAYS}
        </p>
      </div>

      <div className="step-pill">Étape 1 / 3 · Observation</div>

      <div className="field">
        <label className="label--v77" htmlFor="retour-date-obs">
          DATE OBSERVATION <span className="req">requis</span>
        </label>
        <input
          id="retour-date-obs"
          className={`field__input mono${dateObs ? ' filled' : ' field__input--ghost'}`}
          type="date"
          aria-label="Date observation"
          value={dateObs}
          max={todayIso()}
          onChange={e => setDateObs(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="field">
        <label className="label--v77">
          TRUIE EN RETOUR <span className="req">requis</span>
        </label>
        {candidates.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--pt-font-mono)',
              fontSize: 12,
              color: 'var(--pt-subtle)',
              margin: 0,
            }}
          >
            Aucune truie dans la fenêtre d'observation pour cette date.
            Vérifie la date d'observation ou enregistre d'abord la saillie d'origine.
          </p>
        ) : (
          <div
            className="radio-chips--cards"
            role="radiogroup"
            aria-label="Truie en retour de chaleur"
          >
            {candidates.map(c => {
              const isSelected = selectedTruieId === c.truie.displayId;
              return (
                <button
                  key={c.truie.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Sélectionner la truie ${c.truie.displayId} (J+${c.joursDepuisSaillie})`}
                  data-testid={`retour-truie-${c.truie.displayId}`}
                  onClick={() => setSelectedTruieId(c.truie.displayId)}
                  className={`radio-chip--card${isSelected ? ' is-selected' : ''}`}
                  disabled={saving}
                >
                  <div className="radio-chip__code">{c.truie.displayId}</div>
                  <div className="radio-chip__sub">
                    J+{c.joursDepuisSaillie} · saillie {formatDateFr(c.saillie.dateSaillie)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="calc-card">
          <div className="calc-card__big">
            {selected.truie.displayId} × {selected.saillie.verratId}
          </div>
          <div className="calc-card__hint">
            Saillie {formatDateFr(selected.saillie.dateSaillie)} · J+{selected.joursDepuisSaillie} aujourd'hui
          </div>
        </div>
      )}

      <div className="step-pill">Étape 2 / 3 · Action suivante</div>

      <div className="field">
        <label className="label--v77">
          QUE FAIRE ? <span className="req">requis</span>
        </label>
        <div
          className="radio-chips--cards"
          role="radiogroup"
          aria-label="Action suivante"
        >
          <button
            type="button"
            role="radio"
            aria-checked={action === 'RESAILLIR'}
            onClick={() => setAction('RESAILLIR')}
            className={`radio-chip--card${action === 'RESAILLIR' ? ' is-selected' : ''}`}
            data-testid="action-resaillir"
            disabled={saving}
          >
            <div className="radio-chip__code">Re-saillir maintenant</div>
            <div className="radio-chip__sub">Enchaîner avec la saillie</div>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={action === 'ATTENDRE'}
            onClick={() => setAction('ATTENDRE')}
            className={`radio-chip--card${action === 'ATTENDRE' ? ' is-selected' : ''}`}
            data-testid="action-attendre"
            disabled={saving}
          >
            <div className="radio-chip__code">Attendre prochain cycle</div>
            <div className="radio-chip__sub">Patience J21</div>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={action === 'SURVEILLER'}
            onClick={() => setAction('SURVEILLER')}
            className={`radio-chip--card${action === 'SURVEILLER' ? ' is-selected' : ''}`}
            data-testid="action-surveiller"
            disabled={saving}
          >
            <div className="radio-chip__code">Surveiller</div>
            <div className="radio-chip__sub">Réformer si 2e retour</div>
          </button>
        </div>
      </div>

      <div className="step-pill">Étape 3 / 3 · Note terrain</div>

      <div className="field">
        <label className="label--v77" htmlFor="retour-note">
          NOTE TERRAIN <span className="hint">optionnel</span>
        </label>
        <textarea
          id="retour-note"
          className="field__input"
          style={{ minHeight: 80, resize: 'vertical' }}
          placeholder="Ex: marque vulvaire, immobilité forte devant V01…"
          maxLength={240}
          value={note}
          onChange={e => setNote(e.target.value)}
          disabled={saving}
        />
      </div>
    </QuickActionSheet>
  );
};

function actionLabel(a: RetourChaleurAction): string {
  switch (a) {
    case 'RESAILLIR': return 're-saillir maintenant';
    case 'ATTENDRE': return 'attendre prochain cycle';
    case 'SURVEILLER': return 'surveiller (réforme si 2e retour)';
  }
}

export default QuickRetourChaleurForm;
