/**
 * QuickSailliesBandeForm — Sprint 11
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
import { Calendar, CheckCircle2, Users } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { Button, FormField, Input, Section, Textarea } from '@/design-system';
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
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Saillies en bande"
      height="full"
    >
      {success ? (
        <div
          className="flex flex-col items-center justify-center py-20 animate-scale-in"
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
            {selectedTruieIds.length} saillies enregistrées
          </p>
          <p className="mt-2 text-[12px] uppercase tracking-wide text-text-2">
            MB prévue {formatDateFr(dateMB)}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Eyebrow + header */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-2 ft-code">
              Saillies en bande
            </p>
            <p className="mt-1 font-heading text-[20px] uppercase tracking-wide">
              Saillir plusieurs truies en lot
            </p>
            <p className="mt-2 text-[12px] text-text-2">
              Pattern industriel : truies synchrones (post-sevrage groupé) saillies à la même date par 1-2 verrats.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Users size={18} aria-hidden="true" />
            </div>
            <p className="text-mono-label text-text-1 tabular-nums">
              {selectedTruieIds.length} truie{selectedTruieIds.length > 1 ? 's' : ''} sélectionnée{selectedTruieIds.length > 1 ? 's' : ''}
              {selectedVerratIds.length > 0 ? ` × ${selectedVerratIds.length} verrat${selectedVerratIds.length > 1 ? 's' : ''}` : ''}
            </p>
          </div>

          {/* ── Truies multi-select ────────────────────────────────────── */}
          <Section label="TRUIES À SAILLIR" />

          <FormField label="Sélection multiple" required>
            {truiesEligibles.length === 0 ? (
              <p className="text-mono-label text-text-2">
                Aucune truie éligible (vide / chaleur).
              </p>
            ) : (
              <ul
                className="space-y-2"
                aria-label="Liste truies éligibles"
              >
                {truiesEligibles.map(t => {
                  const checked = selectedTruieIds.includes(t.displayId);
                  const inputId = `bande-truie-${t.displayId}`;
                  return (
                    <li key={t.id}>
                      <label
                        htmlFor={inputId}
                        className={[
                          'flex cursor-pointer items-center gap-3',
                          'min-h-[44px] rounded-md border bg-bg-0 px-3 py-2',
                          checked
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-text-2',
                        ].join(' ')}
                        data-testid={`bande-truie-row-${t.displayId}`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTruie(t.displayId)}
                          className="h-5 w-5 accent-accent"
                          aria-label={`Sélectionner truie ${t.displayId}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="ft-code tabular-nums text-[13px] text-text-0 truncate">
                            {t.displayId}{t.nom ? ` · ${t.nom}` : ''}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-text-2">
                            {t.statut}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </FormField>

          {/* ── Verrats multi-select (max 2) ───────────────────────────── */}
          <Section label="VERRAT(S)" />

          <FormField
            label="1 ou 2 verrats"
            hint={selectedVerratIds.length === 2 ? 'Round-robin : truie 1 → V1, truie 2 → V2…' : undefined}
            required
          >
            {verratsActifs.length === 0 ? (
              <p className="text-mono-label text-text-2">
                Aucun verrat actif.
              </p>
            ) : (
              <div
                className="flex flex-wrap gap-2"
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
                      disabled={isCapped}
                      className={[
                        'pressable inline-flex items-center justify-center',
                        'min-h-[44px] px-3 rounded-md border',
                        'ft-code text-[12px] uppercase tracking-wide tabular-nums',
                        isSel
                          ? 'bg-accent text-bg-0 border-accent font-semibold'
                          : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                        isCapped ? 'opacity-40 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {v.displayId}
                      {v.nom ? ` · ${v.nom}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>

          {/* ── Date saillie commune ───────────────────────────────────── */}
          <Section label="DATE SAILLIE COMMUNE" />

          <FormField label="Date" required>
            <div className="flex items-center gap-2">
              <Calendar size={16} aria-hidden="true" className="text-text-2" />
              <Input
                type="date"
                aria-label="Date saillie commune"
                value={dateIso}
                max={todayISO()}
                onChange={e => setDateIso(e.target.value)}
              />
            </div>
          </FormField>

          {/* ── Preview cycle prévu ────────────────────────────────────── */}
          <div
            className="rounded-md border border-border bg-bg-0 p-3"
            aria-label="Cycle prévu groupe"
            data-testid="cycle-preview"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-2 ft-code mb-2">
              Cycle prévu groupe
            </p>
            <ul className="space-y-1">
              <li className="flex items-baseline justify-between gap-2 ft-code text-[12px] tabular-nums">
                <span className="text-text-1">Écho J{ECHO_DAYS}</span>
                <span className="text-text-0">{formatDateFr(dateEcho)}</span>
              </li>
              <li className="flex items-baseline justify-between gap-2 ft-code text-[12px] tabular-nums">
                <span className="text-text-1">MB attendues J{MB_DAYS}</span>
                <span className="text-text-0">{formatDateFr(dateMB)}</span>
              </li>
              <li className="flex items-baseline justify-between gap-2 ft-code text-[12px] tabular-nums">
                <span className="text-text-1">Sevrage prévu J{SEVRAGE_DAYS}</span>
                <span className="text-text-0">{formatDateFr(dateSevrage)}</span>
              </li>
            </ul>
          </div>

          {/* Notes */}
          <FormField label="Notes" hint="optionnel">
            <Textarea
              placeholder="Ex: lot saillie semaine 18, post-sevrage du 14/04…"
              maxLength={240}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </FormField>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={saving}
              ariaLabel="Annuler et fermer"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={
                saving ||
                selectedTruieIds.length < 1 ||
                selectedVerratIds.length < 1
              }
              aria-busy={saving}
              ariaLabel={`Enregistrer ${selectedTruieIds.length} saillies en bande`}
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement…</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Enregistrer {selectedTruieIds.length} saillie{selectedTruieIds.length > 1 ? 's' : ''}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};

export default QuickSailliesBandeForm;
