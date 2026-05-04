import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonToast,
  useIonAlert,
} from '@ionic/react';
import { Home, ChevronLeft, Pencil, Archive, Users, ArrowLeftRight } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import EmptyState from '../../components/design/EmptyState';
import TopBarSync from '../../components/design/TopBarSync';
import { AnimalListItem, Chip } from '../../components/agritech';
import { Button, PageHeader } from '@/design-system';

import {
  listLoges,
  getLogeContents,
  deactivateLoge,
} from '../../services/supabaseWrites';
import { supabase } from '../../services/supabaseClient';

import type {
  Loge,
  LogeType,
  Truie,
  Verrat,
  BandePorcelets,
} from '../../types/farm';

const LOGE_TYPE_LABELS: Record<LogeType, string> = {
  MATERNITE: 'Maternité',
  POST_SEVRAGE: 'Post-sevrage',
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
  GESTANTE: 'Gestante',
  VERRAT: 'Verrat',
  INFIRMERIE: 'Infirmerie',
  AUTRE: 'Autre',
};

interface MovementRow {
  id: string;
  subject_type: 'TRUIE' | 'VERRAT' | 'BANDE';
  subject_id: string;
  from_loge_id: string | null;
  to_loge_id: string | null;
  date_mvt: string;
  reason: string | null;
}

/**
 * LogeDetailView — `/troupeau/loges/:id`
 * ════════════════════════════════════════════════════════════════════════════
 *
 *   - Hero : numero, type, bâtiment, capacité
 *   - Section "Occupation actuelle" : truies / verrats / bandes (getLogeContents)
 *   - Section "Historique mouvements" : query loge_movements
 *   - Bouton "Modifier" (placeholder → navigate retour, futur QuickEditLogeForm)
 *   - Bouton "Désactiver" → useIonAlert + deactivateLoge
 */
const LogeDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [presentAlert] = useIonAlert();

  const [loge, setLoge] = useState<Loge | null>(null);
  const [contents, setContents] = useState<{
    truies: Truie[];
    verrats: Verrat[];
    bandes: BandePorcelets[];
    totalAnimaux: number;
  }>({ truies: [], verrats: [], bandes: [], totalAnimaux: 0 });
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const all = await listLoges();
      const found = all.find((l) => l.id === id) ?? null;
      setLoge(found);

      const c = await getLogeContents(id);
      setContents(c);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('loge_movements' as any) as any)
        .select(
          'id, subject_type, subject_id, from_loge_id, to_loge_id, date_mvt, reason',
        )
        .or(`from_loge_id.eq.${id},to_loge_id.eq.${id}`)
        .order('date_mvt', { ascending: false })
        .limit(50);
      if (!error && data) {
        setMovements(data as MovementRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleDeactivate = useCallback(() => {
    if (!loge) return;
    void presentAlert({
      header: 'Désactiver la loge ?',
      message: `${loge.numero} sera archivée (active=false). L'historique est préservé.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Désactiver',
          role: 'destructive',
          handler: () => {
            void (async () => {
              try {
                await deactivateLoge(loge.id);
                setToast('Loge désactivée');
                navigate('/troupeau?view=loges', { replace: true });
              } catch (err) {
                setToast(
                  err instanceof Error ? `Erreur : ${err.message}` : 'Erreur',
                );
              }
            })();
          },
        },
      ],
    });
  }, [loge, presentAlert, navigate]);

  const occupationLabel = useMemo(() => {
    if (!loge) return '—';
    const cap = loge.capaciteMax;
    return cap !== undefined
      ? `${contents.totalAnimaux}/${cap}`
      : `${contents.totalAnimaux}`;
  }, [loge, contents]);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-no-padding">
          <AgritechLayout>
            <div className="px-4 pt-5 pb-32" style={{ maxWidth: 1100, margin: '0 auto' }}>
              <p
                className="text-[12px] mt-8 text-center"
                style={{ color: 'var(--muted)' }}
              >
                Chargement…
              </p>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  if (!loge) {
    return (
      <IonPage>
        <IonContent className="ion-no-padding">
          <AgritechLayout>
            <div className="px-4 pt-5 pb-32" style={{ maxWidth: 1100, margin: '0 auto' }}>
              <EmptyState
                icon={<Home size={28} aria-hidden="true" />}
                title="Loge introuvable"
                description="Cette loge n'existe pas ou a été désactivée."
                action={
                  <Button variant="primary" onClick={() => navigate('/troupeau?view=loges', { replace: true })}>
                    <ChevronLeft size={14} aria-hidden="true" />
                    Retour aux loges
                  </Button>
                }
              />
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <TopBarSync
            crumbs={['Élevage', 'Loges', loge.numero]}
            onMariusClick={() => {
              const evt = new CustomEvent('open-chatbot');
              window.dispatchEvent(evt);
            }}
          />

          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-5"
            style={{ maxWidth: 1100, margin: '0 auto' }}
            data-testid="loge-detail-view"
          >
            {/* ── Hero ──────────────────────────────────────────────── */}
            <PageHeader
              eyebrow="ÉLEVAGE · LOGE"
              title={loge.numero}
              subtitle="Détail occupation et historique"
            />
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] uppercase tracking-wide text-text-2">
                  {LOGE_TYPE_LABELS[loge.type]}
                  {loge.batiment ? ` · Bâtiment ${loge.batiment}` : ''}
                </span>
                <span className="text-[12px] text-text-1 tabular-nums">
                  Capacité {loge.capaciteMax ?? '—'} · Occupation {occupationLabel}
                </span>
                {loge.notes ? (
                  <p className="mt-1 text-[12px] text-text-1">{loge.notes}</p>
                ) : null}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="small" onClick={() => navigate('/troupeau?view=loges')}>
                  <Pencil size={13} aria-hidden="true" />
                  Modifier
                </Button>
                <Button variant="danger" size="small" onClick={handleDeactivate} data-testid="deactivate-button">
                  <Archive size={13} aria-hidden="true" />
                  Désactiver
                </Button>
              </div>
            </div>

            {/* ── Occupation actuelle ──────────────────────────────── */}
            <section aria-label="Occupation actuelle">
              <Eyebrow dotColor="terre">
                Occupation · {contents.totalAnimaux} animaux
              </Eyebrow>
              {contents.truies.length === 0 &&
              contents.verrats.length === 0 &&
              contents.bandes.length === 0 ? (
                <div
                  className="card-dense p-4 mt-3 text-center"
                  data-testid="loge-empty-occupation"
                >
                  <Users
                    size={24}
                    aria-hidden="true"
                    className="mx-auto mb-2"
                    style={{ color: 'var(--muted)' }}
                  />
                  <p
                    className="text-[12px]"
                    style={{ color: 'var(--muted)' }}
                  >
                    Loge vide
                  </p>
                </div>
              ) : (
                <div
                  className="card-dense mt-3 overflow-hidden"
                  data-testid="loge-occupation-list"
                >
                  {contents.truies.map((t) => (
                    <AnimalListItem
                      key={`truie-${t.id}`}
                      primary={`${t.displayId}${t.nom ? ` · ${t.nom}` : ''}`}
                      secondary={`Truie · ${t.statut ?? '—'}`}
                      chip={{ label: 'TRUIE', tone: 'gold' }}
                      onClick={() => navigate(`/troupeau/truies/${t.displayId}`)}
                    />
                  ))}
                  {contents.verrats.map((v) => (
                    <AnimalListItem
                      key={`verrat-${v.id}`}
                      primary={`${v.displayId}${v.nom ? ` · ${v.nom}` : ''}`}
                      secondary={`Verrat · ${v.statut ?? '—'}`}
                      chip={{ label: 'VERRAT', tone: 'blue' }}
                      onClick={() => navigate(`/troupeau/verrats/${v.displayId}`)}
                    />
                  ))}
                  {contents.bandes.map((b) => (
                    <AnimalListItem
                      key={`bande-${b.id}`}
                      primary={b.idPortee ?? b.id}
                      secondary={`Bande · ${b.vivants ?? 0} porcelets`}
                      chip={{ label: 'BANDE', tone: 'teal' }}
                      onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Historique mouvements ────────────────────────────── */}
            <section aria-label="Historique des mouvements">
              <Eyebrow dotColor="muted">
                Mouvements · {movements.length}
              </Eyebrow>
              {movements.length === 0 ? (
                <div
                  className="card-dense p-4 mt-3 text-center"
                  data-testid="loge-empty-movements"
                >
                  <ArrowLeftRight
                    size={22}
                    aria-hidden="true"
                    className="mx-auto mb-2"
                    style={{ color: 'var(--muted)' }}
                  />
                  <p
                    className="text-[12px]"
                    style={{ color: 'var(--muted)' }}
                  >
                    Aucun mouvement enregistré
                  </p>
                </div>
              ) : (
                <ul
                  className="card-dense mt-3 overflow-hidden"
                  style={{ listStyle: 'none', margin: 0, padding: 0 }}
                  data-testid="loge-movements-list"
                >
                  {movements.map((m) => {
                    const isEntry = m.to_loge_id === id;
                    return (
                      <li
                        key={m.id}
                        className="px-4 py-3 border-b border-border last:border-b-0 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Chip
                              label={isEntry ? 'ENTRÉE' : 'SORTIE'}
                              tone={isEntry ? 'accent' : 'amber'}
                              size="xs"
                            />
                            <span
                              className="ft-code text-[12px]"
                              style={{ color: 'var(--text-1)' }}
                            >
                              {m.subject_type} · {m.subject_id.slice(0, 8)}
                            </span>
                          </div>
                          {m.reason ? (
                            <p
                              className="mt-1 text-[11px]"
                              style={{ color: 'var(--muted)' }}
                            >
                              {m.reason}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className="text-[11px] tabular-nums shrink-0"
                          style={{ color: 'var(--muted)' }}
                        >
                          {m.date_mvt}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </AgritechLayout>
      </IonContent>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={1800}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </IonPage>
  );
};

export default LogeDetailView;
