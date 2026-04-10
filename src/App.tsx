import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  LayoutDashboard, 
  PiggyBank, 
  Baby, 
  Package, 
  Stethoscope, 
  ClipboardList, 
  Settings,
  Plus,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Camera,
  CheckCircle2,
  ArrowLeft,
  Edit2,
  Save,
  Trash2,
  History,
  Calendar,
  Sparkles,
  Zap,
  ShieldCheck,
  Layers,
  Clock,
  TrendingUp,
  Download,
  Image as ImageIcon,
  WifiOff
} from 'lucide-react';
import { cn, formatDate } from './lib/utils';
import { Animal, StockItem, Portee, Event, AnimalStatus, HealthRecord, Ration, Bande, BiosecurityMeasure } from './types';
import { INITIAL_ANIMALS, STOCK_ITEMS, GESTATION_DAYS, WEANING_DAYS_OPTIMAL, WEANING_DAYS_MAX, INITIAL_BANDES } from './constants';
import { useParams } from 'react-router-dom';

import { syncData } from './services/googleSheets';
import { analyzeFarmState } from './services/aiService';

// --- Context ---
interface FarmContextType {
  animals: Animal[];
  stock: StockItem[];
  events: Event[];
  portees: Portee[];
  bandes: Bande[];
  healthRecords: HealthRecord[];
  syncStatus: 'synced' | 'pending' | 'offline';
  addEvent: (event: Omit<Event, 'id' | 'synced'>) => void;
  updateAnimal: (animal: Animal) => void;
  addHealthRecord: (record: Omit<HealthRecord, 'id'>) => void;
  updateStock: (id: string, delta: number) => void;
  addRation: (ration: Omit<Ration, 'id'>) => void;
  addBande: (bande: Omit<Bande, 'id'>) => void;
  updateBande: (bande: Bande) => void;
  triggerSync: (table: string, action: any, data: any) => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (!context) throw new Error('useFarm must be used within a FarmProvider');
  return context;
};

// --- Components ---

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/breeders', icon: PiggyBank, label: 'Repro' },
    { path: '/piglets', icon: Baby, label: 'Porcelets' },
    { path: '/bandes', icon: Layers, label: 'Bandes' },
    { path: '/stock', icon: Package, label: 'Stock' },
    { path: '/planning', icon: Calendar, label: 'Planning' },
    { path: '/more', icon: Settings, label: 'Plus' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe px-2 flex justify-around items-center h-16 z-50">
      {navItems.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-colors",
              isActive ? "text-emerald-600" : "text-gray-400"
            )}
          >
            <Icon className={cn("w-6 h-6", isActive && "fill-emerald-50/50")} />
            <span className="text-[10px] mt-1 font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const Header = () => {
  const { syncStatus, triggerSync, animals, stock, events } = useFarm();
  
  const handleManualSync = () => {
    triggerSync('MANUAL_SYNC', 'UPDATE', { animals, stock, events });
  };

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex justify-between items-center z-40">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <h1 className="text-lg font-black tracking-tighter text-gray-900 uppercase">PorcTrack <span className="text-emerald-600">v5</span></h1>
      </div>
      
      <button 
        onClick={handleManualSync}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all",
          syncStatus === 'synced' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
          syncStatus === 'pending' ? "bg-amber-50 text-amber-600 border border-amber-100" :
          "bg-red-50 text-red-600 border border-red-100"
        )}
      >
        <RefreshCw className={cn("w-3 h-3", syncStatus === 'pending' && "animate-spin")} />
        {syncStatus === 'synced' ? 'Connecté' : syncStatus === 'pending' ? 'Sync...' : 'Erreur'}
      </button>
    </header>
  );
};

const Dashboard = () => {
  const { animals, stock, bandes } = useFarm();
  const navigate = useNavigate();
  const [aiInsights, setAiInsights] = useState<{title: string, desc: string, type: string}[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
        const diff = Math.ceil((new Date(a.dateMBPrevue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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
        const diff = Math.ceil((new Date().getTime() - new Date(b.dateDebut).getTime()) / (1000 * 60 * 60 * 24));
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

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Dashboard Banner */}
      <div className="relative h-48 rounded-[2.5rem] overflow-hidden shadow-lg border border-gray-100">
        <img 
          src="/images/dashboard-banner.jpg" 
          alt="Farm Banner" 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://picsum.photos/seed/large-white-pig/1200/400";
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
                {Math.round(((gestantes / (animals.length || 1)) * 0.4 + (stock.filter(s => s.alerte === 'OK').length / (stock.length || 1)) * 0.3 + (activeBandes / 5) * 0.3) * 100)}
              </span>
              <span className="text-xl font-bold text-emerald-600">%</span>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase mb-2">
              <ShieldCheck className="w-3 h-3" />
              Optimal
            </div>
            <p className="text-[10px] text-gray-400 font-mono">ID: PT-2026-X1</p>
          </div>
        </div>
        <div className="mt-6 h-1 w-full bg-gray-50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(((gestantes / (animals.length || 1)) * 0.4 + (stock.filter(s => s.alerte === 'OK').length / (stock.length || 1)) * 0.3 + (activeBandes / 5) * 0.3) * 100)}%` }}
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
              className={cn(
                "group p-4 rounded-2xl border transition-all active:scale-[0.99] flex items-start gap-4",
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
              {note.id && <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors self-center" />}
            </motion.div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <ShieldCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
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
            <button key={i} onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2">
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

const BreederList = () => {
  const { animals } = useFarm();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'verrat' | 'truie' | 'gestante' | 'allaitante'>('all');

  const filtered = animals.filter(a => {
    if (filter === 'verrat') return a.id.startsWith('V');
    if (filter === 'truie') return a.id.startsWith('T');
    if (filter === 'gestante') return a.statut === 'Gestante';
    if (filter === 'allaitante') return a.statut === 'Allaitante';
    return true;
  });

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'verrat', label: 'Verrats' },
          { id: 'truie', label: 'Truies' },
          { id: 'gestante', label: 'Gestantes' },
          { id: 'allaitante', label: 'Allaitantes' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
              filter === f.id 
                ? "bg-emerald-700 text-white shadow-md" 
                : "bg-white text-gray-500 border border-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((animal) => (
          <motion.div
            layout
            key={animal.id}
            onClick={() => navigate(`/breeders/${animal.id}`)}
            className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 overflow-hidden relative">
              {animal.photo ? (
                <img src={animal.photo} alt={animal.nom} className="w-full h-full object-cover" />
              ) : (
                <PiggyBank className="w-8 h-8" />
              )}
              <div className="absolute top-0 left-0 bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-br-lg">
                {animal.id}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-bold text-gray-900 truncate">{animal.nom}</h3>
                <span className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                  animal.statut === 'Gestante' ? "bg-amber-100 text-amber-700" :
                  animal.statut === 'Allaitante' ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {animal.statut}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{animal.race} • {animal.poids}kg</p>
              
              {animal.statut === 'Gestante' && animal.dateMBPrevue && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-bold text-amber-600">MB: {formatDate(animal.dateMBPrevue)}</span>
                </div>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const BreederDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { animals, updateAnimal, addEvent } = useFarm();
  const animal = animals.find(a => a.id === id);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnimal, setEditedAnimal] = useState<Animal | null>(null);
  const [showFarrowingModal, setShowFarrowingModal] = useState(false);
  const [farrowingData, setFarrowingData] = useState({ vivants: 10, morts: 0 });

  useEffect(() => {
    if (animal) setEditedAnimal(animal);
  }, [animal]);

  if (!animal || !editedAnimal) return null;

  const handleSave = () => {
    updateAnimal(editedAnimal);
    setIsEditing(false);
  };

  const handleFarrowing = () => {
    const updated: Animal = {
      ...animal,
      statut: 'Allaitante',
      nbPorcelets: farrowingData.vivants,
      historique: [
        { date: new Date().toISOString().split('T')[0], event: `Mise bas : ${farrowingData.vivants} vivants, ${farrowingData.morts} morts` },
        ...(animal.historique || [])
      ]
    };
    updateAnimal(updated);
    addEvent({
      animalId: animal.id,
      type: 'MB',
      date: new Date().toISOString().split('T')[0],
      description: `Mise bas confirmée : ${farrowingData.vivants} vivants`
    });
    setShowFarrowingModal(false);
  };

  return (
    <div className="pb-24">
      <div className="bg-emerald-700 text-white p-6 rounded-b-[32px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <button onClick={() => navigate('/breeders')} className="mb-6 p-2 bg-white/10 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-white/20 rounded-3xl border-2 border-white/30 flex items-center justify-center relative group">
            <PiggyBank className="w-12 h-12 opacity-50" />
            <button className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
              <Camera className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{animal.nom}</h2>
                <p className="text-emerald-200 text-sm font-medium">Boucle: {animal.boucle}</p>
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 bg-white/10 rounded-xl"
              >
                {isEditing ? <Save className="w-5 h-5" onClick={handleSave} /> : <Edit2 className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {animal.statut}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {animal.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Actions */}
        {(animal.statut === 'Gestante' || animal.statut === 'Mise bas à confirmer') && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFarrowingModal(true)}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Confirmer Mise Bas
          </motion.button>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {(animal.statut === 'Gestante' || animal.statut === 'Mise bas à confirmer') && animal.dateMBPrevue && (
            <div className="col-span-2 bg-white p-5 rounded-[2rem] border border-emerald-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Zap className="w-16 h-16 text-emerald-600" />
              </div>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Progression Gestation</p>
                  <p className="text-3xl font-light tracking-tighter text-gray-900">
                    {(() => {
                      const total = GESTATION_DAYS;
                      const diff = Math.ceil((new Date(animal.dateMBPrevue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      const progress = Math.min(100, Math.max(0, Math.round(((total - diff) / total) * 100)));
                      return progress;
                    })()}%
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-[10px] font-bold uppercase",
                    Math.ceil((new Date(animal.dateMBPrevue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 0 ? "text-red-600" : "text-emerald-600"
                  )}>
                    {Math.ceil((new Date(animal.dateMBPrevue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 0 ? 'À TERME' : `J-${Math.ceil((new Date(animal.dateMBPrevue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}`}
                  </p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, Math.round(((GESTATION_DAYS - Math.ceil((new Date(animal.dateMBPrevue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) / GESTATION_DAYS) * 100)))}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          )}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Race</p>
            {isEditing ? (
              <input 
                className="w-full text-sm font-bold bg-gray-50 p-1 rounded"
                value={editedAnimal.race}
                onChange={e => setEditedAnimal({...editedAnimal, race: e.target.value})}
              />
            ) : (
              <p className="text-sm font-bold text-gray-900">{animal.race}</p>
            )}
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Poids (kg)</p>
            {isEditing ? (
              <input 
                type="number"
                className="w-full text-sm font-bold bg-gray-50 p-1 rounded"
                value={editedAnimal.poids}
                onChange={e => setEditedAnimal({...editedAnimal, poids: Number(e.target.value)})}
              />
            ) : (
              <p className="text-sm font-bold text-gray-900">{animal.poids} kg</p>
            )}
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Statut Repro</p>
            {isEditing ? (
              <select 
                className="w-full text-sm font-bold bg-gray-50 p-1 rounded"
                value={editedAnimal.statut}
                onChange={e => setEditedAnimal({...editedAnimal, statut: e.target.value as AnimalStatus})}
              >
                {['Gestante', 'Allaitante', 'Flushing', 'Observation', 'Saillie', 'Vide', 'Mise bas à confirmer'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-bold text-gray-900">{animal.statut}</p>
            )}
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Naissance</p>
            <p className="text-sm font-bold text-gray-900">{formatDate(animal.dateNaissance)}</p>
          </div>
        </div>

        {/* History */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Historique Événements</h3>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {animal.historique?.length ? animal.historique.map((h, i) => (
              <div key={i} className="p-3 flex justify-between items-center">
                <p className="text-xs text-gray-700">{h.event}</p>
                <p className="text-[10px] text-gray-400 font-mono">{formatDate(h.date)}</p>
              </div>
            )) : (
              <p className="p-4 text-center text-xs text-gray-400">Aucun événement enregistré</p>
            )}
          </div>
        </section>
      </div>

      {/* Farrowing Modal */}
      <AnimatePresence>
        {showFarrowingModal && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-[32px] p-6 space-y-6"
            >
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold">Confirmer Mise Bas</h3>
                <p className="text-xs text-gray-500">Saisissez les résultats pour {animal.id}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nés Vivants</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center text-2xl font-bold text-emerald-700"
                    value={farrowingData.vivants}
                    onChange={e => setFarrowingData({...farrowingData, vivants: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nés Morts</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl text-center text-2xl font-bold text-red-700"
                    value={farrowingData.morts}
                    onChange={e => setFarrowingData({...farrowingData, morts: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFarrowingModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleFarrowing}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StockList = () => {
  const { stock, updateStock } = useFarm();
  const [showUpdate, setShowUpdate] = useState<{ id: string, type: 'IN' | 'OUT' } | null>(null);
  const [amount, setAmount] = useState(0);

  const handleUpdate = () => {
    if (showUpdate) {
      const delta = showUpdate.type === 'IN' ? amount : -amount;
      updateStock(showUpdate.id, delta);
      setShowUpdate(null);
      setAmount(0);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Inventaire Aliments</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400 uppercase">Stock Total</span>
          <div className="h-px w-12 bg-gray-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {stock.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group hover:border-emerald-200 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{item.nom}</h3>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-tight">ID: {item.id} • {item.prixUnitaire || '--'} FCFA/kg</p>
              </div>
              <span className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                item.alerte === 'OK' ? "bg-emerald-100 text-emerald-700" :
                item.alerte === 'BAS' ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {item.alerte}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Disponible</p>
                <p className="text-2xl font-mono font-bold text-gray-900">{item.quantite} <span className="text-xs font-normal text-gray-400">{item.unite}</span></p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowUpdate({ id: item.id, type: 'OUT' })}
                  className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-bold uppercase border border-gray-100 active:bg-gray-100"
                >
                  Sortie
                </button>
                <button 
                  onClick={() => setShowUpdate({ id: item.id, type: 'IN' })}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase shadow-sm active:scale-95 transition-transform"
                >
                  Entrée
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showUpdate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-center">
                {showUpdate.type === 'IN' ? 'Ajouter du Stock' : 'Retirer du Stock'}
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase text-center block">Quantité (kg)</label>
                <input 
                  type="number" 
                  autoFocus
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center text-3xl font-mono font-bold outline-none focus:border-emerald-500 transition-colors"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowUpdate(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-sm">Annuler</button>
                <button onClick={handleUpdate} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm">Valider</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PigletList = () => {
  const { portees, addEvent } = useFarm();
  const [filter, setFilter] = useState<'Sous la mère' | 'Sevrés' | 'Engraissement'>('Sous la mère');

  const filteredPortees = portees.filter(p => {
    if (filter === 'Sous la mère') return p.statut === 'sous_mere';
    if (filter === 'Sevrés') return p.statut === 'sevre';
    return p.statut === 'engraissement';
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['Sous la mère', 'Sevrés', 'Engraissement'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border",
              filter === f 
                ? "bg-emerald-700 text-white border-emerald-700 shadow-lg shadow-emerald-200" 
                : "bg-white text-gray-500 border-gray-200"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredPortees.map((portee) => (
          <motion.div 
            layout
            key={portee.id} 
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xs border border-blue-100">
                  {portee.mereId}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Portée {portee.id}</p>
                  <p className="text-[10px] text-gray-400 font-mono uppercase">Loge {portee.loge} • {formatDate(portee.dateMB)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-mono font-bold text-emerald-600">{portee.vivants}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Vivants</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  const desc = prompt("Nombre de morts ?");
                  if (desc) addEvent({ animalId: portee.mereId, type: 'mort', date: new Date().toISOString(), description: `Mortalité portée ${portee.id}: ${desc}` });
                }}
                className="py-3 bg-gray-50 text-gray-600 rounded-2xl text-[10px] font-bold uppercase border border-gray-100 active:bg-gray-100"
              >
                Signaler Mort
              </button>
              <button 
                className="py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-bold uppercase shadow-sm active:scale-95 transition-transform"
              >
                {portee.statut === 'sous_mere' ? 'Sevrage' : 'Transférer'}
              </button>
            </div>
          </motion.div>
        ))}

        {filteredPortees.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <Baby className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-medium italic">Aucune portée dans cette catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BandeManagement = () => {
  const { bandes, addBande, updateBande } = useFarm();
  const [showAdd, setShowAdd] = useState(false);
  const [newBande, setNewBande] = useState<Omit<Bande, 'id'>>({
    nom: '',
    dateDebut: new Date().toISOString().split('T')[0],
    statut: 'en_cours',
    type: 'maternite',
    nbSujets: 0
  });

  const handleSubmit = () => {
    addBande(newBande);
    setShowAdd(false);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Gestion des Bandes</h2>
          <p className="text-xs text-gray-500">Suivi des lots de la naissance à l'abattage.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-4">
        {bandes.map(bande => (
          <motion.div 
            key={bande.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{bande.nom}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{bande.type.replace('_', ' ')}</p>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                bande.statut === 'en_cours' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
              )}>
                {bande.statut === 'en_cours' ? 'Actif' : 'Terminé'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Effectif</p>
                <p className="text-sm font-bold text-gray-900">{bande.nbSujets} têtes</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Âge</p>
                <p className="text-sm font-bold text-gray-900">
                  {Math.ceil((new Date().getTime() - new Date(bande.dateDebut).getTime()) / (1000 * 60 * 60 * 24))} j
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Poids Moy.</p>
                <p className="text-sm font-bold text-gray-900">{bande.poidsMoyen || '--'} kg</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => updateBande({...bande, statut: 'termine'})}
                className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-widest"
              >
                Clôturer
              </button>
              <button className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                Transférer
              </button>
            </div>
          </motion.div>
        ))}
        {bandes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <Layers className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucune bande active. Créez-en une pour commencer le suivi.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[32px] p-6 space-y-4">
              <h3 className="text-lg font-bold text-center">Nouvelle Bande</h3>
              <input 
                placeholder="Nom de la bande (ex: B-2026-04)" 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setNewBande({...newBande, nom: e.target.value})}
              />
              <select 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setNewBande({...newBande, type: e.target.value as any})}
              >
                <option value="maternite">Maternité</option>
                <option value="post_sevrage">Post-Sevrage</option>
                <option value="engraissement">Engraissement</option>
              </select>
              <input 
                type="number"
                placeholder="Nombre de sujets" 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setNewBande({...newBande, nbSujets: Number(e.target.value)})}
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Annuler</button>
                <button onClick={handleSubmit} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Créer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Planning = () => {
  const { animals, bandes } = useFarm();
  
  const tasks = useMemo(() => {
    const list: { date: string, title: string, desc: string, type: 'MB' | 'SEVRAGE' | 'VACCIN' }[] = [];

    animals.forEach(a => {
      if (a.statut === 'Gestante' && a.dateMBPrevue) {
        // Preparation task 7 days before
        const prepDate = new Date(new Date(a.dateMBPrevue).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        list.push({
          date: prepDate,
          title: `Préparation MB: ${a.id}`,
          desc: `Nettoyage et désinfection de la case pour ${a.nom}`,
          type: 'VACCIN'
        });

        list.push({
          date: a.dateMBPrevue,
          title: `Mise bas: ${a.id}`,
          desc: `Truie ${a.nom} (${a.race})`,
          type: 'MB'
        });
      }
    });

    bandes.forEach(b => {
      if (b.type === 'maternite') {
        const weaningDate = new Date(new Date(b.dateDebut).getTime() + WEANING_DAYS_OPTIMAL * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Transition task 3 days before
        const transDate = new Date(new Date(weaningDate).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        list.push({
          date: transDate,
          title: `Transition: ${b.nom}`,
          desc: `Commencer l'aliment solide progressivement`,
          type: 'VACCIN'
        });

        list.push({
          date: weaningDate,
          title: `Sevrage: ${b.nom}`,
          desc: `Fin de maternité pour ${b.nbSujets} porcelets. Poids min: 6-7kg.`,
          type: 'SEVRAGE'
        });
      }
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [animals, bandes]);

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Planning Technique</h2>
        <p className="text-xs text-gray-500">Anticipez les événements majeurs de la ferme.</p>
      </div>

      <div className="space-y-4">
        {tasks.map((task, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                <span className="text-[8px] font-bold text-emerald-600 uppercase">{new Date(task.date).toLocaleString('fr-FR', { month: 'short' })}</span>
                <span className="text-sm font-bold text-gray-900 leading-none">{new Date(task.date).getDate()}</span>
              </div>
              <div className="w-px h-full bg-gray-200 my-1" />
            </div>
            <div className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-bold text-gray-900">{task.title}</h3>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                  task.type === 'MB' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                )}>
                  {task.type}
                </span>
              </div>
              <p className="text-xs text-gray-500">{task.desc}</p>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun événement prévu prochainement.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const HealthModule = () => {
  const { animals, healthRecords, addHealthRecord } = useFarm();
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({ animalId: '', produit: '', dose: '', veto: '' });

  const handleSubmit = () => {
    addHealthRecord({ ...newRecord, date: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Santé & Traitements</h2>
        <button onClick={() => setShowAdd(true)} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {healthRecords.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs">
              {record.animalId}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{record.produit}</p>
              <p className="text-[10px] text-gray-400">{record.dose} • {record.veto}</p>
            </div>
            <p className="text-[10px] font-mono text-gray-400">{formatDate(record.date)}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[32px] p-6 space-y-4">
              <h3 className="text-lg font-bold text-center">Nouveau Traitement</h3>
              <select 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setNewRecord({...newRecord, animalId: e.target.value})}
              >
                <option value="">Sélectionner Animal</option>
                {animals.map(a => <option key={a.id} value={a.id}>{a.id} - {a.nom}</option>)}
              </select>
              <input 
                placeholder="Produit (ex: Fer, Antibiotique)" 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setNewRecord({...newRecord, produit: e.target.value})}
              />
              <input 
                placeholder="Dose (ex: 2ml)" 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setNewRecord({...newRecord, dose: e.target.value})}
              />
              <input 
                placeholder="Vétérinaire" 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setNewRecord({...newRecord, veto: e.target.value})}
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Annuler</button>
                <button onClick={handleSubmit} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Enregistrer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RationCalculator = () => {
  const { stock, addRation, bandes, animals } = useFarm();
  const [newRation, setNewRation] = useState({ animalIdOrGroup: '', alimentId: '', quantite: 0 });

  const handleSubmit = () => {
    addRation({ ...newRation, date: new Date().toISOString().split('T')[0] });
    alert('Ration enregistrée et stock mis à jour !');
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Alimentation Technique</h2>
        <p className="text-xs text-gray-500">Distribuez l'aliment par bande ou par sujet.</p>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cible (Bande ou Animal)</label>
          <select 
            className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
            onChange={e => setNewRation({...newRation, animalIdOrGroup: e.target.value})}
          >
            <option value="">Sélectionner Cible</option>
            <optgroup label="Bandes Actives">
              {bandes.filter(b => b.statut === 'en_cours').map(b => (
                <option key={b.id} value={b.id}>{b.nom} ({b.type})</option>
              ))}
            </optgroup>
            <optgroup label="Reproducteurs">
              {animals.map(a => (
                <option key={a.id} value={a.id}>{a.id} - {a.nom}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Type d'Aliment</label>
          <select 
            className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
            onChange={e => setNewRation({...newRation, alimentId: e.target.value})}
          >
            <option value="">Sélectionner Aliment</option>
            {stock.map(s => <option key={s.id} value={s.id}>{s.nom} ({s.quantite}{s.unite})</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Quantité Totale (kg)</label>
          <input 
            type="number"
            placeholder="0.0" 
            className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none border border-transparent focus:border-emerald-500"
            onChange={e => setNewRation({...newRation, quantite: Number(e.target.value)})}
          />
        </div>

        <button 
          onClick={handleSubmit}
          disabled={!newRation.alimentId || !newRation.quantite}
          className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5" />
          Valider la Distribution
        </button>
      </div>

      <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 space-y-4">
        <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Formules Koudijs & Conseils</h4>
        <div className="grid gap-3">
          <div className="bg-white/50 p-3 rounded-xl border border-emerald-100/50">
            <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1">Truie Gestante</p>
            <p className="text-[10px] text-emerald-600 leading-relaxed">2-2.5 kg/jour. Formule: 5% KPC + 58% Maïs + 30% Son blé + 7% Soja.</p>
          </div>
          <div className="bg-white/50 p-3 rounded-xl border border-emerald-100/50">
            <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1">Truie Allaitante</p>
            <p className="text-[10px] text-emerald-600 leading-relaxed">5-6 kg/jour. Formule: 6% KPC + 58% Maïs + 18% Son blé + 18% Soja.</p>
          </div>
          <div className="bg-white/50 p-3 rounded-xl border border-emerald-100/50">
            <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1">Starter 2 (15-25kg)</p>
            <p className="text-[10px] text-emerald-600 leading-relaxed">Ad libitum. Formule: 6% KPC + 66% Maïs + 8% Son blé + 20% Soja.</p>
          </div>
        </div>
        <p className="text-[9px] text-emerald-500 italic">Note: Le son de riz peut remplacer le son de blé à 100% en finition et gestation.</p>
      </div>
    </div>
  );
};

const BiosecurityModule = () => {
  const measures: BiosecurityMeasure[] = [
    { id: '1', categorie: 'Infrastructure', nom: 'Clôture périmétrique', description: 'Empêcher entrée porcs errants, sangliers', frequence: 'Quotidien', statut: 'OK' },
    { id: '2', categorie: 'Protocole', nom: 'Pédiluve', description: 'Solution désinfectante changée quotidiennement', frequence: 'Quotidien', statut: 'OK' },
    { id: '3', categorie: 'Protocole', nom: 'Sas sanitaire', description: 'Vêtements et bottes dédiés', frequence: 'Permanent', statut: 'OK' },
    { id: '4', categorie: 'Sanitaire', nom: 'Nettoyage loges', description: 'Désinfection quotidienne (VULKAN R)', frequence: 'Quotidien', statut: 'OK' },
    { id: '5', categorie: 'Sanitaire', nom: 'Quarantaine', description: 'Minimum 30 jours pour tout nouvel animal', frequence: 'Si besoin', statut: 'OK' },
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Biosécurité (MIRAH/PPA)</h2>
        <p className="text-xs text-gray-500">Mesures essentielles contre la Peste Porcine Africaine.</p>
      </div>

      <div className="grid gap-4">
        {measures.map(m => (
          <div key={m.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">{m.categorie}</span>
                <h3 className="font-bold text-gray-900">{m.nom}</h3>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{m.description}</p>
            <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
              <span>Fréquence: {m.frequence}</span>
              <button className="text-emerald-600">Vérifier</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 space-y-3">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <h4 className="font-bold uppercase text-xs tracking-widest">Alerte Critique PPA</h4>
        </div>
        <p className="text-xs text-red-800 leading-relaxed">
          En cas de mortalité anormale ou fièvre hémorragique, contactez immédiatement le MIRAH/DSV. Pas de restes alimentaires dans l'élevage !
        </p>
      </div>
    </div>
  );
};

const ConseilsExpert = () => {
  const sections = [
    {
      title: "Mise Bas (Max Farmer)",
      tips: [
        "Préparer la case 5-7 jours avant la date prévue.",
        "Température idéale porcelets: 32-34°C (J1-J3).",
        "Colostrum vital dans les 6 premières heures.",
        "Intervenir si >30 min entre 2 porcelets."
      ]
    },
    {
      title: "Sevrage Optimal",
      tips: [
        "Sevrage à 21 jours pour maximiser les rotations.",
        "Poids minimum au sevrage: 6-7 kg.",
        "Transition alimentaire progressive dès J3-J5.",
        "Ne pas déplacer les porcelets le jour du sevrage."
      ]
    },
    {
      title: "Alimentation Rations",
      tips: [
        "Truie gestante: 2-2.5 kg/jour (ne pas suralimenter).",
        "Truie allaitante: augmenter jusqu'à 5-6 kg/jour.",
        "Flushing pré-saillie: 3.5-4 kg/jour (10-14j post-sevrage).",
        "Eau: 8-12 litres/jour pour une truie allaitante."
      ]
    },
    {
      title: "Climat Tropical",
      tips: [
        "Nourrir tôt le matin et tard le soir (éviter la chaleur).",
        "Doucher les truies 2-3 fois/jour en saison chaude.",
        "Ventilation et ombrage essentiels (stress thermique).",
        "Vérifier débit abreuvoirs (min 2L/min pour truies)."
      ]
    }
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Conseils d'Expert Porcin</h2>
        <p className="text-xs text-gray-500">Standard De Heus/Koudijs & Méthode Max Farmer.</p>
      </div>

      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-2">{s.title}</h3>
            <ul className="space-y-3">
              {s.tips.map((tip, j) => (
                <li key={j} className="flex gap-3 text-xs text-gray-600 leading-relaxed">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

const AssetStudio = () => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<Record<string, string>>({});

  const assets = [
    {
      id: "app-icon",
      name: "App Icon",
      prompt: "Rounded square app icon mockup (512x512px) for a mobile app. Minimalist white silhouette of a pig's head profile integrated with a circuit network pattern, set against an Emerald-600 (#059669) background. High definition, sleek tech style.",
      aspectRatio: "1:1"
    },
    {
      id: "logo-horizontal",
      name: "Logo Horizontal",
      prompt: "Horizontal logo for 'PorcTrack v5' on transparent background. Sleek, modern sans-serif text 'PorcTrack' in Emerald-900 (#064e3b) and 'v5' in Emerald-600 (#059669). Accompanied by a minimalist icon of a pig snout integrated with a rising data graph trend line. Flat design style, professional look.",
      aspectRatio: "4:3"
    },
    {
      id: "splash-screen",
      name: "Splash Screen",
      prompt: "High-resolution photograph for mobile splash screen (9:16 vertical ratio). Realistic portrait of a clean, healthy Large White pig in a modern, high-tech farm facility. Clean environment, technical lighting with clean white and subtle emerald green (Emerald-600, #059669) LED accents. 'PorcTrack v5' text overlay in white at the bottom. Sharp focus on the pig. High definition.",
      aspectRatio: "9:16"
    },
    {
      id: "dashboard-banner",
      name: "Dashboard Banner",
      prompt: "Professional panoramic photograph of a majestic, clean Large White pig in a modern, high-tech farm environment (16:9 ratio). Bright, clean lighting with subtle emerald green accents. High definition, realistic style, sharp focus on the animal's features.",
      aspectRatio: "16:9"
    },
    {
      id: "offline",
      name: "Offline State",
      prompt: "Minimalist line-art illustration on Gray-50 (#f9fafb) background. A stylized profile of a Large White pig integrated with a broken WiFi signal icon in Red-600 (#dc2626) to indicate an alert. Style: simple, clean, professional.",
      aspectRatio: "1:1"
    }
  ];

  const generateAsset = async (asset: typeof assets[0]) => {
    setIsGenerating(asset.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: asset.prompt }] },
        config: { imageConfig: { aspectRatio: asset.aspectRatio as any } }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const url = `data:image/png;base64,${part.inlineData.data}`;
          setGeneratedAssets(prev => ({ ...prev, [asset.id]: url }));
          break;
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Erreur lors de la génération.");
    }
    setIsGenerating(null);
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Studio d'Actifs PorcTrack</h2>
        <p className="text-xs text-gray-500">Générez les visuels officiels de votre application.</p>
      </div>

      <div className="grid gap-6">
        {assets.map(asset => (
          <div key={asset.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{asset.name}</h3>
              <button 
                onClick={() => generateAsset(asset)}
                disabled={isGenerating === asset.id}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isGenerating === asset.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </div>

            {generatedAssets[asset.id] ? (
              <div className="space-y-4">
                <div className={cn(
                  "rounded-2xl overflow-hidden border border-gray-100 bg-gray-50",
                  asset.aspectRatio === '9:16' ? "max-w-[200px] mx-auto" : "w-full"
                )}>
                  <img src={generatedAssets[asset.id]} alt={asset.name} className="w-full h-auto" />
                </div>
                <button 
                  onClick={() => downloadImage(generatedAssets[asset.id], `${asset.id}.png`)}
                  className="w-full py-3 bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger pour /public/images/
                </button>
              </div>
            ) : (
              <div className="h-32 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <ImageIcon className="w-8 h-8 opacity-20" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Prêt à générer</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const defaultUrl = "https://script.google.com/macros/s/AKfycbw3PO2wuln1spen_1cew6x7Lhaz7QrwLEZcZJMnehJ8/exec";
  const [url, setUrl] = useState(localStorage.getItem('gas_url') || defaultUrl);
  const [token, setToken] = useState(localStorage.getItem('gas_token') || 'PORC800_WRITE_2026');

  const save = () => {
    localStorage.setItem('gas_url', url);
    localStorage.setItem('gas_token', token);
    alert('Paramètres sauvegardés !');
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Configuration Sync</h2>
        <p className="text-xs text-gray-500">Configurez l'URL de votre Google Apps Script pour la synchronisation.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL Apps Script</label>
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/..."
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Token d'accès</label>
          <input 
            type="text" 
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <button 
          onClick={save}
          className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-transform"
        >
          Sauvegarder la configuration
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Outils Avancés</h3>
        <button 
          onClick={() => navigate('/biosecurity')}
          className="w-full py-4 bg-emerald-50 text-emerald-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <ShieldCheck className="w-5 h-5" />
          Biosécurité & PPA
        </button>
        <button 
          onClick={() => navigate('/conseils')}
          className="w-full py-4 bg-emerald-50 text-emerald-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <ClipboardList className="w-5 h-5" />
          Conseils Expert Porcin
        </button>
        <button 
          onClick={() => navigate('/studio')}
          className="w-full py-4 bg-emerald-50 text-emerald-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Sparkles className="w-5 h-5" />
          Ouvrir le Studio d'Actifs
        </button>
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Trash2 className="w-5 h-5" />
          Réinitialiser toutes les données
        </button>
      </div>

      <div className="pt-6 border-t border-gray-200 space-y-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase mb-3">Système</h3>
        
        <button 
          onClick={() => {
            if (confirm("Voulez-vous vraiment réinitialiser toutes les données locales ?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-[10px] uppercase border border-red-100"
        >
          Réinitialiser les données locales
        </button>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Version</span>
            <span className="font-bold">5.0.4 (Build 2026)</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">ID Ferme</span>
            <span className="font-bold">A130-CI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const questions = [
    { q: "Gestantes imminentes : mise bas confirmée ?", options: ["Oui", "Non", "En cours"] },
    { q: "Anomalies détectées (refus allaitement, etc.) ?", options: ["Aucune", "Oui (voir notes)", "Mineur"] },
    { q: "Mortalités du jour ?", options: ["0", "1", "Plus de 1"] },
  ];

  const next = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 bg-emerald-900 z-[100] flex flex-col p-6 text-white">
      <div className="flex-1 flex flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Questionnaire Quotidien</p>
          <h2 className="text-3xl font-bold leading-tight">{questions[step].q}</h2>
        </div>
        <div className="space-y-3">
          {questions[step].options.map((opt, i) => (
            <button
              key={i}
              onClick={next}
              className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-left font-medium transition-colors flex justify-between items-center group"
            >
              {opt}
              <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-50">
        <span>Étape {step + 1} / {questions.length}</span>
        <button onClick={onComplete}>Passer</button>
      </div>
    </div>
  );
};

// --- Provider ---

const FarmProvider = ({ children }: { children: React.ReactNode }) => {
  const [animals, setAnimals] = useState<Animal[]>(INITIAL_ANIMALS);
  const [stock, setStock] = useState<StockItem[]>(STOCK_ITEMS);
  const [events, setEvents] = useState<Event[]>([]);
  const [portees, setPortees] = useState<Portee[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [bandes, setBandes] = useState<Bande[]>(INITIAL_BANDES);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'offline'>('synced');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Persistence & Sync Logic
  useEffect(() => {
    const saved = localStorage.getItem('farm_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAnimals(parsed.animals || INITIAL_ANIMALS);
      setStock(parsed.stock || STOCK_ITEMS);
      setEvents(parsed.events || []);
      setHealthRecords(parsed.healthRecords || []);
      setBandes(parsed.bandes || []);
    }

    // Daily Onboarding Check
    const lastCheck = localStorage.getItem('last_onboarding');
    const today = new Date().toISOString().split('T')[0];
    if (lastCheck !== today) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('last_onboarding', today);
    setShowOnboarding(false);
  };

  useEffect(() => {
    localStorage.setItem('farm_data', JSON.stringify({ animals, stock, events, healthRecords, bandes }));
    
    // Automation: Gestation to Farrowing
    animals.forEach(a => {
      if (a.statut === 'Gestante' && a.dateMBPrevue) {
        const diff = Math.ceil((new Date(a.dateMBPrevue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 0 && a.statut !== 'Allaitante') {
          // Auto-trigger alert or potential status update
          console.log(`Automation: Animal ${a.id} is due for farrowing.`);
        }
      }
    });
  }, [animals, stock, events, healthRecords, bandes]);

  const triggerSync = async (table: string, action: any, data: any) => {
    setSyncStatus('pending');
    try {
      const res = await syncData(table, action, data);
      if (res.success) setSyncStatus('synced');
      else setSyncStatus('offline');
    } catch {
      setSyncStatus('offline');
    }
  };

  const addEvent = (event: Omit<Event, 'id' | 'synced'>) => {
    const newEvent: Event = { ...event, id: Math.random().toString(36).substr(2, 9), synced: false };
    setEvents(prev => [newEvent, ...prev]);
    triggerSync('EVENTS', 'INSERT', newEvent);
  };

  const updateAnimal = (updated: Animal) => {
    setAnimals(prev => prev.map(a => a.id === updated.id ? updated : a));
    triggerSync('CHEPTEL', 'UPDATE', updated);
  };

  const addHealthRecord = (record: Omit<HealthRecord, 'id'>) => {
    const newRecord = { ...record, id: Math.random().toString(36).substr(2, 9) };
    setHealthRecords(prev => [newRecord, ...prev]);
    triggerSync('SANTE', 'INSERT', newRecord);
  };

  const updateStock = (id: string, delta: number) => {
    setStock(prev => prev.map(s => s.id === id ? { ...s, quantite: Math.max(0, s.quantite + delta) } : s));
    const item = stock.find(s => s.id === id);
    if (item) triggerSync('STOCK', 'UPDATE', { ...item, quantite: item.quantite + delta });
  };

  const addRation = (ration: Omit<Ration, 'id'>) => {
    triggerSync('ALIMENTATION', 'INSERT', ration);
    updateStock(ration.alimentId, -ration.quantite);
  };

  const addBande = (bande: Omit<Bande, 'id'>) => {
    const newBande = { ...bande, id: `B-${Date.now()}` };
    setBandes(prev => [...prev, newBande]);
    triggerSync('BANDES', 'INSERT', newBande);
  };

  const updateBande = (updated: Bande) => {
    setBandes(prev => prev.map(b => b.id === updated.id ? updated : b));
    triggerSync('BANDES', 'UPDATE', updated);
  };

  return (
    <FarmContext.Provider value={{ 
      animals, stock, events, portees, healthRecords, bandes, syncStatus, 
      addEvent, updateAnimal, addHealthRecord, updateStock, addRation,
      addBande, updateBande, triggerSync
    }}>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      {children}
    </FarmContext.Provider>
  );
};

// --- Main App ---

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <FarmProvider>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 relative">
          <AnimatePresence mode="wait">
            {showSplash ? (
              <motion.div 
                key="splash"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-emerald-900 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src="/images/splash-screen.jpg" 
                    alt="Splash" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://picsum.photos/seed/pig-tech/1080/1920";
                    }}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="relative z-10 space-y-6">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mx-auto"
                  >
                    <img 
                      src="/images/app-icon.png" 
                      alt="Icon" 
                      className="w-16 h-16 rounded-2xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://picsum.photos/seed/pig-icon/200/200";
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-white tracking-tighter">PorcTrack</h1>
                    <p className="text-emerald-400 font-mono text-xs uppercase tracking-[0.3em]">Version 5.0 Professional</p>
                  </div>
                  <div className="pt-12">
                    <RefreshCw className="w-6 h-6 text-white/20 animate-spin mx-auto" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="max-w-md mx-auto relative">
                {/* Futuristic Background Pattern */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
                     style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                
                <Header />
                <main className="relative">
                  <AnimatePresence mode="wait">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/breeders" element={<BreederList />} />
                      <Route path="/breeders/:id" element={<BreederDetail />} />
                      <Route path="/piglets" element={<PigletList />} />
                      <Route path="/bandes" element={<BandeManagement />} />
                      <Route path="/stock" element={<StockList />} />
                      <Route path="/health" element={<HealthModule />} />
                      <Route path="/rations" element={<RationCalculator />} />
                      <Route path="/planning" element={<Planning />} />
                      <Route path="/biosecurity" element={<BiosecurityModule />} />
                      <Route path="/conseils" element={<ConseilsExpert />} />
                      <Route path="/studio" element={<AssetStudio />} />
                      <Route path="/more" element={<SettingsPage />} />
                    </Routes>
                  </AnimatePresence>
                </main>
                <BottomNav />
              </div>
            )}
          </AnimatePresence>
        </div>
      </FarmProvider>
    </Router>
  );
}
