/**
 * PorceletsReorgWizard — Wizard bloquant V71-P3
 *
 * Affiché au login (via PorceletsReorgGate) si la ferme courante a des bandes
 * orphelines :
 *  - bande.loge_id IS NULL (sans loge assignée), OU
 *  - bande.sow_id IS NULL ET bande.phase IN ('Sous mère','Maternité') (sans
 *    mère pour les phases pré-sevrage où la traçabilité origine est critique)
 *
 * Workflow :
 *  1. Liste les bandes problématiques (1 card par bande)
 *  2. Pour chaque bande : sélecteur loge (existante + bouton créer) + sélecteur
 *     mère (truies en maternité/gestante + option "Inconnue")
 *  3. Submit groupé → UPDATE batches SET sow_id, loge_id, loge
 *  4. Redirect /today
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { ChevronLeft, ChevronRight, CheckCircle2, Plus, Loader2 } from 'lucide-react';

import { Button, Card, PageHeader, Section } from '@/design-system';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrphanBande {
  id: string;
  code_id: string;
  phase: string | null;
  loge_id: string | null;
  sow_id: string | null;
  porcelets_nes_vivants: number | null;
  porcelets_count: number;
}

interface LogeOption {
  id: string;
  numero: string;
  type: string;
  repartition: string | null;
  capacite_max: number | null;
}

interface SowOption {
  id: string;
  code_id: string;
  statut: string | null;
}

interface BandePatch {
  loge_id: string | null;
  sow_id: string | null;
  // 'INCONNUE' = explicit choice "mère inconnue", on laisse sow_id null mais
  // on track que l'user a fait un choix conscient.
  sow_unknown: boolean;
}

// ─── Hook : fetch orphan bandes + loges + sows ───────────────────────────────

interface UseReorgDataState {
  loading: boolean;
  error: string | null;
  bandes: OrphanBande[];
  loges: LogeOption[];
  sows: SowOption[];
  refresh: () => void;
}

function useReorgData(farmId: string | null): UseReorgDataState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bandes, setBandes] = useState<OrphanBande[]>([]);
  const [loges, setLoges] = useState<LogeOption[]>([]);
  const [sows, setSows] = useState<SowOption[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!farmId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        // Bandes orphelines : loge_id NULL OU (sow_id NULL ET phase pré-sevrage)
        const phasesPreSev = ['Sous mère', 'Maternité'];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: bandesRows, error: bandesErr } = await (supabase as any)
          .from('batches')
          .select('id, code_id, phase, loge_id, sow_id, porcelets_nes_vivants')
          .eq('farm_id', farmId)
          .or(`loge_id.is.null,and(sow_id.is.null,phase.in.(${phasesPreSev.map((p) => `"${p}"`).join(',')}))`)
          .order('code_id', { ascending: true });
        if (bandesErr) throw bandesErr;

        // Comptage porcelets par bande
        const bandeIds = (bandesRows ?? []).map((b: { id: string }) => b.id);
        let porceletCounts: Record<string, number> = {};
        if (bandeIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: piRows } = await (supabase as any)
            .from('porcelets_individuels')
            .select('batch_id')
            .in('batch_id', bandeIds);
          porceletCounts = (piRows ?? []).reduce(
            (acc: Record<string, number>, r: { batch_id: string }) => {
              acc[r.batch_id] = (acc[r.batch_id] ?? 0) + 1;
              return acc;
            },
            {},
          );
        }

        // Loges existantes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: logesRows, error: logesErr } = await (supabase as any)
          .from('loges')
          .select('id, numero, type, repartition, capacite_max')
          .eq('farm_id', farmId)
          .eq('active', true)
          .order('numero', { ascending: true });
        if (logesErr) throw logesErr;

        // Truies actives (gestante / en maternité / en attente)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sowsRows, error: sowsErr } = await (supabase as any)
          .from('sows')
          .select('id, code_id, statut')
          .eq('farm_id', farmId)
          .order('code_id', { ascending: true });
        if (sowsErr) throw sowsErr;

        if (cancelled) return;

        setBandes(
          (bandesRows ?? []).map((b: OrphanBande) => ({
            ...b,
            porcelets_count: porceletCounts[b.id] ?? 0,
          })),
        );
        setLoges(logesRows ?? []);
        setSows(sowsRows ?? []);
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

  return { loading, error, bandes, loges, sows, refresh };
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PorceletsReorgWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const farmId = user?.id ?? null;

  const { loading, error, bandes, loges, sows, refresh } = useReorgData(farmId);
  const [patches, setPatches] = useState<Record<string, BandePatch>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingLoge, setCreatingLoge] = useState<string | null>(null); // bandeId
  const [newLogeForm, setNewLogeForm] = useState<{
    numero: string;
    type: string;
    repartition: string;
    capacite_max: string;
  }>({ numero: '', type: 'POST_SEVRAGE', repartition: 'MIXTE', capacite_max: '20' });

  // Init patches avec valeurs courantes (si déjà partiellement renseignées)
  useEffect(() => {
    const init: Record<string, BandePatch> = {};
    for (const b of bandes) {
      init[b.id] = {
        loge_id: b.loge_id,
        sow_id: b.sow_id,
        sow_unknown: false,
      };
    }
    setPatches(init);
  }, [bandes]);

  const allComplete = useMemo(() => {
    if (bandes.length === 0) return false;
    return bandes.every((b) => {
      const p = patches[b.id];
      if (!p) return false;
      // Loge : obligatoire pour toutes les bandes sans loge
      if (!b.loge_id && !p.loge_id) return false;
      // Mère : obligatoire pour les bandes en phase pré-sevrage sans mère
      const phasePreSev = b.phase === 'Sous mère' || b.phase === 'Maternité';
      if (phasePreSev && !b.sow_id && !p.sow_id && !p.sow_unknown) return false;
      return true;
    });
  }, [bandes, patches]);

  const handleSubmit = async () => {
    if (!farmId || !allComplete) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // UPDATE par bande
      for (const b of bandes) {
        const p = patches[b.id];
        if (!p) continue;
        const update: Record<string, unknown> = {};
        if (p.loge_id && p.loge_id !== b.loge_id) {
          update.loge_id = p.loge_id;
          const loge = loges.find((l) => l.id === p.loge_id);
          if (loge) update.loge = loge.numero;
        }
        if (p.sow_id && p.sow_id !== b.sow_id) update.sow_id = p.sow_id;
        if (Object.keys(update).length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: upErr } = await (supabase as any)
            .from('batches')
            .update(update)
            .eq('id', b.id)
            .eq('farm_id', farmId);
          if (upErr) throw upErr;
        }
      }
      navigate('/today', { replace: true });
    } catch (e) {
      setSubmitError((e as Error).message ?? 'Erreur lors de la mise à jour');
      setSubmitting(false);
    }
  };

  const handleCreateLoge = async (bandeId: string) => {
    if (!farmId) return;
    setSubmitError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase as any)
        .from('loges')
        .insert({
          farm_id: farmId,
          numero: newLogeForm.numero.trim(),
          type: newLogeForm.type,
          repartition: newLogeForm.repartition,
          capacite_max: parseInt(newLogeForm.capacite_max, 10) || 20,
          active: true,
        })
        .select('id, numero, type, repartition, capacite_max')
        .single();
      if (err) throw err;
      // Mise à jour patch local
      setPatches((prev) => ({
        ...prev,
        [bandeId]: { ...(prev[bandeId] ?? { loge_id: null, sow_id: null, sow_unknown: false }), loge_id: data.id },
      }));
      setCreatingLoge(null);
      setNewLogeForm({ numero: '', type: 'POST_SEVRAGE', repartition: 'MIXTE', capacite_max: '20' });
      refresh();
    } catch (e) {
      setSubmitError((e as Error).message ?? 'Erreur lors de la création de la loge');
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
        <div className="phone-content" style={{ padding: '24px 24px 168px', maxWidth: 720, margin: '0 auto' }}>
          <PageHeader
            eyebrow="Mise à jour requise"
            title="Tes porcelets"
            subtitle={`Avant de continuer, on retrouve ${bandes.length} bande${bandes.length > 1 ? 's' : ''} dans tes registres.`}
          />

          {loading && (
            <Card>
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--pt-muted)' }}>
                <Loader2 size={20} className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }} />
                Chargement des bandes…
              </div>
            </Card>
          )}

          {error && (
            <Card>
              <div style={{ padding: 16, color: 'var(--pt-danger)' }}>{error}</div>
            </Card>
          )}

          {!loading && !error && bandes.length === 0 && (
            <Card>
              <div style={{ padding: 24, textAlign: 'center' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--pt-success)' }} aria-hidden />
                <p style={{ marginTop: 12, fontWeight: 600 }}>Tout est en ordre.</p>
                <Button variant="primary" onClick={() => navigate('/today', { replace: true })}>
                  Continuer
                </Button>
              </div>
            </Card>
          )}

          {!loading && !error && bandes.length > 0 && (
            <>
              <Section label="BANDES À ORGANISER" tone="accent" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                {bandes.map((b) => {
                  const p = patches[b.id] ?? { loge_id: null, sow_id: null, sow_unknown: false };
                  const phasePreSev = b.phase === 'Sous mère' || b.phase === 'Maternité';
                  const needsLoge = !b.loge_id;
                  const needsMere = phasePreSev && !b.sow_id;

                  return (
                    <div key={b.id}><Card>
                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontFamily: 'var(--pt-font-display)', fontSize: 16, fontWeight: 700 }}>
                              {b.code_id}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--pt-muted)', marginTop: 2 }}>
                              {b.phase ?? '—'} · {b.porcelets_count} porcelet{b.porcelets_count > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Sélecteur loge */}
                        {needsLoge && (
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pt-muted)', marginBottom: 6 }}>
                              Loge · requis
                            </label>
                            {creatingLoge === b.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--pt-bg-app)', borderRadius: 8 }}>
                                <input
                                  type="text"
                                  placeholder="Numéro (ex: L7)"
                                  value={newLogeForm.numero}
                                  onChange={(e) => setNewLogeForm((f) => ({ ...f, numero: e.target.value }))}
                                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--pt-line-strong)', fontSize: 14 }}
                                />
                                <select
                                  value={newLogeForm.type}
                                  onChange={(e) => setNewLogeForm((f) => ({ ...f, type: e.target.value }))}
                                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--pt-line-strong)', fontSize: 14 }}
                                >
                                  <option value="MATERNITE">Maternité</option>
                                  <option value="POST_SEVRAGE">Post-sevrage</option>
                                  <option value="ENGRAISSEMENT">Engraissement</option>
                                  <option value="INFIRMERIE">Infirmerie</option>
                                </select>
                                <select
                                  value={newLogeForm.repartition}
                                  onChange={(e) => setNewLogeForm((f) => ({ ...f, repartition: e.target.value }))}
                                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--pt-line-strong)', fontSize: 14 }}
                                >
                                  <option value="MIXTE">Mixte (mâles + femelles)</option>
                                  <option value="MALES">Mâles uniquement</option>
                                  <option value="FEMELLES">Femelles uniquement</option>
                                  <option value="NA">Non applicable</option>
                                </select>
                                <input
                                  type="number"
                                  placeholder="Capacité max"
                                  value={newLogeForm.capacite_max}
                                  onChange={(e) => setNewLogeForm((f) => ({ ...f, capacite_max: e.target.value }))}
                                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--pt-line-strong)', fontSize: 14 }}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <Button variant="primary" size="sm" onClick={() => handleCreateLoge(b.id)}>
                                    Créer
                                  </Button>
                                  <Button variant="secondary" size="sm" onClick={() => setCreatingLoge(null)}>
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <select
                                  value={p.loge_id ?? ''}
                                  onChange={(e) => setPatches((prev) => ({ ...prev, [b.id]: { ...p, loge_id: e.target.value || null } }))}
                                  style={{ flex: 1, minWidth: 180, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--pt-line-strong)', fontSize: 14, background: 'var(--pt-bg)' }}
                                >
                                  <option value="">— Sélectionner —</option>
                                  {loges.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.numero} ({l.type} · {l.repartition ?? 'NA'})
                                    </option>
                                  ))}
                                </select>
                                <Button variant="secondary" size="sm" onClick={() => setCreatingLoge(b.id)}>
                                  <Plus size={14} aria-hidden /> Créer
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sélecteur mère */}
                        {needsMere && (
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pt-muted)', marginBottom: 6 }}>
                              Truie mère · requis
                            </label>
                            <select
                              value={p.sow_unknown ? '__UNKNOWN__' : (p.sow_id ?? '')}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '__UNKNOWN__') {
                                  setPatches((prev) => ({ ...prev, [b.id]: { ...p, sow_id: null, sow_unknown: true } }));
                                } else {
                                  setPatches((prev) => ({ ...prev, [b.id]: { ...p, sow_id: v || null, sow_unknown: false } }));
                                }
                              }}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--pt-line-strong)', fontSize: 14, background: 'var(--pt-bg)' }}
                            >
                              <option value="">— Sélectionner —</option>
                              {sows.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.code_id} {s.statut ? `(${s.statut})` : ''}
                                </option>
                              ))}
                              <option value="__UNKNOWN__">Mère inconnue</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </Card></div>
                  );
                })}
              </div>

              {submitError && (
                <Card>
                  <div style={{ padding: 12, color: 'var(--pt-danger)', fontSize: 13 }}>{submitError}</div>
                </Card>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'sticky', bottom: 24 }}>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!allComplete || submitting}
                  ariaLabel="Valider et continuer"
                  className="flex-1"
                  style={{ flex: 1, opacity: !allComplete || submitting ? 0.5 : 1 }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden /> Mise à jour…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} aria-hidden /> Valider et continuer <ChevronRight size={14} aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
