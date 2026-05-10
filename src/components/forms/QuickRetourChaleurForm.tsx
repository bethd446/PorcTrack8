/**
 * QuickRetourChaleurForm — Sprint 11
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
 * Implémentation :
 *   - On filtre les truies dont la dernière saillie est dans la fenêtre
 *     [J+12 ; J+35] (un peu plus large que J18-J21 pour tolérance terrain).
 *   - On loggue l'évènement dans `health_logs` avec
 *     `log_type = 'RETOUR_CHALEUR'` et `sow_id` lié.
 *   - Si action = "re-saillir maintenant", on remonte l'info au parent
 *     via `onResaillir(truieDisplayId)` pour qu'il enchaîne avec
 *     <QuickSaillieForm defaultTruieDisplayId=... />.
 *   - Si action = "réformer si 2e retour", on update statut truie en
 *     "À surveiller" (pas de réforme automatique — décision humaine).
 */

import React, { useMemo, useState } from 'react';
import { Heart, Check, CheckCircle2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { Button, FormField, Input, Section, Textarea } from '@/design-system';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  insertHealthLog,
  resolveSowIdByCode,
  updateSow,
} from '../../services/supabaseWrites';
import type { Saillie, Truie } from '../../types/farm';

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

const todayISO = (): string => new Date().toISOString().slice(0, 10);

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
  const [dateObs, setDateObs] = useState<string>(todayISO());
  const [action, setAction] = useState<RetourChaleurAction>('RESAILLIR');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reset on open.
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    if (isOpen) {
      setSelectedTruieId('');
      setDateObs(todayISO());
      setAction('RESAILLIR');
      setNote('');
      setSaving(false);
      setSuccess(false);
    }
  }

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

  const handleSave = async (): Promise<void> => {
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

      try { await refreshData(true); } catch { /* noop */ }

      showToast(
        `Retour chaleur enregistré · ${selectedTruieId} (J+${selected.joursDepuisSaillie})`,
        'success',
      );
      setSuccess(true);

      const truieToResaillir = selectedTruieId;
      setTimeout(() => {
        setSuccess(false);
        if (action === 'RESAILLIR' && onResaillir) {
          onResaillir(truieToResaillir);
        }
        onClose();
      }, 1200);
    } catch (e) {
      console.error('[retour-chaleur] save failed', e);
      const msg = (e as Error)?.message ?? 'Erreur enregistrement retour chaleur';
      showToast(msg, 'error', 4000);
      setSaving(false);
    }
  };

  const handleClose = (): void => {
    if (saving) return;
    onClose();
  };

  const actionChipClasses = (isSelected: boolean, primary = false): string => [
    'pressable inline-flex items-center justify-center',
    'min-h-[44px] px-3 rounded-md border text-left',
    'text-[12px] uppercase tracking-wide',
    'transition-colors duration-[160ms]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
    isSelected
      ? primary
        ? 'bg-accent text-bg-0 border-accent font-semibold'
        : 'bg-text-1 text-bg-0 border-text-1 font-semibold'
      : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
  ].join(' ');

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Saisir un retour de chaleur"
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
            Retour chaleur enregistré
          </p>
          {selected && (
            <p className="mt-2 text-[12px] uppercase tracking-wide text-text-2">
              {selectedTruieId} · J+{selected.joursDepuisSaillie}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Eyebrow + header */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-2 ft-code">
              Retour de chaleur
            </p>
            <p className="mt-1 font-heading text-[20px] uppercase tracking-wide">
              Saisir un retour de chaleur
            </p>
            <p className="mt-2 text-[12px] text-text-2">
              Truie revenue en chaleur après une saillie. Fenêtre normale d'observation : J18-J21 post-saillie.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Heart size={18} aria-hidden="true" />
            </div>
            <p className="text-mono-label text-text-1">
              {candidates.length} truie{candidates.length > 1 ? 's' : ''} dans la fenêtre J{RETOUR_WINDOW_MIN_DAYS}-J{RETOUR_WINDOW_MAX_DAYS}
            </p>
          </div>

          <Section label="OBSERVATION" />

          {/* Date */}
          <FormField label="Date observation" required>
            <Input
              type="date"
              aria-label="Date observation"
              value={dateObs}
              max={todayISO()}
              onChange={e => setDateObs(e.target.value)}
            />
          </FormField>

          {/* Truie */}
          <FormField label="Truie en retour" required>
            {candidates.length === 0 ? (
              <p className="text-mono-label text-text-2">
                Aucune truie dans la fenêtre d'observation pour cette date.
                Vérifie la date d'observation ou enregistre d'abord la saillie d'origine.
              </p>
            ) : (
              <div
                className="flex flex-wrap gap-2"
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
                      className={[
                        'pressable inline-flex flex-col items-start',
                        'min-h-[44px] px-3 py-2 rounded-md border',
                        'text-[12px] uppercase tracking-wide tabular-nums',
                        'transition-colors duration-[160ms]',
                        isSelected
                          ? 'bg-accent text-bg-0 border-accent font-semibold'
                          : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                      ].join(' ')}
                    >
                      <span className="ft-code">{c.truie.displayId}</span>
                      <span className="text-[10px] opacity-80 normal-case">
                        J+{c.joursDepuisSaillie} · saillie {formatDateFr(c.saillie.dateSaillie)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>

          {/* Saillie d'origine (lecture seule) */}
          {selected && (
            <div className="rounded-md border border-border bg-bg-0 p-3">
              <p className="text-mono-label text-text-2 mb-1">
                Saillie d'origine
              </p>
              <p className="ft-code text-[13px] tabular-nums text-text-0">
                {selected.truie.displayId} × {selected.saillie.verratId}
                {' · '}
                {formatDateFr(selected.saillie.dateSaillie)}
                {' · '}
                J+{selected.joursDepuisSaillie} aujourd'hui
              </p>
            </div>
          )}

          <Section label="ACTION SUIVANTE" />

          <FormField label="Que faire ?" required>
            <div
              role="radiogroup"
              aria-label="Action suivante"
              className="flex flex-col gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={action === 'RESAILLIR'}
                onClick={() => setAction('RESAILLIR')}
                className={actionChipClasses(action === 'RESAILLIR', true)}
                data-testid="action-resaillir"
              >
                Re-saillir cette truie maintenant
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={action === 'ATTENDRE'}
                onClick={() => setAction('ATTENDRE')}
                className={actionChipClasses(action === 'ATTENDRE')}
                data-testid="action-attendre"
              >
                Attendre prochain cycle (J21)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={action === 'SURVEILLER'}
                onClick={() => setAction('SURVEILLER')}
                className={actionChipClasses(action === 'SURVEILLER')}
                data-testid="action-surveiller"
              >
                Réformer si 2e retour (passer en surveillance)
              </button>
            </div>
          </FormField>

          {/* Note terrain */}
          <FormField label="Note terrain" hint="optionnel">
            <Textarea
              placeholder="Ex: marque vulvaire, immobilité forte devant V01…"
              maxLength={240}
              value={note}
              onChange={e => setNote(e.target.value)}
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
              onClick={handleSave}
              disabled={!selectedTruieId || saving}
              aria-busy={saving}
              ariaLabel="Confirmer le retour de chaleur"
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement…</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Check size={16} aria-hidden="true" />
                  Enregistrer le retour
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
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
