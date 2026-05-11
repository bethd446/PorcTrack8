import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save, Calendar, Heart } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button } from '@/design-system';
import { supabase } from '../../services/supabaseClient';
import { resolveSowIdByCode } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import type { Saillie } from '../../types/farm';
import {
  validateSaillieEdit,
  addDaysIso,
  frToIso,
  STATUT_OPTIONS,
  GESTATION_DAYS,
  type SaillieEditInitial,
  type SaillieEditValidation,
} from './quickEditSaillieValidation';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditSaillieForm · Édition rapide d'une saillie enregistrée
   ─────────────────────────────────────────────────────────────────────────
   Sections :
     - Couple         : Truie (readonly) · Verrat (select)
     - Planning       : Date saillie · Date MB prévue (auto +115j, éditable)
     - Statut         : Active · Confirmée · Non confirmée · Avortement · Archivée
     - Notes          : textarea max 200 chars

   Submit -> write Supabase direct sur la table `saillies` (clés snake_case).
   Patch PARTIEL : seuls les champs modifiés sont envoyés.
   ═════════════════════════════════════════════════════════════════════════ */

interface QuickEditSaillieFormProps {
  isOpen: boolean;
  onClose: () => void;
  saillie: Saillie;
  onSuccess?: () => void;
}

const QuickEditSaillieForm: React.FC<QuickEditSaillieFormProps> = ({
  isOpen,
  onClose,
  saillie,
  onSuccess,
}) => {
  const { truies, verrats, refreshData } = useFarm();

  // ── Initial (conversion dd/MM/yyyy → ISO pour <input type="date"/>) ──
  const initial: SaillieEditInitial = useMemo(
    () => ({
      truieId: saillie.truieId ?? '',
      verratId: saillie.verratId ?? '',
      dateSaillie: frToIso(saillie.dateSaillie ?? ''),
      dateMBPrevue: frToIso(saillie.dateMBPrevue ?? ''),
      statut: saillie.statut ?? '',
      notes: saillie.notes ?? '',
    }),
    [saillie],
  );

  const [verratId, setVerratId] = useState<string>(initial.verratId);
  const [dateSaillie, setDateSaillie] = useState<string>(initial.dateSaillie);
  const [dateMBPrevue, setDateMBPrevue] = useState<string>(initial.dateMBPrevue);
  /** Tag : l'utilisateur a-t-il édité manuellement la date MB ? Si non,
   *  on auto-recalcule quand dateSaillie change. */
  const [mbManuallyEdited, setMbManuallyEdited] = useState<boolean>(false);
  const [statut, setStatut] = useState<string>(initial.statut);
  const [notes, setNotes] = useState<string>(initial.notes);
  const [errors, setErrors] = useState<SaillieEditValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Render-time sync: reset on (re)open + auto-calc dateMBPrevue when dateSaillie
  // changes (unless manually edited). Avoids setState-in-effect cascading renders.
  const [lastKey, setLastKey] = useState<{
    isOpen: boolean;
    truieId: string;
    dateSaillie: string;
  }>({
    isOpen,
    truieId: saillie.truieId,
    dateSaillie,
  });
  const openOrEntityChanged =
    lastKey.isOpen !== isOpen || lastKey.truieId !== saillie.truieId;
  const dateSaillieChanged = lastKey.dateSaillie !== dateSaillie;
  if (openOrEntityChanged) {
    setLastKey({ isOpen, truieId: saillie.truieId, dateSaillie });
    if (isOpen) {
      setVerratId(initial.verratId);
      setDateSaillie(initial.dateSaillie);
      setDateMBPrevue(initial.dateMBPrevue);
      setMbManuallyEdited(false);
      setStatut(initial.statut);
      setNotes(initial.notes);
      setErrors({});
      setSaving(false);
    }
  } else if (dateSaillieChanged) {
    setLastKey({ isOpen, truieId: saillie.truieId, dateSaillie });
    if (!mbManuallyEdited && dateSaillie) {
      const computed = addDaysIso(dateSaillie, GESTATION_DAYS);
      if (computed && computed !== dateMBPrevue) {
        setDateMBPrevue(computed);
      }
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc + focus auto sur 1er input modifiable (verrat select)
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(isOpen);

  // ── Verrats actifs (filtre statut) ────────────────────────────────────
  const verratsActifs = useMemo(() => {
    return verrats.filter(
      v => /actif/i.test(v.statut || '') || v.id === initial.verratId,
    );
  }, [verrats, initial.verratId]);

  // ── Truie snapshot (readonly display) ─────────────────────────────────
  const truie = useMemo(
    () => truies.find(t => t.id === saillie.truieId || t.displayId === saillie.truieId),
    [truies, saillie.truieId],
  );
  const truieLabel = truie
    ? `${truie.displayId}${truie.nom ? ' · ' + truie.nom : ''}`
    : saillie.truieNom
      ? `${saillie.truieId} · ${saillie.truieNom}`
      : saillie.truieId || '—';

  // ── Auto-calc hint ────────────────────────────────────────────────────
  const autoMbIso = useMemo(
    () => (dateSaillie ? addDaysIso(dateSaillie, GESTATION_DAYS) : ''),
    [dateSaillie],
  );
  const mbHasAutoDrift =
    !!autoMbIso && !!dateMBPrevue && autoMbIso !== dateMBPrevue;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateSaillieEdit(
      {
        truieId: saillie.truieId,
        verratId,
        dateSaillie,
        dateMBPrevue,
        statut,
        notes,
      },
      initial,
    );
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (Object.keys(result.patch).length === 0) {
      setToast('Aucune modification');
      onClose();
      return;
    }
    setSaving(true);
    try {
      const supabasePatch: Record<string, unknown> = {};
      const p = result.patch as Record<string, unknown>;
      const frToIso = (fr: unknown): string | null => {
        if (typeof fr !== 'string' || !fr) return null;
        const m = fr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return null;
        return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      };
      if ('VERRAT' in p) supabasePatch.boar_code_id = p.VERRAT;
      if ('DATE SAILLIE' in p)
        supabasePatch.date_saillie = frToIso(p['DATE SAILLIE']);
      if ('DATE MB PREVUE' in p)
        supabasePatch.date_mb_prevue = frToIso(p['DATE MB PREVUE']);
      if ('STATUT' in p) supabasePatch.statut = p.STATUT;
      if ('NOTES' in p) supabasePatch.notes = p.NOTES;

      const sowId = await resolveSowIdByCode(saillie.truieId);
      if (sowId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('saillies') as any)
          .update(supabasePatch)
          .eq('sow_id', sowId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw new Error(error.message);
      }
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast(
        online
          ? 'Modifications enregistrées'
          : 'Modifications en file · sync auto',
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement local',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Éditer saillie · ${truie?.displayId || saillie.truieId}`}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
          aria-label="Édition saillie"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-mono-label text-text-1">
                Corriger une saillie
              </p>
              <p className="text-mono-micro text-text-2 tabular-nums mt-0.5">
                {truieLabel}
                {saillie.dateSaillie ? ` · ${saillie.dateSaillie}` : ''}
              </p>
            </div>
          </div>

          {/* ═══ Section Couple ══════════════════════════════════════ */}
          <section aria-label="Couple" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Couple
            </h3>

            <FormField label="Truie" hint="verrouillée">
              <Input
                id="edit-saillie-truie"
                type="text"
                readOnly
                aria-readonly="true"
                aria-label={`Truie de la saillie ${truieLabel}`}
                className="bg-bg-2 cursor-not-allowed"
                value={truieLabel}
              />
            </FormField>

            <FormField label="Verrat" required error={errors.verratId}>
              <Select
                id="edit-saillie-verrat"
                ref={firstFieldRef}
                aria-label="Choix du verrat"
                aria-required="true"
                aria-invalid={!!errors.verratId}
                aria-describedby={
                  errors.verratId ? 'edit-saillie-verrat-error' : undefined
                }
                value={verratId}
                onChange={e => setVerratId(e.target.value)}
                disabled={saving}
              >
                <option value="">— Sélectionner —</option>
                {verratsActifs.map(v => (
                  <option key={v.id} value={v.displayId}>
                    {v.displayId}
                    {v.nom ? ` · ${v.nom}` : ''}
                  </option>
                ))}
                {initial.verratId &&
                !verratsActifs.some(v => v.displayId === initial.verratId) ? (
                  <option value={initial.verratId}>{initial.verratId}</option>
                ) : null}
              </Select>
            </FormField>
          </section>

          {/* ═══ Section Planning ════════════════════════════════════ */}
          <section aria-label="Planning" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Planning
            </h3>

            <FormField
              label="Date saillie"
              required
              hint={errors.dateSaillie ? undefined : `Détermine la date MB prévue (${GESTATION_DAYS}j gestation)`}
              error={errors.dateSaillie}
            >
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none z-10"
                  aria-hidden="true"
                />
                <Input
                  id="edit-saillie-date"
                  type="date"
                  aria-label="Date de la saillie"
                  aria-required="true"
                  aria-invalid={!!errors.dateSaillie}
                  aria-describedby={
                    errors.dateSaillie
                      ? 'edit-saillie-date-error'
                      : 'edit-saillie-date-hint'
                  }
                  className="pl-9"
                  value={dateSaillie}
                  onChange={e => setDateSaillie(e.target.value)}
                  disabled={saving}
                  invalid={!!errors.dateSaillie}
                />
              </div>
            </FormField>

            <FormField
              label={`Date MB prévue · ${mbManuallyEdited ? 'édité manuellement' : `auto +${GESTATION_DAYS}j`}`}
              error={errors.dateMBPrevue}
            >
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none z-10"
                  aria-hidden="true"
                />
                <Input
                  id="edit-saillie-mb"
                  type="date"
                  aria-label="Date de mise-bas prévue"
                  aria-invalid={!!errors.dateMBPrevue}
                  aria-describedby={
                    errors.dateMBPrevue
                      ? 'edit-saillie-mb-error'
                      : 'edit-saillie-mb-hint'
                  }
                  className="pl-9"
                  value={dateMBPrevue}
                  onChange={e => {
                    setDateMBPrevue(e.target.value);
                    setMbManuallyEdited(true);
                  }}
                  disabled={saving}
                  invalid={!!errors.dateMBPrevue}
                />
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p
                  id="edit-saillie-mb-hint"
                  className="text-[10px] text-text-2"
                >
                  {mbHasAutoDrift
                    ? `Auto suggéré : ${autoMbIso}`
                    : 'Ajuster si saillie échouée ou re-saillie'}
                </p>
                {mbManuallyEdited && dateSaillie ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMbManuallyEdited(false);
                      setDateMBPrevue(addDaysIso(dateSaillie, GESTATION_DAYS));
                    }}
                    disabled={saving}
                    className="text-mono-micro text-accent hover:underline"
                    aria-label="Recalculer la date MB prévue automatiquement"
                  >
                    Reset auto
                  </button>
                ) : null}
              </div>
            </FormField>
          </section>

          {/* ═══ Section Statut ══════════════════════════════════════ */}
          <section aria-label="Statut" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Statut
            </h3>
            <FormField label="Statut de la saillie" error={errors.statut}>
              <Select
                id="edit-saillie-statut"
                aria-label="Statut de la saillie"
                aria-invalid={!!errors.statut}
                aria-describedby={
                  errors.statut ? 'edit-saillie-statut-error' : undefined
                }
                value={statut}
                onChange={e => setStatut(e.target.value)}
                disabled={saving}
              >
                <option value="">— Non renseigné —</option>
                {STATUT_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {initial.statut &&
                !(STATUT_OPTIONS as readonly string[]).includes(initial.statut) ? (
                  <option value={initial.statut}>{initial.statut} (legacy)</option>
                ) : null}
              </Select>
            </FormField>
          </section>

          {/* ═══ Section Notes ═══════════════════════════════════════ */}
          <section aria-label="Notes" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Notes
            </h3>
            <FormField
              label="Notes"
              hint={errors.notes ? undefined : `optionnel · ${notes.trim().length}/200`}
              error={errors.notes}
            >
              <Textarea
                id="edit-saillie-notes"
                maxLength={200}
                rows={3}
                aria-label="Notes sur la saillie"
                aria-invalid={!!errors.notes}
                aria-describedby={
                  errors.notes
                    ? 'edit-saillie-notes-error'
                    : 'edit-saillie-notes-hint'
                }
                placeholder="Observations, conditions, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
              />
            </FormField>
          </section>

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
              ariaLabel="Annuler et fermer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              aria-busy={saving}
              ariaLabel="Enregistrer les modifications de la saillie"
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
                  <Heart size={14} aria-hidden="true" />
                  Enregistrer
                  <Save size={14} aria-hidden="true" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={1800}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default QuickEditSaillieForm;
