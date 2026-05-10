/**
 * V70 — ReproV70 (page /reproduction, archétype Hub)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html lignes 1178-1293
 *
 * Phase 3C : page Hub Reproduction — TabsMini 4 sub-tabs (Agenda/En cours/
 * À venir/Historique), KPIs Repro, EduCard 115j gestation, CycleTimeline V2
 * (V45 ré-export) avec 4 étapes Saillie→Écho→Gestation→MB, agenda 7 jours,
 * empty state éducatif vers encyclopédie. FAB ajout saillie.
 *
 * Décision : CycleTimeline API V45 ({label, day, done?, target?}), pas la
 * forme {label, date, status} du brief — adapté au composant existant.
 */
import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, BookOpen } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { safeDate } from '../../lib/truieHelpers';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { TabsMini } from '../components/ds/TabsMini';
import { CycleTimeline } from '../components/ds/CycleTimeline';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import { EduCard } from '../components/v70/EduCard';
import { EmptyEdu } from '../components/v70/EmptyEdu';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';
import { formatBandeName } from '../lib';

const GESTATION_JOURS = 115;

const QuickSaillieForm = lazy(() => import('../../components/forms/QuickSaillieForm'));
const QuickMiseBasForm = lazy(() => import('../../components/forms/QuickMiseBasForm'));

type ReproTab = 'agenda' | 'en-cours' | 'a-venir' | 'historique';

interface UpcomingItem {
  badge: string;
  badgeBg: string;
  title: string;
  meta: string;
  to: string;
}


const VALID_TABS: ReproTab[] = ['agenda', 'en-cours', 'a-venir', 'historique'];


const isReproTab = (v: string | null): v is ReproTab =>
  v !== null && (VALID_TABS as string[]).includes(v);

export const ReproV70: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes, saillies } = useFarm();

  // V71.1 — KPIs live (étaient hardcodés 28/11/6/3)
  const kpis = useMemo(() => {
    const pleines = truies.filter(t => /pleine|gestante|gestation/i.test(t.statut ?? '')).length;
    const materni = truies.filter(t => /maternit[eé]|allaitante|allaitement/i.test(t.statut ?? '')).length;
    const vides = truies.filter(t => /attente saillie|vide|sevr[eé]e/i.test(t.statut ?? '')).length;
    // MB prévues dans les 7 prochains jours : bandes avec dateMB dans la fenêtre
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const mbProches = bandes.filter(b => {
      if (!b.dateMB) return false;
      const d = new Date(b.dateMB);
      return !isNaN(d.getTime()) && d >= now && d <= in7days;
    }).length;
    return { pleines, materni, vides, mbProches };
  }, [truies, bandes]);

  // V71.3 — bande "active" pour CycleTimeline (tab Agenda) : on choisit la
  // bande dont la date MB (réalisée ou prévue) est la plus proche dans le
  // futur. Sinon la plus récente passée. Calcul du jour de cycle = today -
  // (dateMB - 115j).
  const cycleBande = useMemo(() => {
    const now = new Date();
    let chosen: { bande: typeof bandes[number]; dateMB: Date; currentDay: number } | null = null;
    for (const b of bandes) {
      const d = safeDate(b.dateMB);
      if (!d) continue;
      const dateSaillie = new Date(d.getTime() - GESTATION_JOURS * 86400000);
      const currentDay = Math.max(
        0,
        Math.min(GESTATION_JOURS, Math.floor((now.getTime() - dateSaillie.getTime()) / 86400000)),
      );
      // Préférer une bande pour laquelle on est encore en gestation (current < 115)
      if (!chosen) {
        chosen = { bande: b, dateMB: d, currentDay };
        continue;
      }
      const chosenInCycle = chosen.currentDay < GESTATION_JOURS;
      const candidateInCycle = currentDay < GESTATION_JOURS;
      if (candidateInCycle && !chosenInCycle) {
        chosen = { bande: b, dateMB: d, currentDay };
      } else if (candidateInCycle && chosenInCycle) {
        // Garder celle dont la MB est la plus proche
        if (d.getTime() < chosen.dateMB.getTime()) {
          chosen = { bande: b, dateMB: d, currentDay };
        }
      }
    }
    return chosen;
  }, [bandes]);

  // V75-o B.1 (F-28) — TOUS les cycles actifs pour tab "En cours" : bandes en
  // gestation (today < dateMB) OU en maternité (dateMB ≤ today < dateMB+28j).
  // Avant : tab "En cours" affichait 1 seul cycle (cycleBande), ne reflétait
  // pas les 11 truies en MATERNITÉ visibles dans Élevage.
  const SEVRAGE_JOURS_POST_MB = 28;
  const cyclesEnCours = useMemo(() => {
    const now = new Date();
    type Cycle = {
      bande: typeof bandes[number];
      dateMB: Date;
      currentDay: number;
      phase: 'gestation' | 'maternite';
    };
    const list: Cycle[] = [];
    for (const b of bandes) {
      const d = safeDate(b.dateMB);
      if (!d) continue;
      const dateSaillie = new Date(d.getTime() - GESTATION_JOURS * 86400000);
      const dateSevrage = new Date(d.getTime() + SEVRAGE_JOURS_POST_MB * 86400000);
      // Filtre : exclure les bandes dont la maternité est terminée (sevrées).
      if (now > dateSevrage) continue;
      const currentDay = Math.max(
        0,
        Math.floor((now.getTime() - dateSaillie.getTime()) / 86400000),
      );
      const phase: 'gestation' | 'maternite' = now < d ? 'gestation' : 'maternite';
      list.push({ bande: b, dateMB: d, currentDay, phase });
    }
    // Tri : gestation d'abord (par MB la plus proche), puis maternité.
    list.sort((a, b) => {
      if (a.phase !== b.phase) return a.phase === 'gestation' ? -1 : 1;
      return a.dateMB.getTime() - b.dateMB.getTime();
    });
    return list;
  }, [bandes]);

  const upcomingItems = useMemo((): UpcomingItem[] => {
    if (!bandes.length && !saillies.length) return [];
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const items: UpcomingItem[] = [];
    bandes.forEach(b => {
      if (!b.dateMB) return;
      const d = new Date(b.dateMB);
      if (isNaN(d.getTime()) || d < now || d > in7) return;
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      items.push({
        badge: diffDays <= 0 ? 'AUJ' : diffDays === 1 ? 'DEM' : `+${diffDays}J`,
        badgeBg: 'var(--pt-accent)',
        title: `Mise-bas${b.truie ? ` ${b.truie}` : ''}`,
        meta: `${b.idPortee || b.id} · J115`,
        to: b.truie ? `/troupeau/truies/${b.truie}` : `/troupeau/bandes/${b.id}`,
      });
    });
    bandes.filter(b => b.statut === 'Sous mère' && b.dateSevragePrevue).forEach(b => {
      const d = new Date(b.dateSevragePrevue!);
      if (isNaN(d.getTime()) || d < now || d > in7) return;
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      items.push({
        badge: `+${Math.max(0, diffDays)}J`,
        badgeBg: 'var(--pt-primary)',
        title: `Sevrage ${b.idPortee || b.id}`,
        meta: `${b.vivants ?? '?'} porcelets · J+28`,
        to: '/reproduction?phase=maternite',
      });
    });
    saillies.slice(0, 5).forEach(s => {
      if (!s.dateSaillie) return;
      const ds = new Date(s.dateSaillie);
      if (isNaN(ds.getTime())) return;
      const echoDate = new Date(ds.getTime() + 28 * 86400000);
      if (echoDate < now || echoDate > in7) return;
      const diffDays = Math.ceil((echoDate.getTime() - now.getTime()) / 86400000);
      items.push({
        badge: `+${Math.max(0, diffDays)}J`,
        badgeBg: 'var(--pt-info)',
        title: 'Échographie planifiée',
        meta: 'Vérification gestation J+28',
        to: '/reproduction?phase=saillie',
      });
    });
    return items.slice(0, 4);
  }, [bandes, saillies]);

  // V71 FIX #4 — initial tab depuis URL (?tab=...) pour deep-links legacy
  // (/cycles/maternite → /reproduction?tab=en-cours&phase=maternite, etc.).
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: ReproTab = isReproTab(searchParams.get('tab'))
    ? (searchParams.get('tab') as ReproTab)
    : 'agenda';
  const [tab, setTab] = useState<ReproTab>(initialTab);

  // Sync state ← URL : nécessaire pour deep-links directs (QR code, copier-coller)
  // et navigation programmatique (Navigate replace, history.pushState).
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (isReproTab(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    setTab(v as ReproTab);
    // Synchronise l'URL pour permettre partage / bookmark.
    const next = new URLSearchParams(searchParams);
    next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  const [saillieOpen, setSaillieOpen] = useState(false);
  const [miseBasOpen, setMiseBasOpen] = useState(false);

  // V76 — filtre chips horizontaux pour le tab "En cours" (mockup v76)
  type ChipFilter = 'all' | 'saillie' | 'gestation' | 'maternite' | 'postsev';
  const [chipFilter, setChipFilter] = useState<ChipFilter>('all');

  // Phase métier dérivée pour filtrage chips (saillie / gestation / maternite / postsev).
  // Saillie : J0..J27 (avant écho). Gestation : J28..J114. Maternité : J115..J142.
  // Post-sevrage : J143+ (cyclesEnCours coupe déjà à dateMB+28j, donc rare ici).
  const phaseOf = (currentDay: number): ChipFilter => {
    if (currentDay < 28) return 'saillie';
    if (currentDay < GESTATION_JOURS) return 'gestation';
    if (currentDay < GESTATION_JOURS + SEVRAGE_JOURS_POST_MB) return 'maternite';
    return 'postsev';
  };

  const chipCounts = useMemo(() => {
    const counts = { saillie: 0, gestation: 0, maternite: 0, postsev: 0 };
    for (const c of cyclesEnCours) {
      counts[phaseOf(c.currentDay)]++;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cyclesEnCours]);

  const cyclesFiltered = useMemo(() => {
    if (chipFilter === 'all') return cyclesEnCours;
    return cyclesEnCours.filter(c => phaseOf(c.currentDay) === chipFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cyclesEnCours, chipFilter]);

  // V75-u — Brancher le FAB extended contextuel MISE-BAS dispatché par
  // App.tsx > SaisirFABMount (CustomEvent 'pt-fab-action' avec
  // detail.action === 'add_birth'). Sans ce listener, le bouton MISE-BAS
  // était silencieusement no-op.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action?: string }>).detail;
      if (detail?.action === 'add_birth') {
        setMiseBasOpen(true);
      }
    };
    window.addEventListener('pt-fab-action', handler);
    return () => window.removeEventListener('pt-fab-action', handler);
  }, []);

  return (
    <div className="phone-content" style={{ padding: '24px 24px 168px', maxWidth: 600, margin: '0 auto' }}>
      <MariusGreeting pageContext="reproduction" />

      <PageHeader
        eyebrow="Cycle vivant"
        title="Reproduction"
        subtitle="Saillie → écho J28 → mise-bas J115 → sevrage J143."
      />

      <TabsMini
        value={tab}
        onChange={handleTabChange}
        options={[
          { value: 'agenda', label: 'Agenda' },
          { value: 'en-cours', label: 'En cours' },
          { value: 'a-venir', label: 'À venir' },
          { value: 'historique', label: 'Historique' },
        ]}
      />

      <div className="kpis-strip">
        <div className="kpi">
          <div className="kpi__label">Pleines</div>
          <div className="kpi__val num">{kpis.pleines}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Maternité</div>
          <div className="kpi__val num">{kpis.materni}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Vides</div>
          <div className="kpi__val num">{kpis.vides}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">MB 7j</div>
          <div className="kpi__val num">{kpis.mbProches}</div>
        </div>
      </div>

      {tab === 'agenda' && (
        <>
          <EduCard label="Le saviez-vous ?">
            Le cycle de gestation d’une truie dure <strong>115 jours</strong>. L’échographie à <strong>J28</strong> permet de confirmer la gestation et planifier la mise-bas.
          </EduCard>

          {cycleBande ? (
            <Section label={`Cycle ${cycleBande.bande.idPortee || cycleBande.bande.id}`}>
              <Card>
                <CycleTimeline
                  currentDay={cycleBande.currentDay}
                  totalDays={GESTATION_JOURS}
                  steps={[
                    { label: 'Saillie', day: 0, done: cycleBande.currentDay >= 0 },
                    { label: 'Écho', day: 28, done: cycleBande.currentDay >= 28 },
                    { label: 'Mise-bas', day: GESTATION_JOURS, done: cycleBande.currentDay >= GESTATION_JOURS, target: true },
                  ]}
                />
              </Card>
            </Section>
          ) : (
            <Section label="Cycle reproduction">
              <Card>
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucune bande en cycle. Crée une saillie pour démarrer un cycle.
                </div>
              </Card>
            </Section>
          )}

          <Section label="7 prochains jours">
            <Card>
              {upcomingItems.length === 0 ? (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucun événement dans les 7 prochains jours
                </div>
              ) : upcomingItems.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="alert-row"
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  aria-label={`${item.title} — voir détail`}
                >
                  <div style={{ background: item.badgeBg, color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
                    {item.badge}
                  </div>
                  <div className="alert-info" style={{ flex: 1 }}>
                    <div className="alert-title">{item.title}</div>
                    <div className="alert-meta">{item.meta}</div>
                  </div>
                  <span className="list-arrow">›</span>
                </button>
              ))}
            </Card>
          </Section>
        </>
      )}

      {tab === 'en-cours' && (
        <>
          <div className="chips" role="tablist" aria-label="Filtre par phase de cycle">
            <button
              type="button"
              className="chip"
              aria-pressed={chipFilter === 'all'}
              onClick={() => setChipFilter('all')}
            >
              Toutes <span className="num">{cyclesEnCours.length}</span>
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={chipFilter === 'saillie'}
              onClick={() => setChipFilter('saillie')}
            >
              Saillie {chipCounts.saillie > 0 && <span className="num">{chipCounts.saillie}</span>}
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={chipFilter === 'gestation'}
              onClick={() => setChipFilter('gestation')}
            >
              Gestation {chipCounts.gestation > 0 && <span className="num">{chipCounts.gestation}</span>}
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={chipFilter === 'maternite'}
              onClick={() => setChipFilter('maternite')}
            >
              Maternité {chipCounts.maternite > 0 && <span className="num">{chipCounts.maternite}</span>}
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={chipFilter === 'postsev'}
              onClick={() => setChipFilter('postsev')}
            >
              Post-sev. {chipCounts.postsev > 0 && <span className="num">{chipCounts.postsev}</span>}
            </button>
          </div>

          <Section label={`${cyclesFiltered.length} cycle${cyclesFiltered.length > 1 ? 's' : ''} actif${cyclesFiltered.length > 1 ? 's' : ''}`}>
            {cyclesEnCours.length === 0 ? (
              <Card>
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucune bande en cycle. Crée une saillie pour démarrer un cycle.
                </div>
              </Card>
            ) : cyclesFiltered.length === 0 ? (
              <Card>
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucun cycle dans cette phase.
                </div>
              </Card>
            ) : (
              cyclesFiltered.map(c => {
                const phase = phaseOf(c.currentDay);
                const inGestation = c.phase === 'gestation';
                const dayCapped = Math.min(c.currentDay, GESTATION_JOURS);
                // Progress sur le rail (0 → 100%) :
                // - Saillie/Gestation : 0..60% sur 0..115j
                // - Maternité (J115..J143) : 60..100% sur 28j
                let progressPercent: number;
                if (inGestation) {
                  progressPercent = Math.max(6, Math.min(60, (dayCapped / GESTATION_JOURS) * 60));
                } else {
                  const daysLactation = Math.min(SEVRAGE_JOURS_POST_MB, c.currentDay - GESTATION_JOURS);
                  progressPercent = 60 + (daysLactation / SEVRAGE_JOURS_POST_MB) * 40;
                }
                const phaseLabel =
                  phase === 'saillie' ? 'Saillie' :
                  phase === 'gestation' ? 'Gestation' :
                  phase === 'maternite' ? 'Maternité' :
                  'Post-sev.';
                const pillVariant: 'soft' | 'info' | 'warm' | 'success' =
                  phase === 'saillie' ? 'soft' :
                  phase === 'gestation' ? 'info' :
                  phase === 'maternite' ? 'warm' :
                  'success';
                const dayLabel = inGestation
                  ? `J${dayCapped}/${GESTATION_JOURS}`
                  : `J+${c.currentDay - GESTATION_JOURS} lactation`;
                const statutLabel = c.bande.truie ? `${c.bande.truie}` : 'Bande';
                const titleText = formatBandeName({
                  id: c.bande.id,
                  idPortee: c.bande.idPortee,
                  truieMere: c.bande.truie,
                  dateMB: c.bande.dateMB,
                }, { compact: true });

                // Étapes : Saillie / É28 / FŒT (J60) / MB (J115) / SEV (J143)
                const isCurStep = (stepDay: number, nextDay: number) =>
                  c.currentDay >= stepDay && c.currentDay < nextDay;
                const curS = isCurStep(0, 28) ? 'cur' : '';
                const curE = isCurStep(28, 60) ? 'cur' : '';
                const curF = isCurStep(60, GESTATION_JOURS) ? 'cur' : '';
                const curMB = isCurStep(GESTATION_JOURS, GESTATION_JOURS + SEVRAGE_JOURS_POST_MB) ? 'cur' : '';
                const curSev = c.currentDay >= GESTATION_JOURS + SEVRAGE_JOURS_POST_MB ? 'cur' : '';

                // Dots done si l'étape est dépassée. now sur l'étape courante.
                const dotS = c.currentDay >= 0 ? 'done' : '';
                const dotE = c.currentDay >= 28 ? 'done' : (curS ? 'now' : '');
                const dotF = c.currentDay >= 60 ? 'done' : (curE ? 'now' : '');
                const dotMB = c.currentDay >= GESTATION_JOURS ? 'done' : (curF ? 'now' : '');
                const dotSev = curSev ? 'done' : (curMB ? 'now' : '');

                const shortBande = (c.bande.idPortee || c.bande.id).slice(-5);

                return (
                  <a
                    key={c.bande.id}
                    className="cycle-card"
                    href={`#bande-${c.bande.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/troupeau/bandes/${c.bande.id}`);
                    }}
                    aria-label={`Cycle ${titleText} — voir détail`}
                  >
                    <div className="cycle-card__head">
                      <EntityAvatar species="bande" size="md" shortCode={shortBande} />
                      <div className="cycle-card__main">
                        <div className="cycle-card__title">{titleText}</div>
                        <div className="cycle-card__sub">{statutLabel} · {dayLabel}</div>
                      </div>
                      <span className={`pill pill-${pillVariant}`}>{phaseLabel}</span>
                    </div>
                    <div className="cycle-mini">
                      <div className="cycle-mini__line"></div>
                      <div className="cycle-mini__line-done" style={{ width: `${progressPercent}%` }}></div>
                      <div className={`cycle-mini__dot ${dotS}`} style={{ left: '6px' }}></div>
                      <div className={`cycle-mini__dot ${dotE}`} style={{ left: '25%' }}></div>
                      <div className={`cycle-mini__dot ${dotF}`} style={{ left: '50%' }}></div>
                      <div className={`cycle-mini__dot ${dotMB}`} style={{ left: '75%' }}></div>
                      <div className={`cycle-mini__dot ${dotSev}`} style={{ left: 'calc(100% - 6px)', transform: 'translateX(-100%)' }}></div>
                    </div>
                    <div className="cycle-mini__labels">
                      <span className={curS}>S</span>
                      <span className={curE}>É28</span>
                      <span className={curF}>FŒT</span>
                      <span className={curMB}>MB</span>
                      <span className={curSev}>SEV</span>
                    </div>
                  </a>
                );
              })
            )}
          </Section>
        </>
      )}

      {tab === 'a-venir' && (
        <Section label="Événements à venir (7 jours)">
          <Card>
            {upcomingItems.length === 0 ? (
              <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                Aucun événement dans les 7 prochains jours
              </div>
            ) : upcomingItems.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => navigate(item.to)}
                className="alert-row"
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                aria-label={`${item.title} — voir détail`}
              >
                <div style={{ background: item.badgeBg, color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
                  {item.badge}
                </div>
                <div className="alert-info" style={{ flex: 1 }}>
                  <div className="alert-title">{item.title}</div>
                  <div className="alert-meta">{item.meta}</div>
                </div>
                <span className="list-arrow">›</span>
              </button>
            ))}
          </Card>
        </Section>
      )}

      {tab === 'historique' && (
        <Section label="Bandes passées">
          <Card>
            <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Archive size={14} strokeWidth={1.5} aria-hidden="true" />
                Historique des bandes terminées
              </span>
              <div style={{ marginTop: 8, fontSize: 11 }}>
                Voir toutes les bandes (actives + historique) sur l’onglet{' '}
                <button
                  type="button"
                  onClick={() => navigate('/troupeau?view=bandes')}
                  style={{ marginLeft: 4, background: 'none', border: 'none', color: 'var(--pt-primary)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Élevage › Bandes
                </button>
              </div>
            </div>
          </Card>
        </Section>
      )}

      <EmptyEdu
        icon={
          <BookOpen
            size={20}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{ color: 'var(--pt-muted)' }}
          />
        }
        title="Comprendre les cycles"
        description="Cycle de vie, ISSE, biosécurité. À lire entre deux tournées."
        ctaLabel="Encyclopédie"
        onCtaClick={() => navigate('/reglages/encyclopedie')}
      />

      <button
        type="button"
        className="fab"
        aria-label="Ajouter saillie"
        onClick={() => setSaillieOpen(true)}
        style={{
          background: 'var(--pt-primary)',
          border: 'none',
          color: 'white',
          fontSize: 28,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        +
      </button>

      <Suspense fallback={null}>
        <QuickSaillieForm isOpen={saillieOpen} onClose={() => setSaillieOpen(false)} />
        <QuickMiseBasForm isOpen={miseBasOpen} onClose={() => setMiseBasOpen(false)} />
      </Suspense>
    </div>
  );
};
