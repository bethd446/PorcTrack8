/**
 * EditTruieWizard — V32 PHASE 4
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte du modal-monstre QuickEditTruieForm en wizard 3 étapes.
 *
 *   Étape 1 — IDENTIFIANT     : Code, Boucle, Nom, Photo
 *   Étape 2 — REPRODUCTION    : Stade, Verrat, Date saillie/MB, Ration, Aliment
 *   Étape 3 — IDENTITÉ + LOGE : Race, Origine, Loge, Notes
 *
 * Persistance : utilise validateTruieEditFull + updateSow (mêmes services que
 * QuickEditTruieForm legacy). Le legacy est conservé pour rétrocompat tests.
 *
 * Tokens : --pt-* uniquement. Tap targets ≥ 44px.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonModal, IonToast } from '@ionic/react';

import { Wizard, type WizardStep } from '../../design-system';
import PhotoUploader from './PhotoUploader';
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

// ─── Options ───────────────────────────────────────────────────────────────
const STADE_OPTIONS = [
  '',
  'Jeune',
  'Adulte',
  'Reproductrice',
  'Gestante',
  'Allaitante',
] as const;

const RACE_SUGGESTIONS = [
  'Large White',
  'Landrace',
  'Duroc',
  'Large White × Landrace',
  'Autre',
];

const ALIMENT_OPTIONS = [
  '',
  'Gestation',
  'Lactation',
  'Pré-saillie',
  'Truie tarie',
  'Autre',
];

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// ─── Styles ────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 'var(--pt-text-label)',
  letterSpacing: 'var(--pt-tracking-label)',
  color: 'var(--pt-text-muted)',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const hintStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  color: 'var(--pt-text-subtle)',
  marginTop: 4,
};

const errStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 11,
  color: 'var(--pt-danger)',
  marginTop: 4,
};

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    minHeight: 44,
    padding: '10px 14px',
    background: 'var(--pt-surface)',
    color: 'var(--pt-text)',
    border: `1px solid ${hasError ? 'var(--pt-danger)' : 'var(--pt-divider)'}`,
    borderRadius: 'var(--pt-radius-pill)',
    fontFamily: 'var(--pt-font-body)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface EditTruieWizardProps {
  isOpen: boolean;
  onClose: () => void;
  truie: Truie;
  onSuccess?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

const EditTruieWizard: React.FC<EditTruieWizardProps> = ({
  isOpen,
  onClose,
  truie,
  onSuccess,
}) => {
  const { refreshData, truies, verrats, bandes, saillies } = useFarm();
  const { user } = useAuth();
  const farmId = user?.id ?? '';

  const initial = useMemo(() => buildInitial(truie), [truie]);

  const existingCodes = useMemo(() => {
    const s = new Set<string>();
    for (const t of truies) {
      if (t.id !== truie.id && t.displayId) s.add(t.displayId);
    }
    return s;
  }, [truies, truie.id]);

  // Saillie courante (si elle existe) — pour pré-remplir verrat / date saillie
  const currentSaillie = useMemo(() => {
    const sList = saillies.filter(
      (s) =>
        s.truieId === truie.id ||
        (!!truie.displayId && s.truieId === truie.displayId),
    );
    return sList[0] ?? null;
  }, [saillies, truie]);

  const [draft, setDraft] = useState<TruieEditDraft>(initial);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(truie.photoUrl);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [errors, setErrors] = useState<TruieEditValidation['errors']>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Champs spécifiques wizard (hors validation TruieEditDraft)
  const [verratId, setVerratId] = useState<string>(currentSaillie?.verratId ?? '');
  const [dateSaillie, setDateSaillie] = useState<string>(
    frDateToIso(currentSaillie?.dateSaillie ?? '') || '',
  );
  const [aliment, setAliment] = useState<string>('');

  const [loges, setLoges] = useState<Loge[]>([]);
  const [selectedLogeId, setSelectedLogeId] = useState<string>(truie.logeId ?? '');
  const [selectedLogeIdDirty, setSelectedLogeIdDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then((rows) => {
        if (cancelled) return;
        setLoges(rows.filter((l) => l.active));
      })
      .catch(() => {
        if (!cancelled) setLoges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const logeConflict = useMemo<{ kind: 'truie' | 'verrat' | 'bande'; label: string } | null>(() => {
    if (!selectedLogeId) return null;
    const otherTruie = truies.find(
      (t) => t.id !== truie.id && t.logeId === selectedLogeId,
    );
    if (otherTruie) {
      return {
        kind: 'truie',
        label: otherTruie.displayId || otherTruie.boucle || otherTruie.id,
      };
    }
    const v = verrats.find((v0) => v0.logeId === selectedLogeId);
    if (v) {
      return {
        kind: 'verrat',
        label: v.displayId || v.boucle || v.id,
      };
    }
    const b = bandes.find((b0) => b0.logeId === selectedLogeId);
    if (b) return { kind: 'bande', label: b.idPortee || b.id };
    return null;
  }, [selectedLogeId, truies, verrats, bandes, truie.id]);

  // Reset à l'ouverture
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
      setVerratId(currentSaillie?.verratId ?? '');
      setDateSaillie(frDateToIso(currentSaillie?.dateSaillie ?? '') || '');
      setAliment('');
    }
  }

  const update = useCallback(
    <K extends keyof TruieEditDraft>(key: K, value: TruieEditDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Date MB prévue auto = saillie + 115j si saillie saisie et MB vide
  useEffect(() => {
    if (!dateSaillie) return;
    if (draft.dateMBPrevue) return;
    const d = new Date(dateSaillie);
    if (Number.isNaN(d.getTime())) return;
    d.setDate(d.getDate() + 115);
    const iso = d.toISOString().slice(0, 10);
    setDraft((prev) => ({ ...prev, dateMBPrevue: iso }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateSaillie]);

  // Validation step 1 (Identifiant)
  const validateStep1 = useCallback((): boolean => {
    const result = validateTruieEditFull(draft, initial, existingCodes);
    const stepErrors: TruieEditValidation['errors'] = {};
    if (result.errors.codeId) stepErrors.codeId = result.errors.codeId;
    if (result.errors.boucle) stepErrors.boucle = result.errors.boucle;
    if (result.errors.nom) stepErrors.nom = result.errors.nom;
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return false;
    }
    setErrors({});
    return true;
  }, [draft, initial, existingCodes]);

  // Validation step 2 (Reproduction)
  const validateStep2 = useCallback((): boolean => {
    const result = validateTruieEditFull(draft, initial, existingCodes);
    const stepErrors: TruieEditValidation['errors'] = {};
    if (result.errors.stade) stepErrors.stade = result.errors.stade;
    if (result.errors.ration) stepErrors.ration = result.errors.ration;
    if (result.errors.dateMBPrevue) stepErrors.dateMBPrevue = result.errors.dateMBPrevue;
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return false;
    }
    setErrors({});
    return true;
  }, [draft, initial, existingCodes]);

  const handleComplete = useCallback(async () => {
    const result = validateTruieEditFull(draft, initial, existingCodes);
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
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
  }, [
    draft,
    initial,
    existingCodes,
    selectedLogeIdDirty,
    selectedLogeId,
    logeConflict,
    photoDirty,
    photoUrl,
    truie.id,
    refreshData,
    onClose,
    onSuccess,
  ]);

  // ── Steps ────────────────────────────────────────────────────────────────

  const steps: WizardStep[] = [
    {
      label: 'Identifiant',
      validate: () => validateStep1(),
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Code interne */}
          <div>
            <label htmlFor="wiz-codeid" style={labelStyle}>
              Code interne · requis
            </label>
            <input
              id="wiz-codeid"
              type="text"
              maxLength={15}
              autoComplete="off"
              spellCheck={false}
              aria-required="true"
              aria-invalid={!!errors.codeId}
              style={inputStyle(!!errors.codeId)}
              value={draft.codeId}
              onChange={(e) => update('codeId', e.target.value)}
              disabled={saving}
              placeholder="Ex: K13-T-001"
            />
            <p style={hintStyle}>
              Code unique pour ta ferme · 3-15 caractères · tu peux changer le préfixe
            </p>
            {errors.codeId ? <p role="alert" style={errStyle}>{errors.codeId}</p> : null}
          </div>

          {/* Boucle */}
          <div>
            <label htmlFor="wiz-boucle" style={labelStyle}>
              Boucle · optionnel
            </label>
            <input
              id="wiz-boucle"
              type="text"
              maxLength={30}
              autoComplete="off"
              aria-invalid={!!errors.boucle}
              style={inputStyle(!!errors.boucle)}
              value={draft.boucle}
              onChange={(e) => update('boucle', e.target.value)}
              disabled={saving}
              placeholder="Ex: FR-001-1234"
            />
            {errors.boucle ? <p role="alert" style={errStyle}>{errors.boucle}</p> : null}
          </div>

          {/* Nom */}
          <div>
            <label htmlFor="wiz-nom" style={labelStyle}>
              Nom · optionnel
            </label>
            <input
              id="wiz-nom"
              type="text"
              maxLength={30}
              autoComplete="off"
              aria-invalid={!!errors.nom}
              style={inputStyle(!!errors.nom)}
              value={draft.nom}
              onChange={(e) => update('nom', e.target.value)}
              disabled={saving}
              placeholder="Ex: Berthe"
            />
            <p style={hintStyle}>{draft.nom.trim().length}/30</p>
            {errors.nom ? <p role="alert" style={errStyle}>{errors.nom}</p> : null}
          </div>

          {/* Photo */}
          <div>
            <label style={labelStyle}>Photo · optionnel</label>
            <PhotoUploader
              photoUrl={photoUrl}
              farmId={farmId}
              animalId={truie.id}
              onUploaded={(url) => {
                setPhotoUrl(url);
                setPhotoDirty(true);
              }}
              onDeleted={() => {
                setPhotoUrl(undefined);
                setPhotoDirty(true);
              }}
              disabled={saving}
            />
          </div>
        </div>
      ),
    },
    {
      label: 'Reproduction',
      validate: () => validateStep2(),
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stade */}
          <div>
            <label htmlFor="wiz-stade" style={labelStyle}>
              Stade reproductif
            </label>
            <select
              id="wiz-stade"
              style={inputStyle(false)}
              value={draft.stade}
              onChange={(e) => update('stade', e.target.value)}
              disabled={saving}
            >
              {STADE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? '—' : opt}
                </option>
              ))}
            </select>
          </div>

          {/* Verrat saillie courante */}
          <div>
            <label htmlFor="wiz-verrat" style={labelStyle}>
              Verrat saillie courante · optionnel
            </label>
            <select
              id="wiz-verrat"
              style={inputStyle(false)}
              value={verratId}
              onChange={(e) => setVerratId(e.target.value)}
              disabled={saving}
            >
              <option value="">— Aucun —</option>
              {verrats.map((v) => (
                <option key={v.id} value={v.displayId}>
                  {v.displayId}{v.nom ? ` · ${v.nom}` : ''}
                </option>
              ))}
            </select>
            <p style={hintStyle}>Lecture seule (info) — saisir une saillie via le bouton dédié.</p>
          </div>

          {/* Date saillie */}
          <div>
            <label htmlFor="wiz-date-saillie" style={labelStyle}>
              Date saillie · optionnel
            </label>
            <input
              id="wiz-date-saillie"
              type="date"
              style={inputStyle(false)}
              value={dateSaillie}
              onChange={(e) => setDateSaillie(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Date MB prévue */}
          <div>
            <label htmlFor="wiz-date-mb" style={labelStyle}>
              Date mise-bas prévue · optionnel
            </label>
            <input
              id="wiz-date-mb"
              type="date"
              aria-invalid={!!errors.dateMBPrevue}
              style={inputStyle(!!errors.dateMBPrevue)}
              value={draft.dateMBPrevue}
              onChange={(e) => update('dateMBPrevue', e.target.value)}
              disabled={saving}
            />
            <p style={hintStyle}>Calculée auto : saillie + 115 jours</p>
            {errors.dateMBPrevue ? <p role="alert" style={errStyle}>{errors.dateMBPrevue}</p> : null}
          </div>

          {/* Ration */}
          <div>
            <label htmlFor="wiz-ration" style={labelStyle}>
              Ration kg/j
            </label>
            <input
              id="wiz-ration"
              type="number"
              inputMode="decimal"
              min={0}
              max={10}
              step={0.1}
              aria-invalid={!!errors.ration}
              style={inputStyle(!!errors.ration)}
              value={draft.ration}
              onChange={(e) => update('ration', e.target.value)}
              disabled={saving}
              placeholder="0.0"
            />
            <p style={hintStyle}>0 à 10 kg/j · pas 0.1</p>
            {errors.ration ? <p role="alert" style={errStyle}>{errors.ration}</p> : null}
          </div>

          {/* Aliment */}
          <div>
            <label htmlFor="wiz-aliment" style={labelStyle}>
              Aliment · optionnel
            </label>
            <select
              id="wiz-aliment"
              style={inputStyle(false)}
              value={aliment}
              onChange={(e) => setAliment(e.target.value)}
              disabled={saving}
            >
              {ALIMENT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? '—' : opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      ),
    },
    {
      label: 'Identité physique · Loge · Notes',
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Race */}
          <div>
            <label htmlFor="wiz-race" style={labelStyle}>
              Race · optionnel
            </label>
            <input
              id="wiz-race"
              type="text"
              list="wiz-race-list"
              maxLength={40}
              autoComplete="off"
              aria-invalid={!!errors.race}
              style={inputStyle(!!errors.race)}
              value={draft.race}
              onChange={(e) => update('race', e.target.value)}
              disabled={saving}
              placeholder="Ex: Large White"
            />
            <datalist id="wiz-race-list">
              {RACE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {errors.race ? <p role="alert" style={errStyle}>{errors.race}</p> : null}
          </div>

          {/* Origine */}
          <div>
            <label htmlFor="wiz-origine" style={labelStyle}>
              Origine · optionnel
            </label>
            <input
              id="wiz-origine"
              type="text"
              maxLength={50}
              autoComplete="off"
              aria-invalid={!!errors.origine}
              style={inputStyle(!!errors.origine)}
              value={draft.origine}
              onChange={(e) => update('origine', e.target.value)}
              disabled={saving}
              placeholder="Ex: Élevage Thomasset"
            />
            {errors.origine ? <p role="alert" style={errStyle}>{errors.origine}</p> : null}
          </div>

          {/* Loge structurée */}
          <div>
            <label htmlFor="wiz-loge" style={labelStyle}>
              Loge · optionnel
            </label>
            <select
              id="wiz-loge"
              style={inputStyle(false)}
              value={selectedLogeId}
              onChange={(e) => {
                setSelectedLogeId(e.target.value);
                setSelectedLogeIdDirty(true);
              }}
              disabled={saving}
            >
              <option value="">— Aucune —</option>
              {loges.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.numero} · {l.type.toLowerCase().replace('_', '-')}
                  {l.batiment ? ` · ${l.batiment}` : ''}
                </option>
              ))}
            </select>
            {logeConflict ? (
              <p role="alert" data-testid="wiz-loge-conflict" style={errStyle}>
                Loge {loges.find((l) => l.id === selectedLogeId)?.numero ?? ''}{' '}
                occupée par{' '}
                {logeConflict.kind === 'truie'
                  ? `truie ${logeConflict.label}`
                  : logeConflict.kind === 'verrat'
                    ? `verrat ${logeConflict.label}`
                    : `bande ${logeConflict.label}`}
              </p>
            ) : null}
            <p style={hintStyle}>1 truie = 1 loge dédiée.</p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="wiz-notes" style={labelStyle}>
              Notes · optionnel
            </label>
            <textarea
              id="wiz-notes"
              maxLength={200}
              rows={3}
              aria-invalid={!!errors.notes}
              style={{
                ...inputStyle(!!errors.notes),
                borderRadius: 'var(--pt-radius-md)',
                minHeight: 80,
                padding: 12,
                resize: 'vertical',
              }}
              value={draft.notes}
              onChange={(e) => update('notes', e.target.value)}
              disabled={saving}
              placeholder="Observations, remarques…"
            />
            <p style={hintStyle}>{draft.notes.trim().length}/200</p>
            {errors.notes ? <p role="alert" style={errStyle}>{errors.notes}</p> : null}
          </div>
        </div>
      ),
    },
  ];

  const eyebrow = `Éditer · ${truie.displayId || truie.id}`;

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <Wizard
          id={`edit-truie-${truie.id}`}
          steps={steps}
          eyebrow={eyebrow}
          onCancel={onClose}
          onComplete={handleComplete}
          completeLabel="Enregistrer"
          busy={saving}
        />
      </IonModal>

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

export default EditTruieWizard;
