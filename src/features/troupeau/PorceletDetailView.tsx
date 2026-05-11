/**
 * PorceletDetailView — /troupeau/porcelets/:id
 * ════════════════════════════════════════════════════════════════════════════
 * Fiche détail d'un porcelet individuel — mockup v76 section #fiche-porcelet.
 *
 * Pattern aligné sur VerratDetailView (le plus simple des fiches détail) :
 *   - Header .ph--primary (cahier d'éleveur) avec breadcrumb + id-strip
 *   - 3 onglets : Vue d'ensemble · Pesées · Santé
 *
 * Onglet "Vue d'ensemble" :
 *   - IDENTITÉ        : bande, mère (truie source), sexe, naissance, ordre
 *   - CROISSANCE      : pesées (mini-graph) ou empty state
 *   - ACTIONS         : Peser · Soigner · Marquer vendu · Marquer mortalité
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronRight, MoreHorizontal, Scale, Syringe } from 'lucide-react';

import { Button, Section, Tabs } from '@/design-system';
import { Pill } from '../../v70/components/ds/Pill';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import { useFarm } from '../../context/FarmContext';
import { useEntityWithRetry } from '../../hooks/useEntityWithRetry';
import {
  SpinnerCenter,
  EntityNotFoundCard,
} from '../../v70/components/v70/EntityNotFoundGuard';
import { supabase } from '../../services/supabaseClient';
import { derivePorceletPhase, formatDateFr, formatPoids, type PorceletPhase } from '../../v70/lib';
import type { BandePorcelets, PorceletIndividuel, TraitementSante } from '../../types/farm';

// ─── Constantes ─────────────────────────────────────────────────────────────

type PorceletTabId = 'apercu' | 'pesees' | 'sante';

interface PeseeRow {
  id: string;
  date_pesee: string;
  poids_kg: number;
  notes: string | null;
}

const PHASE_LABEL: Record<PorceletPhase, string> = {
  SOUS_MERE: 'Sous mère',
  POST_SEVRAGE: 'Post-sevrage',
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
};

const SEXE_LABEL: Record<string, string> = {
  M: 'Mâle',
  F: 'Femelle',
  INCONNU: 'Sexe inconnu',
};

const STATUT_LABEL: Record<string, string> = {
  VIVANT: 'Vivant',
  MORT: 'Mort',
  VENDU: 'Vendu',
  MALADE: 'Malade',
  QUARANTAINE: 'Quarantaine',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function shortCodeFor(boucle: string): string {
  // ex : "CR-12" → "CR12" ; "BCL-0001" → "BCL01"
  const cleaned = boucle.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleaned.length <= 4 ? cleaned : cleaned.slice(0, 4);
}

function findPorceletInBandes(
  bandes: BandePorcelets[],
  rawId: string,
): { porcelet: PorceletIndividuel; bande: BandePorcelets } | undefined {
  for (const b of bandes) {
    const list = b.porcelets ?? [];
    const found = list.find(
      (p) => p.id === rawId || p.boucle === rawId,
    );
    if (found) return { porcelet: found, bande: b };
  }
  return undefined;
}

// ─── Composant ──────────────────────────────────────────────────────────────

const PorceletDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const decodedId = id ? decodeURIComponent(id) : '';

  const { bandes, getHealthForSubject } = useFarm();
  const [tab, setTab] = useState<PorceletTabId>('apercu');
  const [pesees, setPesees] = useState<PeseeRow[]>([]);
  const [peseesLoading, setPeseesLoading] = useState(false);

  // ── Hooks (TOUS avant early returns — rules-of-hooks) ─────────────────────

  const found = useMemo(
    () => findPorceletInBandes(bandes, decodedId),
    [bandes, decodedId],
  );

  const porcelet = found?.porcelet;
  const bande = found?.bande;

  const phase = useMemo<PorceletPhase | null>(
    () => (porcelet && bande ? derivePorceletPhase(porcelet, bande) : null),
    [porcelet, bande],
  );

  const motherLabel = useMemo<string>(() => {
    if (!bande) return '—';
    const sources = bande.sources ?? [];
    if (sources.length === 1) {
      const s = sources[0];
      const code = s.sowCode || s.sowBoucle || s.sowId;
      return s.sowName ? `${code} · ${s.sowName}` : code;
    }
    if (bande.truie) return bande.truie;
    if (bande.boucleMere) return bande.boucleMere;
    return '—';
  }, [bande]);

  const ordreLabel = useMemo<string>(() => {
    if (!porcelet || !bande) return '—';
    const list = (bande.porcelets ?? [])
      .slice()
      .sort((a, b) =>
        a.boucle.localeCompare(b.boucle, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );
    const idx = list.findIndex((p) => p.id === porcelet.id);
    if (idx < 0) return `— / ${list.length || '—'}`;
    return `${idx + 1} / ${list.length}`;
  }, [porcelet, bande]);

  const healthLogs = useMemo<TraitementSante[]>(
    () => (porcelet ? getHealthForSubject(porcelet.id, 'PORCELET') : []),
    [porcelet, getHealthForSubject],
  );

  const porceletGuard = useEntityWithRetry(porcelet);

  // Charge l'historique des pesées (table `pesees`, FK porcelet_id).
  useEffect(() => {
    if (!porcelet) {
      setPesees([]);
      return;
    }
    let cancelled = false;
    setPeseesLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from('pesees')
        .select('id, date_pesee, poids_kg, notes')
        .eq('porcelet_id', porcelet.id)
        .order('date_pesee', { ascending: false });
      if (cancelled) return;
      if (!error && Array.isArray(data)) {
        setPesees(data as PeseeRow[]);
      }
      setPeseesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [porcelet]);

  // ── Early returns (après hooks) ───────────────────────────────────────────

  if (porceletGuard.state === 'loading') {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <SpinnerCenter />
        </IonContent>
      </IonPage>
    );
  }

  if (porceletGuard.state === 'not-found' || !porcelet || !bande) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
            <EntityNotFoundCard
              label="porcelet"
              message="Ce porcelet n’existe pas ou plus dans votre exploitation."
              onBack={() => window.history.back()}
            />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const phaseLabel = phase ? PHASE_LABEL[phase] : '—';
  const sexeLabel = SEXE_LABEL[porcelet.sexe] ?? '—';
  const statutLabel = STATUT_LABEL[porcelet.statut] ?? porcelet.statut;
  const poidsLabel = formatPoids(porcelet.poidsCourantKg);
  const shortCode = shortCodeFor(porcelet.boucle);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div
          data-testid="porcelet-detail-view"
          className="pt-screen"
          style={{
            background: 'var(--pt-bg, var(--bg-app))',
            minHeight: '100%',
            paddingBottom: 168,
          }}
        >
          <header className="ph ph--primary">
            <div className="ph__crumb">
              <Link to="/troupeau">Élevage</Link>
              <ChevronRight aria-hidden />
              <Link to="/troupeau?view=porcelets">Porcelets</Link>
              <ChevronRight aria-hidden />
              <b>{porcelet.boucle}</b>
            </div>
            <div className="ph__row">
              <div>
                <div className="eyebrow ph__eyebrow">Élevage · Porcelet</div>
                <h1 className="ph__h1">{porcelet.boucle}</h1>
              </div>
              <button
                type="button"
                className="iconbtn"
                aria-label="Ouvrir les actions"
              >
                <MoreHorizontal aria-hidden />
              </button>
            </div>
            <p className="ph__sub">
              {bande.idPortee ? (
                <>
                  Bande <b>{bande.idPortee}</b> ·{' '}
                </>
              ) : null}
              {sexeLabel} · {phaseLabel}
              {porcelet.poidsCourantKg ? (
                <>
                  {' '}
                  · <b>{poidsLabel}</b>
                </>
              ) : null}
            </p>
            <div className="id-strip">
              <span className="av av--xl av--porcelet">
                <EntityAvatar
                  species="porcelet"
                  size="xl"
                  shortCode={shortCode}
                  useV73Defaults
                />
              </span>
              <div className="id-strip__meta">
                <div className="id-strip__row">
                  <Pill variant="warm">{phaseLabel}</Pill>
                  {porcelet.statut !== 'VIVANT' ? (
                    <Pill variant="ghost">{statutLabel}</Pill>
                  ) : null}
                </div>
                <div>
                  Boucle <b className="num">{porcelet.boucle}</b>
                </div>
                {bande.dateMB ? (
                  <div>
                    Né <b className="num">{formatDateFr(bande.dateMB)}</b>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div
            role="main"
            aria-label={`Détail porcelet ${porcelet.boucle}`}
            className="phone-content"
            style={{
              padding: 24,
              maxWidth: 600,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <Tabs
              ariaLabel="Sections de la fiche porcelet"
              value={tab}
              onChange={(v) => setTab(v as PorceletTabId)}
              options={[
                { value: 'apercu', label: 'Vue d’ensemble' },
                { value: 'pesees', label: 'Pesées', count: pesees.length || undefined },
                { value: 'sante', label: 'Santé', count: healthLogs.length || undefined },
              ]}
            />

            {tab === 'apercu' && (
              <>
                <section
                  aria-label="Identité"
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <Section label="IDENTITÉ" />
                  <div
                    style={{
                      background: 'var(--bg-surface, var(--pt-bg))',
                      borderRadius: 12,
                      padding: '6px 16px',
                      boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                    }}
                  >
                    <DetailRow label="Bande" value={bande.idPortee || '—'} mono />
                    <DetailRow label="Mère" value={motherLabel} />
                    <DetailRow label="Sexe" value={sexeLabel} />
                    <DetailRow
                      label="Naissance"
                      value={bande.dateMB ? formatDateFr(bande.dateMB) : '—'}
                    />
                    <DetailRow label="Ordre dans portée" value={ordreLabel} mono />
                    {bande.logeNumero ? (
                      <DetailRow label="Loge" value={bande.logeNumero} />
                    ) : null}
                  </div>
                </section>

                <section
                  aria-label="Croissance"
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <Section label="CROISSANCE" />
                  <div
                    style={{
                      background: 'var(--bg-surface, var(--pt-bg))',
                      borderRadius: 12,
                      padding: 16,
                      boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                    }}
                  >
                    {pesees.length === 0 ? (
                      <div
                        className="empty"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 10,
                          padding: '24px 8px',
                          textAlign: 'center',
                        }}
                      >
                        <Scale
                          size={38}
                          strokeWidth={2}
                          color="var(--pt-subtle, var(--text-2))"
                          aria-hidden
                        />
                        <div style={{ fontWeight: 600 }}>
                          Aucune pesée enregistrée
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--pt-muted, var(--text-2))',
                          }}
                        >
                          {peseesLoading
                            ? 'Chargement…'
                            : 'Utilise le bouton Peser pour démarrer.'}
                        </div>
                      </div>
                    ) : (
                      <>
                        <DetailRow
                          label="Pesée courante"
                          value={`${pesees[0].poids_kg.toFixed(1)} kg`}
                          mono
                        />
                        <DetailRow
                          label="Dernière pesée"
                          value={formatDateFr(pesees[0].date_pesee)}
                        />
                        <DetailRow label="Phase" value={phaseLabel} />
                        {/* TODO V72+ : mini-bar-chart SVG des pesées */}
                      </>
                    )}
                  </div>
                </section>

                <section
                  aria-label="Actions"
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <Section label="ACTIONS" />
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    <Button variant="primary">Peser</Button>
                    <Button variant="secondary">Soigner</Button>
                    <Button variant="ghost">Marquer vendu</Button>
                    <Button variant="ghost">Marquer mortalité</Button>
                  </div>
                </section>
              </>
            )}

            {tab === 'pesees' && (
              <section aria-label="Historique pesées">
                <Section label={`PESÉES · ${pesees.length}`} />
                {pesees.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: 'var(--pt-muted, var(--text-2))',
                      fontSize: 13,
                    }}
                  >
                    {peseesLoading
                      ? 'Chargement…'
                      : 'Aucune pesée enregistrée pour ce porcelet.'}
                  </div>
                ) : (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      background: 'var(--bg-surface, var(--pt-bg))',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    {pesees.map((p) => (
                      <li
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--pt-line, var(--border))',
                        }}
                      >
                        <Scale
                          size={16}
                          color="var(--pt-muted, var(--text-2))"
                          aria-hidden
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {p.poids_kg.toFixed(1)} kg
                        </span>
                        <span style={{ flex: 1 }} />
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--pt-muted, var(--text-2))',
                          }}
                        >
                          {formatDateFr(p.date_pesee)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === 'sante' && (
              <section aria-label="Historique santé">
                <Section label={`SANTÉ · ${healthLogs.length}`} />
                {healthLogs.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: 'var(--pt-muted, var(--text-2))',
                      fontSize: 13,
                    }}
                  >
                    Aucun évènement santé enregistré.
                  </div>
                ) : (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      background: 'var(--bg-surface, var(--pt-bg))',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    {healthLogs.slice(0, 20).map((s) => (
                      <li
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--pt-line, var(--border))',
                        }}
                      >
                        <Syringe
                          size={16}
                          color="var(--pt-muted, var(--text-2))"
                          aria-hidden
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {s.typeSoin}
                            {s.traitement ? ` · ${s.traitement}` : ''}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--pt-muted, var(--text-2))',
                              marginTop: 2,
                            }}
                          >
                            {formatDateFr(s.date)}
                            {s.observation ? ` · ${s.observation}` : ''}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, mono }) => {
  const isEmpty = value === '—' || value == null || value === '';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 6px',
        borderBottom: '1px solid var(--pt-line, var(--border))',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--pt-muted, var(--text-1))' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
          opacity: isEmpty ? 0.4 : 1,
        }}
      >
        {value}
      </span>
    </div>
  );
};

export default PorceletDetailView;
