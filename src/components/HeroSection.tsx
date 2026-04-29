import React from 'react';
import { Play } from 'lucide-react';

const HeroSection = () => (
  <section className="min-h-screen pt-[72px] grid grid-cols-2 bg-emerald-900 relative overflow-hidden">
    <div className="flex flex-col justify-center px-20 relative z-10">
      <div className="inline-flex items-center gap-2 bg-amber-500/18 border border-amber-500/35 rounded-full px-3.5 py-1.5 mb-9 w-fit">
        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
        <span className="text-amber-500 text-[12px] font-semibold tracking-[0.1em] uppercase">Nouvelle Version 8.0</span>
      </div>
      <h1 className="font-['Big_Shoulders_Display'] font-black text-[62px] text-white mb-7 leading-[0.92] tracking-[-0.02em] max-w-[540px]">
        Gestion de Troupeau <span className="text-amber-500">Premium</span>
      </h1>
      <p className="text-[18px] text-white/65 leading-[1.65] max-w-[440px] mb-12">
        La plateforme de référence pour le suivi zootechnique et la gestion financière des exploitations porcines.
      </p>
      <div className="flex items-center gap-4">
        <button className="bg-amber-500 text-slate-900 font-bold px-7 py-4 rounded-full text-[15px] hover:bg-amber-400 transition-all hover:-translate-y-1">
          Démarrer l'essai
        </button>
        <button className="text-white/70 font-medium px-5 py-4 rounded-full text-[15px] border border-white/15 bg-white/5 hover:bg-white/12 transition-all">
          Voir la démo
        </button>
      </div>
    </div>
    <div className="flex items-center justify-center p-20 relative z-10">
      <div className="w-full h-full bg-emerald-800 rounded-[28px] relative overflow-hidden">
         {/* Placeholder for dashboard graphics */}
      </div>
    </div>
  </section>
);

export default HeroSection;
