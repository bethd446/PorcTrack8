/**
 * QuickSaillieForm — Saisie d'une saillie.
 * ════════════════════════════════════════════════════════════════════════
 * Form de référence FORM_CONTRACT Phase 1 (migré depuis le pattern Sprint 5).
 * Truie radio-chips (vides + chaleur) · Verrat radio-chips · Date saillie ·
 * Preview cycle (J28 écho · J115 MB · J143 sevrage).
 *
 * Conforme au contrat :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, pas de toast local)
 *  - helpers date partagés `_formHelpers` (todayIso / isoDaysAgo / formatFr)
 *  - pickers d'entité partagés `<EntityPicker mode="chips">`
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Les radios Truie/Verrat conservent l'API a11y native (role=radio,
 * aria-checked, label "Sélectionner la truie X" / "le verrat X") via
 * `EntityPicker` car les tests s'y appuient.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  insertSaillie,
  resolveSowIdByCode,
  resolveBoarIdByCode,
} from '../../services/supabaseWrites';
import { normaliseStatut } from '../../lib/truieStatut';
import { GESTATION_DAYS } from '../../constants';
import { addDaysIso } from './quickEditSaillieValidation';
import { useFocusFirstInput } from './useFormA11y';
import { todayIso, isoDaysAgo, formatFr } from './_formHelpers';
import { EntityPicker } from './_formFields';
import QuickActionSheet from './QuickActionSheet';

const SAILLIE_BACKDATE_MAX_DAYS = 60;
const SEVRAGE_DAYS = 28;
const ECHO_DAYS = 28;

interface QuickSaillieFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruieDisplayId?: string;
}

const QuickSaillieForm: React.FC<QuickSaillieFormProps> = ({ isOpen, onClose, defaultTruieDisplayId }) => {
  const { truies, verrats, refreshData } = useFarm();
  const { showToast } = useToast();
  const [selectedTruie, setSelectedTruie] = useState(defaultTruieDisplayId ?? '');
  const [selectedVerrat, setSelectedVerrat] = useState('');
  const [dateSaillie, setDateSaillie] = useState<string>(todayIso);
  const [saving, setSaving] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultTruieDisplayId: string | undefined }>({
    isOpen, defaultTruieDisplayId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultTruieDisplayId !== defaultTruieDisplayId) {
    setLastOpenKey({ isOpen, defaultTruieDisplayId });
    if (isOpen) {
      setDateSaillie(todayIso());
      if (defaultTruieDisplayId) setSelectedTruie(defaultTruieDisplayId);
      else setSelectedTruie('');
      setSelectedVerrat('');
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  const truiesDisponibles = useMemo(() => truies.filter(t => {
    const c = normaliseStatut(t.statut);
    if (c === 'VIDE') return true;
    return c !== 'PLEINE' && c !== 'MATERNITE' && c !== 'REFORME';
  }), [truies]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setSelectedTruie('');
    setSelectedVerrat('');
    setDateSaillie(todayIso());
    onClose();
  }, [onClose, saving]);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const dateEcho = useMemo(() => addDaysIso(dateSaillie, ECHO_DAYS), [dateSaillie]);
  const dateMb = useMemo(() => addDaysIso(dateSaillie, GESTATION_DAYS), [dateSaillie]);
  const dateSevrage = useMemo(() => addDaysIso(dateMb, SEVRAGE_DAYS), [dateMb]);

  const isValid = !!selectedTruie && !!selectedVerrat;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedTruie || !selectedVerrat) return;
    setSaving(true);
    try {
      const [sowId, boarId] = await Promise.all([
        resolveSowIdByCode(selectedTruie),
        resolveBoarIdByCode(selectedVerrat),
      ]);
      const isBackdated = dateSaillie !== todayIso();
      await insertSaillie({
        sow_id: sowId,
        boar_id: boarId,
        sow_code_id: selectedTruie,
        boar_code_id: selectedVerrat,
        date_saillie: dateSaillie,
        statut: 'SAILLIE',
        notes: isBackdated
          ? `Saillie rétro-saisie depuis PorcTrack (date réelle : ${dateSaillie})`
          : 'Saillie enregistrée depuis PorcTrack',
      });
      try { await refreshData(true); } catch { /* noop */ }
      showToast(`Saillie enregistrée · ${selectedTruie} × ${selectedVerrat}`, 'success');
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic dans
      // la fenêtre 1.5s entre toast success et fermeture (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSelectedTruie('');
        setSelectedVerrat('');
        setDateSaillie(todayIso());
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      const msg = (err as Error)?.message ?? "Erreur lors de l'enregistrement de la saillie";
      showToast(msg, 'error', 4000);
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Nouvelle saillie"
      title="Saisir une saillie"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Confirmer la saillie"
      submitAriaLabel="Confirmer la saillie"
    >
      <div className="field">
        <label className="label--v77">TRUIE EN CHALEUR <span className="req">requis</span></label>
        <EntityPicker
          mode="chips"
          entities={truiesDisponibles}
          value={selectedTruie}
          onChange={setSelectedTruie}
          entityLabel="la truie"
          groupLabel="Truie"
          emptyText="Aucune truie disponible"
          disabled={saving}
        />
      </div>

      <div className="field--inline">
        <div className="field">
          <label className="label--v77">VERRAT <span className="req">requis</span></label>
          <EntityPicker
            mode="chips"
            entities={verrats}
            value={selectedVerrat}
            onChange={setSelectedVerrat}
            entityLabel="le verrat"
            groupLabel="Verrat"
            emptyText="Aucun verrat actif"
            disabled={saving}
          />
        </div>

        <div className="field">
          <label className="label--v77" htmlFor="saillie-date">DATE SAILLIE</label>
          <input
            id="saillie-date"
            ref={firstFieldRef}
            className={`field__input mono${dateSaillie ? ' filled' : ' field__input--ghost'}`}
            type="date"
            aria-label="Date de saillie"
            value={dateSaillie}
            min={isoDaysAgo(SAILLIE_BACKDATE_MAX_DAYS)}
            max={todayIso()}
            onChange={e => setDateSaillie(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div style={{ marginTop: 4, padding: '12px 14px', border: '1px solid var(--pt-line)', borderRadius: 12, background: 'var(--pt-bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 2 }}>Cycle prévu · auto</div>
        {[
          { lab: 'Écho', day: `J${ECHO_DAYS}`, iso: dateEcho },
          { lab: 'Mise-bas', day: `J${GESTATION_DAYS}`, iso: dateMb },
          { lab: 'Sevrage', day: `J${GESTATION_DAYS + SEVRAGE_DAYS}`, iso: dateSevrage },
        ].map(row => (
          <div key={row.lab} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)' }}>
            <span style={{ color: 'var(--pt-subtle)' }}>{row.lab}</span>
            <span>
              <small style={{ color: 'var(--pt-subtle)', marginRight: 8 }}>{row.day}</small>
              {formatFr(row.iso)}
            </span>
          </div>
        ))}
      </div>
    </QuickActionSheet>
  );
};

export default QuickSaillieForm;
