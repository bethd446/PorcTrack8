import React, { useCallback, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { updateBoarByCode } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import type { Verrat } from '../../types/farm';
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
    setErrors({});
    // Patch vide et pas de photo modifiée : on ferme sans réseau
    if (Object.keys(result.patch).length === 0 && !photoDirty) {
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

  // Classe réutilisable pour les <input> en ligne
  const inputBaseClass = (invalid: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[14px]',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      invalid ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

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
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-codeid"
                className="block text-mono-label text-text-2"
              >
                Code interne <span className="text-red normal-case">· requis</span>
              </label>
              <input
                id="edit-verrat-codeid"
                type="text"
                maxLength={15}
                aria-label={`Code interne du verrat ${displayId}`}
                aria-required="true"
                aria-invalid={!!errors.codeId}
                aria-describedby={
                  errors.codeId
                    ? 'edit-verrat-codeid-error'
                    : 'edit-verrat-codeid-hint'
                }
                className={inputBaseClass(!!errors.codeId)}
                placeholder="Ex: K13-V-001"
                value={codeId}
                onChange={e => setCodeId(e.target.value)}
                disabled={saving}
                autoComplete="off"
                spellCheck={false}
              />
              <p
                id="edit-verrat-codeid-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                Tu peux changer le préfixe (V → K, etc.) — code interne unique
                pour ta ferme · 3-15 lettres/chiffres/tirets
              </p>
              {errors.codeId ? (
                <p
                  id="edit-verrat-codeid-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.codeId}
                </p>
              ) : null}
            </div>

            {/* Nom */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-nom"
                className="block text-mono-label text-text-2"
              >
                Nom <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-verrat-nom"
                ref={firstFieldRef}
                type="text"
                maxLength={30}
                aria-label={`Nom du verrat ${displayId}`}
                aria-invalid={!!errors.nom}
                aria-describedby={
                  errors.nom ? 'edit-verrat-nom-error' : 'edit-verrat-nom-hint'
                }
                className={inputBaseClass(!!errors.nom)}
                placeholder="Ex: Titan"
                value={nom}
                onChange={e => setNom(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <p
                id="edit-verrat-nom-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {nom.trim().length}/30 · laisser vide pour retirer
              </p>
              {errors.nom ? (
                <p
                  id="edit-verrat-nom-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.nom}
                </p>
              ) : null}
            </div>

            {/* Boucle (obligatoire) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-boucle"
                className="block text-mono-label text-text-2"
              >
                Boucle <span className="text-red normal-case">· requis</span>
              </label>
              <input
                id="edit-verrat-boucle"
                type="text"
                maxLength={30}
                aria-label={`Boucle du verrat ${displayId}`}
                aria-required="true"
                aria-invalid={!!errors.boucle}
                aria-describedby={
                  errors.boucle
                    ? 'edit-verrat-boucle-error'
                    : 'edit-verrat-boucle-hint'
                }
                className={inputBaseClass(!!errors.boucle)}
                placeholder="Ex: V-001"
                value={boucle}
                onChange={e => setBoucle(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <p
                id="edit-verrat-boucle-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {boucle.trim().length}/30
              </p>
              {errors.boucle ? (
                <p
                  id="edit-verrat-boucle-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.boucle}
                </p>
              ) : null}
            </div>

            {/* Origine */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-origine"
                className="block text-mono-label text-text-2"
              >
                Origine <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-verrat-origine"
                type="text"
                list="edit-verrat-origine-list"
                maxLength={40}
                aria-label={`Origine du verrat ${displayId}`}
                aria-invalid={!!errors.origine}
                aria-describedby={
                  errors.origine
                    ? 'edit-verrat-origine-error'
                    : 'edit-verrat-origine-hint'
                }
                className={inputBaseClass(!!errors.origine)}
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
              <p
                id="edit-verrat-origine-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {origine.trim().length}/40
              </p>
              {errors.origine ? (
                <p
                  id="edit-verrat-origine-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.origine}
                </p>
              ) : null}
            </div>

            {/* Date naissance */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-naissance"
                className="block text-mono-label text-text-2"
              >
                Date de naissance{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-verrat-naissance"
                type="date"
                aria-invalid={!!errors.dateNaissance}
                aria-describedby={
                  errors.dateNaissance ? 'edit-verrat-naissance-error' : undefined
                }
                className={inputBaseClass(!!errors.dateNaissance)}
                value={dateNaissance}
                onChange={e => setDateNaissance(e.target.value)}
                disabled={saving}
              />
              {errors.dateNaissance ? (
                <p
                  id="edit-verrat-naissance-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.dateNaissance}
                </p>
              ) : null}
            </div>

            {/* Race */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-race"
                className="block text-mono-label text-text-2"
              >
                Race{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-verrat-race"
                type="text"
                list="edit-verrat-race-list"
                maxLength={40}
                aria-invalid={!!errors.race}
                aria-describedby={
                  errors.race ? 'edit-verrat-race-error' : 'edit-verrat-race-hint'
                }
                className={inputBaseClass(!!errors.race)}
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
              <p
                id="edit-verrat-race-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {race.trim().length}/40
              </p>
              {errors.race ? (
                <p
                  id="edit-verrat-race-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.race}
                </p>
              ) : null}
            </div>

            {/* Lignée parentale */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-lignee"
                className="block text-mono-label text-text-2"
              >
                Lignée parentale{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-verrat-lignee"
                type="text"
                maxLength={80}
                aria-invalid={!!errors.lignee}
                aria-describedby={
                  errors.lignee
                    ? 'edit-verrat-lignee-error'
                    : 'edit-verrat-lignee-hint'
                }
                className={inputBaseClass(!!errors.lignee)}
                placeholder="Ex: Père Titan / Mère Rose"
                value={lignee}
                onChange={e => setLignee(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <p
                id="edit-verrat-lignee-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {lignee.trim().length}/80
              </p>
              {errors.lignee ? (
                <p
                  id="edit-verrat-lignee-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.lignee}
                </p>
              ) : null}
            </div>

            {/* Loge */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-loge"
                className="block text-mono-label text-text-2"
              >
                Emplacement loge{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-verrat-loge"
                type="text"
                maxLength={30}
                aria-invalid={!!errors.loge}
                aria-describedby={
                  errors.loge ? 'edit-verrat-loge-error' : 'edit-verrat-loge-hint'
                }
                className={inputBaseClass(!!errors.loge)}
                placeholder="Ex: Bât. Verrats L1"
                value={loge}
                onChange={e => setLoge(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <p
                id="edit-verrat-loge-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {loge.trim().length}/30
              </p>
              {errors.loge ? (
                <p
                  id="edit-verrat-loge-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.loge}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Section Alimentation ═══════════════════════════════ */}
          <section aria-label="Alimentation" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Alimentation
            </h3>

            {/* Alimentation (text suggest) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-alimentation"
                className="block text-mono-label text-text-2"
              >
                Alimentation
              </label>
              <input
                id="edit-verrat-alimentation"
                type="text"
                list="edit-verrat-alimentation-list"
                maxLength={40}
                aria-label={`Alimentation du verrat ${displayId}`}
                aria-invalid={!!errors.alimentation}
                aria-describedby={
                  errors.alimentation
                    ? 'edit-verrat-alimentation-error'
                    : 'edit-verrat-alimentation-hint'
                }
                className={inputBaseClass(!!errors.alimentation)}
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
              <p
                id="edit-verrat-alimentation-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {alimentation.trim().length}/40
              </p>
              {errors.alimentation ? (
                <p
                  id="edit-verrat-alimentation-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.alimentation}
                </p>
              ) : null}
            </div>

            {/* Ration */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-ration"
                className="block text-mono-label text-text-2"
              >
                Ration (kg/j)
              </label>
              <input
                id="edit-verrat-ration"
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step={0.1}
                aria-label="Ration alimentaire en kilogrammes par jour"
                aria-required="true"
                aria-invalid={!!errors.ration}
                aria-describedby={
                  errors.ration
                    ? 'edit-verrat-ration-error'
                    : 'edit-verrat-ration-hint'
                }
                className={[
                  'w-full h-14 rounded-md px-4',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[22px] tabular-nums text-center',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.ration
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="0.0"
                value={ration}
                onChange={e => setRation(e.target.value)}
                disabled={saving}
              />
              <p
                id="edit-verrat-ration-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                0 à 10 kg/j · pas 0.1
              </p>
              {errors.ration ? (
                <p
                  id="edit-verrat-ration-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.ration}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Section Statut ═════════════════════════════════════ */}
          <section aria-label="Statut" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Statut
            </h3>
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-statut"
                className="block text-mono-label text-text-2"
              >
                Statut du verrat
              </label>
              <select
                id="edit-verrat-statut"
                aria-label={`Statut du verrat ${displayId}`}
                aria-invalid={!!errors.statut}
                aria-describedby={
                  errors.statut ? 'edit-verrat-statut-error' : undefined
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[14px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.statut
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                value={statut}
                onChange={e => setStatut(e.target.value)}
                disabled={saving}
              >
                {STATUT_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.statut ? (
                <p
                  id="edit-verrat-statut-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.statut}
                </p>
              ) : null}
            </div>
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
            <p className="font-mono text-[10px] text-text-2">
              {performance.nbPorteesEngendrees} portées engendrées · {performance.tier}
            </p>
          </section>

          {/* ═══ Section Notes ══════════════════════════════════════ */}
          <section aria-label="Notes" className="space-y-4">
            <h3 className="text-mono-micro text-text-2">
              Notes
            </h3>
            <div className="space-y-1.5">
              <label
                htmlFor="edit-verrat-notes"
                className="block text-mono-label text-text-2"
              >
                Notes <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <textarea
                id="edit-verrat-notes"
                maxLength={200}
                rows={3}
                aria-label={`Notes sur le verrat ${displayId}`}
                aria-invalid={!!errors.notes}
                aria-describedby={
                  errors.notes
                    ? 'edit-verrat-notes-error'
                    : 'edit-verrat-notes-hint'
                }
                className={[
                  'w-full rounded-md px-3 py-2',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[13px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  'resize-none',
                  errors.notes
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="Observations, historique, remarques…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
              />
              <p
                id="edit-verrat-notes-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {notes.trim().length}/200
              </p>
              {errors.notes ? (
                <p
                  id="edit-verrat-notes-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.notes}
                </p>
              ) : null}
            </div>
          </section>

          {/* ═══ Actions ════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              aria-label="Annuler et fermer"
              className={[
                'pressable flex-1 h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-bg-1 border border-border text-text-1',
                'font-mono text-[12px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms] hover:border-text-2',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                saving ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              aria-label="Enregistrer les modifications du verrat"
              aria-busy={saving}
              className={[
                'pressable flex-[2] h-14 rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-accent text-bg-0',
                'font-mono text-[13px] font-bold uppercase tracking-wide',
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
            </button>
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
