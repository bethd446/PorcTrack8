import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { Button, FormField, Input, Select, Textarea } from '@/design-system';
import { listLoges, updateBoarByCode } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import type { Loge, Verrat } from '../../types/farm';
import {
  validateVerratEdit,
  ORIGINE_SUGGESTIONS,
  ALIMENTATION_SUGGESTIONS,
  RACE_SUGGESTIONS,
  STATUT_OPTIONS,
  type VerratEditInitial,
  type VerratEditValidation,
} from './quickEditVerratValidation';
import { computeVerratPerformance } from '../../services/performanceAnalyzer';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import PhotoUploader from './PhotoUploader';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditVerratForm · Édition rapide d'un verrat
   ─────────────────────────────────────────────────────────────────────────
   Sections :
     - Identité     : Nom · Boucle (obligatoire) · Origine
     - Alimentation : Alimentation (suggest) · Ration kg/j (0..10, pas 0.1)
     - Statut       : Actif · Réforme · Mort · Quarantaine
     - Notes        : textarea max 200 chars

   Submit → enqueueUpdateRow('VERRATS', 'ID', verrat.id, patch) avec clés
   canoniques NOM · BOUCLE · ORIGINE · ALIMENTATION · RATION KG/J · STATUT
   · NOTES. Le patch est PARTIEL : seuls les champs modifiés sont envoyés.
   ═════════════════════════════════════════════════════════════════════════ */

interface QuickEditVerratFormProps {
  isOpen: boolean;
  onClose: () => void;
  verrat: Verrat;
  onSuccess?: () => void;
}

const QuickEditVerratForm: React.FC<QuickEditVerratFormProps> = ({
  isOpen,
  onClose,
  verrat,
  onSuccess,
}) => {
  const { refreshData, bandes, saillies, truies } = useFarm();
  const { user } = useAuth();
  const farmId = user?.id ?? '';

  const initial: VerratEditInitial = useMemo(
    () => ({
      codeId: verrat.displayId ?? '',
      nom: verrat.nom ?? '',
      boucle: verrat.boucle ?? '',
      origine: verrat.origine ?? '',
      alimentation: verrat.alimentation ?? '',
      ration: verrat.ration ?? 0,
      statut: verrat.statut || 'Actif',
      notes: verrat.notes ?? '',
      dateNaissance: (verrat.dateNaissance ?? '').slice(0, 10),
      loge: verrat.loge ?? '',
      race: verrat.race ?? '',
      lignee: verrat.lignee ?? '',
    }),
    [verrat],
  );

  const { verrats } = useFarm();
  // Codes existants (autres verrats) pour valider l'unicité du code interne.
  const existingCodes = useMemo(() => {
    const s = new Set<string>();
    for (const v of verrats) {
      if (v.id !== verrat.id && v.displayId) s.add(v.displayId);
    }
    return s;
  }, [verrats, verrat.id]);

  const performance = useMemo(
    () => computeVerratPerformance(verrat, bandes, saillies, truies),
    [verrat, bandes, saillies, truies],
  );

  const [codeId, setCodeId] = useState<string>(initial.codeId);
  const [nom, setNom] = useState<string>(initial.nom);
  const [boucle, setBoucle] = useState<string>(initial.boucle);
  const [origine, setOrigine] = useState<string>(initial.origine);
  const [alimentation, setAlimentation] = useState<string>(initial.alimentation);
  const [ration, setRation] = useState<string>(
    initial.ration > 0 ? String(initial.ration) : '',
  );
  const [statut, setStatut] = useState<string>(initial.statut);
  const [notes, setNotes] = useState<string>(initial.notes);
  const [dateNaissance, setDateNaissance] = useState<string>(initial.dateNaissance);
  const [loge, setLoge] = useState<string>(initial.loge);
  const [race, setRace] = useState<string>(initial.race);
  const [lignee, setLignee] = useState<string>(initial.lignee);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(verrat.photoUrl);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [errors, setErrors] = useState<VerratEditValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // V25 — Loge structurée (référentiel)
  const [loges, setLoges] = useState<Loge[]>([]);
  const [selectedLogeId, setSelectedLogeId] = useState<string>(verrat.logeId ?? '');
  const [selectedLogeIdDirty, setSelectedLogeIdDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then(rows => {
        if (cancelled) return;
        setLoges(rows.filter(l => l.active));
      })
      .catch(() => {
        if (!cancelled) setLoges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // V25 — Validation 1:1 : la loge sélectionnée est-elle déjà occupée par
  // un AUTRE sujet (autre verrat, truie ou bande active) ?
  const logeConflict = useMemo<{ kind: 'verrat' | 'truie' | 'bande'; label: string } | null>(() => {
    if (!selectedLogeId) return null;
    const otherVerrat = verrats.find(
      v => v.id !== verrat.id && v.logeId === selectedLogeId,
    );
    if (otherVerrat) {
      return {
        kind: 'verrat',
        label: otherVerrat.displayId || otherVerrat.boucle || otherVerrat.id,
      };
    }
    const t = truies.find(t0 => t0.logeId === selectedLogeId);
    if (t) {
      return { kind: 'truie', label: t.displayId || t.boucle || t.id };
    }
    const b = bandes.find(b0 => b0.logeId === selectedLogeId);
    if (b) {
      return { kind: 'bande', label: b.idPortee || b.id };
    }
    return null;
  }, [selectedLogeId, verrats, truies, bandes, verrat.id]);

  // Render-time sync: reset on (re)open or verrat change (avoids setState-in-effect).
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; verratId: string }>({
    isOpen,
    verratId: verrat.id,
  });
  if (lastKey.isOpen !== isOpen || lastKey.verratId !== verrat.id) {
    setLastKey({ isOpen, verratId: verrat.id });
    if (isOpen) {
      setCodeId(initial.codeId);
      setNom(initial.nom);
      setBoucle(initial.boucle);
      setOrigine(initial.origine);
      setAlimentation(initial.alimentation);
      setRation(initial.ration > 0 ? String(initial.ration) : '');
      setStatut(initial.statut);
      setNotes(initial.notes);
      setDateNaissance(initial.dateNaissance);
      setLoge(initial.loge);
      setRace(initial.race);
      setLignee(initial.lignee);
      setPhotoUrl(verrat.photoUrl);
      setPhotoDirty(false);
      setSelectedLogeId(verrat.logeId ?? '');
      setSelectedLogeIdDirty(false);
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc + focus auto sur 1er input (Nom)
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateVerratEdit(
      { codeId, nom, boucle, origine, alimentation, ration, statut, notes, dateNaissance, loge, race, lignee },
      initial,
      existingCodes,
    );
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    // V25 — Bloque si la loge sélectionnée est occupée par un autre sujet.
    if (selectedLogeIdDirty && logeConflict) {
      setToast(
        `Loge déjà occupée par ${
          logeConflict.kind === 'verrat'
            ? `verrat ${logeConflict.label}`
            : logeConflict.kind === 'truie'
              ? `truie ${logeConflict.label}`
              : `bande ${logeConflict.label}`
        }`,
      );
      return;
    }
    setErrors({});
    // Patch vide et pas de photo modifiée : on ferme sans réseau
    if (
      Object.keys(result.patch).length === 0 &&
      !photoDirty &&
      !selectedLogeIdDirty
    ) {
      setToast('Aucune modification');
      onClose();
      return;
    }
    setSaving(true);
    try {
      const supabasePatch: Record<string, unknown> = {};
      const p = result.patch as Record<string, unknown>;
      if ('CODE_ID' in p) supabasePatch.code_id = p.CODE_ID;
      if ('NOM' in p) supabasePatch.name = p.NOM;
      if ('BOUCLE' in p) supabasePatch.boucle = p.BOUCLE;
      if ('ORIGINE' in p) supabasePatch.origine = p.ORIGINE;
      if ('ALIMENTATION' in p) supabasePatch.alimentation = p.ALIMENTATION;
      if ('RATION KG/J' in p) supabasePatch.ration_kg_j = p['RATION KG/J'];
      if ('STATUT' in p) supabasePatch.statut = p.STATUT;
      if ('NOTES' in p) supabasePatch.notes = p.NOTES;
      if ('DATE_NAISSANCE' in p) {
        supabasePatch.date_naissance = (p.DATE_NAISSANCE as string) || null;
      }
      if ('LOGE' in p) supabasePatch.localisation = p.LOGE;
      if ('RACE' in p) supabasePatch.breed = p.RACE;
      if ('LIGNEE' in p) supabasePatch.lignee_parentale = p.LIGNEE;
      if (photoDirty) supabasePatch.photo_url = photoUrl ?? null;
      if (selectedLogeIdDirty) supabasePatch.loge_id = selectedLogeId || null;
      await updateBoarByCode(verrat.id, supabasePatch);
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

  const displayId = verrat.displayId || verrat.id;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Éditer · ${displayId}`}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
          aria-label="Édition verrat"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-mono-label text-text-1">
                Modifier identité & ration
              </p>
              <p className="text-mono-micro text-text-2 tabular-nums mt-0.5">
                {displayId}
                {verrat.boucle ? ` · ${verrat.boucle}` : ''}
              </p>
            </div>
          </div>

          {/* ═══ Section Photo ══════════════════════════════════════ */}
          <section aria-label="Photo" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Photo
            </h3>
            <PhotoUploader
              photoUrl={photoUrl}
              farmId={farmId}
              animalId={verrat.id}
              onUploaded={url => {
                setPhotoUrl(url);
                setPhotoDirty(true);
              }}
              onDeleted={() => {
                setPhotoUrl(undefined);
                setPhotoDirty(true);
              }}
              disabled={saving}
            />
          </section>

          {/* ═══ Section Identité ════════════════════════════════════ */}
          <section aria-label="Identité" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Identité
            </h3>

            {/* Code interne (displayId — éditable) */}
            <FormField
              label="Code interne"
              required
              hint="Tu peux changer le préfixe (V → K, etc.) — code interne unique pour ta ferme · 3-15 lettres/chiffres/tirets"
              error={errors.codeId}
            >
              <Input
                id="edit-verrat-codeid"
                type="text"
                maxLength={15}
                aria-label={`Code interne du verrat ${displayId}`}
                aria-required="true"
                invalid={!!errors.codeId}
                placeholder="Ex: K13-V-001"
                value={codeId}
                onChange={e => setCodeId(e.target.value)}
                disabled={saving}
                autoComplete="off"
                spellCheck={false}
              />
            </FormField>

            {/* Nom */}
            <FormField
              label="Nom"
              hint={`${nom.trim().length}/30 · optionnel · laisser vide pour retirer`}
              error={errors.nom}
            >
              <Input
                id="edit-verrat-nom"
                ref={firstFieldRef}
                type="text"
                maxLength={30}
                aria-label={`Nom du verrat ${displayId}`}
                invalid={!!errors.nom}
                placeholder="Ex: Titan"
                value={nom}
                onChange={e => setNom(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>

            {/* Boucle (obligatoire) */}
            <FormField
              label="Boucle"
              required
              hint={`${boucle.trim().length}/30`}
              error={errors.boucle}
            >
              <Input
                id="edit-verrat-boucle"
                type="text"
                maxLength={30}
                aria-label={`Boucle du verrat ${displayId}`}
                aria-required="true"
                invalid={!!errors.boucle}
                placeholder="Ex: V-001"
                value={boucle}
                onChange={e => setBoucle(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>

            {/* Origine */}
            <FormField
              label="Origine"
              hint={`${origine.trim().length}/40 · optionnel`}
              error={errors.origine}
            >
              <Input
                id="edit-verrat-origine"
                type="text"
                list="edit-verrat-origine-list"
                maxLength={40}
                aria-label={`Origine du verrat ${displayId}`}
                invalid={!!errors.origine}
                placeholder="Thomasset, Azaguie, Import…"
                value={origine}
                onChange={e => setOrigine(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <datalist id="edit-verrat-origine-list">
                {ORIGINE_SUGGESTIONS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </FormField>

            {/* Date naissance */}
            <FormField
              label="Date de naissance"
              hint="optionnel"
              error={errors.dateNaissance}
            >
              <Input
                id="edit-verrat-naissance"
                type="date"
                invalid={!!errors.dateNaissance}
                value={dateNaissance}
                onChange={e => setDateNaissance(e.target.value)}
                disabled={saving}
              />
            </FormField>

            {/* Race */}
            <FormField
              label="Race"
              hint={`${race.trim().length}/40 · optionnel`}
              error={errors.race}
            >
              <Input
                id="edit-verrat-race"
                type="text"
                list="edit-verrat-race-list"
                maxLength={40}
                invalid={!!errors.race}
                placeholder="Ex: Large White"
                value={race}
                onChange={e => setRace(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <datalist id="edit-verrat-race-list">
                {RACE_SUGGESTIONS.map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </FormField>

            {/* Lignée parentale */}
            <FormField
              label="Lignée parentale"
              hint={`${lignee.trim().length}/80 · optionnel`}
              error={errors.lignee}
            >
              <Input
                id="edit-verrat-lignee"
                type="text"
                maxLength={80}
                invalid={!!errors.lignee}
                placeholder="Ex: Père Titan / Mère Rose"
                value={lignee}
                onChange={e => setLignee(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>

            {/* Loge */}
            <FormField
              label="Emplacement loge"
              hint={`${loge.trim().length}/30 · optionnel`}
              error={errors.loge}
            >
              <Input
                id="edit-verrat-loge"
                type="text"
                maxLength={30}
                invalid={!!errors.loge}
                placeholder="Ex: Bât. Verrats L1"
                value={loge}
                onChange={e => setLoge(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>

            {/* V25 — Loge structurée (référentiel) */}
            <FormField label="Loge (référentiel)" hint="1 verrat = 1 loge dédiée (spec) · optionnel">
              <Select
                id="edit-verrat-loge-ref"
                value={selectedLogeId}
                onChange={e => {
                  setSelectedLogeId(e.target.value);
                  setSelectedLogeIdDirty(true);
                }}
                disabled={saving}
              >
                <option value="">— Aucune —</option>
                {loges.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.numero} · {l.type.toLowerCase().replace('_', '-')}
                    {l.batiment ? ` · ${l.batiment}` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            {logeConflict ? (
              <p
                role="alert"
                data-testid="loge-conflict-warning"
                className="rounded-md border border-red/40 bg-red/10 px-3 py-2 text-[11px] text-red"
              >
                Loge {loges.find(l => l.id === selectedLogeId)?.numero ?? ''}{' '}
                occupée par{' '}
                {logeConflict.kind === 'verrat'
                  ? `verrat ${logeConflict.label}`
                  : logeConflict.kind === 'truie'
                    ? `truie ${logeConflict.label}`
                    : `bande ${logeConflict.label}`}
              </p>
            ) : null}
          </section>

          {/* ═══ Section Alimentation ═══════════════════════════════ */}
          <section aria-label="Alimentation" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Alimentation
            </h3>

            {/* Alimentation (text suggest) */}
            <FormField
              label="Alimentation"
              hint={`${alimentation.trim().length}/40`}
              error={errors.alimentation}
            >
              <Input
                id="edit-verrat-alimentation"
                type="text"
                list="edit-verrat-alimentation-list"
                maxLength={40}
                aria-label={`Alimentation du verrat ${displayId}`}
                invalid={!!errors.alimentation}
                placeholder="Mâle reproducteur, Entretien…"
                value={alimentation}
                onChange={e => setAlimentation(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <datalist id="edit-verrat-alimentation-list">
                {ALIMENTATION_SUGGESTIONS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </FormField>

            {/* Ration */}
            <FormField
              label="Ration (kg/j)"
              hint="0 à 10 kg/j · pas 0.1"
              error={errors.ration}
            >
              <Input
                id="edit-verrat-ration"
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step={0.1}
                aria-label="Ration alimentaire en kilogrammes par jour"
                aria-required="true"
                invalid={!!errors.ration}
                className="font-mono text-[22px] tabular-nums text-center"
                placeholder="0.0"
                value={ration}
                onChange={e => setRation(e.target.value)}
                disabled={saving}
              />
            </FormField>
          </section>

          {/* ═══ Section Statut ═════════════════════════════════════ */}
          <section aria-label="Statut" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Statut
            </h3>
            <FormField label="Statut du verrat" error={errors.statut}>
              <Select
                id="edit-verrat-statut"
                aria-label={`Statut du verrat ${displayId}`}
                aria-invalid={!!errors.statut}
                value={statut}
                onChange={e => setStatut(e.target.value)}
                disabled={saving}
              >
                {STATUT_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>
          </section>

          {/* ═══ Section Performances (readonly) ══════════════════════ */}
          <section aria-label="Performances" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Performances · calculé
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-bg-2 px-3 py-2">
                <p className="text-mono-micro text-text-2">
                  Saillies cumulées
                </p>
                <p className="text-kpi-value text-text-0 mt-1">
                  {performance.nbSaillies}
                </p>
              </div>
              <div className="rounded-md border border-border bg-bg-2 px-3 py-2">
                <p className="text-mono-micro text-text-2">
                  Taux fertilité
                </p>
                <p className="text-kpi-value text-text-0 mt-1">
                  {performance.tauxSuccesSaillie}%
                </p>
              </div>
            </div>
            <p className="text-[10px] text-text-2">
              {performance.nbPorteesEngendrees} portées engendrées · {performance.tier}
            </p>
          </section>

          {/* ═══ Section Notes ══════════════════════════════════════ */}
          <section aria-label="Notes" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Notes
            </h3>
            <FormField
              label="Notes"
              hint={`${notes.trim().length}/200 · optionnel`}
              error={errors.notes}
            >
              <Textarea
                id="edit-verrat-notes"
                maxLength={200}
                rows={3}
                aria-label={`Notes sur le verrat ${displayId}`}
                aria-invalid={!!errors.notes}
                placeholder="Observations, historique, remarques…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
                style={{ resize: 'none' }}
              />
            </FormField>
          </section>

          {/* ═══ Actions ════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
              ariaLabel="Annuler et fermer"
              className={[
                'pressable flex-1 h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-bg-1 border border-border text-text-1',
                'text-[12px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms] hover:border-text-2',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              ariaLabel="Enregistrer les modifications du verrat"
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'text-[13px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
              ].join(' ')}
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement…</span>
              ) : (
                <>
                  <span>Enregistrer</span>
                  <Save size={14} aria-hidden="true" />
                </>
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

export default QuickEditVerratForm;
