import React, { useState, useMemo } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import {
  Wallet, FileText, TrendingUp, AlertTriangle,
  Coins, Skull, ShieldCheck, ArrowRight, Zap, Target
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import DataAgeIndicator from '../../components/DataAgeIndicator';
import {
  HubTile, SectionDivider, KpiCard, Chip
} from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { genererRapportGlobal } from '../../services/financialAnalyzer';
import { prepareAuditSnapshot } from '../../services/exportService';
import AuditPrintTemplate from '../pilotage/AuditPrintTemplate';

const PilotageHub: React.FC = () => {
  const {
    loading,
    alerts,
    bandes,
    transitions,
  } = useFarm();
  const { handleRefresh } = useAutoRefresh();
  const [, setIsPrinting] = useState(false);

  // 1. Moteur de Consolidation Financière
  const globalReport = useMemo(() => {
    if (loading || bandes.length === 0) return null;
    return genererRapportGlobal(bandes, transitions);
  }, [bandes, transitions, loading]);

  // Snapshot pour l'export
  const auditData = useMemo(() => {
    if (loading || bandes.length === 0 || !alerts) return null;
    return prepareAuditSnapshot(bandes, transitions, alerts);
  }, [bandes, transitions, alerts, loading]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  // 2. Alertes filtrées pour le Cockpit
  const urgences = useMemo(() => {
    return alerts.filter(a => a.priority === 'CRITIQUE' || a.priority === 'HAUTE').slice(0, 5);
  }, [alerts]);

  if (loading || !globalReport) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
           <AgritechLayout>
             <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
               <IonRefresherContent />
             </IonRefresher>
             <AgritechHeader
               title="PILOTAGE"
               subtitle="Consolidation des données..."
               action={<DataAgeIndicator />}
             />
             <div className="p-4 space-y-6">
                <div className="h-32 bg-bg-1 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-bg-1 rounded-2xl animate-pulse" />
                  <div className="h-24 bg-bg-1 rounded-2xl animate-pulse" />
                </div>
             </div>
           </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  const { margeGlobaleEstimee, totalRevenuProjete, totalCoutAlimentaire, totalCoutFixe, tauxMortaliteMoyen, topBande, flopBande } = globalReport;

  const margeColor = margeGlobaleEstimee > 500000 ? 'text-emerald-500' : margeGlobaleEstimee > 0 ? 'text-amber-500' : 'text-red-500';

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <AgritechHeader
            title="COCKPIT PILOTAGE"
            subtitle="Vue globale de l'exploitation"
            action={
              <div className="flex items-center gap-3">
                <DataAgeIndicator />
                {auditData && (
                  <button
                    onClick={handlePrint}
                    aria-label="Exporter le rapport PDF"
                    className="pressable h-10 px-4 rounded-full bg-accent text-bg-0 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-accent/20"
                  >
                    <FileText size={14} />
                    Export PDF
                  </button>
                )}
              </div>
            }
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-6">

            {/* ── HEADER : COCKPIT FINANCIER ── */}
            <div className="card-dense !p-6 flex flex-col items-center text-center gap-2 border-b-4 border-b-emerald-500/20">
              <span className="text-[10px] uppercase font-mono text-text-2 tracking-widest">Marge Globale Estimée (Cheptel Actif)</span>
              <div className={`text-4xl font-black font-mono tracking-tighter ${margeColor}`}>
                {formatFCFA(margeGlobaleEstimee)} <span className="text-sm font-bold opacity-70">FCFA</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <Chip tone="success" label="Calcul Théorique K13" size="xs" />
                 <span className="text-[9px] text-text-2 italic">Basé sur J+X et Pesées</span>
              </div>
            </div>

            {/* ── GRILLE MACRO-KPIs ── */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Valeur Cheptel"
                value={formatFCFA(totalRevenuProjete)}
                unit="FCFA"
                icon={<Coins size={14} className="text-emerald-500" />}
              />
              <KpiCard
                label="Dette Aliment"
                value={formatFCFA(totalCoutAlimentaire)}
                unit="FCFA"
                icon={<Zap size={14} className="text-amber-500" />}
              />
              <KpiCard
                label="Frais Engagés"
                value={formatFCFA(totalCoutFixe)}
                unit="FCFA"
                icon={<Target size={14} className="text-text-2" />}
              />
              <KpiCard
                label="Mortalité Global"
                value={tauxMortaliteMoyen.toFixed(1)}
                unit="%"
                tone={tauxMortaliteMoyen > 2 ? 'critical' : 'success'}
                icon={<Skull size={14} />}
              />
            </div>

            {/* ── SECTION : URGENCES & VIGIE ── */}
            <section className="space-y-3">
              <SectionDivider label="Urgences & Vigie" />
              {urgences.length === 0 ? (
                <div className="card-dense !p-5 flex items-center justify-center gap-3 bg-emerald-500/5 border-emerald-500/20">
                   <ShieldCheck className="text-emerald-500" size={24} />
                   <span className="text-[13px] font-bold text-emerald-700 uppercase font-mono">Exploitation sous contrôle</span>
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 snap-x scrollbar-hide">
                  {urgences.map(alert => (
                    <div key={alert.id} className="min-w-[280px] snap-center card-dense !p-4 border-l-4 border-red-500 flex flex-col gap-2">
                       <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold font-mono text-red-600 uppercase">{alert.category}</span>
                          <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                       </div>
                       <h4 className="text-[13px] font-bold text-text-0">{alert.title}</h4>
                       <p className="text-[11px] text-text-2 leading-tight">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── SECTION : PALMARÈS DES BANDES ── */}
            <section className="space-y-3">
              <SectionDivider label="Palmarès des Bandes" />
              <div className="grid grid-cols-1 gap-3">
                {topBande && (
                  <div className="card-dense !p-4 flex items-center gap-4 border-r-4 border-emerald-500/30">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                      <TrendingUp size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-[10px] uppercase font-mono text-emerald-600 font-bold">Top Performer</div>
                       <h4 className="text-[14px] font-bold text-text-0 truncate">{topBande.bande.idPortee}</h4>
                       <p className="text-[11px] text-text-2">ROI : +{topBande.report.roiPct}%</p>
                    </div>
                    <ArrowRight size={16} className="text-text-2" />
                  </div>
                )}
                {flopBande && (
                  <div className="card-dense !p-4 flex items-center gap-4 border-r-4 border-red-500/30">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 shrink-0">
                      <TrendingUp size={20} className="rotate-180" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-[10px] uppercase font-mono text-red-600 font-bold">Attention Requise</div>
                       <h4 className="text-[14px] font-bold text-text-0 truncate">{flopBande.bande.idPortee}</h4>
                       <p className="text-[11px] text-text-2">Marge : {formatFCFA(flopBande.report.margeNetteProjetee)} FCFA</p>
                    </div>
                    <ArrowRight size={16} className="text-text-2" />
                  </div>
                )}
              </div>
            </section>

            {/* ── MODULES CLASSIQUES ── */}
            <section className="mt-2">
              <SectionDivider label="Modules de Gestion" />
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <HubTile
                  icon={<Wallet size={20} />}
                  title="Trésorerie"
                  subtitle="Flux réels"
                  to="/pilotage/finances"
                  tone="gold"
                  variant="compact"
                />
                <HubTile
                  icon={<TrendingUp size={20} />}
                  title="Perf GTTT"
                  subtitle="Benchmarks"
                  to="/pilotage/perf"
                  tone="accent"
                  variant="compact"
                />
              </div>
            </section>
          </div>
        </AgritechLayout>

        {/* Template d'impression masqué (print-only via Tailwind) */}
        {auditData && <AuditPrintTemplate data={auditData} />}
      </IonContent>
    </IonPage>
  );
};

function formatFCFA(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, '.');
}

export default PilotageHub;
