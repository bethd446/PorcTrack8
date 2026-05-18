/**
 * QuickEditSaillieForm · Édition rapide d'une saillie enregistrée.
 * ════════════════════════════════════════════════════════════════════════
 * Migré FORM_CONTRACT Phase 2 (batch A) :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (remplace l'IonToast local)
 *  - validation `validateSaillieEdit` → { ok, errors, patch }, rendu via
 *    `<FieldError>`
 *  - picker verrat partagé `<EntityPicker mode="chips">`
 *  - reset-on-open render-phase + auto-calc dateMBPrevue (pattern existant)
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Sections :
 *   - Couple   : Truie (readonly) · Verrat (EntityPicker chips)
 *   - Planning : Date saillie · Date MB prévue (auto +115j, éditable)
 *   - Statut   : Active · Confirmée · Non confirmée · Avortement · Archivée
 *   - Notes    : textarea max 200 chars
 *
 * Submit -> write Supabase direct sur la table `saillies` (clés snake_case).
 * Patch PARTIEL : seuls les champs modifiés sont envoyés.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Calendar } from 'lucide-react';

import { FormField, Input, Select, Textarea } from '@/design-system';
import { supabase } from '../../services/supabaseClient';
import { resolveSowIdByCode } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
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
import { FieldError, EntityPicker, type PickableEntity } from './_formFields';
import QuickActionSheet from './QuickActionSheet';

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
  const { showToast } = useToast();

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

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Verrats actifs (filtre statut) ────────────────────────────────────
  const verratsActifs = useMemo(() => {
    return verrats.filter(
      v => /actif/i.test(v.statut || '') || v.id === initial.verratId,
    );
  }, [verrats, initial.verratId]);

  // Entités pour l'EntityPicker : verrats actifs + fallback si la valeur
  // initiale (legacy) n'est plus dans la liste active.
  const verratEntities = useMemo<PickableEntity[]>(() => {
    const list: PickableEntity[] = verratsActifs.map(v => ({
      id: v.id,
      displayId: v.displayId,
      nom: v.nom,
    }));
    if (
      initial.verratId &&
      !list.some(v => v.displayId === initial.verratId)
    ) {
      list.push({ id: `legacy-${initial.verratId}`, displayId: initial.verratId });
    }
    return list;
  }, [verratsActifs, initial.verratId]);

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

  const isValid = !!verratId;

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
      showToast('Aucune modification', 'info');
      onClose();
      return;
    }
    setSaving(true);
    try {
      const supabasePatch: Record<string, unknown> = {};
      const p = result.patch as Record<string, unknown>;
      const patchFrToIso = (fr: unknown): string | null => {
        if (typeof fr !== 'string' || !fr) return null;
        const m = fr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return null;
        return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      };
      if ('VERRAT' in p) supabasePatch.boar_code_id = p.VERRAT;
      if ('DATE SAILLIE' in p)
        supabasePatch.date_saillie = patchFrToIso(p['DATE SAILLIE']);
      if ('DATE MB PREVUE' in p)
        supabasePatch.date_mb_prevue = patchFrToIso(p['DATE MB PREVUE']);
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
      showToast(
        online
          ? 'Modifications enregistrées'
          : 'Modifications en file · sync auto',
        online ? 'success' : 'info',
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
      // Garder saving=true jusqu'au onClose pour bloquer le double-clic
      // pendant la fenêtre de toast (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      showToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement local',
        'error',
        4000,
      );
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Édition saillie"
      title={`Éditer saillie · ${truie?.displayId || saillie.truieId}`}
      ariaLabel="Édition saillie"
      saving={saving}
      isValid={isValid}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      submitAriaLabel="Enregistrer les modifications de la saillie"
    >
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
          <Edit3 size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-mono-label text-text-1">Corriger une saillie</p>
          <p className="text-mono-micro text-text-2 tabular-nums mt-0.5">
            {truieLabel}
            {saillie.dateSaillie ? ` · ${saillie.dateSaillie}` : ''}
          </p>
        </div>
      </div>

      {/* ═══ Section Couple ══════════════════════════════════════ */}
      <section aria-label="Couple" className="space-y-4">
        <h3 className="text-mono-micro text-text-2">Couple</h3>

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

        <div className="field">
          <label className="label--v77" htmlFor="edit-saillie-verrat">
            VERRAT <span className="req">requis</span>
          </label>
          <EntityPicker
            mode="chips"
            entities={verratEntities}
            value={verratId}
            onChange={setVerratId}
            entityLabel="le verrat"
            groupLabel="Choix du verrat"
            emptyText="Aucun verrat actif"
            disabled={saving}
          />
          <FieldError message={errors.verratId} />
        </div>
      </section>

      {/* ═══ Section Planning ════════════════════════════════════ */}
      <section aria-label="Planning" className="space-y-4">
        <h3 className="text-mono-micro text-text-2">Planning</h3>

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
            <p id="edit-saillie-mb-hint" className="text-[10px] text-text-2">
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
        <h3 className="text-mono-micro text-text-2">Statut</h3>
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
        <h3 className="text-mono-micro text-text-2">Notes</h3>
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
    </QuickActionSheet>
  );
};

export default QuickEditSaillieForm;
