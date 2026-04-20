/**
 * CyclesHub — /cycles (tab 03)
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte Claude Design v2 (2026-04-20) — mockup _tabs/03-cycles.
 *
 * Structure :
 *   1. Summary chips 5 phases (count par phase avec tone)
 *   2. Pipeline horizontal 295 jours (bande 5 phases + labels + markers bandes)
 *   3. Liste bandes actives (DataRow avec progress J+x/durée + chip phase)
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronRight } from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { SectionDivider, Chip } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  computeBandePhase,
  filterRealPortees,
} from '../../services/bandesAggregator';
import { FARM_CONFIG } from '../../config/farm';
import type { BandePorcelets, Truie } from '../../types/farm';
import { normaliseStatut } from '../../lib/truieStatut';

// ─── Phases ─────────────────────────────────────────────────────────────────

type PhaseId = 'gestation' | 'maternite' | 'postsevr' | 'croiss' | 'finition';

interface PhaseDef {
  id: PhaseId;
  label: string;
  short: string;
  days: number;
  varTone: string;
}

const PHASES: readonly PhaseDef[] = [
  { id: 'gestation', label: 'Gestation', short: 'GEST.', days: 115, varTone: 'var(--cyan)' },
  { id: 'maternite', label: 'Maternité', short: 'MAT.', days: FARM_CONFIG.SEVRAGE_AGE_JOURS ?? 28, varTone: 'var(--gold)' },
  { id: 'postsevr',  label: 'Post-sevrage', short: 'P-SEV.', days: FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 32, varTone: 'var(--teal)' },
  { id: 'croiss',    label: 'Croissance', short: 'CROIS.', days: 60, varTone: 'var(--amber)' },
  { id: 'finition',  label: 'Finition', short: 'FINIT.', days: 60, varTone: 'var(--coral)' },
];

const TOTAL_DAYS = PHASES.reduce((s, p) => s + p.days, 0);
const PHASE_OFFSETS: Record<PhaseId, number> = (() => {
  const o: Record<PhaseId, number> = {
    gestation: 0, maternite: 0, postsevr: 0, croiss: 0, finition: 0,
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
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

interface BandePosition {
  id: string;
  label: string;
  truie: string;
  phase: PhaseDef;
  dayInPhase: number;
  detail: string;
}

/** Détermine la position d'une bande dans le pipeline. */
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
    dayInPhase = sev ? Math.min(daysBetween(sev, today), def?.days ?? 32) : 0;
    detail = `${vivants} porcelets`;
  } else if (phase === 'ENGRAISSEMENT') {
    const sev = parseDate(b.dateSevrageReelle || b.dateSevragePrevue);
    const dSinceSev = sev ? daysBetween(sev, today) : 0;
    const dEngrais = Math.max(0, dSinceSev - (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 32));
    const croissDays = PHASES.find((p) => p.id === 'croiss')?.days ?? 60;
    if (dEngrais < croissDays) {
      def = PHASES.find((p) => p.id === 'croiss');
      dayInPhase = dEngrais;
    } else {
      def = PHASES.find((p) => p.id === 'finition');
      dayInPhase = Math.min(dEngrais - croissDays, def?.days ?? 60);
    }
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
  };
}

/** Position globale (j sur pipeline 295j). */
function globalDay(b: BandePosition): number {
  return PHASE_OFFSETS[b.phase.id] + b.dayInPhase;
}

/** Truies en gestation → pseudo-bandes pour le pipeline. */
function truieToPosition(t: Truie, today: Date): BandePosition | null {
  if (normaliseStatut(t.statut) !== 'PLEINE') return null;
  const def = PHASES.find((p) => p.id === 'gestation');
  if (!def) return null;
  const mbPrev = parseDate(t.dateMBPrevue);
  let dayInPhase = 0;
  if (mbPrev) {
    const diff = daysBetween(today, mbPrev);
    dayInPhase = Math.max(0, def.days - diff);
  }
  return {
    id: `T-${t.id}`,
    label: t.displayId || t.id,
    truie: t.displayId || t.id,
    phase: def,
    dayInPhase,
    detail: t.dateMBPrevue ? `MB prévue ${t.dateMBPrevue}` : 'Gestation',
  };
}

// ─── Composant ──────────────────────────────────────────────────────────────

const CyclesHub: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes } = useFarm();
  const today = useMemo(() => new Date(), []);

  const positions = useMemo<BandePosition[]>(() => {
    const realBandes = filterRealPortees(bandes);
    const fromBandes = realBandes
      .map((b) => bandePosition(b, today))
      .filter((x): x is BandePosition => x !== null);
    const fromTruies = truies
      .map((t) => truieToPosition(t, today))
      .filter((x): x is BandePosition => x !== null);
    return [...fromTruies, ...fromBandes];
  }, [bandes, truies, today]);

  const countByPhase = useMemo(() => {
    const c: Record<PhaseId, number> = {
      gestation: 0, maternite: 0, postsevr: 0, croiss: 0, finition: 0,
    };
    for (const p of positions) c[p.phase.id] += 1;
    return c;
  }, [positions]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="CYCLES"
            subtitle={`Pipeline · ${TOTAL_DAYS} jours`}
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Summary chips 5 phases ──────────────────────────────── */}
            <div className="grid grid-cols-5 gap-1.5">
              {PHASES.map((p) => {
                const count = countByPhase[p.id];
                return (
                  <div
                    key={p.id}
                    className="card-dense !p-2.5 text-center"
                    style={{
                      borderColor: count > 0
                        ? `color-mix(in srgb, ${p.varTone} 40%, var(--border))`
                        : undefined,
                    }}
                  >
                    <div
                      className="font-mono text-[9px] uppercase tracking-wide font-semibold"
                      style={{ color: p.varTone }}
                    >
                      {p.short}
                    </div>
                    <div
                      className="font-mono tabular-nums text-[20px] font-bold mt-1 leading-none"
                      style={{ color: count > 0 ? p.varTone : 'var(--text-2)' }}
                    >
                      {String(count).padStart(2, '0')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pipeline horizontal ─────────────────────────────────── */}
            <section aria-label={`Pipeline ${TOTAL_DAYS} jours`}>
              <SectionDivider label={`Pipeline · ${TOTAL_DAYS} jours`} />
              <div className="card-dense !px-3.5 !pt-4 !pb-3.5 mt-3 overflow-hidden">
                <PhaseBand />
                <PhaseLabels />
                <BandesMarkers
                  positions={positions}
                  onOpen={(id) => navigate(`/troupeau/bandes/${encodeURIComponent(id)}`)}
                />
              </div>
            </section>

            {/* ── Liste bandes actives ────────────────────────────────── */}
            {positions.length > 0 ? (
              <section aria-label={`Bandes actives · ${positions.length}`}>
                <SectionDivider label={`Bandes actives · ${positions.length}`} />
                <ul className="card-dense !p-0 overflow-hidden">
                  {positions.map((pos) => (
                    <BandeRow
                      key={pos.id}
                      pos={pos}
                      onOpen={() =>
                        navigate(`/troupeau/bandes/${encodeURIComponent(pos.id.replace(/^T-/, ''))}`)
                      }
                    />
                  ))}
                </ul>
              </section>
            ) : (
              <div className="card-dense text-center py-8">
                <p className="font-mono text-[12px] text-text-2">
                  Aucune bande active dans le pipeline.
                </p>
              </div>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Pipeline band (5 phases proportionnelles) ─────────────────────────────

const PhaseBand: React.FC = () => (
  <div
    className="flex h-[10px] rounded-full overflow-hidden gap-[2px]"
    aria-hidden="true"
  >
    {PHASES.map((p) => (
      <div
        key={p.id}
        style={{
          flex: p.days,
          background: `color-mix(in srgb, ${p.varTone} 30%, var(--bg-1))`,
          borderTop: `2px solid ${p.varTone}`,
        }}
      />
    ))}
  </div>
);

// ─── Phase labels sous la band ─────────────────────────────────────────────

const PhaseLabels: React.FC = () => (
  <div className="flex gap-[2px] mt-2">
    {PHASES.map((p) => (
      <div key={p.id} className="flex-1 text-center" style={{ flex: p.days }}>
        <div
          className="font-mono text-[9px] uppercase tracking-tight font-semibold leading-none"
          style={{ color: p.varTone }}
        >
          {p.short}
        </div>
        <div className="font-mono text-[9px] text-text-2 tabular-nums mt-1 leading-none">
          {p.days}j
        </div>
      </div>
    ))}
  </div>
);

// ─── Bandes markers (positions absolues) ──────────────────────────────────

interface BandesMarkersProps {
  positions: BandePosition[];
  onOpen: (id: string) => void;
}

const BandesMarkers: React.FC<BandesMarkersProps> = ({ positions, onOpen }) => (
  <div
    className="relative mt-4 pt-3 border-t border-dashed border-border"
    style={{ height: 110 }}
    aria-label="Positions des bandes"
  >
    {positions.slice(0, 9).map((pos, i) => {
      const leftPct = (globalDay(pos) / TOTAL_DAYS) * 100;
      const row = i % 3;
      return (
        <button
          key={pos.id}
          type="button"
          onClick={() => onOpen(pos.id)}
          className="pressable absolute flex flex-col items-center -translate-x-1/2 z-[2]"
          style={{ left: `${leftPct}%`, top: row * 30 }}
          aria-label={`Bande ${pos.label}`}
        >
          <span
            className="font-mono text-[10px] font-semibold px-1.5 py-[3px] rounded-md whitespace-nowrap"
            style={{
              background: 'var(--bg-2)',
              border: `1px solid ${pos.phase.varTone}`,
              color: pos.phase.varTone,
            }}
          >
            {pos.label}
          </span>
          <span
            className="w-px h-1.5"
            style={{ background: pos.phase.varTone }}
            aria-hidden="true"
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: pos.phase.varTone,
              boxShadow: '0 0 0 2px var(--bg-2)',
            }}
            aria-hidden="true"
          />
        </button>
      );
    })}
  </div>
);

// ─── BandeRow ───────────────────────────────────────────────────────────────

interface BandeRowProps {
  pos: BandePosition;
  onOpen: () => void;
}

const BandeRow: React.FC<BandeRowProps> = ({ pos, onOpen }) => {
  const pct = pos.phase.days > 0
    ? Math.min(100, Math.round((pos.dayInPhase / pos.phase.days) * 100))
    : 0;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="pressable w-full text-left flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[14px] font-semibold text-text-0">
              {pos.label}
            </span>
            <span className="font-mono text-[11px] text-text-2">· {pos.truie}</span>
            <Chip
              label={pos.phase.label}
              tone="default"
              size="xs"
              className="border"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 bg-bg-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${pct}%`,
                  background: pos.phase.varTone,
                }}
              />
            </div>
            <span className="font-mono text-[10px] text-text-2 tabular-nums min-w-[56px] text-right">
              {pos.dayInPhase}/{pos.phase.days}j
            </span>
          </div>
          <div className="text-[11px] text-text-2 mt-1 truncate">{pos.detail}</div>
        </div>
        <ChevronRight size={16} className="shrink-0 text-text-2" aria-hidden="true" />
      </button>
    </li>
  );
};

export default CyclesHub;
