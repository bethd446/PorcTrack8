import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  TrendingUp, ChevronRight, Droplets, ArrowUpRight,
  Scale, AlertCircle, PackageCheck
} from 'lucide-react';
import { PorceletIcon } from '../../components/icons';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import {
  KpiCard,
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

      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        truie: b.truie,
        vivants: b.vivants ?? 0,
        ageJours,
        terrainPhase,
        weight,
        bande: b
      };
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
          <AgritechHeader
            title="ENGRAISSEMENT"
            subtitle="Phase de finition · J100 → J180"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Summary Stats ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="Bandes"
                value={summary.nbPortees}
                icon={<TrendingUp size={14} className="text-accent" />}
              />
              <KpiCard
                label="Effectif"
                value={summary.totalVivants}
                tone="success"
              />
              <KpiCard
                label="Poids Moyen"
                value={summary.avgWeight}
                unit="kg"
              />
              <KpiCard
                label="Loges Occ."
                value={`${occupation.occupees}/${occupation.capacite}`}
                tone={occupation.alerte === 'FULL' ? 'critical' : 'success'}
              />
            </div>

            {/* ── Liste des Bandes (EngraissementCard) ─────────────────── */}
            <SectionDivider label={`Suivi Engraissement · ${summary.nbPortees}`} />

            {portees.length === 0 ? (
              <EmptyState />
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
  terrainPhase: string | null;
  weight: number;
  bande: any;
}

const EngraissementCard: React.FC<{ data: EngraissementRowData; onOpen: () => void }> = ({ data, onOpen }) => {
  const isTransitionRequired = data.terrainPhase && data.terrainPhase === 'FINITION';
  const currentAliment = determinerAliment(data.weight);
  const feedConfig = FARM_CONFIG.FEED_CONFIG[currentAliment as keyof typeof FARM_CONFIG.FEED_CONFIG];

  const weightTarget = 100;
  const weightProgress = Math.min(100, (data.weight / weightTarget) * 100);

  return (
    <div
      onClick={onOpen}
      className={`card-dense flex flex-col gap-4 p-4 border-l-4 transition-all active:scale-[0.98] cursor-pointer ${
        isTransitionRequired ? 'border-l-accent animate-pulse-slow' : 'border-l-bg-2'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-text-0 font-mono">{data.idPortee}</h3>
            <Chip tone="default" label={`${data.vivants} porcs`} size="xs" />
          </div>
          <p className="text-[11px] text-text-2 mt-0.5">
            Mère: {data.truie || '—'} · Âge: <span className="text-text-1 font-mono">{data.ageJours}j</span>
          </p>
        </div>
        {isTransitionRequired ? (
          <Chip tone="accent" label={`➜ ${PHASE_LABEL.FINITION}`} size="sm" icon={<ArrowUpRight size={10} />} />
        ) : (
          <Chip tone="default" label="Engraissement" size="sm" />
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
          <div className="mt-1 text-[9px] text-text-2 font-mono leading-tight">
            Maïs: {feedConfig?.formule.mais}% | KPC: {feedConfig?.formule.kpc_5}%
          </div>
        </div>
      </div>

      {isTransitionRequired && (
        <button
          className="w-full bg-accent text-bg-0 py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2"
          onClick={(e) => { e.stopPropagation(); /* TODO: Transition to Finition */ }}
        >
          <PackageCheck size={16} />
          Passer en Finition
        </button>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up">
    <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
      <TrendingUp size={48} />
    </div>
    <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
      Engraissement vide
    </h3>
    <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
      Les porcs entrent en engraissement vers J100.
    </p>
  </div>
);

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
