import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  Coins, TrendingUp, Calendar,
  Droplets, ShoppingCart, AlertTriangle
} from 'lucide-react';
import { BalanceIcon } from '../../components/icons';
import AgritechLayout from '../../components/AgritechLayout';
import TopBarSync from '../../components/design/TopBarSync';
import { default as KpiCardV6 } from '../../components/design/KpiCard';
import EmptyState from '../../components/design/EmptyState';
import {
  Chip,
  SectionDivider,
} from '../../components/agritech';
import { Button, PageHeader } from '@/design-system';
import { useFarm } from '../../context/FarmContext';
import { filterRealPortees } from '../../services/bandesAggregator';
import {
  determinerAliment,
} from '../../services/phaseEngine';
import { FARM_CONFIG } from '../../config/farm';
import { formatCurrency, currencySuffix, type Currency } from '../../lib/currency';
import type { BandePorcelets } from '../../types/farm';
import QuickVenteForm from '../../components/forms/QuickVenteForm';
import {
  classifyCyclePhaseCard,
  computeRemaining,
  getCycleTreatmentStyle,
  TREATMENT_RANK,
  type CycleTreatment,
} from '../../utils/cycleTreatments';

const FINITION_PHASE_TONE = 'var(--color-secondary-deep)';
const FINITION_PHASE_DAYS = Math.round(
  (FARM_CONFIG.FINITION_POIDS_MAX_KG - FARM_CONFIG.FINITION_POIDS_MIN_KG) / 0.90,
);

/**
 * FinitionView — Hub Cycles / Finition
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte Premium Agritech :
 * - Intégration Phase Engine & Nutrition (Aliment Finition)
 * - Projections de vente financières
 * - Déclenchement "Sortie Abattoir"
 */

// ─── Constantes métier ──────────────────────────────────────────────────────
/**
 * Prix de vente moyen par kg vif (FCFA, plateforme Afrique de l'Ouest).
 * Approximation indicative tant qu'un réglage ferme dans les Settings n'a
 * pas remplacé cette constante.
 */
const PRIX_KG_VIF_FCFA = 2100;
const FINITION_SEUIL_KG = 100;

const FinitionView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes, currency } = useFarm();
  const [venteBande, setVenteBande] = useState<BandePorcelets | null>(null);

  const prixKgVif = PRIX_KG_VIF_FCFA;

  const { portees, summary, projection } = useMemo(() => {
    const today = new Date();
    const realPortees = filterRealPortees(bandes);

    // Une bande est en finition si poids estimé >= 100 kg
    const inFinition = realPortees.filter((b) => {
      const weight = estimateWeightKg(b, today);
      return weight >= FINITION_SEUIL_KG;
    });

    const rows: FinitionRowData[] = inFinition.map((b) => {
      const weight = estimateWeightKg(b, today);
      const isReadyForExit = weight >= FARM_CONFIG.FINITION_POIDS_MAX_KG;

      // Jours estimés avant atteinte du poids cible (sortie) à 0.65 kg/j.
      const daysToExit = Math.max(0, Math.ceil((FARM_CONFIG.FINITION_POIDS_MAX_KG - weight) / 0.65));
      const treatment = classifyCyclePhaseCard(
        {
          statut: b.statut,
          dayInPhase: null,
          phaseDays: FINITION_PHASE_DAYS,
          daysToTransitionOverride: daysToExit,
        },
        today,
        'finition',
      );

      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        truie: b.truie,
        vivants: b.vivants ?? 0,
        weight,
        daysToExit,
        isReadyForExit,
        bande: b,
        treatment,
      };
    });

    rows.sort((a, b) => {
      const r = TREATMENT_RANK[a.treatment] - TREATMENT_RANK[b.treatment];
      if (r !== 0) return r;
      return b.weight - a.weight;
    });

    const nbBandes = rows.length;
    const totalVivants = rows.reduce((acc, r) => acc + r.vivants, 0);
    const avgWeight = nbBandes > 0
      ? Math.round(rows.reduce((acc, r) => acc + r.weight, 0) / nbBandes)
      : 0;

    const revenuEstime = rows.reduce((acc, r) => acc + (r.vivants * r.weight * prixKgVif), 0);

    return {
      portees: rows,
      summary: {
        nbBandes,
        avgWeight,
        totalVivants
      },
      projection: {
        revenuEstime,
      },
    };
  }, [bandes, prixKgVif]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <TopBarSync
            crumbs={['Cycles', 'Finition']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <PageHeader
              eyebrow="FINITION"
              title="Finition"
              subtitle="Phase de finition"
            />
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="small"
                onClick={() => navigate('/cycles/sortie')}
              >
                <Calendar size={14} />
                Calendrier
              </Button>
            </div>
            {/* ── Summary Stats ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCardV6
                label="Bandes"
                value={summary.nbBandes}
                accentColor={summary.nbBandes > 0 ? 'var(--amber-pork)' : undefined}
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
                label="Valeur Est."
                value={formatNumber(projection.revenuEstime)}
                unit={currencySuffix(currency)}
              />
            </div>

            {/* ── Liste des Bandes (FinitionCard) ─────────────────────── */}
            <SectionDivider label={`Suivi Finition · ${summary.nbBandes}`} />

            {portees.length === 0 ? (
              <EmptyState
                icon={<BalanceIcon size={32} />}
                title="Finition vide"
                description="Les porcs entrent en finition lorsqu'ils dépassent les 100 kg."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {portees.map((p) => (
                  <FinitionCard
                    key={p.id}
                    data={p}
                    onOpen={() => navigate(`/troupeau/bandes/${encodeURIComponent(p.id)}`)}
                    onSell={() => setVenteBande(p.bande)}
                  />
                ))}
              </div>
            )}

            {/* ── Projection Finale ───────────────────────────────────── */}
            {portees.length > 0 && (
              <div className="card-dense bg-success/5 border-success/20 p-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Coins size={18} className="text-success" />
                  <span className="text-[11px] font-bold uppercase text-success">Projection de vente brute</span>
                </div>
                <div className="text-[28px] font-bold font-mono text-text-0 mb-1">
                  {formatNumber(projection.revenuEstime)} <span className="text-[14px] text-text-2">{currencySuffix(currency)}</span>
                </div>
                <p className="text-[11px] text-text-2 leading-tight">
                  Basé sur un poids moyen de {summary.avgWeight}kg et un prix de {formatCurrency(prixKgVif, currency)}/kg.
                </p>
              </div>
            )}
          </div>
        </AgritechLayout>

        {venteBande && (
          <QuickVenteForm
            isOpen={!!venteBande}
            onClose={() => setVenteBande(null)}
            bande={venteBande}
          />
        )}
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface FinitionRowData {
  id: string;
  idPortee: string;
  truie?: string;
  vivants: number;
  weight: number;
  daysToExit: number;
  isReadyForExit: boolean;
  bande: BandePorcelets;
  treatment: CycleTreatment;
}

const FinitionCard: React.FC<{ data: FinitionRowData; onOpen: () => void; onSell: () => void }> = ({ data, onOpen, onSell }) => {
  const currentAliment = determinerAliment(data.weight);
  const feedConfig = FARM_CONFIG.FEED_CONFIG[currentAliment as keyof typeof FARM_CONFIG.FEED_CONFIG];

  const targetWeight = FARM_CONFIG.FINITION_POIDS_MAX_KG;
  const progress = Math.min(100, (data.weight / targetWeight) * 100);

  const treatmentStyle = getCycleTreatmentStyle(data.treatment, FINITION_PHASE_TONE);
  const isUrgent = data.treatment === 'urgent';
  const isResolu = data.treatment === 'resolu';
  const remainingDays = computeRemaining({
    dayInPhase: null,
    phaseDays: FINITION_PHASE_DAYS,
    daysToTransitionOverride: data.daysToExit,
  });
  const eyebrowText = isUrgent && remainingDays !== null
    ? `Imminent · ${remainingDays}j restant${remainingDays > 1 ? 's' : ''}`
    : isResolu
      ? 'Résolu'
      : 'Finition';

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
        data.isReadyForExit && !isResolu ? 'animate-pulse-slow' : ''
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
      {/* Header Card */}
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
            Mère: {data.truie || '—'} · Poids: <span className="text-text-0 font-bold">{Math.round(data.weight)}kg</span>
          </p>
        </div>
        {data.isReadyForExit ? (
          <Chip tone="success" label="PRÊT SORTIE" size="sm" icon={<ShoppingCart size={10} />} />
        ) : (
          <Chip tone="gold" label="Finition" size="sm" className="!normal-case" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Progress Gauge */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase text-text-2">Obj. 110kg</span>
            <TrendingUp size={12} className={data.isReadyForExit ? 'text-success' : 'text-gold'} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-bold font-mono text-text-0">{Math.round(progress)}</span>
            <span className="text-[10px] text-text-2">%</span>
          </div>
          <div className="mt-2 h-1 w-full bg-bg-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${data.isReadyForExit ? 'bg-success' : 'bg-gold'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Nutrition Info */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase text-text-2">Alimentation</span>
            <Droplets size={12} className="text-accent" />
          </div>
          <div className="text-[12px] font-bold text-accent truncate">
            {feedConfig?.label || currentAliment}
          </div>
          <div className="mt-1 text-[10px] text-text-2 leading-tight truncate">
            Maïs: {feedConfig?.formule.mais}% | KPC: {feedConfig?.formule.kpc_5}%
          </div>
        </div>
      </div>

      {data.isReadyForExit && (
        <Button
          variant="primary"
          fullWidth
          onClick={(e) => { e.stopPropagation(); onSell(); }}
        >
          <ShoppingCart size={16} />
          Déclarer la vente
        </Button>
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

function daysBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function estimateWeightKg(bande: BandePorcelets, today: Date): number {
  const sevrage = parseDate(bande.dateSevrageReelle || bande.dateSevragePrevue);
  if (!sevrage) return 0;
  const j = daysBetween(sevrage, today);
  // Heuristique K13 : 25kg au sevrage + 650g/j en croissance/finition
  return Math.min(25 + j * 0.65, 120);
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ');
}

export default FinitionView;
