/**
 * PorceletsReorgWizard — Wizard "Création manuelle de bandes" (V72)
 *
 * Affiché au login (via PorceletsReorgGate) si la ferme courante a des
 * porcelets en vrac (porcelets_individuels.batch_id IS NULL).
 *
 * Workflow :
 *  1. Liste les porcelets en vrac avec filtres sexe + tranche de poids
 *  2. L'éleveur sélectionne jusqu'à 40 porcelets via checkbox
 *  3. Clic "Créer une bande" → form (loge, stade, type, âge, poids moyen, note)
 *  4. Submit :
 *     - INSERT loges (si nouvelle)
 *     - INSERT batches (code_id auto)
 *     - UPDATE porcelets_individuels SET batch_id = new_batch.id
 *  5. Refresh : retire les sélectionnés, propose de continuer si 0 vrac restant
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import {
  CheckCircle2,
  CheckSquare,
  Filter,
  Loader2,
  Plus,
  Save,
  X,
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
  Textarea,
} from '@/design-system';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
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

type TypeLoge = 'MALES' | 'FEMELLES' | 'MIXTE';

interface PorceletVrac {
  id: string;
  boucle: string;
  sexe: 'M' | 'F' | 'INCONNU' | null;
  poids_courant_kg: number | null;
}

interface LogeOption {
  id: string;
  numero: string;
  type: string;
  repartition: string | null;
}

interface CreationForm {
  logeMode: 'EXISTING' | 'NEW';
  logeId: string; // si EXISTING
  logeNumero: string; // si NEW
  stade: Stade | null;
  typeLoge: TypeLoge | null;
  ageMois: string;
  poidsMoyenKg: string;
  note: string;
}

const STADE_OPTIONS: { value: Stade; label: string }[] = [
  { value: 'Sous mère', label: 'Maternité (Sous mère)' },
  { value: 'Post-sevrage', label: 'Post-sevrage' },
  { value: 'Croissance', label: 'Croissance' },
  { value: 'Engraissement', label: 'Engraissement' },
  { value: 'Finition', label: 'Finition' },
];

const TYPE_LOGE_OPTIONS: { value: TypeLoge; label: string }[] = [
  { value: 'MALES', label: 'Mâles seulement' },
  { value: 'FEMELLES', label: 'Femelles seulement' },
  { value: 'MIXTE', label: 'Mixte' },
];

// Mapping stade → type loge canonique (LogeType DB)
const STADE_TO_LOGE_TYPE: Record<Stade, string> = {
  'Sous mère': 'MATERNITE',
  'Post-sevrage': 'POST_SEVRAGE',
  Croissance: 'CROISSANCE',
  Engraissement: 'ENGRAISSEMENT',
  Finition: 'FINITION',
};

const STADE_CODE: Record<Stade, string> = {
  'Sous mère': 'MAT',
  'Post-sevrage': 'PS',
  Croissance: 'CR',
  Engraissement: 'ENG',
  Finition: 'FIN',
};

// Plage de poids attendue par stade (warning soft uniquement)
const STADE_POIDS_RANGE: Record<Stade, { min: number; max: number }> = {
  'Sous mère': { min: 0, max: 7 },
  'Post-sevrage': { min: 5, max: 25 },
  Croissance: { min: 20, max: 60 },
  Engraissement: { min: 50, max: 100 },
  Finition: { min: 80, max: 120 },
};

const DEFAULT_FORM: CreationForm = {
  logeMode: 'EXISTING',
  logeId: '',
  logeNumero: '',
  stade: null,
  typeLoge: null,
  ageMois: '',
  poidsMoyenKg: '',
  note: '',
};

// ─── Helpers exposés (testables) ─────────────────────────────────────────────

export function buildBandeCodeId(stade: Stade, logeNumero: string, today: Date): string {
  const yy = String(today.getFullYear()).slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const safe = logeNumero.trim().replace(/[^A-Za-z0-9]/g, '') || 'LX';
  return `B-${yy}${mm}${dd}-L${safe}-${STADE_CODE[stade]}`;
}

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

export function typeLogeCoherent(
  typeLoge: TypeLoge,
  selection: { sexe: 'M' | 'F' | 'INCONNU' | null }[],
): boolean {
  if (typeLoge === 'MIXTE') return true;
  if (typeLoge === 'MALES') return selection.every((s) => s.sexe === 'M');
  if (typeLoge === 'FEMELLES') return selection.every((s) => s.sexe === 'F');
  return true;
}

// ─── Hook : fetch porcelets vrac + loges ─────────────────────────────────────

interface UseVracDataState {
  loading: boolean;
  error: string | null;
  porcelets: PorceletVrac[];
  loges: LogeOption[];
  refresh: () => void;
}

function useVracData(farmId: string | null): UseVracDataState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [porcelets, setPorcelets] = useState<PorceletVrac[]>([]);
  const [loges, setLoges] = useState<LogeOption[]>([]);
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
        const { data: lRows, error: lErr } = await (supabase as any)
          .from('loges')
          .select('id, numero, type, repartition')
          .eq('farm_id', farmId)
          .eq('active', true)
          .order('numero', { ascending: true });
        if (lErr) throw lErr;

        if (cancelled) return;
        setPorcelets(pRows ?? []);
        setLoges(lRows ?? []);
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

  return { loading, error, porcelets, loges, refresh };
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PorceletsReorgWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const farmId = user?.id ?? null;

  const { loading, error, porcelets, loges, refresh } = useVracData(farmId);

  const [sexeFilter, setSexeFilter] = useState<SexeFilter>('ALL');
  const [poidsFilter, setPoidsFilter] = useState<PoidsFilter>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreationForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const openForm = () => {
    if (selectedIds.size === 0) return;
    const avg = avgPoids(selectedPorcelets);
    setForm({
      ...DEFAULT_FORM,
      poidsMoyenKg: avg !== null ? String(avg) : '',
    });
    setSubmitError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSubmitError(null);
  };

  const formCanSubmit =
    (form.logeMode === 'EXISTING' ? form.logeId !== '' : form.logeNumero.trim() !== '') &&
    form.stade !== null &&
    form.typeLoge !== null &&
    form.ageMois !== '' &&
    Number(form.ageMois) > 0;

  const poidsMoyenNum = form.poidsMoyenKg !== '' ? Number(form.poidsMoyenKg) : null;
  const poidsWarn =
    form.stade !== null &&
    poidsMoyenNum !== null &&
    !poidsCohorent(form.stade, poidsMoyenNum);

  const typeLogeMismatch =
    form.typeLoge !== null &&
    !typeLogeCoherent(form.typeLoge, selectedPorcelets);

  const handleSubmit = async () => {
    if (!farmId || !formCanSubmit || form.stade === null || form.typeLoge === null) return;
    if (typeLogeMismatch) {
      setSubmitError(
        'Le type de loge sélectionné ne correspond pas aux sexes des porcelets. Ajuste la sélection ou le type.',
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Loge — création si nécessaire, sinon récup numéro
      let logeIdToUse = form.logeId;
      let logeNumeroToUse = '';
      if (form.logeMode === 'NEW') {
        const newLogePayload = {
          farm_id: farmId,
          numero: form.logeNumero.trim(),
          type: STADE_TO_LOGE_TYPE[form.stade],
          repartition: form.typeLoge,
          capacite_max: Math.ceil(selectedIds.size * 1.2),
          active: true,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newLoge, error: logeErr } = await (supabase as any)
          .from('loges')
          .insert(newLogePayload)
          .select('id, numero')
          .single();
        if (logeErr) throw logeErr;
        logeIdToUse = newLoge.id;
        logeNumeroToUse = newLoge.numero;
      } else {
        const existing = loges.find((l) => l.id === form.logeId);
        logeNumeroToUse = existing?.numero ?? '';
      }

      // 2. Bande
      const codeId = buildBandeCodeId(form.stade, logeNumeroToUse, new Date());
      const ageJours = Math.round(Number(form.ageMois) * 30);
      const batchPayload: Record<string, unknown> = {
        farm_id: farmId,
        code_id: codeId,
        phase: form.stade,
        statut: 'En cours',
        loge: logeNumeroToUse,
        loge_id: logeIdToUse,
        porcelets_nes_vivants: selectedIds.size,
        poids_initial_kg: poidsMoyenNum ?? 0,
        age_jours_estime: ageJours,
      };
      if (poidsMoyenNum !== null) batchPayload.poids_moyen_kg = poidsMoyenNum;
      if (form.note.trim() !== '') batchPayload.notes = form.note.trim();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newBatch, error: batchErr } = await (supabase as any)
        .from('batches')
        .insert(batchPayload)
        .select('id')
        .single();
      if (batchErr) throw batchErr;

      // 3. UPDATE porcelets sélectionnés
      const ids = Array.from(selectedIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updErr } = await (supabase as any)
        .from('porcelets_individuels')
        .update({ batch_id: newBatch.id })
        .in('id', ids)
        .eq('farm_id', farmId);
      if (updErr) throw updErr;

      showToast(
        `Bande créée · ${selectedIds.size} porcelets · Loge ${logeNumeroToUse}`,
        'success',
        4000,
      );
      setSelectedIds(new Set());
      setShowForm(false);
      setForm(DEFAULT_FORM);
      refresh();
    } catch (e) {
      setSubmitError((e as Error).message ?? 'Erreur lors de la création de la bande');
    } finally {
      setSubmitting(false);
    }
  };

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
                  size={32}
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

          {!loading && !error && totalCount > 0 && !showForm && (
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
                    onClick={openForm}
                    ariaLabel="Créer une bande à partir de la sélection"
                    style={{ width: '100%' }}
                  >
                    <CheckSquare size={14} aria-hidden /> Créer une bande à partir de la
                    sélection ({selectedIds.size} porcelet{selectedIds.size > 1 ? 's' : ''})
                  </Button>
                </div>
              )}
            </>
          )}

          {showForm && (
            <>
              <Section label="NOUVELLE BANDE" tone="accent" />
              <Card>
                <div
                  style={{
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--pt-font-display)',
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {selectedIds.size} porcelet{selectedIds.size > 1 ? 's' : ''} sélectionné
                      {selectedIds.size > 1 ? 's' : ''}
                    </div>
                    <button
                      type="button"
                      onClick={closeForm}
                      aria-label="Annuler la création"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--pt-muted)',
                        padding: 4,
                      }}
                    >
                      <X size={18} aria-hidden />
                    </button>
                  </div>

                  <FormField label="Numéro de loge" required>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, logeMode: 'EXISTING' }))}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border:
                              form.logeMode === 'EXISTING'
                                ? '2px solid var(--pt-primary)'
                                : '1px solid var(--pt-line-strong)',
                            background:
                              form.logeMode === 'EXISTING'
                                ? 'var(--pt-surface-alt)'
                                : 'var(--pt-bg)',
                            fontSize: 13,
                            fontFamily: 'var(--pt-font-display)',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Loge existante
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, logeMode: 'NEW' }))}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border:
                              form.logeMode === 'NEW'
                                ? '2px solid var(--pt-primary)'
                                : '1px solid var(--pt-line-strong)',
                            background:
                              form.logeMode === 'NEW'
                                ? 'var(--pt-surface-alt)'
                                : 'var(--pt-bg)',
                            fontSize: 13,
                            fontFamily: 'var(--pt-font-display)',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={12} aria-hidden style={{ display: 'inline' }} /> Nouvelle
                          loge
                        </button>
                      </div>
                      {form.logeMode === 'EXISTING' ? (
                        <Select
                          value={form.logeId}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, logeId: e.target.value }))
                          }
                          aria-label="Sélectionner une loge existante"
                        >
                          <option value="">— Sélectionner —</option>
                          {loges.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.numero} ({l.type})
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type="text"
                          placeholder="ex: L7"
                          value={form.logeNumero}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, logeNumero: e.target.value }))
                          }
                          aria-label="Numéro de la nouvelle loge"
                        />
                      )}
                    </div>
                  </FormField>

                  <FormField label="Stade" required>
                    <RadioGroup
                      value={form.stade ?? ''}
                      onChange={(v) => setForm((f) => ({ ...f, stade: v as Stade }))}
                      options={STADE_OPTIONS}
                      ariaLabel="Stade"
                    />
                  </FormField>

                  <FormField label="Type de loge" required>
                    <RadioGroup
                      value={form.typeLoge ?? ''}
                      onChange={(v) => setForm((f) => ({ ...f, typeLoge: v as TypeLoge }))}
                      options={TYPE_LOGE_OPTIONS}
                      ariaLabel="Type de loge"
                    />
                  </FormField>

                  {typeLogeMismatch && (
                    <div
                      style={{
                        padding: 8,
                        background: 'var(--pt-danger-soft, rgba(239,68,68,0.08))',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--pt-danger)',
                      }}
                    >
                      Le type de loge ne correspond pas aux sexes des porcelets sélectionnés.
                    </div>
                  )}

                  <FormField label="Âge (en mois)" required>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="ex: 2"
                      value={form.ageMois}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ageMois: e.target.value }))
                      }
                      aria-label="Âge en mois"
                    />
                  </FormField>

                  <FormField
                    label="Poids moyen (kg)"
                    hint="Pré-rempli depuis les imports. Modifiable."
                  >
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="kg"
                      value={form.poidsMoyenKg}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, poidsMoyenKg: e.target.value }))
                      }
                      aria-label="Poids moyen kg"
                    />
                  </FormField>
                  {poidsWarn && (
                    <div
                      style={{
                        marginTop: -8,
                        fontSize: 12,
                        color: 'var(--pt-muted)',
                      }}
                    >
                      Note : poids inhabituel pour ce stade.
                    </div>
                  )}

                  <FormField label="Note (optionnel)">
                    <Textarea
                      value={form.note}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, note: e.target.value }))
                      }
                      aria-label="Note"
                    />
                  </FormField>

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

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={closeForm}
                      disabled={submitting}
                      style={{ flex: 1 }}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={!formCanSubmit || submitting}
                      style={{ flex: 1 }}
                      ariaLabel="Créer la bande"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" aria-hidden /> Création…
                        </>
                      ) : (
                        <>
                          <Save size={14} aria-hidden /> Créer la bande
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
