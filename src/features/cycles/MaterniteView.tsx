import React, { useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  Baby, Plus, Scale, Droplets,
  ArrowUpRight, AlertTriangle, Lock
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
import { TruieIcon } from '../../components/icons';
import QuickMiseBasForm from '../../components/forms/QuickMiseBasForm';
import { useFarm } from '../../context/FarmContext';
import {
  logesMaterniteOccupation,
  filterRealPortees,
} from '../../services/bandesAggregator';
import { findBandeForTruie } from '../../services/reproductionDashboard';
import { FARM_CONFIG } from '../../config/farm';
import {
  computePhaseTerrain,
  detectPendingTransitions,
} from '../../services/phaseEngine';
import type { BandePorcelets, Truie } from '../../types/farm';
import {
  classifyCyclePhaseCard,
  computeRemaining,
  getCycleTreatmentStyle,
  TREATMENT_RANK,
  type CycleTreatment,
} from '../../utils/cycleTreatments';

const MATERNITE_PHASE_TONE = 'var(--color-info)';
const MATERNITE_PHASE_DAYS = FARM_CONFIG.SEVRAGE_AGE_JOURS ?? 28;

/**
 * MaterniteView — Hub Cycles / Maternité
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte Premium Agritech :
 * - Intégration Phase Engine (Sevrage J28)
 * - Monitoring nutritionnel (Truie Lactation)
 * - Suivi des pesées milestones
 */

// ─── Constantes métier ──────────────────────────────────────────────────────
const SEVRAGE_PROCHE_JOURS = 25;
const MORTALITE_SEUIL_PCT = 15;
const PESEE_MILESTONES = [3, 7, 14, 21, 28];

const MaterniteView: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes, refreshData } = useFarm();

  const [miseBasOpen, setMiseBasOpen] = useState(false);
  const [miseBasDefaultTruieId, setMiseBasDefaultTruieId] = useState<string | undefined>();

  const openMiseBas = (truieId?: string): void => {
    setMiseBasDefaultTruieId(truieId);
    setMiseBasOpen(true);
  };

  const today = useMemo(() => new Date(), []);

  const truiesEnMat = useMemo<Truie[]>(
    () =>
      truies
        .filter(t => /maternit|allait|lactation/i.test(t.statut ?? ''))
        .sort((a, b) =>
          a.displayId.localeCompare(b.displayId, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        ),
    [truies]
  );

  const porteesReelles = useMemo(() => filterRealPortees(bandes), [bandes]);
  const pendingTransitions = useMemo(() => detectPendingTransitions(porteesReelles, today), [porteesReelles, today]);

  const rows = useMemo(() => {
    const enriched = truiesEnMat.map(truie => {
      const portee = getTruiePortee(truie, porteesReelles);
      const jSinceMB = daysSince(portee?.dateMB, today);
      const terrainPhase = portee ? computePhaseTerrain(portee, today) : null;

      const transition = portee ? pendingTransitions.find(t => t.bandeId === portee.id) : null;
      const status = {
        isBloquant: transition?.isBloquant ?? false,
        joursEnRetard: transition?.joursEnRetard ?? 0,
        urgence: transition?.urgence ?? 'NORMALE'
      };

      const treatment = classifyCyclePhaseCard(
        {
          statut: portee?.statut ?? truie.statut,
          dayInPhase: jSinceMB,
          phaseDays: MATERNITE_PHASE_DAYS,
        },
        today,
        'maternite',
      );

      return { truie, portee, jSinceMB, terrainPhase, status, treatment };
    });

    return enriched.sort((a, b) => {
      const r = TREATMENT_RANK[a.treatment] - TREATMENT_RANK[b.treatment];
      if (r !== 0) return r;
      const remA = computeRemaining({ dayInPhase: a.jSinceMB, phaseDays: MATERNITE_PHASE_DAYS }) ?? Number.MAX_SAFE_INTEGER;
      const remB = computeRemaining({ dayInPhase: b.jSinceMB, phaseDays: MATERNITE_PHASE_DAYS }) ?? Number.MAX_SAFE_INTEGER;
      if (remA !== remB) return remA - remB;
      return a.truie.displayId.localeCompare(b.truie.displayId, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [truiesEnMat, porteesReelles, today, pendingTransitions]);

  const summary = useMemo(() => {
    const occupation = logesMaterniteOccupation(truies);
    const totalVivants = rows.reduce((acc, r) => acc + (r.portee?.vivants ?? 0), 0);
    const totalMorts = rows.reduce((acc, r) => acc + (r.portee?.morts ?? 0), 0);
    const totalNV = rows.reduce((acc, r) => acc + (r.portee?.nv ?? 0), 0);
    const mortsGlobalPct = totalNV > 0 ? (totalMorts / totalNV) * 100 : 0;
    const procheSevrage = rows.some(r => r.jSinceMB !== null && r.jSinceMB >= SEVRAGE_PROCHE_JOURS);

    return {
      occupation,
      nbTruies: truiesEnMat.length,
      totalVivants,
      totalMorts,
      mortsGlobalPct,
      procheSevrage,
    };
  }, [truies, rows, truiesEnMat.length]);

  const handleRefresh = async (e: CustomEvent<{ complete: () => void }>): Promise<void> => {
    await refreshData();
    e.detail.complete();
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <TopBarSync
            crumbs={['Cycles', 'Maternité']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header>
              <Eyebrow dotColor="accent">Cycle · Maternité</Eyebrow>
              <h1
                className="text-page-title"
                style={{ margin: '8px 0 4px' }}
              >
                Maternité
              </h1>
              <div
                className="text-body"
                style={{ color: 'var(--muted)' }}
              >
                J0 → J28 · {summary.nbTruies} portées en cours
              </div>
            </header>
            {/* ── Primary Action ───────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => openMiseBas()}
              className="pressable w-full h-[58px] rounded-xl bg-accent text-bg-0 font-mono text-[13px] font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
            >
              <Plus size={20} />
              <span>Saisir une mise-bas</span>
            </button>

            {/* ── Summary KPI ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCardV6
                label="Truies"
                value={summary.nbTruies}
              />
              <KpiCardV6
                label="Saturation"
                value={`${summary.occupation.tauxPct}%`}
                accentColor={
                  summary.occupation.alerte === 'FULL'
                    ? 'var(--color-danger, #EF4444)'
                    : summary.occupation.alerte === 'HIGH'
                      ? 'var(--amber-pork)'
                      : undefined
                }
              />
              <KpiCardV6
                label="Porcelets s/m"
                value={summary.totalVivants}
              />
              <KpiCardV6
                label="Mortalité"
                value={`${summary.mortsGlobalPct.toFixed(1)}%`}
                accentColor={summary.mortsGlobalPct > MORTALITE_SEUIL_PCT ? 'var(--color-danger, #EF4444)' : undefined}
                trendDir={summary.mortsGlobalPct > MORTALITE_SEUIL_PCT ? 'down' : 'neutral'}
              />
            </div>

            {/* ── Liste des Truies ────────────────────────────────────── */}
            <SectionDivider label={`Suivi Allaitement · ${summary.nbTruies}`} />

            {rows.length === 0 ? (
              <EmptyState
                icon={<TruieIcon size={32} aria-hidden="true" />}
                title="Maternité vide"
                description="Dès qu'une truie met bas, elle apparaîtra ici pour son suivi d'allaitement."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {rows.map((r) => (
                  <MaterniteCard
                    key={r.truie.id}
                    data={r}
                    treatment={r.treatment}
                    onDetail={() => navigate(`/troupeau/truies/${r.truie.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </AgritechLayout>

        <QuickMiseBasForm
          isOpen={miseBasOpen}
          onClose={() => setMiseBasOpen(false)}
          defaultTruieId={miseBasDefaultTruieId}
          onSuccess={() => refreshData()}
        />
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface MaterniteStatus {
  isBloquant: boolean;
  joursEnRetard: number;
  urgence: string;
}

const MaterniteCard: React.FC<{
  data: { truie: Truie; portee?: BandePorcelets; jSinceMB: number | null; terrainPhase: string | null; status: MaterniteStatus };
  treatment: CycleTreatment;
  onDetail: () => void;
}> = ({ data, treatment, onDetail }) => {
  const navigate = useNavigate();
  const { truie, portee, jSinceMB, terrainPhase, status } = data;
  const { isBloquant, joursEnRetard } = status;

  const isTransitionRequired = terrainPhase && terrainPhase !== 'SOUS_MERE';
  const mortsPct = mortsPercent(portee);
  const feedConfig = FARM_CONFIG.FEED_CONFIG.TRUIE_LACTATION;

  // Boucle peut déjà contenir "B." en préfixe selon source de données — on
  // strip pour éviter "B.B.24", puis on re-préfixe une seule fois.
  const boucleClean = (truie.boucle ?? '').toString().replace(/^B\.\s*/i, '').trim();
  const boucleLabel = boucleClean ? `B.${boucleClean}` : 'B.—';

  const treatmentStyle = getCycleTreatmentStyle(treatment, MATERNITE_PHASE_TONE);
  const isUrgent = treatment === 'urgent';
  const isResolu = treatment === 'resolu';
  const remainingDays = computeRemaining({ dayInPhase: jSinceMB, phaseDays: MATERNITE_PHASE_DAYS });
  const eyebrowText = isBloquant
    ? `En retard de ${joursEnRetard}j`
    : isUrgent && remainingDays !== null
      ? remainingDays <= 0
        ? 'À sevrer maintenant'
        : `À sevrer dans ${remainingDays}j`
      : isResolu
        ? 'Résolu'
        : 'Maternité';

  return (
    <div
      onClick={onDetail}
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
                color: isBloquant ? 'var(--color-danger, #EF4444)' : 'var(--ink)',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {truie.displayId}
            </h3>
            {truie.nom && <span className="text-[12px] text-text-2 truncate max-w-[80px]">{truie.nom}</span>}
            <Chip tone="default" label={boucleLabel} size="xs" />
          </div>
          <p className="text-[11px] text-text-2 mt-0.5">
            {portee ? `Portée: ${portee.idPortee}` : 'Aucune portée liée'}
          </p>
        </div>
        {!isUrgent && !isBloquant && !isTransitionRequired && (
          <Chip tone="accent" label={`J+${jSinceMB || 0} Lactation`} size="sm" />
        )}
      </div>

      {/* Message d'action unique en cas d'urgence */}
      {(isBloquant || isUrgent) && (
        <p className="text-[12px] leading-snug text-text-1">
          Sevre la portée pour débloquer.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Portée Stats */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-text-2">Portée</span>
            <Baby size={12} className="text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[20px] font-bold font-mono text-text-0">{portee?.vivants || 0}</span>
            <span className="text-[10px] text-text-2 uppercase">vivants</span>
          </div>
          {mortsPct > 0 && (
            <div className={`text-[10px] mt-1 font-mono ${mortsPct > MORTALITE_SEUIL_PCT ? 'text-red font-bold' : 'text-text-2'}`}>
              Mortalité: {Math.round(mortsPct)}%
            </div>
          )}
        </div>

        {/* Nutrition Truie */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-text-2">Ration</span>
            <Droplets size={12} className="text-accent" />
          </div>
          <div className="text-[14px] font-bold text-accent">
            {truie.ration} kg/j
          </div>
          <div className="mt-1 text-[10px] text-text-2 font-mono leading-tight truncate">
            Plan: {feedConfig.label}
          </div>
        </div>
      </div>

      {/* Milestones de pesées */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-1.5">
          {PESEE_MILESTONES.map(m => {
            const isPast = jSinceMB !== null && jSinceMB > m;
            const isCurrent = jSinceMB === m;
            return (
              <div
                key={m}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                  isCurrent ? 'bg-amber border-amber text-bg-0 shadow-md scale-110' :
                  isPast ? 'bg-bg-2 border-border text-text-2 opacity-50' :
                  'bg-bg-1 border-dashed border-border text-text-2'
                }`}
              >
                {m}
              </div>
            );
          })}
        </div>
        <button
          disabled={isBloquant}
          onClick={(e) => { e.stopPropagation(); navigate(`/troupeau/truies/${truie.id}?tab=sante`); }}
          className="w-8 h-8 rounded-lg bg-bg-2 flex items-center justify-center text-text-2 hover:text-accent transition-colors disabled:opacity-30 disabled:grayscale"
        >
          {isBloquant ? <Lock size={14} /> : <Scale size={14} />}
        </button>
      </div>

      {isTransitionRequired && (
        <button
          className={`w-full py-2.5 rounded-xl font-bold text-[12px] tracking-wider flex items-center justify-center gap-2 shadow-lg ${
            isBloquant ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-gold text-bg-0 shadow-gold/20'
          }`}
          onClick={(e) => { e.stopPropagation(); navigate(`/troupeau/bandes/${portee?.id}?action=sevrage`); }}
        >
          <ArrowUpRight size={16} />
          {isBloquant ? 'Sevrer maintenant' : 'Confirmer le sevrage'}
        </button>
      )}
    </div>
  );
};


// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function daysSince(s: string | undefined, today: Date): number | null {
  const d = parseDate(s);
  if (!d) return null;
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getTruiePortee(truie: Truie, bandes: BandePorcelets[]): BandePorcelets | undefined {
  // Délégation à findBandeForTruie (source unique de vérité pour la jointure
  // truie ↔ bande). Match prioritaire UUID, puis code_id, puis boucle.
  return findBandeForTruie(truie, bandes) ?? undefined;
}

function mortsPercent(bande?: BandePorcelets): number {
  if (!bande || !bande.nv) return 0;
  return (bande.morts ?? 0) / bande.nv * 100;
}

export default MaterniteView;
