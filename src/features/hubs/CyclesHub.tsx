import React, { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Baby,
  PackageCheck,
  TrendingUp,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { KpiCard, SectionDivider, HubTile } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  computeBandePhase,
  filterRealPortees,
  countSousMere,
  countSevres,
} from '../../services/bandesAggregator';
import type { BandePorcelets, Truie } from '../../types/farm';

/**
 * CyclesHub — pipeline de production + accès sous-hubs.
 * ═══════════════════════════════════════════════════════
 *
 * Remplace l'ancien CyclesHub (4 HubTile statiques) par un pipeline visuel
 * horizontal à 5 étapes (Gestation → Maternité → Post-sevrage → Engraissement
 * → Finition) avec compteurs live calculés depuis `useFarm()` + un summary
 * rapide (porcelets vivants, prochaines sorties abattoir).
 *
 * Chaque étape du pipeline est cliquable et mène à sa vue dédiée :
 *  - Gestation       → /cycles/repro
 *  - Maternité       → /cycles/maternite
 *  - Post-sevrage    → /cycles/post-sevrage
 *  - Engraissement   → /cycles/engraissement
 *  - Finition        → /cycles/finition (nouveau)
 *
 * Les 4 HubTiles historiques sont conservés en dessous pour la navigation
 * d'appoint ("Voir …"), cohérents avec le reste de l'UX hub.
 */
const CyclesHub: React.FC = () => {
  const { truies, bandes } = useFarm();

  const stats = useMemo(() => computePipelineStats(truies, bandes), [truies, bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="CYCLES"
            subtitle="Pipeline de production · naisseur-engraisseur"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Summary strip — production globale */}
            <div
              role="group"
              aria-label="Résumé pipeline"
              className="grid grid-cols-2 gap-3"
            >
              <KpiCard
                label="Porcelets vivants"
                value={stats.totalPorcelets}
                tone="success"
              />
              <KpiCard
                label="Sorties abattoir"
                value={stats.sortiesAbattoir}
                unit="bandes"
                tone={stats.sortiesAbattoir > 0 ? 'warning' : 'default'}
              />
            </div>

            {/* Pipeline visuel 5 étapes */}
            <SectionDivider label="Pipeline production" />
            <PipelineBar stages={stats.stages} />

            {/* Sous-hubs — accès détaillés */}
            <SectionDivider label="Vues opérationnelles" />
            <div className="flex flex-col gap-3">
              <HubTile
                icon={<Heart size={22} />}
                title="Reproduction"
                subtitle="Saillies · gestation · retours"
                to="/cycles/repro"
                tone="accent"
                count={stats.stages.gestation}
              />
              <HubTile
                icon={<Baby size={22} />}
                title="Maternité"
                subtitle="Truies allaitantes · sous mère"
                to="/cycles/maternite"
                tone="amber"
                count={stats.stages.maternite}
              />
              <HubTile
                icon={<PackageCheck size={22} />}
                title="Post-sevrage"
                subtitle="Porcelets sevrés · J+0 à J+70"
                to="/cycles/post-sevrage"
                count={stats.stages.postSevrage}
              />
              <HubTile
                icon={<TrendingUp size={22} />}
                title="Engraissement"
                subtitle="Séparation par sexe · croissance"
                to="/cycles/engraissement"
                count={stats.stages.engraissement}
              />
              <HubTile
                icon={<Trophy size={22} />}
                title="Finition"
                subtitle="Proches poids abattage · ≥80 kg"
                to="/cycles/finition"
                tone="amber"
                count={stats.stages.finition}
              />
            </div>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants locaux ────────────────────────────────────────────────

interface PipelineStages {
  gestation: number;
  maternite: number;
  postSevrage: number;
  engraissement: number;
  finition: number;
}

interface PipelineStats {
  stages: PipelineStages;
  totalPorcelets: number;
  sortiesAbattoir: number;
}

interface PipelineStageDef {
  key: keyof PipelineStages;
  label: string;
  duration: string;
  icon: React.ReactNode;
  to: string;
}

const STAGE_DEFS: readonly PipelineStageDef[] = [
  { key: 'gestation', label: 'Gestation', duration: '115 j', icon: <Heart size={16} aria-hidden="true" />, to: '/cycles/repro' },
  { key: 'maternite', label: 'Maternité', duration: '21 j', icon: <Baby size={16} aria-hidden="true" />, to: '/cycles/maternite' },
  { key: 'postSevrage', label: 'Post-sevrage', duration: '70 j', icon: <PackageCheck size={16} aria-hidden="true" />, to: '/cycles/post-sevrage' },
  { key: 'engraissement', label: 'Engraissement', duration: '90 j', icon: <TrendingUp size={16} aria-hidden="true" />, to: '/cycles/engraissement' },
  { key: 'finition', label: 'Finition', duration: '≥90 kg', icon: <Trophy size={16} aria-hidden="true" />, to: '/cycles/finition' },
] as const;

interface PipelineBarProps {
  stages: PipelineStages;
}

/**
 * Barre pipeline horizontale scrollable sur mobile.
 * Chaque étape = bouton accessible (role="link" natif via onClick navigation).
 */
const PipelineBar: React.FC<PipelineBarProps> = ({ stages }) => {
  const navigate = useNavigate();

  return (
    <div
      className="card-dense !p-3 overflow-x-auto"
      role="group"
      aria-label="Pipeline de production porcine"
    >
      <ol className="flex items-stretch gap-1 min-w-max">
        {STAGE_DEFS.map((stage, idx) => {
          const count = stages[stage.key];
          const isLast = idx === STAGE_DEFS.length - 1;
          return (
            <React.Fragment key={stage.key}>
              <li className="flex flex-col items-stretch">
                <button
                  type="button"
                  onClick={() => navigate(stage.to)}
                  aria-label={`${stage.label} · ${count} · durée ${stage.duration}`}
                  className="pressable group flex flex-col items-center gap-1 rounded-md px-3 py-2 bg-bg-2 hover:bg-bg-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 min-w-[84px]"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-bg-0 text-accent" aria-hidden="true">
                    {stage.icon}
                  </span>
                  <span className="agritech-heading uppercase text-[10px] tracking-wide text-text-1 text-center leading-tight">
                    {stage.label}
                  </span>
                  <span className="font-mono tabular-nums text-[18px] font-bold text-text-0 leading-none">
                    {count}
                  </span>
                  <span className="font-mono text-[9px] text-text-2 uppercase tracking-wide">
                    {stage.duration}
                  </span>
                </button>
              </li>
              {!isLast ? (
                <li
                  className="flex items-center px-1 text-text-2"
                  aria-hidden="true"
                >
                  <ChevronRight size={14} />
                </li>
              ) : null}
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
};

// ─── Helpers métier ────────────────────────────────────────────────────────

const FINITION_SEUIL_KG = 80;
const POIDS_SEVRAGE_KG = 25;
const GMQ_POST_SEVRAGE_KG = 0.65; // gain moyen quotidien (Large White tropical CI)

/**
 * Parse date dd/MM/yyyy ou ISO.
 */
function parseDate(s?: string): Date | null {
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

/**
 * Estimation poids vif d'un porcelet (bande) depuis sa date de sevrage.
 * Heuristique linéaire simple : 25 kg au sevrage + 0.65 kg/j jusqu'à 110 kg.
 */
function estimateWeightKg(bande: BandePorcelets, today: Date): number {
  const sevrage = parseDate(bande.dateSevrageReelle || bande.dateSevragePrevue);
  if (!sevrage) return 0;
  const j = daysBetween(sevrage, today);
  return Math.min(POIDS_SEVRAGE_KG + j * GMQ_POST_SEVRAGE_KG, 110);
}

/**
 * Une bande est considérée en "finition" si son poids estimé ≥ 80 kg
 * (peu importe qu'elle soit catégorisée POST_SEVRAGE ou ENGRAISSEMENT par la
 * phase — la finition est une sous-catégorie de l'engraissement basée sur
 * le poids, pas la durée).
 */
function isFinition(bande: BandePorcelets, today: Date): boolean {
  if (!/sevr/i.test(bande.statut ?? '')) return false;
  return estimateWeightKg(bande, today) >= FINITION_SEUIL_KG;
}

/**
 * Compteurs live du pipeline :
 *  - Gestation       : truies pleines/gestantes (statut contient "pleine" ou "gest")
 *  - Maternité       : truies allaitantes (statut contient "maternit" ou "allait" ou "lactat")
 *  - Post-sevrage    : bandes en phase POST_SEVRAGE (sevrées <70 j)
 *  - Engraissement   : bandes en phase ENGRAISSEMENT (sevrées ≥70 j)
 *  - Finition        : bandes en engraissement avec poids estimé ≥80 kg
 *
 * Total porcelets = vivants (sous mère + sevrés). Sorties abattoir = bandes
 * en finition prêtes à la vente.
 */
function computePipelineStats(
  truies: readonly Truie[],
  bandes: readonly BandePorcelets[]
): PipelineStats {
  const today = new Date();
  const realPortees = filterRealPortees([...bandes]);

  let gestation = 0;
  let maternite = 0;
  for (const t of truies) {
    const s = (t.statut ?? '').toLowerCase();
    if (/maternit|allait|lactat/i.test(s)) {
      maternite += 1;
    } else if (/pleine|gest/i.test(s)) {
      gestation += 1;
    }
  }

  let postSevrage = 0;
  let engraissement = 0;
  let finition = 0;
  for (const b of realPortees) {
    const phase = computeBandePhase(b, today);
    if (phase === 'POST_SEVRAGE') postSevrage += 1;
    else if (phase === 'ENGRAISSEMENT') engraissement += 1;
    if (isFinition(b, today)) finition += 1;
  }

  const sm = countSousMere(realPortees);
  const sv = countSevres(realPortees);
  const totalPorcelets = sm.porcelets + sv.porcelets;

  return {
    stages: { gestation, maternite, postSevrage, engraissement, finition },
    totalPorcelets,
    sortiesAbattoir: finition,
  };
}

export default CyclesHub;
