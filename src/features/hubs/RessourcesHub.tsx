/**
 * RessourcesHub — /ressources (tab 04)
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte Premium Agritech (2026-04-26)
 *
 * Changements :
 *   1. Système d'onglets [ Aliments ] [ Pharmacie ]
 *   2. Cartes visuelles (Grid) avec jauge de stock
 *   3. Badges d'autonomie et de statut
 *   4. Accès rapide aux protocoles en bas
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import {
  AlertTriangle, Plus, Calculator, ClipboardList, Edit3, Droplets, FlaskConical, Search
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import DataAgeIndicator from '../../components/DataAgeIndicator';
import { SectionDivider, Chip, HubTile } from '../../components/agritech';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import QuickRefillForm from '../../components/forms/QuickRefillForm';
import {
  toRefillItem,
  type RefillStockItem,
} from '../../components/forms/quickRefillLogic';
import QuickEditStockForm from '../../components/forms/QuickEditStockForm';
import type { StockKind } from '../../components/forms/quickEditStockLogic';
import { useFarm } from '../../context/FarmContext';
import type { StockAliment, StockVeto } from '../../types/farm';

// ─── Types & Helpers ────────────────────────────────────────────────────────

type ResourceTab = 'aliments' | 'pharmacie';
type StockItem = StockAliment | StockVeto;

// ─── Composant Principal ─────────────────────────────────────────────────────

const RessourcesHub: React.FC = () => {
  const navigate = useNavigate();
  const { stockAliment, stockVeto, refreshData } = useFarm();
  const { handleRefresh } = useAutoRefresh();

  const [activeTab, setActiveTab] = useState<ResourceTab>('aliments');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Filtrage ────────────────────────────────────────────────────────────
  const filteredAliments = useMemo(() => {
    return stockAliment.filter(a =>
      a.libelle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stockAliment, searchQuery]);

  const filteredVetos = useMemo(() => {
    return stockVeto.filter(v =>
      v.produit.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stockVeto, searchQuery]);

  const rupturesCount = useMemo(() => {
    const r1 = stockAliment.filter(a => a.statutStock === 'RUPTURE').length;
    const r2 = stockVeto.filter(v => v.statutStock === 'RUPTURE').length;
    return r1 + r2;
  }, [stockAliment, stockVeto]);

  // ── Forms Logic ─────────────────────────────────────────────────────────
  const [refillTarget, setRefillTarget] = useState<RefillStockItem | null>(null);
  const [editTarget, setEditTarget] = useState<{ item: StockItem; kind: StockKind } | null>(null);

  const handleOpenRefill = (item: StockItem, kind: StockKind) => {
    setRefillTarget(toRefillItem(item, kind));
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <AgritechHeader
            title="RESSOURCES"
            subtitle="Inventaire & Approvisionnement"
            action={<DataAgeIndicator />}
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-6">

            {/* ── Summary & Tabs ────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex bg-bg-2 p-1 rounded-xl w-full max-w-[320px]">
                  <TabButton
                    active={activeTab === 'aliments'}
                    label="Aliments"
                    icon={<Droplets size={14} />}
                    onClick={() => setActiveTab('aliments')}
                  />
                  <TabButton
                    active={activeTab === 'pharmacie'}
                    label="Pharmacie"
                    icon={<FlaskConical size={14} />}
                    onClick={() => setActiveTab('pharmacie')}
                  />
                </div>
                {rupturesCount > 0 && (
                  <Chip
                    label={`${rupturesCount} RUPTURE${rupturesCount > 1 ? 'S' : ''}`}
                    tone="red"
                    size="sm"
                    className="animate-pulse"
                  />
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={`Rechercher un ${activeTab === 'aliments' ? 'aliment' : 'produit'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 bg-bg-1 border border-border rounded-xl pl-10 pr-4 font-mono text-[13px] focus:border-accent outline-none transition-colors"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-2" />
              </div>
            </div>

            {/* ── Grid of Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTab === 'aliments' ? (
                filteredAliments.map(a => (
                  <ResourceCard
                    key={a.id}
                    name={a.libelle}
                    qty={a.stockActuel}
                    unit={a.unite}
                    seuil={a.seuilAlerte}
                    statut={a.statutStock}
                    notes={a.notes}
                    onRefill={() => handleOpenRefill(a, 'ALIMENT')}
                    onEdit={() => setEditTarget({ item: a, kind: 'ALIMENT' })}
                    onClick={() => navigate('/ressources/aliments')}
                  />
                ))
              ) : (
                filteredVetos.map(v => (
                  <ResourceCard
                    key={v.id}
                    name={v.produit}
                    qty={v.stockActuel}
                    unit={v.unite}
                    seuil={v.seuilAlerte}
                    statut={v.statutStock || 'OK'}
                    category={v.type}
                    notes={v.usage}
                    onRefill={() => handleOpenRefill(v, 'VETO')}
                    onEdit={() => setEditTarget({ item: v, kind: 'VETO' })}
                    onClick={() => navigate('/ressources/pharmacie')}
                  />
                ))
              )}
            </div>

            {/* ── Bottom Hub Tiles ──────────────────────────────────────── */}
            <section className="mt-2">
              <SectionDivider label="Accès Rapides" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <HubTile
                  icon={<Calculator size={20} />}
                  title="Plan Alim"
                  subtitle="Rations/j"
                  to="/ressources/aliments/plan"
                  tone="accent"
                  variant="compact"
                />
                <HubTile
                  icon={<ClipboardList size={20} />}
                  title="Formules"
                  subtitle="Recettes"
                  to="/ressources/aliments/formules"
                  tone="ochre"
                  variant="compact"
                />
              </div>
            </section>
          </div>

          {/* Forms */}
          <QuickRefillForm
            isOpen={refillTarget !== null}
            onClose={() => setRefillTarget(null)}
            stockItem={refillTarget}
            onSuccess={() => { refreshData(); setRefillTarget(null); }}
          />

          {editTarget && (
            <QuickEditStockForm
              isOpen={editTarget !== null}
              onClose={() => setEditTarget(null)}
              stockItem={editTarget.item}
              kind={editTarget.kind}
              onSuccess={() => { refreshData(); setEditTarget(null); }}
            />
          )}
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

const TabButton: React.FC<{ active: boolean; label: string; icon: React.ReactNode; onClick: () => void }> = ({
  active, label, icon, onClick
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg font-mono text-[11px] uppercase tracking-wide transition-all ${
      active ? 'bg-bg-0 text-accent shadow-sm font-bold' : 'text-text-2 hover:text-text-1'
    }`}
  >
    {icon}
    {label}
  </button>
);

interface ResourceCardProps {
  name: string;
  qty: number;
  unit: string;
  seuil: number;
  statut: string;
  category?: string;
  notes?: string;
  onRefill: () => void;
  onEdit: () => void;
  onClick?: () => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  name, qty, unit, seuil, statut, category, notes, onRefill, onEdit
}) => {
  const isRupture = statut === 'RUPTURE';
  const isBas = statut === 'BAS';

  const progress = seuil > 0 ? Math.min(100, (qty / (seuil * 2.5)) * 100) : 100;

  return (
    <div className="card-dense flex flex-col gap-3 p-4 group hover:border-accent/40 transition-colors">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold text-text-0 truncate">{name}</h3>
            {isRupture && <AlertTriangle size={12} className="text-red" />}
          </div>
          {category && <p className="text-[10px] text-text-2 uppercase font-mono mt-0.5">{category}</p>}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-8 h-8 rounded-lg bg-bg-2 flex items-center justify-center text-text-2 hover:text-text-0 transition-colors"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRefill(); }}
            className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-[22px] font-bold font-mono tabular-nums ${isRupture ? 'text-red' : 'text-text-0'}`}>
          {qty}
        </span>
        <span className="text-[12px] text-text-2 font-mono uppercase">{unit}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-mono uppercase text-text-2">
          <span>Stock</span>
          <span>Seuil: {seuil} {unit}</span>
        </div>
        <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isRupture ? 'bg-red' : isBas ? 'bg-amber' : 'bg-accent'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {notes && (
        <p className="text-[11px] text-text-2 italic line-clamp-1 border-t border-border/50 pt-2 mt-1">
          {notes}
        </p>
      )}
    </div>
  );
};

export default RessourcesHub;
