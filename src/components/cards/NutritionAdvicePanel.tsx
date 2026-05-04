/**
 * NutritionAdvicePanel — Panneau de conseils nutritionnels intelligents
 * ══════════════════════════════════════════════════════════════════════
 * Consomme un BandePerfSnapshot et expose :
 *   - Score nutritionnel /100 (avec tone success/warning/danger)
 *   - Phase nutritionnelle DEMARRAGE/CROISSANCE/FINITION + objectif
 *   - Cibles nutriments (protéines, lysine, calcium, phosphore)
 *   - Vitamines clés
 *   - Conseils statiques (de la phase) + dynamiques (depuis nutritionAdvisor)
 *   - Détail score expandable (sous-scores 4×25pts)
 *
 * Edge case : si poids manquant ou hors range 7-120 kg → carte "Pesée
 * manquante" simplifiée, sans cibles/conseils/score.
 */

import React, { useState, useMemo } from 'react';
import {
  Wheat,
  Lightbulb,
  Info,
  AlertTriangle,
  AlertCircle,
  Scale,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import {
  NUTRITION_TARGETS,
  type NutritionPhase,
} from '../../services/nutritionGuidelines';
import { Button } from '@/design-system';
import {
  getNutritionPhase,
  getDynamicAdvice,
  computeNutritionScore,
  type BandePerfSnapshot,
  type DynamicAdvice,
} from '../../services/nutritionAdvisor';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NutritionAdvicePanelProps {
  snapshot: BandePerfSnapshot;
  /** Optionnel : si fourni, affiche aussi la phase biologique en complément. */
  phaseBiologique?: string;
}

type ScoreTone = 'success' | 'warning' | 'danger';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<NutritionPhase, string> = {
  DEMARRAGE: 'Démarrage',
  CROISSANCE: 'Croissance',
  FINITION: 'Finition',
};

function scoreTone(total: number): ScoreTone {
  if (total >= 80) return 'success';
  if (total >= 60) return 'warning';
  return 'danger';
}

const TONE_TEXT: Record<ScoreTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

const TONE_BG: Record<ScoreTone, string> = {
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  danger: 'bg-danger/10',
};

const ADVICE_ICON: Record<DynamicAdvice['type'], React.ComponentType<{ size?: number; className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const ADVICE_COLOR: Record<DynamicAdvice['type'], string> = {
  info: 'text-text-1',
  warning: 'text-amber',
  critical: 'text-red',
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface NutrientCellProps {
  label: string;
  value: string;
}

const NutrientCell: React.FC<NutrientCellProps> = ({ label, value }) => (
  <div className="bg-bg-1 rounded-lg p-3 border border-border/50">
    <div className="text-[10px] uppercase text-text-2 tracking-wider truncate">
      {label}
    </div>
    <div className="mt-1 text-[16px] text-text-0 font-bold whitespace-nowrap">
      {value}
    </div>
  </div>
);

interface SubScoreBarProps {
  label: string;
  value: number;
  max?: number;
}

const SubScoreBar: React.FC<SubScoreBarProps> = ({ label, value, max = 25 }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tone: ScoreTone = pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'danger';
  const barColor =
    tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-danger';
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] uppercase text-text-2 tracking-wider">{label}</span>
        <span className="text-[11px] text-text-1">
          {Math.round(value)}<span className="text-text-2">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

interface AdviceLineProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  text: string;
}

const AdviceLine: React.FC<AdviceLineProps> = ({ icon: Icon, iconClass, text }) => (
  <div className="flex items-start gap-2">
    <Icon size={14} className={`${iconClass} shrink-0 mt-0.5`} />
    <span className="text-[12px] text-text-1 leading-snug">{text}</span>
  </div>
);

// ─── Composant principal ────────────────────────────────────────────────────

export const NutritionAdvicePanel: React.FC<NutritionAdvicePanelProps> = ({
  snapshot,
  phaseBiologique,
}) => {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const phase = useMemo(
    () => getNutritionPhase(snapshot.poidsMoyenKg),
    [snapshot.poidsMoyenKg],
  );
  const dynamicAdvice = useMemo(
    () => (phase ? getDynamicAdvice(snapshot) : []),
    [snapshot, phase],
  );
  const score = useMemo(
    () => (phase ? computeNutritionScore(snapshot) : null),
    [snapshot, phase],
  );

  // ─── Edge case : poids manquant / hors range ──────────────────────────────
  if (phase === null) {
    return (
      <div
        className="bg-bg-0 rounded-2xl p-4 border border-border/50"
        data-testid="nutrition-advice-panel"
        data-state="missing-weight"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] uppercase text-text-2 tracking-wider">
            Nutrition · Conseils
          </span>
        </div>
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <Scale size={32} className="text-text-2" aria-hidden="true" />
          <p className="text-[13px] text-text-1 leading-snug max-w-[280px]">
            Pesée manquante — pèse la bande pour activer les conseils nutritionnels.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled
            className="text-[11px] uppercase tracking-wider px-3 py-2 border border-border text-text-2 opacity-60 cursor-not-allowed"
            style={{ borderRadius: '0.5rem' }}
          >
            Voir comment peser
          </Button>
        </div>
      </div>
    );
  }

  const targets = NUTRITION_TARGETS[phase];
  const tone = score ? scoreTone(score.total) : 'warning';

  // Phase biologique distincte de la phase nutritionnelle ?
  const showPhaseBio =
    phaseBiologique != null && phaseBiologique !== '' && phaseBiologique !== phase;

  return (
    <div
      className="bg-bg-0 rounded-2xl p-4 border border-border/50 flex flex-col gap-4"
      data-testid="nutrition-advice-panel"
      data-state="ready"
      data-phase={phase}
    >
      {/* ─── Header : eyebrow + score ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] uppercase text-text-2 tracking-wider mt-1">
          Nutrition · Conseils
        </span>
        {score && (
          <div
            className={`flex items-baseline gap-1 px-3 py-2 rounded-xl ${TONE_BG[tone]}`}
            data-testid="nutrition-score"
            data-tone={tone}
          >
            <span className={`font-mono font-bold text-[28px] leading-none ${TONE_TEXT[tone]}`}>
              {score.total}
            </span>
            <span className="text-[11px] text-text-2 uppercase">/100</span>
          </div>
        )}
      </div>

      {/* ─── Phase nutritionnelle ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-100 text-accent-600"
            data-testid="nutrition-phase-badge"
          >
            <Wheat size={14} aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-wider font-medium">
              {PHASE_LABEL[phase]} / {targets.poidsMinKg}-{targets.poidsMaxKg} kg
            </span>
          </span>
        </div>
        <p className="text-[12px] text-text-1 mt-1.5 leading-snug">{targets.objectif}</p>
        {showPhaseBio && (
          <p className="text-[10px] uppercase text-text-2 mt-1 tracking-wider">
            Phase biologique : {phaseBiologique}
          </p>
        )}
      </div>

      {/* ─── Cibles nutriments ────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        data-testid="nutrition-targets-grid"
      >
        <NutrientCell
          label="Protéines"
          value={`${targets.proteinesPctMin}-${targets.proteinesPctMax}%`}
        />
        <NutrientCell
          label="Lysine"
          value={`${targets.lysinePctMin}-${targets.lysinePctMax}%`}
        />
        <NutrientCell label="Calcium" value={`${targets.calciumPct}%`} />
        <NutrientCell label="Phosphore" value={`${targets.phosphorePct}%`} />
      </div>

      {/* ─── Vitamines clés ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase text-text-2 tracking-wider mr-1">
          Vitamines :
        </span>
        {targets.vitaminesCles.map((v) => (
          <span
            key={v}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-bg-1 border border-border/50 text-[10px] uppercase text-text-1 tracking-wider whitespace-nowrap"
          >
            {v}
          </span>
        ))}
      </div>

      {/* ─── Conseils ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2" data-testid="nutrition-advice-list">
        {targets.conseilsBase.map((c, i) => (
          <AdviceLine
            key={`base-${i}`}
            icon={Lightbulb}
            iconClass="text-accent"
            text={c}
          />
        ))}
        {dynamicAdvice.map((a, i) => {
          const Icon = ADVICE_ICON[a.type];
          return (
            <AdviceLine
              key={`dyn-${i}`}
              icon={Icon}
              iconClass={ADVICE_COLOR[a.type]}
              text={a.message}
            />
          );
        })}
      </div>

      {/* ─── Breakdown sous-scores ────────────────────────────────────────── */}
      {score && (
        <div className="border-t border-border/50 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="small"
            className="w-full flex items-center justify-between text-[11px] uppercase text-text-2 tracking-wider"
            onClick={() => setBreakdownOpen((v) => !v)}
            aria-expanded={breakdownOpen}
            data-testid="nutrition-breakdown-toggle"
            style={{ borderRadius: 0, padding: 0, height: 'auto' }}
          >
            <span>Détail score</span>
            {breakdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
          {breakdownOpen && (
            <div
              className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3"
              data-testid="nutrition-breakdown"
            >
              <SubScoreBar label="Protéines" value={score.proteines} />
              <SubScoreBar label="GMQ" value={score.gmq} />
              <SubScoreBar label="IC" value={score.ic} />
              <SubScoreBar label="Santé" value={score.sante} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NutritionAdvicePanel;
