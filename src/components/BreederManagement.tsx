import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PiggyBank, 
  ChevronRight, 
  Calendar, 
  ArrowLeft, 
  Camera, 
  Edit2, 
  Save, 
  CheckCircle2, 
  Zap, 
  History 
} from 'lucide-react';
import { cn, formatDate, getDiffDays } from '../lib/utils';
import { useFarm } from '../context/FarmContext';
import { Animal, AnimalStatus } from '../types';
import { GESTATION_DAYS } from '../constants';

export const BreederList = () => {
  const { animals, userRole } = useFarm();
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

export const BreederDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { animals, updateAnimal, addEvent, userRole } = useFarm();
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
            {animal.photo ? (
              <img src={animal.photo} alt={animal.nom} className="w-full h-full object-cover rounded-3xl" />
            ) : (
              <PiggyBank className="w-12 h-12 opacity-50" />
            )}
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
              {userRole !== 'ADMIN' && (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 bg-white/10 rounded-xl"
                >
                  {isEditing ? <Save className="w-5 h-5" onClick={handleSave} /> : <Edit2 className="w-5 h-5" />}
                </button>
              )}
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
        {userRole !== 'ADMIN' && (animal.statut === 'Gestante' || animal.statut === 'Mise bas à confirmer') && (
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
                      const diff = getDiffDays(animal.dateMBPrevue);
                      const progress = Math.min(100, Math.max(0, Math.round(((total - diff) / total) * 100)));
                      return progress;
                    })()}%
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-[10px] font-bold uppercase",
                    getDiffDays(animal.dateMBPrevue) <= 0 ? "text-red-600" : "text-emerald-600"
                  )}>
                    {getDiffDays(animal.dateMBPrevue) <= 0 ? 'À TERME' : `J-${getDiffDays(animal.dateMBPrevue)}`}
                  </p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, Math.round(((GESTATION_DAYS - getDiffDays(animal.dateMBPrevue)) / GESTATION_DAYS) * 100)))}%` }}
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
