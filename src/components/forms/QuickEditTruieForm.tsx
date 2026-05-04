import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button } from '@/design-system';
import { listLoges, updateSow } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import type { Loge, Truie } from '../../types/farm';
import {
  validateTruieEditFull,
  frDateToIso,
  type TruieEditDraft,
  type TruieEditInitial,
  type TruieEditValidation,
} from './quickEditTruieValidation';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import PhotoUploader from './PhotoUploader';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditTruieForm · Édition complète d'une truie
   ─────────────────────────────────────────────────────────────────────────
   Sections : Identité · Reproduction · Notes
     • Identité     : Nom · Boucle* · Race · Poids
     • Reproduction : Stade · Statut · Ration · Nb Portées · Dernière NV ·
                      Date MB prévue
     • Notes

   Seule la Boucle est obligatoire. Submit → enqueueUpdateRow avec patch
   diff (uniquement les champs modifiés).
   ═════════════════════════════════════════════════════════════════════════ */


// ─── Options stades / statuts ──────────────────────────────────────────────
const STADE_OPTIONS = [
  '',
  'Jeune',
  'Adulte',
  'Reproductrice',
  'Gestante',
  'Allaitante',
] as const;

const STATUT_OPTIONS = [
  '',
  'Pleine',
  'Maternité',
  'En attente saillie',
  'Chaleur',
  'Surveillance',
  'Réforme',
] as const;

const RACE_SUGGESTIONS = [
  'Large White',
  'Landrace',
  'Duroc',
  'Large White × Landrace',
  'Autre',
];

// ─── Helpers de normalisation initial ──────────────────────────────────────

/** Construit le snapshot initial depuis la truie courante. */
function buildInitial(truie: Truie): TruieEditInitial {
  const ration =
    truie.ration > 0 ? String(Math.round(truie.ration * 10) / 10) : '';
  const poids =
    truie.poids !== undefined && truie.poids !== null
      ? String(truie.poids)
      : '';
  return {
    codeId: truie.displayId ?? '',
    nom: truie.nom ?? '',
    boucle: truie.boucle ?? '',
    race: truie.race ?? '',
    poids,
    stade: truie.stade ?? '',
    statut: truie.statut ?? '',
    ration,
    nbPortees:
      truie.nbPortees !== undefined && truie.nbPortees !== null
        ? String(truie.nbPortees)
        : '',
    derniereNV:
      truie.derniereNV !== undefined && truie.derniereNV !== null
        ? String(truie.derniereNV)
        : '',
    dateMBPrevue: frDateToIso(truie.dateMBPrevue ?? ''),
    dateNaissance: (truie.dateNaissance ?? '').slice(0, 10),
    origine: truie.origine ?? '',
    loge: truie.loge ?? '',
    notes: truie.notes ?? '',
  };
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface QuickEditTruieFormProps {
  isOpen: boolean;
  onClose: () => void;
  truie: Truie;
  onSuccess?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

const QuickEditTruieForm: React.FC<QuickEditTruieFormProps> = ({
  isOpen,
  onClose,
  truie,
  onSuccess,
}) => {
  const { refreshData, truies, verrats, bandes } = useFarm();
  const { user } = useAuth();
  const farmId = user?.id ?? '';

  const initial = useMemo(() => buildInitial(truie), [truie]);

  // Set des codes déjà pris par d'autres truies (pour valider l'unicité côté
  // client). On exclut la truie en cours d'édition via initial.codeId.
  const existingCodes = useMemo(() => {
    const s = new Set<string>();
    for (const t of truies) {
      if (t.id !== truie.id && t.displayId) s.add(t.displayId);
    }
    return s;
  }, [truies, truie.id]);

  const [draft, setDraft] = useState<TruieEditDraft>(initial);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(truie.photoUrl);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [errors, setErrors] = useState<TruieEditValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // V25 — Loge structurée (référentiel)
  const [loges, setLoges] = useState<Loge[]>([]);
  const [selectedLogeId, setSelectedLogeId] = useState<string>(truie.logeId ?? '');
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
  // un AUTRE sujet (autre truie, verrat ou bande active) ?
  const logeConflict = useMemo<{ kind: 'truie' | 'verrat' | 'bande'; label: string } | null>(() => {
    if (!selectedLogeId) return null;
    const otherTruie = truies.find(
      t => t.id !== truie.id && t.logeId === selectedLogeId,
    );
    if (otherTruie) {
      return { kind: 'truie', label: otherTruie.displayId || otherTruie.boucle || otherTruie.id };
    }
    const verrat = verrats.find(v => v.logeId === selectedLogeId);
    if (verrat) {
      return { kind: 'verrat', label: verrat.displayId || verrat.boucle || verrat.id };
    }
    const bande = bandes.find(b => b.logeId === selectedLogeId);
    if (bande) {
      return { kind: 'bande', label: bande.idPortee || bande.id };
    }
    return null;
  }, [selectedLogeId, truies, verrats, bandes, truie.id]);

  // Render-time sync: reset on (re)open or truie change (avoids setState-in-effect).
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; truieId: string }>({
    isOpen,
    truieId: truie.id,
  });
  if (lastKey.isOpen !== isOpen || lastKey.truieId !== truie.id) {
    setLastKey({ isOpen, truieId: truie.id });
    if (isOpen) {
      setDraft(initial);
      setPhotoUrl(truie.photoUrl);
      setPhotoDirty(false);
      setSelectedLogeId(truie.logeId ?? '');
      setSelectedLogeIdDirty(false);
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  // A11y : Esc ferme + focus auto premier input
  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const update = useCallback(
    <K extends keyof TruieEditDraft>(key: K, value: TruieEditDraft[K]) => {
      setDraft(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateTruieEditFull(draft, initial, existingCodes);
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    // V25 — Bloque si la loge sélectionnée est occupée par un autre sujet.
    if (selectedLogeIdDirty && logeConflict) {
      setToast(
        `Loge déjà occupée par ${
          logeConflict.kind === 'truie'
            ? `truie ${logeConflict.label}`
            : logeConflict.kind === 'verrat'
              ? `verrat ${logeConflict.label}`
              : `bande ${logeConflict.label}`
        }`,
      );
      return;
    }
    setErrors({});

    // Si aucun champ modifié et pas de photo → rien à envoyer
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
      if ('RACE' in p) supabasePatch.breed = p.RACE;
      if ('STADE' in p) supabasePatch.statut_repro = p.STADE;
      if ('STATUT' in p) supabasePatch.statut = p.STATUT;
      if ('RATION KG/J' in p) supabasePatch.ration_kg_j = p['RATION KG/J'];
      if ('NB_PORTEES' in p) supabasePatch.nb_portees = p.NB_PORTEES;
      if ('DATE_MB_PREVUE' in p) {
        const fr = p.DATE_MB_PREVUE as string;
        supabasePatch.date_mb_prevue = fr
          ? fr.split('/').reverse().join('-')
          : null;
      }
      if ('DATE_NAISSANCE' in p) {
        supabasePatch.date_naissance = (p.DATE_NAISSANCE as string) || null;
      }
      if ('ORIGINE' in p) supabasePatch.origine = p.ORIGINE;
      if ('LOGE' in p) supabasePatch.localisation = p.LOGE;
      if ('NOTES' in p) supabasePatch.notes = p.NOTES;
      if (photoDirty) supabasePatch.photo_url = photoUrl ?? null;
      if (selectedLogeIdDirty) supabasePatch.loge_id = selectedLogeId || null;
      const writeResult = await updateSow(truie.id, supabasePatch);
      if (!writeResult.success) {
        setToast(`Erreur : ${writeResult.error ?? 'Enregistrement échoué'}`);
        return;
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

  const displayId = truie.displayId || truie.id;

  // ─── Classes réutilisables ────────────────────────────────────────────
  const sectionTitleCls =
    'text-mono-micror text-text-2 pb-1 border-b border-border';

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
          aria-label="Édition truie"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-mono-label text-text-1">
                Modifier la truie
              </p>
              <p className="text-mono-micro text-text-2 tabular-nums mt-0.5">
                {displayId}
                {truie.boucle ? ` · ${truie.boucle}` : ''}
              </p>
            </div>
          </div>

          {/* ── Section 0 : Photo ────────────────────────────────────── */}
          <section className="space-y-4" aria-labelledby="sect-photo">
            <h3 id="sect-photo" className={sectionTitleCls}>
              Photo
            </h3>
            <PhotoUploader
              photoUrl={photoUrl}
              farmId={farmId}
              animalId={truie.id}
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

          {/* ── Section 1 : Identité ─────────────────────────────────── */}
          <section className="space-y-4" aria-labelledby="sect-identite">
            <h3 id="sect-identite" className={sectionTitleCls}>
              Identité
            </h3>

            {/* Code interne (displayId — éditable) */}
            <FormField
              label="Code interne"
              required
              hint="Tu peux changer le préfixe (T → K, etc.) — code interne unique pour ta ferme · 3-15 lettres/chiffres/tirets"
              error={errors.codeId}
            >
              <Input
                id="edit-truie-codeid"
                type="text"
                maxLength={15}
                aria-label="Code interne de la truie"
                aria-required="true"
                aria-invalid={!!errors.codeId}
                aria-describedby={errors.codeId ? 'edit-truie-codeid-error' : 'edit-truie-codeid-hint'}
                placeholder="Ex: K13-T-001"
                value={draft.codeId}
                onChange={e => update('codeId', e.target.value)}
                disabled={saving}
                autoComplete="off"
                spellCheck={false}
              />
            </FormField>

            {/* Nom */}
            <FormField label="Nom" error={errors.nom}>
              <Input
                id="edit-truie-nom"
                ref={firstFieldRef}
                type="text"
                maxLength={30}
                aria-label={`Nom de la truie ${displayId}`}
                aria-invalid={!!errors.nom}
                aria-describedby={errors.nom ? 'edit-truie-nom-error' : 'edit-truie-nom-hint'}
                placeholder="Ex: Berthe"
                value={draft.nom}
                onChange={e => update('nom', e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <p id="edit-truie-nom-hint" className="text-[10px] text-text-2 tabular-nums mt-1">
                {draft.nom.trim().length}/30 · laisser vide pour retirer
              </p>
              {errors.nom ? (
                <p id="edit-truie-nom-error" className="sr-only">{errors.nom}</p>
              ) : null}
            </FormField>

            {/* Boucle (obligatoire) */}
            <FormField
              label="Boucle"
              required
              hint="Identifiant physique (obligatoire)"
              error={errors.boucle}
            >
              <Input
                id="edit-truie-boucle"
                type="text"
                maxLength={30}
                aria-label="Boucle de la truie"
                aria-required="true"
                aria-invalid={!!errors.boucle}
                aria-describedby={errors.boucle ? 'edit-truie-boucle-error' : 'edit-truie-boucle-hint'}
                placeholder="Ex: FR-001-1234"
                value={draft.boucle}
                onChange={e => update('boucle', e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>

            {/* Race */}
            <FormField
              label="Race"
              hint={`optionnel · ${draft.race.trim().length}/40 · suggestions dans la liste`}
              error={errors.race}
            >
              <Input
                id="edit-truie-race"
                type="text"
                list="edit-truie-race-list"
                maxLength={40}
                aria-label="Race de la truie"
                aria-invalid={!!errors.race}
                aria-describedby={errors.race ? 'edit-truie-race-error' : 'edit-truie-race-hint'}
                placeholder="Ex: Large White"
                value={draft.race}
                onChange={e => update('race', e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
              <datalist id="edit-truie-race-list">
                {RACE_SUGGESTIONS.map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </FormField>

            {/* Poids */}
            <FormField label="Poids (kg)" hint="optionnel · 0 à 350 kg · pas 0.5" error={errors.poids}>
              <Input
                id="edit-truie-poids"
                type="number"
                inputMode="decimal"
                min={0}
                max={350}
                step={0.5}
                aria-label="Poids de la truie en kilogrammes"
                aria-invalid={!!errors.poids}
                aria-describedby={errors.poids ? 'edit-truie-poids-error' : 'edit-truie-poids-hint'}
                placeholder="0"
                value={draft.poids}
                onChange={e => update('poids', e.target.value)}
                disabled={saving}
              />
            </FormField>

            {/* Date de naissance */}
            <FormField label="Date de naissance" hint="optionnel" error={errors.dateNaissance}>
              <Input
                id="edit-truie-naissance"
                type="date"
                aria-invalid={!!errors.dateNaissance}
                aria-describedby={errors.dateNaissance ? 'edit-truie-naissance-error' : undefined}
                value={draft.dateNaissance}
                onChange={e => update('dateNaissance', e.target.value)}
                disabled={saving}
              />
            </FormField>

            {/* Origine */}
            <FormField
              label="Origine"
              hint={`optionnel · ${draft.origine.trim().length}/50`}
              error={errors.origine}
            >
              <Input
                id="edit-truie-origine"
                type="text"
                maxLength={50}
                aria-invalid={!!errors.origine}
                aria-describedby={errors.origine ? 'edit-truie-origine-error' : 'edit-truie-origine-hint'}
                placeholder="Ex: Élevage Thomasset"
                value={draft.origine}
                onChange={e => update('origine', e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>

            {/* Emplacement loge */}
            <FormField
              label="Emplacement loge"
              hint={`optionnel · ${draft.loge.trim().length}/30`}
              error={errors.loge}
            >
              <Input
                id="edit-truie-loge"
                type="text"
                maxLength={30}
                aria-invalid={!!errors.loge}
                aria-describedby={errors.loge ? 'edit-truie-loge-error' : 'edit-truie-loge-hint'}
                placeholder="Ex: Maternité L3"
                value={draft.loge}
                onChange={e => update('loge', e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </FormField>

            {/* V25 — Loge structurée (référentiel) */}
            <FormField label="Loge (référentiel)" hint="optionnel · 1 truie = 1 loge dédiée (spec).">
              <Select
                id="edit-truie-loge-ref"
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
              {logeConflict ? (
                <p
                  role="alert"
                  data-testid="loge-conflict-warning"
                  className="mt-1 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-[11px] text-red"
                >
                  Loge {loges.find(l => l.id === selectedLogeId)?.numero ?? ''}{' '}
                  occupée par{' '}
                  {logeConflict.kind === 'truie'
                    ? `truie ${logeConflict.label}`
                    : logeConflict.kind === 'verrat'
                      ? `verrat ${logeConflict.label}`
                      : `bande ${logeConflict.label}`}
                </p>
              ) : null}
            </FormField>
          </section>

          {/* ── Section 2 : Reproduction ─────────────────────────────── */}
          <section className="space-y-4" aria-labelledby="sect-repro">
            <h3 id="sect-repro" className={sectionTitleCls}>
              Reproduction
            </h3>

            {/* Stade */}
            <FormField label="Stade">
              <Select
                id="edit-truie-stade"
                aria-label="Stade physiologique"
                value={draft.stade}
                onChange={e => update('stade', e.target.value)}
                disabled={saving}
              >
                {STADE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === '' ? '—' : opt}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Statut */}
            <FormField label="Statut">
              <Select
                id="edit-truie-statut"
                aria-label="Statut reproducteur"
                value={draft.statut}
                onChange={e => update('statut', e.target.value)}
                disabled={saving}
              >
                {STATUT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === '' ? '—' : opt}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Ration */}
            <FormField label="Ration (kg/j)" error={errors.ration}>
              <Input
                id="edit-truie-ration"
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step={0.1}
                aria-label="Ration alimentaire en kilogrammes par jour"
                aria-required="true"
                aria-invalid={!!errors.ration}
                aria-describedby={errors.ration ? 'edit-truie-ration-error' : 'edit-truie-ration-hint'}
                placeholder="0.0"
                value={draft.ration}
                onChange={e => update('ration', e.target.value)}
                disabled={saving}
              />
              <p id="edit-truie-ration-hint" className="text-[10px] text-text-2 tabular-nums mt-1">
                0 à 10 kg/j · pas 0.1
              </p>
              {errors.ration ? (
                <p id="edit-truie-ration-error" className="sr-only">{errors.ration}</p>
              ) : null}
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nb portées" hint="0 à 20" error={errors.nbPortees}>
                <Input
                  id="edit-truie-nbportees"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={20}
                  step={1}
                  aria-label="Nombre total de portées"
                  aria-invalid={!!errors.nbPortees}
                  aria-describedby={errors.nbPortees ? 'edit-truie-nbportees-error' : 'edit-truie-nbportees-hint'}
                  placeholder="0"
                  value={draft.nbPortees}
                  onChange={e => update('nbPortees', e.target.value)}
                  disabled={saving}
                />
              </FormField>

              <FormField label="Dernière NV" hint="0 à 25" error={errors.derniereNV}>
                <Input
                  id="edit-truie-nv"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-label="Nés vivants de la dernière portée"
                  aria-invalid={!!errors.derniereNV}
                  aria-describedby={errors.derniereNV ? 'edit-truie-nv-error' : 'edit-truie-nv-hint'}
                  placeholder="0"
                  value={draft.derniereNV}
                  onChange={e => update('derniereNV', e.target.value)}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Date MB prévue */}
            <FormField label="Date MB prévue" hint="Laisser vide si inconnu" error={errors.dateMBPrevue}>
              <Input
                id="edit-truie-datemb"
                type="date"
                aria-label="Date de mise-bas prévue"
                aria-invalid={!!errors.dateMBPrevue}
                aria-describedby={errors.dateMBPrevue ? 'edit-truie-datemb-error' : 'edit-truie-datemb-hint'}
                value={draft.dateMBPrevue}
                onChange={e => update('dateMBPrevue', e.target.value)}
                disabled={saving}
              />
            </FormField>
          </section>

          {/* ── Section 3 : Notes ────────────────────────────────────── */}
          <section className="space-y-4" aria-labelledby="sect-notes">
            <h3 id="sect-notes" className={sectionTitleCls}>
              Notes
            </h3>

            <FormField
              label="Notes"
              hint={`optionnel · ${draft.notes.trim().length}/200`}
              error={errors.notes}
            >
              <Textarea
                id="edit-truie-notes"
                maxLength={200}
                rows={3}
                aria-label="Notes libres sur la truie"
                aria-invalid={!!errors.notes}
                aria-describedby={errors.notes ? 'edit-truie-notes-error' : 'edit-truie-notes-hint'}
                placeholder="Observations, remarques…"
                value={draft.notes}
                onChange={e => update('notes', e.target.value)}
                disabled={saving}
              />
            </FormField>
          </section>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 sticky bottom-0 bg-bg-1 -mx-4 px-4 pb-2 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
              aria-label="Annuler et fermer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              aria-label="Enregistrer les modifications de la truie"
              aria-busy={saving}
            >
              {saving ? 'Enregistrement…' : (
                <span className="inline-flex items-center gap-2">
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

export default QuickEditTruieForm;
