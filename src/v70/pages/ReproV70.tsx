/**
 * V70 — ReproV70 (page /reproduction, archétype Hub)
 *
 * V77 — Refonte uniforme namespace `.pt-screen` (header `.ph--primary`,
 * pills, sections `.section__label`, empty-state, cycles V77).
 *
 * Fix critique (F-28b) — tab "En cours" liste désormais TOUS les cycles
 * vivants : truies "Pleine" (gestation), "En maternité" (lactation), et
 * "En attente saillie" récemment saillies (attente écho). Avant, on
 * itérait uniquement sur les bandes (portées réalisées), ce qui ratait
 * les ~28 truies pleines et les saillies en attente d'écho.
 */
import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, BookOpen } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { safeDate } from '../../lib/truieHelpers';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { TabsMini } from '../components/ds/TabsMini';
import { CycleTimeline } from '../components/ds/CycleTimeline';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import { EduCard } from '../components/v70/EduCard';
import { EmptyEdu } from '../components/v70/EmptyEdu';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';
import type { Truie, Saillie, BandePorcelets } from '../../types/farm';

const GESTATION_JOURS = 115;
const SEVRAGE_JOURS_POST_MB = 28;
const ECHO_JOUR = 28;

const QuickSaillieForm = lazy(() => import('../../components/forms/QuickSaillieForm'));
const QuickMiseBasForm = lazy(() => import('../../components/forms/QuickMiseBasForm'));

type ReproTab = 'agenda' | 'en-cours' | 'a-venir' | 'historique';
type CyclePhase = 'attente-echo' | 'gestation' | 'maternite';

interface UpcomingItem {
  badge: string;
  badgeBg: string;
  title: string;
  meta: string;
  to: string;
}

interface Cycle {
  key: string;
  truieCode: string;
  truieId?: string;
  bandeId?: string;
  phase: CyclePhase;
  dayInPhase: number;
  daysRemaining: number;
  phaseTotal: number;
  currentDay: number;
}

const VALID_TABS: ReproTab[] = ['agenda', 'en-cours', 'a-venir', 'historique'];

const isReproTab = (v: string | null): v is ReproTab =>
  v !== null && (VALID_TABS as string[]).includes(v);

const isPleine = (t: Truie) => /pleine|gestante|gestation/i.test(t.statut ?? '');
const isMaternite = (t: Truie) => /maternit[eé]|allaitante|allaitement/i.test(t.statut ?? '');
const isAttenteSaillie = (t: Truie) => /attente saillie|vide|sevr[eé]e/i.test(t.statut ?? '');

const parseDateLoose = (raw?: string): Date | null => {
  if (!raw) return null;
  const safe = safeDate(raw);
  if (safe) return safe;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

export const ReproV70: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes, saillies } = useFarm();

  // V71.1 — KPIs live (étaient hardcodés 28/11/6/3)
  const kpis = useMemo(() => {
    const pleines = truies.filter(isPleine).length;
    const materni = truies.filter(isMaternite).length;
    const vides = truies.filter(isAttenteSaillie).length;
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const mbProches = bandes.filter(b => {
      if (!b.dateMB) return false;
      const d = parseDateLoose(b.dateMB);
      return d !== null && d >= now && d <= in7days;
    }).length;
    return { pleines, materni, vides, mbProches };
  }, [truies, bandes]);

  // V71.3 — bande "active" pour CycleTimeline (tab Agenda)
  const cycleBande = useMemo(() => {
    const now = new Date();
    let chosen: { bande: BandePorcelets; dateMB: Date; currentDay: number } | null = null;
    for (const b of bandes) {
      const d = parseDateLoose(b.dateMB);
      if (!d) continue;
      const dateSaillie = new Date(d.getTime() - GESTATION_JOURS * 86400000);
      const currentDay = Math.max(
        0,
        Math.min(GESTATION_JOURS, Math.floor((now.getTime() - dateSaillie.getTime()) / 86400000)),
      );
      if (!chosen) {
        chosen = { bande: b, dateMB: d, currentDay };
        continue;
      }
      const chosenInCycle = chosen.currentDay < GESTATION_JOURS;
      const candidateInCycle = currentDay < GESTATION_JOURS;
      if (candidateInCycle && !chosenInCycle) {
        chosen = { bande: b, dateMB: d, currentDay };
      } else if (candidateInCycle && chosenInCycle) {
        if (d.getTime() < chosen.dateMB.getTime()) {
          chosen = { bande: b, dateMB: d, currentDay };
        }
      }
    }
    return chosen;
  }, [bandes]);

  // V77 F-28b — TOUS les cycles vivants : ATTENTE ÉCHO + GESTATION + MATERNITÉ.
  // Avant : 3 cycles (uniquement bandes avec dateMB). Maintenant : tous les
  // animaux en reproduction active.
  //
  // Sources :
  //   - Saillies récentes (≤27j, écho non confirmée) → ATTENTE ÉCHO
  //   - Truies "Pleine" → GESTATION (date depuis dateMBPrevue - 115j si dispo,
  //     sinon dernière saillie connue, sinon ~mid-gestation par défaut)
  //   - Truies "En maternité" → MATERNITÉ (date depuis bande la plus récente
  //     liée à la truie ; sinon depuis aujourd'hui = J0 lactation)
  const cyclesEnCours = useMemo<Cycle[]>(() => {
    const now = new Date();
    const list: Cycle[] = [];
    const seen = new Set<string>(); // dédoublonnage par truieId

    // Index : dernière saillie connue par truieId (la plus récente)
    const lastSaillieByTruie = new Map<string, Saillie>();
    for (const s of saillies) {
      if (!s.truieId) continue;
      const dS = parseDateLoose(s.dateSaillie);
      if (!dS) continue;
      const prev = lastSaillieByTruie.get(s.truieId);
      if (!prev) {
        lastSaillieByTruie.set(s.truieId, s);
      } else {
        const dPrev = parseDateLoose(prev.dateSaillie);
        if (!dPrev || dS.getTime() > dPrev.getTime()) {
          lastSaillieByTruie.set(s.truieId, s);
        }
      }
    }

    // Index : bande la plus récente (par dateMB la plus récente) par truie
    const bandeByTruie = new Map<string, BandePorcelets>();
    for (const b of bandes) {
      if (!b.truie) continue;
      const d = parseDateLoose(b.dateMB);
      if (!d) continue;
      const prev = bandeByTruie.get(b.truie);
      if (!prev) {
        bandeByTruie.set(b.truie, b);
      } else {
        const dPrev = parseDateLoose(prev.dateMB);
        if (!dPrev || d.getTime() > dPrev.getTime()) {
          bandeByTruie.set(b.truie, b);
        }
      }
    }

    // 1) MATERNITÉ — truies "En maternité"
    for (const t of truies) {
      if (!isMaternite(t)) continue;
      const code = t.displayId || t.id;
      if (seen.has(t.id)) continue;
      const bande = bandeByTruie.get(t.displayId) || bandeByTruie.get(t.id);
      const dateMB = bande ? parseDateLoose(bande.dateMB) : null;
      const dayInPhase = dateMB
        ? Math.max(0, Math.min(SEVRAGE_JOURS_POST_MB, Math.floor((now.getTime() - dateMB.getTime()) / 86400000)))
        : 0;
      list.push({
        key: `mater-${t.id}`,
        truieCode: code,
        truieId: t.id,
        bandeId: bande?.id,
        phase: 'maternite',
        dayInPhase,
        daysRemaining: Math.max(0, SEVRAGE_JOURS_POST_MB - dayInPhase),
        phaseTotal: SEVRAGE_JOURS_POST_MB,
        currentDay: GESTATION_JOURS + dayInPhase,
      });
      seen.add(t.id);
    }

    // 2) GESTATION — truies "Pleine"
    for (const t of truies) {
      if (!isPleine(t)) continue;
      if (seen.has(t.id)) continue;
      const code = t.displayId || t.id;
      // Date saillie : priorité dernière saillie, fallback dateMBPrevue - 115j
      const lastSaillie = lastSaillieByTruie.get(t.id) || lastSaillieByTruie.get(t.displayId);
      let dateSaillie: Date | null = lastSaillie ? parseDateLoose(lastSaillie.dateSaillie) : null;
      if (!dateSaillie && t.dateMBPrevue) {
        const dMB = parseDateLoose(t.dateMBPrevue);
        if (dMB) dateSaillie = new Date(dMB.getTime() - GESTATION_JOURS * 86400000);
      }
      const currentDay = dateSaillie
        ? Math.max(ECHO_JOUR + 1, Math.min(GESTATION_JOURS - 1, Math.floor((now.getTime() - dateSaillie.getTime()) / 86400000)))
        : Math.floor(GESTATION_JOURS / 2);
      const dayInPhase = Math.max(0, currentDay - ECHO_JOUR);
      const phaseTotal = GESTATION_JOURS - ECHO_JOUR;
      list.push({
        key: `gest-${t.id}`,
        truieCode: code,
        truieId: t.id,
        phase: 'gestation',
        dayInPhase,
        daysRemaining: Math.max(0, phaseTotal - dayInPhase),
        phaseTotal,
        currentDay,
      });
      seen.add(t.id);
    }

    // 3) ATTENTE ÉCHO — saillies récentes (≤27j) sur truies non déjà rangées
    for (const s of saillies) {
      if (!s.truieId) continue;
      const dS = parseDateLoose(s.dateSaillie);
      if (!dS) continue;
      const days = Math.floor((now.getTime() - dS.getTime()) / 86400000);
      if (days < 0 || days >= ECHO_JOUR) continue;
      // Saillie échec / confirmée non pertinente : on garde uniquement les
      // saillies "fraîches" en attente d'écho (statut neutre ou EN_ATTENTE).
      if (s.statut && /echec|ech[eé]c|abandon/i.test(s.statut)) continue;
      const truie = truies.find(t => t.id === s.truieId || t.displayId === s.truieId);
      const key = truie?.id ?? s.truieId;
      if (seen.has(key)) continue;
      list.push({
        key: `echo-${key}`,
        truieCode: truie?.displayId || s.truieBoucle || s.truieId,
        truieId: key,
        phase: 'attente-echo',
        dayInPhase: days,
        daysRemaining: Math.max(0, ECHO_JOUR - days),
        phaseTotal: ECHO_JOUR,
        currentDay: days,
      });
      seen.add(key);
    }

    // Tri : attente-echo → gestation → maternite ; à phase égale, jours
    // restants croissants (urgence en haut).
    const phaseOrder: Record<CyclePhase, number> = {
      'attente-echo': 0,
      gestation: 1,
      maternite: 2,
    };
    list.sort((a, b) => {
      if (a.phase !== b.phase) return phaseOrder[a.phase] - phaseOrder[b.phase];
      return a.daysRemaining - b.daysRemaining;
    });
    return list;
  }, [truies, bandes, saillies]);

  const upcomingItems = useMemo((): UpcomingItem[] => {
    if (!bandes.length && !saillies.length) return [];
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const items: UpcomingItem[] = [];
    bandes.forEach(b => {
      if (!b.dateMB) return;
      const d = parseDateLoose(b.dateMB);
      if (!d || d < now || d > in7) return;
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
      const d = parseDateLoose(b.dateSevragePrevue!);
      if (!d || d < now || d > in7) return;
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
      const ds = parseDateLoose(s.dateSaillie);
      if (!ds) return;
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

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: ReproTab = isReproTab(searchParams.get('tab'))
    ? (searchParams.get('tab') as ReproTab)
    : 'agenda';
  const [tab, setTab] = useState<ReproTab>(initialTab);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (isReproTab(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    setTab(v as ReproTab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  const [saillieOpen, setSaillieOpen] = useState(false);
  const [miseBasOpen, setMiseBasOpen] = useState(false);

  // Chips filtres "En cours" : aligné sur les 3 phases vivantes (V77 F-28b)
  type ChipFilter = 'all' | 'attente-echo' | 'gestation' | 'maternite';
  const [chipFilter, setChipFilter] = useState<ChipFilter>('all');

  const chipCounts = useMemo(() => {
    const counts = { 'attente-echo': 0, gestation: 0, maternite: 0 };
    for (const c of cyclesEnCours) {
      counts[c.phase]++;
    }
    return counts;
  }, [cyclesEnCours]);

  const cyclesFiltered = useMemo(() => {
    if (chipFilter === 'all') return cyclesEnCours;
    return cyclesEnCours.filter(c => c.phase === chipFilter);
  }, [cyclesEnCours, chipFilter]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action?: string }>).detail;
      if (detail?.action === 'add_saillie') {
        setSaillieOpen(true);
      } else if (detail?.action === 'add_birth') {
        setMiseBasOpen(true);
      }
    };
    window.addEventListener('pt-fab-action', handler);
    return () => window.removeEventListener('pt-fab-action', handler);
  }, []);

  const totalActifs = cyclesEnCours.length;
  const subtitleParts = [
    `${kpis.pleines} pleines`,
    `${kpis.materni} en maternité`,
    `${chipCounts['attente-echo']} en attente écho`,
  ];

  return (
    <div className="pt-screen phone-content" style={{ paddingBottom: 168, maxWidth: 600, margin: '0 auto' }}>
      <MariusGreeting pageContext="reproduction" />

      <header className="ph ph--primary">
        <div className="eyebrow">GTTT · Cycle vivant</div>
        <h1>Reproduction</h1>
        <p className="sub">{subtitleParts.join(' · ')} — {totalActifs} cycle{totalActifs > 1 ? 's' : ''} actif{totalActifs > 1 ? 's' : ''}.</p>
      </header>

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
            Le cycle de gestation d'une truie dure <strong>115 jours</strong>. L'échographie à <strong>J28</strong> permet de confirmer la gestation et planifier la mise-bas.
          </EduCard>

          {cycleBande ? (
            <section className="section">
              <div className="section__label">Cycle {cycleBande.bande.idPortee || cycleBande.bande.id}</div>
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
            </section>
          ) : (
            <section className="section">
              <div className="section__label">Cycle reproduction</div>
              <Card>
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucune bande en cycle. Crée une saillie pour démarrer un cycle.
                </div>
              </Card>
            </section>
          )}

          <section className="section">
            <div className="section__label">7 prochains jours</div>
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
          </section>
        </>
      )}

      {tab === 'en-cours' && (
        <>
          <div className="pills" role="tablist" aria-label="Filtre par phase de cycle">
            <button
              type="button"
              className={`pill${chipFilter === 'all' ? ' is-active' : ''}`}
              aria-pressed={chipFilter === 'all'}
              onClick={() => setChipFilter('all')}
            >
              Toutes ({cyclesEnCours.length})
            </button>
            <button
              type="button"
              className={`pill${chipFilter === 'attente-echo' ? ' is-active' : ''}`}
              aria-pressed={chipFilter === 'attente-echo'}
              onClick={() => setChipFilter('attente-echo')}
            >
              Attente écho ({chipCounts['attente-echo']})
            </button>
            <button
              type="button"
              className={`pill${chipFilter === 'gestation' ? ' is-active' : ''}`}
              aria-pressed={chipFilter === 'gestation'}
              onClick={() => setChipFilter('gestation')}
            >
              Gestation ({chipCounts.gestation})
            </button>
            <button
              type="button"
              className={`pill${chipFilter === 'maternite' ? ' is-active' : ''}`}
              aria-pressed={chipFilter === 'maternite'}
              onClick={() => setChipFilter('maternite')}
            >
              Maternité ({chipCounts.maternite})
            </button>
          </div>

          <section className="section">
            <div className="section__label">
              {cyclesFiltered.length} cycle{cyclesFiltered.length > 1 ? 's' : ''} {chipFilter === 'all' ? 'actif' + (cyclesFiltered.length > 1 ? 's' : '') : ''}
            </div>
            {cyclesEnCours.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">Aucun cycle en cours</div>
                <div className="empty-state__sub">
                  Aucune truie pleine, en maternité ou en attente d'écho. Crée une saillie pour démarrer un cycle.
                </div>
              </div>
            ) : cyclesFiltered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__sub">Aucun cycle dans cette phase.</div>
              </div>
            ) : (
              cyclesFiltered.map(c => {
                const phaseLabel =
                  c.phase === 'attente-echo' ? 'Attente écho' :
                  c.phase === 'gestation' ? 'Gestation' :
                  'Maternité';
                const progressPercent = Math.max(4, Math.min(100, (c.dayInPhase / Math.max(1, c.phaseTotal)) * 100));
                const dayLabel =
                  c.phase === 'attente-echo'
                    ? `J${c.dayInPhase}/${ECHO_JOUR}`
                    : c.phase === 'gestation'
                      ? `J${c.currentDay}/${GESTATION_JOURS}`
                      : `J+${c.dayInPhase} lactation`;
                const remainingLabel =
                  c.daysRemaining === 0
                    ? 'Aujourd\'hui'
                    : `${c.daysRemaining}j restants`;
                const shortCode = (c.truieCode || c.truieId || '').slice(-5);
                const targetRoute = c.bandeId
                  ? `/troupeau/bandes/${c.bandeId}`
                  : c.truieId
                    ? `/troupeau/truies/${c.truieId}`
                    : '/troupeau';

                return (
                  <a
                    key={c.key}
                    className="cycle-card"
                    href={`#cycle-${c.key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(targetRoute);
                    }}
                    aria-label={`Cycle ${c.truieCode} — ${phaseLabel} — voir détail`}
                    style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <EntityAvatar species="truie" size="md" shortCode={shortCode} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="cycle-card__phase">{c.truieCode} · {phaseLabel}</div>
                        <div className="cycle-card__days">{dayLabel}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--ff-mono, monospace)', fontSize: 11, color: 'var(--pt-muted)', textAlign: 'right' }}>
                        {remainingLabel}
                      </div>
                    </div>
                    <div className="cycle-card__progress">
                      <span style={{ width: `${progressPercent}%` }} />
                    </div>
                  </a>
                );
              })
            )}
          </section>

          {/* FAB primary "+ SAILLIE" stylé V77.
              Note : le FAB global (App.tsx > SaisirFABMount > usePageFab) rend
              déjà un bouton sur /reproduction qui dispatche 'add_saillie'. On
              ne double pas l'élément. Cf. design-system/hooks/usePageFab.ts:56. */}
        </>
      )}

      {tab === 'a-venir' && (
        <section className="section">
          <div className="section__label">Événements à venir (7 jours)</div>
          <Card>
            {upcomingItems.length === 0 ? (
              <div className="empty-state" style={{ padding: 12 }}>
                <div className="empty-state__sub">Aucun événement dans les 7 prochains jours</div>
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
        </section>
      )}

      {tab === 'historique' && (
        <section className="section">
          <div className="section__label">Bandes passées</div>
          <div className="empty-state">
            <div className="empty-state__icon">
              <Archive size={28} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="empty-state__title">Historique des bandes</div>
            <div className="empty-state__sub">
              Voir toutes les bandes (actives et passées) sur l'onglet Élevage › Bandes.
            </div>
            <button
              type="button"
              onClick={() => navigate('/troupeau?view=bandes')}
              className="pill is-active"
              style={{ cursor: 'pointer' }}
            >
              Ouvrir Élevage › Bandes
            </button>
          </div>
        </section>
      )}

      <Section label="">
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
      </Section>

      <Suspense fallback={null}>
        <QuickSaillieForm isOpen={saillieOpen} onClose={() => setSaillieOpen(false)} />
        <QuickMiseBasForm isOpen={miseBasOpen} onClose={() => setMiseBasOpen(false)} />
      </Suspense>
    </div>
  );
};
