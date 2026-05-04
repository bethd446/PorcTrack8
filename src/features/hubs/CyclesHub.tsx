/**
 * CyclesHub — /cycles
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte v6 « Terrain Vivant » (2026-04-30)
 *
 *   1. TopBarSync + Eyebrow + H1 Big Shoulders
 *   2. Sub-tabs en pills (par phase) — pointe vers les vues détaillées
 *   3. Pipeline horizontal (band 6 phases proportionnelles + labels + bandes)
 *   4. Liste bandes actives en cards v6 (radius 12, shadow-card)
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { ChevronRight, AlertTriangle } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import PhaseBadge, { type Phase as DesignPhase } from '../../components/design/PhaseBadge';
import TopBarSync from '../../components/design/TopBarSync';
import { useFarm } from '../../context/FarmContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  computeBandePhase,
  filterRealPortees,
} from '../../services/bandesAggregator';
import { FARM_CONFIG } from '../../config/farm';
import type { BandePorcelets, Saillie, Truie } from '../../types/farm';
import { normaliseStatut } from '../../lib/truieStatut';
import { normalizeTruieId, safeDate } from '../../lib/truieHelpers';
import { Button, PageHeader, Section } from '@/design-system';

// ─── Phases ─────────────────────────────────────────────────────────────────

type PhaseId = 'gestation' | 'maternite' | 'postsevr' | 'croiss' | 'engrais' | 'finition' | 'sortie';

interface PhaseDef {
  id: PhaseId;
  label: string;
  short: string;
  days: number;
  tone: string;
  toneSoft: string;
  route?: string;
}

const PHASES: readonly PhaseDef[] = [
  {
    id: 'gestation',
    label: 'Gestation',
    short: 'Gest.',
    days: 115,
    tone: 'var(--color-pig)',
    toneSoft: 'var(--color-pig-soft)',
  },
  {
    id: 'maternite',
    label: 'Maternité',
    short: 'Mat.',
    days: FARM_CONFIG.SEVRAGE_AGE_JOURS ?? 28,
    tone: 'var(--color-info)',
    toneSoft: 'var(--color-blue-100)',
    route: '/cycles/maternite',
  },
  {
    id: 'postsevr',
    label: 'Post-sevrage',
    short: 'P-sev.',
    days: FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35,
    tone: 'var(--color-accent-400)',
    toneSoft: 'var(--color-accent-100)',
    route: '/cycles/post-sevrage',
  },
  {
    id: 'croiss',
    label: 'Croissance',
    short: 'Crois.',
    days: FARM_CONFIG.CROISSANCE_DUREE_JOURS ?? 37,
    tone: 'var(--color-accent-500)',
    toneSoft: 'var(--color-accent-100)',
    route: '/cycles/croissance',
  },
  {
    id: 'engrais',
    label: 'Engrais.',
    short: 'Engr.',
    days: FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS ?? 80,
    tone: 'var(--color-secondary)',
    toneSoft: 'var(--color-secondary-soft)',
    route: '/cycles/engraissement',
  },
  {
    id: 'finition',
    label: 'Finition',
    short: 'Finit.',
    days: Math.round((FARM_CONFIG.FINITION_POIDS_MAX_KG - FARM_CONFIG.FINITION_POIDS_MIN_KG) / 0.90),
    tone: 'var(--color-secondary-deep)',
    toneSoft: 'var(--color-secondary-soft)',
    route: '/cycles/finition',
  },
  {
    id: 'sortie',
    label: 'Sortie',
    short: 'Sort.',
    days: 7,
    tone: 'var(--color-ink-soft)',
    toneSoft: 'var(--bg-surface-2)',
    route: '/cycles/sortie',
  },
];

const PHASE_TO_DESIGN: Record<PhaseId, DesignPhase> = {
  gestation: 'repro',
  maternite: 'mater',
  postsevr:  'sevr',
  croiss:    'crois',
  engrais:   'engr',
  finition:  'finit',
  sortie:    'sortie',
};

const TOTAL_DAYS = PHASES.reduce((s, p) => s + p.days, 0);
const PHASE_OFFSETS: Record<PhaseId, number> = (() => {
  const o: Record<PhaseId, number> = {
    gestation: 0, maternite: 0, postsevr: 0, croiss: 0, engrais: 0, finition: 0, sortie: 0,
  };
  let acc = 0;
  for (const p of PHASES) {
    o[p.id] = acc;
    acc += p.days;
  }
  return o;
})();

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function daysBetween(from: Date, to: Date): number {
  // V4-fix : Math.round pour absorber les DST (passage heure été/hiver crée
  // un offset de 1h entre 2 dates qui chevauchent le switch → off-by-one).
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

interface BandePosition {
  id: string;
  label: string;
  truie: string;
  phase: PhaseDef;
  dayInPhase: number;
  detail: string;
  /** Statut métier d'origine (bande ou truie) — sert à détecter les états résolus. */
  statut?: string;
  /** Jours de retard sur la phase (0 si dans les temps, >0 si dépassé). */
  overdueDays?: number;
}

type BandeTreatment = 'urgent' | 'normal' | 'resolu';

const URGENT_THRESHOLD_DAYS = 14;

function classifyBandeTreatment(pos: BandePosition): BandeTreatment {
  if (pos.statut && /sortie|vendu|reform|recap/i.test(pos.statut)) return 'resolu';
  const remaining = Math.max(0, pos.phase.days - pos.dayInPhase);
  if (remaining < URGENT_THRESHOLD_DAYS) return 'urgent';
  return 'normal';
}

const TREATMENT_RANK: Record<BandeTreatment, number> = {
  urgent: 0,
  normal: 1,
  resolu: 2,
};

function bandePosition(b: BandePorcelets, today: Date): BandePosition | null {
  const phase = computeBandePhase(b, today);
  const vivants = b.vivants ?? 0;

  let def: PhaseDef | undefined;
  let dayInPhase: number;
  let detail: string;

  if (phase === 'SOUS_MERE') {
    def = PHASES.find((p) => p.id === 'maternite');
    const mb = parseDate(b.dateMB);
    dayInPhase = mb ? Math.min(daysBetween(mb, today), def?.days ?? 28) : 0;
    detail = `${vivants} porcelets`;
  } else if (phase === 'POST_SEVRAGE') {
    def = PHASES.find((p) => p.id === 'postsevr');
    const sev = parseDate(b.dateSevrageReelle || b.dateSevragePrevue);
    dayInPhase = sev ? Math.min(daysBetween(sev, today), def?.days ?? 35) : 0;
    detail = `${vivants} porcelets`;
  } else if (phase === 'CROISSANCE') {
    def = PHASES.find((p) => p.id === 'croiss');
    const sev = parseDate(b.dateSevrageReelle || b.dateSevragePrevue);
    const dSinceSev = sev ? daysBetween(sev, today) : 0;
    dayInPhase = Math.max(0, dSinceSev - (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35));
    dayInPhase = Math.min(dayInPhase, def?.days ?? 37);
    detail = `${vivants} têtes`;
  } else if (phase === 'ENGRAISSEMENT') {
    def = PHASES.find((p) => p.id === 'engrais');
    const sev = parseDate(b.dateSevrageReelle || b.dateSevragePrevue);
    const dSinceSev = sev ? daysBetween(sev, today) : 0;
    dayInPhase = Math.max(0, dSinceSev - (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35) - (FARM_CONFIG.CROISSANCE_DUREE_JOURS ?? 37));
    dayInPhase = Math.min(dayInPhase, def?.days ?? 80);
    detail = `${vivants} têtes`;
  } else if (phase === 'FINITION') {
    def = PHASES.find((p) => p.id === 'finition');
    const sev = parseDate(b.dateSevrageReelle || b.dateSevragePrevue);
    const dSinceSev = sev ? daysBetween(sev, today) : 0;
    const FINITION_DAYS = Math.round((FARM_CONFIG.FINITION_POIDS_MAX_KG - FARM_CONFIG.FINITION_POIDS_MIN_KG) / 0.90);
    dayInPhase = Math.max(0, dSinceSev - (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35) - (FARM_CONFIG.CROISSANCE_DUREE_JOURS ?? 37) - (FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS ?? 80));
    dayInPhase = Math.min(dayInPhase, def?.days ?? FINITION_DAYS);
    detail = `${vivants} têtes`;
  } else {
    return null;
  }

  if (!def) return null;
  return {
    id: b.id,
    label: b.idPortee || b.id,
    truie: b.truie || b.boucleMere || '—',
    phase: def,
    dayInPhase,
    detail,
    statut: b.statut,
  };
}

function globalDay(b: BandePosition): number {
  return PHASE_OFFSETS[b.phase.id] + b.dayInPhase;
}

/**
 * Trouve la dernière saillie d'une truie (la plus récente).
 * Match par UUID, code_id (T07), puis boucle. Retourne null si aucune.
 */
function findLastSaillieFor(t: Truie, saillies: Saillie[]): Saillie | null {
  const tCode = normalizeTruieId(t.displayId);
  let best: Saillie | null = null;
  let bestTs = 0;
  for (const s of saillies) {
    const sCode = normalizeTruieId(s.truieId);
    const match =
      s.truieId === t.id
      || (!!tCode && sCode === tCode)
      || (!!t.boucle && s.truieBoucle === t.boucle);
    if (!match) continue;
    const d = safeDate(s.dateSaillie);
    if (!d) continue;
    if (d.getTime() > bestTs) {
      bestTs = d.getTime();
      best = s;
    }
  }
  return best;
}

/** Jours réels écoulés depuis la dernière saillie (0 si aucune saillie datée). */
export function daysSinceSaillie(t: Truie, saillies: Saillie[], today: Date): number {
  const last = findLastSaillieFor(t, saillies);
  if (!last) return 0;
  const d = safeDate(last.dateSaillie);
  if (!d) return 0;
  return Math.max(0, daysBetween(d, today));
}

function truieToPosition(t: Truie, saillies: Saillie[], today: Date): BandePosition | null {
  if (normaliseStatut(t.statut) !== 'PLEINE') return null;
  const def = PHASES.find((p) => p.id === 'gestation');
  if (!def) return null;

  // Préférer le calcul depuis la saillie réelle (source de vérité robuste)
  // au lieu de `dateMBPrevue` qui est souvent vide ou mal saisie.
  const sinceSaillie = daysSinceSaillie(t, saillies, today);
  let dayInPhase = sinceSaillie > 0 ? Math.min(sinceSaillie, def.days) : 0;

  if (sinceSaillie === 0) {
    // Fallback : dériver depuis dateMBPrevue (legacy).
    const mbPrev = parseDate(t.dateMBPrevue);
    if (mbPrev) {
      const diff = daysBetween(today, mbPrev);
      dayInPhase = Math.max(0, def.days - diff);
    }
  }

  // Détail : J+X/115 + retard si dépassé.
  const overdue = sinceSaillie > def.days ? sinceSaillie - def.days : 0;
  const detail = overdue > 0
    ? `J+${sinceSaillie}/${def.days} · retard ${overdue}j`
    : sinceSaillie > 0
      ? `J+${sinceSaillie}/${def.days}`
      : t.dateMBPrevue
        ? `MB prévue ${t.dateMBPrevue}`
        : 'Gestation';

  return {
    id: `T-${t.id}`,
    label: t.displayId || t.id,
    truie: t.displayId || t.id,
    phase: def,
    dayInPhase,
    detail,
    statut: t.statut,
    overdueDays: overdue,
  };
}

// ─── Composant ──────────────────────────────────────────────────────────────

const CyclesHub: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes, saillies, loading } = useFarm();
  const { handleRefresh } = useAutoRefresh();
  const today = useMemo(() => new Date(), []);

  const positions = useMemo<BandePosition[]>(() => {
    const realBandes = filterRealPortees(bandes);
    const fromBandes = realBandes
      .map((b) => bandePosition(b, today))
      .filter((x): x is BandePosition => x !== null);
    const fromTruies = truies
      .map((t) => truieToPosition(t, saillies, today))
      .filter((x): x is BandePosition => x !== null);
    return [...fromTruies, ...fromBandes];
  }, [bandes, truies, saillies, today]);

  const countByPhase = useMemo(() => {
    const c: Record<PhaseId, number> = {
      gestation: 0, maternite: 0, postsevr: 0, croiss: 0, engrais: 0, finition: 0, sortie: 0,
    };
    for (const p of positions) c[p.phase.id] += 1;
    return c;
  }, [positions]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <TopBarSync
            crumbs={['Cycles', 'Vue globale']}
            onMariusClick={() => {
              const evt = new CustomEvent('open-chatbot');
              window.dispatchEvent(evt);
            }}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <PageHeader
              eyebrow="CYCLES"
              title="Cycles biologiques"
              subtitle="Suivi des étapes de production"
            />

            {/* ── Sub-tabs phases (pills) ───────────────────────────── */}
            <div
              role="tablist"
              aria-label="Phases du cycle"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {PHASES.map((p) => {
                const count = countByPhase[p.id];
                const Tag: 'button' | 'div' = p.route ? 'button' : 'div';
                return (
                  <Tag
                    key={p.id}
                    role="tab"
                    aria-selected={false}
                    {...(p.route ? { type: 'button' as const, onClick: () => navigate(p.route!) } : {})}
                    className="pressable"
                    style={{
                      minHeight: 44,
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-pill)',
                      background: count > 0 ? p.toneSoft : 'var(--bg-surface)',
                      color: count > 0 ? p.tone : 'var(--ink-soft)',
                      border: `1px solid ${count > 0 ? p.tone : 'var(--line)'}`,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      fontWeight: 500,
                      cursor: p.route ? 'pointer' : 'default',
                      transition: 'transform 160ms var(--ease-emil), background 200ms var(--ease-emil)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>{p.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        opacity: 0.75,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {String(count).padStart(2, '0')}
                    </span>
                  </Tag>
                );
              })}
            </div>

            {/* ── Pipeline horizontal ──────────────────────────────── */}
            {/* min-height réservé pendant le chargement du contexte pour éviter CLS */}
            <Section label={`PIPELINE · ${TOTAL_DAYS} JOURS`} tone="accent" />
            <section
              aria-label={`Pipeline ${TOTAL_DAYS} jours`}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 12,
                padding: '18px 20px 16px',
                boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                minHeight: loading ? 168 : undefined,
              }}
            >
              <PhaseBand />
              <PhaseLabels />
              <BandesMarkers
                positions={positions}
                onOpen={(id) => navigate(`/troupeau/bandes/${encodeURIComponent(id)}`)}
              />
            </section>

            {/* ── Liste bandes actives ─────────────────────────────── */}
            {/* min-height évite le saut de layout quand la liste apparaît après chargement */}
            <div style={{ minHeight: loading ? 280 : undefined }}>
            {positions.length > 0 ? (
              <BandesList
                positions={positions}
                onOpen={(id) =>
                  navigate(`/troupeau/bandes/${encodeURIComponent(id.replace(/^T-/, ''))}`)
                }
              />
            ) : (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  padding: '32px',
                  textAlign: 'center',
                }}
              >
                <p
                  className="text-body"
                  style={{
                    color: 'var(--muted)',
                    margin: 0,
                  }}
                >
                  Aucune bande active dans le pipeline.
                </p>
              </div>
            )}
            </div>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Pipeline band ─────────────────────────────────────────────────────────

const PhaseBand: React.FC = () => (
  <div
    style={{
      display: 'flex',
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      gap: 2,
    }}
    aria-hidden="true"
  >
    {PHASES.map((p) => (
      <div
        key={p.id}
        style={{
          flex: p.days,
          background: p.toneSoft,
          borderTop: `2px solid ${p.tone}`,
        }}
      />
    ))}
  </div>
);

const PhaseLabels: React.FC = () => (
  <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
    {PHASES.map((p) => (
      <div key={p.id} style={{ flex: p.days, textAlign: 'center', minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.04em',
            color: p.tone,
            fontWeight: 600,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {p.short}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--muted)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 2,
          }}
        >
          {p.days}j
        </div>
      </div>
    ))}
  </div>
);

interface BandesMarkersProps {
  positions: BandePosition[];
  onOpen: (id: string) => void;
}

const BandesMarkers: React.FC<BandesMarkersProps> = ({ positions, onOpen }) => (
  <div
    style={{
      position: 'relative',
      marginTop: 18,
      paddingTop: 14,
      borderTop: '1px dashed var(--line)',
      height: 110,
    }}
    aria-label="Positions des bandes"
  >
    {positions.slice(0, 9).map((pos, i) => {
      const leftPct = (globalDay(pos) / TOTAL_DAYS) * 100;
      const row = i % 3;
      return (
        <Button
          key={pos.id}
          variant="ghost"
          onClick={() => onOpen(pos.id)}
          className="pressable"
          style={{
            position: 'absolute',
            left: `${leftPct}%`,
            top: row * 30,
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 0,
          }}
          ariaLabel={`Bande ${pos.label}`}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 7px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              background: 'var(--bg-surface)',
              border: `1px solid ${pos.phase.tone}`,
              color: pos.phase.tone,
              letterSpacing: '0.04em',
            }}
          >
            {pos.label}
          </span>
          <span
            aria-hidden="true"
            style={{ width: 1, height: 6, background: pos.phase.tone }}
          />
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: pos.phase.tone,
              boxShadow: '0 0 0 2px var(--bg-surface)',
            }}
          />
        </Button>
      );
    })}
  </div>
);

// ─── BandesList ────────────────────────────────────────────────────────────

interface BandesListProps {
  positions: BandePosition[];
  onOpen: (id: string) => void;
}

const BandesList: React.FC<BandesListProps> = ({ positions, onOpen }) => {
  const enriched = useMemo(() => {
    return positions
      .map((pos) => ({ pos, treatment: classifyBandeTreatment(pos) }))
      .sort((a, b) => {
        const r = TREATMENT_RANK[a.treatment] - TREATMENT_RANK[b.treatment];
        if (r !== 0) return r;
        // Retard décroissant en premier : ceux qui débordent depuis longtemps remontent.
        const odA = a.pos.overdueDays ?? 0;
        const odB = b.pos.overdueDays ?? 0;
        if (odA !== odB) return odB - odA;
        // Sinon urgence croissante (jours restants), puis alpha.
        const remA = Math.max(0, a.pos.phase.days - a.pos.dayInPhase);
        const remB = Math.max(0, b.pos.phase.days - b.pos.dayInPhase);
        if (remA !== remB) return remA - remB;
        return a.pos.label.localeCompare(b.pos.label);
      });
  }, [positions]);

  const urgentCount = enriched.filter((e) => e.treatment === 'urgent').length;
  const sectionLabel = urgentCount > 0
    ? `BANDES ACTIVES · ${positions.length} · ${urgentCount} URGENT${urgentCount > 1 ? 'S' : ''}`
    : `BANDES ACTIVES · ${positions.length}`;

  return (
    <section aria-label={`Bandes actives · ${positions.length}`}>
      <Section
        label={sectionLabel}
        tone={urgentCount > 0 ? 'danger' : 'accent'}
      />
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '12px 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {enriched.map(({ pos, treatment }) => (
          <BandeRow
            key={pos.id}
            pos={pos}
            treatment={treatment}
            onOpen={() => onOpen(pos.id)}
          />
        ))}
      </ul>
    </section>
  );
};

// ─── BandeRow ──────────────────────────────────────────────────────────────

interface BandeRowProps {
  pos: BandePosition;
  treatment: BandeTreatment;
  onOpen: () => void;
}

const BandeRow: React.FC<BandeRowProps> = ({ pos, treatment, onOpen }) => {
  const pct = pos.phase.days > 0
    ? Math.min(100, Math.round((pos.dayInPhase / pos.phase.days) * 100))
    : 0;

  const isUrgent = treatment === 'urgent';
  const isResolu = treatment === 'resolu';

  const remaining = Math.max(0, pos.phase.days - pos.dayInPhase);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'transform 160ms var(--ease-emil)',
    background: isResolu ? 'var(--bg-surface-2, var(--bg-surface))' : 'var(--bg-surface)',
    border: isUrgent
      ? '1px solid var(--color-pig-soft)'
      : isResolu
        ? '1px solid var(--line-2, var(--line))'
        : '1px solid var(--line)',
    boxShadow: isUrgent
      ? '0 1px 2px rgba(17,24,39,0.04), 0 2px 6px rgba(193,90,40,0.08)'
      : isResolu
        ? 'none'
        : '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
    opacity: isResolu ? 0.65 : 1,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-heading)',
    fontSize: isUrgent ? 18 : 16,
    fontWeight: isUrgent ? 700 : 600,
    color: 'var(--ink)',
    letterSpacing: '-0.01em',
    lineHeight: 1.1,
  };

  const eyebrowDotColor = isUrgent
    ? 'var(--color-pig-deep, var(--color-pig))'
    : pos.phase.tone;

  const overdue = pos.overdueDays ?? 0;
  const eyebrowText = isUrgent
    ? overdue > 0
      ? `EN RETARD · J+${pos.dayInPhase}/${pos.phase.days} · ${overdue}j de retard`
      : `Imminent · J+${pos.dayInPhase}/${pos.phase.days} · ${remaining}j restant${remaining > 1 ? 's' : ''}`
    : `${pos.phase.label} · J+${pos.dayInPhase}/${pos.phase.days}`;

  return (
    <li>
      <Button
        variant="ghost"
        onClick={onOpen}
        className="pressable"
        style={containerStyle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Eyebrow priorité / phase */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: eyebrowDotColor,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.06em',
                color: isUrgent ? 'var(--color-pig-deep, var(--color-pig))' : 'var(--muted)',
                fontWeight: isUrgent ? 600 : 500,
                textTransform: 'uppercase',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {eyebrowText}
            </span>
            {isUrgent && (
              <AlertTriangle
                size={14}
                color="var(--color-pig-deep, var(--color-pig))"
                aria-hidden="true"
                style={{ marginLeft: 'auto' }}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={titleStyle}>{pos.label}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: '0.04em',
              }}
            >
              · {pos.truie}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              <PhaseBadge
                phase={PHASE_TO_DESIGN[pos.phase.id]}
                label={pos.phase.label}
                size="sm"
              />
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div
              style={{
                flex: 1,
                height: 4,
                background: 'var(--bg-app)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: isUrgent
                    ? 'var(--color-pig-deep, var(--color-pig))'
                    : pos.phase.tone,
                  borderRadius: 999,
                  transition: 'width 240ms var(--ease-emil)',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--muted)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 56,
                textAlign: 'right',
              }}
            >
              {pos.dayInPhase}/{pos.phase.days}j
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--muted)',
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pos.detail}
            {isUrgent && (
              <span
                style={{
                  marginLeft: 8,
                  color: 'var(--color-pig-deep, var(--color-pig))',
                  fontWeight: 600,
                }}
              >
                · Confirmer transition
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={18} color="var(--muted)" aria-hidden="true" />
      </Button>
    </li>
  );
};

export default CyclesHub;
