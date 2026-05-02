import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  TrendingUp, Droplets, ArrowUpRight,
  Scale, AlertTriangle
} from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import { default as KpiCardV6 } from '../../components/design/KpiCard';
import EmptyState from '../../components/design/EmptyState';
import {
  Chip,
  SectionDivider,
} from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  computeBandePhase,
  filterRealPortees,
  logesEngraissementOccupation,
} from '../../services/bandesAggregator';
import { FARM_CONFIG } from '../../config/farm';
import {
  computePhaseTerrain,
  determinerAliment,
  PHASE_LABEL
} from '../../services/phaseEngine';
import type { BandePorcelets } from '../../types/farm';
import {
  classifyCyclePhaseCard,
  computeRemaining,
  getCycleTreatmentStyle,
  TREATMENT_RANK,
  type CycleTreatment,
} from '../../utils/cycleTreatments';

const ENGR_PHASE_TONE = 'var(--color-secondary)';
const ENGR_PHASE_DAYS = FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS ?? 80;
const ENGR_PHASE_OFFSET =
  (FARM_CONFIG.SEVRAGE_AGE_JOURS ?? 28)
  + (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35)
  + (FARM_CONFIG.CROISSANCE_DUREE_JOURS ?? 37);

/**
 * EngraissementView — Hub Cycles / Engraissement
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte Premium Agritech :
 * - Intégration Phase Engine (J100 -> J180)
 * - Monitoring nutritionnel (Aliment Finition)
 * - Visualisation de l'avancement poids
 */
const EngraissementView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes } = useFarm();

  const { portees, summary, occupation } = useMemo(() => {
    const realPortees = filterRealPortees(bandes);
    const today = new Date();
    const inPhase = realPortees.filter(
      (b) => computeBandePhase(b, today) === 'ENGRAISSEMENT'
    );

    const rows: EngraissementRowData[] = inPhase.map((b) => {
      const mbDate = parseDateFr(b.dateMB || '');
      const ageJours = mbDate ? daysBetween(mbDate, today) : null;
      const terrainPhase = computePhaseTerrain(b, today);

      // Estimation poids linéaire
      const weight = mbDate ? Math.min(25 + (daysBetween(parseDateFr(b.dateSevrageReelle || b.dateSevragePrevue || '') || today, today) * 0.7), 110) : 60;

      const dayInPhase = ageJours !== null
        ? Math.max(0, ageJours - ENGR_PHASE_OFFSET)
        : null;
      const treatment = classifyCyclePhaseCard(
        {
          statut: b.statut,
          dayInPhase,
          phaseDays: ENGR_PHASE_DAYS,
        },
        today,
        'engrais',
      );

      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        truie: b.truie,
        vivants: b.vivants ?? 0,
        ageJours,
        dayInPhase,
        terrainPhase,
        weight,
        bande: b,
        treatment,
      };
    });

    rows.sort((a, b) => {
      const r = TREATMENT_RANK[a.treatment] - TREATMENT_RANK[b.treatment];
      if (r !== 0) return r;
      const remA = computeRemaining({ dayInPhase: a.dayInPhase, phaseDays: ENGR_PHASE_DAYS }) ?? Number.MAX_SAFE_INTEGER;
      const remB = computeRemaining({ dayInPhase: b.dayInPhase, phaseDays: ENGR_PHASE_DAYS }) ?? Number.MAX_SAFE_INTEGER;
      if (remA !== remB) return remA - remB;
      return a.idPortee.localeCompare(b.idPortee, 'fr');
    });

    const totalVivants = rows.reduce((acc, r) => acc + r.vivants, 0);
    const avgWeight = rows.length > 0
      ? Math.round(rows.reduce((acc, r) => acc + r.weight, 0) / rows.length)
      : 0;

    return {
      portees: rows,
      summary: {
        nbPortees: rows.length,
        totalVivants,
        avgWeight,
      },
      occupation: logesEngraissementOccupation(realPortees, today),
    };
  }, [bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <TopBarSync
            crumbs={['Cycles', 'Engraissement']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header>
              <Eyebrow dotColor="amber">Cycle · Engraissement</Eyebrow>
              <h1
                className="text-page-title"
                style={{ margin: '8px 0 4px' }}
              >
                Engraissement
              </h1>
              <div
                className="text-body"
                style={{ color: 'var(--muted)' }}
              >
                J95 → J137 · {summary.nbPortees} bandes
              </div>
            </header>
            {/* ── Summary Stats ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCardV6
                label="Bandes"
                value={summary.nbPortees}
              />
              <KpiCardV6
                label="Effectif"
                value={summary.totalVivants}
              />
              <KpiCardV6
                label="Poids Moyen"
                value={summary.avgWeight}
                unit="kg"
              />
              <KpiCardV6
                label="Loges Occ."
                value={`${occupation.occupees}/${occupation.capacite}`}
                accentColor={occupation.alerte === 'FULL' ? 'var(--color-danger, #EF4444)' : undefined}
              />
            </div>

            {/* ── Liste des Bandes (EngraissementCard) ─────────────────── */}
            <SectionDivider label={`Suivi Engraissement · ${summary.nbPortees}`} />

            {portees.length === 0 ? (
              <EmptyState
                icon={<TrendingUp size={32} aria-hidden="true" />}
                title="Engraissement vide"
                description="Les porcs entrent en engraissement vers J100."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {portees.map((p) => (
                  <EngraissementCard
                    key={p.id}
                    data={p}
                    onOpen={() => navigate(`/troupeau/bandes/${encodeURIComponent(p.id)}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface EngraissementRowData {
  id: string;
  idPortee: string;
  truie?: string;
  vivants: number;
  ageJours: number | null;
  dayInPhase: number | null;
  terrainPhase: string | null;
  weight: number;
  bande: BandePorcelets;
  treatment: CycleTreatment;
}

const EngraissementCard: React.FC<{ data: EngraissementRowData; onOpen: () => void }> = ({ data, onOpen }) => {
  const isTransitionRequired = data.terrainPhase && data.terrainPhase === 'FINITION';
  const currentAliment = determinerAliment(data.weight);
  const feedConfig = FARM_CONFIG.FEED_CONFIG[currentAliment as keyof typeof FARM_CONFIG.FEED_CONFIG];

  const weightTarget = 100;
  const weightProgress = Math.min(100, (data.weight / weightTarget) * 100);

  const treatmentStyle = getCycleTreatmentStyle(data.treatment, ENGR_PHASE_TONE);
  const isUrgent = data.treatment === 'urgent';
  const isResolu = data.treatment === 'resolu';
  const remainingDays = computeRemaining({ dayInPhase: data.dayInPhase, phaseDays: ENGR_PHASE_DAYS });
  const eyebrowText = isUrgent && remainingDays !== null
    ? `Imminent · ${remainingDays}j restant${remainingDays > 1 ? 's' : ''}`
    : isResolu
      ? 'Résolu'
      : 'Engraissement';

  return (
    <div
      onClick={onOpen}
      style={{
        background: treatmentStyle.background,
        border: treatmentStyle.border,
        borderRadius: 12,
        opacity: treatmentStyle.opacity,
      }}
      className="card-dense flex flex-col gap-4 p-4 transition-all active:scale-[0.98] cursor-pointer"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: -4,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: treatmentStyle.eyebrowDot,
            flexShrink: 0,
          }}
        />
        <span
          className="text-mono-micro"
          style={{
            color: treatmentStyle.eyebrowColor,
            fontWeight: isUrgent ? 600 : 500,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {eyebrowText}
        </span>
        {treatmentStyle.showAlertIcon && (
          <AlertTriangle
            size={14}
            color="var(--color-pig-deep, var(--color-pig))"
            aria-hidden="true"
            style={{ marginLeft: 'auto' }}
          />
        )}
      </div>
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: treatmentStyle.titleSize,
                fontWeight: treatmentStyle.titleWeight,
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {data.idPortee}
            </h3>
            <Chip tone="default" label={`${data.vivants} porcs`} size="xs" />
          </div>
          <p className="text-[11px] text-text-2 mt-0.5">
            Mère: {data.truie || '—'} · Âge: <span className="text-text-1 font-mono">{data.ageJours}j</span>
          </p>
        </div>
        {isTransitionRequired ? (
          <Chip tone="accent" label={PHASE_LABEL.FINITION} size="sm" icon={<ArrowUpRight size={10} />} className="!normal-case" />
        ) : (
          <Chip tone="default" label="Engraissement" size="sm" className="!normal-case" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Weight Gauge */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-text-2">Poids Estimé</span>
            <Scale size={12} className="text-accent" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-bold font-mono text-text-0">{Math.round(data.weight)}</span>
            <span className="text-[10px] text-text-2">kg</span>
          </div>
          <div className="mt-2 h-1 w-full bg-bg-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${weightProgress}%` }}
            />
          </div>
        </div>

        {/* Nutrition Info */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-text-2">Alimentation</span>
            <Droplets size={12} className="text-accent" />
          </div>
          <div className="text-[12px] font-bold text-accent truncate">
            {feedConfig?.label || currentAliment}
          </div>
          <div className="mt-1 text-[10px] text-text-2 font-mono leading-tight truncate">
            Maïs: {feedConfig?.formule.mais}% | KPC: {feedConfig?.formule.kpc_5}%
          </div>
        </div>
      </div>

    </div>
  );
};


// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDateFr(s: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function daysBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default EngraissementView;
