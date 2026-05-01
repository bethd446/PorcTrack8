import React, { useMemo } from 'react';
import {
  Coins, Info,
} from 'lucide-react';
import { genererRapportFinancierBande } from '../../services/financialAnalyzer';
import type { BandePorcelets, TransitionBande } from '../../types/farm';
import { Chip } from '../../components/agritech';

interface BandeFinanceCardProps {
  bande: BandePorcelets;
  historique: TransitionBande[];
  poidsActuel: number;
}

/**
 * BandeFinanceCard — Vue synthétique de rentabilité pour une bande
 */
const BandeFinanceCard: React.FC<BandeFinanceCardProps> = ({
  bande,
  historique,
  poidsActuel
}) => {
  const roi = useMemo(() =>
    genererRapportFinancierBande(bande, historique, poidsActuel),
  [bande, historique, poidsActuel]);

  const {
    statutRentabilite,
    coutAlimentaireEstime,
    revenuBrutProjete,
    margeNetteProjetee,
    coutTotalEstime,
    roiPct
  } = roi;

  const config = useMemo(() => {
    switch (statutRentabilite) {
      case 'EXCELLENT':
        return { color: 'bg-[var(--color-accent-500)]', text: 'text-[var(--color-accent-500)]', label: 'Rentabilité Élevée', tone: 'success' as const };
      case 'CORRECT':
        return { color: 'bg-[var(--amber-pork)]', text: 'text-[var(--amber-pork)]', label: 'Rentabilité Correcte', tone: 'amber' as const };
      case 'DEFICITAIRE':
      default:
        return { color: 'bg-[var(--color-danger,#EF4444)]', text: 'text-[var(--color-danger,#EF4444)]', label: 'Déficitaire', tone: 'red' as const };
    }
  }, [statutRentabilite]);

  // Progression : Coût / Revenu (max 100%)
  const progress = Math.min(100, (coutTotalEstime / (revenuBrutProjete || 1)) * 100);

  return (
    <div className="card-dense flex flex-col gap-4 p-5">
      {/* Header Finance */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-text-2" />
            <span className="text-[10px] uppercase font-mono text-text-2 tracking-widest">Analyse de Rentabilité</span>
          </div>
          <h3 className={`text-xl font-bold font-mono text-text-0`}>
            {roiPct}% <span className="text-xs font-normal text-text-2">ROI</span>
          </h3>
        </div>
        <Chip tone={config.tone} label={config.label} size="sm" />
      </div>

      {/* ROI Progress Bar (Cost vs Revenue) */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-mono uppercase text-text-2">
          <span>Coût de revient</span>
          <span>Revenu Projeté</span>
        </div>
        <div className="h-4 w-full bg-bg-2 rounded-lg overflow-hidden border border-border relative">
          {/* Le fond représente le Revenu Projeté potentiel */}
          <div
            className={`h-full ${config.color} transition-all duration-1000 ease-out`}
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className="text-[9px] font-bold text-bg-0 drop-shadow-sm uppercase">
               Ratio Coût/Vente : {Math.round(progress)}%
             </span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-mono text-text-2">Aliment</span>
          <span className="text-[13px] font-bold text-text-0 font-mono">{formatFCFA(coutAlimentaireEstime)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase font-mono text-text-2">CA Estimé</span>
          <span className="text-[13px] font-bold text-text-0 font-mono">{formatFCFA(revenuBrutProjete)}</span>
        </div>
        <div className="flex flex-col gap-1 items-end text-right">
          <span className="text-[8px] uppercase font-mono text-text-2">Marge Nette</span>
          <span className={`text-[13px] font-bold font-mono ${margeNetteProjetee < 0 ? 'text-[var(--color-danger,#EF4444)]' : 'text-[var(--color-accent-500)]'}`}>
            {margeNetteProjetee > 0 ? '+' : ''}{formatFCFA(margeNetteProjetee)}
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-1.5 opacity-40 group hover:opacity-100 transition-opacity">
        <Info size={10} className="text-text-2" />
        <span className="text-[8px] uppercase font-mono text-text-2 italic">
          Calculé selon consommation théorique K13
        </span>
      </div>
    </div>
  );
};

function formatFCFA(n: number): string {
  return Math.abs(Math.round(n)).toLocaleString('fr-FR').replace(/\s/g, '.');
}

export default BandeFinanceCard;
