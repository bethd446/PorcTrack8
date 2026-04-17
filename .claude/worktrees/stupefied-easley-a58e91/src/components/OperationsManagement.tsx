import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ClipboardList,
  Stethoscope
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useFarm } from '../context/FarmContext';
import { WEANING_DAYS_OPTIMAL } from '../constants';
import { BiosecurityMeasure } from '../types';

export const Planning = () => {
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
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun événement prévu prochainement.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const HealthModule = () => {
  const { animals, healthRecords, addHealthRecord, userRole } = useFarm();
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
        {userRole !== 'ADMIN' && (
          <button onClick={() => setShowAdd(true)} aria-label="Ajouter un traitement" className="pressable p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Plus className="w-4 h-4" />
          </button>
        )}
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
                <button onClick={() => setShowAdd(false)} className="pressable flex-1 py-3 bg-gray-100 rounded-xl font-bold">Annuler</button>
                <button onClick={handleSubmit} className="pressable flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Enregistrer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const RationCalculator = () => {
  const { stock, addRation, bandes, animals, userRole } = useFarm();
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
            inputMode="decimal"
            placeholder="0.0"
            className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none border border-transparent focus:border-emerald-500"
            onChange={e => setNewRation({...newRation, quantite: Number(e.target.value)})}
          />
        </div>

        {userRole !== 'ADMIN' && (
          <button
            onClick={handleSubmit}
            disabled={!newRation.alimentId || !newRation.quantite}
            className="pressable w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            Valider la Distribution
          </button>
        )}
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

export const BiosecurityModule = () => {
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

export const ConseilsExpert = () => {
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
    }
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Conseils d'Expert</h2>
        <p className="text-xs text-gray-500">Optimisez votre production avec les standards De Heus / Koudijs.</p>
      </div>

      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-emerald-700 uppercase mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              {s.title}
            </h3>
            <ul className="space-y-3">
              {s.tips.map((tip, j) => (
                <li key={j} className="flex gap-3 text-xs text-gray-600 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
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
