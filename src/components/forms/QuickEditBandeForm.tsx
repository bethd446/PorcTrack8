import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';

import { BottomSheet } from '../agritech';
import {
  addBatchSource,
  getBatchSources,
  listLoges,
  removeBatchSource,
  updateBatchByCode,
} from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import type { BandePorcelets, BatchSource, Loge } from '../../types/farm';
import {
  validateBandeEdit,
  bandeToRawInput,
  BANDE_STATUTS,
  type BandeEditErrors,
  type BandeEditRawInput,
} from './quickEditBandeValidation';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import PhotoUploader from './PhotoUploader';
import QuickAddLogeForm from './QuickAddLogeForm';

/* ═════════════════════════════════════════════════════════════════════════
   QuickEditBandeForm · Édition rapide d'une bande/portée
   ─────────────────────────────────────────────────────────────────────────
   Sections :
     - Identité (ID Portée readonly, truie, boucle mère)
     - Mise-bas (date MB, NV, morts, vivants)
     - Sevrage (date prévue, date réelle)
     - Séparation sexe (nbMales, nbFemelles, date séparation, loge)
     - Statut (select)
     - Notes (textarea 300 chars)

   Submit → enqueueUpdateRow('PORCELETS_BANDES_DETAIL', 'ID', bande.id, patch)
   Clés canoniques envoyées : DATE_MB, NV, MORTS, VIVANTS, DATE_SEVRAGE_PREVUE,
   DATE_SEVRAGE_REELLE, NB_MALES, NB_FEMELLES, DATE_SEPARATION,
   LOGE_ENGRAISSEMENT, STATUT, NOTES, TRUIE, BOUCLE_MERE.

   Dates converties ISO yyyy-MM-dd → dd/MM/yyyy (format Sheets).
   Patch partiel : seules les valeurs modifiées sont envoyées.
   ═════════════════════════════════════════════════════════════════════════ */

interface QuickEditBandeFormProps {
  isOpen: boolean;
  onClose: () => void;
  bande: BandePorcelets;
  onSuccess?: () => void;
}

const QuickEditBandeForm: React.FC<QuickEditBandeFormProps> = ({
  isOpen,
  onClose,
  bande,
  onSuccess,
}) => {
  const { refreshData, saillies, verrats, bandes, truies } = useFarm();
  const { user } = useAuth();
  const farmId = user?.id ?? '';

  const initial = useMemo<BandeEditRawInput>(
    () => ({ ...bandeToRawInput(bande), codeId: bande.idPortee ?? '' }),
    [bande],
  );

  // Codes existants (autres bandes) pour valider l'unicité.
  const existingCodes = useMemo(() => {
    const s = new Set<string>();
    for (const b of bandes) {
      if (b.id !== bande.id && b.idPortee) s.add(b.idPortee);
    }
    return s;
  }, [bandes, bande.id]);

  const [form, setForm] = useState<BandeEditRawInput>(initial);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(bande.photoUrl);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [loge, setLoge] = useState<string>(bande.loge ?? '');
  const [logeDirty, setLogeDirty] = useState(false);
  const [errors, setErrors] = useState<BandeEditErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // V24 — Sources (multi-mères)
  const [sources, setSources] = useState<BatchSource[]>(bande.sources ?? []);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [newSourceSowId, setNewSourceSowId] = useState('');
  const [newSourceNb, setNewSourceNb] = useState('');
  const [newSourceDate, setNewSourceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [newSourceNotes, setNewSourceNotes] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [sourceBusy, setSourceBusy] = useState(false);

  // V24 — Loge structurée
  const [loges, setLoges] = useState<Loge[]>([]);
  const [selectedLogeId, setSelectedLogeId] = useState<string>(bande.logeId ?? '');
  const [selectedLogeIdDirty, setSelectedLogeIdDirty] = useState(false);
  const [addLogeOpen, setAddLogeOpen] = useState(false);

  // Charger les sources réelles à l'ouverture (le mapping côté service peut
  // ne pas être encore propagé via refreshData).
  useEffect(() => {
    if (!isOpen || !bande.id) return;
    let cancelled = false;
    getBatchSources(bande.id).then(rows => {
      if (cancelled) return;
      // Si la table n'existe pas encore (migration v24 absente), on conserve
      // les sources fournies dans le prop bande (qui peut être vide).
      if (rows.length > 0) setSources(rows);
      else if (bande.sources && bande.sources.length > 0) {
        setSources(bande.sources);
      }
    });
    listLoges().then(rows => {
      if (cancelled) return;
      setLoges(rows.filter(l => l.active));
    });
    return () => { cancelled = true; };
  }, [isOpen, bande.id, bande.sources]);

  // Origine = parents truie + verrat (readonly, déduit via dernière saillie liée)
  const origineDeduite = useMemo(() => {
    const truie = bande.truie ?? '';
    const lastSaillie = [...saillies]
      .filter(s => truie && (s.truieId === truie || s.truieNom === truie))
      .sort((a, b) => (b.dateSaillie ?? '').localeCompare(a.dateSaillie ?? ''))[0];
    const verratId = lastSaillie?.verratId ?? '';
    const verrat = verrats.find(v => v.id === verratId || v.displayId === verratId);
    const verratLabel = verrat ? (verrat.nom || verrat.displayId) : verratId;
    if (!truie && !verratLabel) return '';
    return [truie, verratLabel].filter(Boolean).join(' × ');
  }, [bande.truie, saillies, verrats]);

  // Render-time sync: reset on (re)open or bande change (avoids setState-in-effect).
  const [lastKey, setLastKey] = useState<{ isOpen: boolean; bandeId: string }>({
    isOpen,
    bandeId: bande.id,
  });
  if (lastKey.isOpen !== isOpen || lastKey.bandeId !== bande.id) {
    setLastKey({ isOpen, bandeId: bande.id });
    if (isOpen) {
      setForm({ ...bandeToRawInput(bande), codeId: bande.idPortee ?? '' });
      setPhotoUrl(bande.photoUrl);
      setPhotoDirty(false);
      setLoge(bande.loge ?? '');
      setLogeDirty(false);
      setSources(bande.sources ?? []);
      setSelectedLogeId(bande.logeId ?? '');
      setSelectedLogeIdDirty(false);
      setErrors({});
      setSaving(false);
    }
  }

  // Truies disponibles pour ajout source (exclut celles déjà sources).
  const sourceSowIds = useMemo(() => new Set(sources.map(s => s.sowId)), [sources]);
  const truiesDisponibles = useMemo(
    () => truies.filter(t => !sourceSowIds.has(t.id)),
    [truies, sourceSowIds],
  );

  // Total porcelets apportés (somme des sources).
  const totalApportes = useMemo(
    () => sources.reduce((sum, s) => sum + s.nbPorceletsApportes, 0),
    [sources],
  );
  // Warning UI si sum > nv (pas blocage).
  const overCapacityWarning = useMemo(() => {
    const nv = Number(form.nv);
    return Number.isFinite(nv) && nv > 0 && totalApportes > nv;
  }, [form.nv, totalApportes]);

  // Occupation actuelle des loges (autres bandes + truies + verrats).
  const logeOccupation = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bandes) {
      if (b.id !== bande.id && b.logeId) {
        map.set(b.logeId, (map.get(b.logeId) ?? 0) + (b.vivants ?? 0));
      }
    }
    for (const t of truies) {
      if (t.logeId) map.set(t.logeId, (map.get(t.logeId) ?? 0) + 1);
    }
    for (const v of verrats) {
      if (v.logeId) map.set(v.logeId, (map.get(v.logeId) ?? 0) + 1);
    }
    return map;
  }, [bandes, truies, verrats, bande.id]);

  const handleAddSource = async (): Promise<void> => {
    setSourceError('');
    if (!newSourceSowId) {
      setSourceError('Sélectionne une truie');
      return;
    }
    const nb = Number(newSourceNb);
    if (!Number.isFinite(nb) || nb <= 0 || nb > 30) {
      setSourceError('Nb porcelets entre 1 et 30');
      return;
    }
    setSourceBusy(true);
    try {
      const created = await addBatchSource({
        batchId: bande.id,
        sowId: newSourceSowId,
        nbPorcelets: nb,
        dateAjout: newSourceDate || undefined,
        notes: newSourceNotes.trim() || undefined,
      });
      setSources(prev => [...prev, created]);
      setNewSourceSowId('');
      setNewSourceNb('');
      setNewSourceNotes('');
      setNewSourceDate(new Date().toISOString().slice(0, 10));
      setAddSourceOpen(false);
      setToast('Truie source ajoutée');
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSourceBusy(false);
    }
  };

  const handleRemoveSource = async (id: string): Promise<void> => {
    setSourceBusy(true);
    try {
      await removeBatchSource(id);
      setSources(prev => prev.filter(s => s.id !== id));
      setToast('Truie source retirée');
    } catch (err) {
      setToast(err instanceof Error ? `Erreur : ${err.message}` : 'Erreur');
    } finally {
      setSourceBusy(false);
    }
  };

  const handleLogeCreated = (newLoge: Loge): void => {
    setLoges(prev => [...prev, newLoge]);
    setSelectedLogeId(newLoge.id);
    setSelectedLogeIdDirty(true);
    setAddLogeOpen(false);
    setToast(`Loge ${newLoge.numero} créée`);
  };

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const update = <K extends keyof BandeEditRawInput>(
    key: K,
    value: BandeEditRawInput[K],
  ): void => {
    setForm(f => {
      const next = { ...f, [key]: value };
      // Auto-calc date sevrage prévue = dateMB + 28j si vide
      if (key === 'dateMB' && typeof value === 'string' && value && !f.dateSevragePrevue) {
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
          d.setUTCDate(d.getUTCDate() + 28);
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          next.dateSevragePrevue = `${yyyy}-${mm}-${dd}`;
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const result = validateBandeEdit(form, initial, existingCodes);
    if (!result.ok || !result.patch) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    // Patch vide et pas de modif photo/loge → pas d'appel réseau, on ferme.
    if (
      Object.keys(result.patch).length === 0 &&
      !photoDirty &&
      !logeDirty &&
      !selectedLogeIdDirty
    ) {
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
      if ('CODE_ID' in p) supabasePatch.code_id = p.CODE_ID;
      if ('STATUT' in p) supabasePatch.statut = p.STATUT;
      if ('NOTES' in p) supabasePatch.notes = p.NOTES;
      if ('LOGE_ENGRAISSEMENT' in p) supabasePatch.loge = p.LOGE_ENGRAISSEMENT;
      if ('DATE_MB' in p) supabasePatch.date_mise_bas = frToIso(p.DATE_MB);
      if ('DATE_SEVRAGE_PREVUE' in p)
        supabasePatch.date_sevrage_prevue = frToIso(p.DATE_SEVRAGE_PREVUE);
      if ('DATE_SEVRAGE_REELLE' in p)
        supabasePatch.date_sevrage = frToIso(p.DATE_SEVRAGE_REELLE);
      if ('NV' in p) supabasePatch.porcelets_nes_total = p.NV;
      if ('MORTS' in p) supabasePatch.nb_mort_nes = p.MORTS;
      if ('VIVANTS' in p) supabasePatch.porcelets_nes_vivants = p.VIVANTS;
      if ('POIDS_MOYEN_KG' in p) {
        supabasePatch.poids_moyen_kg = p.POIDS_MOYEN_KG === '' ? null : p.POIDS_MOYEN_KG;
      }
      if ('VERRAT_PERE' in p) {
        const code = String(p.VERRAT_PERE ?? '').trim();
        if (!code) {
          supabasePatch.boar_id = null;
        } else {
          const verrat = verrats.find(v => v.id === code || v.displayId === code);
          supabasePatch.boar_id = verrat?.id ?? null;
        }
      }
      if (photoDirty) supabasePatch.photo_url = photoUrl ?? null;
      if (logeDirty) supabasePatch.loge = loge.trim() || null;
      if (selectedLogeIdDirty) supabasePatch.loge_id = selectedLogeId || null;
      // Champs sans équivalent Supabase : TRUIE (snapshot), BOUCLE_MERE,
      // NB_MALES, NB_FEMELLES, DATE_SEPARATION → ignorés silencieusement.
      await updateBatchByCode(bande.id, supabasePatch);
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

  const displayId = bande.idPortee || bande.id;

  // Classes inputs réutilisables
  const inputBase = (hasError: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[14px] tabular-nums',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      hasError ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  const numInputCls = (hasError: boolean): string =>
    [
      'w-full h-12 rounded-md px-3',
      'bg-bg-0 border text-text-0 placeholder:text-text-2',
      'font-mono text-[18px] tabular-nums text-center',
      'outline-none transition-colors duration-[160ms]',
      'focus:border-accent focus:ring-1 focus:ring-accent',
      hasError ? 'border-red' : 'border-border hover:border-text-2',
    ].join(' ');

  const labelCls =
    'block font-mono text-[11px] uppercase tracking-wide text-text-2';

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
          aria-label="Édition bande"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                Modifier la portée
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 tabular-nums mt-0.5">
                {displayId}
              </p>
            </div>
          </div>

          {/* ── Photo ───────────────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Photo</legend>
            <PhotoUploader
              photoUrl={photoUrl}
              farmId={farmId}
              animalId={bande.id}
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
          </fieldset>

          {/* ── Identité ────────────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Identité</legend>

            <div className="space-y-1.5">
              <label htmlFor="edit-bande-id" className={labelCls}>
                Code interne <span className="text-red normal-case">· requis</span>
              </label>
              <input
                id="edit-bande-id"
                type="text"
                maxLength={15}
                aria-label={`Code interne portée ${displayId}`}
                aria-required="true"
                aria-invalid={!!errors.codeId}
                aria-describedby={
                  errors.codeId
                    ? 'edit-bande-id-error'
                    : 'edit-bande-id-hint'
                }
                className={inputBase(!!errors.codeId)}
                placeholder="Ex: K13-P-001"
                value={form.codeId}
                onChange={e => update('codeId', e.target.value)}
                disabled={saving}
                autoComplete="off"
                spellCheck={false}
              />
              <p
                id="edit-bande-id-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                Tu peux changer le préfixe (B → P, etc.) — code interne unique
                pour ta ferme · 3-15 lettres/chiffres/tirets
              </p>
              {errors.codeId ? (
                <p
                  id="edit-bande-id-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.codeId}
                </p>
              ) : null}
            </div>

            {/* Origine (parents truie × verrat) — readonly */}
            <div className="space-y-1.5">
              <label htmlFor="edit-bande-origine" className={labelCls}>
                Origine (parents)
              </label>
              <input
                id="edit-bande-origine"
                type="text"
                readOnly
                aria-readonly="true"
                value={origineDeduite || '—'}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-2 border border-border text-text-1',
                  'font-mono text-[13px]',
                  'cursor-not-allowed',
                ].join(' ')}
              />
            </div>

            {/* Verrat père (combobox) */}
            <div className="space-y-1.5">
              <label htmlFor="edit-bande-verrat" className={labelCls}>
                Verrat père{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <select
                id="edit-bande-verrat"
                aria-invalid={!!errors.verratPere}
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0',
                  'font-mono text-[14px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.verratPere
                    ? 'border-red'
                    : 'border-border hover:border-text-2',
                ].join(' ')}
                value={form.verratPere}
                onChange={e => update('verratPere', e.target.value)}
              >
                <option value="">— Aucun —</option>
                {verrats.map(v => (
                  <option key={v.id} value={v.displayId}>
                    {v.displayId}{v.nom ? ` · ${v.nom}` : ''}
                  </option>
                ))}
              </select>
              {errors.verratPere ? (
                <p
                  id="edit-bande-verrat-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.verratPere}
                </p>
              ) : null}
            </div>

            {/* Loge (emplacement) */}
            <div className="space-y-1.5">
              <label htmlFor="edit-bande-loge-emplacement" className={labelCls}>
                Emplacement loge{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-bande-loge-emplacement"
                type="text"
                maxLength={30}
                className={inputBase(false)}
                placeholder="Ex: Engraissement L7"
                value={loge}
                onChange={e => {
                  setLoge(e.target.value);
                  setLogeDirty(true);
                }}
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-truie" className={labelCls}>
                  Truie (ID mère)
                </label>
                <input
                  id="edit-bande-truie"
                  ref={firstFieldRef}
                  type="text"
                  maxLength={30}
                  aria-invalid={!!errors.truie}
                  aria-describedby={errors.truie ? 'edit-bande-truie-error' : undefined}
                  className={inputBase(!!errors.truie)}
                  placeholder="Ex: T05"
                  value={form.truie}
                  onChange={e => update('truie', e.target.value)}
                  autoComplete="off"
                />
                {errors.truie ? (
                  <p
                    id="edit-bande-truie-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.truie}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-boucle" className={labelCls}>
                  Boucle mère
                </label>
                <input
                  id="edit-bande-boucle"
                  type="text"
                  maxLength={30}
                  aria-invalid={!!errors.boucleMere}
                  aria-describedby={
                    errors.boucleMere ? 'edit-bande-boucle-error' : undefined
                  }
                  className={inputBase(!!errors.boucleMere)}
                  placeholder="Ex: FR12345"
                  value={form.boucleMere}
                  onChange={e => update('boucleMere', e.target.value)}
                  autoComplete="off"
                />
                {errors.boucleMere ? (
                  <p
                    id="edit-bande-boucle-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.boucleMere}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          {/* ── Mise-bas ────────────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Mise-bas</legend>

            <div className="space-y-1.5">
              <label htmlFor="edit-bande-dmb" className={labelCls}>
                Date mise-bas
              </label>
              <input
                id="edit-bande-dmb"
                type="date"
                aria-invalid={!!errors.dateMB}
                aria-describedby={errors.dateMB ? 'edit-bande-dmb-error' : undefined}
                className={inputBase(!!errors.dateMB)}
                value={form.dateMB}
                onChange={e => update('dateMB', e.target.value)}
              />
              {errors.dateMB ? (
                <p
                  id="edit-bande-dmb-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.dateMB}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-nv" className={labelCls}>
                  NV
                </label>
                <input
                  id="edit-bande-nv"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.nv}
                  aria-describedby={errors.nv ? 'edit-bande-nv-error' : undefined}
                  className={numInputCls(!!errors.nv)}
                  placeholder="0"
                  value={form.nv}
                  onChange={e => update('nv', e.target.value)}
                />
                {errors.nv ? (
                  <p
                    id="edit-bande-nv-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.nv}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-morts" className={labelCls}>
                  Morts
                </label>
                <input
                  id="edit-bande-morts"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.morts}
                  aria-describedby={
                    errors.morts ? 'edit-bande-morts-error' : undefined
                  }
                  className={numInputCls(!!errors.morts)}
                  placeholder="0"
                  value={form.morts}
                  onChange={e => update('morts', e.target.value)}
                />
                {errors.morts ? (
                  <p
                    id="edit-bande-morts-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.morts}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-viv" className={labelCls}>
                  Vivants
                </label>
                <input
                  id="edit-bande-viv"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.vivants}
                  aria-describedby={
                    errors.vivants ? 'edit-bande-viv-error' : undefined
                  }
                  className={numInputCls(!!errors.vivants)}
                  placeholder="0"
                  value={form.vivants}
                  onChange={e => update('vivants', e.target.value)}
                />
                {errors.vivants ? (
                  <p
                    id="edit-bande-viv-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.vivants}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Poids moyen courant (kg) */}
            <div className="space-y-1.5">
              <label htmlFor="edit-bande-pmoy" className={labelCls}>
                Poids moyen (kg){' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="edit-bande-pmoy"
                type="number"
                inputMode="decimal"
                min={0}
                max={400}
                step={0.1}
                aria-invalid={!!errors.poidsMoyenKg}
                aria-describedby={
                  errors.poidsMoyenKg ? 'edit-bande-pmoy-error' : undefined
                }
                className={inputBase(!!errors.poidsMoyenKg)}
                placeholder="0.0"
                value={form.poidsMoyenKg}
                onChange={e => update('poidsMoyenKg', e.target.value)}
              />
              {errors.poidsMoyenKg ? (
                <p
                  id="edit-bande-pmoy-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.poidsMoyenKg}
                </p>
              ) : null}
            </div>
          </fieldset>

          {/* ── Sevrage ─────────────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Sevrage</legend>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-sprev" className={labelCls}>
                  Prévue
                </label>
                <input
                  id="edit-bande-sprev"
                  type="date"
                  aria-invalid={!!errors.dateSevragePrevue}
                  aria-describedby={
                    errors.dateSevragePrevue ? 'edit-bande-sprev-error' : undefined
                  }
                  className={inputBase(!!errors.dateSevragePrevue)}
                  value={form.dateSevragePrevue}
                  onChange={e => update('dateSevragePrevue', e.target.value)}
                />
                {errors.dateSevragePrevue ? (
                  <p
                    id="edit-bande-sprev-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.dateSevragePrevue}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-sreel" className={labelCls}>
                  Réelle <span className="text-text-2 normal-case">· opt.</span>
                </label>
                <input
                  id="edit-bande-sreel"
                  type="date"
                  aria-invalid={!!errors.dateSevrageReelle}
                  aria-describedby={
                    errors.dateSevrageReelle ? 'edit-bande-sreel-error' : undefined
                  }
                  className={inputBase(!!errors.dateSevrageReelle)}
                  value={form.dateSevrageReelle}
                  onChange={e => update('dateSevrageReelle', e.target.value)}
                />
                {errors.dateSevrageReelle ? (
                  <p
                    id="edit-bande-sreel-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.dateSevrageReelle}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          {/* ── Séparation sexe ─────────────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Séparation sexe</legend>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-males" className={labelCls}>
                  Nb mâles
                </label>
                <input
                  id="edit-bande-males"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.nbMales}
                  aria-describedby={
                    errors.nbMales ? 'edit-bande-males-error' : undefined
                  }
                  className={numInputCls(!!errors.nbMales)}
                  placeholder="0"
                  value={form.nbMales}
                  onChange={e => update('nbMales', e.target.value)}
                />
                {errors.nbMales ? (
                  <p
                    id="edit-bande-males-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.nbMales}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-fem" className={labelCls}>
                  Nb femelles
                </label>
                <input
                  id="edit-bande-fem"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={25}
                  step={1}
                  aria-invalid={!!errors.nbFemelles}
                  aria-describedby={
                    errors.nbFemelles ? 'edit-bande-fem-error' : undefined
                  }
                  className={numInputCls(!!errors.nbFemelles)}
                  placeholder="0"
                  value={form.nbFemelles}
                  onChange={e => update('nbFemelles', e.target.value)}
                />
                {errors.nbFemelles ? (
                  <p
                    id="edit-bande-fem-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.nbFemelles}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-bande-dsep" className={labelCls}>
                  Date séparation
                </label>
                <input
                  id="edit-bande-dsep"
                  type="date"
                  aria-invalid={!!errors.dateSeparation}
                  aria-describedby={
                    errors.dateSeparation ? 'edit-bande-dsep-error' : undefined
                  }
                  className={inputBase(!!errors.dateSeparation)}
                  value={form.dateSeparation}
                  onChange={e => update('dateSeparation', e.target.value)}
                />
                {errors.dateSeparation ? (
                  <p
                    id="edit-bande-dsep-error"
                    role="alert"
                    className="font-mono text-[11px] text-red"
                  >
                    {errors.dateSeparation}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-bande-loge" className={labelCls}>
                  Loge engraissement
                </label>
                <select
                  id="edit-bande-loge"
                  aria-invalid={!!errors.logeEngraissement}
                  className={[
                    'w-full h-12 rounded-md px-3',
                    'bg-bg-0 border text-text-0',
                    'font-mono text-[14px]',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.logeEngraissement
                      ? 'border-red'
                      : 'border-border hover:border-text-2',
                  ].join(' ')}
                  value={form.logeEngraissement}
                  onChange={e =>
                    update(
                      'logeEngraissement',
                      e.target.value as '' | 'M' | 'F',
                    )
                  }
                >
                  <option value="">—</option>
                  <option value="M">Mâles (M)</option>
                  <option value="F">Femelles (F)</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── V24 — Truies sources (multi-mères) ──────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>
              Truies sources
              <span className="ml-2 normal-case text-text-2">
                · {sources.length} truie{sources.length > 1 ? 's' : ''}
                {sources.length > 0
                  ? ` · ${totalApportes} porcelet${totalApportes > 1 ? 's' : ''}`
                  : ''}
              </span>
            </legend>

            {overCapacityWarning ? (
              <div
                role="status"
                className="rounded-md border border-amber-deep/40 bg-amber-pork/10 px-3 py-2 font-mono text-[11px] text-amber-deep"
              >
                ⚠ Total apportés ({totalApportes}) &gt; NV ({form.nv}).
                Vérifie la cohérence (warning, pas blocage).
              </div>
            ) : null}

            {sources.length === 0 ? (
              <p className="font-mono text-[11px] text-text-2">
                Aucune truie source liée. Ajoute la mère biologique ou les
                sources d'un regroupement.
              </p>
            ) : (
              <ul className="space-y-2" aria-label="Liste des truies sources">
                {sources.map(s => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-bg-1 px-3 py-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-2 font-mono text-[11px] font-bold text-text-1">
                      {s.sowCode || '—'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[12px] text-text-0">
                        {s.sowCode}
                        {s.sowName ? ` · ${s.sowName}` : ''}
                        {s.sowBoucle ? ` · ${s.sowBoucle}` : ''}
                      </p>
                      <p className="font-mono text-[10px] text-text-2 tabular-nums">
                        {s.nbPorceletsApportes} porcelet
                        {s.nbPorceletsApportes > 1 ? 's' : ''} · {s.dateAjout}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSource(s.id)}
                      disabled={sourceBusy}
                      aria-label={`Retirer la truie ${s.sowCode}`}
                      className="pressable rounded-md border border-border p-2 text-text-2 hover:text-red"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!addSourceOpen ? (
              <button
                type="button"
                onClick={() => {
                  setAddSourceOpen(true);
                  setSourceError('');
                }}
                disabled={sourceBusy || truiesDisponibles.length === 0}
                className={[
                  'pressable inline-flex items-center gap-2 rounded-md',
                  'border border-dashed border-border px-3 py-2',
                  'font-mono text-[11px] uppercase tracking-wide text-text-1',
                  'hover:border-accent hover:text-accent',
                  truiesDisponibles.length === 0 ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <Plus size={14} aria-hidden="true" />
                Ajouter une truie source
              </button>
            ) : (
              <div className="space-y-2 rounded-md border border-accent/40 bg-bg-1 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                    Nouvelle source
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddSourceOpen(false);
                      setSourceError('');
                    }}
                    className="text-text-2 hover:text-text-0"
                    aria-label="Fermer le formulaire d'ajout"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="add-src-truie" className={labelCls}>
                    Truie
                  </label>
                  <select
                    id="add-src-truie"
                    className={inputBase(false)}
                    value={newSourceSowId}
                    onChange={e => setNewSourceSowId(e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    {truiesDisponibles.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.displayId}
                        {t.nom ? ` · ${t.nom}` : ''}
                        {t.boucle ? ` · ${t.boucle}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label htmlFor="add-src-nb" className={labelCls}>
                      Nb porcelets
                    </label>
                    <input
                      id="add-src-nb"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={30}
                      step={1}
                      className={numInputCls(false)}
                      placeholder="0"
                      value={newSourceNb}
                      onChange={e => setNewSourceNb(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="add-src-date" className={labelCls}>
                      Date ajout
                    </label>
                    <input
                      id="add-src-date"
                      type="date"
                      className={inputBase(false)}
                      value={newSourceDate}
                      onChange={e => setNewSourceDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="add-src-notes" className={labelCls}>
                    Notes <span className="text-text-2 normal-case">· optionnel</span>
                  </label>
                  <input
                    id="add-src-notes"
                    type="text"
                    maxLength={120}
                    className={inputBase(false)}
                    placeholder="Ex: adoption porcelets affaiblis"
                    value={newSourceNotes}
                    onChange={e => setNewSourceNotes(e.target.value)}
                  />
                </div>

                {sourceError ? (
                  <p role="alert" className="font-mono text-[11px] text-red">
                    {sourceError}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={handleAddSource}
                  disabled={sourceBusy}
                  className={[
                    'pressable w-full h-11 rounded-md',
                    'bg-accent text-bg-0',
                    'font-mono text-[12px] font-bold uppercase tracking-wide',
                    sourceBusy ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110',
                  ].join(' ')}
                >
                  {sourceBusy ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            )}
          </fieldset>

          {/* ── V24 — Loge structurée ──────────────────────────────── */}
          <fieldset className="space-y-3" disabled={saving}>
            <legend className={labelCls + ' mb-1'}>Loge (référentiel)</legend>

            <div className="space-y-1.5">
              <label htmlFor="edit-bande-loge-ref" className={labelCls}>
                Loge actuelle{' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <select
                id="edit-bande-loge-ref"
                className={inputBase(false)}
                value={selectedLogeId}
                onChange={e => {
                  setSelectedLogeId(e.target.value);
                  setSelectedLogeIdDirty(true);
                }}
              >
                <option value="">— Aucune —</option>
                {loges.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.numero} · {l.type.toLowerCase().replace('_', '-')}
                    {l.batiment ? ` · ${l.batiment}` : ''}
                  </option>
                ))}
              </select>

              {selectedLogeId ? (
                (() => {
                  const l = loges.find(x => x.id === selectedLogeId);
                  if (!l) return null;
                  const occupation = logeOccupation.get(l.id) ?? 0;
                  const own = bande.vivants ?? 0;
                  const totalIfAssigned = occupation + own;
                  const over =
                    l.capaciteMax != null && totalIfAssigned > l.capaciteMax;
                  return (
                    <div
                      className={[
                        'rounded-md border px-3 py-2 font-mono text-[11px]',
                        over
                          ? 'border-amber-deep/40 bg-amber-pork/10 text-amber-deep'
                          : 'border-border bg-bg-1 text-text-1',
                      ].join(' ')}
                    >
                      Occupation autres : {occupation}
                      {l.capaciteMax != null
                        ? ` / capacité ${l.capaciteMax}`
                        : ''}
                      {own > 0 ? ` · cette bande +${own}` : ''}
                      {over ? ' · ⚠ capacité dépassée (warning)' : ''}
                    </div>
                  );
                })()
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setAddLogeOpen(true)}
              className={[
                'pressable inline-flex items-center gap-2 rounded-md',
                'border border-dashed border-border px-3 py-2',
                'font-mono text-[11px] uppercase tracking-wide text-text-1',
                'hover:border-accent hover:text-accent',
              ].join(' ')}
            >
              <Plus size={14} aria-hidden="true" />
              Nouvelle loge
            </button>
          </fieldset>

          {/* ── Statut ──────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="edit-bande-statut" className={labelCls}>
              Statut <span className="text-red">*</span>
            </label>
            <select
              id="edit-bande-statut"
              aria-required="true"
              aria-invalid={!!errors.statut}
              aria-describedby={errors.statut ? 'edit-bande-statut-error' : undefined}
              className={[
                'w-full h-12 rounded-md px-3',
                'bg-bg-0 border text-text-0',
                'font-mono text-[14px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                errors.statut ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              value={form.statut}
              onChange={e => update('statut', e.target.value)}
              disabled={saving}
            >
              <option value="">— Choisir —</option>
              {BANDE_STATUTS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.statut ? (
              <p
                id="edit-bande-statut-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.statut}
              </p>
            ) : null}
          </div>

          {/* ── Notes ───────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label htmlFor="edit-bande-notes" className={labelCls}>
              Notes <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <textarea
              id="edit-bande-notes"
              maxLength={300}
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? 'edit-bande-notes-error' : 'edit-bande-notes-hint'
              }
              className={[
                'w-full rounded-md px-3 py-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[13px]',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                'min-h-[88px] resize-y',
                errors.notes ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Observations libres…"
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              disabled={saving}
            />
            <p
              id="edit-bande-notes-hint"
              className="font-mono text-[10px] text-text-2 tabular-nums"
            >
              {form.notes.length}/300
            </p>
            {errors.notes ? (
              <p
                id="edit-bande-notes-error"
                role="alert"
                className="font-mono text-[11px] text-red"
              >
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* ── Actions ─────────────────────────────────────────────── */}
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
              aria-label="Enregistrer les modifications de la bande"
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

      <QuickAddLogeForm
        isOpen={addLogeOpen}
        onClose={() => setAddLogeOpen(false)}
        onSuccess={handleLogeCreated}
      />

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

export default QuickEditBandeForm;
