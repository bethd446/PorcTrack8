import React, { useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  Baby, Plus, Scale, Droplets,
  ArrowUpRight, AlertCircle, Lock
} from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import {
  KpiCard,
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
import { FARM_CONFIG } from '../../config/farm';
import {
  computePhaseTerrain,
  detectPendingTransitions,
  PHASE_LABEL
} from '../../services/phaseEngine';
import type { BandePorcelets, Truie } from '../../types/farm';

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
    return truiesEnMat.map(truie => {
      const portee = getTruiePortee(truie, porteesReelles);
      const jSinceMB = daysSince(portee?.dateMB, today);
      const terrainPhase = portee ? computePhaseTerrain(portee, today) : null;

      const transition = portee ? pendingTransitions.find(t => t.bandeId === portee.id) : null;
      const status = {
        isBloquant: transition?.isBloquant ?? false,
        joursEnRetard: transition?.joursEnRetard ?? 0,
        urgence: transition?.urgence ?? 'NORMALE'
      };

      return { truie, portee, jSinceMB, terrainPhase, status };
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
          <AgritechHeader
            title="MATERNITÉ"
            subtitle="Pilotage allaitement & sevrage"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Primary Action ───────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => openMiseBas()}
              className="pressable w-full h-[58px] rounded-xl bg-accent text-bg-0 font-mono text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
            >
              <Plus size={20} />
              <span>Saisir mise-bas</span>
            </button>

            {/* ── Summary KPI ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard
                label="Truies"
                value={summary.nbTruies}
                icon={<TruieIcon size={14} className="text-accent" />}
              />
              <KpiCard
                label="Saturation"
                value={`${summary.occupation.tauxPct}%`}
                tone={summary.occupation.alerte === 'FULL' ? 'critical' : summary.occupation.alerte === 'HIGH' ? 'warning' : 'success'}
              />
              <KpiCard
                label="Porcelets s/m"
                value={summary.totalVivants}
                tone="success"
              />
              <KpiCard
                label="Mortalité"
                value={`${summary.mortsGlobalPct.toFixed(1)}%`}
                tone={summary.mortsGlobalPct > MORTALITE_SEUIL_PCT ? 'critical' : 'default'}
              />
            </div>

            {/* ── Liste des Truies ────────────────────────────────────── */}
            <SectionDivider label={`Suivi Allaitement · ${summary.nbTruies}`} />

            {rows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-4">
                {rows.map((r) => (
                  <MaterniteCard
                    key={r.truie.id}
                    data={r}
                    onDetail={() => navigate(`/troupeau/truies/${r.truie.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
          <AgritechNav />
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

const MaterniteCard: React.FC<{
  data: { truie: Truie; portee?: BandePorcelets; jSinceMB: number | null; terrainPhase: string | null; status: any };
  onDetail: () => void;
}> = ({ data, onDetail }) => {
  const navigate = useNavigate();
  const { truie, portee, jSinceMB, terrainPhase, status } = data;
  const { isBloquant, joursEnRetard } = status;

  const isTransitionRequired = terrainPhase && terrainPhase !== 'SOUS_MERE';
  const mortsPct = mortsPercent(portee);
  const feedConfig = FARM_CONFIG.FEED_CONFIG.TRUIE_LACTATION;

  return (
    <div
      onClick={onDetail}
      className={`card-dense flex flex-col gap-4 p-4 border-l-4 transition-all active:scale-[0.98] cursor-pointer ${
        isBloquant ? 'border-l-red-500 bg-red-500/5 ring-1 ring-red-500/20' :
        mortsPct > MORTALITE_SEUIL_PCT ? 'border-l-red' :
        isTransitionRequired ? 'border-l-gold animate-pulse-slow' : 'border-l-accent'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-[15px] font-bold text-text-0 font-mono ${isBloquant ? 'text-red-600' : ''}`}>{truie.displayId}</h3>
            {truie.nom && <span className="text-[12px] text-text-2 truncate max-w-[80px]">{truie.nom}</span>}
            <Chip tone={isBloquant ? 'red' : 'default'} label={isBloquant ? 'BLOCAGE' : `B.${truie.boucle}`} size="xs" />
          </div>
          <p className="text-[11px] text-text-2 mt-0.5">
            {portee ? `Portée: ${portee.idPortee}` : 'Aucune portée liée'}
          </p>
          {isBloquant && (
            <div className="flex items-center gap-1.5 mt-1 text-red-600 animate-pulse">
              <AlertCircle size={14} />
              <span className="text-[10px] font-bold uppercase">Urgence Critique</span>
            </div>
          )}
        </div>
        {isTransitionRequired ? (
          <Chip tone={isBloquant ? 'red' : 'gold'} label={isBloquant ? 'RETARD' : `➜ SEVRAGE J${jSinceMB}`} size="sm" icon={<ArrowUpRight size={10} />} />
        ) : (
          <Chip tone="accent" label={`J+${jSinceMB || 0} Lactation`} size="sm" />
        )}
      </div>

      {/* Message de blocage */}
      {isBloquant && (
        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
          <p className="text-[11px] text-red-700 leading-tight">
            <strong>Action bloquée :</strong> Retard critique de sevrage (+{joursEnRetard}j).
            Veuillez déclarer le sevrage de cette portée pour débloquer les saisies.
          </p>
        </div>
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
          <div className="mt-1 text-[9px] text-text-2 font-mono leading-tight">
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
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold border transition-all ${
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
          className={`w-full py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg ${
            isBloquant ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-gold text-bg-0 shadow-gold/20'
          }`}
          onClick={(e) => { e.stopPropagation(); navigate(`/troupeau/bandes/${portee?.id}?action=sevrage`); }}
        >
          <ArrowUpRight size={16} />
          {isBloquant ? 'Sevrage Immédiat' : 'Confirmer Sevrage'}
        </button>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up">
    <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
      <TruieIcon size={48} />
    </div>
    <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
      Maternité vide
    </h3>
    <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
      Dès qu'une truie met bas, elle apparaîtra ici pour son suivi d'allaitement.
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

function daysSince(s: string | undefined, today: Date): number | null {
  const d = parseDate(s);
  if (!d) return null;
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getTruiePortee(truie: Truie, bandes: BandePorcelets[]): BandePorcelets | undefined {
  const sm = bandes.filter(b => /sous.m/i.test(b.statut ?? ''));
  return sm.find(b =>
    (b.truie && b.truie === truie.id) ||
    (b.boucleMere && truie.boucle && b.boucleMere === truie.boucle)
  );
}

function mortsPercent(bande?: BandePorcelets): number {
  if (!bande || !bande.nv) return 0;
  return (bande.morts ?? 0) / bande.nv * 100;
}

export default MaterniteView;
