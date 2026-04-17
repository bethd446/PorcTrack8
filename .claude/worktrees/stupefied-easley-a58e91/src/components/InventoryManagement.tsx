import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Baby, 
  Layers, 
  Plus, 
  ChevronRight 
} from 'lucide-react';
import { cn, formatDate, getDiffDays } from '../lib/utils';
import { useFarm } from '../context/FarmContext';
import { Bande } from '../types';

export const StockList = () => {
  const { stock, updateStock, userRole } = useFarm();
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
              {userRole !== 'ADMIN' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUpdate({ id: item.id, type: 'OUT' })}
                    className="pressable px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-bold uppercase border border-gray-100 active:bg-gray-100"
                  >
                    Sortie
                  </button>
                  <button
                    onClick={() => setShowUpdate({ id: item.id, type: 'IN' })}
                    className="pressable px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase shadow-sm active:scale-95 transition-transform"
                  >
                    Entrée
                  </button>
                </div>
              )}
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
                  inputMode="decimal"
                  autoFocus
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center text-3xl font-mono font-bold outline-none focus:border-emerald-500 transition-colors"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowUpdate(null)} className="pressable flex-1 py-3 bg-gray-100 rounded-xl font-bold text-sm">Annuler</button>
                <button onClick={handleUpdate} className="pressable flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm">Valider</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PigletList = () => {
  const { portees, addEvent, userRole } = useFarm();
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
              "pressable px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border",
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
            
            {userRole !== 'ADMIN' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const desc = prompt("Nombre de morts ?");
                    if (desc) addEvent({ animalId: portee.mereId, type: 'mort', date: new Date().toISOString(), description: `Mortalité portée ${portee.id}: ${desc}` });
                  }}
                  className="pressable py-3 bg-gray-50 text-gray-600 rounded-2xl text-[10px] font-bold uppercase border border-gray-100 active:bg-gray-100"
                >
                  Signaler Mort
                </button>
                <button
                  className="pressable py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-bold uppercase shadow-sm active:scale-95 transition-transform"
                >
                  {portee.statut === 'sous_mere' ? 'Sevrage' : 'Transférer'}
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {filteredPortees.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <Baby className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-medium italic">Aucune portée dans cette catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const BandeManagement = () => {
  const { bandes, addBande, updateBande, userRole } = useFarm();
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
        {userRole !== 'ADMIN' && (
          <button onClick={() => setShowAdd(true)} aria-label="Ajouter une bande" className="pressable p-2 bg-emerald-600 text-white rounded-xl shadow-lg">
            <Plus className="w-5 h-5" />
          </button>
        )}
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
                  {-getDiffDays(bande.dateDebut)} j
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
                className="pressable flex-1 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-widest"
              >
                Clôturer
              </button>
              <button className="pressable flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                Transférer
              </button>
            </div>
          </motion.div>
        ))}
        {bandes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Type</label>
                  <select 
                    className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                    onChange={e => setNewBande({...newBande, type: e.target.value as any})}
                  >
                    <option value="maternite">Maternité</option>
                    <option value="post_sevrage">Post-Sevrage</option>
                    <option value="engraissement">Engraissement</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Effectif</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                    onChange={e => setNewBande({...newBande, nbSujets: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAdd(false)} className="pressable flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-sm">Annuler</button>
                <button onClick={handleSubmit} className="pressable flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm">Créer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
