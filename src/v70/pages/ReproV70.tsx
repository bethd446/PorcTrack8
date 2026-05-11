/**
 * V70 — ReproV70 (page /reproduction, archétype Hub)
 *
 * V78 — Refonte selon mockup `docs/mockups/ressources-reproduction-mockup-v76.html`
 *   section B (Reproduction).
 *   - Header `ph ph--primary` avec eyebrow / h1 / sub
 *   - 4 tabs (Agenda / En cours / À venir / Historique) via TabsMini
 *   - Pattern `cycle-card` + `cycle-mini` (5 dots Saillie/Écho/Fœtal/MB/Sevr)
 *   - Empty states uniformes
 *   - FAB Saillie/mise-bas via listener `pt-fab-action`
 *
 * V78 (B2 hotfix robuste) — dédoublonnage cycles "En cours" :
 *   La clé de dédoublonnage utilise désormais l'index dans le tableau truies
 *   en plus de id+displayId+boucle (avec préfixes typés). Cela garantit
 *   l'unicité même quand plusieurs truies ont les mêmes (ou pas de)
 *   identifiants côté Sheets — chaque truie reçoit une clé unique par sa
 *   position dans le tableau.
 *   Avant V78 : 40 cycles affichés vs 45 attendus (5 collisions silencieuses
 *   sur boucles dupliquées / id vides).
 *
 * V77 F-28b préservé — tab "En cours" liste TOUS les cycles vivants :
 *   ATTENTE ÉCHO + GESTATION + MATERNITÉ (les 3 phases).
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
const CYCLE_TOTAL_JOURS = GESTATION_JOURS + SEVRAGE_JOURS_POST_MB; // 143j (rail saillie→sevrage)

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
  bandeCode?: string;
  phase: CyclePhase;
  dayInPhase: number;
  daysRemaining: number;
  phaseTotal: number;
  currentDay: number;
  /** Position 0..1 sur le rail Saillie→Sevrage (143j). */
  railPos: number;
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

/**
 * V78 B2 hotfix — clé de dédoublonnage robuste.
 *
 * L'index dans le tableau `truies` est inclus en tête de clé : il est par
 * construction unique pour chaque position. Les champs id/displayId/boucle
 * sont préfixés explicitement pour empêcher la collision cross-champ
 * ({id:"X"} vs {boucle:"X"} produisaient la même clé sans préfixe).
 *
 * Exportée pour les tests.
 */
export const buildDedupKey = (t: Truie | undefined, idx: number): string => {
  const id = t?.id ?? '';
  const dId = t?.displayId ?? '';
  const b = t?.boucle ?? '';
  return `t#${idx}|id=${id}|d=${dId}|b=${b}`;
};

const phaseLabelText = (p: CyclePhase): string =>
  p === 'attente-echo' ? 'Saillie' : p === 'gestation' ? 'Gestation' : 'Maternité';

const phasePillClass = (p: CyclePhase): string =>
  p === 'attente-echo' ? 'pill-info' : p === 'gestation' ? 'pill-success' : 'pill-warm';

type MiniRailLabel = 'S' | 'É28' | 'FŒT' | 'MB' | 'SEV';

/**
 * Rail mini-cycle 5 dots (Saillie · Écho28 · Fœtal · MB · Sevrage).
 * `railPos` = position 0..1 sur 143j (saillie→sevrage).
 */
const CycleMiniRail: React.FC<{ railPos: number; currentLabel: MiniRailLabel }> = ({
  railPos,
  currentLabel,
}) => {
  const pct = Math.max(0, Math.min(1, railPos)) * 100;
  const nodes: Array<{ x: number; label: MiniRailLabel }> = [
    { x: 0, label: 'S' },
    { x: 25, label: 'É28' },
    { x: 50, label: 'FŒT' },
    { x: 75, label: 'MB' },
    { x: 100, label: 'SEV' },
  ];
  return (
    <>
      <div className="cycle-mini">
        <div className="cycle-mini__line" />
        <div className="cycle-mini__line-done" style={{ width: `${pct}%` }} />
        {nodes.map(n => {
          const isCurrent = n.label === currentLabel;
          const isDone = !isCurrent && n.x < pct - 0.5;
          const leftStyle: React.CSSProperties =
            n.x === 0
              ? { left: 6 }
              : n.x === 100
                ? { left: 'calc(100% - 6px)', transform: 'translateX(-100%)' }
                : { left: `${n.x}%` };
          const cls = `cycle-mini__dot${isCurrent ? ' now' : isDone ? ' done' : ''}`;
          return <div key={n.label} className={cls} style={leftStyle} />;
        })}
      </div>
      <div className="cycle-mini__labels">
        {nodes.map(n => (
          <span key={n.label} className={n.label === currentLabel ? 'cur' : undefined}>
            {n.label}
          </span>
        ))}
      </div>
    </>
  );
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

  // V78 F-28b/B2 — TOUS les cycles vivants : ATTENTE ÉCHO + GESTATION + MATERNITÉ,
  // dédoublonnés par buildDedupKey (idx-based, zéro collision).
  const cyclesEnCours = useMemo<Cycle[]>(() => {
    const now = new Date();
    const list: Cycle[] = [];
    const seen = new Set<string>();

    // Index : dernière saillie connue par truieId
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

    // Index : bande la plus récente (par dateMB) par truie
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
    truies.forEach((t, idx) => {
      if (!isMaternite(t)) return;
      const dk = buildDedupKey(t, idx);
      if (seen.has(dk)) return;
      const code = t.displayId || t.id || t.boucle || `T#${idx + 1}`;
      const bande =
        (t.displayId ? bandeByTruie.get(t.displayId) : undefined) ||
        (t.id ? bandeByTruie.get(t.id) : undefined) ||
        (t.boucle ? bandeByTruie.get(t.boucle) : undefined);
      const dateMB = bande ? parseDateLoose(bande.dateMB) : null;
      const dayInPhase = dateMB
        ? Math.max(
            0,
            Math.min(
              SEVRAGE_JOURS_POST_MB,
              Math.floor((now.getTime() - dateMB.getTime()) / 86400000),
            ),
          )
        : 0;
      const currentDay = GESTATION_JOURS + dayInPhase;
      list.push({
        key: `mater-${dk}`,
        truieCode: code,
        truieId: t.id,
        bandeId: bande?.id,
        bandeCode: bande?.idPortee || bande?.id,
        phase: 'maternite',
        dayInPhase,
        daysRemaining: Math.max(0, SEVRAGE_JOURS_POST_MB - dayInPhase),
        phaseTotal: SEVRAGE_JOURS_POST_MB,
        currentDay,
        railPos: currentDay / CYCLE_TOTAL_JOURS,
      });
      seen.add(dk);
    });

    // 2) GESTATION — truies "Pleine"
    truies.forEach((t, idx) => {
      if (!isPleine(t)) return;
      const dk = buildDedupKey(t, idx);
      if (seen.has(dk)) return;
      const code = t.displayId || t.id || t.boucle || `T#${idx + 1}`;
      const lastSaillie =
        (t.id ? lastSaillieByTruie.get(t.id) : undefined) ||
        (t.displayId ? lastSaillieByTruie.get(t.displayId) : undefined);
      let dateSaillie: Date | null = lastSaillie ? parseDateLoose(lastSaillie.dateSaillie) : null;
      if (!dateSaillie && t.dateMBPrevue) {
        const dMB = parseDateLoose(t.dateMBPrevue);
        if (dMB) dateSaillie = new Date(dMB.getTime() - GESTATION_JOURS * 86400000);
      }
      const currentDay = dateSaillie
        ? Math.max(
            ECHO_JOUR + 1,
            Math.min(
              GESTATION_JOURS - 1,
              Math.floor((now.getTime() - dateSaillie.getTime()) / 86400000),
            ),
          )
        : Math.floor(GESTATION_JOURS / 2);
      const dayInPhase = Math.max(0, currentDay - ECHO_JOUR);
      const phaseTotal = GESTATION_JOURS - ECHO_JOUR;
      list.push({
        key: `gest-${dk}`,
        truieCode: code,
        truieId: t.id,
        phase: 'gestation',
        dayInPhase,
        daysRemaining: Math.max(0, phaseTotal - dayInPhase),
        phaseTotal,
        currentDay,
        railPos: currentDay / CYCLE_TOTAL_JOURS,
      });
      seen.add(dk);
    });

    // 3) ATTENTE ÉCHO — saillies récentes (≤27j) hors truies déjà rangées
    saillies.forEach((s, sIdx) => {
      if (!s.truieId) return;
      const dS = parseDateLoose(s.dateSaillie);
      if (!dS) return;
      const days = Math.floor((now.getTime() - dS.getTime()) / 86400000);
      if (days < 0 || days >= ECHO_JOUR) return;
      if (s.statut && /echec|ech[eé]c|abandon/i.test(s.statut)) return;
      const truieIdx = truies.findIndex(
        t => t.id === s.truieId || t.displayId === s.truieId || t.boucle === s.truieId,
      );
      const truie = truieIdx >= 0 ? truies[truieIdx] : undefined;
      // Si la truie est introuvable, clé propre à la saillie (zéro collision
      // possible grâce à sIdx).
      const dk =
        truieIdx >= 0
          ? buildDedupKey(truie, truieIdx)
          : `saillie#${sIdx}|sid=${s.id ?? ''}|tid=${s.truieId}`;
      if (seen.has(dk)) return;
      const code = truie?.displayId || truie?.id || truie?.boucle || s.truieBoucle || s.truieId;
      list.push({
        key: `echo-${dk}`,
        truieCode: code,
        truieId: truie?.id ?? s.truieId,
        phase: 'attente-echo',
        dayInPhase: days,
        daysRemaining: Math.max(0, ECHO_JOUR - days),
        phaseTotal: ECHO_JOUR,
        currentDay: days,
        railPos: days / CYCLE_TOTAL_JOURS,
      });
      seen.add(dk);
    });

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
    bandes
      .filter(b => b.statut === 'Sous mère' && b.dateSevragePrevue)
      .forEach(b => {
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
    <div
      className="pt-screen phone-content"
      style={{ paddingBottom: 168, maxWidth: 600, margin: '0 auto' }}
    >
      <MariusGreeting pageContext="reproduction" />

      <header className="ph ph--primary">
        <div className="eyebrow">GTTT · Cycle vivant</div>
        <h1>Reproduction</h1>
        <p className="sub">
          {subtitleParts.join(' · ')} — {totalActifs} cycle{totalActifs > 1 ? 's' : ''} actif
          {totalActifs > 1 ? 's' : ''}.
        </p>
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
            La gestation de la truie dure <strong>115 jours</strong>. Elle se découpe en 3 phases :
            implantation J0–J28, croissance fœtale J28–J90, finition J90–J115.
          </EduCard>

          {cycleBande ? (
            <section className="section">
              <div className="section__label">
                Prochaine mise-bas · {cycleBande.bande.idPortee || cycleBande.bande.id}
              </div>
              <Card>
                <CycleTimeline
                  currentDay={cycleBande.currentDay}
                  totalDays={GESTATION_JOURS}
                  steps={[
                    { label: 'Saillie', day: 0, done: cycleBande.currentDay >= 0 },
                    { label: 'Écho', day: 28, done: cycleBande.currentDay >= 28 },
                    {
                      label: 'Mise-bas',
                      day: GESTATION_JOURS,
                      done: cycleBande.currentDay >= GESTATION_JOURS,
                      target: true,
                    },
                  ]}
                />
              </Card>
            </section>
          ) : (
            <section className="section">
              <div className="section__label">Cycle reproduction</div>
              <Card>
                <div
                  style={{
                    padding: 16,
                    textAlign: 'center',
                    color: 'var(--pt-muted)',
                    fontSize: 13,
                  }}
                >
                  Aucune bande en cycle. Crée une saillie pour démarrer un cycle.
                </div>
              </Card>
            </section>
          )}

          <section className="section">
            <div className="section__label">7 prochains jours</div>
            <Card>
              {upcomingItems.length === 0 ? (
                <div
                  style={{
                    padding: '12px 0',
                    textAlign: 'center',
                    color: 'var(--pt-muted)',
                    fontSize: 13,
                  }}
                >
                  Aucun événement dans les 7 prochains jours
                </div>
              ) : (
                upcomingItems.map(item => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => navigate(item.to)}
                    className="alert-row"
                    style={{
                      background: 'none',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    aria-label={`${item.title} — voir détail`}
                  >
                    <div
                      style={{
                        background: item.badgeBg,
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        minWidth: 36,
                        textAlign: 'center',
                      }}
                    >
                      {item.badge}
                    </div>
                    <div className="alert-info" style={{ flex: 1 }}>
                      <div className="alert-title">{item.title}</div>
                      <div className="alert-meta">{item.meta}</div>
                    </div>
                    <span className="list-arrow">›</span>
                  </button>
                ))
              )}
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
              Saillie ({chipCounts['attente-echo']})
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
              {cyclesFiltered.length} cycle{cyclesFiltered.length > 1 ? 's' : ''}
              {chipFilter === 'all' ? ' actif' + (cyclesFiltered.length > 1 ? 's' : '') : ''}
            </div>
            {cyclesEnCours.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">Aucun cycle en cours</div>
                <div className="empty-state__sub">
                  Aucune truie pleine, en maternité ou en attente d'écho. Crée une saillie pour
                  démarrer un cycle.
                </div>
              </div>
            ) : cyclesFiltered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__sub">Aucun cycle dans cette phase.</div>
              </div>
            ) : (
              cyclesFiltered.map(c => {
                const label = phaseLabelText(c.phase);
                const pillCls = phasePillClass(c.phase);
                const dayLabel =
                  c.phase === 'attente-echo'
                    ? `Saillie · J${c.dayInPhase}/${ECHO_JOUR} · écho ${c.daysRemaining}j`
                    : c.phase === 'gestation'
                      ? `Gestation · J${c.currentDay}/${GESTATION_JOURS} · MB ${c.daysRemaining}j`
                      : `Lactation · J+${c.dayInPhase} · sevrage J143`;
                const currentLabel: MiniRailLabel =
                  c.phase === 'attente-echo'
                    ? 'S'
                    : c.phase === 'gestation'
                      ? c.currentDay < 90
                        ? 'É28'
                        : 'FŒT'
                      : 'MB';
                const shortCode = (c.truieCode || c.truieId || '').slice(-5);
                const truieId = c.truieId || c.truieCode;
                const targetRoute = c.bandeId
                  ? `/troupeau/bandes/${c.bandeId}`
                  : truieId
                    ? `/troupeau/truies/${truieId}`
                    : '/troupeau';

                return (
                  <a
                    key={c.key}
                    className="cycle-card"
                    href={`#cycle-${c.key}`}
                    onClick={e => {
                      e.preventDefault();
                      navigate(targetRoute);
                    }}
                    aria-label={`Cycle ${c.truieCode} — ${label} — voir détail`}
                    style={{ marginBottom: 8 }}
                  >
                    <div className="cycle-card__head">
                      <EntityAvatar species="truie" size="md" shortCode={shortCode} />
                      <div className="cycle-card__main">
                        <div className="cycle-card__title">
                          {c.bandeCode ? `${c.bandeCode} · ${c.truieCode}` : c.truieCode}
                        </div>
                        <div className="cycle-card__sub">{dayLabel}</div>
                      </div>
                      <span className={`pill ${pillCls}`} style={{ flexShrink: 0 }}>
                        {label}
                      </span>
                    </div>
                    <CycleMiniRail railPos={c.railPos} currentLabel={currentLabel} />
                  </a>
                );
              })
            )}
          </section>

          {/* FAB primary "+ SAILLIE" rendu par App.tsx > SaisirFABMount > usePageFab,
              dispatche `pt-fab-action`. Cf. design-system/hooks/usePageFab.ts:56. */}
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
            ) : (
              upcomingItems.map(item => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="alert-row"
                  style={{
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  aria-label={`${item.title} — voir détail`}
                >
                  <div
                    style={{
                      background: item.badgeBg,
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      minWidth: 36,
                      textAlign: 'center',
                    }}
                  >
                    {item.badge}
                  </div>
                  <div className="alert-info" style={{ flex: 1 }}>
                    <div className="alert-title">{item.title}</div>
                    <div className="alert-meta">{item.meta}</div>
                  </div>
                  <span className="list-arrow">›</span>
                </button>
              ))
            )}
          </Card>
        </section>
      )}

      {tab === 'historique' && (
        <section className="section">
          <div className="section__label">Bandes passées</div>
          <div className="empty-state">
            <div className="empty-state__icon">
              <Archive size={30} strokeWidth={2} aria-hidden="true" />
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
              strokeWidth={2}
              aria-hidden="true"
              style={{ color: 'var(--pt-muted)' }}
            />
          }
          title="Comprendre les cycles"
          description="Saillie, écho, mise-bas, sevrage — à lire entre deux tournées."
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
