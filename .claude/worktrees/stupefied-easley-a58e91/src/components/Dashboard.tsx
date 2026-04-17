import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Zap, 
  ShieldCheck, 
  Layers, 
  AlertTriangle, 
  Sparkles, 
  ChevronRight, 
  Plus, 
  Stethoscope, 
  ClipboardList,
  RefreshCw 
} from 'lucide-react';
import { cn, formatDate, getDiffDays } from '../lib/utils';
import { useFarm } from '../context/FarmContext';
import { analyzeFarmState } from '../services/aiService';
import { WEANING_DAYS_OPTIMAL, WEANING_DAYS_MAX } from '../constants';

const Dashboard = () => {
  const { animals, stock, bandes, userRole, syncStatus } = useFarm();
  const navigate = useNavigate();
  const [aiInsights, setAiInsights] = useState<{title: string, desc: string, type: string}[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString('fr-FR'));

  // Update sync time when status changes to synced
  React.useEffect(() => {
    if (syncStatus === 'synced') {
      setLastSyncTime(new Date().toLocaleTimeString('fr-FR'));
    }
  }, [syncStatus]);

  const gestantes = animals.filter(a => a.statut === 'Gestante').length;
  const activeBandes = bandes.filter(b => b.statut === 'en_cours').length;
  
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeFarmState(animals, stock);
    setAiInsights(result.insights);
    setIsAnalyzing(false);
  };

  // Intelligent Notifications Logic
  const notifications = useMemo(() => {
    const notes: { type: 'warning' | 'info' | 'critical', title: string, desc: string, id?: string, path?: string }[] = [];
    
    // Add AI insights to notifications
    aiInsights.forEach(insight => {
      notes.push({ 
        type: insight.type as any, 
        title: `IA: ${insight.title}`, 
        desc: insight.desc 
      });
    });

    animals.forEach(a => {
      if (a.statut === 'Gestante' && a.dateMBPrevue) {
        const diff = getDiffDays(a.dateMBPrevue);
        if (diff <= 0) {
          notes.push({ 
            type: 'critical', 
            title: `MISE BAS À CONFIRMER (${a.id})`, 
            desc: `La date prévue (${formatDate(a.dateMBPrevue)}) est dépassée. Confirmer la mise bas.`,
            id: a.id,
            path: `/breeders/${a.id}`
          });
        } else if (diff <= 7) {
          notes.push({ 
            type: 'warning', 
            title: `Préparation Mise Bas (${a.id})`, 
            desc: `Prévue dans ${diff} jours. Nettoyer et désinfecter la case (Conseil Max Farmer).`,
            id: a.id,
            path: `/breeders/${a.id}`
          });
        }
      }
    });

    bandes.forEach(b => {
      if (b.type === 'maternite') {
        const diff = -getDiffDays(b.dateDebut);
        if (diff >= WEANING_DAYS_OPTIMAL && diff <= WEANING_DAYS_MAX) {
          notes.push({
            type: 'critical',
            title: `SEVRAGE À CONFIRMER: ${b.nom}`,
            desc: `Âge: ${diff} jours. Poids cible: 6-7kg. Retirer la truie, laisser les porcelets 24h.`,
            path: '/bandes'
          });
        } else if (diff >= WEANING_DAYS_OPTIMAL - 3) {
          notes.push({
            type: 'warning',
            title: `Sevrage proche: ${b.nom}`,
            desc: `Âge actuel: ${diff} jours. Prévoir transition alimentaire progressive.`,
            path: '/bandes'
          });
        }
      }
    });

    stock.forEach(s => {
      if (s.alerte === 'RUPTURE') {
        notes.push({ type: 'critical', title: `Rupture: ${s.nom}`, desc: `Quantité épuisée. Commander d'urgence.`, path: '/stock' });
      }
    });

    return notes;
  }, [animals, stock, aiInsights, bandes]);

  const performanceScore = Math.round(((gestantes / (animals.length || 1)) * 0.4 + (stock.filter(s => s.alerte === 'OK').length / (stock.length || 1)) * 0.3 + (activeBandes / 5) * 0.3) * 100);

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Dashboard Banner */}
      <div className="relative h-48 rounded-[2.5rem] overflow-hidden shadow-lg border border-gray-100">
        <img 
          src="/images/dashboard-banner.jpg" 
          alt="Farm Banner" 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://picsum.photos/seed/large-white-pig-banner/1200/400";
          }}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Système Actif</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Tableau de Bord</h1>
        </div>
      </div>

      {/* Global Performance KPI */}
      <div className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
          <Zap className="w-32 h-32 text-emerald-600" />
        </div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Performance Globale</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-light tracking-tighter text-gray-900">
                {performanceScore}
              </span>
              <span className="text-xl font-bold text-emerald-600">%</span>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase mb-2">
              <ShieldCheck className="w-3 h-3" />
              Optimal
            </div>
            <p className="text-[10px] text-gray-400 font-mono">Sync: {lastSyncTime}</p>
          </div>
        </div>
        <div className="mt-6 h-1 w-full bg-gray-50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${performanceScore}%` }}
            className="h-full bg-emerald-500"
          />
        </div>
      </div>

      {/* Quick Stats - Technical Style */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 p-5 rounded-[2rem] shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Productivité</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-light tracking-tighter text-gray-900">
              {Math.round((gestantes / (animals.length || 1)) * 100)}
            </span>
            <span className="text-lg font-bold text-emerald-600">%</span>
          </div>
          <p className="text-[9px] font-bold text-gray-400 uppercase">Taux de Gestation</p>
        </div>

        <div className="bg-white border border-gray-100 p-5 rounded-[2rem] shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bandes</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-light tracking-tighter text-gray-900">
              {activeBandes}
            </span>
            <span className="text-lg font-bold text-blue-600">LOTS</span>
          </div>
          <p className="text-[9px] font-bold text-gray-400 uppercase">Suivi Actif</p>
        </div>
      </div>

      {/* AI Analysis Button */}
      <button
        onClick={runAnalysis}
        disabled={isAnalyzing}
        className="pressable w-full py-4 bg-emerald-900 text-white rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
      >
        {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        Lancer l'Analyse IA PorcTrack
      </button>

      {/* Alerts Section - Refined Grid Style */}
      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Flux d'activité & Alertes</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Live</span>
          </div>
        </div>
        
        <div className="space-y-2">
          {notifications.map((note, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => note.id && navigate(`/breeders/${note.id}`)}
              aria-label={note.id ? `Voir les détails de ${note.title}` : note.title}
              className={cn(
                "pressable group p-4 rounded-2xl border transition-all active:scale-[0.99] flex items-start gap-4",
                note.type === 'critical' ? "bg-red-50/50 border-red-100 hover:bg-red-50" : 
                note.type === 'warning' ? "bg-amber-50/50 border-amber-100 hover:bg-amber-50" : 
                "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-xl mt-0.5",
                note.type === 'critical' ? "bg-red-100 text-red-600" : 
                note.type === 'warning' ? "bg-amber-100 text-amber-600" : 
                "bg-emerald-100 text-emerald-600"
              )}>
                {note.type === 'critical' ? <AlertTriangle className="w-4 h-4" /> : 
                 note.type === 'warning' ? <Zap className="w-4 h-4" /> : 
                 <Sparkles className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="text-xs font-bold text-gray-900">{note.title}</p>
                  <span className="text-[9px] font-mono text-gray-400 uppercase">Maintenant</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">{note.desc}</p>
              </div>
              {note.id && <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors self-center" />}
            </motion.div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <ShieldCheck className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-medium italic">Système nominal. Aucune alerte.</p>
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Actions Rapides</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Plus, label: 'Event', color: 'bg-emerald-600', path: '/breeders' },
            { icon: Stethoscope, label: 'Santé', color: 'bg-red-600', path: '/health' },
            { icon: ClipboardList, label: 'Ration', color: 'bg-blue-600', path: '/rations' },
          ].map((action, i) => (
            <button key={i} onClick={() => navigate(action.path)} className="pressable flex flex-col items-center gap-2">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", action.color)}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-medium text-gray-600">{action.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
