import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  Coins, TrendingUp, Calendar,
  Droplets, ShoppingCart
} from 'lucide-react';
import { BalanceIcon } from '../../components/icons';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { default as KpiCardV6 } from '../../components/design/KpiCard';
import {
  Chip,
  SectionDivider,
} from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import { filterRealPortees } from '../../services/bandesAggregator';
import {
  determinerAliment,
} from '../../services/phaseEngine';
import { FARM_CONFIG } from '../../config/farm';
import type { BandePorcelets } from '../../types/farm';
import QuickVenteForm from '../../components/forms/QuickVenteForm';

/**
 * FinitionView — Hub Cycles / Finition
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte Premium Agritech :
 * - Intégration Phase Engine & Nutrition (Aliment Finition)
 * - Projections de vente financières
 * - Déclenchement "Sortie Abattoir"
 */

// ─── Constantes métier ──────────────────────────────────────────────────────
const PRIX_KG_VIF_FCFA = 2100;
const FINITION_SEUIL_KG = 100;

const FinitionView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes } = useFarm();
  const [venteBande, setVenteBande] = useState<BandePorcelets | null>(null);

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

      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        truie: b.truie,
        vivants: b.vivants ?? 0,
        weight,
        isReadyForExit,
        bande: b
      };
    });

    rows.sort((a, b) => b.weight - a.weight);

    const nbBandes = rows.length;
    const totalVivants = rows.reduce((acc, r) => acc + r.vivants, 0);
    const avgWeight = nbBandes > 0
      ? Math.round(rows.reduce((acc, r) => acc + r.weight, 0) / nbBandes)
      : 0;

    const revenuEstime = rows.reduce((acc, r) => acc + (r.vivants * r.weight * PRIX_KG_VIF_FCFA), 0);

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
  }, [bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="FINITION"
            subtitle="Prêt pour abattage · 110 kg"
            backTo="/cycles"
            action={
              <button
                onClick={() => navigate('/cycles/sortie')}
                className="pressable inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-accent/40 text-accent font-mono text-[11px] uppercase tracking-wide transition-colors"
              >
                <Calendar size={14} />
                Calendrier
              </button>
            }
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
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
                value={formatFCFA(projection.revenuEstime)}
                unit="FCFA"
              />
            </div>

            {/* ── Liste des Bandes (FinitionCard) ─────────────────────── */}
            <SectionDivider label={`Suivi Finition · ${summary.nbBandes}`} />

            {portees.length === 0 ? (
              <EmptyState />
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
                  <span className="font-mono text-[11px] font-bold uppercase text-success">Projection de vente brute</span>
                </div>
                <div className="text-[28px] font-bold font-mono text-text-0 mb-1">
                  {formatFCFA(projection.revenuEstime)} <span className="text-[14px] text-text-2">FCFA</span>
                </div>
                <p className="text-[11px] text-text-2 leading-tight">
                  Basé sur un poids moyen de {summary.avgWeight}kg et un prix de {PRIX_KG_VIF_FCFA} FCFA/kg.
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
  isReadyForExit: boolean;
  bande: BandePorcelets;
}

const FinitionCard: React.FC<{ data: FinitionRowData; onOpen: () => void; onSell: () => void }> = ({ data, onOpen, onSell }) => {
  const currentAliment = determinerAliment(data.weight);
  const feedConfig = FARM_CONFIG.FEED_CONFIG[currentAliment as keyof typeof FARM_CONFIG.FEED_CONFIG];

  const targetWeight = FARM_CONFIG.FINITION_POIDS_MAX_KG;
  const progress = Math.min(100, (data.weight / targetWeight) * 100);

  return (
    <div
      onClick={onOpen}
      className={`card-dense flex flex-col gap-4 p-4 border-l-4 transition-all active:scale-[0.98] cursor-pointer ${
        data.isReadyForExit ? 'border-l-success animate-pulse-slow' : 'border-l-gold'
      }`}
    >
      {/* Header Card */}
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-text-0 font-mono">{data.idPortee}</h3>
            <Chip tone="default" label={`${data.vivants} porcs`} size="xs" />
          </div>
          <p className="text-[11px] text-text-2 mt-0.5">
            Mère: {data.truie || '—'} · Poids: <span className="text-text-0 font-bold">{Math.round(data.weight)}kg</span>
          </p>
        </div>
        {data.isReadyForExit ? (
          <Chip tone="success" label="PRÊT SORTIE" size="sm" icon={<ShoppingCart size={10} />} />
        ) : (
          <Chip tone="gold" label="Finition" size="sm" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Progress Gauge */}
        <div className="bg-bg-1 rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-text-2">Obj. 110kg</span>
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

      {data.isReadyForExit && (
        <button
          className="w-full bg-success text-bg-0 py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-success/20"
          onClick={(e) => { e.stopPropagation(); onSell(); }}
        >
          <ShoppingCart size={16} />
          Déclarer Vente
        </button>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up">
    <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-gold">
      <BalanceIcon size={48} />
    </div>
    <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
      Finition vide
    </h3>
    <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
      Les porcs entrent en finition lorsqu'ils dépassent les 100 kg.
    </p>
  </div>
);

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

function formatFCFA(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ');
}

export default FinitionView;
