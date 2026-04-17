import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useFarm } from '../context/FarmContext';
import { cn } from '../lib/utils';

const FinanceDashboard: React.FC = () => {
  const { animals, stock, events, healthRecords } = useFarm();

  // Calculate total stock value
  const stockValue = useMemo(() => {
    return stock.reduce((acc, item) => acc + (item.quantite * (item.prixUnitaire || 0)), 0);
  }, [stock]);

  // Estimate herd value (simplified: weight * average price per kg)
  const herdValue = useMemo(() => {
    const avgPricePerKg = 1500; // Example price in FCFA
    return animals.reduce((acc, animal) => acc + (animal.poids * avgPricePerKg), 0);
  }, [animals]);

  // Calculate recent expenses (Health records + Feed updates)
  const recentExpenses = useMemo(() => {
    // This is a simplified mock for the demo, in real app we'd track transaction events
    return [
      { id: 1, label: 'Achat Concentré Koudijs', amount: 45000, date: '2026-04-08', type: 'feed' },
      { id: 2, label: 'Traitement Vétérinaire T2', amount: 12500, date: '2026-04-09', type: 'health' },
      { id: 3, label: 'Main d\'œuvre Semaine 14', amount: 25000, date: '2026-04-10', type: 'labor' },
    ];
  }, []);

  // Chart Data: Simulated growth over 7 days
  const chartData = [
    { day: 'Lun', value: 1250000 },
    { day: 'Mar', value: 1280000 },
    { day: 'Mer', value: 1310000 },
    { day: 'Jeu', value: 1305000 },
    { day: 'Ven', value: 1340000 },
    { day: 'Sam', value: 1380000 },
    { day: 'Dim', value: 1420000 },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-4 space-y-6 pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Analyse Financière</h2>
          <p className="text-xs text-gray-500">Valorisation du cheptel et suivi des charges.</p>
        </div>
        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <PiggyBank className="w-12 h-12 text-emerald-600" />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Valeur Cheptel</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(herdValue)}</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <ArrowUpRight className="w-3 h-3" />
            <span>+4.2%</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Package className="w-12 h-12 text-blue-600" />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Valeur Stock</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stockValue)}</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-600">
            <ArrowDownRight className="w-3 h-3" />
            <span>-12%</span>
          </div>
        </motion.div>
      </div>

      {/* Main Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Évolution Valorisation</h3>
          <select className="text-[10px] font-bold bg-gray-50 border-none rounded-lg p-1 outline-none">
            <option>7 Derniers Jours</option>
            <option>30 Derniers Jours</option>
          </select>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Expenses */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Activity className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Dépenses Récentes</h3>
        </div>
        
        <div className="space-y-2">
          {recentExpenses.map((expense) => (
            <div 
              key={expense.id}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  expense.type === 'feed' ? "bg-blue-50 text-blue-600" :
                  expense.type === 'health' ? "bg-red-50 text-red-600" :
                  "bg-gray-50 text-gray-600"
                )}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{expense.label}</p>
                  <p className="text-[10px] text-gray-400 font-mono uppercase">{expense.date}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-900">-{formatCurrency(expense.amount)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Insight */}
      <div className="bg-emerald-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10 space-y-2">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Conseil Financier IA</p>
          <p className="text-sm leading-relaxed">
            Votre ROI estimé sur la bande <span className="text-emerald-300 font-bold">B-2026-04</span> est de <span className="text-emerald-300 font-bold">28%</span>. 
            Anticipez l'achat de Romelko RED pour optimiser le coût de croissance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
