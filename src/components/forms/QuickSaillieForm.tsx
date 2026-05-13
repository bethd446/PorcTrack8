/**
 * QuickSaillieForm — Saisie d'une saillie (Sprint 5 v76)
 * ════════════════════════════════════════════════════════════════════════
 * Sheet bottom v76 · Truie radio-chips (vides + chaleur) · Verrat radio-chips ·
 * Date saillie · Preview cycle (J28 écho · J115 MB · J143 sevrage).
 *
 * Les radios Truie/Verrat conservent l'API a11y native (role=radio,
 * aria-checked, label "Sélectionner la truie X" / "le verrat X") car les
 * tests s'y appuient.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Check, X } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  insertSaillie,
  resolveSowIdByCode,
  resolveBoarIdByCode,
} from '../../services/supabaseWrites';
import { normaliseStatut } from '../../lib/truieStatut';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import { GESTATION_DAYS } from '../../constants';
import { addDaysIso } from './quickEditSaillieValidation';

const SAILLIE_BACKDATE_MAX_DAYS = 60;
const SEVRAGE_DAYS = 28;
const ECHO_DAYS = 28;

const todayISO = (): string => new Date().toISOString().slice(0, 10);
const minDateISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const formatFr = (iso: string): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

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
  const [dateSaillie, setDateSaillie] = useState<string>(todayISO);
  const [saving, setSaving] = useState(false);

  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultTruieDisplayId: string | undefined }>({
    isOpen, defaultTruieDisplayId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultTruieDisplayId !== defaultTruieDisplayId) {
    setLastOpenKey({ isOpen, defaultTruieDisplayId });
    if (isOpen) {
      setDateSaillie(todayISO());
      if (defaultTruieDisplayId) setSelectedTruie(defaultTruieDisplayId);
      else setSelectedTruie('');
      setSelectedVerrat('');
      setSaving(false);
    }
  }

  const truiesDisponibles = useMemo(() => truies.filter(t => {
    const c = normaliseStatut(t.statut);
    if (c === 'VIDE') return true;
    return c !== 'PLEINE' && c !== 'MATERNITE' && c !== 'REFORME';
  }), [truies]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setSelectedTruie('');
    setSelectedVerrat('');
    setDateSaillie(todayISO());
    onClose();
  }, [onClose, saving]);
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const dateEcho = useMemo(() => addDaysIso(dateSaillie, ECHO_DAYS), [dateSaillie]);
  const dateMb = useMemo(() => addDaysIso(dateSaillie, GESTATION_DAYS), [dateSaillie]);
  const dateSevrage = useMemo(() => addDaysIso(dateMb, SEVRAGE_DAYS), [dateMb]);

  const handleSave = async (): Promise<void> => {
    if (!selectedTruie || !selectedVerrat) return;
    setSaving(true);
    try {
      const [sowId, boarId] = await Promise.all([
        resolveSowIdByCode(selectedTruie),
        resolveBoarIdByCode(selectedVerrat),
      ]);
      const isBackdated = dateSaillie !== todayISO();
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
      // V81 Sprint 7 — Garder saving=true jusqu'au onClose pour empêcher le
      // double-clic dans la fenêtre 1.5s entre toast success et fermeture.
      setTimeout(() => {
        setSelectedTruie('');
        setSelectedVerrat('');
        setDateSaillie(todayISO());
        setSaving(false);
        onClose();
      }, 1500);
    } catch (e) {
      const msg = (e as Error)?.message ?? "Erreur lors de l'enregistrement de la saillie";
      showToast(msg, 'error', 4000);
      setSaving(false);
    }
  };

  const isValid = !!selectedTruie && !!selectedVerrat;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose} breakpoints={[0, 1]} initialBreakpoint={1} className="agritech-bottom-sheet pt-sheet-modal pt-screen" aria-label="Saisir une saillie">
      <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
        <div className="sheet" style={{ position: 'relative', height: '100%', maxHeight: '100%' }}>
          <span className="sheet__handle" />
          <header className="sheet__head">
            <div>
              <div className="eyebrow">Nouvelle saillie</div>
              <h2 className="sheet__title">Saisir une saillie</h2>
            </div>
            <button type="button" className="sheet__close" onClick={handleClose} aria-label="Fermer" disabled={saving}>
              <X size={14} aria-hidden="true" />
            </button>
          </header>
          <div className="sheet__body">
            <div className="field">
              <label className="label--v77">TRUIE EN CHALEUR <span className="req">requis</span></label>
              {truiesDisponibles.length > 0 ? (
                <div className="radio-chips--cards" role="radiogroup" aria-label="Truie">
                  {truiesDisponibles.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`radio-chip--card${selectedTruie === t.displayId ? ' is-selected' : ''}`}
                      role="radio"
                      aria-checked={selectedTruie === t.displayId}
                      aria-label={`Sélectionner la truie ${t.displayId}`}
                      onClick={() => setSelectedTruie(t.displayId)}
                      disabled={saving}
                    >
                      {t.displayId}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-subtle)', margin: 0 }}>
                  Aucune truie disponible
                </p>
              )}
            </div>

            <div className="field--inline">
              <div className="field">
                <label className="label--v77">VERRAT <span className="req">requis</span></label>
                {verrats.length > 0 ? (
                  <div className="radio-chips--cards" role="radiogroup" aria-label="Verrat">
                    {verrats.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        className={`radio-chip--card${selectedVerrat === v.displayId ? ' is-selected' : ''}`}
                        role="radio"
                        aria-checked={selectedVerrat === v.displayId}
                        aria-label={`Sélectionner le verrat ${v.displayId}`}
                        onClick={() => setSelectedVerrat(v.displayId)}
                        disabled={saving}
                      >
                        {v.displayId}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-subtle)', margin: 0 }}>
                    Aucun verrat actif
                  </p>
                )}
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
                  min={minDateISO(SAILLIE_BACKDATE_MAX_DAYS)}
                  max={todayISO()}
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
          </div>
          <footer className="sheet__foot">
            <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={saving} aria-label="Annuler et fermer">Annuler</button>
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={handleSave}
              disabled={!isValid || saving}
              aria-busy={saving}
              aria-label="Confirmer la saillie"
            >
              {saving ? 'Enregistrement…' : <><Check size={14} aria-hidden="true" /> Confirmer la saillie</>}
            </button>
          </footer>
        </div>
      </div>
    </IonModal>
  );
};

export default QuickSaillieForm;
