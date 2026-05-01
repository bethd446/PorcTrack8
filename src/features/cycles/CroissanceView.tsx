import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  Droplets, ArrowUpRight,
  TrendingUp, Scale
} from 'lucide-react';
import { PorceletIcon } from '../../components/icons';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
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
  PHASE_LABEL
} from '../../services/phaseEngine';
import { WEIGHTS_RELEVE, type LogeReleve } from '../../config/weightsReleve';
import type { BandePorcelets } from '../../types/farm';

/**
 * CroissanceView — Hub Cycles / Croissance
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte Premium Agritech :
 * - Intégration Phase Engine (J63 -> J100)
 * - Monitoring nutritionnel (Aliment Croissance)
 * - Visualisation GMQ estimé
 */
const spark = (base: number): number[] =>
  Array.from({ length: 7 }, (_, i) => Math.max(1, Math.round(Math.abs(base) * (0.85 + 0.05 * i))));

const CroissanceView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes } = useFarm();

  const { portees, summary, occupation } = useMemo(() => {
    const realPortees = filterRealPortees(bandes);
    const today = new Date();
    const inPhase = realPortees.filter(
      (b) => computeBandePhase(b, today) === 'CROISSANCE'
    );

    const rows: CroissanceRowData[] = inPhase.map((b) => {
      const mbDate = parseDateFr(b.dateMB || '');
      const ageJours = mbDate ? daysBetween(mbDate, today) : null;
      const terrainPhase = computePhaseTerrain(b, today);

      // Simulation mapping pesée
      const logeIdx = (realPortees.indexOf(b) % 2) + 1; // Croissance = Loge 1-2 engraissement
      const releve = WEIGHTS_RELEVE[`LOGE_${logeIdx}`];

      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        truie: b.truie,
        vivants: b.vivants ?? 0,
        ageJours,
        terrainPhase,
        releve,
        bande: b
      };
    });

    const totalVivants = rows.reduce((acc, r) => acc + r.vivants, 0);
    const avgAge = rows.length > 0
      ? Math.round(rows.reduce((acc, r) => acc + (r.ageJours || 0), 0) / rows.length)
      : 0;

    return {
      portees: rows,
      summary: {
        nbPortees: rows.length,
        totalVivants,
        avgAge,
      },
      occupation: logesEngraissementOccupation(realPortees, today),
    };
  }, [bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="CROISSANCE"
            subtitle="Développement musculaire · J63 → J100"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Summary Stats ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCardV6
                label="Portées"
                value={summary.nbPortees}
                accentColor="var(--amber-pork)"
                spark={spark(summary.nbPortees || 1)}
              />
              <KpiCardV6
                label="Effectif"
                value={summary.totalVivants}
                spark={spark(summary.totalVivants || 1)}
              />
              <KpiCardV6
                label="Âge Moyen"
                value={summary.avgAge}
                unit="j"
                spark={spark(summary.avgAge || 1)}
              />
              <KpiCardV6
                label="Loges Occ."
                value={`${occupation.occupees}/${occupation.capacite}`}
                accentColor={occupation.alerte === 'FULL' ? 'var(--color-danger, #EF4444)' : 'var(--amber-pork)'}
                spark={spark(occupation.occupees || 1)}
              />
            </div>

            {/* ── Liste des Bandes (CroissanceCard) ───────────────────── */}
            <SectionDivider label={`Suivi Croissance · ${summary.nbPortees}`} />

            {portees.length === 0 ? (
              <EmptyState
                icon={<PorceletIcon size={32} aria-hidden="true" />}
                title="Croissance vide"
                description="Les porcelets entrent en croissance vers J63 (2 mois)."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {portees.map((p) => (
                  <CroissanceCard
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

interface CroissanceRowData {
  id: string;
  idPortee: string;
  truie?: string;
  vivants: number;
  ageJours: number | null;
  terrainPhase: string | null;
  releve?: LogeReleve;
  bande: BandePorcelets;
}

const CroissanceCard: React.FC<{ data: CroissanceRowData; onOpen: () => void }> = ({ data, onOpen }) => {
  const navigate = useNavigate();
  const isTransitionRequired = data.terrainPhase && data.terrainPhase !== 'CROISSANCE' && data.terrainPhase !== 'POST_SEVRAGE' && data.terrainPhase !== 'SOUS_MERE';
  const feedConfig = FARM_CONFIG.FEED_CONFIG.CROISSANCE;

  // GMQ Croissance : sevrage (25kg) -> maintenant
  const weight = data.releve?.moyenne || 35;
  const gmq = Math.round(((weight - 25) / ((data.ageJours || 63) - 28)) * 1000);
  const gmqTarget = 650;
  const gmqProgress = Math.min(100, (gmq / gmqTarget) * 100);

  return (
    <div
      onClick={onOpen}
      className={`card-dense flex flex-col gap-4 p-4 border-l-4 transition-all active:scale-[0.98] cursor-pointer ${
        isTransitionRequired ? 'border-l-amber animate-pulse-slow' : 'border-l-amber/50'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-text-0 font-mono">{data.idPortee}</h3>
            <Chip tone="default" label={`${data.vivants} porcs`} size="xs" />
          </div>
          <p className="text-[11px] text-text-2 mt-0.5">
            Phase: <span className="text-amber font-medium">Croissance</span> · Âge: <span className="text-text-1 font-mono">{data.ageJours}j</span>
          </p>
        </div>
        {isTransitionRequired ? (
          <Chip tone="amber" label={`➜ ${PHASE_LABEL[data.terrainPhase!]}`} size="sm" icon={<ArrowUpRight size={10} />} />
        ) : (
          <Chip tone="default" label={`${Math.round(weight)} kg`} size="sm" icon={<Scale size={10} />} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Performance Gauge */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-text-2">GMQ Phase</span>
            <TrendingUp size={12} className={gmq >= gmqTarget ? 'text-success' : 'text-amber'} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-bold font-mono text-text-0">{gmq}</span>
            <span className="text-[10px] text-text-2">g/j</span>
          </div>
          <div className="mt-2 h-1 w-full bg-bg-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${gmq >= gmqTarget ? 'bg-success' : 'bg-amber'}`}
              style={{ width: `${gmqProgress}%` }}
            />
          </div>
        </div>

        {/* Nutrition Info */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-text-2">Alimentation</span>
            <Droplets size={12} className="text-amber" />
          </div>
          <div className="text-[12px] font-bold text-amber truncate">
            {feedConfig.label}
          </div>
          <div className="mt-1 text-[9px] text-text-2 font-mono leading-tight">
            Maïs: {feedConfig.formule.mais}% | Soja: {feedConfig.formule.tourteau_soja}%
          </div>
        </div>
      </div>

      {isTransitionRequired && (
        <button
          className="w-full bg-amber text-bg-0 py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2"
          onClick={(e) => { e.stopPropagation(); navigate('/troupeau/batiments'); }}
        >
          <ArrowUpRight size={16} />
          Confirmer Engraissement
        </button>
      )}
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

export default CroissanceView;
