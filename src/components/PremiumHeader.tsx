import React from 'react';
import { ArrowRight, BarChart3, ShieldCheck, Zap } from 'lucide-react';

const PremiumHeader = () => (
  <nav className="fixed top-0 left-0 right-0 z-[100] h-[72px] flex items-center justify-between px-12 bg-white/85 backdrop-blur-xl border-b border-emerald-900/10">
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-emerald-900 rounded-[10px] flex items-center justify-center">
        <ShieldCheck className="w-5 h-5 text-amber-500" />
      </div>
      <span className="font-['Big_Shoulders_Display'] font-black text-xl text-emerald-900 tracking-[0.02em] uppercase">PorcTrack</span>
      <span className="text-[11px] font-semibold text-amber-800 bg-amber-500/15 px-1.5 py-0.5 rounded-md">ELITE</span>
    </div>
    <ul className="flex items-center gap-9 list-none">
      {['Fonctionnalités', 'Analyses', 'Tarifs'].map((item) => (
        <li key={item}>
          <a href="#" className="text-sm font-medium text-slate-700 hover:text-emerald-900 transition-colors">
            {item}
          </a>
        </li>
      ))}
    </ul>
    <button className="bg-emerald-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-800 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      Accès Pro
    </button>
  </nav>
);

export default PremiumHeader;
