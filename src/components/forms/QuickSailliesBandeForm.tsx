/**
 * QuickSailliesBandeForm — Sprint 11 · V78 sheet V77
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
 *     verrats (alternance auto si 2). Spec Sprint 11 mockup pro.
 *
 * Si une saillie échoue, on continue les autres et on remonte un toast
 * partial-success. Le but : pas perdre la saisie pour 1 erreur réseau.
 */

import React, { useMemo, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Calendar, CheckCircle2, Users, X } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  insertSaillie,
  resolveBoarIdByCode,
  resolveSowIdByCode,
} from '../../services/supabaseWrites';
import { normaliseStatut } from '../../lib/truieStatut';
import type { Truie, Verrat } from '../../types/farm';

const ECHO_DAYS = 28;
const MB_DAYS = 115;
const SEVRAGE_DAYS = 143;
const MAX_VERRATS = 2;

const todayISO = (): string => new Date().toISOString().slice(0, 10);

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDateFr(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR');
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
  const [dateIso, setDateIso] = useState<string>(todayISO());
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reset on open.
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    if (isOpen) {
      setSelectedTruieIds([]);
      setSelectedVerratIds([]);
      setDateIso(todayISO());
      setNotes('');
      setSaving(false);
      setSuccess(false);
    }
  }

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

  const dateEcho = useMemo(() => addDaysISO(dateIso, ECHO_DAYS), [dateIso]);
  const dateMB = useMemo(() => addDaysISO(dateIso, MB_DAYS), [dateIso]);
  const dateSevrage = useMemo(() => addDaysISO(dateIso, SEVRAGE_DAYS), [dateIso]);

  const toggleTruie = (id: string): void => {
    setSelectedTruieIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const toggleVerrat = (id: string): void => {
    setSelectedVerratIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_VERRATS) return prev; // cap 2.
      return [...prev, id];
    });
  };

  const verratNames = selectedVerratIds.join(' + ');

  const handleSubmit = async (): Promise<void> => {
    if (selectedTruieIds.length < 1) {
      showToast('Sélectionne au moins 1 truie', 'error');
      return;
    }
    if (selectedVerratIds.length < 1) {
      showToast('Sélectionne au moins 1 verrat', 'error');
      return;
    }
    if (!dateIso) {
      showToast('Date requise', 'error');
      return;
    }
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

    try { await refreshData(true); } catch { /* noop */ }
    onSuccess?.();
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSaving(false);
      onClose();
    }, 1400);
  };

  const handleClose = (): void => {
    if (saving) return;
    onClose();
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleClose}
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      className="agritech-bottom-sheet pt-sheet-modal pt-screen"
      aria-label="Saillies en bande"
    >
      <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
        <div className="sheet" style={{ position: 'relative', height: '100%', maxHeight: '100%' }}>
          <span className="sheet__handle" />

          {success ? (
            <div
              className="flex flex-col items-center justify-center py-20 animate-scale-in"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2
                size={38}
                className="text-accent mb-4"
                aria-hidden="true"
                strokeWidth={2}
              />
              <p className="sheet__title" style={{ textAlign: 'center' }}>
                {selectedTruieIds.length} saillies enregistrées
              </p>
              <p className="sheet__sub" style={{ textAlign: 'center', marginTop: 8 }}>
                MB prévue {formatDateFr(dateMB)}
              </p>
            </div>
          ) : (
            <>
              <header className="sheet__head">
                <div>
                  <div className="eyebrow">Saillies en bande</div>
                  <h2 className="sheet__title">Saillir plusieurs truies en lot</h2>
                </div>
                <button
                  type="button"
                  className="sheet__close"
                  onClick={handleClose}
                  aria-label="Fermer"
                  disabled={saving}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </header>

              <div className="sheet__body">
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
                  {truiesEligibles.length === 0 ? (
                    <p
                      style={{
                        fontFamily: 'var(--pt-font-mono)',
                        fontSize: 12,
                        color: 'var(--pt-subtle)',
                        margin: 0,
                      }}
                    >
                      Aucune truie éligible (vide / chaleur).
                    </p>
                  ) : (
                    <ul
                      aria-label="Liste truies éligibles"
                      style={{ listStyle: 'none', padding: 0, margin: 0 }}
                    >
                      {truiesEligibles.map(t => {
                        const checked = selectedTruieIds.includes(t.displayId);
                        const inputId = `bande-truie-${t.displayId}`;
                        return (
                          <li key={t.id} style={{ marginBottom: 8 }}>
                            <label
                              htmlFor={inputId}
                              className={`radio-chip--card${checked ? ' is-selected' : ''}`}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                              data-testid={`bande-truie-row-${t.displayId}`}
                            >
                              <input
                                id={inputId}
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTruie(t.displayId)}
                                style={{ height: 20, width: 20, accentColor: 'var(--pt-primary)' }}
                                aria-label={`Sélectionner truie ${t.displayId}`}
                                disabled={saving}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="radio-chip__code">
                                  {t.displayId}{t.nom ? ` · ${t.nom}` : ''}
                                </div>
                                <div className="radio-chip__sub">{t.statut}</div>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
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
                      max={todayISO()}
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
                      <span>{formatDateFr(dateEcho)}</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)' }}>
                      <span style={{ color: 'var(--pt-subtle)' }}>MB attendues J{MB_DAYS}</span>
                      <span>{formatDateFr(dateMB)}</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)' }}>
                      <span style={{ color: 'var(--pt-subtle)' }}>Sevrage prévu J{SEVRAGE_DAYS}</span>
                      <span>{formatDateFr(dateSevrage)}</span>
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
              </div>

              <footer className="sheet__foot">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleClose}
                  disabled={saving}
                  aria-label="Annuler et fermer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleSubmit}
                  disabled={
                    saving ||
                    selectedTruieIds.length < 1 ||
                    selectedVerratIds.length < 1
                  }
                  aria-busy={saving}
                  aria-label={`Enregistrer ${selectedTruieIds.length} saillies en bande`}
                >
                  {saving ? (
                    'Enregistrement…'
                  ) : (
                    <>
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Enregistrer {selectedTruieIds.length} saillie{selectedTruieIds.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </footer>
            </>
          )}
        </div>
      </div>
    </IonModal>
  );
};

export default QuickSailliesBandeForm;
