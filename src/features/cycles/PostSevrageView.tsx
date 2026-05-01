import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  PackageCheck, Droplets,
  ArrowUpRight, TrendingUp, Lightbulb, Scale, AlertTriangle
} from 'lucide-react';
import { PorceletIcon } from '../../components/icons';
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
  logesPostSevrageOccupation,
} from '../../services/bandesAggregator';
import { FARM_CONFIG } from '../../config/farm';
import {
  computePhaseTerrain,
  detectPendingTransitions,
  determinerAliment,
  PHASE_LABEL
} from '../../services/phaseEngine';
import { WEIGHTS_RELEVE, ANALYSE_RECOMMANDATIONS } from '../../config/weightsReleve';
import { AlertCircle, Lock } from 'lucide-react';
import QuickPeseeForm from '../../components/forms/QuickPeseeForm';
import {
  classifyCyclePhaseCard,
  computeRemaining,
  getCycleTreatmentStyle,
  TREATMENT_RANK,
  type CycleTreatment,
} from '../../utils/cycleTreatments';

const POSTSEVR_PHASE_TONE = 'var(--color-accent-400)';
const POSTSEVR_PHASE_DAYS = FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35;
const POSTSEVR_PHASE_OFFSET = FARM_CONFIG.SEVRAGE_AGE_JOURS ?? 28;

/**
 * PostSevrageView — Hub Cycles / Post-sevrage
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte Premium Agritech :
 * - Intégration Phase Engine & Nutrition
 * - Visualisation des pesées terrain
 * - Analyse GMQ et recommandations
 */
const PostSevrageView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes } = useFarm();

  const { portees, summary, occupation } = useMemo(() => {
    const realPortees = filterRealPortees(bandes);
    const today = new Date();
    const inPhase = realPortees.filter(
      (b) => computeBandePhase(b, today) === 'POST_SEVRAGE'
    );

    const pendingTransitions = detectPendingTransitions(realPortees, today);

    const rows: PostSevrageRowData[] = inPhase.map((b) => {
      const mbDate = parseDateFr(b.dateMB || '');
      const ageJours = mbDate ? daysBetween(mbDate, today) : null;
      const terrainPhase = computePhaseTerrain(b, today);

      const transition = pendingTransitions.find(t => t.bandeId === b.id);
      const status = {
        isBloquant: transition?.isBloquant ?? false,
        joursEnRetard: transition?.joursEnRetard ?? 0,
        urgence: transition?.urgence ?? 'NORMALE'
      };

      // Lien avec les pesées réelles si l'ID matche (ex: 26-T1-01 -> Loge 1 ?)
      // Pour cet exemple, on simule un mapping simple Loge 1-4
      const logeIdx = realPortees.indexOf(b) % 4 + 1;
      const releve = WEIGHTS_RELEVE[`LOGE_${logeIdx}`];

      const dayInPhase = ageJours !== null
        ? Math.max(0, ageJours - POSTSEVR_PHASE_OFFSET)
        : null;
      const treatment = classifyCyclePhaseCard(
        {
          statut: b.statut,
          dayInPhase,
          phaseDays: POSTSEVR_PHASE_DAYS,
        },
        today,
        'postsevr',
      );

      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        truie: b.truie,
        vivants: b.vivants ?? 0,
        ageJours,
        dayInPhase,
        terrainPhase,
        releve,
        bande: b,
        status,
        treatment,
      };
    });

    rows.sort((a, b) => {
      const r = TREATMENT_RANK[a.treatment] - TREATMENT_RANK[b.treatment];
      if (r !== 0) return r;
      const remA = computeRemaining({ dayInPhase: a.dayInPhase, phaseDays: POSTSEVR_PHASE_DAYS }) ?? Number.MAX_SAFE_INTEGER;
      const remB = computeRemaining({ dayInPhase: b.dayInPhase, phaseDays: POSTSEVR_PHASE_DAYS }) ?? Number.MAX_SAFE_INTEGER;
      if (remA !== remB) return remA - remB;
      return a.idPortee.localeCompare(b.idPortee, 'fr');
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
      occupation: logesPostSevrageOccupation(realPortees, today),
    };
  }, [bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <TopBarSync
            crumbs={['Cycles', 'Post-sevrage']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header>
              <Eyebrow dotColor="amber">Cycle · Post-sevrage</Eyebrow>
              <h1
                style={{
                  fontFamily: 'BigShoulders, system-ui, sans-serif',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Post-sevrage
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                J28 → J60 · {summary.nbPortees} portées
              </div>
            </header>
            {/* ── Summary Stats ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCardV6
                label="Portées"
                value={summary.nbPortees}
              />
              <KpiCardV6
                label="Porcelets"
                value={summary.totalVivants}
              />
              <KpiCardV6
                label="Âge Moyen"
                value={summary.avgAge}
                unit="j"
              />
              <KpiCardV6
                label="Saturation"
                value={`${occupation.tauxPct}%`}
                accentColor={
                  occupation.alerte === 'FULL'
                    ? 'var(--color-danger, #EF4444)'
                    : occupation.alerte === 'HIGH'
                      ? 'var(--amber-pork)'
                      : undefined
                }
              />
            </div>

            {/* ── Analyse & Conseils ────────────────────────────────────── */}
            <section className="space-y-3">
              <SectionDivider label="Diagnostic Terrain" />
              <div className="grid grid-cols-1 gap-3">
                {ANALYSE_RECOMMANDATIONS.map((rec, i) => (
                  <div key={i} className="card-dense bg-accent/5 border-accent/20 flex gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Lightbulb size={16} className="text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[12px] font-bold text-text-0 uppercase font-mono">{rec.titre}</h4>
                      <p className="text-[11px] text-text-2 mt-1 leading-relaxed">
                        {rec.constat} <span className="text-accent font-medium">{rec.action}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Liste des Loges / Bandes ──────────────────────────────── */}
            <section className="space-y-4">
              <SectionDivider label="Suivi des Portées" />
              {portees.length === 0 ? (
                <EmptyState
                  icon={<PorceletIcon size={32} aria-hidden="true" />}
                  title="Aucune portée post-sevrage"
                  description="Les portées arriveront après sevrage (J+28). Elles resteront ici jusqu'à J+63."
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {portees.map((p) => (
                    <PostSevrageCard
                      key={p.id}
                      data={p}
                      onOpen={() => navigate(`/troupeau/bandes/${encodeURIComponent(p.id)}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface PostSevrageRowData {
  id: string;
  idPortee: string;
  truie?: string;
  vivants: number;
  ageJours: number | null;
  dayInPhase: number | null;
  terrainPhase: string | null;
  releve?: import('../../config/weightsReleve').LogeReleve;
  bande: import('../../types/farm').BandePorcelets;
  status: {
    isBloquant: boolean;
    joursEnRetard: number;
    urgence: string;
  };
  treatment: CycleTreatment;
}

const PostSevrageCard: React.FC<{ data: PostSevrageRowData; onOpen: () => void }> = ({ data, onOpen }) => {
  const navigate = useNavigate();
  const [peseeOpen, setPeseeOpen] = useState(false);
  const isTransitionRequired = data.terrainPhase && data.terrainPhase !== 'POST_SEVRAGE';
  const { isBloquant, joursEnRetard } = data.status;

  const currentAliment = determinerAliment(data.releve?.moyenne || 10);
  const feedConfig = FARM_CONFIG.FEED_CONFIG[currentAliment as keyof typeof FARM_CONFIG.FEED_CONFIG];

  // Calcul du GMQ simulé si on a un relevé
  const gmq = data.releve ? Math.round(((data.releve.moyenne - 1.4) / (data.ageJours || 1)) * 1000) : 180;
  const gmqTarget = 220;
  const gmqProgress = Math.min(100, (gmq / gmqTarget) * 100);

  const treatmentStyle = getCycleTreatmentStyle(data.treatment, POSTSEVR_PHASE_TONE);
  const isUrgent = data.treatment === 'urgent';
  const isResolu = data.treatment === 'resolu';
  const remainingDays = computeRemaining({ dayInPhase: data.dayInPhase, phaseDays: POSTSEVR_PHASE_DAYS });
  const eyebrowText = isUrgent && remainingDays !== null
    ? `Imminent · ${remainingDays}j restant${remainingDays > 1 ? 's' : ''}`
    : isResolu
      ? 'Résolu'
      : 'Post-sevrage';

  return (
    <div
      onClick={onOpen}
      style={{
        background: treatmentStyle.background,
        border: treatmentStyle.border,
        borderRadius: 12,
        opacity: treatmentStyle.opacity,
      }}
      className={`card-dense flex flex-col gap-4 p-4 transition-all active:scale-[0.98] cursor-pointer ${
        isBloquant ? 'ring-1 ring-red-500/20' : ''
      }`}
    >
      {/* Treatment eyebrow */}
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
          style={{
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.06em',
            color: treatmentStyle.eyebrowColor,
            fontWeight: isUrgent ? 600 : 500,
            textTransform: 'uppercase',
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

      {/* Header Card */}
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              style={{
                fontFamily: 'BigShoulders, system-ui, sans-serif',
                fontSize: treatmentStyle.titleSize,
                fontWeight: treatmentStyle.titleWeight,
                color: isBloquant ? 'var(--color-danger, #EF4444)' : 'var(--ink)',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {data.idPortee}
            </h3>
            <Chip tone={isBloquant ? 'red' : 'default'} label={isBloquant ? 'BLOCAGE' : `${data.vivants} têtes`} size="xs" />
          </div>
          <p className="text-[11px] text-text-2 mt-0.5">
            Mère: {data.truie || '—'} · Âge: <span className="text-text-1 font-mono">{data.ageJours}j</span>
          </p>
          {isBloquant && (
            <div className="flex items-center gap-1.5 mt-1 animate-pulse" style={{ color: 'var(--color-danger, #EF4444)' }}>
              <AlertCircle size={14} />
              <span className="text-[10px] font-bold uppercase">Urgence Critique</span>
            </div>
          )}
        </div>
        {isTransitionRequired ? (
          <Chip tone="amber" label={`➜ ${PHASE_LABEL[data.terrainPhase!]}`} size="sm" icon={<ArrowUpRight size={10} />} className="!normal-case" />
        ) : (
          <Chip tone="teal" label="Post-sevrage" size="sm" className="!normal-case" />
        )}
      </div>

      {/* Message de blocage */}
      {isBloquant && (
        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
          <p className="text-[11px] leading-tight" style={{ color: 'var(--color-danger, #EF4444)' }}>
            <strong>Action bloquée :</strong> Retard critique de transition (+{joursEnRetard}j).
            Veuillez transférer cette loge vers l'Engraissement pour débloquer les saisies.
          </p>
        </div>
      )}

      {/* Grid Performance & Nutrition */}
      <div className="grid grid-cols-2 gap-4">
        {/* Performance Gauge (Custom) */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-text-2">GMQ Moyen</span>
            <TrendingUp size={12} className={gmq >= gmqTarget ? 'text-success' : 'text-amber'} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-bold font-mono text-text-0">{gmq}</span>
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
            <Droplets size={12} className="text-accent" />
          </div>
          <div className="text-[12px] font-bold text-accent truncate">
            {feedConfig?.label || currentAliment}
          </div>
          <div className="mt-1 text-[9px] text-text-2 font-mono leading-tight">
            Maïs: {feedConfig?.formule.mais}% | Soja: {feedConfig?.formule.tourteau_soja}%
          </div>
        </div>
      </div>

      {/* Relevé de poids / Alerte */}
      {data.releve ? (
        <div className="flex items-start gap-2 bg-bg-2/50 rounded-lg p-2 border border-border/30">
          <Scale size={14} className="text-text-2 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10px] text-text-1 italic leading-snug">
              {data.releve.alerte}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {data.releve.weights.slice(0, 8).map((w: number, i: number) => (
                <span key={i} className="text-[9px] font-mono bg-bg-1 px-1 rounded text-text-2">{w}kg</span>
              ))}
              {data.releve.weights.length > 8 && <span className="text-[9px] text-text-2">...</span>}
            </div>
          </div>
        </div>
      ) : (
        <button
          disabled={isBloquant}
          className="flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-[11px] text-text-2 hover:bg-bg-2 transition-colors disabled:opacity-30 disabled:grayscale"
          onClick={(e) => { e.stopPropagation(); setPeseeOpen(true); }}
        >
          {isBloquant ? <Lock size={12} /> : <Scale size={12} />}
          Saisir une pesée
        </button>
      )}

      {/* Footer / CTA */}
      {isTransitionRequired && (
        <button
          className={`w-full py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg ${
            isBloquant ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-amber text-bg-0 shadow-amber/20'
          }`}
          onClick={(e) => { e.stopPropagation(); navigate('/troupeau/batiments'); }}
        >
          <ArrowUpRight size={16} />
          {isBloquant ? 'Transférer maintenant' : 'Préparer loge croissance'}
        </button>
      )}

      <QuickPeseeForm isOpen={peseeOpen} onClose={() => setPeseeOpen(false)} />
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

export default PostSevrageView;
