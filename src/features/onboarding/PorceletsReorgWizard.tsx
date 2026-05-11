/**
 * PorceletsReorgWizard — Wizard "Création manuelle de bandes" (V72-P4)
 *
 * Affiché au login (via PorceletsReorgGate) si la ferme courante a des
 * porcelets en vrac (porcelets_individuels.batch_id IS NULL).
 *
 * Workflow refondu (validé par éleveur Christophe) :
 *   1. Sélection porcelets (multi-select, filtres sexe + poids)
 *   2. Numéro de bande — texte libre, unique sur la ferme
 *   3. Truie / verrat (optionnel) — radio Aucun / Truie / Verrat
 *   4. Loge 1 — numéro libre + type (F / M / Mixte)
 *   5. Loge 2 (optionnel, si Loge 1 ≠ Mixte) — pour split F/M
 *   6. Confirmation — récap + INSERT cascade
 *
 * Cycle métier : à ~2 mois (post-sevrage), porcelets sont sexés ; F + M
 * peuvent occuper 2 loges distinctes (ou 1 mixte en urgence).
 *
 * Schema : `porcelets_individuels.loge_id` (V72-P4 migration) permet de
 * stocker la loge effective par porcelet, sans changer `batches.loge_id`.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import {
  CheckCircle2,
  CheckSquare,
  Filter,
  Loader2,
} from 'lucide-react';

import {
  Button,
  Card,
  Checkbox,
  Chip,
  FormField,
  Input,
  PageHeader,
  RadioGroup,
  Section,
  Select,
  Wizard,
} from '@/design-system';
import { supabase } from '../../services/supabaseClient';
import {
  insertLoge,
  insertBatch,
  updatePorceletIndividuel,
} from '../../services/supabaseWrites';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';

// ─── Constantes métier ───────────────────────────────────────────────────────

export const MAX_PORCELETS_PAR_BANDE = 40;

type SexeFilter = 'ALL' | 'M' | 'F';
type PoidsFilter = 'ALL' | 'LT5' | '5_15' | '15_30' | 'GT30';

type Stade =
  | 'Sous mère'
  | 'Post-sevrage'
  | 'Croissance'
  | 'Engraissement'
  | 'Finition';

/** Type de loge porté par le wizard (UI) : F = femelles, M = mâles, MIXTE = libre. */
export type WizardTypeLoge = 'F' | 'M' | 'MIXTE';

/** Source reproductive optionnelle saisie par l'éleveur. */
export type SourceReproType = 'NONE' | 'SOW' | 'BOAR';

interface PorceletVrac {
  id: string;
  boucle: string;
  sexe: 'M' | 'F' | 'INCONNU' | null;
  poids_courant_kg: number | null;
}

interface SowOption {
  id: string;
  displayId: string;
  boucle: string;
}

interface BoarOption {
  id: string;
  displayId: string;
  boucle: string;
}

interface LogeFormState {
  numero: string;
  type: WizardTypeLoge | null;
}

const TYPE_LOGE_OPTIONS_LOGE1: { value: WizardTypeLoge; label: string }[] = [
  { value: 'F', label: 'Femelles uniquement' },
  { value: 'M', label: 'Mâles uniquement' },
  { value: 'MIXTE', label: 'Mixte (urgence : F + M ensemble)' },
];

// Mapping stade → type loge canonique (LogeType DB)
export const STADE_TO_LOGE_TYPE: Record<Stade, string> = {
  'Sous mère': 'MATERNITE',
  'Post-sevrage': 'POST_SEVRAGE',
  Croissance: 'CROISSANCE',
  Engraissement: 'ENGRAISSEMENT',
  Finition: 'FINITION',
};

// Plage de poids attendue par stade (warning soft uniquement)
export const STADE_POIDS_RANGE: Record<Stade, { min: number; max: number }> = {
  'Sous mère': { min: 0, max: 7 },
  'Post-sevrage': { min: 5, max: 25 },
  Croissance: { min: 20, max: 60 },
  Engraissement: { min: 50, max: 100 },
  Finition: { min: 80, max: 120 },
};

// ─── Helpers exposés (testables) ─────────────────────────────────────────────

export function avgPoids(porcelets: { poids_courant_kg: number | null }[]): number | null {
  const valid = porcelets
    .map((p) => p.poids_courant_kg)
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

export function poidsCohorent(stade: Stade, poids: number | null): boolean {
  if (poids === null) return true;
  const { min, max } = STADE_POIDS_RANGE[stade];
  return poids >= min && poids <= max;
}

export function filtrePorcelets(
  porcelets: PorceletVrac[],
  sexe: SexeFilter,
  poids: PoidsFilter,
): PorceletVrac[] {
  return porcelets.filter((p) => {
    if (sexe === 'M' && p.sexe !== 'M') return false;
    if (sexe === 'F' && p.sexe !== 'F') return false;
    const pk = p.poids_courant_kg;
    if (poids === 'LT5') return pk !== null && pk < 5;
    if (poids === '5_15') return pk !== null && pk >= 5 && pk < 15;
    if (poids === '15_30') return pk !== null && pk >= 15 && pk < 30;
    if (poids === 'GT30') return pk !== null && pk >= 30;
    return true;
  });
}

/**
 * Vérifie qu'un numéro de bande saisi librement n'est pas déjà utilisé sur la
 * ferme. Comparaison case-insensitive et trim.
 */
export function validationNumeroBandeUnique(
  codeId: string,
  existingBatches: { code_id: string }[],
): boolean {
  const norm = codeId.trim().toLowerCase();
  if (norm === '') return false;
  return !existingBatches.some((b) => (b.code_id ?? '').trim().toLowerCase() === norm);
}

/**
 * V72-P4 — Pour chaque porcelet sélectionné, calcule la loge cible selon le
 * mode de répartition Loge 1 / Loge 2. Pure : utilisée dans le submit ET
 * dans les tests pour vérifier le bucket.
 *
 *  - Loge 1 = MIXTE → tout va sur loge1Id (loge2Id ignorée).
 *  - Loge 1 = F → femelles sur loge1, mâles sur loge2 si présente sinon loge1.
 *  - Loge 1 = M → mâles sur loge1, femelles sur loge2 si présente sinon loge1.
 *  - Sexe inconnu : reste sur loge1.
 */
export function repartitionPorceletsParLoge<
  T extends { id: string; sexe: 'M' | 'F' | 'INCONNU' | null },
>(
  porcelets: T[],
  loge1Type: WizardTypeLoge,
  loge1Id: string,
  loge2Id: string | null,
): { porceletId: string; logeId: string }[] {
  return porcelets.map((p) => {
    if (loge1Type === 'MIXTE') {
      return { porceletId: p.id, logeId: loge1Id };
    }
    if (loge1Type === 'F') {
      return {
        porceletId: p.id,
        logeId: p.sexe === 'M' && loge2Id ? loge2Id : loge1Id,
      };
    }
    // loge1Type === 'M'
    return {
      porceletId: p.id,
      logeId: p.sexe === 'F' && loge2Id ? loge2Id : loge1Id,
    };
  });
}

// ─── Hook : fetch porcelets vrac + bandes existantes ─────────────────────────

interface UseVracDataState {
  loading: boolean;
  error: string | null;
  porcelets: PorceletVrac[];
  existingCodeIds: string[];
  refresh: () => void;
}

function useVracData(farmId: string | null): UseVracDataState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [porcelets, setPorcelets] = useState<PorceletVrac[]>([]);
  const [existingCodeIds, setExistingCodeIds] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!farmId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pRows, error: pErr } = await (supabase as any)
          .from('porcelets_individuels')
          .select('id, boucle, sexe, poids_courant_kg')
          .eq('farm_id', farmId)
          .is('batch_id', null)
          .order('boucle', { ascending: true });
        if (pErr) throw pErr;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: bRows, error: bErr } = await (supabase as any)
          .from('batches')
          .select('code_id')
          .eq('farm_id', farmId);
        if (bErr) throw bErr;

        if (cancelled) return;
        setPorcelets(pRows ?? []);
        setExistingCodeIds(((bRows ?? []) as { code_id: string }[]).map((b) => b.code_id));
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message ?? 'Erreur de chargement');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [farmId, tick]);

  return { loading, error, porcelets, existingCodeIds, refresh };
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PorceletsReorgWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { truies, verrats } = useFarm();
  const farmId = user?.id ?? null;

  const { loading, error, porcelets, existingCodeIds, refresh } = useVracData(farmId);

  // Étape 1 : sélection
  const [sexeFilter, setSexeFilter] = useState<SexeFilter>('ALL');
  const [poidsFilter, setPoidsFilter] = useState<PoidsFilter>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showWizard, setShowWizard] = useState(false);

  // Étape 2 : numéro de bande
  const [numeroBande, setNumeroBande] = useState('');

  // Étape 3 : source reproductive
  const [sourceType, setSourceType] = useState<SourceReproType>('NONE');
  const [sowId, setSowId] = useState('');
  const [boarId, setBoarId] = useState('');

  // Étape 4-5 : loges
  const [loge1, setLoge1] = useState<LogeFormState>({ numero: '', type: null });
  const [loge2Activated, setLoge2Activated] = useState(false);
  const [loge2, setLoge2] = useState<LogeFormState>({ numero: '', type: null });

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mappings sows/boars en options légères
  const sowOptions: SowOption[] = useMemo(
    () =>
      truies.map((t) => ({
        id: t.id,
        displayId: t.displayId || t.id.slice(0, 8),
        boucle: t.boucle ?? '',
      })),
    [truies],
  );

  const boarOptions: BoarOption[] = useMemo(
    () =>
      verrats.map((v) => ({
        id: v.id,
        displayId: v.displayId || v.id.slice(0, 8),
        boucle: v.boucle ?? '',
      })),
    [verrats],
  );

  const totalCount = porcelets.length;
  const malesCount = useMemo(() => porcelets.filter((p) => p.sexe === 'M').length, [porcelets]);
  const femellesCount = useMemo(() => porcelets.filter((p) => p.sexe === 'F').length, [porcelets]);

  const filteredPorcelets = useMemo(
    () => filtrePorcelets(porcelets, sexeFilter, poidsFilter),
    [porcelets, sexeFilter, poidsFilter],
  );

  const selectedPorcelets = useMemo(
    () => porcelets.filter((p) => selectedIds.has(p.id)),
    [porcelets, selectedIds],
  );

  const selectedMales = selectedPorcelets.filter((p) => p.sexe === 'M').length;
  const selectedFemelles = selectedPorcelets.filter((p) => p.sexe === 'F').length;

  const selectionAtMax = selectedIds.size >= MAX_PORCELETS_PAR_BANDE;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_PORCELETS_PAR_BANDE) {
        next.add(id);
      }
      return next;
    });
  };

  const openWizard = () => {
    if (selectedIds.size === 0) return;
    // Reset le state du wizard à chaque ouverture
    setNumeroBande('');
    setSourceType('NONE');
    setSowId('');
    setBoarId('');
    setLoge1({ numero: '', type: null });
    setLoge2Activated(false);
    setLoge2({ numero: '', type: null });
    setSubmitError(null);
    setShowWizard(true);
  };

  const closeWizard = () => {
    setShowWizard(false);
    setSubmitError(null);
  };

  // ── Validation par étape ──────────────────────────────────────────────────

  const numeroBandeValide = useMemo(() => {
    const trimmed = numeroBande.trim();
    if (trimmed === '') return false;
    return validationNumeroBandeUnique(trimmed, existingCodeIds.map((c) => ({ code_id: c })));
  }, [numeroBande, existingCodeIds]);

  const sourceValide = useMemo(() => {
    if (sourceType === 'NONE') return true;
    if (sourceType === 'SOW') return sowId !== '';
    return boarId !== '';
  }, [sourceType, sowId, boarId]);

  const loge1Valide = useMemo(() => {
    if (loge1.numero.trim() === '') return false;
    if (loge1.type === null) return false;
    // Cohérence sexes
    if (loge1.type === 'F' && selectedMales > 0 && !loge2Activated) return false;
    if (loge1.type === 'M' && selectedFemelles > 0 && !loge2Activated) return false;
    return true;
  }, [loge1, selectedMales, selectedFemelles, loge2Activated]);

  const loge2Valide = useMemo(() => {
    if (!loge2Activated) return true;
    if (loge2.numero.trim() === '') return false;
    if (loge1.type === 'MIXTE') return false;
    if (loge1.numero.trim() !== '' && loge2.numero.trim().toLowerCase() === loge1.numero.trim().toLowerCase()) {
      return false;
    }
    return true;
  }, [loge2Activated, loge2, loge1]);

  const recapValide =
    selectedIds.size > 0 &&
    numeroBandeValide &&
    sourceValide &&
    loge1Valide &&
    loge2Valide;

  // Type de loge2 dérivé : opposé de loge1.type quand activée.
  const loge2TypeDerivé: WizardTypeLoge | null =
    loge2Activated && loge1.type === 'F'
      ? 'M'
      : loge2Activated && loge1.type === 'M'
      ? 'F'
      : null;

  // ── Submit cascade ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!farmId || !recapValide || loge1.type === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. INSERT loge 1 (toujours créée — on ne réutilise pas l'existant pour
      //    éviter d'écraser une loge en cours d'usage par une autre bande)
      const loge1Db = await insertLoge({
        numero: loge1.numero.trim(),
        type: STADE_TO_LOGE_TYPE['Post-sevrage'],
        repartition: loge1.type === 'MIXTE' ? 'MIXTE' : loge1.type === 'F' ? 'FEMELLES' : 'MALES',
        capacite_max: Math.max(
          1,
          Math.ceil(
            (loge1.type === 'F'
              ? selectedFemelles
              : loge1.type === 'M'
              ? selectedMales
              : selectedIds.size) * 1.2,
          ),
        ),
        active: true,
      });

      // 2. INSERT loge 2 si activée
      let loge2Db: { id: string; numero: string } | null = null;
      if (loge2Activated && loge2TypeDerivé) {
        const created = await insertLoge({
          numero: loge2.numero.trim(),
          type: STADE_TO_LOGE_TYPE['Post-sevrage'],
          repartition: loge2TypeDerivé === 'F' ? 'FEMELLES' : 'MALES',
          capacite_max: Math.max(
            1,
            Math.ceil(
              (loge2TypeDerivé === 'F' ? selectedFemelles : selectedMales) * 1.2,
            ),
          ),
          active: true,
        });
        loge2Db = { id: created.id, numero: created.numero };
      }

      // 3. INSERT batch (loge_id = loge1, code_id = numéro saisi librement)
      const avg = avgPoids(selectedPorcelets) ?? 0;
      const batchPayload: Record<string, unknown> = {
        code_id: numeroBande.trim(),
        phase: 'Post-sevrage',
        statut: 'En cours',
        loge: loge1Db.numero,
        loge_id: loge1Db.id,
        porcelets_nes_total: selectedIds.size,
        porcelets_nes_vivants: selectedIds.size,
        porcelets_sevrene_total: 0,
        poids_initial_kg: avg,
        validation_status: 'VALIDATED',
      };
      if (avg > 0) batchPayload.poids_moyen_kg = avg;
      if (sourceType === 'SOW' && sowId) batchPayload.sow_id = sowId;
      if (sourceType === 'BOAR' && boarId) batchPayload.boar_id = boarId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newBatch = await insertBatch(batchPayload as any);
      const newBatchId = newBatch.id as string;

      // 4. INSERT batch_sows si truie présente (lien explicite multi-mères)
      if (sourceType === 'SOW' && sowId) {
        const today = new Date().toISOString().slice(0, 10);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: bsErr } = await (supabase.from('batch_sows' as any) as any).insert({
          farm_id: farmId,
          batch_id: newBatchId,
          sow_id: sowId,
          nb_porcelets_apportes: selectedIds.size,
          date_ajout: today,
          notes: null,
        });
        if (bsErr) {
          console.warn('[batch_sows] insert wizard failed (best-effort):', bsErr.message);
        }
      }

      // 5. UPDATE porcelets — batch_id + loge_id selon répartition F/M
      const repartition = repartitionPorceletsParLoge(
        selectedPorcelets,
        loge1.type,
        loge1Db.id,
        loge2Db?.id ?? null,
      );
      for (const r of repartition) {
        const res = await updatePorceletIndividuel(r.porceletId, {
          batch_id: newBatchId,
          loge_id: r.logeId,
        });
        if (!res.success) {
          throw new Error(res.error ?? `update porcelet ${r.porceletId} failed`);
        }
      }

      const logesLabel = loge2Db
        ? `Loges ${loge1Db.numero} + ${loge2Db.numero}`
        : `Loge ${loge1Db.numero}`;
      showToast(
        `Bande ${numeroBande.trim()} créée · ${selectedIds.size} porcelets · ${logesLabel}`,
        'success',
        4000,
      );
      setSelectedIds(new Set());
      setShowWizard(false);
      refresh();
    } catch (e) {
      setSubmitError((e as Error).message ?? 'Erreur lors de la création de la bande');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Étapes du wizard (UI) ─────────────────────────────────────────────────

  const stepNumeroBande = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p
        style={{
          fontSize: 14,
          color: 'var(--pt-text-subtle)',
          fontFamily: 'var(--pt-font-body)',
        }}
      >
        Quel numéro pour cette bande ? Saisis ce que tu utilises sur le terrain
        (ex: 001, 2026-A, BANDE-MARS).
      </p>
      <FormField label="Numéro de bande" required>
        <Input
          type="text"
          placeholder="ex: 001"
          value={numeroBande}
          onChange={(e) => setNumeroBande(e.target.value)}
          aria-label="Numéro de bande"
          data-testid="wizard-numero-bande"
          autoFocus
        />
      </FormField>
      {numeroBande.trim() !== '' && !numeroBandeValide && (
        <div
          style={{
            padding: 8,
            background: 'var(--pt-danger-soft, rgba(239,68,68,0.08))',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--pt-danger)',
          }}
        >
          Ce numéro est déjà utilisé pour une autre bande de ta ferme. Choisis-en
          un autre.
        </div>
      )}
    </div>
  );

  const stepSourceRepro = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p
        style={{
          fontSize: 14,
          color: 'var(--pt-text-subtle)',
          fontFamily: 'var(--pt-font-body)',
        }}
      >
        D'où viennent ces porcelets ? Tu peux laisser vide si tu ne sais plus.
      </p>
      <FormField label="Origine">
        <RadioGroup
          value={sourceType}
          onChange={(v) => setSourceType(v as SourceReproType)}
          options={[
            { value: 'NONE', label: 'Aucune (passer)' },
            { value: 'SOW', label: 'Truie qui a mis bas' },
            { value: 'BOAR', label: 'Verrat qui a sailli' },
          ]}
          ariaLabel="Origine des porcelets"
        />
      </FormField>
      {sourceType === 'SOW' && (
        <FormField label="Sélectionner la truie">
          <Select
            value={sowId}
            onChange={(e) => setSowId(e.target.value)}
            aria-label="Truie ayant mis bas"
          >
            <option value="">— Sélectionner —</option>
            {sowOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayId} {s.boucle ? `· ${s.boucle}` : ''}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      {sourceType === 'BOAR' && (
        <FormField label="Sélectionner le verrat">
          <Select
            value={boarId}
            onChange={(e) => setBoarId(e.target.value)}
            aria-label="Verrat ayant sailli"
          >
            <option value="">— Sélectionner —</option>
            {boarOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.displayId} {b.boucle ? `· ${b.boucle}` : ''}
              </option>
            ))}
          </Select>
        </FormField>
      )}
    </div>
  );

  const stepLoge1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p
        style={{
          fontSize: 14,
          color: 'var(--pt-text-subtle)',
          fontFamily: 'var(--pt-font-body)',
        }}
      >
        Dans quelle loge mets-tu ces porcelets ?
      </p>
      <FormField label="Numéro de loge" required>
        <Input
          type="text"
          placeholder="ex: L3, Maternité 1"
          value={loge1.numero}
          onChange={(e) => setLoge1((l) => ({ ...l, numero: e.target.value }))}
          aria-label="Numéro de loge 1"
          data-testid="wizard-loge1-numero"
        />
      </FormField>
      <FormField label="Type de loge" required>
        <RadioGroup
          value={loge1.type ?? ''}
          onChange={(v) => setLoge1((l) => ({ ...l, type: v as WizardTypeLoge }))}
          options={TYPE_LOGE_OPTIONS_LOGE1}
          ariaLabel="Type de loge 1"
        />
      </FormField>
      <div
        style={{
          padding: 10,
          background: 'var(--pt-surface-alt)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--pt-text-subtle)',
          fontFamily: 'var(--pt-font-body)',
        }}
      >
        Sélection actuelle : {selectedIds.size} porcelets ·{' '}
        {selectedFemelles} femelles · {selectedMales} mâles
      </div>
      {loge1.type === 'F' && selectedMales > 0 && !loge2Activated && (
        <div
          style={{
            padding: 8,
            background: 'var(--pt-danger-soft, rgba(239,68,68,0.08))',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--pt-danger)',
          }}
        >
          Tu as {selectedMales} mâle{selectedMales > 1 ? 's' : ''} dans la
          sélection. Ajoute une 2e loge pour les mâles à l'étape suivante, ou
          choisis « Mixte ».
        </div>
      )}
      {loge1.type === 'M' && selectedFemelles > 0 && !loge2Activated && (
        <div
          style={{
            padding: 8,
            background: 'var(--pt-danger-soft, rgba(239,68,68,0.08))',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--pt-danger)',
          }}
        >
          Tu as {selectedFemelles} femelle{selectedFemelles > 1 ? 's' : ''}{' '}
          dans la sélection. Ajoute une 2e loge pour les femelles à l'étape
          suivante, ou choisis « Mixte ».
        </div>
      )}
    </div>
  );

  const stepLoge2 = () => {
    const sexeManquant: WizardTypeLoge | null =
      loge1.type === 'F' && selectedMales > 0
        ? 'M'
        : loge1.type === 'M' && selectedFemelles > 0
        ? 'F'
        : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p
          style={{
            fontSize: 14,
            color: 'var(--pt-text-subtle)',
            fontFamily: 'var(--pt-font-body)',
          }}
        >
          {loge1.type === 'MIXTE'
            ? 'Loge 1 est mixte : pas de 2e loge possible.'
            : 'Veux-tu mettre les autres dans une 2e loge ?'}
        </p>
        {loge1.type !== 'MIXTE' && (
          <>
            <FormField label="Activer une 2e loge">
              <RadioGroup
                value={loge2Activated ? 'YES' : 'NO'}
                onChange={(v) => setLoge2Activated(v === 'YES')}
                options={[
                  { value: 'NO', label: 'Non, garder une seule loge' },
                  {
                    value: 'YES',
                    label: sexeManquant
                      ? `Oui, créer une 2e loge pour les ${sexeManquant === 'F' ? 'femelles' : 'mâles'}`
                      : 'Oui, splitter sur 2 loges',
                  },
                ]}
                ariaLabel="Ajouter une 2e loge"
              />
            </FormField>
            {loge2Activated && (
              <>
                <FormField
                  label={`Numéro de la 2e loge (${
                    loge2TypeDerivé === 'F' ? 'femelles' : 'mâles'
                  })`}
                  required
                >
                  <Input
                    type="text"
                    placeholder="ex: L4"
                    value={loge2.numero}
                    onChange={(e) =>
                      setLoge2((l) => ({ ...l, numero: e.target.value }))
                    }
                    aria-label="Numéro de loge 2"
                    data-testid="wizard-loge2-numero"
                  />
                </FormField>
                {loge2.numero.trim() !== '' &&
                  loge2.numero.trim().toLowerCase() ===
                    loge1.numero.trim().toLowerCase() && (
                    <div
                      style={{
                        padding: 8,
                        background: 'var(--pt-danger-soft, rgba(239,68,68,0.08))',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--pt-danger)',
                      }}
                    >
                      Le numéro de la 2e loge doit être différent de la 1ère.
                    </div>
                  )}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const stepRecap = () => {
    const sourceLabel =
      sourceType === 'NONE'
        ? '—'
        : sourceType === 'SOW'
        ? sowOptions.find((s) => s.id === sowId)?.displayId ?? '—'
        : boarOptions.find((b) => b.id === boarId)?.displayId ?? '—';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p
          style={{
            fontSize: 14,
            color: 'var(--pt-text-subtle)',
            fontFamily: 'var(--pt-font-body)',
          }}
        >
          Vérifie avant de créer la bande.
        </p>
        <Card>
          <div
            style={{
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              fontFamily: 'var(--pt-font-body)',
              fontSize: 14,
            }}
          >
            <RecapRow label="Bande" value={numeroBande.trim()} />
            <RecapRow
              label="Porcelets"
              value={`${selectedIds.size} (${selectedFemelles} F · ${selectedMales} M)`}
            />
            <RecapRow
              label={
                sourceType === 'SOW'
                  ? 'Truie'
                  : sourceType === 'BOAR'
                  ? 'Verrat'
                  : 'Origine'
              }
              value={sourceLabel}
            />
            <RecapRow
              label="Loge 1"
              value={`${loge1.numero.trim()} · ${
                loge1.type === 'F'
                  ? 'Femelles'
                  : loge1.type === 'M'
                  ? 'Mâles'
                  : 'Mixte'
              }`}
            />
            {loge2Activated && (
              <RecapRow
                label="Loge 2"
                value={`${loge2.numero.trim()} · ${
                  loge2TypeDerivé === 'F' ? 'Femelles' : 'Mâles'
                }`}
              />
            )}
          </div>
        </Card>
        {submitError && (
          <div
            style={{
              padding: 8,
              color: 'var(--pt-danger)',
              fontSize: 13,
            }}
          >
            {submitError}
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!farmId) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ color: 'var(--pt-muted)' }}>Chargement de la session…</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <div
          className="phone-content"
          style={{ padding: '24px 24px 168px', maxWidth: 720, margin: '0 auto' }}
        >
          <PageHeader
            eyebrow="Mise à jour requise"
            title="Tes porcelets"
            subtitle={
              totalCount > 0
                ? `${totalCount} porcelet${totalCount > 1 ? 's' : ''} en vrac · ${malesCount} mâle${malesCount > 1 ? 's' : ''} · ${femellesCount} femelle${femellesCount > 1 ? 's' : ''}`
                : 'Tous tes porcelets sont rangés en bandes.'
            }
          />

          {loading && (
            <Card>
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--pt-muted)' }}>
                <Loader2
                  size={20}
                  className="animate-spin"
                  style={{ display: 'inline-block', marginRight: 8 }}
                  aria-hidden
                />
                Chargement des porcelets…
              </div>
            </Card>
          )}

          {error && (
            <Card>
              <div style={{ padding: 16, color: 'var(--pt-danger)' }}>{error}</div>
            </Card>
          )}

          {!loading && !error && totalCount === 0 && (
            <Card>
              <div style={{ padding: 24, textAlign: 'center' }}>
                <CheckCircle2
                  size={30}
                  style={{ color: 'var(--pt-success)' }}
                  aria-hidden
                />
                <p
                  style={{
                    marginTop: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--pt-font-display)',
                  }}
                >
                  Tous tes porcelets sont en bande.
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/today', { replace: true })}
                >
                  Continuer
                </Button>
              </div>
            </Card>
          )}

          {!loading && !error && totalCount > 0 && !showWizard && (
            <>
              <Section label="FILTRES" tone="primary" />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                  role="tablist"
                  aria-label="Filtre sexe"
                >
                  <Filter size={14} aria-hidden style={{ color: 'var(--pt-muted)' }} />
                  <Chip
                    label="Tous"
                    active={sexeFilter === 'ALL'}
                    onClick={() => setSexeFilter('ALL')}
                    count={totalCount}
                  />
                  <Chip
                    label="Mâles"
                    active={sexeFilter === 'M'}
                    onClick={() => setSexeFilter('M')}
                    count={malesCount}
                  />
                  <Chip
                    label="Femelles"
                    active={sexeFilter === 'F'}
                    onClick={() => setSexeFilter('F')}
                    count={femellesCount}
                  />
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                  role="tablist"
                  aria-label="Filtre poids"
                >
                  <Filter size={14} aria-hidden style={{ color: 'var(--pt-muted)' }} />
                  <Chip
                    label="Tous poids"
                    active={poidsFilter === 'ALL'}
                    onClick={() => setPoidsFilter('ALL')}
                  />
                  <Chip
                    label="< 5 kg"
                    active={poidsFilter === 'LT5'}
                    onClick={() => setPoidsFilter('LT5')}
                  />
                  <Chip
                    label="5-15 kg"
                    active={poidsFilter === '5_15'}
                    onClick={() => setPoidsFilter('5_15')}
                  />
                  <Chip
                    label="15-30 kg"
                    active={poidsFilter === '15_30'}
                    onClick={() => setPoidsFilter('15_30')}
                  />
                  <Chip
                    label="> 30 kg"
                    active={poidsFilter === 'GT30'}
                    onClick={() => setPoidsFilter('GT30')}
                  />
                </div>
              </div>

              <Section label="PORCELETS EN VRAC" tone="accent" />
              <Card>
                <div
                  style={{
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    maxHeight: 480,
                    overflowY: 'auto',
                  }}
                >
                  {filteredPorcelets.length === 0 && (
                    <div
                      style={{
                        padding: 16,
                        textAlign: 'center',
                        color: 'var(--pt-muted)',
                        fontSize: 13,
                      }}
                    >
                      Aucun porcelet ne correspond à ces filtres.
                    </div>
                  )}
                  {filteredPorcelets.map((p) => {
                    const isSelected = selectedIds.has(p.id);
                    const disableCheckbox = !isSelected && selectionAtMax;
                    const sexeLabel =
                      p.sexe === 'M' ? 'M' : p.sexe === 'F' ? 'F' : '?';
                    const poidsLabel =
                      typeof p.poids_courant_kg === 'number'
                        ? `${p.poids_courant_kg.toFixed(1)} kg`
                        : '— kg';
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--pt-line)',
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          disabled={disableCheckbox}
                          ariaLabel={`Sélectionner ${p.boucle}`}
                          testId={`porcelet-checkbox-${p.boucle}`}
                        />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span
                            style={{
                              fontFamily: 'var(--pt-font-display)',
                              fontWeight: 700,
                              fontSize: 15,
                            }}
                          >
                            {p.boucle}
                          </span>
                          <span style={{ color: 'var(--pt-muted)', fontSize: 13 }}>·</span>
                          <span
                            style={{
                              fontFamily: 'var(--pt-font-display)',
                              fontSize: 13,
                              color:
                                p.sexe === 'M'
                                  ? 'var(--pt-accent-deep)'
                                  : p.sexe === 'F'
                                  ? 'var(--pt-primary)'
                                  : 'var(--pt-muted)',
                            }}
                          >
                            {sexeLabel}
                          </span>
                          <span style={{ color: 'var(--pt-muted)', fontSize: 13 }}>·</span>
                          <span
                            style={{
                              fontFamily: 'var(--pt-font-display)',
                              fontSize: 14,
                              color: 'var(--pt-text)',
                            }}
                          >
                            {poidsLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--pt-line-strong)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                    color: selectionAtMax ? 'var(--pt-danger)' : 'var(--pt-muted)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 600 }}>
                    {selectedIds.size} / {MAX_PORCELETS_PAR_BANDE} sélectionnés
                  </span>
                  {selectionAtMax && <span>Maximum {MAX_PORCELETS_PAR_BANDE} par bande</span>}
                </div>
              </Card>

              {selectedIds.size > 0 && (
                <div
                  style={{
                    position: 'sticky',
                    bottom: 16,
                    marginTop: 16,
                    zIndex: 10,
                  }}
                >
                  <Button
                    variant="primary"
                    onClick={openWizard}
                    ariaLabel="Créer une bande à partir de la sélection"
                    style={{ width: '100%' }}
                    data-testid="open-wizard-cta"
                  >
                    <CheckSquare size={14} aria-hidden /> Créer une bande
                    ({selectedIds.size} porcelet{selectedIds.size > 1 ? 's' : ''})
                  </Button>
                </div>
              )}
            </>
          )}

          {showWizard && (
            <Wizard
              id="reorg-wizard"
              eyebrow="Nouvelle bande"
              completeLabel={
                submitting ? 'Création…' : 'Créer la bande'
              }
              busy={submitting}
              steps={[
                {
                  label: 'Numéro de bande',
                  render: stepNumeroBande,
                  validate: () => numeroBandeValide,
                },
                {
                  label: 'Origine',
                  render: stepSourceRepro,
                  validate: () => sourceValide,
                },
                {
                  label: 'Loge 1',
                  render: stepLoge1,
                  validate: () => loge1Valide || loge2Activated,
                  // Note : on autorise le passage si loge2 sera activée
                  // pour gérer le cas F+M (le check final loge1Valide se
                  // fera lors de loge2 + recap).
                },
                {
                  label: 'Loge 2',
                  render: stepLoge2,
                  validate: () => loge1Valide && loge2Valide,
                },
                {
                  label: 'Confirmation',
                  render: stepRecap,
                  validate: () => recapValide,
                },
              ]}
              onCancel={closeWizard}
              onComplete={handleSubmit}
            />
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

// ─── Sub-component : RecapRow ────────────────────────────────────────────────

const RecapRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      borderBottom: '1px solid var(--pt-line)',
      paddingBottom: 8,
    }}
  >
    <span
      style={{
        fontFamily: 'var(--pt-font-display)',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 'var(--pt-tracking-label)',
        color: 'var(--pt-text-muted)',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: 'var(--pt-font-display)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--pt-text)',
        textAlign: 'right',
      }}
    >
      {value}
    </span>
  </div>
);
